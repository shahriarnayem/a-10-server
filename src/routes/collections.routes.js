import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";
import {
  attachOptionalMarketplaceUser,
  verifyMarketplaceToken,
} from "../middleware/verifyMarketplaceToken.js";
 
const router = Router();
 
function normalizeCollection(input = {}) {
  return {
    name: String(input.name || "").trim().slice(0, 80),
    description: String(input.description || "").trim().slice(0, 400),
    isPublic: Boolean(input.isPublic),
  };
}
 
function ownsCollection(collection, user) {
  return collection.ownerId.toString() === user?._id?.toString();
}
 
async function findCollection(database, value) {
  if (!ObjectId.isValid(value)) return null;
  return database.collection("collections").findOne({
    _id: new ObjectId(value),
  });
}
 
router.get("/mine", verifyMarketplaceToken, async (req, res, next) => {
  try {
    const collections = await getDatabase()
      .collection("collections")
      .find({ ownerId: req.auth.user._id })
      .sort({ updatedAt: -1 })
      .toArray();
 
    return res.json({
      collections,
      total: collections.length,
    });
  } catch (error) {
    return next(error);
  }
});
 
router.post("/", verifyMarketplaceToken, async (req, res, next) => {
  try {
    const collectionData = normalizeCollection(req.body);
 
    if (collectionData.name.length < 3) {
      return res.status(400).json({
        message: "A collection name must contain at least three characters.",
      });
    }
 
    const database = getDatabase();
    const existing = await database.collection("collections").findOne({
      ownerId: req.auth.user._id,
      nameKey: collectionData.name.toLowerCase(),
    });
 
    if (existing) {
      return res.status(409).json({
        message: "You already have a collection with this name.",
      });
    }
 
    const now = new Date();
    const collection = {
      ...collectionData,
      nameKey: collectionData.name.toLowerCase(),
      ownerId: req.auth.user._id,
      ownerName: req.auth.user.name,
      promptIds: [],
      promptCount: 0,
      createdAt: now,
      updatedAt: now,
    };
 
    const result = await database.collection("collections").insertOne(collection);
 
    return res.status(201).json({
      message: "Your prompt collection was created.",
      collection: { ...collection, _id: result.insertedId },
    });
  } catch (error) {
    return next(error);
  }
});
 
router.get("/:id", attachOptionalMarketplaceUser, async (req, res, next) => {
  try {
    const database = getDatabase();
    const collection = await findCollection(database, req.params.id);
 
    if (!collection) {
      return res.status(404).json({
        message: "The selected prompt collection was not found.",
      });
    }
 
    const user = req.auth?.user;
    const allowed =
      collection.isPublic ||
      ownsCollection(collection, user) ||
      user?.role === "admin";
 
    if (!allowed) {
      return res.status(403).json({
        message: "This prompt collection is private.",
      });
    }
 
    const prompts = collection.promptIds.length
      ? await database
          .collection("prompts")
          .find(
            {
              _id: { $in: collection.promptIds },
              status: "approved",
            },
            {
              projection: {
                promptText: 0,
                usageInstructions: 0,
                creatorEmail: 0,
              },
            },
          )
          .toArray()
      : [];
 
    return res.json({ collection, prompts });
  } catch (error) {
    return next(error);
  }
});
 
router.patch("/:id", verifyMarketplaceToken, async (req, res, next) => {
  try {
    const database = getDatabase();
    const collection = await findCollection(database, req.params.id);
 
    if (!collection) {
      return res.status(404).json({
        message: "The selected prompt collection was not found.",
      });
    }
 
    if (!ownsCollection(collection, req.auth.user) && req.auth.user.role !== "admin") {
      return res.status(403).json({
        message: "You cannot update another user's collection.",
      });
    }
 
    const update = normalizeCollection({ ...collection, ...req.body });
 
    if (update.name.length < 3) {
      return res.status(400).json({
        message: "A collection name must contain at least three characters.",
      });
    }
 
    await database.collection("collections").updateOne(
      { _id: collection._id },
      {
        $set: {
          ...update,
          nameKey: update.name.toLowerCase(),
          updatedAt: new Date(),
        },
      },
    );
 
    return res.json({ message: "The prompt collection was updated." });
  } catch (error) {
    return next(error);
  }
});
 
router.post(
  "/:id/prompts/:promptId",
  verifyMarketplaceToken,
  async (req, res, next) => {
    try {
      if (!ObjectId.isValid(req.params.promptId)) {
        return res.status(400).json({ message: "The prompt ID is invalid." });
      }
 
      const database = getDatabase();
      const collection = await findCollection(database, req.params.id);
 
      if (!collection) {
        return res.status(404).json({ message: "The collection was not found." });
      }
 
      if (!ownsCollection(collection, req.auth.user)) {
        return res.status(403).json({
          message: "You cannot add prompts to another user's collection.",
        });
      }
 
      const promptId = new ObjectId(req.params.promptId);
      const prompt = await database.collection("prompts").findOne({
        _id: promptId,
        status: "approved",
      });
 
      if (!prompt) {
        return res.status(404).json({
          message: "The selected approved prompt was not found.",
        });
      }
 
      const updateResult = await database.collection("collections").updateOne(
        { _id: collection._id, promptIds: { $ne: promptId } },
        {
          $addToSet: { promptIds: promptId },
          $inc: { promptCount: 1 },
          $set: { updatedAt: new Date() },
        },
      );
 
      return res.json({
        message: updateResult.modifiedCount
          ? `"${prompt.title}" was added to the collection.`
          : `"${prompt.title}" is already in the collection.`,
        added: updateResult.modifiedCount === 1,
      });
    } catch (error) {
      return next(error);
    }
  },
);
 
router.delete(
  "/:id/prompts/:promptId",
  verifyMarketplaceToken,
  async (req, res, next) => {
    try {
      if (!ObjectId.isValid(req.params.promptId)) {
        return res.status(400).json({ message: "The prompt ID is invalid." });
      }
 
      const database = getDatabase();
      const collection = await findCollection(database, req.params.id);
 
      if (!collection) {
        return res.status(404).json({ message: "The collection was not found." });
      }
 
      if (!ownsCollection(collection, req.auth.user)) {
        return res.status(403).json({
          message: "You cannot remove prompts from another user's collection.",
        });
      }
 
      const promptId = new ObjectId(req.params.promptId);
      const contained = collection.promptIds.some(
        (value) => value.toString() === promptId.toString(),
      );
 
      if (contained) {
        await database.collection("collections").updateOne(
          { _id: collection._id },
          {
            $pull: { promptIds: promptId },
            $inc: { promptCount: -1 },
            $set: { updatedAt: new Date() },
          },
        );
      }
 
      return res.json({
        message: contained
          ? "The prompt was removed from the collection."
          : "The prompt was not in this collection.",
        removed: contained,
      });
    } catch (error) {
      return next(error);
    }
  },
);
 
router.delete("/:id", verifyMarketplaceToken, async (req, res, next) => {
  try {
    const database = getDatabase();
    const collection = await findCollection(database, req.params.id);
 
    if (!collection) {
      return res.status(404).json({ message: "The collection was not found." });
    }
 
    if (!ownsCollection(collection, req.auth.user) && req.auth.user.role !== "admin") {
      return res.status(403).json({
        message: "You cannot delete another user's collection.",
      });
    }
 
    await database.collection("collections").deleteOne({ _id: collection._id });
 
    return res.json({ message: `"${collection.name}" was deleted.` });
  } catch (error) {
    return next(error);
  }
});
 
export default router;
