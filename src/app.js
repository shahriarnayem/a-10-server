import cors from "cors";
import express from "express";
import { getDatabase } from "./config/database.js";
import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";

export const createApp = (options = {}) => {
  const { allowedOrigins } = options;
  const app = express();

  app.use(
    cors({
      origin: allowedOrigins || true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/", (req, res) =>
    res.json({
      name: "AI Prompt Marketplace API",
      message: "Discover, publish, and manage reusable AI prompts.",
    })
  );

  app.get("/api/health", async (req, res, next) => {
    try {
      await getDatabase().command({ ping: 1 });
      res.json({
        status: "healthy",
        service: "AI Prompt Marketplace API",
        database: "connected",
      });
    } catch (error) {
      next(error);
    }
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);

  app.use((req, res) =>
    res.status(404).json({
      message: "The requested AI prompt marketplace endpoint was not found.",
    })
  );

  app.use((error, req, res, next) => {
    console.error(error);
    if (res.headersSent) return next(error);
    return res.status(error.status || 500).json({
      message:
        error.message ||
        "The AI prompt marketplace server could not complete the request.",
    });
  });

  return app;
};