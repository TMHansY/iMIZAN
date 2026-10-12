import { startDetectionLoop } from './detectionLoop';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

test('slow detection does not overlap and the next run waits until completion', async () => {
  let finish;
  const detect = jest.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const stop = startDetectionLoop(detect, jest.fn());
  jest.advanceTimersByTime(10000);
  expect(detect).toHaveBeenCalledTimes(1);
  finish();
  await flush();
  jest.advanceTimersByTime(999);
  expect(detect).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(1);
  expect(detect).toHaveBeenCalledTimes(2);
  stop();
  finish();
});

test('unmount marks in-flight work inactive and never schedules another run', async () => {
  let finish;
  let isActive;
  const detect = jest.fn((active) => {
    isActive = active;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  const stop = startDetectionLoop(detect, jest.fn());
  jest.advanceTimersByTime(0);
  stop();
  expect(isActive()).toBe(false);
  finish();
  await flush();
  jest.advanceTimersByTime(10000);
  expect(detect).toHaveBeenCalledTimes(1);
});

test('an inference failure is reported and subsequent runs are still scheduled', async () => {
  const detect = jest
    .fn()
    .mockRejectedValueOnce(new Error('Inference failed'))
    .mockResolvedValue([]);
  const onError = jest.fn();
  const stop = startDetectionLoop(detect, onError);
  jest.advanceTimersByTime(0);
  await flush();
  expect(onError).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(1000);
  expect(detect).toHaveBeenCalledTimes(2);
  stop();
});
