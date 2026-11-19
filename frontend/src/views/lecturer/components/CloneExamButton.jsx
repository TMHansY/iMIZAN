import { useEffect, useState } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import { toast } from 'react-toastify';
import axiosInstance from '../../../axios';
import { useCloneExamMutation } from '../../../slices/examApiSlice';

const CloneExamButton = ({ examId, examName, sourceCourseId }) => {
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [cloneExam, { isLoading: isCloning }] = useCloneExamMutation();

  useEffect(() => {
    if (!open) return undefined;

    const loadCourses = async () => {
      setLoadingCourses(true);
      try {
        const { data } = await axiosInstance.get('/api/courses/mine', {
          withCredentials: true,
        });
        setCourses(data.filter((course) => course.courseId !== sourceCourseId));
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Unable to load your courses');
      } finally {
        setLoadingCourses(false);
      }
    };

    loadCourses();
    return undefined;
  }, [open, sourceCourseId]);

  const handleOpen = (event) => {
    event.stopPropagation();
    setCourseId('');
    setOpen(true);
  };

  const handleClose = (event) => {
    event?.stopPropagation();
    if (!isCloning) setOpen(false);
  };

  const handleClone = async () => {
    try {
      const result = await cloneExam({ examId, courseId }).unwrap();
      toast.success(
        `Cloned with ${result.questionCount} question${result.questionCount === 1 ? '' : 's'}`,
      );
      setOpen(false);
    } catch (error) {
      toast.error(error?.data?.message || error?.error || 'Unable to clone exam');
    }
  };

  return (
    <>
      <IconButton aria-label="clone exam" size="small" onClick={handleOpen}>
        <ContentCopyIcon fontSize="small" />
      </IconButton>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
        <DialogTitle>Clone exam</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Create a copy of “{examName}” in one of your other courses. Student attempts and results
            will not be copied.
          </DialogContentText>
          <FormControl fullWidth disabled={loadingCourses || isCloning}>
            <InputLabel id={`clone-course-${examId}`}>Destination course</InputLabel>
            <Select
              labelId={`clone-course-${examId}`}
              value={courseId}
              label="Destination course"
              onChange={(event) => setCourseId(event.target.value)}
            >
              {courses.length === 0 ? (
                <MenuItem value="" disabled>
                  {loadingCourses ? 'Loading courses…' : 'No other assigned courses'}
                </MenuItem>
              ) : (
                courses.map((course) => (
                  <MenuItem key={course.courseId} value={course.courseId}>
                    {course.courseCode} — {course.courseName}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isCloning}>
            Cancel
          </Button>
          <Button onClick={handleClone} disabled={!courseId || isCloning} variant="contained">
            {isCloning ? 'Cloning…' : 'Clone exam'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CloneExamButton;
