import mongoose from 'mongoose';

const examAttemptSchema = new mongoose.Schema(
  {
    examId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    slot: { type: Number, required: true },
    status: { type: String, enum: ['active', 'submitted'], default: 'active' },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    finishedAt: Date,
    answers: { type: Map, of: String, default: {} },
    currentQuestionIndex: { type: Number, default: 0 },
    proctoringLog: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

// Starting from two tabs must still return one running attempt.
examAttemptSchema.index(
  { examId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);
examAttemptSchema.index({ examId: 1, userId: 1, slot: 1 }, { unique: true });
export default mongoose.model('ExamAttempt', examAttemptSchema);
