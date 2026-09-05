const versionFields = [
  "title",
  "description",
  "promptText",
  "usageInstructions",
  "category",
  "aiModel",
  "difficultyLevel",
  "tags",
  "imageUrl",
  "imageHost",
  "imageHostId",
  "visibility",
  "accessLevel",
  "status",
  "rejectionFeedback",
];

export function promptSnapshot(prompt) {
  return Object.fromEntries(
    versionFields.map((field) => [
      field,
      prompt[field] ?? null,
    ]),
  );
}

export async function recordPromptVersion({
  database,
  prompt,
  actor,
  reason,
}) {
  const versionNumber =
    (await database.collection("promptVersions").countDocuments({
      promptId: prompt._id,
    })) + 1;

  const version = {
    promptId: prompt._id,
    versionNumber,
    snapshot: promptSnapshot(prompt),
    reason: String(reason || "Prompt updated").slice(
      0,
      160,
    ),
    actorId: actor?._id || null,
    actorName: actor?.name || "Marketplace system",
    createdAt: new Date(),
  };

  const result = await database
    .collection("promptVersions")
    .insertOne(version);

  return {
    ...version,
    _id: result.insertedId,
  };
}

export const restorablePromptFields =
  versionFields.filter(
    (field) =>
      !["status", "rejectionFeedback"].includes(field),
  );