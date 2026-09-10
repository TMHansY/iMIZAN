import React, { useEffect, useState } from 'react';
import {
  Grid,
  Typography,
  Box,
  Stack,
  Chip,
  Button,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Divider,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import RateReviewIcon from '@mui/icons-material/RateReview';
import QuizIcon from '@mui/icons-material/Quiz';
import EditIcon from '@mui/icons-material/Edit';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../components/shared/DashboardCard';
import axiosInstance from '../axios';
import { useGetExamsQuery } from 'src/slices/examApiSlice';

const formatTimeLeft = (deadDate) => {
  const diffMs = new Date(deadDate).getTime() - Date.now();
  if (diffMs <= 0) return 'Deadline passed';
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  if (days > 0) return `${days}d ${hours}h left`;
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
};

const Dashboard = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const { data: examsData, isLoading: examsLoading } = useGetExamsQuery();
  const isLecturer = userInfo?.role === 'lecturer';
  const isAdmin = userInfo?.role === 'admin';

  const [upcomingExams, setUpcomingExams] = useState([]);
  const [latestResult, setLatestResult] = useState(null);
  const [pendingByExam, setPendingByExam] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      const loadAdminSummary = async () => {
        try {
          const { data } = await axiosInstance.get('/api/users/pending', {
            withCredentials: true,
          });
          setPendingUsers(data);
        } catch (err) {
          console.error('Failed to load dashboard summary:', err);
        } finally {
          setLoading(false);
        }
      };
      loadAdminSummary();
      return;
    }

    if (!examsData) return;

    const loadStudentSummary = async () => {
      try {
        const { data: statusData } = await axiosInstance.get('/api/users/results/my-status', {
          withCredentials: true,
        });
        const statusByExam = {};
        statusData.data.forEach((entry) => {
          statusByExam[entry.examId] = entry;
        });

        const now = Date.now();
        const upcoming = examsData
          .filter((exam) => !statusByExam[exam.examId] && new Date(exam.deadDate).getTime() > now)
          .sort((a, b) => new Date(a.deadDate) - new Date(b.deadDate))
          .slice(0, 4);
        setUpcomingExams(upcoming);

        const { data: resultsData } = await axiosInstance.get('/api/users/results/user', {
          withCredentials: true,
        });
        setLatestResult(resultsData.data[0] || null);
      } catch (err) {
        console.error('Failed to load dashboard summary:', err);
      } finally {
        setLoading(false);
      }
    };

    const loadLecturerSummary = async () => {
      try {
        const { data: pendingData } = await axiosInstance.get('/api/users/results/pending-review', {
          withCredentials: true,
        });
        const enriched = pendingData.data
          .map((entry) => ({
            ...entry,
            examName: examsData.find((e) => e.examId === entry.examId)?.examName || 'Unknown Exam',
          }))
          .sort((a, b) => b.pendingCount - a.pendingCount);
        setPendingByExam(enriched);
      } catch (err) {
        console.error('Failed to load dashboard summary:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isLecturer) {
      loadLecturerSummary();
    } else {
      loadStudentSummary();
    }
    }, [examsData, isLecturer, isAdmin]);

  const recentExams = [...(examsData || [])]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);

  const totalPending = pendingByExam.reduce((sum, e) => sum + e.pendingCount, 0);

  if ((!isAdmin && examsLoading) || loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  // --- Admin Dashboard ---
  if (isAdmin) {
    return (
      <PageContainer title="Dashboard" description="Account approvals overview">
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <DashboardCard>
              <Stack alignItems="center" spacing={1}>
                <HowToRegIcon color="primary" fontSize="large" />
                <Typography variant="h4">{pendingUsers.length}</Typography>
                <Typography color="text.secondary">Pending Approvals</Typography>
              </Stack>
            </DashboardCard>
          </Grid>

          <Grid item xs={12} md={8}>
            <DashboardCard title="Awaiting Approval">
              {pendingUsers.length === 0 ? (
                <Typography color="text.secondary">
                  No accounts waiting — you're all caught up.
                </Typography>
              ) : (
                <List disablePadding>
                  {pendingUsers.map((user, index) => (
                    <React.Fragment key={user._id}>
                      {index > 0 && <Divider />}
                      <ListItemButton
                        onClick={() => navigate('/admin/approvals')}
                        sx={{ py: 1.5 }}
                      >
                        <ListItemIcon>
                          <HowToRegIcon color="action" />
                        </ListItemIcon>
                        <ListItemText
                          primary={`${user.name} (${user.role})`}
                          secondary={user.email}
                        />
                      </ListItemButton>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </DashboardCard>
          </Grid>
        </Grid>
      </PageContainer>
    );
  }

  // --- Student Dashboard ---
  if (!isLecturer) {
    return (
      <PageContainer title="Dashboard" description="Your exam summary">
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <DashboardCard title="Upcoming Exams" subtitle="Not yet answered, closest deadline first">
              {upcomingExams.length === 0 ? (
                <Typography color="text.secondary">
                  Nothing upcoming — you're all caught up.
                </Typography>
              ) : (
                <List disablePadding>
                  {upcomingExams.map((exam, index) => (
                    <React.Fragment key={exam.examId}>
                      {index > 0 && <Divider />}
                      <ListItemButton
                        onClick={() => navigate(`/exam/${exam.examId}`)}
                        sx={{ py: 1.5 }}
                      >
                        <ListItemIcon>
                          <EventIcon color="error" />
                        </ListItemIcon>
                        <ListItemText
                          primary={exam.examName}
                          secondary={formatTimeLeft(exam.deadDate)}
                        />
                      </ListItemButton>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </DashboardCard>
          </Grid>

          <Grid item xs={12} md={5}>
            <DashboardCard title="Latest Result">
              {latestResult ? (
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h4">{latestResult.percentage.toFixed(1)}%</Typography>
                    <Chip
                      label={latestResult.status === 'pass' ? 'Pass' : 'Fail'}
                      color={latestResult.status === 'pass' ? 'success' : 'error'}
                    />
                  </Stack>
                  <Button variant="outlined" onClick={() => navigate('/result')}>
                    View All Results
                  </Button>
                </Stack>
              ) : (
                <Typography color="text.secondary">No results available yet.</Typography>
              )}
            </DashboardCard>
          </Grid>
        </Grid>
      </PageContainer>
    );
  }

    // --- Lecturer Dashboard ---
  return (
    <PageContainer title="Dashboard" description="Your exam overview">
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Stack spacing={3}>
            <Stack direction="row" spacing={3}>
              <Box flex={1}>
                <DashboardCard>
                  <Stack alignItems="center" spacing={1}>
                    <QuizIcon color="primary" fontSize="large" />
                    <Typography variant="h4">{examsData?.length || 0}</Typography>
                    <Typography color="text.secondary">Total Exams</Typography>
                  </Stack>
                </DashboardCard>
              </Box>
              <Box flex={1}>
                <DashboardCard>
                  <Stack alignItems="center" spacing={1}>
                    <RateReviewIcon color="warning" fontSize="large" />
                    <Typography variant="h4">{totalPending}</Typography>
                    <Typography color="text.secondary">Pending Reviews</Typography>
                  </Stack>
                </DashboardCard>
              </Box>
            </Stack>

            <DashboardCard title="Recently Created Exams">
              {recentExams.length === 0 ? (
                <Typography color="text.secondary">No exams created yet.</Typography>
              ) : (
                <List disablePadding>
                  {recentExams.map((exam, index) => (
                    <React.Fragment key={exam.examId}>
                      {index > 0 && <Divider />}
                      <ListItemButton
                        onClick={() => navigate(`/edit-exam/${exam.examId}`)}
                        sx={{ py: 1.5 }}
                      >
                        <ListItemIcon>
                          <EditIcon color="action" />
                        </ListItemIcon>
                        <ListItemText
                          primary={exam.examName}
                          secondary={`${exam.totalQuestions} questions · ${exam.duration} min`}
                        />
                      </ListItemButton>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </DashboardCard>
          </Stack>
        </Grid>

        <Grid item xs={12} md={6}>
          <DashboardCard title="Needs Attention" subtitle="Exams with pending reviews">
            {pendingByExam.length === 0 ? (
              <Typography color="text.secondary">Nothing pending review.</Typography>
            ) : (
              <List disablePadding>
                {pendingByExam.map((entry, index) => (
                  <React.Fragment key={entry.examId}>
                    {index > 0 && <Divider />}
                    <ListItemButton onClick={() => navigate('/result')} sx={{ py: 1.5 }}>
                      <ListItemIcon>
                        <RateReviewIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary={entry.examName}
                        secondary={`${entry.pendingCount} submission${entry.pendingCount > 1 ? 's' : ''} awaiting review`}
                      />
                    </ListItemButton>
                  </React.Fragment>
                ))}
              </List>
            )}
          </DashboardCard>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default Dashboard;