import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getLecturers,
  getMyCourses,
} from "../controllers/courseController.js";

const courseRoutes = express.Router();

courseRoutes.use(protect);

courseRoutes.get("/lecturers", getLecturers);
courseRoutes.route("/").get(getCourses).post(createCourse);
courseRoutes.route("/:courseId").put(updateCourse).delete(deleteCourse);
courseRoutes.get("/mine", getMyCourses);

export default courseRoutes;