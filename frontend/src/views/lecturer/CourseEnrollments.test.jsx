import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { toast } from 'react-toastify';
import { createAppTheme } from '../../theme/DefaultColors';
import axiosInstance from '../../axios';
import CourseEnrollments from './CourseEnrollments';

jest.mock('../../axios', () => ({ get: jest.fn(), put: jest.fn() }));
jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

let courses;
let enrollments;
const student = (id, name, status = 'pending') => ({
  _id: id,
  status,
  student: { name, email: `${name}@example.test`, idNumber: id },
});

beforeEach(() => {
  jest.clearAllMocks();
  courses = [
    { courseId: 'one', courseCode: 'ONE', courseName: 'First course', studentLimit: 5 },
    { courseId: 'two', courseCode: 'TWO', courseName: 'Second course', studentLimit: 5 },
  ];
  enrollments = {
    one: [student('a', 'Alice'), student('b', 'Bob'), student('c', 'Carol', 'approved')],
    two: [student('d', 'David')],
  };
  axiosInstance.get.mockImplementation(async (url) => ({
    data: url === '/api/courses/mine' ? courses : enrollments[url.split('/').pop()],
  }));
  axiosInstance.put.mockImplementation(async (url) => {
    const [, , , id, decision] = url.split('/');
    Object.keys(enrollments).forEach((courseId) => {
      enrollments[courseId] = enrollments[courseId].map((item) =>
        item._id === id
          ? { ...item, status: decision === 'approve' ? 'approved' : 'rejected' }
          : item,
      );
    });
    return { data: {} };
  });
});

const mount = async () => {
  render(
    <ThemeProvider theme={createAppTheme('light')}>
      <CourseEnrollments />
    </ThemeProvider>,
  );
  await screen.findByRole('checkbox', { name: /Select Alice/ });
};

test('approves only selected pending students sequentially and prevents duplicate actions', async () => {
  await mount();
  const approve = axiosInstance.put.getMockImplementation();
  let finishFirst;
  axiosInstance.put.mockImplementationOnce(
    (url) =>
      new Promise((resolve) => {
        finishFirst = async () => resolve(await approve(url));
      }),
  );
  fireEvent.click(screen.getByRole('checkbox', { name: /Select Alice/ }));
  expect(screen.getByRole('checkbox', { name: 'Select all' })).toHaveAttribute(
    'data-indeterminate',
    'true',
  );
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }));
  fireEvent.click(screen.getByRole('button', { name: 'Approve Selected (2)' }));
  expect(axiosInstance.put).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Processing…' })).toBeDisabled();
  expect(screen.getByRole('checkbox', { name: 'Select all' })).toBeDisabled();
  expect(screen.getAllByRole('button', { name: 'Approve' })[0]).toBeDisabled();
  expect(screen.getByRole('button', { name: /Select Course/ })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await act(async () => finishFirst());
  await screen.findByText('No pending applications.');
  expect(axiosInstance.put.mock.calls).toEqual([
    ['/api/enrollments/a/approve', {}, { withCredentials: true }],
    ['/api/enrollments/b/approve', {}, { withCredentials: true }],
  ]);
  expect(screen.getByText('Enrolled: 3 / 5')).toBeInTheDocument();
});

test('blocks selections above remaining course capacity and allows a smaller selection', async () => {
  courses[0].studentLimit = 2;
  await mount();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }));
  expect(screen.getByRole('button', { name: 'Approve Selected (2)' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Only 1 place available.');
  expect(axiosInstance.put).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('checkbox', { name: /Select Bob/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Approve Selected (1)' }));
  expect(await screen.findByText('Enrolled: 2 / 2')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
});

test('clears selection on course changes and ignores a late response from a previous course', async () => {
  await mount();
  fireEvent.click(screen.getByRole('checkbox', { name: /Select Alice/ }));
  let finishSecond;
  axiosInstance.get.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishSecond = resolve;
      }),
  );
  fireEvent.mouseDown(screen.getByRole('button', { name: /Select Course/ }));
  fireEvent.click(screen.getByRole('option', { name: /Second course/ }));
  await waitFor(() =>
    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/api/enrollments/course/two',
      expect.anything(),
    ),
  );
  fireEvent.mouseDown(screen.getByRole('button', { name: /Select Course/ }));
  fireEvent.click(screen.getByRole('option', { name: /First course/ }));
  await screen.findByRole('checkbox', { name: /Select Alice/ });
  await act(async () => finishSecond({ data: enrollments.two }));
  expect(screen.getByRole('checkbox', { name: /Select Alice/ })).not.toBeChecked();
  expect(screen.queryByRole('checkbox', { name: /Select David/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Approve Selected (0)' })).toBeDisabled();
});

test('reports partial success and retains only pending selections for retry', async () => {
  const approve = axiosInstance.put.getMockImplementation();
  axiosInstance.put.mockImplementationOnce(approve).mockRejectedValueOnce({
    response: { data: { message: 'Course capacity changed.' } },
  });
  await mount();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }));
  fireEvent.click(screen.getByRole('button', { name: 'Approve Selected (2)' }));
  await screen.findByRole('button', { name: 'Approve Selected (1)' });
  expect(toast.error).toHaveBeenCalledWith('1 of 2 students approved. Course capacity changed.');
  expect(screen.queryByRole('checkbox', { name: /Select Alice/ })).not.toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: /Select Bob/ })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Approve Selected (1)' }));
  await screen.findByText('No pending applications.');
  expect(axiosInstance.put.mock.calls[2][0]).toBe('/api/enrollments/b/approve');
});

test('individual rejection removes that student from the bulk selection', async () => {
  await mount();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }));
  fireEvent.click(screen.getAllByRole('button', { name: 'Reject' })[0]);
  await screen.findByRole('button', { name: 'Approve Selected (1)' });
  expect(axiosInstance.put).toHaveBeenCalledWith(
    '/api/enrollments/a/reject',
    {},
    { withCredentials: true },
  );
  expect(screen.queryByRole('checkbox', { name: /Select Alice/ })).not.toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: /Select Bob/ })).toBeChecked();
});
