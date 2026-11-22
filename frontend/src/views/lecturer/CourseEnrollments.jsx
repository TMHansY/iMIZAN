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
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { toast } from 'react-toastify';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import axiosInstance from '../../axios';

const CourseEnrollments = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [enrollments, setEnrollments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedRosterIds, setSelectedRosterIds] = useState([]);
  const [bulkSectionId, setBulkSectionId] = useState('');
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
      setSelectedRosterIds((ids) => ids.filter((id) => data.some((item) => item._id === id && item.status === 'approved')));
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

  const handleSectionChange = async (enrollmentId, sectionId) => {
    if (actionPending.current) return;
    actionPending.current = true;
    setSaving(true);
    try {
      await axiosInstance.put(`/api/enrollments/${enrollmentId}/section`, { sectionId }, { withCredentials: true });
      toast.success('Student section updated');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update student section');
    } finally {
      await fetchEnrollments(selectedCourseId);
      actionPending.current = false;
      setSaving(false);
    }
  };

  const handleBulkSectionChange = async () => {
    if (actionPending.current || !selectedCourseId || !bulkSectionId || selectedRosterIds.length === 0) return;
    actionPending.current = true;
    setSaving(true);
    try {
      const { data } = await axiosInstance.put(
        `/api/enrollments/course/${selectedCourseId}/section`,
        { sectionId: bulkSectionId, enrollmentIds: selectedRosterIds },
        { withCredentials: true },
      );
      toast.success(`${data.updatedCount} student${data.updatedCount === 1 ? '' : 's'} assigned to the section`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to assign the selected students');
    } finally {
      await fetchEnrollments(selectedCourseId);
      setSelectedRosterIds([]);
      actionPending.current = false;
      setSaving(false);
    }
  };

  const handleBulkApprove = async () => {
    if (actionPending.current || selectedIds.length === 0 || !canBulkApprove) return;
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
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const matchesSearch = (enrollment) =>
    !normalizedSearch ||
    [enrollment.student?.name, enrollment.student?.email, enrollment.student?.idNumber].some(
      (value) => value?.toLowerCase().includes(normalizedSearch),
    );
  const visiblePending = pending.filter(matchesSearch);
  const visibleApproved = approved.filter(matchesSearch);
  const sectionCounts = (sectionId) => approved.filter((item) => item.sectionId === sectionId).length;
  const canApprove = (enrollment) => {
    const section = selectedCourse?.sections?.find((item) => item.sectionId === enrollment.sectionId);
    return section && sectionCounts(section.sectionId) < section.studentLimit;
  };
  const canBulkApprove = (() => {
    const selected = selectedIds.map((id) => pending.find((item) => item._id === id));
    if (selected.some((item) => !item)) return false;
    const counts = {};
    selected.forEach((item) => { counts[item.sectionId] = (counts[item.sectionId] || 0) + 1; });
    return Object.entries(counts).every(([sectionId, count]) => {
      const section = selectedCourse?.sections?.find((item) => item.sectionId === sectionId);
      return section && sectionCounts(sectionId) + count <= section.studentLimit;
    });
  })();

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
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormControl sx={{ minWidth: 250, maxWidth: '100%' }} disabled={saving}>
          <InputLabel id="enrollment-course-label">Select Course</InputLabel>
          <Select
            labelId="enrollment-course-label"
            value={selectedCourseId}
            label="Select Course"
            onChange={(e) => {
              enrollmentRequest.current += 1;
              setSelectedIds([]);
              setSelectedRosterIds([]);
              setBulkSectionId('');
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
          <TextField
            label="Search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            sx={{ minWidth: 280, maxWidth: '100%' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={3}>
          {selectedCourse && (
            <DashboardCard>
              <Stack spacing={1}>{(selectedCourse.sections || []).map((section) => <Box key={section.sectionId}>
                <Typography variant="body2" color="text.secondary" mb={0.5}>{section.name}: {sectionCounts(section.sectionId)} / {section.studentLimit} enrolled</Typography>
                <LinearProgress variant="determinate" value={Math.min((sectionCounts(section.sectionId) / section.studentLimit) * 100, 100)} color={sectionCounts(section.sectionId) >= section.studentLimit ? 'error' : 'primary'} />
              </Box>)}</Stack>
              {(selectedCourse.sections || []).length === 0 && <Typography color="text.secondary">An admin needs to create sections before students can enroll.</Typography>}
            </DashboardCard>
          )}

          <DashboardCard title="Pending Applications">
            {visiblePending.length === 0 ? (
              <Typography color="text.secondary">{pending.length ? 'No pending applications match your search.' : 'No pending applications.'}</Typography>
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
                        checked={visiblePending.length > 0 && visiblePending.every((item) => selectedIds.includes(item._id))}
                        indeterminate={
                          visiblePending.some((item) => selectedIds.includes(item._id)) && !visiblePending.every((item) => selectedIds.includes(item._id))
                        }
                        disabled={saving}
                        onChange={() =>
                          setSelectedIds((ids) =>
                            visiblePending.every((item) => ids.includes(item._id))
                              ? ids.filter((id) => !visiblePending.some((item) => item._id === id))
                              : [...new Set([...ids, ...visiblePending.map((item) => item._id)])],
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
                      saving || selectedIds.length === 0 || !canBulkApprove
                    }
                    onClick={handleBulkApprove}
                  >
                    {saving ? 'Processing…' : `Approve Selected (${selectedIds.length})`}
                  </Button>
                </Stack>
                {!canBulkApprove && selectedIds.length > 0 && (
                  <Typography variant="body2" color="error" mb={1} role="status">One or more selected sections are full. Reassign the student or ask an admin to increase the section limit.</Typography>
                )}
                <List disablePadding>
                  {visiblePending.map((enrollment, index) => (
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
                        <FormControl size="small" sx={{ minWidth: 140 }} disabled={saving}>
                          <InputLabel id={`pending-section-${enrollment._id}`}>Section</InputLabel>
                          <Select labelId={`pending-section-${enrollment._id}`} label="Section" value={enrollment.sectionId || ''} onChange={(e) => handleSectionChange(enrollment._id, e.target.value)}>
                            {(selectedCourse?.sections || []).map((section) => <MenuItem key={section.sectionId} value={section.sectionId}>{section.name}</MenuItem>)}
                          </Select>
                        </FormControl>
                        <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            disabled={saving || !canApprove(enrollment)}
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
            {visibleApproved.length === 0 ? (
              <Typography color="text.secondary">{approved.length ? 'No enrolled students match your search.' : 'No students enrolled yet.'}</Typography>
            ) : (
              <>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} mb={1}>
                  <FormControlLabel
                    label={`Select all students (${visibleApproved.length})`}
                    control={<Checkbox checked={visibleApproved.length > 0 && visibleApproved.every((item) => selectedRosterIds.includes(item._id))} indeterminate={visibleApproved.some((item) => selectedRosterIds.includes(item._id)) && !visibleApproved.every((item) => selectedRosterIds.includes(item._id))} disabled={saving} onChange={() => setSelectedRosterIds((ids) => visibleApproved.every((item) => ids.includes(item._id)) ? ids.filter((id) => !visibleApproved.some((item) => item._id === id)) : [...new Set([...ids, ...visibleApproved.map((item) => item._id)])])} />}
                  />
                  <FormControl size="small" sx={{ minWidth: 170 }} disabled={saving || selectedRosterIds.length === 0}>
                    <InputLabel id="bulk-section-label">Assign to section</InputLabel>
                    <Select labelId="bulk-section-label" label="Assign to section" value={bulkSectionId} onChange={(e) => setBulkSectionId(e.target.value)}>
                      {(selectedCourse?.sections || []).map((section) => <MenuItem key={section.sectionId} value={section.sectionId}>{section.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <Button variant="contained" size="small" disabled={saving || selectedRosterIds.length === 0 || !bulkSectionId} onClick={handleBulkSectionChange}>
                    {saving ? 'Assigning…' : `Assign Selected (${selectedRosterIds.length})`}
                  </Button>
                </Stack>
              <List disablePadding>
                {visibleApproved.map((enrollment, index) => (
                  <React.Fragment key={enrollment._id}>
                    {index > 0 && <Divider />}
                    <ListItem sx={{ py: 1 }}>
                      <Checkbox checked={selectedRosterIds.includes(enrollment._id)} disabled={saving} onChange={() => setSelectedRosterIds((ids) => ids.includes(enrollment._id) ? ids.filter((id) => id !== enrollment._id) : [...ids, enrollment._id])} inputProps={{ 'aria-label': `Select ${enrollment.student?.name || 'student'} for section assignment` }} />
                      <ListItemText
                        primary={enrollment.student?.name}
                        secondary={`${enrollment.student?.email} · ${selectedCourse?.sections?.find((section) => section.sectionId === enrollment.sectionId)?.name || 'Section unavailable'}`}
                      />
                      <FormControl size="small" sx={{ minWidth: 140 }} disabled={saving}>
                        <InputLabel id={`roster-section-${enrollment._id}`}>Section</InputLabel>
                        <Select labelId={`roster-section-${enrollment._id}`} label="Section" value={enrollment.sectionId || ''} onChange={(e) => handleSectionChange(enrollment._id, e.target.value)}>
                          {(selectedCourse?.sections || []).map((section) => <MenuItem key={section.sectionId} value={section.sectionId}>{section.name}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <Chip label="Enrolled" color="success" size="small" />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
              </>
            )}
          </DashboardCard>
        </Stack>
      )}
    </PageContainer>
  );
};

export default CourseEnrollments;
