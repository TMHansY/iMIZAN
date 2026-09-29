import useExamAttempt from '../../hooks/useExamAttempt';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Grid,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import BlankCard from 'src/components/shared/BlankCard';
import MultipleChoiceQuestion from './Components/MultipleChoiceQuestion';
import NumberOfQuestions from './Components/NumberOfQuestions';
import WebCam from './Components/WebCam';
import { useGetExamsQuery, useGetQuestionsQuery } from '../../slices/examApiSlice';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { seededShuffle } from '../../utils/seededShuffle';

const TestPage = () => {
  const { examId } = useParams();
  const session = useExamAttempt(examId);
  const { answers, currentQuestionIndex, proctoringLog: cheatingLog } = session.progress;
  const { data: userExamdata, isLoading: isExamsLoading } = useGetExamsQuery();
  const { userInfo } = useSelector((state) => state.auth);
  const selectedExam = userExamdata?.find((exam) => exam.examId === examId);
  const [questions, setQuestions] = useState([]);
  const { data, isLoading } = useGetQuestionsQuery(examId);
  const handleTestSubmission = session.submit;
  const setCurrentQuestionIndex = (change) =>
    session.update((prev) => ({
      ...prev,
      currentQuestionIndex:
        typeof change === 'function' ? change(prev.currentQuestionIndex) : change,
    }));
  const incrementViolation = (type, screenshot) =>
    session.update((prev) => ({
      ...prev,
      proctoringLog: {
        ...prev.proctoringLog,
        [`${type}Count`]: (prev.proctoringLog[`${type}Count`] || 0) + 1,
        screenshots: screenshot
          ? [...(prev.proctoringLog.screenshots || []), screenshot]
          : prev.proctoringLog.screenshots || [],
      },
    }));
  const navigate = useNavigate();

  useEffect(() => {
    if (session.submitted) {
      toast.success('Test submitted successfully!');
      navigate('/Success', { replace: true });
    }
  }, [session.submitted, navigate]);

  useEffect(() => {
    if (data && userInfo?._id) {
      let processedQuestions = data;

      if (selectedExam?.randomizeQuestions) {
        processedQuestions = seededShuffle(processedQuestions, `${userInfo._id}_${examId}_q`);
      }

      if (selectedExam?.randomizeOptions) {
        processedQuestions = processedQuestions.map((q) => ({
          ...q,
          options: seededShuffle(q.options, `${userInfo._id}_${q._id}_o`),
        }));
      }

      setQuestions(processedQuestions);
    }
  }, [data, selectedExam, userInfo, examId]);

  const recordAnswer = (questionId, optionId) => {
    session.update((prev) => ({ ...prev, answers: { ...prev.answers, [questionId]: optionId } }));
  };

  const allowBackNavigation = Boolean(selectedExam?.allowBackNavigation);
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const allAnswered = questions.length > 0 && questions.every((q) => Boolean(answers[q._id]));

  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const jumpToQuestion = (index) => {
    if (allowBackNavigation && index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  if (isExamsLoading || session.loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!session.attempt)
    return <Alert severity="error">{session.error || 'Unable to start the exam.'}</Alert>;

  return (
    <PageContainer title="TestPage" description="This is TestPage">
      {session.error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={handleTestSubmission} disabled={session.isSubmitting}>
              Retry submission
            </Button>
          }
        >
          {session.error}
        </Alert>
      )}
      <Dialog
        open={session.blocker.state === 'blocked'}
        onClose={() => {
          if (!session.isLeaving) session.blocker.reset?.();
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Leave this exam?</DialogTitle>
        <DialogContent>
          Your attempt has already started. The timer continues while you are away. Return to this
          exam to resume your saved progress; leaving does not give you a new attempt or more time.
          {session.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {session.error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => session.blocker.reset?.()} disabled={session.isLeaving}>
            Stay in exam
          </Button>
          <Button onClick={session.leave} disabled={session.isSubmitting || session.isLeaving}>
            {session.isLeaving ? 'Saving…' : 'Save and leave'}
          </Button>
        </DialogActions>
      </Dialog>
      <Box pt="3rem">
        <Grid container spacing={3}>
          <Grid item xs={12} md={7} lg={7}>
            <BlankCard>
              <Box
                width="100%"
                minHeight="400px"
                boxShadow={3}
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
              >
                {isLoading ? (
                  <CircularProgress />
                ) : (
                  <Box
                    component="fieldset"
                    disabled={
                      session.isSubmitting || session.isFinalizing || session.timeLeft === 0
                    }
                    sx={{ border: 0, m: 0, p: 0, width: '100%', minWidth: 0 }}
                  >
                    <MultipleChoiceQuestion
                      questions={questions}
                      currentQuestionIndex={currentQuestionIndex}
                      selectedOption={answers[questions[currentQuestionIndex]?._id] || null}
                      onSelectOption={(optionId) =>
                        recordAnswer(questions[currentQuestionIndex]._id, optionId)
                      }
                      onNext={goToNext}
                      onPrevious={goToPrevious}
                      allowBackNavigation={allowBackNavigation}
                      isLastQuestion={isLastQuestion}
                      submitTest={handleTestSubmission}
                    />
                  </Box>
                )}
              </Box>
            </BlankCard>
          </Grid>
          <Grid item xs={12} md={5} lg={5}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <BlankCard>
                  <Box
                    maxHeight="300px"
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'start',
                      justifyContent: 'center',
                      overflowY: 'auto',
                      height: '100%',
                    }}
                  >
                    <NumberOfQuestions
                      questionLength={questions.length}
                      currentQuestionIndex={currentQuestionIndex}
                      answeredQuestionIds={Object.keys(answers)}
                      questions={questions}
                      onJumpToQuestion={jumpToQuestion}
                      allowBackNavigation={allowBackNavigation}
                      allAnswered={allAnswered}
                      onSubmit={handleTestSubmission}
                      timeLeft={session.timeLeft}
                      isSubmitting={session.isSubmitting}
                    />
                  </Box>
                </BlankCard>
              </Grid>
              <Grid item xs={12}>
                <BlankCard>
                  <Box
                    width="300px"
                    maxHeight="180px"
                    boxShadow={3}
                    display="flex"
                    flexDirection="column"
                    alignItems="start"
                    justifyContent="center"
                  >
                    <WebCam cheatingLog={cheatingLog} incrementViolation={incrementViolation} />
                  </Box>
                </BlankCard>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default TestPage;
