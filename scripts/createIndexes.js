import { connectToDatabase, closeDatabaseConnection } from "../src/config/database.js";
import { loadEnvironment } from "../src/config/env.js";

async function createIndexes() {
  const environment = loadEnvironment();
  
  const database = await connectToDatabase({
    mongoUri: environment.mongoUri,
    mongoDatabaseName: environment.mongoDatabaseName,
  });

  console.log("[AI Prompt Marketplace] Connected to database, creating indexes...");

  await Promise.all([
    database.collection("users").createIndex({ email: 1 }, { unique: true }),
    database.collection("users").createIndex(
      { firebaseUid: 1 },
      { unique: true, sparse: true }
    ),
    database.collection("users").createIndex({ role: 1, createdAt: -1 }),
    database.collection("prompts").createIndex({ status: 1, createdAt: -1 }),
    database.collection("prompts").createIndex({ creatorId: 1, createdAt: -1 }),
    database.collection("prompts").createIndex({ category: 1, aiModel: 1 }),
    database.collection("prompts").createIndex({ copyCount: -1 }),
    database.collection("prompts").createIndex({ averageRating: -1 }),
    database.collection("bookmarks").createIndex(
      { userId: 1, promptId: 1 },
      { unique: true, name: "bookmarks_prompt_user_unique" }
    ),
    database.collection("reviews").createIndex(
      { userId: 1, promptId: 1 },
      { unique: true, name: "reviews_prompt_user_unique" }
    ),
    database.collection("reports").createIndex(
      { promptId: 1, status: 1 },
      { name: "reports_prompt_status" }
    ),
    database.collection("reports").createIndex(
      { status: 1, createdAt: -1 },
      { name: "reports_moderation_queue" }
    ),
    database.collection("payments").createIndex(
      { transactionId: 1 },
      { unique: true }
    ),
    database.collection("payments").createIndex(
      { checkoutSessionId: 1 },
      { unique: true, sparse: true, name: "payments_checkout_session_unique" }
    ),
  ]);

  console.log("[AI Prompt Marketplace] All indexes created successfully.");
  
  await closeDatabaseConnection();
  console.log("[AI Prompt Marketplace] Database connection closed.");
}

createIndexes().catch(async (error) => {
  console.error("[AI Prompt Marketplace] Index creation failed:", error.message);
  await closeDatabaseConnection().catch(() => undefined);
  process.exit(1);
});