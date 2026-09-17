import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Chip,
} from '@mui/material';
import { toast } from 'react-toastify';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import axiosInstance from '../../axios';

const emptyForm = {
  courseCode: '',
  courseName: '',
  description: '',
  lecturer: '',
  studentLimit: 30,
};

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [coursesRes, lecturersRes] = await Promise.all([
        axiosInstance.get('/api/courses', { withCredentials: true }),
        axiosInstance.get('/api/courses/lecturers', { withCredentials: true }),
      ]);
      setCourses(coursesRes.data);
      setLecturers(lecturersRes.data);
    } catch (err) {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreate = () => {
    setEditingCourseId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (course) => {
    setEditingCourseId(course.courseId);
    setForm({
      courseCode: course.courseCode,
      courseName: course.courseName,
      description: course.description || '',
      lecturer: course.lecturer?._id || '',
      studentLimit: course.studentLimit,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.courseCode.trim() || !form.courseName.trim()) {
      toast.error('Course code and name are required');
      return;
    }

    try {
      const payload = { ...form, lecturer: form.lecturer || null };

      if (editingCourseId) {
        await axiosInstance.put(`/api/courses/${editingCourseId}`, payload, {
          withCredentials: true,
        });
        toast.success('Course updated');
      } else {
        await axiosInstance.post('/api/courses', payload, { withCredentials: true });
        toast.success('Course created');
      }

      setDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save course');
    }
  };

  const handleDelete = async (course) => {
    if (!window.confirm(`Delete ${course.courseCode} — ${course.courseName}?`)) return;

    try {
      await axiosInstance.delete(`/api/courses/${course.courseId}`, {
        withCredentials: true,
      });
      toast.success('Course deleted');
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete course');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PageContainer title="Course Management" description="Create and manage courses">
      <DashboardCard
        title="Courses"
        action={
          <Button variant="contained" onClick={openCreate}>
            New Course
          </Button>
        }
      >
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Lecturer</TableCell>
                <TableCell>Student Limit</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {courses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No courses yet. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                courses.map((course) => (
                  <TableRow key={course.courseId}>
                    <TableCell>{course.courseCode}</TableCell>
                    <TableCell>{course.courseName}</TableCell>
                    <TableCell>
                      {course.lecturer ? (
                        course.lecturer.name
                      ) : (
                        <Chip label="Unassigned" size="small" color="warning" />
                      )}
                    </TableCell>
                    <TableCell>{course.studentLimit}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined" onClick={() => openEdit(course)}>
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleDelete(course)}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DashboardCard>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCourseId ? 'Edit Course' : 'New Course'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Course Code"
              value={form.courseCode}
              onChange={(e) => setForm({ ...form, courseCode: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Course Name"
              value={form.courseName}
              onChange={(e) => setForm({ ...form, courseName: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            <FormControl fullWidth>
              <InputLabel>Assigned Lecturer</InputLabel>
              <Select
                value={form.lecturer}
                label="Assigned Lecturer"
                onChange={(e) => setForm({ ...form, lecturer: e.target.value })}
              >
                <MenuItem value="">
                  <em>Unassigned</em>
                </MenuItem>
                {lecturers.map((lecturer) => (
                  <MenuItem key={lecturer._id} value={lecturer._id}>
                    {lecturer.name} ({lecturer.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Student Limit"
              type="number"
              value={form.studentLimit}
              onChange={(e) => setForm({ ...form, studentLimit: Number(e.target.value) })}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingCourseId ? 'Save Changes' : 'Create Course'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default CourseManagement;