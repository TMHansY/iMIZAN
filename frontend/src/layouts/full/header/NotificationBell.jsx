import React, { useEffect, useState } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  ListItemText,
} from '@mui/material';
import { IconBellRinging } from '@tabler/icons-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../axios';
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

const NotificationBell = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const { data: examsData } = useGetExamsQuery();

  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const isLecturer = userInfo?.role === 'lecturer';

  useEffect(() => {
    if (!examsData) return;

    const fetchNotifications = async () => {
      try {
        if (isLecturer) {
          const { data } = await axiosInstance.get('/api/users/results/pending-review', {
            withCredentials: true,
          });
          const items = data.data
            .map((entry) => {
              const exam = examsData.find((e) => e.examId === entry.examId);
              return {
                key: `pending-${entry.examId}`,
                text: `${entry.pendingCount} submission${entry.pendingCount > 1 ? 's' : ''} awaiting review — ${exam?.examName || 'Unknown Exam'}`,
                onClick: () => navigate('/result'),
              };
            })
            .filter((item) => item !== null);
          setNotifications(items);
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
                text: `${exam.examName} — not yet answered (${formatTimeLeft(exam.deadDate)})`,
                onClick: () => navigate(`/exam/${exam.examId}`),
              });
            } else if (status && !status.latestShowToStudent) {
              items.push({
                key: `pending-visible-${exam.examId}`,
                text: `${exam.examName} — result not yet released`,
                onClick: () => navigate('/result'),
              });
            }
          });

          setNotifications(items);
        }
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    };

    fetchNotifications();
  }, [examsData, isLecturer, navigate]);

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleItemClick = (item) => {
    item.onClick();
    handleClose();
  };

  return (
    <>
      <IconButton
        size="large"
        aria-label={`show ${notifications.length} new notifications`}
        color="inherit"
        aria-controls="notifications-menu"
        aria-haspopup="true"
        onClick={handleOpen}
      >
        <Badge variant="dot" color="primary" invisible={notifications.length === 0}>
          <IconBellRinging size="21" stroke="1.5" />
        </Badge>
      </IconButton>
      <Menu
        id="notifications-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{ sx: { width: 360, maxHeight: 400 } }}
      >
        <Box px={2} py={1}>
          <Typography variant="subtitle1" fontWeight={600}>
            Notifications
          </Typography>
        </Box>
        <Divider />
        {notifications.length === 0 ? (
          <MenuItem disabled>
            <ListItemText primary="You're all caught up" />
          </MenuItem>
        ) : (
          notifications.map((item) => (
            <MenuItem key={item.key} onClick={() => handleItemClick(item)}>
              <ListItemText primary={item.text} primaryTypographyProps={{ variant: 'body2' }} />
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
};

export default NotificationBell;
