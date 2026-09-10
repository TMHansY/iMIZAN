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

export default userRoutes;