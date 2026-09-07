import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Divider,
} from '@mui/material';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import PageContainer from 'src/components/container/PageContainer';
import axiosInstance from '../../axios';
import { useGetExamsQuery } from 'src/slices/examApiSlice';

const formatTimeLeft = (deadDate) => {
  const diffMs = new Date(deadDate).getTime() - Date.now();
  if (diffMs <= 0) return 'Deadline passed';

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
};

const MyTasksPage = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const { data: examsData } = useGetExamsQuery();
  const isLecturer = userInfo?.role === 'lecturer';

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!examsData) return;

    const fetchTasks = async () => {
      try {
        setLoading(true);
        if (isLecturer) {
          const { data } = await axiosInstance.get('/api/users/results/pending-review', {
            withCredentials: true,
          });
          const items = data.data.map((entry) => {
            const exam = examsData.find((e) => e.examId === entry.examId);
            return {
              key: `pending-${entry.examId}`,
              icon: <RateReviewIcon color="warning" />,
              text: `${entry.pendingCount} submission${entry.pendingCount > 1 ? 's' : ''} awaiting review`,
              subtext: exam?.examName || 'Unknown Exam',
              onClick: () => navigate('/result'),
            };
          });
          setTasks(items);
        } else {
          const { data } = await axiosInstance.get('/api/users/results/my-status', {
            withCredentials: true,
          });
          const statusByExam = {};
          data.data.forEach((entry) => {
            statusByExam[entry.examId] = entry;
          });

          const items = [];
          const now = Date.now();

          examsData.forEach((exam) => {
            const status = statusByExam[exam.examId];
            const isPastDeadline = new Date(exam.deadDate).getTime() < now;

            if (!status && !isPastDeadline) {
              items.push({
                key: `unanswered-${exam.examId}`,
                icon: <AssignmentLateIcon color="error" />,
                text: exam.examName,
                subtext: `Not yet answered — ${formatTimeLeft(exam.deadDate)}`,
                onClick: () => navigate(`/exam/${exam.examId}`),
              });
            } else if (status && !status.latestShowToStudent) {
              items.push({
                key: `pending-visible-${exam.examId}`,
                icon: <VisibilityOffIcon color="action" />,
                text: exam.examName,
                subtext: 'Result not yet released by lecturer',
                onClick: () => navigate('/result'),
              });
            }
          });

          setTasks(items);
        }
      } catch (err) {
        console.error('Failed to load tasks:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [examsData, isLecturer, navigate]);

  return (
    <PageContainer title="My Tasks" description="Things that need your attention">
      <Box maxWidth={700} mx="auto" py={4} px={2}>
        <Typography variant="h4" fontWeight={700} mb={3}>
          My Tasks
        </Typography>

        <Card variant="outlined">
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : tasks.length === 0 ? (
            <CardContent>
              <Typography color="text.secondary">
                You're all caught up — nothing needs your attention right now.
              </Typography>
            </CardContent>
          ) : (
            <List disablePadding>
              {tasks.map((task, index) => (
                <React.Fragment key={task.key}>
                  {index > 0 && <Divider />}
                  <ListItemButton onClick={task.onClick} sx={{ py: 1.5 }}>
                    <ListItemIcon>{task.icon}</ListItemIcon>
                    <ListItemText primary={task.text} secondary={task.subtext} />
                  </ListItemButton>
                </React.Fragment>
              ))}
            </List>
          )}
        </Card>
      </Box>
    </PageContainer>
  );
};

export default MyTasksPage;
