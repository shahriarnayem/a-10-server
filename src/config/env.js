import "dotenv/config";

const requiredVariables = [
  "MONGODB_URI",
  "MONGODB_DB_NAME",
  "JWT_SECRET",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
];

function createEnvironment() {
  for (const variable of requiredVariables) {
    if (!process.env[variable]) {
      throw new Error(
        `Missing required environment variable: ${variable}`,
      );
    }
  }

  const clientUrl =
    process.env.CLIENT_URL || "http://localhost:3000";

  return {
    nodeEnv: process.env.NODE_ENV || "development",
    nodeEnvironment:
      process.env.NODE_ENV || "development",

    port: Number(process.env.PORT || 5000),

    clientUrl,
    clientOrigins: clientUrl
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),

    mongoUri: process.env.MONGODB_URI,
    mongodbUri: process.env.MONGODB_URI,

    mongoDatabaseName:
      process.env.MONGODB_DB_NAME,
    mongodbDatabase:
      process.env.MONGODB_DB_NAME,

    jwtSecret: process.env.JWT_SECRET,

    firebaseProjectId:
      process.env.FIREBASE_PROJECT_ID,

    firebaseClientEmail:
      process.env.FIREBASE_CLIENT_EMAIL,

    firebasePrivateKey:
      process.env.FIREBASE_PRIVATE_KEY.replace(
        /\\n/g,
        "\n",
      ),

    stripeSecretKey:
      process.env.STRIPE_SECRET_KEY,

    stripeWebhookSecret:
      process.env.STRIPE_WEBHOOK_SECRET,
  };
}

export function loadEnvironment() {
  return createEnvironment();
}

export const env = loadEnvironment();