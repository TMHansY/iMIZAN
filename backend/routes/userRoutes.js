import express from "express";
import {
  authUser,
  getUserProfile,
  logoutUser,
  registerUser,
  updateUserProfile,
  getPendingUsers,
  approveUser,
  rejectUser,
  bulkApproveUsers,
  bulkRejectUsers,
  getAllAccounts,
  toggleAccountActive,
  getSystemStats,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import { createExam, getExams } from "../controllers/examController.js";
const userRoutes = express.Router();
userRoutes.post("/", registerUser);
userRoutes.post("/auth", authUser);
userRoutes.post("/logout", logoutUser);
userRoutes.post("/register", registerUser);
// protecting profile route using auth middleware protect
userRoutes
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// Admin-only account approval routes
userRoutes.get("/pending", protect, getPendingUsers);
userRoutes.put("/:id/approve", protect, approveUser);
userRoutes.delete("/:id/reject", protect, rejectUser);
userRoutes.post("/bulk-approve", protect, bulkApproveUsers);
userRoutes.post("/bulk-reject", protect, bulkRejectUsers);
userRoutes.get("/accounts", protect, getAllAccounts);
userRoutes.put("/:id/toggle-active", protect, toggleAccountActive);
userRoutes.get("/admin/stats", protect, getSystemStats);
export default userRoutes;