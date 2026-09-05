import app from "./app.js";
import {
  closeDatabaseConnection,
  connectToDatabase,
} from "./config/database.js";
import { loadEnvironment } from "./config/env.js";
import { ensureDatabaseIndexes } from "./config/indexes.js";

let server = null;
let isShuttingDown = false;

async function startServer() {
  try {
    const environment = loadEnvironment();

    // Connect to MongoDB and ensure indexes for local dev
    const database = await connectToDatabase({
      mongoUri: environment.mongoUri,
      mongoDatabaseName: environment.mongoDatabaseName,
    });

    console.log(
      "[AI Prompt Marketplace API] MongoDB connected successfully.",
    );

    await ensureDatabaseIndexes(database);

    console.log(
      "[AI Prompt Marketplace API] Database indexes are ready.",
    );

    server = app.listen(environment.port, () => {
      console.log(
        `[AI Prompt Marketplace API] Server running at http://localhost:${environment.port}`,
      );
      console.log(
        `[AI Prompt Marketplace API] Health check available at http://localhost:${environment.port}/api/health`,
      );
    });
  } catch (error) {
    console.error(
      `[AI Prompt Marketplace API] Startup failed: ${error.message}`,
    );

    await closeDatabaseConnection().catch(() => undefined);

    process.exit(1);
  }
}

async function shutDownServer(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(
    `[AI Prompt Marketplace API] ${signal} received. Closing active services.`,
  );

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }

    await closeDatabaseConnection();

    console.log(
      "[AI Prompt Marketplace API] Server and database connections closed successfully.",
    );

    process.exit(0);
  } catch (error) {
    console.error(
      `[AI Prompt Marketplace API] Shutdown failed: ${error.message}`,
    );

    process.exit(1);
  }
}

process.on("SIGTERM", () => {
  void shutDownServer("SIGTERM");
});

process.on("SIGINT", () => {
  void shutDownServer("SIGINT");
});

// Skip app.listen when running as a Vercel Serverless Function
if (process.env.VERCEL !== "1") {
  void startServer();
}