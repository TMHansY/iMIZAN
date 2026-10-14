import React, { useEffect, useRef, useState } from 'react';
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
  Checkbox,
  FormControlLabel,
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
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const actionPending = useRef(false);
  const enrollmentRequest = useRef(0);

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
    const request = ++enrollmentRequest.current;
    try {
      setLoading(true);
      const { data } = await axiosInstance.get(`/api/enrollments/course/${courseId}`, {
        withCredentials: true,
      });
      if (request !== enrollmentRequest.current) return;
      setEnrollments(data);
      setSelectedIds((ids) =>
        ids.filter((id) =>
          data.some((enrollment) => enrollment._id === id && enrollment.status === 'pending'),
        ),
      );
    } catch (err) {
      if (request !== enrollmentRequest.current) return;
      setEnrollments([]);
      setSelectedIds([]);
      toast.error('Failed to load enrollments');
    } finally {
      if (request === enrollmentRequest.current) setLoading(false);
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

  const handleDecision = async (id, decision) => {
    if (actionPending.current) return;
    actionPending.current = true;
    setSaving(true);
    try {
      await axiosInstance.put(`/api/enrollments/${id}/${decision}`, {}, { withCredentials: true });
      toast.success(decision === 'approve' ? 'Student approved' : 'Application rejected');
    } catch (err) {
      toast.error(err?.response?.data?.message || `Failed to ${decision}`);
    } finally {
      await fetchEnrollments(selectedCourseId);
      actionPending.current = false;
      setSaving(false);
    }
  };

  const handleBulkApprove = async () => {
    if (actionPending.current || selectedIds.length === 0 || selectedIds.length > remainingPlaces)
      return;
    actionPending.current = true;
    setSaving(true);
    let approvedCount = 0;
    try {
      // Reuse the server's ownership and capacity checks, one approval at a time.
      for (const id of selectedIds) {
        await axiosInstance.put(`/api/enrollments/${id}/approve`, {}, { withCredentials: true });
        approvedCount += 1;
      }
      toast.success(`${approvedCount} student${approvedCount === 1 ? '' : 's'} approved`);
    } catch (err) {
      toast.error(
        `${approvedCount} of ${selectedIds.length} students approved. ${
          err?.response?.data?.message ||
          'Approval stopped. Check the refreshed list before retrying.'
        }`,
      );
    } finally {
      await fetchEnrollments(selectedCourseId);
      actionPending.current = false;
      setSaving(false);
    }
  };

  const selectedCourse = courses.find((c) => c.courseId === selectedCourseId);
  const pending = enrollments.filter((e) => e.status === 'pending');
  const approved = enrollments.filter((e) => e.status === 'approved');
  const atLimit = selectedCourse && approved.length >= selectedCourse.studentLimit;
  const remainingPlaces = selectedCourse
    ? Math.max(0, selectedCourse.studentLimit - approved.length)
    : 0;

  const toggleSelected = (id) => {
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((selected) => selected !== id) : [...ids, id],
    );
  };

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
        <FormControl sx={{ minWidth: 250, maxWidth: '100%' }} disabled={saving}>
          <InputLabel id="enrollment-course-label">Select Course</InputLabel>
          <Select
            labelId="enrollment-course-label"
            value={selectedCourseId}
            label="Select Course"
            onChange={(e) => {
              enrollmentRequest.current += 1;
              setSelectedIds([]);
              setEnrollments([]);
              setLoading(true);
              setSelectedCourseId(e.target.value);
            }}
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
                  This course is at its student limit. New approvals are blocked until the limit is
                  increased or a student is removed.
                </Typography>
              )}
            </DashboardCard>
          )}

          <DashboardCard title="Pending Applications">
            {pending.length === 0 ? (
              <Typography color="text.secondary">No pending applications.</Typography>
            ) : (
              <>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  justifyContent="space-between"
                  spacing={1}
                  mb={1}
                >
                  <FormControlLabel
                    label="Select all"
                    control={
                      <Checkbox
                        checked={selectedIds.length === pending.length}
                        indeterminate={
                          selectedIds.length > 0 && selectedIds.length < pending.length
                        }
                        disabled={saving}
                        onChange={() =>
                          setSelectedIds((ids) =>
                            ids.length === pending.length
                              ? []
                              : pending.map((enrollment) => enrollment._id),
                          )
                        }
                      />
                    }
                  />
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    disabled={
                      saving || selectedIds.length === 0 || selectedIds.length > remainingPlaces
                    }
                    onClick={handleBulkApprove}
                  >
                    {saving ? 'Processing…' : `Approve Selected (${selectedIds.length})`}
                  </Button>
                </Stack>
                {selectedIds.length > remainingPlaces && (
                  <Typography variant="body2" color="error" mb={1} role="status">
                    Only {remainingPlaces} place{remainingPlaces === 1 ? '' : 's'} available. Select
                    fewer students or ask an admin to increase the course limit.
                  </Typography>
                )}
                <List disablePadding>
                  {pending.map((enrollment, index) => (
                    <React.Fragment key={enrollment._id}>
                      {index > 0 && <Divider />}
                      <ListItem sx={{ py: 1.5, px: 0, gap: 1, flexWrap: 'wrap' }}>
                        <Checkbox
                          checked={selectedIds.includes(enrollment._id)}
                          disabled={saving}
                          onChange={() => toggleSelected(enrollment._id)}
                          inputProps={{
                            'aria-label': `Select ${enrollment.student?.name || 'student'} (${
                              enrollment.student?.email || enrollment._id
                            })`,
                          }}
                        />
                        <ListItemText
                          sx={{ flex: '1 1 180px', overflowWrap: 'anywhere' }}
                          primary={enrollment.student?.name}
                          secondary={`${enrollment.student?.email} · ${
                            enrollment.student?.idNumber || 'No ID on file'
                          }`}
                        />
                        <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            disabled={saving || atLimit}
                            onClick={() => handleDecision(enrollment._id, 'approve')}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            disabled={saving}
                            onClick={() => handleDecision(enrollment._id, 'reject')}
                          >
                            Reject
                          </Button>
                        </Stack>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </>
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
