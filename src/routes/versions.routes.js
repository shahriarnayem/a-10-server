import { Router } from "express";
import { ObjectId } from "mongodb";

import { getDatabase } from "../config/database.js";
import { verifyMarketplaceToken } from "../middleware/verifyMarketplaceToken.js";
import {
  recordPromptVersion,
  restorablePromptFields,
} from "../services/promptVersions.js";

const router = Router();

function ownsPrompt(prompt, user) {
  return (
    prompt.creatorId?.toString() ===
    user?._id?.toString()
  );
}

function validId(value) {
  return ObjectId.isValid(value)
    ? new ObjectId(value)
    : null;
}

async function authorizedPrompt(
  database,
  promptId,
  user,
) {
  const prompt = await database
    .collection("prompts")
    .findOne({
      _id: promptId,
    });

  if (!prompt) {
    return {
      status: 404,
      message:
        "The selected AI prompt was not found.",
    };
  }

  if (!ownsPrompt(prompt, user) && user.role !== "admin") {
    return {
      status: 403,
      message:
        "You cannot access another creator's prompt history.",
    };
  }

  return { prompt };
}

router.get(
  "/:id/versions",
  verifyMarketplaceToken,
  async (req, res, next) => {
    try {
      const promptId = validId(req.params.id);

      if (!promptId) {
        return res.status(400).json({
          message: "The prompt ID is invalid.",
        });
      }

      const database = getDatabase();

      const authorization = await authorizedPrompt(
        database,
        promptId,
        req.auth.user,
      );

      if (!authorization.prompt) {
        return res.status(
          authorization.status,
        ).json({
          message: authorization.message,
        });
      }

      const versions = await database
        .collection("promptVersions")
        .find({ promptId })
        .sort({ versionNumber: -1 })
        .limit(50)
        .toArray();

      return res.json({
        prompt: {
          _id: authorization.prompt._id,
          title: authorization.prompt.title,
          status: authorization.prompt.status,
          updatedAt: authorization.prompt.updatedAt,
        },
        versions,
        total: versions.length,
      });
    } catch (error) {
      return next(error);
    }
  },
);

router.post(
  "/:id/versions/:versionId/restore",
  verifyMarketplaceToken,
  async (req, res, next) => {
    try {
      const promptId = validId(req.params.id);
      const versionId = validId(req.params.versionId);

      if (!promptId || !versionId) {
        return res.status(400).json({
          message:
            "The prompt or version ID is invalid.",
        });
      }

      const database = getDatabase();

      const authorization = await authorizedPrompt(
        database,
        promptId,
        req.auth.user,
      );

      if (!authorization.prompt) {
        return res.status(
          authorization.status,
        ).json({
          message: authorization.message,
        });
      }

      const version = await database
        .collection("promptVersions")
        .findOne({
          _id: versionId,
          promptId,
        });

      if (!version) {
        return res.status(404).json({
          message:
            "The selected prompt version was not found.",
        });
      }

      await recordPromptVersion({
        database,
        prompt: authorization.prompt,
        actor: req.auth.user,
        reason:
          `Automatic backup before restoring version ` +
          `${version.versionNumber}`,
      });

      const restoredFields = Object.fromEntries(
        restorablePromptFields.map((field) => [
          field,
          version.snapshot[field] ??
            authorization.prompt[field] ??
            null,
        ]),
      );

      const admin = req.auth.user.role === "admin";

      await database.collection("prompts").updateOne(
        { _id: promptId },
        {
          $set: {
            ...restoredFields,
            status: admin
              ? authorization.prompt.status
              : "pending",
            rejectionFeedback: "",
            restoredFromVersion: version.versionNumber,
            updatedAt: new Date(),
          },
        },
      );

      const prompt = await database
        .collection("prompts")
        .findOne({
          _id: promptId,
        });

      return res.json({
        message: admin
          ? `Version ${version.versionNumber} was restored.`
          : `Version ${version.versionNumber} was restored and submitted for moderation.`,
        prompt,
      });
    } catch (error) {
      return next(error);
    }
  },
);

export default router;