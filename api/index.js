
import app from "../src/app.js";
import { connectToDatabase } from "../src/config/database.js";
import { loadEnvironment } from "../src/config/env.js";
import { ensureDatabaseIndexes } from "../src/config/indexes.js";

let databaseStartup = null;

function startDatabase() {
  if (!databaseStartup) {
    databaseStartup = (async () => {
      const environment = loadEnvironment();

      // Log to Vercel runtime console when attempt begins
      console.log("[MongoDB Attempt] Connecting to URI:", environment.mongoUri ? "URI Present" : "URI Missing");

      const database = await connectToDatabase({
        mongoUri: environment.mongoUri,
        mongoDatabaseName: environment.mongoDatabaseName,
      });

      await ensureDatabaseIndexes(database);
      return database;
    })().catch((error) => {
      databaseStartup = null;
      console.error("[MongoDB Connection Failure Detail]:", error); // <--- prints exact driver error
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
    return res.status(500).json({
      error: error.message || "Database connection failed",
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}