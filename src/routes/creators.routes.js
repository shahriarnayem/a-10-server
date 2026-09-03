import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";
import { verifyMarketplaceToken } from "../middleware/verifyMarketplaceToken.js";
import {
  isHttpsUrl,
  normalizeCreatorProfile,
  positiveInteger,
} from "../utils/community.js";
 
const router = Router();
 
function creatorProjection() {
  return {
    firebaseUid: 0,
    accountStatus: 0,
    subscription: 0,
    subscriptionStatus: 0,
    stripeCustomerId: 0,
    stripeCheckoutSessionId: 0,
    updatedAt: 0,
  };
}
 
router.patch("/me", verifyMarketplaceToken, async (req, res, next) => {
  try {
    const profile = normalizeCreatorProfile(req.body);
 
    if (!isHttpsUrl(profile.website)) {
      return res.status(400).json({
        message: "The creator website must use a valid HTTPS URL.",
      });
    }
 
    const database = getDatabase();
 
    await database.collection("users").updateOne(
      { _id: req.auth.user._id },
      {
        $set: {
          ...profile,
          updatedAt: new Date(),
        },
      },
    );
 
    const creator = await database.collection("users").findOne(
      { _id: req.auth.user._id },
      { projection: creatorProjection() },
    );
 
    return res.json({
      message: "Your public creator profile was updated.",
      creator,
    });
  } catch (error) {
    return next(error);
  }
});
 
router.get("/:id", async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "The selected creator ID is invalid.",
      });
    }
 
    const database = getDatabase();
    const creatorId = new ObjectId(req.params.id);
    const page = positiveInteger(req.query.page, 1, 10000);
    const limit = positiveInteger(req.query.limit, 6, 24);
    const skip = (page - 1) * limit;
 
    const creator = await database.collection("users").findOne(
      {
        _id: creatorId,
        accountStatus: { $ne: "blocked" },
      },
      { projection: creatorProjection() },
    );
 
    if (!creator) {
      return res.status(404).json({
        message: "The selected marketplace creator was not found.",
      });
    }
 
    const [promptResult, followerCount] = await Promise.all([
      database
        .collection("prompts")
        .aggregate([
          {
            $match: {
              creatorId,
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
              statistics: [
                {
                  $group: {
                    _id: null,
                    views: { $sum: { $ifNull: ["$viewCount", 0] } },
                    copies: { $sum: { $ifNull: ["$copyCount", 0] } },
                    averageRating: { $avg: "$averageRating" },
                  },
                },
              ],
            },
          },
        ])
        .next(),
      database.collection("follows").countDocuments({ creatorId }),
    ]);
 
    const total = promptResult?.metadata?.[0]?.total || 0;
    const statistics = promptResult?.statistics?.[0] || {};
 
    return res.json({
      creator: {
        ...creator,
        followerCount,
        promptCount: total,
        totalViews: statistics.views || 0,
        totalCopies: statistics.copies || 0,
        averageRating: Number(statistics.averageRating || 0),
      },
      prompts: promptResult?.prompts || [],
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
 
export default router;
