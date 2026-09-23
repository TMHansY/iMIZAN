import React, { useEffect } from 'react';
import { Box, Container, Typography, Button, Card, Stack } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { Link, useNavigate } from 'react-router-dom';

const Success = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const redirect = setTimeout(() => navigate('/'), 5000);
    return () => clearTimeout(redirect);
  }, [navigate]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', py: 4 }}>
      <Container maxWidth="sm">
        <Card sx={{ p: { xs: 3, sm: 5 }, textAlign: 'center' }}>
          <Stack alignItems="center" spacing={2.5} role="status">
            <Box
              sx={{
                width: 72,
                height: 72,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                bgcolor: 'primary.light',
                color: 'primary.main',
              }}
            >
              <CheckRoundedIcon sx={{ fontSize: 40 }} />
            </Box>
            <Typography component="h1" variant="h2">
              Exam submitted successfully
            </Typography>
            <Typography color="text.secondary">
              Your responses have been submitted. You can safely close this window.
            </Typography>
            <Button variant="contained" component={Link} to="/" fullWidth>
              Return to dashboard
            </Button>
            <Typography variant="body2" color="text.secondary">
              You’ll return to the dashboard automatically in 5 seconds.
            </Typography>
          </Stack>
        </Card>
      </Container>
    </Box>
  );
};
export default Success;
