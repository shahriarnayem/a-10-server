import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";
 
const router = Router();
 
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
 
function positiveNumber(value, fallback, maximum = 100) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number) || number < 1) return fallback;
  return Math.min(number, maximum);
}
 
router.get("/filters", async (req, res, next) => {
  try {
    const [filters] = await getDatabase().collection("prompts").aggregate([
      { $match: { status: "approved" } },
      {
        $facet: {
          categories: [
            { $match: { category: { $type: "string", $ne: "" } } },
            { $group: { _id: "$category" } },
            { $sort: { _id: 1 } },
          ],
          aiTools: [
            { $match: { aiModel: { $type: "string", $ne: "" } } },
            { $group: { _id: "$aiModel" } },
            { $sort: { _id: 1 } },
          ],
          difficulties: [
            { $match: { difficultyLevel: { $type: "string", $ne: "" } } },
            { $group: { _id: "$difficultyLevel" } },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]).toArray();
 
    return res.json({
      categories: filters.categories.map((item) => item._id),
      aiTools: filters.aiTools.map((item) => item._id),
      difficulties: filters.difficulties.length ? filters.difficulties.map((item) => item._id) : ["Beginner", "Intermediate", "Pro"],
    });
  } catch (error) {
    return next(error);
  }
});
 
router.get("/", async (req, res, next) => {
  try {
    const database = getDatabase();
    const page = positiveNumber(req.query.page, 1, 10000);
    const limit = positiveNumber(req.query.limit, 6, 24);
    const skip = (page - 1) * limit;
    const search = String(req.query.search || "").trim();
    const category = String(req.query.category || "").trim();
    const aiTool = String(req.query.aiTool || "").trim();
    const difficulty = String(req.query.difficulty || "").trim();
    const sort = String(req.query.sort || "latest");
 
    const match = { status: "approved" };
    if (search) {
      const expression = new RegExp(escapeRegex(search), "i");
      match.$or = [{ title: expression }, { tags: expression }, { aiModel: expression }];
    }
    if (category) match.category = category;
    if (aiTool) match.aiModel = aiTool;
    if (difficulty) match.difficultyLevel = difficulty;
 
    const sortOptions = {
      popular: { averageRating: -1, reviewCount: -1, createdAt: -1 },
      copied: { copyCount: -1, createdAt: -1 },
      latest: { createdAt: -1 },
    };
 
    const [result] = await database.collection("prompts").aggregate([
      { $match: match },
      { $sort: sortOptions[sort] || sortOptions.latest },
      {
        $facet: {
          prompts: [
            { $skip: skip },
            { $limit: limit },
            { $project: { promptText: 0, usageInstructions: 0 } },
          ],
          metadata: [{ $count: "total" }],
        },
      },
      {
        $project: {
          prompts: 1,
          total: { $ifNull: [{ $arrayElemAt: ["$metadata.total", 0] }, 0] },
        },
      },
    ]).toArray();
 
    const total = result?.total || 0;
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
      appliedFilters: { search, category, aiTool, difficulty, sort },
    });
  } catch (error) {
    return next(error);
  }
});
 
router.get("/:id/reviews", async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "The selected prompt ID is invalid." });
    const database = getDatabase();
    const promptId = new ObjectId(req.params.id);
    const prompt = await database.collection("prompts").findOne({ _id: promptId, status: "approved" });
    if (!prompt) return res.status(404).json({ message: "The selected marketplace prompt was not found." });
 
    const reviews = await database.collection("reviews").find({ promptId }).sort({ createdAt: -1 }).limit(20).toArray();
    return res.json({ reviews, total: reviews.length });
  } catch (error) {
    return next(error);
  }
});
 
export default router;
