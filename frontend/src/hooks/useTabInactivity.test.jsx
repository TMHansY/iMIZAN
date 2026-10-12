import { act, renderHook } from '@testing-library/react';
import useTabInactivity from './useTabInactivity';

let hidden;
let now;
let props;
beforeEach(() => {
  hidden = false;
  now = 100000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  window.matchMedia = jest.fn(() => ({ matches: false }));
  Object.defineProperty(global, 'crypto', {
    configurable: true,
    value: { randomUUID: jest.fn(() => 'event-1') },
  });
  props = {
    cheatingLog: {},
    incrementViolation: jest.fn(),
    updateViolation: jest.fn(),
    capture: jest.fn().mockResolvedValue({ url: 'https://example.com/photo.jpg' }),
  };
});
afterEach(() => jest.restoreAllMocks());
const dispatch = async (name) => act(async () => document.dispatchEvent(new Event(name)));

test('captures one screenshot for overlapping leave/hidden events and times until return', async () => {
  // Use the real Date constructor timestamp as the start; Date.now controls return time.
  renderHook(() => useTabInactivity(props));
  await dispatch('mouseleave');
  hidden = true;
  await dispatch('visibilitychange');
  expect(props.incrementViolation).toHaveBeenCalledTimes(1);
  const event = props.incrementViolation.mock.calls[0][1];
  expect(props.capture).toHaveBeenCalledWith('tabSwitch', event.detectedAt);
  expect(props.updateViolation).toHaveBeenCalledWith('event-1', {
    url: 'https://example.com/photo.jpg',
  });
  now = new Date(event.detectedAt).getTime() + 6500;
  hidden = false;
  await dispatch('visibilitychange');
  expect(props.updateViolation).toHaveBeenCalledWith('event-1', { durationSeconds: 6.5 });
  await dispatch('mouseenter');
  expect(props.incrementViolation).toHaveBeenCalledTimes(1);
});

test('records immediately during a slow upload and preserves duration when upload completes', async () => {
  let resolveUpload;
  props.capture.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
  );
  renderHook(() => useTabInactivity(props));
  hidden = true;
  await dispatch('visibilitychange');
  expect(props.incrementViolation).toHaveBeenCalledTimes(1);
  const event = props.incrementViolation.mock.calls[0][1];
  now = new Date(event.detectedAt).getTime() + 10000;
  hidden = false;
  await dispatch('visibilitychange');
  expect(props.updateViolation).toHaveBeenCalledWith('event-1', { durationSeconds: 10 });
  await act(async () => resolveUpload({ url: 'uploaded.jpg' }));
  expect(props.updateViolation).toHaveBeenLastCalledWith('event-1', { url: 'uploaded.jpg' });
});

test('retries a missing hidden camera frame on return without counting again', async () => {
  props.capture.mockResolvedValueOnce(null);
  renderHook(() => useTabInactivity(props));
  hidden = true;
  await dispatch('visibilitychange');
  hidden = false;
  await dispatch('visibilitychange');
  expect(props.capture).toHaveBeenCalledTimes(2);
  expect(props.incrementViolation).toHaveBeenCalledTimes(1);
  expect(props.updateViolation).toHaveBeenCalledWith('event-1', {
    url: 'https://example.com/photo.jpg',
  });
});

test('touch devices ignore cursor events and old pending absences close on resume', async () => {
  window.matchMedia.mockReturnValue({ matches: true });
  props.cheatingLog = {
    screenshots: [
      {
        type: 'tabSwitch',
        eventId: 'old',
        detectedAt: new Date(90000).toISOString(),
        durationSeconds: null,
        url: 'old.jpg',
      },
    ],
  };
  renderHook(() => useTabInactivity(props));
  expect(props.updateViolation).toHaveBeenCalledWith('old', { durationSeconds: 10 });
  await dispatch('mouseleave');
  expect(props.incrementViolation).not.toHaveBeenCalled();
});
