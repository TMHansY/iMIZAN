import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { createAppTheme } from '../../theme/DefaultColors';
import axiosInstance from '../../axios';
import ResetPasswordDialog from './ResetPasswordDialog';

jest.mock('../../axios', () => ({ put: jest.fn() }));
const account = { _id: 'student-id', name: 'Test Student', email: 'student@example.test' };
const mount = (mode = 'light') => {
  const onClose = jest.fn();
  const onSuccess = jest.fn();
  render(
    <ThemeProvider theme={createAppTheme(mode)}>
      <ResetPasswordDialog account={account} onClose={onClose} onSuccess={onSuccess} />
    </ThemeProvider>,
  );
  return { onClose, onSuccess };
};
const fill = (confirmation = 'new-password') => {
  fireEvent.change(screen.getByLabelText(/^New password/), { target: { value: 'new-password' } });
  fireEvent.change(screen.getByLabelText(/^Confirm new password/), {
    target: { value: confirmation },
  });
  fireEvent.change(screen.getByLabelText(/^Your administrator password/), {
    target: { value: 'admin-password' },
  });
};
beforeEach(() => jest.clearAllMocks());

test.each(['light', 'dark'])(
  'submits the selected account and clears password fields in %s mode',
  async (mode) => {
    axiosInstance.put.mockResolvedValue({ data: { message: 'Password reset.' } });
    const { onSuccess } = mount(mode);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('Password reset.'));
    expect(axiosInstance.put).toHaveBeenCalledWith(
      '/api/users/student-id/reset-password',
      {
        password: 'new-password',
        confirmPassword: 'new-password',
        adminPassword: 'admin-password',
      },
      { withCredentials: true, timeout: 15000 },
    );
    expect(screen.getByLabelText(/^New password/)).toHaveValue('');
    expect(screen.getByLabelText(/^Your administrator password/)).toHaveValue('');
  },
);

test('mismatched passwords do not send a reset request', () => {
  mount();
  fill('different-password');
  fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
  expect(screen.getByText('The new passwords do not match.')).toBeInTheDocument();
  expect(axiosInstance.put).not.toHaveBeenCalled();
});

test('failed administrator verification keeps the form available for retry', async () => {
  axiosInstance.put.mockRejectedValue({
    response: { data: { message: 'Your administrator password is incorrect.' } },
  });
  const { onSuccess } = mount();
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
  expect(await screen.findByText('Your administrator password is incorrect.')).toBeInTheDocument();
  expect(onSuccess).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Reset password' })).toBeEnabled();
});

test('cancel does not change the account password', () => {
  const { onClose } = mount();
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(axiosInstance.put).not.toHaveBeenCalled();
});
