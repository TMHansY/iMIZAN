import ExamAttempt from '../models/examAttemptModel.js';
import { countUsedAttempts } from './examAttemptController.js';
import asyncHandler from 'express-async-handler';
import Result from '../models/resultModel.js';
import Exam from '../models/examModel.js';
import User from '../models/userModel.js';
import CheatingLog from '../models/cheatingLogModel.js';
import isExamOwner from '../utils/checkExamOwnership.js';
import { finalizeExamAttempt } from '../services/finalizeExamAttempt.js';
import Course from '../models/courseModel.js';
import Enrollment from '../models/enrollmentModel.js';
import isCourseHiddenFromEveryone from '../utils/isCourseHiddenFromEveryone.js';
import Question from '../models/quesModel.js';

const releaseSelectedResults = asyncHandler(async (req, res) => {
  if (req.user.role !== 'lecturer') {
    res.status(403);
    throw new Error('Not authorized to release results');
  }
  const { ids } = req.body;
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.some((id) => typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id))
  ) {
    res.status(400);
    throw new Error('Select valid results to release');
  }
  const uniqueIds = [...new Set(ids.map((id) => id.toLowerCase()))];
  const selectedResults = await Result.find({ _id: { $in: uniqueIds } }).select('examId');
  if (selectedResults.length !== uniqueIds.length) {
    res.status(404);
    throw new Error('Some selected results no longer exist. Refresh the list and try again.');
  }
  const examIds = [...new Set(selectedResults.map((result) => result.examId))];
  const exams = await Exam.find({ examId: { $in: examIds } });
  if (exams.length !== examIds.length || exams.some((exam) => !isExamOwner(exam, req.user))) {
    res.status(403);
    throw new Error('Not authorized to release one or more selected results');
  }
  const update = await Result.updateMany(
    { _id: { $in: uniqueIds }, examId: { $in: examIds } },
    { $set: { showToStudent: true } },
  );
  res.status(200).json({
    success: true,
    data: { matchedCount: update.matchedCount, modifiedCount: update.modifiedCount },
  });
});

const attachAnswers = (result) => {
  const obj = result.toObject ? result.toObject() : result;
  const answers = obj.answers instanceof Map ? Object.fromEntries(obj.answers) : obj.answers;
  return {
    ...obj,
    answers,
    integrityStatus: obj.integrityDecision === 'cheating' ? 'Cheating confirmed' : 'Clear',
  };
};

const attachMaxMarks = async (results) => {
  const normalized = results.map(attachAnswers);
  const needsMaxMarks = normalized.filter((result) => result.maxMarks == null);
  if (needsMaxMarks.length === 0) return normalized;
  const examIds = [...new Set(needsMaxMarks.map((result) => result.examId))];
  const questions = await Question.find({ examId: { $in: examIds } }).select('examId ansmarks');
  const maxMarksByExam = new Map();
  questions.forEach((question) => {
    maxMarksByExam.set(question.examId, (maxMarksByExam.get(question.examId) || 0) + (question.ansmarks || 1));
  });
  return normalized.map((result) => ({
    ...result,
    maxMarks: result.maxMarks ?? maxMarksByExam.get(result.examId) ?? 0,
  }));
};

const attachAttemptNumbers = (results) => {
  const grouped = {};
  results.forEach((r) => {
    const userIdStr =
      typeof r.userId === 'object' && r.userId !== null
        ? r.userId._id.toString()
        : String(r.userId);
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
    throw new Error('Exam not found');
  }
  if (await isCourseHiddenFromEveryone(exam.courseId)) {
    res.status(404);
    throw new Error('Exam not found');
  }

  const attemptsUsed = await countUsedAttempts(examId, req.user._id);
  const activeAttempt = await ExamAttempt.findOne({
    examId,
    userId: req.user._id,
    status: 'active',
  });

  res.status(200).json({
    success: true,
    data: {
      attemptsUsed,
      activeAttempt: activeAttempt
        ? { id: activeAttempt._id, expiresAt: activeAttempt.expiresAt }
        : null,
      maxAttempts: exam.maxAttempts,
      attemptsRemaining: Math.max(exam.maxAttempts - attemptsUsed, 0),
    },
  });
});

// @desc    Save exam result
// @route   POST /api/results
// @access  Private
const saveResult = asyncHandler(async (req, res) => {
  const { examId, attemptId } = req.body;
  if (!examId || !attemptId) {
    res.status(400);
    throw new Error('An active exam attempt is required. Open the exam from its details page.');
  }
  const exam = await Exam.findOne({ examId });
  if (!exam) {
    res.status(404);
    throw new Error('Exam not found.');
  }
  if (req.user.role === 'student' && await isCourseHiddenFromEveryone(exam.courseId)) {
    res.status(404);
    throw new Error('Exam not found.');
  }
  const now = new Date();
  // Freeze the last server-saved progress; retries use the same finalization path.
  let result;
  try {
    result = await finalizeExamAttempt({
      examId,
      attemptId,
      userId: req.user._id,
      finishedAt: now,
      username: req.user.name,
      email: req.user.email,
    });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    throw error;
  }

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
    throw new Error('Exam not found');
  }

  if (!isExamOwner(exam, req.user)) {
    res.status(403);
    throw new Error('Not authorized to view results for this exam');
  }

  const results = await Result.find({ examId })
    .populate('userId', 'name email')
    .sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    data: attachAttemptNumbers(await attachMaxMarks(results)),
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
  const exams = await Exam.find({ examId: { $in: results.map((result) => result.examId) } }).select('examId courseId');
  const hiddenCourses = await Course.find({ courseId: { $in: exams.map((exam) => exam.courseId).filter(Boolean) }, hideFromEveryone: true }).select('courseId');
  const hiddenCourseIds = new Set(hiddenCourses.map((course) => course.courseId));
  const hiddenExamIds = new Set(exams.filter((exam) => hiddenCourseIds.has(exam.courseId)).map((exam) => exam.examId));
  const visibleResults = results.filter((result) => !hiddenExamIds.has(result.examId));
  res.status(200).json({
    success: true,
    data: attachAttemptNumbers(await attachMaxMarks(visibleResults)),
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
    throw new Error('Result not found');
  }

  const isOwner = result.userId.toString() === req.user._id.toString();

  const exam = await Exam.findOne({ examId: result.examId });
  if (isOwner && await isCourseHiddenFromEveryone(exam?.courseId)) {
    res.status(404);
    throw new Error('Result not found');
  }
  const isLecturerOwner = isExamOwner(exam, req.user);

  if (!isOwner && !isLecturerOwner) {
    res.status(403);
    throw new Error('Not authorized to view this result');
  }

  res.status(200).json({
    success: true,
    data: (await attachMaxMarks([result]))[0],
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
    throw new Error('Result not found');
  }

  const exam = await Exam.findOne({ examId: result.examId });
  if (!isExamOwner(exam, req.user)) {
    res.status(403);
    throw new Error('Not authorized to modify this result');
  }

  result.showToStudent = !result.showToStudent;
  await result.save();

  res.status(200).json({
    success: true,
    data: result,
  });
});

const setResultIntegrityDecision = asyncHandler(async (req, res) => {
  if (req.user.role !== 'lecturer') {
    res.status(403);
    throw new Error('Not authorized to update result integrity status');
  }

  const { resultId } = req.params;
  const { integrityDecision } = req.body;
  if (!['clear', 'cheating'].includes(integrityDecision)) {
    res.status(400);
    throw new Error('Integrity decision must be clear or cheating');
  }

  const result = await Result.findById(resultId);
  if (!result) {
    res.status(404);
    throw new Error('Result not found');
  }
  const exam = await Exam.findOne({ examId: result.examId });
  if (!isExamOwner(exam, req.user)) {
    res.status(403);
    throw new Error('Not authorized to update this result');
  }

  result.integrityDecision = integrityDecision;
  await result.save();
  res.status(200).json({ success: true, data: attachAnswers(result) });
});

// @desc    Get all results (for lecturers)
// @route   GET /api/results/all
// @access  Private (Lecturer only)
const getAllResults = asyncHandler(async (req, res) => {
  if (req.user.role !== 'lecturer') {
    res.status(403);
    throw new Error('Not authorized to view all results');
  }

  const ownedExams = await Exam.find({
    $or: [{ createdBy: req.user._id }, { createdBy: { $exists: false } }],
  }).select('examId courseId');
  const ownedExamIds = ownedExams.map((e) => e.examId);

  const rawResults = await Result.find({ examId: { $in: ownedExamIds } })
    .populate('userId', 'name email')
    .sort({ createdAt: -1 });
  const courseIds = [...new Set(ownedExams.map((exam) => exam.courseId).filter(Boolean))];
  const studentIds = [...new Set(rawResults.map((result) => result.userId?._id?.toString()).filter(Boolean))];
  const [courses, enrollments] = await Promise.all([
    Course.find({ courseId: { $in: courseIds } }).select('courseId sections'),
    Enrollment.find({ courseId: { $in: courseIds }, student: { $in: studentIds } }).select('courseId student sectionId'),
  ]);
  const courseById = new Map(courses.map((course) => [course.courseId, course]));
  const examById = new Map(ownedExams.map((exam) => [exam.examId, exam]));
  const enrollmentByCourseStudent = new Map(
    enrollments.map((enrollment) => [`${enrollment.courseId}:${enrollment.student}`, enrollment]),
  );
  const resultsWithMaxMarks = await attachMaxMarks(rawResults);
  const results = attachAttemptNumbers(resultsWithMaxMarks).map((result) => {
    const courseId = examById.get(result.examId)?.courseId;
    const enrollment = enrollmentByCourseStudent.get(`${courseId}:${result.userId?._id}`);
    const section = courseById.get(courseId)?.sections?.find((item) => item.sectionId === enrollment?.sectionId);
    return { ...result, sectionId: enrollment?.sectionId || '', sectionName: section?.name || 'Unassigned' };
  });
  res.status(200).json({
    success: true,
    data: results,
  });
});

// @desc    Set visibility for all results of a specific exam
// @route   PUT /api/users/results/exam/:examId/visibility
// @access  Private (Lecturer only)
const setExamResultsVisibility = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const { showToStudent } = req.body;

  if (req.user.role !== 'lecturer') {
    res.status(403);
    throw new Error('Not authorized to change result visibility');
  }

  const exam = await Exam.findOne({ examId });
  if (!exam) {
    res.status(404);
    throw new Error('Exam not found');
  }
  if (!isExamOwner(exam, req.user)) {
    res.status(403);
    throw new Error('Not authorized to change results for this exam');
  }

  if (typeof showToStudent !== 'boolean') {
    res.status(400);
    throw new Error('showToStudent must be true or false');
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
  const exams = await Exam.find({ examId: { $in: results.map((result) => result.examId) } }).select('examId courseId');
  const hiddenCourses = await Course.find({ courseId: { $in: exams.map((exam) => exam.courseId).filter(Boolean) }, hideFromEveryone: true }).select('courseId');
  const hiddenCourseIds = new Set(hiddenCourses.map((course) => course.courseId));
  const hiddenExamIds = new Set(exams.filter((exam) => hiddenCourseIds.has(exam.courseId)).map((exam) => exam.examId));

  const statusByExam = {};
  for (const r of results) {
    if (hiddenExamIds.has(r.examId)) continue;
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
  if (req.user.role !== 'lecturer') {
    res.status(403);
    throw new Error('Not authorized');
  }

  const ownedExams = await Exam.find({
    $or: [{ createdBy: req.user._id }, { createdBy: { $exists: false } }],
  }).select('examId');
  const ownedExamIds = ownedExams.map((e) => e.examId);

  const pendingResults = await Result.aggregate([
    { $match: { showToStudent: { $ne: true }, examId: { $in: ownedExamIds } } },
    { $group: { _id: '$examId', count: { $sum: 1 } } },
  ]);

  res.status(200).json({
    success: true,
    data: pendingResults.map((r) => ({ examId: r._id, pendingCount: r.count })),
  });
});
// @desc    Delete a specific result/attempt
// @route   DELETE /api/users/results/:resultId
// @access  Private (Lecturer only, must own the course/exam)
const deleteResult = asyncHandler(async (req, res) => {
  const { resultId } = req.params;

  if (req.user.role !== 'lecturer') {
    res.status(403);
    throw new Error('Not authorized to delete results');
  }

  const result = await Result.findById(resultId);
  if (!result) {
    res.status(404);
    throw new Error('Result not found');
  }

  const exam = await Exam.findOne({ examId: result.examId });
  if (!isExamOwner(exam, req.user)) {
    res.status(403);
    throw new Error('Not authorized to delete this result');
  }

  // New results have an explicit attempt link; legacy results use the
  // closest log timestamp as a fallback.
  const student = await User.findById(result.userId);
  if (result.attemptId) {
    await CheatingLog.deleteOne({ attemptId: result.attemptId });
    await ExamAttempt.deleteOne({ _id: result.attemptId });
  } else if (student) {
    const candidateLogs = await CheatingLog.find({
      examId: result.examId,
      email: student.email,
    });

    if (candidateLogs.length > 0) {
      const resultTime = new Date(result.createdAt).getTime();
      const closestLog = candidateLogs.reduce((closest, log) => {
        const diff = Math.abs(new Date(log.createdAt).getTime() - resultTime);
        if (!closest || diff < closest.diff) {
          return { log, diff };
        }
        return closest;
      }, null);

      if (closestLog) {
        await CheatingLog.deleteOne({ _id: closestLog.log._id });
      }
    }
  }

  await Result.deleteOne({ _id: resultId });

  res.status(200).json({ message: 'Attempt and its proctoring log deleted.' });
});

export {
  releaseSelectedResults,
  saveResult,
  getResultsByExamId,
  getUserResults,
  deleteResult,
  toggleResultVisibility,
  setResultIntegrityDecision,
  getAllResults,
  getAttemptCount,
  getResultById,
  setExamResultsVisibility,
  getMyExamStatus,
  getPendingReviewSummary,
};
