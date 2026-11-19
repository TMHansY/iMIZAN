import PageHeading from 'src/components/shared/PageHeading';
import ContentSkeleton from 'src/components/shared/ContentSkeleton';
import React, { useEffect, useState } from 'react';
import { Grid, Card, CardContent, Typography, Button, Chip, FormControl, InputLabel, Select, MenuItem, Stack } from '@mui/material';
import { toast } from 'react-toastify';
import PageContainer from 'src/components/container/PageContainer';
import axiosInstance from '../../axios';

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSections, setSelectedSections] = useState({});

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
      await axiosInstance.post('/api/enrollments', { courseId, sectionId: selectedSections[courseId] }, { withCredentials: true });
      toast.success('Application submitted');
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to apply');
    }
  };

  const getEnrollmentStatus = (courseId) =>
    myEnrollments.find((e) => e.courseId === courseId)?.status;

  if (loading) {
    return <ContentSkeleton />;
  }

  return (
    <PageContainer title="Courses" description="Browse and apply to courses">
      <PageHeading
        title="Courses"
        description="Explore your courses and keep track of your enrollment."
      />
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
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent
                    sx={{
                      p: 3,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Typography variant="overline" color="primary" fontWeight={700}>
                      {course.courseCode}
                    </Typography>
                    <Typography variant="h5" gutterBottom>
                      {course.courseName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {course.description || 'No description provided.'}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      mb={2}
                      sx={{ mt: 'auto', pt: 2 }}
                    >
                      Lecturer: {course.lecturer?.name || 'Unassigned'}
                    </Typography>

                    {status === 'approved' ? (
                      <Chip label={`Enrolled · ${course.sections?.find((s) => s.sectionId === myEnrollments.find((e) => e.courseId === course.courseId)?.sectionId)?.name || 'Section unavailable'}`} color="success" size="small" />
                    ) : status === 'pending' ? (
                      <Chip label={`Pending · ${course.sections?.find((s) => s.sectionId === myEnrollments.find((e) => e.courseId === course.courseId)?.sectionId)?.name || 'Section unavailable'}`} color="warning" size="small" />
                    ) : status === 'rejected' ? (
                      <Chip label="Application Rejected" color="error" size="small" />
                    ) : (
                      <Stack spacing={1} sx={{ width: '100%' }}>
                        {course.sections?.length ? (
                          <FormControl size="small" fullWidth>
                            <InputLabel id={`section-${course.courseId}`}>Choose section</InputLabel>
                            <Select labelId={`section-${course.courseId}`} label="Choose section" value={selectedSections[course.courseId] || ''} onChange={(e) => setSelectedSections({ ...selectedSections, [course.courseId]: e.target.value })}>
                              {course.sections.map((section) => <MenuItem key={section.sectionId} value={section.sectionId}>{section.name} · {section.studentLimit} places</MenuItem>)}
                            </Select>
                          </FormControl>
                        ) : <Typography variant="caption" color="text.secondary">Sections are not available yet. Please check back later.</Typography>}
                        <Button size="small" variant="contained" disabled={!selectedSections[course.courseId] || !course.sections?.length} onClick={() => handleApply(course.courseId)}>Enroll in Course</Button>
                      </Stack>
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
