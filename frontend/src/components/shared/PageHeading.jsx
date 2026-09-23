import { Box, Stack, Typography } from '@mui/material';

export default function PageHeading({ title, description, action }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', sm: 'center' }}
      gap={2}
      mb={3}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="h1"
          variant="h2"
          sx={{ fontSize: { xs: '1.65rem', sm: '1.875rem' }, fontWeight: 700 }}
        >
          {title}
        </Typography>
        {description && (
          <Typography color="text.secondary" mt={0.75}>
            {description}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  );
}
