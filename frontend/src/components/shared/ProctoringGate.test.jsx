import React, { useEffect } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProctoringGate from './ProctoringGate';
import useProctoringModels from '../../hooks/useProctoringModels';
import axios from '../../axios';
import { getProctoringSnapshot } from '../../utils/proctoringModels';

jest.mock('../../hooks/useProctoringModels');
jest.mock('../../axios', () => ({ get: jest.fn() }));
jest.mock('../../utils/proctoringModels', () => ({ getProctoringSnapshot: jest.fn() }));
const startAttempt = jest.fn();
function Exam() {
  useEffect(() => {
    startAttempt();
  }, []);
  return <div>Exam questions</div>;
}
const tree = () => (
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <ProctoringGate>
      <Exam />
    </ProctoringGate>
  </MemoryRouter>
);
beforeEach(() => {
  jest.clearAllMocks();
  getProctoringSnapshot.mockReturnValue({ status: 'idle' });
  axios.get.mockResolvedValue({ data: { data: { activeAttempt: null } } });
  useProctoringModels.mockReturnValue({ status: 'loading', message: 'Warming up…' });
});

test('a new timed attempt is not mounted until model preparation succeeds', async () => {
  const view = render(tree());
  await screen.findByText('Warming up…');
  expect(startAttempt).not.toHaveBeenCalled();
  useProctoringModels.mockReturnValue({ status: 'ready' });
  view.rerender(tree());
  expect(screen.getByText('Exam questions')).toBeInTheDocument();
  expect(startAttempt).toHaveBeenCalledTimes(1);
});

test('failed preparation offers retry without starting an attempt', async () => {
  const retry = jest.fn();
  useProctoringModels.mockReturnValue({ status: 'error', message: 'Could not load', retry });
  render(tree());
  await waitFor(() => expect(useProctoringModels).toHaveBeenLastCalledWith(true));
  fireEvent.click(screen.getByRole('button', { name: 'Retry preparation' }));
  expect(retry).toHaveBeenCalledTimes(1);
  expect(startAttempt).not.toHaveBeenCalled();
});

test('an expired attempt can finalize without downloading models', async () => {
  axios.get.mockResolvedValue({
    data: { data: { activeAttempt: { expiresAt: new Date(Date.now() - 1000).toISOString() } } },
  });
  render(tree());
  expect(await screen.findByText('Exam questions')).toBeInTheDocument();
  expect(startAttempt).toHaveBeenCalledTimes(1);
  expect(useProctoringModels).toHaveBeenLastCalledWith(false);
});
