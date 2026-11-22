import asyncHandler from 'express-async-handler';
import ExamAttempt from '../models/examAttemptModel.js';
import Result from '../models/resultModel.js';
import Exam from '../models/examModel.js';
import Enrollment from '../models/enrollmentModel.js';
import { attemptDeadline, validateProgress } from '../utils/examAttemptProgress.js';
import isCourseHiddenFromEveryone from '../utils/isCourseHiddenFromEveryone.js';

export const countUsedAttempts = async (examId, userId) => {
  const [legacyResults, startedAttempts] = await Promise.all([
    Result.countDocuments({ examId, userId, attemptId: { $exists: false } }),
    ExamAttempt.countDocuments({ examId, userId }),
  ]);
  return legacyResults + startedAttempts;
};

export const startOrResumeAttempt = asyncHandler(async (req, res) => {
  if (req.user.role !== 'student') {
    res.status(403);
    throw new Error('Only students can start an exam.');
  }
  const { examId } = req.params;
  const userId = req.user._id;
  const exam = await Exam.findOne({ examId });
  if (!exam) {
    res.status(404);
    throw new Error('Exam not found.');
  }
  if (await isCourseHiddenFromEveryone(exam.courseId)) {
    res.status(404);
    throw new Error('Exam not found.');
  }
  let attempt = await ExamAttempt.findOne({ examId, userId, status: 'active' });
  if (!attempt) {
    const now = new Date();
    const enrollment = exam.courseId
      ? await Enrollment.findOne({ courseId: exam.courseId, student: userId, status: 'approved' })
      : null;
    if (exam.courseId && !enrollment) {
      res.status(403);
      throw new Error('You must be enrolled in this course to take the exam.');
    }
    const sectionSchedule = exam.sectionSchedules?.find((item) => item.sectionId === enrollment?.sectionId);
    const availableFrom = sectionSchedule?.liveDate || exam.liveDate;
    const availableUntil = sectionSchedule?.deadDate || exam.deadDate;
    if (now < availableFrom || now >= availableUntil) {
      res.status(403);
      throw new Error('This exam is outside its availability window.');
    }
    const [legacyCount, sessions] = await Promise.all([
      Result.countDocuments({ examId, userId, attemptId: { $exists: false } }),
      ExamAttempt.find({ examId, userId }).select('slot'),
    ]);
    const occupied = new Set(sessions.map((entry) => entry.slot));
    let slot = legacyCount + 1;
    while (occupied.has(slot)) slot += 1;
    if (slot > exam.maxAttempts) {
      attempt = await ExamAttempt.findOne({ examId, userId, status: 'active' });
      if (!attempt) {
        res.status(403);
        throw new Error('You have used all attempts for this exam.');
      }
    }
    if (!attempt) {
      await ExamAttempt.init();
      try {
        attempt = await ExamAttempt.findOneAndUpdate(
          { examId, userId, status: 'active' },
          {
            $setOnInsert: {
              slot,
              startedAt: now,
              expiresAt: attemptDeadline({ duration: exam.duration, deadDate: availableUntil }, now),
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      } catch (error) {
        if (error.code !== 11000) throw error;
        attempt = await ExamAttempt.findOne({ examId, userId, status: 'active' });
        if (!attempt) {
          res.status(409);
          throw new Error('The attempt changed in another tab. Reopen the exam to continue.');
        }
      }
    }
  }
  res.json({ data: attempt, serverNow: new Date().toISOString() });
});

export const saveAttemptProgress = asyncHandler(async (req, res) => {
  const currentAttempt = await ExamAttempt.findOne({ _id: req.params.attemptId, userId: req.user._id, status: 'active' }).select('examId');
  if (currentAttempt) {
    const exam = await Exam.findOne({ examId: currentAttempt.examId }).select('courseId');
    if (await isCourseHiddenFromEveryone(exam?.courseId)) {
      res.status(404);
      throw new Error('Exam not found.');
    }
  }
  let progress;
  try {
    progress = validateProgress(req.body);
  } catch (error) {
    res.status(error.statusCode || 400);
    throw error;
  }
  const attempt = await ExamAttempt.findOneAndUpdate(
    {
      _id: req.params.attemptId,
      userId: req.user._id,
      status: 'active',
      finishedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    },
    { $set: progress },
    { new: true, runValidators: true },
  );
  if (!attempt) {
    res.status(409);
    throw new Error('The attempt has ended. Submit the saved answers to view its result.');
  }
  res.json({ success: true });
});
