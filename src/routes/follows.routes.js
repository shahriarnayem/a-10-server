import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";
import { verifyMarketplaceToken } from "../middleware/verifyMarketplaceToken.js";
import { positiveInteger } from "../utils/community.js";
 
const router = Router();
 
function validCreatorId(value) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}
 
router.get("/feed", verifyMarketplaceToken, async (req, res, next) => {
  try {
    const database = getDatabase();
    const page = positiveInteger(req.query.page, 1, 10000);
    const limit = positiveInteger(req.query.limit, 6, 24);
    const skip = (page - 1) * limit;
 
    const relationships = await database
      .collection("follows")
      .find({ followerId: req.auth.user._id })
      .project({ creatorId: 1 })
      .toArray();
 
    const creatorIds = relationships.map((item) => item.creatorId);
 
    if (creatorIds.length === 0) {
      return res.json({
        prompts: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      });
    }
 
    const [result] = await database
      .collection("prompts")
      .aggregate([
        {
          $match: {
            creatorId: { $in: creatorIds },
            status: "approved",
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $facet: {
            prompts: [
              { $skip: skip },
              { $limit: limit },
              {
                $project: {
                  promptText: 0,
                  usageInstructions: 0,
                  creatorEmail: 0,
                },
              },
            ],
            metadata: [{ $count: "total" }],
          },
        },
      ])
      .toArray();
 
    const total = result?.metadata?.[0]?.total || 0;
 
    return res.json({
      prompts: result?.prompts || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasPreviousPage: page > 1,
        hasNextPage: page * limit < total,
      },
    });
  } catch (error) {
    return next(error);
  }
});
 
router.get(
  "/creators/:creatorId/status",
  verifyMarketplaceToken,
  async (req, res, next) => {
    try {
      const creatorId = validCreatorId(req.params.creatorId);
 
      if (!creatorId) {
        return res.status(400).json({ message: "The creator ID is invalid." });
      }
 
      const relationship = await getDatabase().collection("follows").findOne({
        followerId: req.auth.user._id,
        creatorId,
      });
 
      return res.json({ following: Boolean(relationship) });
    } catch (error) {
      return next(error);
    }
  },
);
 
router.post(
  "/creators/:creatorId",
  verifyMarketplaceToken,
  async (req, res, next) => {
    try {
      const creatorId = validCreatorId(req.params.creatorId);
 
      if (!creatorId) {
        return res.status(400).json({ message: "The creator ID is invalid." });
      }
 
      if (creatorId.toString() === req.auth.user._id.toString()) {
        return res.status(400).json({
          message: "You cannot follow your own creator profile.",
        });
      }
 
      const database = getDatabase();
      const creator = await database.collection("users").findOne({
        _id: creatorId,
        accountStatus: { $ne: "blocked" },
      });
 
      if (!creator) {
        return res.status(404).json({
          message: "The selected creator was not found.",
        });
      }
 
      const result = await database.collection("follows").updateOne(
        {
          followerId: req.auth.user._id,
          creatorId,
        },
        {
          $setOnInsert: {
            followerId: req.auth.user._id,
            followerName: req.auth.user.name,
            creatorId,
            creatorName: creator.name,
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
 
      return res.json({
        message: result.upsertedCount
          ? `You are now following ${creator.name}.`
          : `You already follow ${creator.name}.`,
        following: true,
      });
    } catch (error) {
      return next(error);
    }
  },
);
 
router.delete(
  "/creators/:creatorId",
  verifyMarketplaceToken,
  async (req, res, next) => {
    try {
      const creatorId = validCreatorId(req.params.creatorId);
 
      if (!creatorId) {
        return res.status(400).json({ message: "The creator ID is invalid." });
      }
 
      const result = await getDatabase().collection("follows").deleteOne({
        followerId: req.auth.user._id,
        creatorId,
      });
 
      return res.json({
        message: result.deletedCount
          ? "The creator was removed from your following list."
          : "You were not following this creator.",
        following: false,
      });
    } catch (error) {
      return next(error);
    }
  },
);
 
export default router;
