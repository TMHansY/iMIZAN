import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProgress, finalizeProctoringLog } from '../utils/examAttemptProgress.js';
import CheatingLog from '../models/cheatingLogModel.js';

const event = {
  type: 'tabSwitch',
  eventId: 'event-1',
  detectedAt: '2026-10-11T10:00:00.000Z',
  url: '',
  durationSeconds: null,
};

test('autosave preserves pending inactivity and completed duration and screenshot', () => {
  for (const screenshot of [
    event,
    { ...event, url: 'https://example.com/photo.jpg', durationSeconds: 12.5 },
  ]) {
    const saved = validateProgress({
      answers: {},
      currentQuestionIndex: 0,
      proctoringLog: { tabSwitchCount: 1, screenshots: [screenshot] },
    });
    assert.deepEqual(saved.proctoringLog.screenshots, [screenshot]);
    const log = new CheatingLog({
      ...saved.proctoringLog,
      examId: 'exam',
      email: 'student@example.com',
      username: 'Student',
    });
    assert.equal(log.validateSync(), undefined);
    assert.equal(log.screenshots[0].durationSeconds, screenshot.durationSeconds);
  }
});

test('submission closes unfinished absence at deadline and keeps legacy logs unchanged', () => {
  const legacy = {
    type: 'tabSwitch',
    url: 'old.jpg',
    detectedAt: event.detectedAt,
  };
  const log = finalizeProctoringLog(
    { screenshots: [event, legacy, { ...event, durationSeconds: 120 }] },
    '2026-10-11T10:01:00.000Z',
  );
  assert.equal(log.screenshots[0].durationSeconds, 60);
  assert.deepEqual(log.screenshots[1], legacy);
  assert.equal(log.screenshots[2].durationSeconds, 60);
});

test('duration validation excludes invalid values and non-tab flags', () => {
  const { proctoringLog } = validateProgress({
    answers: {},
    currentQuestionIndex: 0,
    proctoringLog: {
      screenshots: [
        { ...event, durationSeconds: -1 },
        { ...event, type: 'noFace', durationSeconds: 10 },
      ],
    },
  });
  assert.equal(proctoringLog.screenshots[0].durationSeconds, undefined);
  assert.equal(proctoringLog.screenshots[1].durationSeconds, undefined);
});
