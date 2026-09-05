import { Router } from "express";
import { getDatabase } from "../config/database.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { verifyMarketplaceToken } from "../middleware/verifyMarketplaceToken.js";
import { escapeRegex, positiveInteger } from "../utils/community.js";
 
const router = Router();
 
router.get(
  "/",
  verifyMarketplaceToken,
  authorizeRoles("admin"),
  async (req, res, next) => {
    try {
      const page = positiveInteger(req.query.page, 1, 10000);
      const limit = positiveInteger(req.query.limit, 20, 100);
      const skip = (page - 1) * limit;
      const resource = String(req.query.resource || "").trim();
      const method = String(req.query.method || "").trim().toUpperCase();
      const search = String(req.query.search || "").trim();
      const match = {};
 
      if (resource) match.resource = resource;
      if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        match.method = method;
      }
 
      if (search) {
        const expression = new RegExp(escapeRegex(search), "i");
        match.$or = [
          { actorName: expression },
          { actorEmail: expression },
          { action: expression },
          { path: expression },
          { resourceId: expression },
        ];
      }
 
      const [result] = await getDatabase()
        .collection("auditLogs")
        .aggregate([
          { $match: match },
          { $sort: { createdAt: -1 } },
          {
            $facet: {
              entries: [{ $skip: skip }, { $limit: limit }],
              metadata: [{ $count: "total" }],
              resources: [
                { $group: { _id: "$resource" } },
                { $sort: { _id: 1 } },
              ],
            },
          },
        ])
        .next();
 
      const total = result?.metadata?.[0]?.total || 0;
 
      return res.json({
        entries: result?.entries || [],
        resources: (result?.resources || []).map((item) => item._id),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          hasPreviousPage: page > 1,
          hasNextPage: page * limit < total,
        },
        appliedFilters: { resource, method, search },
      });
    } catch (error) {
      return next(error);
    }
  },
);
 
export default router;
