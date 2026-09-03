import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env.js";
import {
  getDatabase,
} from "./config/database.js";

import {
  apiLimiter,
  authLimiter,
} from "./middleware/security.js";

import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import discoveryRoutes from "./routes/discovery.routes.js";
import engagementRoutes from "./routes/engagement.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import paymentsRoutes, {
  stripeWebhookHandler,
} from "./routes/payments.routes.js";
import promptsRoutes from "./routes/prompts.routes.js";
import usersRoutes from "./routes/users.routes.js";

function normalizeOrigins(allowedOrigins) {
  if (Array.isArray(allowedOrigins)) {
    return allowedOrigins
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  if (typeof allowedOrigins === "string") {
    return allowedOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  return [env.clientUrl].filter(Boolean);
}

export function createApp({
  allowedOrigins = env.clientOrigins,
  nodeEnvironment = env.nodeEnv,
} = {}) {
  const app = express();

  const origins =
    normalizeOrigins(allowedOrigins);

  if (nodeEnvironment === "production") {
    app.set("trust proxy", 1);
  }

  app.disable("x-powered-by");

  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: "cross-origin",
      },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        /*
         * Allow requests with no Origin header.
         * Stripe, curl and Postman may not send one.
         */
        if (!origin) {
          callback(null, true);
          return;
        }

        if (origins.includes(origin)) {
          callback(null, true);
          return;
        }

        const error = new Error(
          `CORS blocked request from origin: ${origin}`,
        );

        error.status = 403;

        callback(error);
      },

      credentials: true,

      methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
      ],

      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Stripe-Signature",
      ],
    }),
  );

  /*
   * Stripe webhook must receive the original body.
   * Keep this before express.json() and apiLimiter.
   */
  app.post(
    "/api/payments/webhook",
    express.raw({
      type: "application/json",
      limit: "1mb",
    }),
    stripeWebhookHandler,
  );

  app.use(
    express.json({
      limit: "1mb",
    }),
  );

  /*
   * General protection for API endpoints.
   * The Stripe webhook is mounted before this.
   */
  app.use("/api", apiLimiter);

  app.get("/", (req, res) => {
    return res.json({
      name: "AI Prompt Marketplace API",
      message:
        "Discover, publish, and manage reusable AI prompts.",
    });
  });

  app.get(
    "/api/health",
    async (req, res, next) => {
      try {
        await getDatabase().command({
          ping: 1,
        });

        return res.json({
          status: "healthy",
          service:
            "AI Prompt Marketplace API",
          database: "connected",
          environment: nodeEnvironment,
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  /*
   * Authentication has a stricter rate limit.
   */
  app.use(
    "/api/auth",
    authLimiter,
    authRoutes,
  );

  app.use("/api/users", usersRoutes);

  app.use(
    "/api/payments",
    paymentsRoutes,
  );

  app.use("/api/admin", adminRoutes);

  app.use(
    "/api/notifications",
    notificationsRoutes,
  );

  /*
   * These routes must stay in this order.
   * Discovery and engagement routes should be
   * mounted before dynamic /:id prompt routes.
   */
  app.use(
    "/api/prompts",
    discoveryRoutes,
  );

  app.use(
    "/api/prompts",
    engagementRoutes,
  );

  app.use(
    "/api/prompts",
    promptsRoutes,
  );

  /*
   * API 404 handler
   */
  app.use((req, res) => {
    return res.status(404).json({
      message:
        "The requested AI prompt marketplace endpoint was not found.",
    });
  });

  /*
   * Global error handler
   */
  app.use((error, req, res, next) => {
    console.error(error);

    if (res.headersSent) {
      return next(error);
    }

    if (error.type === "entity.too.large") {
      return res.status(413).json({
        message:
          "The marketplace request body is too large.",
      });
    }

    return res
      .status(error.status || 500)
      .json({
        message:
          error.message ||
          "The AI prompt marketplace server could not complete the request.",
      });
  });

  return app;
}


const app = createApp();

export default app;