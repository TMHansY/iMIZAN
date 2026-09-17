import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  Button,
  Stack,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
} from '@mui/material';
import { toast } from 'react-toastify';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import axiosInstance from '../../axios';

const CourseEnrollments = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = async () => {
    try {
      const { data } = await axiosInstance.get('/api/courses/mine', {
        withCredentials: true,
      });
      setCourses(data);
      if (data.length > 0) {
        setSelectedCourseId(data[0].courseId);
      } else {
        setLoading(false);
      }
    } catch (err) {
      toast.error('Failed to load your courses');
      setLoading(false);
    }
  };

  const fetchEnrollments = async (courseId) => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get(`/api/enrollments/course/${courseId}`, {
        withCredentials: true,
      });
      setEnrollments(data);
    } catch (err) {
      toast.error('Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchEnrollments(selectedCourseId);
    }
  }, [selectedCourseId]);

  const handleApprove = async (id) => {
    try {
      await axiosInstance.put(`/api/enrollments/${id}/approve`, {}, { withCredentials: true });
      toast.success('Student approved');
      fetchEnrollments(selectedCourseId);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (id) => {
    try {
      await axiosInstance.put(`/api/enrollments/${id}/reject`, {}, { withCredentials: true });
      toast.success('Application rejected');
      fetchEnrollments(selectedCourseId);
    } catch (err) {
      toast.error('Failed to reject');
    }
  };

  const selectedCourse = courses.find((c) => c.courseId === selectedCourseId);
  const pending = enrollments.filter((e) => e.status === 'pending');
  const approved = enrollments.filter((e) => e.status === 'approved');
  const atLimit = selectedCourse && approved.length >= selectedCourse.studentLimit;

  if (courses.length === 0 && !loading) {
    return (
      <PageContainer title="Course Enrollments" description="Manage student applications">
        <Typography color="text.secondary">
          You have no courses assigned yet. Contact an admin to be assigned a course.
        </Typography>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Course Enrollments" description="Manage student applications">
      <Box mb={3}>
        <FormControl sx={{ minWidth: 250 }}>
          <InputLabel>Select Course</InputLabel>
          <Select
            value={selectedCourseId}
            label="Select Course"
            onChange={(e) => setSelectedCourseId(e.target.value)}
          >
            {courses.map((course) => (
              <MenuItem key={course.courseId} value={course.courseId}>
                {course.courseCode} — {course.courseName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={3}>
          {selectedCourse && (
            <DashboardCard>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Enrolled: {approved.length} / {selectedCourse.studentLimit}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min((approved.length / selectedCourse.studentLimit) * 100, 100)}
                color={atLimit ? 'error' : 'primary'}
              />
              {atLimit && (
                <Typography variant="caption" color="error" display="block" mt={1}>
                  This course is at its student limit. New approvals are blocked until the limit
                  is increased or a student is removed.
                </Typography>
              )}
            </DashboardCard>
          )}

          <DashboardCard title="Pending Applications">
            {pending.length === 0 ? (
              <Typography color="text.secondary">No pending applications.</Typography>
            ) : (
              <List disablePadding>
                {pending.map((enrollment, index) => (
                  <React.Fragment key={enrollment._id}>
                    {index > 0 && <Divider />}
                    <ListItem
                      sx={{ py: 1.5 }}
                      secondaryAction={
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            disabled={atLimit}
                            onClick={() => handleApprove(enrollment._id)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleReject(enrollment._id)}
                          >
                            Reject
                          </Button>
                        </Stack>
                      }
                    >
                      <ListItemText
                        primary={enrollment.student?.name}
                        secondary={`${enrollment.student?.email} · ${enrollment.student?.idNumber || 'No ID on file'}`}
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </DashboardCard>

          <DashboardCard title="Current Roster">
            {approved.length === 0 ? (
              <Typography color="text.secondary">No students enrolled yet.</Typography>
            ) : (
              <List disablePadding>
                {approved.map((enrollment, index) => (
                  <React.Fragment key={enrollment._id}>
                    {index > 0 && <Divider />}
                    <ListItem sx={{ py: 1 }}>
                      <ListItemText
                        primary={enrollment.student?.name}
                        secondary={enrollment.student?.email}
                      />
                      <Chip label="Enrolled" color="success" size="small" />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </DashboardCard>
        </Stack>
      )}
    </PageContainer>
  );
};

export default CourseEnrollments;