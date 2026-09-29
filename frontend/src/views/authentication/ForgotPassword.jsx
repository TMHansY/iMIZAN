import React from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Stack, Typography } from '@mui/material';
import PageContainer from '../../components/container/PageContainer';
import AuthLayout from './AuthLayout';

export default function ForgotPassword() {
  return (
    <PageContainer title="Password help" description="Get help accessing your iMIZAN account">
      <AuthLayout
        title="Forgot your password?"
        description="Your administrator can help you regain access."
      >
        <Stack spacing={3}>
          <Typography color="text.secondary">
            Contact your institution’s iMIZAN administrator through your usual support channel.
            Provide your name and student or staff ID so they can verify your identity and reset
            your password.
          </Typography>
          <Alert severity="info">
            Password resets are handled by an administrator. No email is sent automatically. After
            receiving your new password privately, sign in and change it in your account settings.
          </Alert>
          <Button component={Link} to="/auth/login" variant="contained" size="large" fullWidth>
            Back to sign in
          </Button>
        </Stack>
      </AuthLayout>
    </PageContainer>
  );
}
