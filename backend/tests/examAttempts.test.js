import test, { beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import Exam from '../models/examModel.js';
import ExamAttempt from '../models/examAttemptModel.js';
import Result from '../models/resultModel.js';
import CheatingLog from '../models/cheatingLogModel.js';
import Enrollment from '../models/enrollmentModel.js';
import {
  startOrResumeAttempt,
  saveAttemptProgress,
  countUsedAttempts,
} from '../controllers/examAttemptController.js';
import { saveResult } from '../controllers/resultController.js';
import Question from '../models/quesModel.js';
import { attemptDeadline } from '../utils/examAttemptProgress.js';

const user = {
  _id: '507f1f77bcf86cd799439011',
  role: 'student',
  name: 'Student',
  email: 'student@example.test',
};
const sessionId = '507f1f77bcf86cd799439022';
const exam = () => ({
  examId: 'exam-1',
  duration: 30,
  maxAttempts: 2,
  liveDate: new Date(Date.now() - 60000),
  deadDate: new Date(Date.now() + 3600000),
});
beforeEach(() => {
  for (const model of [ExamAttempt, Result, CheatingLog])
    mock.method(model, 'init', async () => {});
});
afterEach(() => mock.restoreAll());
async function invoke(handler, extra = {}) {
  const output = { status: 200 };
  const res = {
    status(code) {
      output.status = code;
      return this;
    },
    json(body) {
      output.body = body;
      return this;
    },
  };
  await handler(
    { user, params: { examId: 'exam-1', attemptId: sessionId }, body: {}, ...extra },
    res,
    (error) => {
      output.error = error;
    },
  );
  return output;
}

test('resuming an expired attempt retains its original answers and deadline', async () => {
  const running = { _id: sessionId, expiresAt: new Date(Date.now() - 5000), answers: { q1: 'a1' } };
  mock.method(Exam, 'findOne', async () => exam());
  mock.method(ExamAttempt, 'findOne', async () => running);
  const create = mock.method(ExamAttempt, 'findOneAndUpdate', () => {
    throw new Error('Must not restart');
  });
  const response = await invoke(startOrResumeAttempt);
  assert.equal(response.body.data, running);
  assert.equal(create.mock.callCount(), 0);
});

test('new attempts get a fixed server deadline and a reserved attempt slot', async () => {
  const definition = exam();
  mock.method(Exam, 'findOne', async () => definition);
  mock.method(ExamAttempt, 'findOne', async () => null);
  mock.method(Result, 'countDocuments', async () => 1);
  mock.method(ExamAttempt, 'find', () => ({ select: async () => [] }));
  mock.method(ExamAttempt, 'findOneAndUpdate', async (filter, update) => {
    const value = update.$setOnInsert;
    assert.equal(value.slot, 2);
    assert.equal(value.expiresAt - value.startedAt, 30 * 60000);
    return { ...filter, ...value, _id: sessionId };
  });
  const response = await invoke(startOrResumeAttempt);
  assert.equal(response.status, 200);
  assert.equal(response.body.data.slot, 2);
});

test('deadline cannot exceed the exam closing time', () => {
  const now = new Date();
  const definition = { duration: 30, deadDate: new Date(+now + 120000) };
  assert.equal(+attemptDeadline(definition, now), +definition.deadDate);
});

test('consumed attempts include started sessions and legacy results without double counting', async () => {
  mock.method(Result, 'countDocuments', async (filter) => {
    assert.deepEqual(filter.attemptId, { $exists: false });
    return 1;
  });
  mock.method(ExamAttempt, 'countDocuments', async () => 2);
  assert.equal(await countUsedAttempts('exam-1', user._id), 3);
});

test('attempt limits block new sessions even when prior sessions were abandoned', async () => {
  mock.method(Exam, 'findOne', async () => exam());
  mock.method(ExamAttempt, 'findOne', async () => null);
  mock.method(Result, 'countDocuments', async () => 0);
  mock.method(ExamAttempt, 'find', () => ({ select: async () => [{ slot: 1 }, { slot: 2 }] }));
  const response = await invoke(startOrResumeAttempt);
  assert.equal(response.status, 403);
});

test('a duplicate start from another tab returns the already running session', async () => {
  let reads = 0;
  const running = { _id: sessionId };
  mock.method(Exam, 'findOne', async () => exam());
  mock.method(ExamAttempt, 'findOne', async () => (++reads === 1 ? null : running));
  mock.method(Result, 'countDocuments', async () => 0);
  mock.method(ExamAttempt, 'find', () => ({ select: async () => [] }));
  mock.method(ExamAttempt, 'findOneAndUpdate', async () => {
    throw Object.assign(new Error('duplicate'), { code: 11000 });
  });
  const response = await invoke(startOrResumeAttempt);
  assert.equal(response.body.data, running);
});

test('new sessions require a student, an open exam, and approved enrollment', async () => {
  assert.equal(
    (await invoke(startOrResumeAttempt, { user: { ...user, role: 'lecturer' } })).status,
    403,
  );
  mock.method(Exam, 'findOne', async () => ({ ...exam(), courseId: 'course-1' }));
  mock.method(ExamAttempt, 'findOne', async () => null);
  mock.method(Enrollment, 'exists', async () => null);
  assert.equal((await invoke(startOrResumeAttempt)).status, 403);
  mock.restoreAll();
  mock.method(Exam, 'findOne', async () => ({ ...exam(), deadDate: new Date(Date.now() - 1) }));
  mock.method(ExamAttempt, 'findOne', async () => null);
  assert.equal((await invoke(startOrResumeAttempt)).status, 403);
});

test('progress updates are scoped to the owner, active status, and server deadline', async () => {
  mock.method(ExamAttempt, 'findOneAndUpdate', async (filter) => {
    assert.equal(filter.userId, user._id);
    assert.equal(filter.status, 'active');
    assert.ok(filter.expiresAt.$gt instanceof Date);
    return null;
  });
  const response = await invoke(saveAttemptProgress, {
    body: { answers: { q1: 'a1' }, currentQuestionIndex: 1 },
  });
  assert.equal(response.status, 409);
});

test('submission freezes saved answers, ignores late client answers, and is retryable', async () => {
  const now = Date.now();
  const stored = {
    _id: sessionId,
    answers: { q1: 'a1' },
    startedAt: new Date(now - 120000),
    expiresAt: new Date(now - 60000),
    proctoringLog: { noFaceCount: 2 },
    status: 'active',
  };
  mock.method(Exam, 'findOne', async () => exam());
  mock.method(ExamAttempt, 'findOneAndUpdate', async () => {
    if (stored.finishedAt) return null;
    stored.finishedAt = new Date();
    return stored;
  });
  mock.method(ExamAttempt, 'findOne', async () => stored);
  mock.method(ExamAttempt, 'updateOne', async () => {
    stored.status = 'submitted';
  });
  mock.method(Question, 'find', async () => [
    { _id: 'q1', ansmarks: 1, options: [{ _id: 'a1', isCorrect: true }] },
  ]);
  let result;
  mock.method(Result, 'findOneAndUpdate', async (filter, update) => {
    assert.equal(filter.attemptId, sessionId);
    result ||= update.$setOnInsert;
    return result;
  });
  mock.method(CheatingLog, 'findOneAndUpdate', async (filter, update) => {
    assert.equal(filter.attemptId, sessionId);
    assert.equal(update.$setOnInsert.noFaceCount, 2);
  });
  const body = {
    examId: 'exam-1',
    attemptId: sessionId,
    answers: { q1: 'wrong' },
    timeTakenSeconds: 0,
  };
  const first = await invoke(saveResult, { body });
  const second = await invoke(saveResult, { body });
  assert.equal(first.status, 201);
  assert.equal(first.body.data, second.body.data);
  assert.equal(result.percentage, 100);
  assert.equal(result.timeTakenSeconds, 60);
  assert.deepEqual(result.answers, { q1: 'a1' });
});

test('direct result submissions without a started attempt are rejected', async () => {
  const response = await invoke(saveResult, { body: { examId: 'exam-1', answers: {} } });
  assert.equal(response.status, 400);
});
