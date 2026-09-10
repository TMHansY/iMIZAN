import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Grid, CircularProgress } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import BlankCard from 'src/components/shared/BlankCard';
import MultipleChoiceQuestion from './Components/MultipleChoiceQuestion';
import NumberOfQuestions from './Components/NumberOfQuestions';
import WebCam from './Components/WebCam';
import { useGetExamsQuery, useGetQuestionsQuery } from '../../slices/examApiSlice';
import { useSaveCheatingLogMutation } from 'src/slices/cheatingLogApiSlice';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useCheatingLog } from 'src/context/CheatingLogContext';
import axiosInstance from '../../axios';
import { seededShuffle } from '../../utils/seededShuffle';

const TestPage = () => {
  const { examId, testId } = useParams();
  const [examStartTime] = useState(() => Date.now());
  const [selectedExam, setSelectedExam] = useState(null);
  const [examDurationInSeconds, setExamDurationInSeconds] = useState(0);
  const { data: userExamdata, isLoading: isExamsLoading } = useGetExamsQuery();
  const { userInfo } = useSelector((state) => state.auth);
  const { cheatingLog, incrementViolation } = useCheatingLog();
  const [saveCheatingLogMutation] = useSaveCheatingLogMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [questions, setQuestions] = useState([]);
  const { data, isLoading } = useGetQuestionsQuery(examId);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (userExamdata) {
      const exam = userExamdata.find((exam) => exam.examId === examId);
      if (exam) {
        setSelectedExam(exam);
        setExamDurationInSeconds(exam.duration);
      }
    }
  }, [userExamdata, examId]);

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
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const allowBackNavigation = Boolean(selectedExam?.allowBackNavigation);
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const allAnswered =
    questions.length > 0 && questions.every((q) => Boolean(answers[q._id]));

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

  const handleTestSubmission = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const timeTakenSeconds = Math.round((Date.now() - examStartTime) / 1000);

      await axiosInstance.post(
        '/api/users/results',
        { examId, answers, timeTakenSeconds },
        { withCredentials: true },
      );

      const updatedLog = {
        ...cheatingLog,
        username: userInfo.name,
        email: userInfo.email,
        examId: examId,
        noFaceCount: parseInt(cheatingLog.noFaceCount) || 0,
        multipleFaceCount: parseInt(cheatingLog.multipleFaceCount) || 0,
        cellPhoneCount: parseInt(cheatingLog.cellPhoneCount) || 0,
        tabSwitchCount: parseInt(cheatingLog.tabSwitchCount) || 0,
      };

      await saveCheatingLogMutation(updatedLog).unwrap();

      toast.success('Test submitted successfully!');
      navigate('/Success');
    } catch (error) {
      console.error('Error submitting test:', error);
      toast.error(
        error?.response?.data?.message ||
          error?.data?.message ||
          error?.message ||
          'Failed to submit test. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveUserTestScore = () => {
    setScore(score + 1);
  };

  if (isExamsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PageContainer title="TestPage" description="This is TestPage">
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
                    saveUserTestScore={saveUserTestScore}
                  />
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
                      submitTest={handleTestSubmission}
                      examDurationInSeconds={examDurationInSeconds}
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