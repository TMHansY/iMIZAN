import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ColorModeProvider } from '../../context/ColorModeContext';
import AuthLogin from './auth/AuthLogin';
import ForgotPassword from './ForgotPassword';

test('the login recovery link opens administrator instructions and returns to sign in', () => {
  const formik = {
    values: { identifier: '', password: '' },
    errors: {},
    touched: {},
    handleBlur: jest.fn(),
    handleChange: jest.fn(),
    handleSubmit: jest.fn(),
  };
  render(
    <ColorModeProvider>
      <MemoryRouter
        initialEntries={['/auth/login']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/auth/login" element={<AuthLogin formik={formik} />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </MemoryRouter>
    </ColorModeProvider>,
  );
  fireEvent.click(screen.getByRole('link', { name: 'Forgot password?' }));
  expect(screen.getByRole('heading', { name: 'Forgot your password?' })).toBeInTheDocument();
  expect(screen.getByText(/No email is sent automatically/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Back to sign in' }));
  expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
});
