import app from "../src/app.js";
import {
  connectToDatabase,
} from "../src/config/database.js";
import {
  loadEnvironment,
} from "../src/config/env.js";
import {
  ensureDatabaseIndexes,
} from "../src/config/indexes.js";

let databaseStartup = null;

function startDatabase() {
  if (!databaseStartup) {
    databaseStartup = (async () => {
      const environment = loadEnvironment();

      const database =
        await connectToDatabase({
          mongoUri: environment.mongoUri,
          mongoDatabaseName:
            environment.mongoDatabaseName,
        });

      await ensureDatabaseIndexes(database);

      return database;
    })().catch((error) => {
      databaseStartup = null;
      throw error;
    });
  }

  return databaseStartup;
}

export default async function handler(req, res) {
  try {
    await startDatabase();

    return app(req, res);
  } catch (error) {
    console.error(
      "[AI Prompt Marketplace API] Serverless startup failed:",
      error,
    );

    return res.status(500).json({
      message:
        "The AI Prompt Marketplace database could not connect.",
    });
  }
}