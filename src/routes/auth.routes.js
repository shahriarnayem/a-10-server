import { Router } from "express";
import jwt from "jsonwebtoken";
import { getDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.js";
 
const router = Router();
 
router.get("/status", (req, res) => {
  res.json({
    message: "AI prompt marketplace authentication is available.",
  });
});
 
router.post("/token", verifyFirebaseToken, async (req, res, next) => {
  try {
    const identity = req.firebaseUser;
    const email = identity.email?.toLowerCase();
 
    if (!email) {
      return res.status(400).json({
        message: "A verified email is required for a marketplace account.",
      });
    }
 
    const database = getDatabase();
    const now = new Date();
 
    await database.collection("users").updateOne(
      { email },
      {
        $set: {
          firebaseUid: identity.uid,
          name: identity.name || email.split("@")[0],
          photoURL: identity.picture || "",
          updatedAt: now,
        },
        $setOnInsert: {
          email,
          role: "user",
          subscription: "free",
          accountStatus: "active",
          createdAt: now,
        },
      },
      { upsert: true },
    );
 
    const user = await database.collection("users").findOne({ email });
 
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        firebaseUid: user.firebaseUid,
        email: user.email,
      },
      env.jwtSecret,
      { expiresIn: "7d" },
    );
 
    return res.json({
      message: "Marketplace session created successfully.",
      token,
      user,
    });
  } catch (error) {
    return next(error);
  }
});
 
export default router;
