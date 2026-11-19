import ExamAttempt from '../models/examAttemptModel.js';
import User from '../models/userModel.js';
import { finalizeExamAttempt } from './finalizeExamAttempt.js';

let processing = false;

export async function processExpiredAttempts() {
  if (processing) return;
  processing = true;
  try {
    const expired = await ExamAttempt.find({
      status: 'active',
      expiresAt: { $lte: new Date() },
    })
      .sort({ expiresAt: 1 })
      .limit(100)
      .select('examId userId _id expiresAt');

    for (const attempt of expired) {
      try {
        const user = await User.findById(attempt.userId).select('name email');
        await finalizeExamAttempt({
          examId: attempt.examId,
          attemptId: attempt._id,
          userId: attempt.userId,
          finishedAt: attempt.expiresAt,
          username: user?.name,
          email: user?.email,
        });
      } catch (error) {
        console.error(`Could not finalize expired attempt ${attempt._id}:`, error);
      }
    }
  } finally {
    processing = false;
  }
}
