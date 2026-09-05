import { getDatabase } from "../config/database.js";
 
const ignoredPaths = new Set([
  "/api/payments/webhook",
]);
 
const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
 
function resourceFromPath(path) {
  const segments = path.split("?")[0].split("/").filter(Boolean);
  return segments[1] || "marketplace";
}
 
function resourceIdFromPath(path) {
  const segments = path.split("?")[0].split("/").filter(Boolean);
  const candidate = segments.find((segment) => /^[a-f\d]{24}$/i.test(segment));
  return candidate || "";
}
 
export function auditMutation(req, res, next) {
  if (!mutationMethods.has(req.method) || ignoredPaths.has(req.originalUrl)) {
    return next();
  }
 
  const startedAt = Date.now();
 
  res.on("finish", () => {
    if (res.statusCode < 200 || res.statusCode >= 400) return;
 
    const user = req.auth?.user;
    const auditEntry = {
      actorId: user?._id || null,
      actorName: user?.name || "Unauthenticated or system actor",
      actorEmail: user?.email || "",
      actorRole: user?.role || "system",
      action: `${req.method} ${req.route?.path || req.path}`,
      method: req.method,
      path: req.originalUrl.split("?")[0],
      resource: resourceFromPath(req.originalUrl),
      resourceId: resourceIdFromPath(req.originalUrl),
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
      createdAt: new Date(),
    };
 
    getDatabase()
      .collection("auditLogs")
      .insertOne(auditEntry)
      .catch((error) => {
        console.error("Audit log write failed:", error.message);
      });
  });
 
  return next();
}
