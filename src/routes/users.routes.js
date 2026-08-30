import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";
import { verifyMarketplaceToken } from "../middleware/verifyMarketplaceToken.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
 
const router = Router();
const allowedRoles = ["user", "creator", "admin"];
 
function publicUser(user) {
  return {
    _id: user._id,
    firebaseUid: user.firebaseUid,
    name: user.name,
    email: user.email,
    photoURL: user.photoURL,
    role: user.role,
    subscription: user.subscription,
    accountStatus: user.accountStatus,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
 
router.get("/me", verifyMarketplaceToken, (req, res) => {
  res.json({ user: publicUser(req.auth.user) });
});
 
router.patch("/:id/role", verifyMarketplaceToken, authorizeRoles("admin"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
 
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "The selected marketplace user ID is invalid." });
    }
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Choose user, creator, or admin as the marketplace role." });
    }
    if (req.auth.user._id.toString() === id) {
      return res.status(400).json({ message: "Administrators cannot change their own marketplace role." });
    }
 
    const database = getDatabase();
    const userId = new ObjectId(id);
    const updateResult = await database.collection("users").updateOne(
      { _id: userId },
      { $set: { role, updatedAt: new Date() } },
    );
 
    if (!updateResult.matchedCount) {
      return res.status(404).json({ message: "The selected marketplace user was not found." });
    }
 
    const user = await database.collection("users").findOne({ _id: userId });
    return res.json({ message: `${user.name}'s marketplace role is now ${role}.`, user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});
 
export default router;