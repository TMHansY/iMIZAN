import ExamAttempt from '../models/examAttemptModel.js';
import Result from '../models/resultModel.js';
import Question from '../models/quesModel.js';
import CheatingLog from '../models/cheatingLogModel.js';
import { finalizeProctoringLog } from '../utils/examAttemptProgress.js';

export async function finalizeExamAttempt({ examId, attemptId, userId, finishedAt = new Date(), username, email }) {
  let attempt = await ExamAttempt.findOneAndUpdate(
    {
      _id: attemptId,
      examId,
      userId,
      status: 'active',
      finishedAt: { $exists: false },
    },
    { $set: { finishedAt } },
    { new: true },
  );

  if (!attempt) {
    attempt = await ExamAttempt.findOne({
      _id: attemptId,
      examId,
      userId,
      finishedAt: { $exists: true },
    });
  }
  if (!attempt) {
    const error = new Error('Exam attempt not found.');
    error.statusCode = 404;
    throw error;
  }

  const answers = attempt.answers instanceof Map ? Object.fromEntries(attempt.answers) : attempt.answers;
  const completedAt = Math.min(new Date(attempt.finishedAt).getTime(), new Date(attempt.expiresAt).getTime());
  const timeTakenSeconds = Math.max(0, Math.round((completedAt - new Date(attempt.startedAt).getTime()) / 1000));
  const questions = await Question.find({ examId });
  let totalMarks = 0;
  const maxMarks = questions.reduce((total, question) => total + (question.ansmarks || 1), 0);
  let correctAnswers = 0;

  for (const question of questions) {
    const userAnswer = answers[question._id.toString()];
    if (userAnswer) {
      const correctOption = question.options.find((option) => option.isCorrect);
      if (correctOption && correctOption._id.toString() === userAnswer) {
        totalMarks += question.ansmarks || 1;
        correctAnswers += 1;
      }
    }
  }

  const percentage = questions.length ? (correctAnswers / questions.length) * 100 : 0;
  await Promise.all([Result.init(), CheatingLog.init()]);
  let result;
  try {
    result = await Result.findOneAndUpdate(
      { attemptId: attempt._id },
      {
        $setOnInsert: {
          attemptId: attempt._id,
          examId,
          userId,
          answers,
          totalMarks,
          maxMarks,
          percentage,
          timeTakenSeconds,
          showToStudent: false,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    result = await Result.findOne({ attemptId: attempt._id });
  }

  try {
    await CheatingLog.findOneAndUpdate(
      { attemptId: attempt._id },
      {
        $setOnInsert: {
          ...finalizeProctoringLog(attempt.proctoringLog, completedAt),
          attemptId: attempt._id,
          examId,
          username: username || 'Student',
          email: email || 'unknown',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }

  await ExamAttempt.updateOne({ _id: attempt._id }, { $set: { status: 'submitted' } });
  return result;
}
