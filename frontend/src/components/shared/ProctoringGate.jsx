import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import useProctoringModels from '../../hooks/useProctoringModels';
import axios from '../../axios';
import { getProctoringSnapshot } from '../../utils/proctoringModels';

export default function ProctoringGate({ children }) {
  const { examId } = useParams();
  const [needsModels, setNeedsModels] = useState(null);
  const preparation = useProctoringModels(needsModels === true);
  useEffect(() => {
    let cancelled = false;
    if (getProctoringSnapshot().status === 'ready') return;
    setNeedsModels(null);
    // Finalizing an already-expired attempt must not depend on model downloads.
    axios
      .get(`/api/users/results/attempts/${examId}`, { withCredentials: true, timeout: 15000 })
      .then(({ data }) => {
        const attempt = data.data.activeAttempt;
        if (!cancelled)
          setNeedsModels(!(attempt && new Date(attempt.expiresAt).getTime() <= Date.now()));
      })
      .catch(() => {
        if (!cancelled) setNeedsModels(true);
      });
    return () => {
      cancelled = true;
    };
  }, [examId]);
  if (preparation.status === 'ready' || needsModels === false) return children;
  return (
    <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center', p: 3 }}>
      <Stack spacing={2} alignItems="center" sx={{ maxWidth: 480, textAlign: 'center' }}>
        {preparation.status === 'error' ? (
          <>
            <Alert severity="error">{preparation.message}</Alert>
            <Button variant="contained" onClick={preparation.retry}>
              Retry preparation
            </Button>
          </>
        ) : (
          <>
            <CircularProgress aria-label="Preparing camera monitoring" />
            <Typography role="status">
              {needsModels === null ? 'Checking saved attempt…' : preparation.message}
            </Typography>
          </>
        )}
        <Typography color="text.secondary">
          First-time setup can take a little longer. A new exam attempt starts after this step. If
          you are resuming an attempt, its original deadline still applies.
        </Typography>
        <Button component={Link} to="/exam">
          Back to exams
        </Button>
      </Stack>
    </Box>
  );
}
