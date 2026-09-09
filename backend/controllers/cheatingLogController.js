import asyncHandler from "express-async-handler";
import CheatingLog from "../models/cheatingLogModel.js";
import Exam from "../models/examModel.js";
import isExamOwner from "../utils/checkExamOwnership.js";

// @desc Save cheating log data
// @route POST /api/cheatingLogs
// @access Private
const saveCheatingLog = asyncHandler(async (req, res) => {
  const {
    noFaceCount,
    multipleFaceCount,
    cellPhoneCount,
    tabSwitchCount,
    examId,
    username,
    email,
    screenshots,
  } = req.body;

  console.log("Received cheating log data:", {
    noFaceCount,
    multipleFaceCount,
    cellPhoneCount,
    tabSwitchCount,
    examId,
    username,
    email,
    screenshots,
  });

  const cheatingLog = new CheatingLog({
    noFaceCount,
    multipleFaceCount,
    cellPhoneCount,
    tabSwitchCount,
    examId,
    username,
    email,
    screenshots: screenshots || [],
  });

  const savedLog = await cheatingLog.save();
  console.log("Saved cheating log:", savedLog);

  if (savedLog) {
    res.status(201).json(savedLog);
  } else {
    res.status(400);
    throw new Error("Invalid Cheating Log Data");
  }
});

// @desc Get all cheating log data for a specific exam
// @route GET /api/cheatingLogs/:examId
// @access Private
const getCheatingLogsByExamId = asyncHandler(async (req, res) => {
  const examId = req.params.examId;

  const exam = await Exam.findOne({ examId });
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  if (req.user.role !== "lecturer" || !isExamOwner(exam, req.user)) {
    res.status(403);
    throw new Error("Not authorized to view logs for this exam");
  }

  const cheatingLogs = await CheatingLog.find({ examId });

  res.status(200).json(cheatingLogs);
});

export { saveCheatingLog, getCheatingLogsByExamId };
