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
import creatorsRoutes from "./routes/creators.routes.js";
import discoveryRoutes from "./routes/discovery.routes.js";
import engagementRoutes from "./routes/engagement.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import paymentsRoutes, {
  stripeWebhookHandler,
} from "./routes/payments.routes.js";
import promptsRoutes from "./routes/prompts.routes.js";
import usersRoutes from "./routes/users.routes.js";
import collectionsRoutes from "./routes/collections.routes.js";
import followsRoutes from "./routes/follows.routes.js";


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
  app.use("/api/collections", collectionsRoutes);
  app.use("/api/follows", followsRoutes);

  /*
   * Security headers
   */
  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: "cross-origin",
      },
    }),
  );

  /*
   * CORS configuration
   */
  app.use(
    cors({
      origin(origin, callback) {
        /*
         * Allow requests without an Origin header.
         * Stripe, curl and Postman may not provide one.
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
   * Stripe requires the original raw request body.
   *
   * This route must remain before:
   * - express.json()
   * - apiLimiter
   * - paymentsRoutes
   */
  app.post(
    "/api/payments/webhook",
    express.raw({
      type: "application/json",
      limit: "1mb",
    }),
    stripeWebhookHandler,
  );

  /*
   * Parse normal JSON requests.
   */
  app.use(
    express.json({
      limit: "1mb",
    }),
  );

  /*
   * General rate limiting for API endpoints.
   * The Stripe webhook is mounted before this.
   */
  app.use("/api", apiLimiter);

  /*
   * API information
   */
  app.get("/", (req, res) => {
    return res.json({
      name: "AI Prompt Marketplace API",
      message:
        "Discover, publish, and manage reusable AI prompts.",
    });
  });

  /*
   * Database health check
   */
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
   * Authentication routes
   *
   * Authentication receives a stricter
   * rate limit than other endpoints.
   */
  app.use(
    "/api/auth",
    authLimiter,
    authRoutes,
  );

  /*
   * User routes
   */
  app.use(
    "/api/users",
    usersRoutes,
  );

  /*
   * Payment routes
   *
   * The Stripe webhook was mounted separately
   * before express.json().
   */
  app.use(
    "/api/payments",
    paymentsRoutes,
  );

  /*
   * Admin routes
   */
  app.use(
    "/api/admin",
    adminRoutes,
  );

  /*
   * Notification routes
   */
  app.use(
    "/api/notifications",
    notificationsRoutes,
  );

  /*
   * Creator profile routes
   *
   * Public request:
   * GET /api/creators/:id
   *
   * Authenticated owner request:
   * PATCH /api/creators/me
   */
  app.use(
    "/api/creators",
    creatorsRoutes,
  );

  /*
   * Prompt routes must remain in this order.
   *
   * Discovery and engagement routes must be
   * registered before dynamic prompt routes.
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
   *
   * This must remain after every route.
   */
  app.use((req, res) => {
    return res.status(404).json({
      message:
        "The requested AI prompt marketplace endpoint was not found.",
    });
  });

  /*
   * Global error handler
   *
   * This must be the final middleware.
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

    if (error.type === "entity.parse.failed") {
      return res.status(400).json({
        message:
          "The marketplace request contains invalid JSON.",
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