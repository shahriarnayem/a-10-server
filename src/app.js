import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import {
  getDatabase,
} from "./config/database.js";

import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import discoveryRoutes from "./routes/discovery.routes.js";
import engagementRoutes from "./routes/engagement.routes.js";
import paymentsRoutes, {
  stripeWebhookHandler,
} from "./routes/payments.routes.js";
import promptsRoutes from "./routes/prompts.routes.js";
import usersRoutes from "./routes/users.routes.js";

export function createApp({
  allowedOrigins = env.clientOrigins,
} = {}) {
  const app = express();

  const origins =
    Array.isArray(allowedOrigins) &&
    allowedOrigins.length > 0
      ? allowedOrigins
      : [env.clientUrl];

  app.use(
    cors({
      origin(origin, callback) {

        if (!origin) {
          callback(null, true);
          return;
        }

        if (origins.includes(origin)) {
          callback(null, true);
          return;
        }

        const corsError = new Error(
          `CORS blocked request from origin: ${origin}`,
        );

        corsError.status = 403;

        callback(corsError);
      },

      credentials: true,
    }),
  );


  app.post(
    "/api/payments/webhook",
    express.raw({
      type: "application/json",
    }),
    stripeWebhookHandler,
  );

  app.use(
    express.json({
      limit: "1mb",
    }),
  );

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
        });
      } catch (error) {
        return next(error);
      }
    },
  );


  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/payments", paymentsRoutes);
  app.use("/api/admin", adminRoutes);


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

  app.use((req, res) => {
    return res.status(404).json({
      message:
        "The requested AI prompt marketplace endpoint was not found.",
    });
  });

 
  app.use((error, req, res, next) => {
    console.error(error);

    if (res.headersSent) {
      return next(error);
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