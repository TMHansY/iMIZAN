import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Divider,
} from '@mui/material';
import { Visibility, VisibilityOff, Search } from '@mui/icons-material';
import RateReviewIcon from '@mui/icons-material/RateReview';
import CloseIcon from '@mui/icons-material/Close';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import axiosInstance from '../../axios';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useLazyGetCheatingLogsQuery } from 'src/slices/cheatingLogApiSlice';

const ResultPage = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState('all');
  const [exams, setExams] = useState([]);

  // Review dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);
  const [reviewLog, setReviewLog] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [triggerGetCheatingLogs] = useLazyGetCheatingLogsQuery();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const examsResponse = await axiosInstance.get('/api/users/exam', {
          withCredentials: true,
        });
        setExams(examsResponse.data);

        if (userInfo?.role === 'lecturer') {
          const resultsResponse = await axiosInstance.get('/api/users/results/all', {
            withCredentials: true,
          });
          setResults(resultsResponse.data.data);
        } else {
          const resultsResponse = await axiosInstance.get('/api/users/results/user', {
            withCredentials: true,
          });
          setResults(resultsResponse.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch data');
        toast.error('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userInfo]);

  const refreshResults = async () => {
    const response = await axiosInstance.get('/api/users/results/all', {
      withCredentials: true,
    });
    setResults(response.data.data);
  };

  const handleToggleVisibility = async (resultId) => {
    try {
      await axiosInstance.put(
        `/api/users/results/${resultId}/toggle-visibility`,
        {},
        { withCredentials: true },
      );
      toast.success('Visibility updated successfully');
      await refreshResults();
    } catch (err) {
      toast.error('Failed to update visibility');
    }
  };

  const handleExamChange = (examId) => {
    setSelectedExam(examId);
  };

  const handleBulkVisibility = async (showToStudent) => {
    if (selectedExam === 'all') return;
    try {
      const response = await axiosInstance.put(
        `/api/users/results/exam/${selectedExam}/visibility`,
        { showToStudent },
        { withCredentials: true },
      );
      toast.success(
        `${showToStudent ? 'Shown' : 'Hidden'} results for ${response.data.data.modifiedCount} student(s)`,
      );
      await refreshResults();
    } catch (err) {
      toast.error('Failed to update visibility for this exam');
    }
  };

  const handleOpenReview = async (result) => {
    setReviewResult(result);
    setReviewLog(null);
    setReviewDialogOpen(true);
    setReviewLoading(true);
    try {
      const { data: logs } = await triggerGetCheatingLogs(result.examId);
      const studentLogs = (logs || [])
        .filter((log) => log.email === result.userId?.email)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setReviewLog(studentLogs[0] || null);
    } catch (err) {
      toast.error('Failed to load cheating log for this student');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleCloseReview = () => {
    setReviewDialogOpen(false);
    setReviewResult(null);
    setReviewLog(null);
  };

  const handleSetDecision = async (decision) => {
    if (!reviewResult) return;
    try {
      const response = await axiosInstance.put(
        `/api/users/results/${reviewResult._id}/decision`,
        { decision },
        { withCredentials: true },
      );
      toast.success(decision ? `Marked as ${decision}` : 'Reset to automatic status');
      setReviewResult(response.data.data);
      await refreshResults();
    } catch (err) {
      toast.error('Failed to update decision');
    }
  };

  const filteredResults = results.filter((result) => {
    const matchesSearch =
      result.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesExam = selectedExam === 'all' || result.examId === selectedExam;
    return matchesSearch && matchesExam;
  });

  const formatDuration = (seconds) => {
    if (seconds === null || seconds === undefined) return '—';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const StatusChip = ({ result }) => (
    <Chip
      label={result.status === 'pass' ? 'Pass' : 'Fail'}
      color={result.status === 'pass' ? 'success' : 'error'}
      size="small"
    />
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // Student View
  if (userInfo?.role === 'student') {
    return (
      <PageContainer title="My Exam Results" description="View your exam results">
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Total Exams Taken
                </Typography>
                <Typography variant="h3">{results.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Average Score
                </Typography>
                <Typography variant="h3">
                  {results.length > 0
                    ? `${(
                        results.reduce((acc, curr) => acc + curr.percentage, 0) / results.length
                      ).toFixed(1)}%`
                    : '0%'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <DashboardCard title="My Results">
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Exam Name</TableCell>
                      <TableCell>MCQ Score</TableCell>
                      <TableCell>Total Score</TableCell>
                      <TableCell>Time Taken</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Submission Date</TableCell>
                      <TableCell>Review</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result._id}>
                        <TableCell>
                          {exams.find((e) => e.examId === result.examId)?.examName || 'Exam'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${result.percentage.toFixed(1)}%`}
                            color={result.percentage >= 70 ? 'success' : 'warning'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="textSecondary">
                            Total: {result.totalMarks}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatDuration(result.timeTakenSeconds)}</TableCell>
                        <TableCell>
                          <StatusChip result={result} />
                        </TableCell>
                        <TableCell>{new Date(result.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {exams.find((e) => e.examId === result.examId)?.allowReview && (
                            <Button size="small" variant="outlined" onClick={() => navigate(`/review/${result._id}`)}>
                              Review
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </DashboardCard>
          </Grid>
        </Grid>
      </PageContainer>
    );
  }

  // Lecturer View
  return (
    <PageContainer title="Results Dashboard" description="View and manage exam results">
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Students
              </Typography>
              <Typography variant="h3">{filteredResults.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Average Score
              </Typography>
              <Typography variant="h3">
                {filteredResults.length > 0
                  ? `${(
                      filteredResults.reduce((acc, curr) => acc + curr.percentage, 0) /
                      filteredResults.length
                    ).toFixed(1)}%`
                  : '0%'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <DashboardCard title="Exam Results">
            <Box mb={3} display="flex" gap={2} flexWrap="wrap" alignItems="center">
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Select Exam</InputLabel>
                <Select
                  value={selectedExam}
                  onChange={(e) => handleExamChange(e.target.value)}
                  label="Select Exam"
                >
                  <MenuItem value="all">All Exams</MenuItem>
                  {exams.map((exam) => (
                    <MenuItem key={exam.examId} value={exam.examId}>
                      {exam.examName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Search Students"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 200 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
              {selectedExam !== 'all' && (
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="success"
                    startIcon={<Visibility />}
                    onClick={() => handleBulkVisibility(true)}
                  >
                    Show All Results
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<VisibilityOff />}
                    onClick={() => handleBulkVisibility(false)}
                  >
                    Hide All Results
                  </Button>
                </Stack>
              )}
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Student Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Exam</TableCell>
                    <TableCell>MCQ Score</TableCell>
                    <TableCell>Total Score</TableCell>
                    <TableCell>Time Taken</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Submission Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredResults.map((result) => (
                    <TableRow key={result._id}>
                      <TableCell>{result.userId?.name}</TableCell>
                      <TableCell>{result.userId?.email}</TableCell>
                      <TableCell>
                        {exams.find((e) => e.examId === result.examId)?.examName ||
                          'Unknown Exam'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${result.percentage.toFixed(1)}%`}
                          color={result.percentage >= 70 ? 'success' : 'warning'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          Total: {result.totalMarks}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDuration(result.timeTakenSeconds)}</TableCell>
                      <TableCell>
                        <StatusChip result={result} />
                        {result.lecturerDecision && (
                          <Typography variant="caption" display="block" color="textSecondary">
                            (manual)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{new Date(result.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => handleToggleVisibility(result._id)}
                          color={result.showToStudent ? 'success' : 'default'}
                          title="Toggle visibility to student"
                        >
                          {result.showToStudent ? <Visibility /> : <VisibilityOff />}
                        </IconButton>
                        <IconButton
                          onClick={() => handleOpenReview(result)}
                          title="Review log & decide pass/fail"
                        >
                          <RateReviewIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DashboardCard>
        </Grid>
      </Grid>

      {/* Review & Decide Dialog */}
      <Dialog open={reviewDialogOpen} onClose={handleCloseReview} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Review — {reviewResult?.userId?.name} ({reviewResult?.userId?.email})
            </Typography>
            <IconButton onClick={handleCloseReview} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {reviewLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Typography variant="subtitle2" gutterBottom>
                Score: {reviewResult?.percentage?.toFixed(1)}% (Total: {reviewResult?.totalMarks})
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>
                Proctoring Flags
              </Typography>

              {reviewLog ? (
                <>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                    <Chip label={`No Face: ${reviewLog.noFaceCount}`} />
                    <Chip label={`Multiple Faces: ${reviewLog.multipleFaceCount}`} />
                    <Chip label={`Cell Phone: ${reviewLog.cellPhoneCount}`} />
                    <Chip label={`Tab Switch: ${reviewLog.tabSwitchCount}`} />
                  </Stack>

                  {reviewLog.screenshots?.length > 0 ? (
                    <Grid container spacing={1}>
                      {reviewLog.screenshots.map((s, i) => (
                        <Grid item xs={4} key={i}>
                          <img
                            src={s.url}
                            alt={s.type}
                            style={{ width: '100%', borderRadius: 4 }}
                          />
                          <Typography variant="caption" display="block" textAlign="center">
                            {s.type}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No screenshots recorded for this attempt.
                    </Typography>
                  )}
                </>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No proctoring log found for this student's attempt.
                </Typography>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>
                Decision
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Automatic status based on score: {reviewResult?.percentage >= 50 ? 'Pass' : 'Fail'}
                {reviewResult?.lecturerDecision &&
                  ` — currently overridden to "${reviewResult.lecturerDecision}"`}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleSetDecision(null)} disabled={reviewLoading}>
            Reset to Automatic
          </Button>
          <Button
            color="error"
            variant="outlined"
            onClick={() => handleSetDecision('fail')}
            disabled={reviewLoading}
          >
            Mark as Fail
          </Button>
          <Button
            color="success"
            variant="contained"
            onClick={() => handleSetDecision('pass')}
            disabled={reviewLoading}
          >
            Mark as Pass
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default ResultPage;
