import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import {
  createExam,
  DeleteExamById,
  getExams,
  cloneExam,
  updateExam,
} from "../controllers/examController.js";
import {
  createQuestion,
  getQuestionsByExamId,
  updateQuestion,
  deleteQuestion,
} from "../controllers/quesController.js";
import {
  getCheatingLogsByExamId,
  saveCheatingLog,
} from "../controllers/cheatingLogController.js";
const examRoutes = express.Router();

// protecting Exam route using auth middleware protect /api/users/
examRoutes.route("/exam").get(protect, getExams).post(protect, createExam);
examRoutes.route("/exam/questions").post(protect, createQuestion);
examRoutes.route("/exam/questions/:examId").get(protect, getQuestionsByExamId);
examRoutes
  .route("/exam/question/:questionId")
  .put(protect, updateQuestion)
  .delete(protect, deleteQuestion);
examRoutes.route("/cheatingLogs/:examId").get(protect, getCheatingLogsByExamId);
examRoutes.route("/cheatingLogs/").post(protect, saveCheatingLog);
examRoutes.route("/exam/:examId/clone").post(protect, cloneExam);
examRoutes
  .route("/exam/:examId")
  .post(protect, DeleteExamById)
  .put(protect, updateExam);

export default examRoutes;
