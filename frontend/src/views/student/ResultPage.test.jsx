import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { createAppTheme } from '../../theme/DefaultColors';
import axiosInstance from '../../axios';
import ResultPage from './ResultPage';

jest.mock('../../axios', () => ({ get: jest.fn(), put: jest.fn() }));
jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('../../slices/cheatingLogApiSlice', () => ({
  useLazyGetCheatingLogsQuery: () => [jest.fn()],
}));

let results;
const makeResult = (id, name, attemptNumber = 1, showToStudent = false, examId = 'one') => ({
  _id: id,
  userId: { _id: name, name, email: `${name}@example.test` },
  examId,
  attemptNumber,
  totalAttemptsForExam: 2,
  showToStudent,
  percentage: 80,
  totalMarks: 8,
  status: 'pass',
  createdAt: '2026-10-14T08:00:00Z',
});

beforeEach(() => {
  jest.clearAllMocks();
  useSelector.mockReturnValue({ userInfo: { role: 'lecturer' } });
  results = [
    makeResult('a', 'Alice'),
    makeResult('b', 'Alice', 2),
    makeResult('c', 'Bob', 1, true),
    makeResult('d', 'David', 1, false, 'two'),
  ];
  axiosInstance.get.mockImplementation(async (url) => ({
    data:
      url === '/api/users/exam'
        ? [
            { examId: 'one', examName: 'First exam' },
            { examId: 'two', examName: 'Second exam' },
          ]
        : { data: results },
  }));
  axiosInstance.put.mockImplementation(async (url, { ids }) => {
    results = results.map((result) =>
      ids.includes(result._id) ? { ...result, showToStudent: true } : result,
    );
    return { data: { data: { modifiedCount: ids.length } } };
  });
});

async function mount() {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider theme={createAppTheme('light')}>
        <ResultPage />
      </ThemeProvider>
    </MemoryRouter>,
  );
  await screen.findByText('Exam Results');
}

test('select all releases unreleased filtered attempts including earlier attempts, leaving other students untouched', async () => {
  await mount();
  fireEvent.change(screen.getByLabelText('Search Students'), { target: { value: 'Alice' } });
  fireEvent.click(
    screen.getByRole('checkbox', { name: 'Select all unreleased results matching filters' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Release Selected (2)' }));
  await screen.findByRole('button', { name: 'Release Selected (0)' });
  expect(axiosInstance.put).toHaveBeenCalledWith(
    '/api/users/results/release-selected',
    { ids: ['a', 'b'] },
    { withCredentials: true },
  );
  expect(results.find((result) => result._id === 'd').showToStudent).toBe(false);
  expect(results.find((result) => result._id === 'c').showToStudent).toBe(true);
  expect(screen.getByRole('checkbox', { name: /Select Alice/ })).toBeDisabled();
});

test('an individual row selects only its displayed attempt and blocks repeat clicks during release', async () => {
  await mount();
  let finish;
  axiosInstance.put.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  expect(screen.getByRole('checkbox', { name: /Select Bob/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: /Select Alice/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Release Selected (1)' }));
  expect(screen.getByRole('button', { name: 'Updating…' })).toBeDisabled();
  expect(screen.getByLabelText('Search Students')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Updating…' }));
  expect(axiosInstance.put).toHaveBeenCalledTimes(1);
  expect(axiosInstance.put.mock.calls[0][1]).toEqual({ ids: ['b'] });
  results = results.map((result) =>
    result._id === 'b' ? { ...result, showToStudent: true } : result,
  );
  await act(async () => finish({ data: { data: { modifiedCount: 1 } } }));
});

test('failed release keeps selection for retry and changing filters clears it', async () => {
  axiosInstance.put.mockRejectedValueOnce({ response: { data: { message: 'Release failed.' } } });
  await mount();
  fireEvent.click(screen.getByRole('checkbox', { name: /Select Alice/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Release Selected (1)' }));
  await screen.findByRole('button', { name: 'Release Selected (1)' });
  expect(toast.error).toHaveBeenCalledWith('Release failed.');
  expect(screen.getByRole('checkbox', { name: /Select Alice/ })).toBeChecked();
  fireEvent.change(screen.getByLabelText('Search Students'), { target: { value: 'David' } });
  expect(screen.getByRole('button', { name: 'Release Selected (0)' })).toBeDisabled();
});

test('student results have no bulk release controls', async () => {
  useSelector.mockReturnValue({ userInfo: { role: 'student' } });
  results = [makeResult('c', 'Bob', 1, true)];
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider theme={createAppTheme('light')}>
        <ResultPage />
      </ThemeProvider>
    </MemoryRouter>,
  );
  await screen.findByText('My Results');
  expect(screen.queryByRole('button', { name: /Release Selected/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});
