import cors from "cors";
import express from "express";
import helmet from "helmet";
import { connectToDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { auditMutation } from "./middleware/auditMutation.js";
import { apiLimiter, authLimiter } from "./middleware/security.js";
import adminRoutes from "./routes/admin.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import authRoutes from "./routes/auth.routes.js";
import collectionsRoutes from "./routes/collections.routes.js";
import creatorsRoutes from "./routes/creators.routes.js";
import discoveryRoutes from "./routes/discovery.routes.js";
import engagementRoutes from "./routes/engagement.routes.js";
import followsRoutes from "./routes/follows.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import paymentsRoutes, {
  stripeWebhookHandler,
} from "./routes/payments.routes.js";
import promptsRoutes from "./routes/prompts.routes.js";
import usersRoutes from "./routes/users.routes.js";
import versionsRoutes from "./routes/versions.routes.js";

const app = express();

app.set("trust proxy", 1);

app.disable("x-powered-by");

// Database connection state for Serverless environments
let databasePromise = null;

// Lazy DB connection middleware to handle Vercel cold starts
app.use(async (req, res, next) => {
  try {
    if (!databasePromise) {
      databasePromise = connectToDatabase({
        mongoUri: env.mongoUri,
        mongoDatabaseName: env.mongoDatabaseName,
      });
    }
    await databasePromise;
    next();
  } catch (error) {
    databasePromise = null; // Reset promise so next request retries on failure
    console.error("[Database Connection Error]:", error);
    res.status(500).json({
      message: "The AI Prompt Marketplace database could not connect.",
    });
  }
});

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Stripe-Signature"],
  }),
);

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  stripeWebhookHandler,
);

app.use(express.json({ limit: "1mb" }));
app.use("/api", apiLimiter);
app.use("/api", auditMutation);

app.get("/", (req, res) => {
  res.json({
    name: "AI Prompt Marketplace API",
    message: "Discover, publish, and manage reusable AI prompts.",
  });
});

app.get("/api/health", async (req, res, next) => {
  try {
    const db = await databasePromise;
    await db.command({ ping: 1 });
    res.json({
      status: "healthy",
      service: "AI Prompt Marketplace API",
      database: "connected",
      environment: env.nodeEnv,
    });
  } catch (error) {
    next(error);
  }
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/admin/audit", auditRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/creators", creatorsRoutes);
app.use("/api/collections", collectionsRoutes);
app.use("/api/follows", followsRoutes);
app.use("/api/prompts", discoveryRoutes);
app.use("/api/prompts", engagementRoutes);
app.use("/api/prompts", versionsRoutes);
app.use("/api/prompts", promptsRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "The requested AI prompt marketplace endpoint was not found.",
  });
});

app.use((error, req, res, next) => {
  console.error(error);

  if (res.headersSent) return next(error);

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      message: "The marketplace request body is too large.",
    });
  }

  return res.status(error.status || 500).json({
    message:
      error.message ||
      "The AI prompt marketplace server could not complete the request.",
  });
});

export default app;