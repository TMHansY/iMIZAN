import {
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import Webcam from 'react-webcam';
import { uniqueId } from 'lodash';
import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useGetQuestionsQuery, useGetExamsQuery } from 'src/slices/examApiSlice';
import axiosInstance from '../../axios';

const instructionItems = [
  {
    icon: <ArticleOutlinedIcon color="action" />,
    text: 'You may need blank sheets for rough work — have them ready before starting.',
  },
  {
    icon: <FlagOutlinedIcon color="action" />,
    text: 'Click "Finish Test" once you have answered all questions to submit.',
  },
  {
    icon: <InsightsOutlinedIcon color="action" />,
    text: 'Your score will be available once your lecturer makes it visible to you.',
  },
];

export default function ExamDetails() {
  const navigate = useNavigate();
  const { examId } = useParams();

  const { data: questions, isLoading } = useGetQuestionsQuery(examId);
  const { data: examsData } = useGetExamsQuery();
  const currentExam = examsData?.find((exam) => exam.examId === examId);

  const [attemptInfo, setAttemptInfo] = useState(null);
  const [attemptLoading, setAttemptLoading] = useState(true);

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        const response = await axiosInstance.get(`/api/users/results/attempts/${examId}`, {
          withCredentials: true,
        });
        setAttemptInfo(response.data.data);
      } catch (error) {
        console.error('Error fetching attempt info:', error);
      } finally {
        setAttemptLoading(false);
      }
    };
    fetchAttempts();
  }, [examId]);

  const attemptsExhausted = attemptInfo && attemptInfo.attemptsRemaining <= 0;

  const testId = uniqueId();
  const [certify, setCertify] = useState(false);
  const handleCertifyChange = () => setCertify(!certify);

  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [cameraVerified, setCameraVerified] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const handleOpenCameraCheck = () => {
    setCameraError(false);
    setCameraDialogOpen(true);
  };

  const handleCameraReady = () => setCameraError(false);
  const handleCameraError = () => setCameraError(true);

  const handleConfirmCamera = () => {
    setCameraVerified(true);
    setCameraDialogOpen(false);
  };

  const handleTest = () => {
    if (!cameraVerified) {
      toast.error('Please complete the camera check before starting the test.');
      return;
    }
    navigate(`/exam/${examId}/${testId}`);
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="flex-start"
      minHeight="100vh"
      bgcolor="grey.50"
      py={{ xs: 4, md: 8 }}
      px={2}
    >
      <Card
        elevation={2}
        sx={{
          maxWidth: 640,
          width: '100%',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          {/* Header */}
          <Typography variant="h4" fontWeight={700} gutterBottom>
            {currentExam?.examName || 'Exam'}
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            This is a proctored multiple choice exam. Your webcam will monitor your session for
            the entire duration to help ensure academic integrity.
          </Typography>

          {/* Quick facts */}
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap mb={4}>
            <Chip
              icon={<QuizOutlinedIcon />}
              label={`${currentExam?.totalQuestions ?? '—'} question${
                currentExam?.totalQuestions === 1 ? '' : 's'
              }`}
              variant="outlined"
            />
            <Chip
              icon={<TimerOutlinedIcon />}
              label={`${currentExam?.duration ?? '—'} minutes`}
              variant="outlined"
            />
            <Chip icon={<VideocamOutlinedIcon />} label="Webcam proctored" variant="outlined" />
          </Stack>

          <Divider sx={{ mb: 3 }} />

          {/* Instructions */}
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Before you begin
          </Typography>
          <List dense disablePadding sx={{ mb: 3 }}>
            {instructionItems.map((item, index) => (
              <ListItem key={index} disableGutters sx={{ py: 0.75 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>

          <Alert severity="info" sx={{ mb: 3 }}>
            Your actions during the exam are proctored. Signs of wrongdoing may lead to
            suspension or cancellation of your result.
          </Alert>

          <Divider sx={{ mb: 3 }} />

          {/* Confirmation & actions */}
          <FormControlLabel
            control={
              <Checkbox checked={certify} onChange={handleCertifyChange} color="primary" />
            }
            label="I have read and agree to the instructions above"
            sx={{ mb: 2 }}
          />

          {attemptInfo && (
            <Typography
              variant="body2"
              color={attemptsExhausted ? 'error' : 'text.secondary'}
              mb={2}
            >
              Attempts used: {attemptInfo.attemptsUsed} / {attemptInfo.maxAttempts}
            </Typography>
          )}

          {attemptsExhausted ? (
            <Alert severity="error">
              You have used all {attemptInfo.maxAttempts} attempt
              {attemptInfo.maxAttempts > 1 ? 's' : ''} allowed for this exam.
            </Alert>
          ) : (
            <Stack direction="row" spacing={2}>
              <Button
                variant={cameraVerified ? 'outlined' : 'contained'}
                color={cameraVerified ? 'success' : 'primary'}
                disabled={!certify || attemptLoading}
                onClick={handleOpenCameraCheck}
                fullWidth
              >
                {cameraVerified ? '✓ Camera Checked' : 'Check Camera'}
              </Button>

              <Button
                variant="contained"
                color="primary"
                disabled={!certify || !cameraVerified || attemptLoading}
                onClick={handleTest}
                fullWidth
              >
                Start Test
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Camera check dialog */}
      <Dialog
        open={cameraDialogOpen}
        onClose={() => setCameraDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Camera Check</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Your camera will be used to monitor the exam for the entire duration. Make sure your
            face is clearly visible below before continuing.
          </Typography>
          {cameraError ? (
            <Alert severity="error">
              Camera access was denied or unavailable. Please allow camera permissions in your
              browser and try again.
            </Alert>
          ) : (
            <Webcam
              audio={false}
              onUserMedia={handleCameraReady}
              onUserMediaError={handleCameraError}
              style={{ width: '100%', borderRadius: 8 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCameraDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={cameraError} onClick={handleConfirmCamera}>
            Looks Good, Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
