import asyncHandler from "express-async-handler";
import Result from "../models/resultModel.js";
import Question from "../models/quesModel.js";
import Exam from "../models/examModel.js";
import isExamOwner from "../utils/checkExamOwnership.js";

const PASS_THRESHOLD_PERCENTAGE = 50;

const attachStatus = (result) => {
  const obj = result.toObject ? result.toObject() : result;
  const status =
    obj.lecturerDecision || (obj.percentage >= PASS_THRESHOLD_PERCENTAGE ? 'pass' : 'fail');
  const answers = obj.answers instanceof Map ? Object.fromEntries(obj.answers) : obj.answers;
  return { ...obj, status, answers };
};

const attachAttemptNumbers = (results) => {
  const grouped = {};
  results.forEach((r) => {
    const userIdStr =
      typeof r.userId === 'object' && r.userId !== null ? r.userId._id.toString() : String(r.userId);
    const key = `${r.examId}_${userIdStr}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });

  Object.values(grouped).forEach((group) => {
    group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    group.forEach((r, idx) => {
      r.attemptNumber = idx + 1;
      r.totalAttemptsForExam = group.length;
    });
  });

  return results;
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
  const { examId, answers, timeTakenSeconds } = req.body;

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
    timeTakenSeconds,
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

  const exam = await Exam.findOne({ examId });
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  if (!isExamOwner(exam, req.user)) {
    res.status(403);
    throw new Error("Not authorized to view results for this exam");
  }

  const results = await Result.find({ examId })
    .populate("userId", "name email")
    .sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    data: attachAttemptNumbers(results.map(attachStatus)),
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
    data: attachAttemptNumbers(results.map(attachStatus)),
  });
});

// @desc    Get a single result by ID (for review)
// @route   GET /api/users/results/single/:resultId
// @access  Private
const getResultById = asyncHandler(async (req, res) => {
  const { resultId } = req.params;

  const result = await Result.findById(resultId);

  if (!result) {
    res.status(404);
    throw new Error("Result not found");
  }

  const isOwner = result.userId.toString() === req.user._id.toString();

  const exam = await Exam.findOne({ examId: result.examId });
  const isLecturerOwner = isExamOwner(exam, req.user);

  if (!isOwner && !isLecturerOwner) {
    res.status(403);
    throw new Error("Not authorized to view this result");
  }

  res.status(200).json({
    success: true,
    data: attachStatus(result),
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

  const exam = await Exam.findOne({ examId: result.examId });
  if (!isExamOwner(exam, req.user)) {
    res.status(403);
    throw new Error("Not authorized to modify this result");
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

  const ownedExams = await Exam.find({
    $or: [{ createdBy: req.user._id }, { createdBy: { $exists: false } }],
  }).select("examId");
  const ownedExamIds = ownedExams.map((e) => e.examId);

  const results = await Result.find({ examId: { $in: ownedExamIds } })
    .populate("userId", "name email")
    .sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    data: attachAttemptNumbers(results.map(attachStatus)),
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

  const exam = await Exam.findOne({ examId: result.examId });
  if (!isExamOwner(exam, req.user)) {
    res.status(403);
    throw new Error("Not authorized to set decisions for this result");
  }

  result.lecturerDecision = decision;
  await result.save();

  res.status(200).json({
    success: true,
    data: attachStatus(result),
  });
});

// @desc    Set visibility for all results of a specific exam
// @route   PUT /api/users/results/exam/:examId/visibility
// @access  Private (Lecturer only)
const setExamResultsVisibility = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const { showToStudent } = req.body;

  if (req.user.role !== "lecturer") {
    res.status(403);
    throw new Error("Not authorized to change result visibility");
  }

  const exam = await Exam.findOne({ examId });
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }
  if (!isExamOwner(exam, req.user)) {
    res.status(403);
    throw new Error("Not authorized to change results for this exam");
  }

  if (typeof showToStudent !== "boolean") {
    res.status(400);
    throw new Error("showToStudent must be true or false");
  }

  const updateResult = await Result.updateMany({ examId }, { showToStudent });

  res.status(200).json({
    success: true,
    data: {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
    },
  });
});

// @desc    Get a per-exam status summary for the current student (for notifications)
// @route   GET /api/users/results/my-status
// @access  Private
const getMyExamStatus = asyncHandler(async (req, res) => {
  const results = await Result.find({ userId: req.user._id }).sort({ createdAt: -1 });

  const statusByExam = {};
  for (const r of results) {
    if (!statusByExam[r.examId]) {
      statusByExam[r.examId] = {
        examId: r.examId,
        attemptsUsed: 0,
        latestShowToStudent: r.showToStudent,
        latestResultId: r._id,
      };
    }
    statusByExam[r.examId].attemptsUsed += 1;
  }

  res.status(200).json({
    success: true,
    data: Object.values(statusByExam),
  });
});

// @desc    Get a summary of submissions pending lecturer review
// @route   GET /api/users/results/pending-review
// @access  Private (Lecturer only)
const getPendingReviewSummary = asyncHandler(async (req, res) => {
  if (req.user.role !== "lecturer") {
    res.status(403);
    throw new Error("Not authorized");
  }

  const ownedExams = await Exam.find({
    $or: [{ createdBy: req.user._id }, { createdBy: { $exists: false } }],
  }).select("examId");
  const ownedExamIds = ownedExams.map((e) => e.examId);

  const pendingResults = await Result.aggregate([
    { $match: { lecturerDecision: null, examId: { $in: ownedExamIds } } },
    { $group: { _id: "$examId", count: { $sum: 1 } } },
  ]);

  res.status(200).json({
    success: true,
    data: pendingResults.map((r) => ({ examId: r._id, pendingCount: r.count })),
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
  getResultById,
  setExamResultsVisibility,
  getMyExamStatus,
  getPendingReviewSummary,
};
