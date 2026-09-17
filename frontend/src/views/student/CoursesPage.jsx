import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
} from '@mui/material';
import { toast } from 'react-toastify';
import PageContainer from 'src/components/container/PageContainer';
import axiosInstance from '../../axios';

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [coursesRes, enrollmentsRes] = await Promise.all([
        axiosInstance.get('/api/courses', { withCredentials: true }),
        axiosInstance.get('/api/enrollments/mine', { withCredentials: true }),
      ]);
      setCourses(coursesRes.data);
      setMyEnrollments(enrollmentsRes.data);
    } catch (err) {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApply = async (courseId) => {
    try {
      await axiosInstance.post('/api/enrollments', { courseId }, { withCredentials: true });
      toast.success('Application submitted');
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to apply');
    }
  };

  const getEnrollmentStatus = (courseId) =>
    myEnrollments.find((e) => e.courseId === courseId)?.status;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PageContainer title="Courses" description="Browse and apply to courses">
      <Typography variant="h4" fontWeight={700} mb={3}>
        Courses
      </Typography>
      <Grid container spacing={3}>
        {courses.length === 0 ? (
          <Grid item xs={12}>
            <Typography color="text.secondary">No courses available yet.</Typography>
          </Grid>
        ) : (
          courses.map((course) => {
            const status = getEnrollmentStatus(course.courseId);

            return (
              <Grid item xs={12} sm={6} md={4} key={course.courseId}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6">{course.courseCode}</Typography>
                    <Typography variant="body1" gutterBottom>
                      {course.courseName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {course.description || 'No description provided.'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                      Lecturer: {course.lecturer?.name || 'Unassigned'}
                    </Typography>

                    {status === 'approved' ? (
                      <Chip label="Enrolled" color="success" size="small" />
                    ) : status === 'pending' ? (
                      <Chip label="Application Pending" color="warning" size="small" />
                    ) : status === 'rejected' ? (
                      <Chip label="Application Rejected" color="error" size="small" />
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleApply(course.courseId)}
                      >
                        Apply to Join
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })
        )}
      </Grid>
    </PageContainer>
  );
};

export default CoursesPage;