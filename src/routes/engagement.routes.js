import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";
import { verifyMarketplaceToken } from "../middleware/verifyMarketplaceToken.js";
 
const router = Router();
 
function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}
 
function promptObjectId(value) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}
 
function hasPremiumAccess(user) {
  return (
    user?.role === "admin" ||
    user?.subscription === "premium" ||
    user?.subscriptionStatus === "active"
  );
}
 
function isPromptOwner(prompt, user) {
  return prompt.creatorId?.toString() === user?._id?.toString();
}
 
function canUsePrompt(prompt, user) {
  const visibility =
    prompt.visibility ||
    (prompt.accessLevel === "premium" ? "private" : "public");
 
  return (
    visibility === "public" ||
    isPromptOwner(prompt, user) ||
    hasPremiumAccess(user)
  );
}
 
async function findApprovedPrompt(database, value) {
  const _id = promptObjectId(value);
 
  if (!_id) {
    return null;
  }
 
  return database.collection("prompts").findOne({
    _id,
    status: "approved",
  });
}
 
async function refreshPromptRating(database, promptId) {
  const [summary] = await database
    .collection("reviews")
    .aggregate([
      { $match: { promptId } },
      {
        $group: {
          _id: "$promptId",
          averageRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ])
    .toArray();
 
  const averageRating = Number(
    Number(summary?.averageRating || 0).toFixed(1),
  );
  const reviewCount = summary?.reviewCount || 0;
 
  await database.collection("prompts").updateOne(
    { _id: promptId },
    {
      $set: {
        averageRating,
        reviewCount,
        updatedAt: new Date(),
      },
    },
  );
 
  return { averageRating, reviewCount };
}
 
router.get(
  "/bookmarks/mine",
  verifyMarketplaceToken,
  async (req, res, next) => {
    try {
      const database = getDatabase();
 
      const bookmarks = await database
        .collection("bookmarks")
        .aggregate([
          { $match: { userId: req.auth.user._id } },
          { $sort: { createdAt: -1 } },
          {
            $lookup: {
              from: "prompts",
              localField: "promptId",
              foreignField: "_id",
              as: "prompt",
            },
          },
          { $unwind: "$prompt" },
          { $match: { "prompt.status": "approved" } },
          {
            $replaceRoot: {
              newRoot: {
                $mergeObjects: [
                  "$prompt",
                  { bookmarkedAt: "$createdAt" },
                ],
              },
            },
          },
          {
            $project: {
              promptText: 0,
              usageInstructions: 0,
            },
          },
        ])
        .toArray();
 
      return res.json({
        prompts: bookmarks,
        total: bookmarks.length,
      });
    } catch (error) {
      return next(error);
    }
  },
);
 
router.get(
  "/:id/engagement",
  verifyMarketplaceToken,
  async (req, res, next) => {
    try {
      const database = getDatabase();
      const prompt = await findApprovedPrompt(database, req.params.id);
 
      if (!prompt) {
        return res.status(404).json({
          message: "The selected marketplace prompt was not found.",
        });
      }
 
      const [bookmark, review, openReport] = await Promise.all([
        database.collection("bookmarks").findOne({
          promptId: prompt._id,
          userId: req.auth.user._id,
        }),
        database.collection("reviews").findOne({
          promptId: prompt._id,
          userId: req.auth.user._id,
        }),
        database.collection("reports").findOne({
          promptId: prompt._id,
          userId: req.auth.user._id,
          status: "open",
        }),
      ]);
 
      return res.json({
        engagement: {
          bookmarked: Boolean(bookmark),
          review,
          hasOpenReport: Boolean(openReport),
          canCopy: canUsePrompt(prompt, req.auth.user),
        },
      });
    } catch (error) {
      return next(error);
    }
  },
);
 
router.post(
  "/:id/copy",
  verifyMarketplaceToken,
  async (req, res, next) => {
    try {
      const database = getDatabase();
      const prompt = await findApprovedPrompt(database, req.params.id);
 
      if (!prompt) {
        return res.status(404).json({
          message: "The selected marketplace prompt was not found.",
        });
      }
 
      if (!canUsePrompt(prompt, req.auth.user)) {
        return res.status(403).json({
          message: "Upgrade to premium before copying this private prompt.",
        });
      }
 
      const result = await database.collection("prompts").findOneAndUpdate(
        { _id: prompt._id },
        {
          $inc: { copyCount: 1 },
          $set: { updatedAt: new Date() },
        },
        {
          returnDocument: "after",
          projection: { copyCount: 1 },
        },
      );
 
      return res.json({
        message: "Prompt copied and marketplace activity recorded.",
        copyCount: result?.copyCount || 0,
      });
    } catch (error) {
      return next(error);
    }
  },
);
 
router.post(
  "/:id/bookmark",
  verifyMarketplaceToken,
  async (req, res, next) => {
    try {
      const database = getDatabase();
      const prompt = await findApprovedPrompt(database, req.params.id);
 
      if (!prompt) {
        return res.status(404).json({
          message: "The selected marketplace prompt was not found.",
        });
      }
 
      const filter = {
        promptId: prompt._id,
        userId: req.auth.user._id,
      };
      const existing = await database
        .collection("bookmarks")
        .findOne(filter);
 
      if (existing) {
        await database.collection("bookmarks").deleteOne({
          _id: existing._id,
        });
 
        return res.json({
          message: "Prompt removed from your bookmarks.",
          bookmarked: false,
        });
      }
 
      await database.collection("bookmarks").insertOne({
        ...filter,
        createdAt: new Date(),
      });
 
      return res.status(201).json({
        message: "Prompt saved to your bookmarks.",
        bookmarked: true,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.json({
          message: "Prompt is already bookmarked.",
          bookmarked: true,
        });
      }
 
      return next(error);
    }
  },
);
 
router.put(
  "/:id/review",
  verifyMarketplaceToken,
  async (req, res, next) => {
    try {
      const database = getDatabase();
      const prompt = await findApprovedPrompt(database, req.params.id);
 
      if (!prompt) {
        return res.status(404).json({
          message: "The selected marketplace prompt was not found.",
        });
      }
 
      if (isPromptOwner(prompt, req.auth.user)) {
        return res.status(400).json({
          message: "Creators cannot review their own marketplace prompts.",
        });
      }
 
      const rating = Number(req.body.rating);
      const comment = cleanText(req.body.comment);
 
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({
          message: "Choose a whole-number rating from 1 to 5.",
        });
      }
 
      if (comment.length < 10 || comment.length > 600) {
        return res.status(400).json({
          message: "Review comments must contain between 10 and 600 characters.",
        });
      }
 
      const now = new Date();
      const filter = {
        promptId: prompt._id,
        userId: req.auth.user._id,
      };
 
      await database.collection("reviews").updateOne(
        filter,
        {
          $set: {
            rating,
            comment,
            userName: req.auth.user.name,
            userEmail: req.auth.user.email,
            updatedAt: now,
          },
          $setOnInsert: {
            ...filter,
            createdAt: now,
          },
        },
        { upsert: true },
      );
 
      const review = await database
        .collection("reviews")
        .findOne(filter);
      const ratingSummary = await refreshPromptRating(
        database,
        prompt._id,
      );
 
      return res.json({
        message: "Your marketplace review was saved.",
        review,
        ...ratingSummary,
      });
    } catch (error) {
      return next(error);
    }
  },
);
 
router.post(
  "/:id/report",
  verifyMarketplaceToken,
  async (req, res, next) => {
    try {
      const database = getDatabase();
      const prompt = await findApprovedPrompt(database, req.params.id);
 
      if (!prompt) {
        return res.status(404).json({
          message: "The selected marketplace prompt was not found.",
        });
      }
 
      if (isPromptOwner(prompt, req.auth.user)) {
        return res.status(400).json({
          message: "Creators cannot report their own marketplace prompts.",
        });
      }
 
      const allowedReasons = [
        "Spam",
        "Copyright Violation",
        "Harmful Content",
        "Misleading Information",
        "Other",
      ];
      const reason = cleanText(req.body.reason);
      const description = cleanText(req.body.description);
 
      if (!allowedReasons.includes(reason)) {
        return res.status(400).json({
          message: "Choose a supported marketplace report reason.",
        });
      }
 
      if (description.length < 10 || description.length > 800) {
        return res.status(400).json({
          message: "Report details must contain between 10 and 800 characters.",
        });
      }
 
      const duplicate = await database.collection("reports").findOne({
        promptId: prompt._id,
        userId: req.auth.user._id,
        status: "open",
      });
 
      if (duplicate) {
        return res.status(409).json({
          message: "You already have an open report for this prompt.",
        });
      }
 
      const report = {
        promptId: prompt._id,
        promptTitle: prompt.title,
        userId: req.auth.user._id,
        userName: req.auth.user.name,
        userEmail: req.auth.user.email,
        reason,
        description,
        status: "open",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await database
        .collection("reports")
        .insertOne(report);
 
      return res.status(201).json({
        message: "Your report was sent to marketplace moderation.",
        report: { ...report, _id: result.insertedId },
      });
    } catch (error) {
      return next(error);
    }
  },
);
 
export default router;