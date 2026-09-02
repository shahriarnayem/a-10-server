import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { verifyMarketplaceToken } from "../middleware/verifyMarketplaceToken.js";
 
const router = Router();
 
router.use(verifyMarketplaceToken, authorizeRoles("admin"));
 
function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}
 
function validObjectId(value) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}
 
function positiveNumber(value, fallback, maximum = 100) {
  const number = Number.parseInt(value, 10);
 
  if (!Number.isFinite(number) || number < 1) {
    return fallback;
  }
 
  return Math.min(number, maximum);
}
 
router.get("/overview", async (req, res, next) => {
  try {
    const database = getDatabase();
 
    const [
      users,
      creators,
      premiumUsers,
      prompts,
      pendingPrompts,
      reviews,
      openReports,
      payments,
    ] = await Promise.all([
      database.collection("users").countDocuments(),
      database.collection("users").countDocuments({ role: "creator" }),
      database.collection("users").countDocuments({
        $or: [
          { subscription: "premium" },
          { subscriptionStatus: "active" },
        ],
      }),
      database.collection("prompts").countDocuments(),
      database.collection("prompts").countDocuments({ status: "pending" }),
      database.collection("reviews").countDocuments(),
      database.collection("reports").countDocuments({ status: "open" }),
      database.collection("payments").countDocuments({ status: "paid" }),
    ]);
 
    return res.json({
      overview: {
        users,
        creators,
        premiumUsers,
        prompts,
        pendingPrompts,
        reviews,
        openReports,
        payments,
      },
    });
  } catch (error) {
    return next(error);
  }
});
 
router.get("/prompts", async (req, res, next) => {
  try {
    const allowedStatuses = ["pending", "approved", "rejected"];
    const status = allowedStatuses.includes(req.query.status)
      ? req.query.status
      : "pending";
    const page = positiveNumber(req.query.page, 1, 10000);
    const limit = positiveNumber(req.query.limit, 20, 50);
    const database = getDatabase();
    const filter = { status };
 
    const [prompts, total] = await Promise.all([
      database
        .collection("prompts")
        .find(filter)
        .sort({ createdAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      database.collection("prompts").countDocuments(filter),
    ]);
 
    return res.json({
      prompts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return next(error);
  }
});
 
router.patch("/prompts/:id/moderate", async (req, res, next) => {
  try {
    const promptId = validObjectId(req.params.id);
 
    if (!promptId) {
      return res.status(400).json({
        message: "The selected prompt ID is invalid.",
      });
    }
 
    const action = cleanText(req.body.action);
    const rejectionFeedback = cleanText(req.body.rejectionFeedback);
 
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        message: "Choose approve or reject for prompt moderation.",
      });
    }
 
    if (action === "reject" && rejectionFeedback.length < 10) {
      return res.status(400).json({
        message: "Give the creator at least 10 characters of rejection feedback.",
      });
    }
 
    const database = getDatabase();
    const result = await database.collection("prompts").findOneAndUpdate(
      { _id: promptId },
      {
        $set: {
          status: action === "approve" ? "approved" : "rejected",
          rejectionFeedback:
            action === "approve" ? "" : rejectionFeedback,
          moderatedBy: req.auth.user._id,
          moderatedByEmail: req.auth.user.email,
          moderatedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );
 
    if (!result) {
      return res.status(404).json({
        message: "The selected marketplace prompt was not found.",
      });
    }
 
    return res.json({
      message:
        action === "approve"
          ? "The prompt is now approved for marketplace discovery."
          : "The prompt was rejected and creator feedback was saved.",
      prompt: result,
    });
  } catch (error) {
    return next(error);
  }
});
 
router.get("/users", async (req, res, next) => {
  try {
    const page = positiveNumber(req.query.page, 1, 10000);
    const limit = positiveNumber(req.query.limit, 25, 50);
    const search = cleanText(req.query.search);
    const database = getDatabase();
    const filter = {};
 
    if (search) {
      const expression = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );
      filter.$or = [{ name: expression }, { email: expression }];
    }
 
    const [users, total] = await Promise.all([
      database
        .collection("users")
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      database.collection("users").countDocuments(filter),
    ]);
 
    return res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return next(error);
  }
});
 
router.patch("/users/:id", async (req, res, next) => {
  try {
    const userId = validObjectId(req.params.id);
 
    if (!userId) {
      return res.status(400).json({
        message: "The selected user ID is invalid.",
      });
    }
 
    const allowedRoles = ["user", "creator", "admin"];
    const allowedSubscriptions = ["free", "premium"];
    const allowedStatuses = ["active", "blocked"];
    const update = {};
 
    if (req.body.role !== undefined) {
      if (!allowedRoles.includes(req.body.role)) {
        return res.status(400).json({
          message: "Choose a supported marketplace role.",
        });
      }
      update.role = req.body.role;
    }
 
    if (req.body.subscription !== undefined) {
      if (!allowedSubscriptions.includes(req.body.subscription)) {
        return res.status(400).json({
          message: "Choose free or premium access.",
        });
      }
      update.subscription = req.body.subscription;
      update.subscriptionStatus =
        req.body.subscription === "premium" ? "active" : "inactive";
    }
 
    if (req.body.accountStatus !== undefined) {
      if (!allowedStatuses.includes(req.body.accountStatus)) {
        return res.status(400).json({
          message: "Choose active or blocked account status.",
        });
      }
 
      if (
        userId.equals(req.auth.user._id) &&
        req.body.accountStatus === "blocked"
      ) {
        return res.status(400).json({
          message: "Administrators cannot block their own account.",
        });
      }
 
      update.accountStatus = req.body.accountStatus;
    }
 
    if (!Object.keys(update).length) {
      return res.status(400).json({
        message: "Provide a role, subscription, or account status update.",
      });
    }
 
    update.updatedAt = new Date();
    update.updatedByAdmin = req.auth.user._id;
 
    const user = await getDatabase().collection("users").findOneAndUpdate(
      { _id: userId },
      { $set: update },
      { returnDocument: "after" },
    );
 
    if (!user) {
      return res.status(404).json({
        message: "The selected marketplace user was not found.",
      });
    }
 
    return res.json({
      message: "Marketplace user access was updated.",
      user,
    });
  } catch (error) {
    return next(error);
  }
});
 
router.post("/users/:id/warnings", async (req, res, next) => {
  try {
    const userId = validObjectId(req.params.id);
    const message = cleanText(req.body.message);
 
    if (!userId) {
      return res.status(400).json({
        message: "The selected user ID is invalid.",
      });
    }
 
    if (message.length < 10 || message.length > 600) {
      return res.status(400).json({
        message: "Warning messages must contain between 10 and 600 characters.",
      });
    }
 
    const database = getDatabase();
    const user = await database.collection("users").findOne({ _id: userId });
 
    if (!user) {
      return res.status(404).json({
        message: "The selected marketplace user was not found.",
      });
    }
 
    const warning = {
      userId,
      userEmail: user.email,
      message,
      read: false,
      createdBy: req.auth.user._id,
      createdByEmail: req.auth.user.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await database
      .collection("warnings")
      .insertOne(warning);
 
    return res.status(201).json({
      message: "The marketplace warning was sent to the user.",
      warning: { ...warning, _id: result.insertedId },
    });
  } catch (error) {
    return next(error);
  }
});
 
router.get("/reports", async (req, res, next) => {
  try {
    const allowedStatuses = ["open", "resolved", "dismissed"];
    const status = allowedStatuses.includes(req.query.status)
      ? req.query.status
      : "open";
    const database = getDatabase();
 
    const reports = await database
      .collection("reports")
      .aggregate([
        { $match: { status } },
        { $sort: { createdAt: 1 } },
        {
          $lookup: {
            from: "prompts",
            localField: "promptId",
            foreignField: "_id",
            as: "prompt",
          },
        },
        {
          $set: {
            prompt: { $arrayElemAt: ["$prompt", 0] },
          },
        },
        {
          $project: {
            "prompt.promptText": 0,
            "prompt.usageInstructions": 0,
          },
        },
      ])
      .toArray();
 
    return res.json({
      reports,
      total: reports.length,
    });
  } catch (error) {
    return next(error);
  }
});
 
router.patch("/reports/:id", async (req, res, next) => {
  try {
    const reportId = validObjectId(req.params.id);
    const allowedStatuses = ["resolved", "dismissed"];
    const status = cleanText(req.body.status);
    const resolutionNote = cleanText(req.body.resolutionNote);
 
    if (!reportId) {
      return res.status(400).json({
        message: "The selected report ID is invalid.",
      });
    }
 
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Choose resolved or dismissed report status.",
      });
    }
 
    if (resolutionNote.length < 5 || resolutionNote.length > 600) {
      return res.status(400).json({
        message: "Add a short moderation resolution note.",
      });
    }
 
    const report = await getDatabase()
      .collection("reports")
      .findOneAndUpdate(
        { _id: reportId },
        {
          $set: {
            status,
            resolutionNote,
            resolvedBy: req.auth.user._id,
            resolvedByEmail: req.auth.user.email,
            resolvedAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" },
      );
 
    if (!report) {
      return res.status(404).json({
        message: "The selected marketplace report was not found.",
      });
    }
 
    return res.json({
      message: `The report was ${status}.`,
      report,
    });
  } catch (error) {
    return next(error);
  }
});
 
export default router;
