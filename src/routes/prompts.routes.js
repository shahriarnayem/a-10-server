import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";
import {
  attachOptionalMarketplaceUser,
  verifyMarketplaceToken,
} from "../middleware/verifyMarketplaceToken.js";
 
const router = Router();
 
const allowedCategories = [
  "Marketing",
  "Development",
  "Business",
  "Education",
  "Design",
  "Productivity",
  "Writing",
  "Data Analysis",
];
 
const allowedDifficulties = ["Beginner", "Intermediate", "Pro"];
const allowedVisibilities = ["public", "private"];
 
function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}
 
function normalizeTags(tags) {
  const values = Array.isArray(tags) ? tags : [];
  return [...new Set(values.map((tag) => cleanText(tag).toLowerCase()).filter(Boolean).slice(0, 8))];
}
 
function normalizeVisibility(payload) {
  if (allowedVisibilities.includes(payload.visibility)) return payload.visibility;
  return payload.accessLevel === "premium" ? "private" : "public";
}
 
function isValidHttpsUrl(value) {
  try { return new URL(value).protocol === "https:"; }
  catch { return false; }
}
 
function normalizePrompt(payload) {
  const visibility = normalizeVisibility(payload);
  return {
    title: cleanText(payload.title),
    description: cleanText(payload.description),
    category: payload.category,
    tags: normalizeTags(payload.tags),
    aiModel: cleanText(payload.aiModel),
    difficultyLevel: payload.difficultyLevel,
    usageInstructions: cleanText(payload.usageInstructions),
    promptText: cleanText(payload.promptText),
    imageUrl: cleanText(payload.imageUrl),
    visibility,
    accessLevel: visibility === "private" ? "premium" : "free",
  };
}
 
function validatePrompt(prompt) {
  const errors = [];
  if (prompt.title.length < 5 || prompt.title.length > 120) errors.push("Prompt title must contain between 5 and 120 characters.");
  if (prompt.description.length < 20 || prompt.description.length > 1000) errors.push("Prompt description must contain between 20 and 1000 characters.");
  if (!allowedCategories.includes(prompt.category)) errors.push("Choose a supported AI prompt category.");
  if (prompt.aiModel.length < 2) errors.push("Specify the AI tool supported by this prompt.");
  if (!allowedDifficulties.includes(prompt.difficultyLevel)) errors.push("Choose Beginner, Intermediate, or Pro difficulty.");
  if (prompt.usageInstructions.length < 15) errors.push("Usage instructions must contain at least 15 characters.");
  if (prompt.promptText.length < 20) errors.push("Prompt content must contain at least 20 characters.");
  if (!allowedVisibilities.includes(prompt.visibility)) errors.push("Prompt visibility must be public or private.");
  if (!isValidHttpsUrl(prompt.imageUrl)) errors.push("Upload a valid HTTPS marketplace thumbnail.");
  if (!prompt.tags.length) errors.push("Add at least one relevant prompt tag.");
  return errors;
}
 
function hasPremiumAccess(user) {
  return user?.role === "admin" || user?.subscription === "premium" || user?.subscriptionStatus === "active";
}
 
function isPromptOwner(prompt, user) {
  return prompt.creatorId?.toString() === user?._id?.toString();
}
 
router.post("/", verifyMarketplaceToken, async (req, res, next) => {
  try {
    const promptData = normalizePrompt(req.body);
    const errors = validatePrompt(promptData);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
 
    const database = getDatabase();
    const creator = req.auth.user;
    if (!hasPremiumAccess(creator)) {
      const existingPromptCount = await database.collection("prompts").countDocuments({ creatorId: creator._id, status: { $ne: "rejected" } });
      if (existingPromptCount >= 3) return res.status(403).json({ message: "Free marketplace accounts can publish up to three active prompt submissions." });
    }
 
    const now = new Date();
    const prompt = {
      ...promptData,
      status: "pending",
      rejectionFeedback: "",
      featured: false,
      creatorId: creator._id,
      creatorName: creator.name,
      creatorEmail: creator.email,
      copyCount: 0,
      viewCount: 0,
      averageRating: 0,
      reviewCount: 0,
      createdAt: now,
      updatedAt: now,
    };
 
    const result = await database.collection("prompts").insertOne(prompt);
    return res.status(201).json({ message: "Your AI prompt was submitted and is waiting for marketplace review.", prompt: { ...prompt, _id: result.insertedId } });
  } catch (error) {
    return next(error);
  }
});
 
router.get("/mine", verifyMarketplaceToken, async (req, res, next) => {
  try {
    const prompts = await getDatabase().collection("prompts").find(
      { creatorId: req.auth.user._id },
      { projection: { promptText: 0 } },
    ).sort({ createdAt: -1 }).toArray();
    return res.json({ prompts, total: prompts.length });
  } catch (error) {
    return next(error);
  }
});
 
router.get("/:id/analytics", verifyMarketplaceToken, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "The selected prompt ID is invalid." });
    const database = getDatabase();
    const promptId = new ObjectId(req.params.id);
    const prompt = await database.collection("prompts").findOne({ _id: promptId });
    if (!prompt) return res.status(404).json({ message: "The selected AI prompt was not found." });
    if (!isPromptOwner(prompt, req.auth.user) && req.auth.user.role !== "admin") return res.status(403).json({ message: "You cannot view analytics for another creator's prompt." });
 
    const [bookmarkCount, reviewCount, reportCount] = await Promise.all([
      database.collection("bookmarks").countDocuments({ promptId }),
      database.collection("reviews").countDocuments({ promptId }),
      database.collection("reports").countDocuments({ promptId }),
    ]);
 
    return res.json({
      analytics: {
        promptId: prompt._id,
        title: prompt.title,
        status: prompt.status,
        visibility: prompt.visibility || "public",
        copies: prompt.copyCount || 0,
        views: prompt.viewCount || 0,
        bookmarks: bookmarkCount,
        reviews: reviewCount,
        reports: reportCount,
        averageRating: prompt.averageRating || 0,
        createdAt: prompt.createdAt,
        updatedAt: prompt.updatedAt,
      },
    });
  } catch (error) {
    return next(error);
  }
});
 
router.patch("/:id", verifyMarketplaceToken, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "The selected prompt ID is invalid." });
    const database = getDatabase();
    const promptId = new ObjectId(req.params.id);
    const existingPrompt = await database.collection("prompts").findOne({ _id: promptId });
    if (!existingPrompt) return res.status(404).json({ message: "The selected AI prompt was not found." });
 
    const owner = isPromptOwner(existingPrompt, req.auth.user);
    const admin = req.auth.user.role === "admin";
    if (!owner && !admin) return res.status(403).json({ message: "You cannot update another creator's prompt." });
 
    const promptData = normalizePrompt({ ...existingPrompt, ...req.body });
    const errors = validatePrompt(promptData);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
 
    const updateData = { ...promptData, updatedAt: new Date() };
    if (!admin) {
      updateData.status = "pending";
      updateData.rejectionFeedback = "";
    }
 
    await database.collection("prompts").updateOne({ _id: promptId }, { $set: updateData });
    const prompt = await database.collection("prompts").findOne({ _id: promptId });
    return res.json({ message: admin ? "The AI prompt was updated." : "The updated AI prompt was submitted for marketplace review.", prompt });
  } catch (error) {
    return next(error);
  }
});
 
router.delete("/:id", verifyMarketplaceToken, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "The selected prompt ID is invalid." });
    const database = getDatabase();
    const promptId = new ObjectId(req.params.id);
    const prompt = await database.collection("prompts").findOne({ _id: promptId });
    if (!prompt) return res.status(404).json({ message: "The selected AI prompt was not found." });
    if (!isPromptOwner(prompt, req.auth.user) && req.auth.user.role !== "admin") return res.status(403).json({ message: "You cannot delete another creator's prompt." });
 
    await database.collection("prompts").deleteOne({ _id: promptId });
    await Promise.all([
      database.collection("bookmarks").deleteMany({ promptId }),
      database.collection("reviews").deleteMany({ promptId }),
      database.collection("reports").deleteMany({ promptId }),
    ]);
    return res.json({ message: `"${prompt.title}" was removed from the AI prompt marketplace.` });
  } catch (error) {
    return next(error);
  }
});
 
router.get("/:id", attachOptionalMarketplaceUser, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "The selected marketplace prompt ID is invalid." });
    const database = getDatabase();
    const promptId = new ObjectId(req.params.id);
    const prompt = await database.collection("prompts").findOne({ _id: promptId });
    if (!prompt) return res.status(404).json({ message: "The selected AI prompt was not found." });
 
    const currentUser = req.auth?.user;
    const owner = isPromptOwner(prompt, currentUser);
    const admin = currentUser?.role === "admin";
    if (prompt.status !== "approved" && !owner && !admin) return res.status(404).json({ message: "The selected AI prompt is not available in the marketplace." });
 
    const visibility = prompt.visibility || (prompt.accessLevel === "premium" ? "private" : "public");
    const canReadPrompt = visibility === "public" || owner || admin || hasPremiumAccess(currentUser);
    await database.collection("prompts").updateOne({ _id: promptId }, { $inc: { viewCount: 1 } });
 
    return res.json({
      prompt: {
        ...prompt,
        visibility,
        viewCount: (prompt.viewCount || 0) + 1,
        promptText: canReadPrompt ? prompt.promptText : null,
        usageInstructions: canReadPrompt ? prompt.usageInstructions : null,
        isLocked: !canReadPrompt,
      },
    });
  } catch (error) {
    return next(error);
  }
});
 
export default router;
