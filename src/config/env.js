import "dotenv/config";

function readDatabaseName() {
  return (
    process.env.MONGODB_DB_NAME ||
    process.env.MONGODB_DATABASE_NAME ||
    process.env.MONGO_DATABASE_NAME ||
    process.env.MONGODB_DATABASE ||
    process.env.MONGODB_DB ||
    process.env.DB_NAME ||
    "ai_prompt_marketplace"
  );
}

export function loadEnvironment() {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.DATABASE_URL;

  const mongoDatabaseName = readDatabaseName();

  return Object.freeze({
    nodeEnv: process.env.NODE_ENV || "development",

    port: Number(process.env.PORT || 5000),

    clientUrl:
      process.env.CLIENT_URL ||
      "http://localhost:3000",

    // Both names support the existing project files.
    mongoUri,
    mongodbUri: mongoUri,

    mongoDatabaseName,
    mongodbDatabase: mongoDatabaseName,

    jwtSecret: process.env.JWT_SECRET,

    firebaseProjectId:
      process.env.FIREBASE_PROJECT_ID,

    firebaseClientEmail:
      process.env.FIREBASE_CLIENT_EMAIL,

    firebasePrivateKey:
      process.env.FIREBASE_PRIVATE_KEY?.replace(
        /\\n/g,
        "\n",
      ),

    stripeSecretKey:
      process.env.STRIPE_SECRET_KEY,

    stripeWebhookSecret:
      process.env.STRIPE_WEBHOOK_SECRET,
  });
}

// Supports files importing: import { env } from ".../env.js"
export const env = loadEnvironment();