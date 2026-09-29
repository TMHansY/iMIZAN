import React, { useRef, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import axiosInstance from '../../axios';

export default function ResetPasswordDialog({ account, onClose, onSuccess }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    if (password.length < 6 || new Blob([password]).size > 72) {
      setError('Use at least 6 characters and no more than 72 UTF-8 bytes for the new password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    pending.current = true;
    setSaving(true);
    setError('');
    try {
      const { data } = await axiosInstance.put(
        `/api/users/${account._id}/reset-password`,
        { password, confirmPassword, adminPassword },
        { withCredentials: true, timeout: 15000 },
      );
      setPassword('');
      setConfirmPassword('');
      setAdminPassword('');
      onSuccess(data.message);
    } catch (failure) {
      setError(
        failure?.response?.data?.message ||
          'Unable to confirm the reset. Please check your connection and try again.',
      );
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      fullWidth
      maxWidth="sm"
      onClose={saving ? undefined : onClose}
      aria-labelledby="reset-password-title"
      aria-describedby="reset-password-description"
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle id="reset-password-title">Reset password</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <DialogContentText id="reset-password-description" sx={{ overflowWrap: 'anywhere' }}>
              Reset the password for {account.name} ({account.email}). Verify the user’s identity
              before continuing, then share the new password privately.
            </DialogContentText>
            <Alert severity="info">
              Existing sessions will lose access. Avoid resetting during an active exam. The user’s
              role and approval status stay the same.
            </Alert>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="New password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              fullWidth
              disabled={saving}
              helperText="At least 6 characters; ask the user to change it after signing in."
            />
            <TextField
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              fullWidth
              disabled={saving}
            />
            <TextField
              label="Your administrator password"
              type="password"
              autoComplete="current-password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              required
              fullWidth
              disabled={saving}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Resetting…' : 'Reset password'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
