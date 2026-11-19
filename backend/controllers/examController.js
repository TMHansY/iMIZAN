import ExamAttempt from "../models/examAttemptModel.js";
import asyncHandler from "express-async-handler";
import Exam from "./../models/examModel.js";
import Question from "./../models/quesModel.js";
import Result from "./../models/resultModel.js";
import CheatingLog from "./../models/cheatingLogModel.js";
import isExamOwner from "../utils/checkExamOwnership.js";
import Course from "./../models/courseModel.js";
import Enrollment from "./../models/enrollmentModel.js";

// @desc Get all exams
// @route GET /api/exams
// @access Public
const getExams = asyncHandler(async (req, res) => {
  let exams;

  if (req.user.role === "lecturer") {
    exams = await Exam.find({
      $or: [{ createdBy: req.user._id }, { createdBy: { $exists: false } }],
    });
  } else if (req.user.role === "student") {
    const approvedEnrollments = await Enrollment.find({
      student: req.user._id,
      status: "approved",
    }).select("courseId sectionId");
    const approvedCourseIds = approvedEnrollments.map((e) => e.courseId);

    // Students see exams for courses they're enrolled in, plus any
    // "legacy" exam that predates the course system (no courseId at all).
    const enrolledExams = await Exam.find({
      $or: [
        { courseId: { $in: approvedCourseIds } },
        { courseId: null },
        { courseId: { $exists: false } },
      ],
    });
    exams = enrolledExams.map((exam) => {
      const enrollment = approvedEnrollments.find((item) => item.courseId === exam.courseId);
      const schedule = exam.sectionSchedules?.find((item) => item.sectionId === enrollment?.sectionId);
      if (!schedule) return exam;
      const value = exam.toObject();
      value.liveDate = schedule.liveDate;
      value.deadDate = schedule.deadDate;
      return value;
    });
  } else {
    // Admins see everything
    exams = await Exam.find();
  }

  res.status(200).json(exams);
});

// @desc Create a new exam
// @route POST /api/exams
// @access Private (admin)
const createExam = asyncHandler(async (req, res) => {
  const {
    examName,
    totalQuestions,
    duration,
    liveDate,
    deadDate,
    maxAttempts,
    allowReview,
    allowBackNavigation,
    randomizeQuestions,
    randomizeOptions,
    courseId,
    sectionSchedules,
  } = req.body;

  if (!courseId) {
    res.status(400);
    throw new Error("A course must be selected for this exam");
  }

  const course = await Course.findOne({ courseId });
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }

  if (
    !course.lecturer ||
    course.lecturer.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error("You are not assigned to this course");
  }

  const validatedSchedules = validateSectionSchedules(sectionSchedules, course);

  const exam = new Exam({
    examName,
    totalQuestions,
    duration,
    liveDate,
    deadDate,
    maxAttempts,
    allowReview,
    allowBackNavigation,
    randomizeQuestions,
    randomizeOptions,
    courseId,
    sectionSchedules: validatedSchedules,
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
  const {
    examName,
    totalQuestions,
    duration,
    liveDate,
    deadDate,
    maxAttempts,
    allowReview,
    allowBackNavigation,
    randomizeQuestions,
    randomizeOptions,
    courseId,
    sectionSchedules,
  } = req.body;

  const exam = await Exam.findOne({ examId });

  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  if (!isExamOwner(exam, req.user)) {
    res.status(403);
    throw new Error("Not authorized to edit this exam");
  }

  const targetCourseId = courseId || exam.courseId;
  const targetCourse = targetCourseId ? await Course.findOne({ courseId: targetCourseId }) : null;
  if (targetCourseId && !targetCourse) {
    res.status(404);
    throw new Error("Course not found");
  }
  const validatedSchedules = sectionSchedules === undefined
    ? undefined
    : validateSectionSchedules(sectionSchedules, targetCourse);

  if (courseId && courseId !== exam.courseId) {
    const course = await Course.findOne({ courseId });
    if (!course) {
      res.status(404);
      throw new Error("Course not found");
    }
    if (
      !course.lecturer ||
      course.lecturer.toString() !== req.user._id.toString()
    ) {
      res.status(403);
      throw new Error("You are not assigned to this course");
    }
    if (sectionSchedules === undefined) exam.sectionSchedules = [];
    exam.courseId = courseId;
  }

  exam.examName = examName ?? exam.examName;
  exam.totalQuestions = totalQuestions ?? exam.totalQuestions;
  exam.duration = duration ?? exam.duration;
  exam.liveDate = liveDate ?? exam.liveDate;
  exam.deadDate = deadDate ?? exam.deadDate;
  exam.maxAttempts = maxAttempts ?? exam.maxAttempts;
  exam.allowReview = allowReview ?? exam.allowReview;
  exam.allowBackNavigation = allowBackNavigation ?? exam.allowBackNavigation;
  exam.randomizeQuestions = randomizeQuestions ?? exam.randomizeQuestions;
  exam.randomizeOptions = randomizeOptions ?? exam.randomizeOptions;
  if (validatedSchedules !== undefined) exam.sectionSchedules = validatedSchedules;

  const updatedExam = await exam.save();

  res.status(200).json(updatedExam);
});

function validateSectionSchedules(schedules, course) {
  if (schedules === undefined) return [];
  if (!Array.isArray(schedules)) {
    const error = new Error("Section schedules must be a list");
    error.statusCode = 400;
    throw error;
  }
  const validSectionIds = new Set((course?.sections || []).map((section) => section.sectionId));
  const seen = new Set();
  return schedules.map((schedule) => {
    const liveDate = new Date(schedule.liveDate);
    const deadDate = new Date(schedule.deadDate);
    if (!validSectionIds.has(schedule.sectionId) || seen.has(schedule.sectionId) ||
        !Number.isFinite(+liveDate) || !Number.isFinite(+deadDate) || liveDate >= deadDate) {
      const error = new Error("Each section needs a valid start and end time, with the end after the start");
      error.statusCode = 400;
      throw error;
    }
    seen.add(schedule.sectionId);
    return { sectionId: schedule.sectionId, liveDate, deadDate };
  });
}

// @desc Clone an exam and its questions into another course owned by the lecturer
// @route POST /api/users/exam/:examId/clone
// @access Private (lecturer)
const cloneExam = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const { courseId } = req.body;

  if (!courseId || typeof courseId !== "string") {
    res.status(400);
    throw new Error("A destination course must be selected");
  }

  const sourceExam = await Exam.findOne({ examId });
  if (!sourceExam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  if (!isExamOwner(sourceExam, req.user)) {
    res.status(403);
    throw new Error("Not authorized to clone this exam");
  }

  if (sourceExam.courseId === courseId) {
    res.status(400);
    throw new Error("Choose a different course for the cloned exam");
  }

  const destinationCourse = await Course.findOne({ courseId });
  if (!destinationCourse) {
    res.status(404);
    throw new Error("Destination course not found");
  }

  if (
    !destinationCourse.lecturer ||
    destinationCourse.lecturer.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error("You are not assigned to the destination course");
  }

  const sourceQuestions = await Question.find({ examId }).lean();
  const clonedExam = await Exam.create({
    examName: `${sourceExam.examName} (Copy)`,
    totalQuestions: sourceExam.totalQuestions,
    duration: sourceExam.duration,
    liveDate: sourceExam.liveDate,
    deadDate: sourceExam.deadDate,
    maxAttempts: sourceExam.maxAttempts,
    allowReview: sourceExam.allowReview,
    allowBackNavigation: sourceExam.allowBackNavigation,
    randomizeQuestions: sourceExam.randomizeQuestions,
    randomizeOptions: sourceExam.randomizeOptions,
    courseId: destinationCourse.courseId,
    createdBy: req.user._id,
  });

  try {
    if (sourceQuestions.length > 0) {
      await Question.insertMany(
        sourceQuestions.map(
          ({ question, options, imageUrl, videoUrl, ansmarks }) => ({
            question,
            options: options.map(({ optionText, isCorrect }) => ({
              optionText,
              isCorrect,
            })),
            imageUrl: imageUrl || null,
            videoUrl: videoUrl || null,
            ansmarks: ansmarks ?? 0,
            examId: clonedExam.examId,
          })
        )
      );
    }
  } catch (error) {
    await Question.deleteMany({ examId: clonedExam.examId });
    await Exam.deleteOne({ _id: clonedExam._id });
    throw error;
  }

  res.status(201).json({
    exam: clonedExam,
    questionCount: sourceQuestions.length,
  });
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
  await ExamAttempt.deleteMany({ examId });
  await CheatingLog.deleteMany({ examId });

  res.status(200).json(exam);
});

export { getExams, createExam, DeleteExamById, updateExam, cloneExam };
