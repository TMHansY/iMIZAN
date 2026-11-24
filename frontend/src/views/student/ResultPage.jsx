import { formatTabInactivityDuration } from '../../utils/tabInactivity';
import React, { useState, useEffect, useRef } from 'react';
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
  Button,
  Stack,
  Divider,
  Checkbox,
} from '@mui/material';
import { Visibility, VisibilityOff, Search, Print } from '@mui/icons-material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import RateReviewIcon from '@mui/icons-material/RateReview';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
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
  const [courses, setCourses] = useState([]);
  const [sectionFilter, setSectionFilter] = useState('all');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [selectedResultIds, setSelectedResultIds] = useState([]);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const visibilityPending = useRef(false);

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
          const [resultsResponse, coursesResponse] = await Promise.all([
            axiosInstance.get('/api/users/results/all', { withCredentials: true }),
            axiosInstance.get('/api/courses/mine', { withCredentials: true }),
          ]);
          setResults(resultsResponse.data.data);
          setCourses(coursesResponse.data);
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
    setSelectedResultIds((ids) =>
      ids.filter((id) =>
        response.data.data.some((result) => result._id === id && !result.showToStudent),
      ),
    );
  };

  const beginVisibilityUpdate = () => {
    if (visibilityPending.current) return false;
    visibilityPending.current = true;
    setVisibilitySaving(true);
    return true;
  };

  const endVisibilityUpdate = () => {
    visibilityPending.current = false;
    setVisibilitySaving(false);
  };

  const handleReleaseSelected = async () => {
    if (!selectedResultIds.length || !beginVisibilityUpdate()) return;
    try {
      const { data } = await axiosInstance.put(
        '/api/users/results/release-selected',
        { ids: selectedResultIds },
        { withCredentials: true },
      );
      setResults((previous) =>
        previous.map((result) =>
          selectedResultIds.includes(result._id) ? { ...result, showToStudent: true } : result,
        ),
      );
      setSelectedResultIds([]);
      toast.success(`${data.data.modifiedCount} result(s) released to students`);
      try {
        await refreshResults();
      } catch (err) {
        toast.error(
          'Results were released, but the list could not refresh. Please reload the page.',
        );
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || 'Unable to confirm release. You can safely retry.',
      );
    } finally {
      endVisibilityUpdate();
    }
  };

  const handleToggleVisibility = async (resultId) => {
    if (!beginVisibilityUpdate()) return;
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
    } finally {
      endVisibilityUpdate();
    }
  };

  const handleIntegrityDecision = async (resultId, value) => {
    if (!beginVisibilityUpdate()) return;
    const integrityDecision = value;
    try {
      await axiosInstance.put(
        `/api/users/results/${resultId}/integrity`,
        { integrityDecision },
        { withCredentials: true },
      );
      setReviewResult((current) => current?._id === resultId ? { ...current, integrityDecision } : current);
      await refreshResults();
      toast.success(integrityDecision === 'cheating' ? 'Cheating confirmed for this result' : 'Integrity status set to clear');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update integrity status');
    } finally {
      endVisibilityUpdate();
    }
  };

  const renderIntegrityChip = (result) => (
    <Chip
      size="small"
      color={result.integrityDecision === 'cheating' ? 'error' : 'success'}
      label={result.integrityDecision === 'cheating' ? 'Cheating confirmed' : 'Clear'}
    />
  );

  const handleExamChange = (examId) => {
    setSelectedExam(examId);
    setSectionFilter('all');
    setSelectedResultIds([]);
  };

  const handleBulkVisibility = async (showToStudent) => {
    if (selectedExam === 'all') return;
    if (!beginVisibilityUpdate()) return;
    try {
      const response = await axiosInstance.put(
        `/api/users/results/exam/${selectedExam}/visibility`,
        { showToStudent },
        { withCredentials: true },
      );
      toast.success(
        `${showToStudent ? 'Shown' : 'Hidden'} results for ${
          response.data.data.modifiedCount
        } student(s)`,
      );
      await refreshResults();
    } catch (err) {
      toast.error('Failed to update visibility for this exam');
    } finally {
      endVisibilityUpdate();
    }
  };

  const handleOpenReview = async (result) => {
    setReviewResult(result);
    setReviewLog(null);
    setReviewDialogOpen(true);
    setReviewLoading(true);
    try {
      const { data: logs } = await triggerGetCheatingLogs(result.examId);
      const studentLogs = (logs || []).filter((log) => log.email === result.userId?.email);

      // Match this specific attempt to its own log by finding whichever log's
      // timestamp is closest to this attempt's submission time — rather than
      // always grabbing the most recent log overall, which would show the
      // same log for every past attempt.
      const resultTime = new Date(result.createdAt).getTime();
      const closestLog = studentLogs.reduce((closest, log) => {
        const logTime = new Date(log.createdAt).getTime();
        const diff = Math.abs(logTime - resultTime);
        if (!closest || diff < closest.diff) {
          return { log, diff };
        }
        return closest;
      }, null);

      setReviewLog(
        result.attemptId
          ? studentLogs.find((log) => log.attemptId === result.attemptId) || null
          : closestLog?.log || null,
      );
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

  const handleDeleteResult = async (resultId) => {
    if (!window.confirm('Permanently delete this attempt? This cannot be undone.')) return;

    try {
      await axiosInstance.delete(`/api/users/results/${resultId}`, {
        withCredentials: true,
      });
      toast.success('Attempt deleted');
      await refreshResults();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete attempt');
    }
  };

  const filteredResults = results.filter((result) => {
    const examName = exams.find((e) => e.examId === result.examId)?.examName || '';
    const matchesSearch =
      result.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      examName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesExam = selectedExam === 'all' || result.examId === selectedExam;
    const matchesSection =
      sectionFilter === 'all' ||
      (sectionFilter === 'unassigned' ? !result.sectionId : result.sectionId === sectionFilter);
    return matchesSearch && matchesExam && matchesSection;
  });

  const sectionOptions = (selectedExam === 'all'
    ? courses
    : courses.filter((course) => course.courseId === exams.find((exam) => exam.examId === selectedExam)?.courseId)
  ).flatMap((course) => (course.sections || []).map((section) => ({
    ...section,
    label: selectedExam === 'all' ? `${course.courseCode} — ${section.name}` : section.name,
  })));
  const hasUnassignedResults = results.some((result) =>
    (selectedExam === 'all' || result.examId === selectedExam) && !result.sectionId,
  );

  const groupedResults = React.useMemo(() => {
    const groups = {};
    filteredResults.forEach((result) => {
      const key = `${result.examId}_${result.userId?._id}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(result);
    });
    return Object.values(groups).map((attempts) => {
      const sorted = [...attempts].sort((a, b) => a.attemptNumber - b.attemptNumber);
      return {
        key: `${sorted[0].examId}_${sorted[0].userId?._id}`,
        latest: sorted[sorted.length - 1],
        attempts: sorted,
      };
    });
  }, [filteredResults]);

  const unreleasedResults = filteredResults.filter((result) => !result.showToStudent);
  const renderSelection = (result) => (
    <Checkbox
      checked={selectedResultIds.includes(result._id)}
      disabled={visibilitySaving || result.showToStudent}
      onChange={() =>
        setSelectedResultIds((ids) =>
          ids.includes(result._id) ? ids.filter((id) => id !== result._id) : [...ids, result._id],
        )
      }
      inputProps={{
        'aria-label': `Select ${result.userId?.name || 'student'}, attempt ${
          result.attemptNumber
        }, ${exams.find((exam) => exam.examId === result.examId)?.examName || 'exam'}`,
      }}
    />
  );

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const formatDuration = (seconds) => {
    if (seconds === null || seconds === undefined) return '—';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

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
              <Box mb={3} display="flex" gap={2} flexWrap="wrap">
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
                  label="Search"
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
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Exam Name</TableCell>
                      <TableCell>Attempt</TableCell>
                      <TableCell>Percentage</TableCell>
                      <TableCell>Total Score</TableCell>
                      <TableCell>Time Taken</TableCell>
                      <TableCell>Submission Date</TableCell>
                      <TableCell>Review</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredResults.map((result) => (
                      <TableRow key={result._id}>
                        <TableCell>
                          {exams.find((e) => e.examId === result.examId)?.examName || 'Exam'}
                        </TableCell>
                        <TableCell>
                          {result.attemptNumber} of {result.totalAttemptsForExam}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${result.percentage.toFixed(1)}%`}
                            color="default"
                          />
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.75} alignItems="flex-start">
                            <Typography variant="body2" color="textSecondary">
                              Marks: {result.totalMarks} / {result.maxMarks ?? '—'}
                            </Typography>
                            {renderIntegrityChip(result)}
                          </Stack>
                        </TableCell>
                        <TableCell>{formatDuration(result.timeTakenSeconds)}</TableCell>
                        <TableCell>{new Date(result.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {exams.find((e) => e.examId === result.examId)?.allowReview && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => navigate(`/review/${result._id}`)}
                            >
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
      <style>{`
        .results-print-root { display: none; }
        @media print {
          @page { size: landscape; margin: 10mm; }
          body * { visibility: hidden !important; }
          .results-print-root,
          .results-print-root * {
            visibility: visible !important;
            color: #111 !important;
          }
          .results-print-root {
            display: block !important;
            position: absolute;
            inset: 0;
            width: 100%;
            color: #111 !important;
            background: #fff !important;
          }
          .results-print-root table { width: 100%; border-collapse: collapse; }
          .results-print-root th,
          .results-print-root td {
            border: 1px solid #777;
            padding: 4px;
            color: #111 !important;
            font-size: 8pt;
            text-align: left;
            overflow-wrap: anywhere;
          }
          .results-print-root th { background: #eee !important; }
          .results-print-root thead { display: table-header-group; }
          .results-print-root tr { break-inside: avoid; }
        }
      `}</style>
      <Box className="results-print-root">
        <Typography variant="h5" sx={{ color: '#111', mb: 1 }}>Exam Results</Typography>
        <Typography sx={{ color: '#111', mb: 2, fontSize: '9pt' }}>
          {selectedExam === 'all'
            ? 'All exams'
            : exams.find((exam) => exam.examId === selectedExam)?.examName || 'Selected exam'}
          {' · '}
          {sectionFilter === 'all'
            ? 'All sections'
            : sectionFilter === 'unassigned'
              ? 'Unassigned'
              : sectionOptions.find((section) => section.sectionId === sectionFilter)?.label || 'Selected section'}
          {searchTerm ? ` · Search: ${searchTerm}` : ''}
          {' · '}{filteredResults.length} attempt(s)
        </Typography>
        <table>
          <thead>
            <tr>
              <th>Student Name</th><th>Email</th><th>Exam</th><th>Section</th>
              <th>Attempt</th><th>Total Attempts</th><th>Percentage</th><th>Total Score</th>
              <th>Time Taken</th><th>Submission Date</th><th>Student Visibility</th><th>Integrity</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.map((result) => (
              <tr key={result._id}>
                <td>{result.userId?.name || '—'}</td>
                <td>{result.userId?.email || '—'}</td>
                <td>{exams.find((exam) => exam.examId === result.examId)?.examName || 'Unknown Exam'}</td>
                <td>{result.sectionName || 'Unassigned'}</td>
                <td>{result.attemptNumber ?? '—'}</td>
                <td>{result.totalAttemptsForExam ?? '—'}</td>
                <td>{typeof result.percentage === 'number' ? `${result.percentage.toFixed(1)}%` : '—'}</td>
                <td>{result.totalMarks ?? '—'} / {result.maxMarks ?? '—'}</td>
                <td>{formatDuration(result.timeTakenSeconds)}</td>
                <td>{result.createdAt ? new Date(result.createdAt).toLocaleString() : '—'}</td>
                <td>{result.showToStudent ? 'Released' : 'Not released'}</td>
                <td>{result.integrityDecision || 'Not reviewed'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
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
              <FormControl sx={{ minWidth: 200 }} disabled={visibilitySaving}>
                <InputLabel id="lecturer-results-exam-label">Select Exam</InputLabel>
                <Select
                  labelId="lecturer-results-exam-label"
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
              <FormControl sx={{ minWidth: 200 }} disabled={visibilitySaving}>
                <InputLabel id="lecturer-results-section-label">Select Section</InputLabel>
                <Select
                  labelId="lecturer-results-section-label"
                  value={sectionFilter}
                  onChange={(e) => {
                    setSectionFilter(e.target.value);
                    setSelectedResultIds([]);
                  }}
                  label="Select Section"
                >
                  <MenuItem value="all">All sections</MenuItem>
                  {hasUnassignedResults && <MenuItem value="unassigned">Unassigned</MenuItem>}
                  {sectionOptions.map((section) => (
                    <MenuItem key={section.sectionId} value={section.sectionId}>{section.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Search Students"
                disabled={visibilitySaving}
                variant="outlined"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedResultIds([]);
                }}
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
                    disabled={visibilitySaving}
                  >
                    Show All Results
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<VisibilityOff />}
                    onClick={() => handleBulkVisibility(false)}
                    disabled={visibilitySaving}
                  >
                    Hide All Results
                  </Button>
                </Stack>
              )}
            </Box>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              mb={2}
            >
              <Button
                variant="contained"
                color="success"
                startIcon={<Visibility />}
                disabled={visibilitySaving || selectedResultIds.length === 0}
                onClick={handleReleaseSelected}
              >
                {visibilitySaving ? 'Updating…' : `Release Selected (${selectedResultIds.length})`}
              </Button>
              <Button
                variant="outlined"
                startIcon={<Print />}
                onClick={() => window.print()}
                disabled={filteredResults.length === 0}
              >
                Print / Download PDF
              </Button>
              <Typography variant="body2" color="text.secondary">
                Select results to release to students. Select all includes earlier attempts matching
                these filters. Already released results cannot be selected.
              </Typography>
            </Stack>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={
                          unreleasedResults.length > 0 &&
                          selectedResultIds.length === unreleasedResults.length
                        }
                        indeterminate={
                          selectedResultIds.length > 0 &&
                          selectedResultIds.length < unreleasedResults.length
                        }
                        disabled={visibilitySaving || unreleasedResults.length === 0}
                        onChange={() =>
                          setSelectedResultIds((ids) =>
                            ids.length === unreleasedResults.length
                              ? []
                              : unreleasedResults.map((result) => result._id),
                          )
                        }
                        inputProps={{
                          'aria-label': 'Select all unreleased results matching filters',
                        }}
                      />
                    </TableCell>
                    <TableCell />
                    <TableCell>Student Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Exam</TableCell>
                    <TableCell>Section</TableCell>
                    <TableCell>Attempts</TableCell>
                    <TableCell>Percentage</TableCell>
                    <TableCell>Total Score</TableCell>
                    <TableCell>Time Taken</TableCell>
                    <TableCell>Submission Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupedResults.map((group) => {
                    const isExpanded = expandedGroups.has(group.key);
                    const examName =
                      exams.find((e) => e.examId === group.latest.examId)?.examName ||
                      'Unknown Exam';

                    const renderActionCells = (result) => (
                      <>
                        <IconButton
                          onClick={() => handleToggleVisibility(result._id)}
                          disabled={visibilitySaving}
                          color={result.showToStudent ? 'success' : 'default'}
                          title="Toggle visibility to student"
                        >
                          {result.showToStudent ? <Visibility /> : <VisibilityOff />}
                        </IconButton>
                        <IconButton
                          onClick={() => handleOpenReview(result)}
                          disabled={visibilitySaving}
                          title="Review proctoring log"
                        >
                          <RateReviewIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDeleteResult(result._id)}
                          disabled={visibilitySaving}
                          color="error"
                          title="Delete this attempt"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </>
                    );

                    return (
                      <React.Fragment key={group.key}>
                        <TableRow>
                          <TableCell padding="checkbox">{renderSelection(group.latest)}</TableCell>
                          <TableCell>
                            {group.attempts.length > 1 && (
                              <IconButton size="small" onClick={() => toggleGroup(group.key)}>
                                {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                              </IconButton>
                            )}
                          </TableCell>
                          <TableCell>{group.latest.userId?.name}</TableCell>
                          <TableCell>{group.latest.userId?.email}</TableCell>
                          <TableCell>{examName}</TableCell>
                          <TableCell>{group.latest.sectionName || 'Unassigned'}</TableCell>
                          <TableCell>
                            {group.attempts.length > 1 ? (
                              <Chip
                                size="small"
                                label={`${group.attempts.length} attempts`}
                                onClick={() => toggleGroup(group.key)}
                                sx={{ cursor: 'pointer' }}
                              />
                            ) : (
                              <Typography variant="body2" color="textSecondary">
                                1 attempt
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${group.latest.percentage.toFixed(1)}%`}
                              color="default"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="textSecondary">
                              Marks: {group.latest.totalMarks} / {group.latest.maxMarks ?? '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>{formatDuration(group.latest.timeTakenSeconds)}</TableCell>
                          <TableCell>
                            {new Date(group.latest.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{renderActionCells(group.latest)}</TableCell>
                        </TableRow>

                        {isExpanded &&
                          group.attempts.map((attempt) => (
                            <TableRow key={attempt._id} sx={{ bgcolor: 'grey.50' }}>
                              <TableCell padding="checkbox">{renderSelection(attempt)}</TableCell>
                              <TableCell />
                              <TableCell colSpan={2}>
                                <Typography variant="body2" color="textSecondary" pl={2}>
                                  Attempt {attempt.attemptNumber} of {attempt.totalAttemptsForExam}
                                </Typography>
                              </TableCell>
                              <TableCell />
                              <TableCell />
                              <TableCell />
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={`${attempt.percentage.toFixed(1)}%`}
                                  color="default"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="textSecondary">
                                  Marks: {attempt.totalMarks} / {attempt.maxMarks ?? '—'}
                                </Typography>
                              </TableCell>
                              <TableCell>{formatDuration(attempt.timeTakenSeconds)}</TableCell>
                              <TableCell>
                                {new Date(attempt.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell>{renderActionCells(attempt)}</TableCell>
                            </TableRow>
                          ))}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </DashboardCard>
        </Grid>
      </Grid>

      {/* Proctoring review dialog */}
      <Dialog open={reviewDialogOpen} onClose={handleCloseReview} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Proctoring Review — {reviewResult?.userId?.name} ({reviewResult?.userId?.email})
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
                Score: {reviewResult?.percentage?.toFixed(1)}% (Marks: {reviewResult?.totalMarks} / {reviewResult?.maxMarks ?? '—'})
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                <Typography variant="subtitle2">Integrity</Typography>
                {renderIntegrityChip(reviewResult || {})}
                {userInfo?.role === 'lecturer' && reviewResult && (
                  <FormControl size="small" sx={{ minWidth: 190 }}>
                    <InputLabel id="result-integrity-label">Decision</InputLabel>
                    <Select
                      labelId="result-integrity-label"
                      label="Decision"
                      value={reviewResult.integrityDecision || 'clear'}
                      onChange={(event) => handleIntegrityDecision(reviewResult._id, event.target.value)}
                      disabled={visibilitySaving}
                    >
                      <MenuItem value="clear">Clear</MenuItem>
                      <MenuItem value="cheating">Cheating confirmed</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </Stack>

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
                    <Chip label={`Tab Inactivity: ${reviewLog.tabSwitchCount}`} />
                  </Stack>

                  {reviewLog.screenshots?.length > 0 ? (
                    <Grid container spacing={1}>
                      {reviewLog.screenshots.map((s, i) => (
                        <Grid item xs={12} sm={4} key={i}>
                          {s.url ? (
                            <img
                              src={s.url}
                              alt={s.type}
                              style={{
                                width: '100%',
                                height: 'auto',
                                display: 'block',
                                objectFit: 'contain',
                                borderRadius: 4,
                              }}
                            />
                          ) : (
                            <Typography>Screenshot unavailable</Typography>
                          )}
                          <Typography variant="caption" display="block" textAlign="center">
                            {s.type === 'tabSwitch' ? 'Tab Inactivity' : s.type}
                          </Typography>
                          {s.type === 'tabSwitch' && (
                            <Typography variant="caption" display="block" textAlign="center">
                              Detected: {new Date(s.detectedAt).toLocaleString()}
                              <br />
                              Time inactive: {formatTabInactivityDuration(s.durationSeconds)}
                            </Typography>
                          )}
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

            </>
          )}
        </DialogContent>
        <Box display="flex" justifyContent="flex-end" p={2}>
          <Button onClick={handleCloseReview}>Close</Button>
        </Box>
      </Dialog>
    </PageContainer>
  );
};

export default ResultPage;
