import "dotenv/config";

import {
  closeDatabaseConnection,
  connectToDatabase,
} from "../src/config/database.js";

import {
  loadEnvironment,
} from "../src/config/env.js";

import {
  ensureDatabaseIndexes,
} from "../src/config/indexes.js";

async function createIndexes() {
  const environment = loadEnvironment();

  const database =
    await connectToDatabase({
      mongoUri: environment.mongoUri,
      mongoDatabaseName:
        environment.mongoDatabaseName,
    });

  console.log(
    "[indexes] Connected to MongoDB successfully.",
  );

  await ensureDatabaseIndexes(database);

  console.log(
    "[indexes] AI Prompt Marketplace database indexes are ready.",
  );
}

async function runCreateIndexes() {
  try {
    await createIndexes();
  } catch (error) {
    console.error(
      "[indexes] Database index creation failed:",
      error,
    );

    process.exitCode = 1;
  } finally {
    try {
      await closeDatabaseConnection();

      console.log(
        "[indexes] MongoDB connection closed.",
      );
    } catch (closeError) {
      console.error(
        "[indexes] Failed to close MongoDB connection:",
        closeError,
      );

      process.exitCode = 1;
    }
  }
}

await runCreateIndexes();