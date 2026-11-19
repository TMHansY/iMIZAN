import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  applyToCourse,
  getMyEnrollments,
  getEnrollmentsForCourse,
  approveEnrollment,
  rejectEnrollment,
  changeEnrollmentSection,
} from "../controllers/enrollmentController.js";

const enrollmentRoutes = express.Router();

enrollmentRoutes.use(protect);

enrollmentRoutes.post("/", applyToCourse);
enrollmentRoutes.get("/mine", getMyEnrollments);
enrollmentRoutes.get("/course/:courseId", getEnrollmentsForCourse);
enrollmentRoutes.put("/:id/approve", approveEnrollment);
enrollmentRoutes.put("/:id/reject", rejectEnrollment);
enrollmentRoutes.put("/:id/section", changeEnrollmentSection);

export default enrollmentRoutes;
