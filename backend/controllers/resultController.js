import asyncHandler from "express-async-handler";
import Result from "../models/resultModel.js";
import Question from "../models/quesModel.js";
import Exam from "../models/examModel.js";

const PASS_THRESHOLD_PERCENTAGE = 50;

const attachStatus = (result) => {
  const obj = result.toObject ? result.toObject() : result;
  const status =
    obj.lecturerDecision || (obj.percentage >= PASS_THRESHOLD_PERCENTAGE ? 'pass' : 'fail');
  return { ...obj, status };
};

// @desc    Get number of attempts a student has used for an exam
// @route   GET /api/users/results/attempts/:examId
// @access  Private
const getAttemptCount = asyncHandler(async (req, res) => {
  const { examId } = req.params;

  const exam = await Exam.findOne({ examId });
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  const attemptsUsed = await Result.countDocuments({
    examId,
    userId: req.user._id,
  });

  res.status(200).json({
    success: true,
    data: {
      attemptsUsed,
      maxAttempts: exam.maxAttempts,
      attemptsRemaining: Math.max(exam.maxAttempts - attemptsUsed, 0),
    },
  });
});

// @desc    Save exam result
// @route   POST /api/results
// @access  Private
const saveResult = asyncHandler(async (req, res) => {
  const { examId, answers } = req.body;

  if (!examId || !answers) {
    res.status(400);
    throw new Error("Please provide examId and answers");
  }

  const exam = await Exam.findOne({ examId });
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  const attemptsUsed = await Result.countDocuments({
    examId,
    userId: req.user._id,
  });

  if (attemptsUsed >= exam.maxAttempts) {
    res.status(403);
    throw new Error(
      `You have reached the maximum number of attempts (${exam.maxAttempts}) for this exam.`
    );
  }

  // Get all questions for this exam to calculate marks
  const questions = await Question.find({ examId });

  // Calculate marks
  let totalMarks = 0;
  let correctAnswers = 0;

  for (const question of questions) {
    const userAnswer = answers[question._id.toString()];
    if (userAnswer) {
      const correctOption = question.options.find((opt) => opt.isCorrect);
      if (correctOption && correctOption._id.toString() === userAnswer) {
        totalMarks += question.ansmarks || 1;
        correctAnswers++;
      }
    }
  }

  // Calculate percentage
  const totalQuestions = questions.length;
  const percentage =
    totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

  const result = await Result.create({
    examId,
    userId: req.user._id,
    answers: new Map(Object.entries(answers)),
    totalMarks,
    percentage,
    showToStudent: false, // Default to false, lecturer can change this
  });

  res.status(201).json({
    success: true,
    data: result,
  });
});

// @desc    Get results for a specific exam (for lecturers)
// @route   GET /api/results/exam/:examId
// @access  Private
const getResultsByExamId = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const results = await Result.find({ examId })
    .populate("userId", "name email")
    .sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    data: results.map(attachStatus),
  });
});

// @desc    Get results for current user
// @route   GET /api/results/user
// @access  Private
const getUserResults = asyncHandler(async (req, res) => {
  const results = await Result.find({
    userId: req.user._id,
    showToStudent: true,
  }).sort({
    createdAt: -1,
  });
  res.status(200).json({
    success: true,
    data: results.map(attachStatus),
  });
});

// @desc    Toggle showToStudent for a result
// @route   PUT /api/results/:resultId/toggle-visibility
// @access  Private (Lecturer only)
const toggleResultVisibility = asyncHandler(async (req, res) => {
  const { resultId } = req.params;

  const result = await Result.findById(resultId);
  if (!result) {
    res.status(404);
    throw new Error("Result not found");
  }

  result.showToStudent = !result.showToStudent;
  await result.save();

  res.status(200).json({
    success: true,
    data: result,
  });
});

// @desc    Get all results (for lecturers)
// @route   GET /api/results/all
// @access  Private (Lecturer only)
const getAllResults = asyncHandler(async (req, res) => {
  if (req.user.role !== "lecturer") {
    res.status(403);
    throw new Error("Not authorized to view all results");
  }
  const results = await Result.find()
    .populate("userId", "name email")
    .sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    data: results.map(attachStatus),
  });
});

// @desc    Lecturer overrides pass/fail status for a result
// @route   PUT /api/users/results/:resultId/decision
// @access  Private (Lecturer only)
const setResultDecision = asyncHandler(async (req, res) => {
  const { resultId } = req.params;
  const { decision } = req.body; // 'pass', 'fail', or null to reset to automatic

  if (req.user.role !== "lecturer") {
    res.status(403);
    throw new Error("Not authorized to set result decisions");
  }

  if (decision !== "pass" && decision !== "fail" && decision !== null) {
    res.status(400);
    throw new Error("Decision must be 'pass', 'fail', or null");
  }

  const result = await Result.findById(resultId);
  if (!result) {
    res.status(404);
    throw new Error("Result not found");
  }

  result.lecturerDecision = decision;
  await result.save();

  res.status(200).json({
    success: true,
    data: attachStatus(result),
  });
});

export {
  saveResult,
  getResultsByExamId,
  getUserResults,
  toggleResultVisibility,
  getAllResults,
  getAttemptCount,
  setResultDecision,
};
