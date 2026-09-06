import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  saveResult,
  getResultsByExamId,
  getUserResults,
  toggleResultVisibility,
  getAllResults,
  getAttemptCount,
  setResultDecision,
} from "../controllers/resultController.js";

const resultRoutes = express.Router();

// All routes are protected
resultRoutes.use(protect);

// Save result
resultRoutes.post("/results", saveResult);

// Get all results (for lecturers)
resultRoutes.get("/results/all", getAllResults);

// Get results for a specific exam (for lecturers)
resultRoutes.get("/results/exam/:examId", getResultsByExamId);

// Get number of attempts used for an exam (for students)
resultRoutes.get("/results/attempts/:examId", getAttemptCount);

// Get results for current user
resultRoutes.get("/results/user", getUserResults);

// Toggle result visibility
resultRoutes.put(
  "/results/:resultId/toggle-visibility",
  toggleResultVisibility
);

// Set lecturer decision for a result
resultRoutes.put("/results/:resultId/decision", setResultDecision);

export default resultRoutes;
