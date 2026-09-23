import ThemeToggle from '../../components/shared/ThemeToggle';
import { Box, Stack, Typography, Paper } from '@mui/material';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';

export default function AuthLayout({ title, description, children }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(300px, 0.85fr) 1.15fr' },
      }}
    >
      <Stack
        justifyContent="space-between"
        sx={{
          display: { xs: 'none', md: 'flex' },
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#142B20' : '#005A32'),
          color: 'white',
          p: { md: 5, lg: 8 },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <SchoolOutlinedIcon />
          <Typography variant="h3" fontWeight={700}>
            iMIZAN
          </Typography>
        </Stack>
        <Box sx={{ py: 8, maxWidth: 440 }}>
          <Typography variant="overline" sx={{ letterSpacing: '0.15em', color: '#B8D8C5' }}>
            LEARN. PREPARE. ACHIEVE.
          </Typography>
          <Typography
            variant="h1"
            sx={{ fontSize: { md: '2.5rem', lg: '3.25rem' }, lineHeight: 1.15, mt: 2, mb: 3 }}
          >
            Your next step starts here.
          </Typography>
          <Typography sx={{ color: '#D7E8DF', fontSize: '1rem', lineHeight: 1.8 }}>
            One place to manage courses, complete assessments, and keep track of your results.
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#B8D8C5' }}>
          A focused space for learning and assessment.
        </Typography>
      </Stack>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2, sm: 4, lg: 6 },
          minWidth: 0,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 520,
            p: { xs: 2.5, sm: 4 },
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography color="primary" variant="h4" fontWeight={700}>
              iMIZAN
            </Typography>
            <ThemeToggle />
          </Stack>
          <Typography component="h1" variant="h2" fontWeight={700}>
            {title}
          </Typography>
          <Typography color="text.secondary" mt={1} mb={4}>
            {description}
          </Typography>
          {children}
        </Paper>
      </Box>
    </Box>
  );
}
