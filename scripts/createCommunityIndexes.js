import "dotenv/config";
import {
  closeDatabaseConnection,
  connectToDatabase,
} from "../src/config/database.js";
import { env } from "../src/config/env.js";
 
const indexDefinitions = [
  {
    collection: "collections",
    key: { ownerId: 1, nameKey: 1 },
    options: { name: "collections_owner_name_unique", unique: true },
  },
  {
    collection: "collections",
    key: { isPublic: 1, updatedAt: -1 },
    options: { name: "collections_public_updated" },
  },
  {
    collection: "follows",
    key: { followerId: 1, creatorId: 1 },
    options: { name: "follows_follower_creator_unique", unique: true },
  },
  {
    collection: "follows",
    key: { creatorId: 1, createdAt: -1 },
    options: { name: "follows_creator_date" },
  },
  {
    collection: "promptVersions",
    key: { promptId: 1, versionNumber: -1 },
    options: { name: "prompt_versions_prompt_number_unique", unique: true },
  },
  {
    collection: "auditLogs",
    key: { createdAt: -1 },
    options: { name: "audit_logs_date" },
  },
  {
    collection: "auditLogs",
    key: { resource: 1, method: 1, createdAt: -1 },
    options: { name: "audit_logs_resource_method_date" },
  },
];
 
function sameKey(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
 
async function ensureIndex(database, definition) {
  const collection = database.collection(definition.collection);
  const existing = await collection.indexes();
  const matchingKey = existing.find((index) => sameKey(index.key, definition.key));
 
  if (matchingKey) {
    console.log(
      `[indexes] ${definition.collection}: using existing ${matchingKey.name}`,
    );
    return matchingKey.name;
  }
 
  const name = await collection.createIndex(
    definition.key,
    definition.options,
  );
 
  console.log(`[indexes] ${definition.collection}: created ${name}`);
  return name;
}
 
async function run() {
  try {
    const database = await connectToDatabase({
      mongoUri: env.mongodbUri,
      mongoDatabaseName: env.mongodbDatabase,
    });
 
    for (const definition of indexDefinitions) {
      await ensureIndex(database, definition);
    }
 
    console.log("Community extension indexes are ready.");
  } catch (error) {
    console.error("Community index creation failed:", error);
    process.exitCode = 1;
  } finally {
    await closeDatabaseConnection().catch((error) => {
      console.error("Database close failed:", error);
      process.exitCode = 1;
    });
  }
}
 
await run();
