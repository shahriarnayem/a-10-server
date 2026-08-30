import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { env } from "../config/env.js";
import { getDatabase } from "../config/database.js";
 
function getBearerToken(header = "") {
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}
 
function buildUserFilters(payload) {
  const filters = [];
  if (payload.firebaseUid) filters.push({ firebaseUid: payload.firebaseUid });
  if (payload.uid) filters.push({ firebaseUid: payload.uid });
  if (payload.email) filters.push({ email: payload.email.toLowerCase() });
  if (payload.userId && ObjectId.isValid(payload.userId)) {
    filters.push({ _id: new ObjectId(payload.userId) });
  }
  return filters;
}
 
async function authenticateRequest(req, res, next, required) {
  const token = getBearerToken(req.headers.authorization);
 
  if (!token && !required) return next();
  if (!token) {
    return res.status(401).json({ message: "Sign in to access this AI prompt marketplace feature." });
  }
 
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const filters = buildUserFilters(payload);
 
    if (!filters.length) {
      return res.status(401).json({ message: "The marketplace token does not identify a user." });
    }
 
    const user = await getDatabase().collection("users").findOne({ $or: filters });
 
    if (!user) {
      return res.status(401).json({ message: "The marketplace account connected to this token was not found." });
    }
 
    if (user.accountStatus === "blocked") {
      return res.status(403).json({ message: "This marketplace account is currently blocked." });
    }
 
    req.auth = { token, tokenPayload: payload, user };
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Your marketplace session is invalid or expired. Please sign in again." });
    }
    return next(error);
  }
}
 
export function verifyMarketplaceToken(req, res, next) {
  return authenticateRequest(req, res, next, true);
}
 
export function attachOptionalMarketplaceUser(req, res, next) {
  return authenticateRequest(req, res, next, false);
}
