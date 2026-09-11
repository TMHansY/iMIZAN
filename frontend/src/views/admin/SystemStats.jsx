import React, { useEffect, useState } from 'react';
import { Box, Grid, Typography, Stack, CircularProgress } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import QuizIcon from '@mui/icons-material/Quiz';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import { toast } from 'react-toastify';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import axiosInstance from '../../axios';

const StatCard = ({ icon, value, label }) => (
  <DashboardCard>
    <Stack alignItems="center" spacing={1}>
      {icon}
      <Typography variant="h4">{value}</Typography>
      <Typography color="text.secondary">{label}</Typography>
    </Stack>
  </DashboardCard>
);

const SystemStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await axiosInstance.get('/api/users/admin/stats', {
          withCredentials: true,
        });
        setStats(data);
      } catch (err) {
        toast.error('Failed to load stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PageContainer title="System Stats" description="Platform-wide overview">
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<SchoolIcon color="primary" fontSize="large" />}
            value={stats.totalStudents}
            label="Students"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<PeopleIcon color="secondary" fontSize="large" />}
            value={stats.totalLecturers}
            label="Lecturers"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<HowToRegIcon color="warning" fontSize="large" />}
            value={stats.pendingCount}
            label="Pending Approvals"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<QuizIcon color="info" fontSize="large" />}
            value={stats.totalExams}
            label="Total Exams"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<AssignmentTurnedInIcon color="success" fontSize="large" />}
            value={stats.totalResults}
            label="Total Submissions"
          />
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default SystemStats;