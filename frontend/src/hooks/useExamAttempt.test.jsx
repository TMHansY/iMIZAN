import React from 'react';
import { act, fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import useExamAttempt from './useExamAttempt';
import axios from '../axios';

jest.mock('../axios', () => ({ post: jest.fn(), put: jest.fn() }));
let stored;
function Exam() {
  const state = useExamAttempt('exam-1');
  if (state.loading) return <div>Loading</div>;
  return (
    <>
      <output data-testid="answers">{JSON.stringify(state.progress.answers)}</output>
      <output data-testid="remaining">{state.timeLeft}</output>
      <output data-testid="status">{state.submitted ? 'submitted' : state.error}</output>
      <button
        onClick={() =>
          state.update((value) => ({ ...value, answers: { q1: 'a1' }, currentQuestionIndex: 1 }))
        }
      >
        Answer
      </button>
      <button onClick={state.submit}>Submit</button>
      {state.blocker.state === 'blocked' && (
        <div role="dialog">
          <button onClick={() => state.blocker.reset()}>Stay</button>
          <button onClick={state.leave}>Leave</button>
        </div>
      )}
    </>
  );
}
function mount() {
  const router = createMemoryRouter(
    [
      { path: '/outside', element: <div>Outside exam</div> },
      { path: '/exam', element: <Exam /> },
    ],
    { initialEntries: ['/outside', '/exam'], initialIndex: 1 },
  );
  const view = render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);
  return { ...view, router };
}
beforeEach(() => {
  sessionStorage.clear();
  jest.clearAllMocks();
  stored = {
    _id: 'attempt-1',
    answers: {},
    currentQuestionIndex: 0,
    proctoringLog: {},
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  };
  axios.post.mockImplementation(async (url) =>
    url.endsWith('/start')
      ? { data: { data: { ...stored }, serverNow: new Date(Date.now()).toISOString() } }
      : { data: {} },
  );
  axios.put.mockImplementation(async (url, value) => {
    stored = { ...stored, ...value };
    return { data: {} };
  });
});
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

test('browser Back asks for confirmation, Stay preserves progress, and returning resumes the same deadline', async () => {
  const { router } = mount();
  await screen.findByTestId('answers');
  const deadline = stored.expiresAt;
  fireEvent.click(screen.getByText('Answer'));
  await waitFor(() => expect(stored.answers).toEqual({ q1: 'a1' }));
  await act(async () => {
    await router.navigate(-1);
  });
  expect(screen.getByRole('dialog')).toBeTruthy();
  fireEvent.click(screen.getByText('Stay'));
  expect(screen.getByTestId('answers').textContent).toContain('a1');
  await act(async () => {
    await router.navigate(-1);
  });
  fireEvent.click(screen.getByText('Leave'));
  await screen.findByText('Outside exam');
  jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 10000);
  await act(async () => {
    await router.navigate('/exam');
  });
  await screen.findByTestId('answers');
  expect(screen.getByTestId('answers').textContent).toContain('a1');
  expect(stored.expiresAt).toBe(deadline);
  expect(Number(screen.getByTestId('remaining').textContent)).toBeLessThanOrEqual(50);
});

test('reloads are warned and a local unsaved backup can be restored before expiry', async () => {
  sessionStorage.setItem(
    'imizan-attempt-attempt-1',
    JSON.stringify({
      answers: { q1: 'a1' },
      currentQuestionIndex: 1,
      proctoringLog: { noFaceCount: 2 },
    }),
  );
  mount();
  await screen.findByTestId('answers');
  expect(screen.getByTestId('answers').textContent).toContain('a1');
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  await waitFor(() => expect(stored.proctoringLog.noFaceCount).toBe(2));
});

test('an expired resume submits once and does not send late local answers', async () => {
  stored.expiresAt = new Date(Date.now() - 1000).toISOString();
  sessionStorage.setItem(
    'imizan-attempt-attempt-1',
    JSON.stringify({ answers: { q1: 'late' }, currentQuestionIndex: 1 }),
  );
  mount();
  await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('submitted'));
  expect(axios.put).not.toHaveBeenCalled();
  expect(axios.post.mock.calls.filter(([url]) => url === '/api/users/results')).toEqual([
    [
      '/api/users/results',
      { examId: 'exam-1', attemptId: 'attempt-1' },
      { withCredentials: true, timeout: 15000 },
    ],
  ]);
});

test('submission waits for pending answer saves and uses the attempt identity', async () => {
  mount();
  await screen.findByTestId('answers');
  await waitFor(() => expect(axios.put).toHaveBeenCalledTimes(0));
  let release;
  axios.put.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  fireEvent.click(screen.getByText('Answer'));
  await waitFor(() => expect(release).toBeDefined());
  fireEvent.click(screen.getByText('Submit'));
  expect(axios.post.mock.calls.filter(([url]) => url === '/api/users/results')).toHaveLength(0);
  await act(async () => {
    release({ data: {} });
  });
  await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('submitted'));
  expect(stored.answers).toEqual({ q1: 'a1' });
});

test('failed autosave keeps leave navigation blocked with a retryable error', async () => {
  const { router } = mount();
  await screen.findByTestId('answers');
  axios.put.mockRejectedValue(new Error('offline'));
  await act(async () => {
    await router.navigate(-1);
  });
  fireEvent.click(screen.getByText('Leave'));
  await waitFor(() =>
    expect(screen.getByTestId('status').textContent).toContain('Check your connection'),
  );
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(router.state.location.pathname).toBe('/exam');
});

test('a failed submission retries the same frozen attempt without trying another progress save', async () => {
  mount();
  await screen.findByTestId('answers');
  const normalPost = axios.post.getMockImplementation();
  let calls = 0;
  axios.post.mockImplementation((url, ...args) => {
    if (url === '/api/users/results' && calls++ === 0)
      return Promise.reject(new Error('lost response'));
    return normalPost(url, ...args);
  });
  fireEvent.click(screen.getByText('Submit'));
  await waitFor(() =>
    expect(screen.getByTestId('status').textContent).toContain('Check your connection'),
  );
  const saves = axios.put.mock.calls.length;
  fireEvent.click(screen.getByText('Submit'));
  await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('submitted'));
  expect(axios.put.mock.calls.length).toBe(saves);
});
