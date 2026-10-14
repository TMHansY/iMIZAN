import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { createAppTheme } from '../../theme/DefaultColors';
import { useGetExamsQuery, useUpdateExamMutation } from '../../slices/examApiSlice';
import axiosInstance from '../../axios';
import EditExamPage from './EditExamPage';

jest.mock('../../slices/examApiSlice', () => ({
  useGetExamsQuery: jest.fn(),
  useUpdateExamMutation: jest.fn(),
}));
jest.mock('../../axios', () => ({ get: jest.fn() }));
jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const settingLabels = {
  allowReview: 'Allow students to review their answers after the exam',
  allowBackNavigation: 'Allow students to move back and forth between questions',
  randomizeQuestions: 'Randomize question order',
  randomizeOptions: 'Randomize answer option order',
};
let savedExam;
let updateExam;

beforeEach(() => {
  jest.clearAllMocks();
  savedExam = {
    examId: 'exam-one',
    examName: 'Example exam',
    courseId: 'course-one',
    totalQuestions: 10,
    duration: 30,
    maxAttempts: 2,
    liveDate: '2026-10-14T08:00:00Z',
    deadDate: '2026-10-15T08:00:00Z',
  };
  axiosInstance.get.mockResolvedValue({
    data: [{ courseId: 'course-one', courseCode: 'ONE', courseName: 'Example course' }],
  });
  useGetExamsQuery.mockImplementation(() => ({ data: [savedExam], isLoading: false }));
  updateExam = jest.fn((values) => ({
    unwrap: async () => {
      savedExam = { ...savedExam, ...values };
      return savedExam;
    },
  }));
  useUpdateExamMutation.mockReturnValue([updateExam]);
});

function mount() {
  return render(
    <MemoryRouter
      initialEntries={['/edit-exam/exam-one']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ThemeProvider theme={createAppTheme('light')}>
        <Routes>
          <Route path="/edit-exam/:examId" element={<EditExamPage />} />
          <Route path="/exam" element={<div>Exam list</div>} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

test.each([
  {
    allowReview: true,
    allowBackNavigation: true,
    randomizeQuestions: true,
    randomizeOptions: true,
  },
  {
    allowReview: false,
    allowBackNavigation: true,
    randomizeQuestions: false,
    randomizeOptions: true,
  },
  {},
])(
  'loads and preserves saved checkbox configuration %j when editing other details',
  async (settings) => {
    Object.assign(savedExam, settings);
    mount();
    await waitFor(() => expect(axiosInstance.get).toHaveBeenCalled());
    for (const [key, label] of Object.entries(settingLabels)) {
      expect(screen.getByRole('checkbox', { name: label }).checked).toBe(settings[key] ?? false);
    }
    fireEvent.change(screen.getByLabelText('Exam Name'), { target: { value: 'Updated name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Exam' }));
    await screen.findByText('Exam list');
    const expectedSettings = Object.fromEntries(
      Object.keys(settingLabels).map((key) => [key, settings[key] ?? false]),
    );
    expect(updateExam).toHaveBeenCalledWith(
      expect.objectContaining({ examName: 'Updated name', ...expectedSettings }),
    );
  },
);

test('changing checked and unchecked settings sends explicit booleans and restores them on reopening', async () => {
  Object.assign(savedExam, {
    allowReview: true,
    allowBackNavigation: false,
    randomizeQuestions: true,
    randomizeOptions: false,
  });
  const { unmount } = mount();
  await waitFor(() => expect(axiosInstance.get).toHaveBeenCalled());
  for (const label of Object.values(settingLabels)) {
    fireEvent.click(screen.getByRole('checkbox', { name: label }));
  }
  fireEvent.click(screen.getByRole('button', { name: 'Update Exam' }));
  await screen.findByText('Exam list');
  const expected = {
    allowReview: false,
    allowBackNavigation: true,
    randomizeQuestions: false,
    randomizeOptions: true,
  };
  expect(updateExam).toHaveBeenCalledWith(expect.objectContaining(expected));
  unmount();
  mount();
  for (const [key, label] of Object.entries(settingLabels)) {
    expect(screen.getByRole('checkbox', { name: label }).checked).toBe(expected[key]);
  }
  await waitFor(() => expect(axiosInstance.get).toHaveBeenCalledTimes(2));
});
