import asyncHandler from "express-async-handler";
import Exam from "./../models/examModel.js";
import Question from "./../models/quesModel.js";
import Result from "./../models/resultModel.js";
import CheatingLog from "./../models/cheatingLogModel.js";
import isExamOwner from "../utils/checkExamOwnership.js";

// @desc Get all exams
// @route GET /api/exams
// @access Public
const getExams = asyncHandler(async (req, res) => {
  let exams;
  if (req.user.role === "lecturer") {
    exams = await Exam.find({
      $or: [{ createdBy: req.user._id }, { createdBy: { $exists: false } }],
    });
  } else {
    exams = await Exam.find();
  }
  res.status(200).json(exams);
});

// @desc Create a new exam
// @route POST /api/exams
// @access Private (admin)
const createExam = asyncHandler(async (req, res) => {
  const { examName, totalQuestions, duration, liveDate, deadDate, maxAttempts, allowReview } =
    req.body;

  const exam = new Exam({
    examName,
    totalQuestions,
    duration,
    liveDate,
    deadDate,
    maxAttempts,
    allowReview,
    createdBy: req.user._id,
  });

  const createdExam = await exam.save();

  if (createdExam) {
    res.status(201).json(createdExam);
  } else {
    res.status(400);
    throw new Error("Invalid Exam Data");
  }
});

// @desc Update an existing exam
// @route PUT /api/exam/:examId
// @access Private (lecturer)
const updateExam = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const { examName, totalQuestions, duration, liveDate, deadDate, maxAttempts, allowReview } =
    req.body;

  const exam = await Exam.findOne({ examId });

  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  if (!isExamOwner(exam, req.user)) {
    res.status(403);
    throw new Error("Not authorized to edit this exam");
  }

  exam.examName = examName ?? exam.examName;
  exam.totalQuestions = totalQuestions ?? exam.totalQuestions;
  exam.duration = duration ?? exam.duration;
  exam.liveDate = liveDate ?? exam.liveDate;
  exam.deadDate = deadDate ?? exam.deadDate;
  exam.maxAttempts = maxAttempts ?? exam.maxAttempts;
  exam.allowReview = allowReview ?? exam.allowReview;

  const updatedExam = await exam.save();

  res.status(200).json(updatedExam);
});

const DeleteExamById = asyncHandler(async (req, res) => {
  const { examId } = req.params;

  const exam = await Exam.findOne({ examId });
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  if (!isExamOwner(exam, req.user)) {
    res.status(403);
    throw new Error("Not authorized to delete this exam");
  }

  await Exam.deleteOne({ examId });

  // Clean up everything tied to this exam so nothing orphaned is left behind
  await Question.deleteMany({ examId });
  await Result.deleteMany({ examId });
  await CheatingLog.deleteMany({ examId });

  console.log("deleted exam and related data", exam);
  res.status(200).json(exam);
});

export { getExams, createExam, DeleteExamById, updateExam };
