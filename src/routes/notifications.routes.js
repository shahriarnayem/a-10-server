import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";
import { verifyMarketplaceToken } from "../middleware/verifyMarketplaceToken.js";
 
const router = Router();
 
router.use(verifyMarketplaceToken);
 
router.get("/", async (req, res, next) => {
  try {
    const database = getDatabase();
    const filter = { userId: req.auth.user._id };
 
    if (req.query.unreadOnly === "true") {
      filter.read = { $ne: true };
    }
 
    const [notifications, unreadCount] = await Promise.all([
      database
        .collection("warnings")
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray(),
      database.collection("warnings").countDocuments({
        userId: req.auth.user._id,
        read: { $ne: true },
      }),
    ]);
 
    return res.json({
      notifications,
      total: notifications.length,
      unreadCount,
    });
  } catch (error) {
    return next(error);
  }
});
 
router.patch("/read-all", async (req, res, next) => {
  try {
    const result = await getDatabase().collection("warnings").updateMany(
      {
        userId: req.auth.user._id,
        read: { $ne: true },
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );
 
    return res.json({
      message: "All marketplace notifications were marked as read.",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    return next(error);
  }
});
 
router.patch("/:id/read", async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "The selected notification ID is invalid.",
      });
    }
 
    const notification = await getDatabase()
      .collection("warnings")
      .findOneAndUpdate(
        {
          _id: new ObjectId(req.params.id),
          userId: req.auth.user._id,
        },
        {
          $set: {
            read: true,
            readAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" },
      );
 
    if (!notification) {
      return res.status(404).json({
        message: "The selected marketplace notification was not found.",
      });
    }
 
    return res.json({
      message: "Marketplace notification marked as read.",
      notification,
    });
  } catch (error) {
    return next(error);
  }
});
 
export default router;
