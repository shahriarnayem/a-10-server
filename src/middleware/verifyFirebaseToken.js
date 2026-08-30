import { firebaseAdminAuth } from "../config/firebaseAdmin.js";
 
export async function verifyFirebaseToken(req, res, next) {
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : null;
 
  if (!token) {
    return res.status(401).json({
      message: "A Firebase ID token is required to create a marketplace session.",
    });
  }
 
  try {
    req.firebaseUser = await firebaseAdminAuth.verifyIdToken(token);
    return next();
  } catch {
    return res.status(401).json({
      message: "The Firebase identity token is invalid or expired.",
    });
  }
}
