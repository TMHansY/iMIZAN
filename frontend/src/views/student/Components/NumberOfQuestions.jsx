import React, { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid';
import Avatar from '@mui/material/Avatar';
import { Box, Button, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';

const NumberOfQuestions = ({
  questionLength,
  currentQuestionIndex,
  answeredQuestionIds,
  questions,
  onJumpToQuestion,
  allowBackNavigation,
  allAnswered,
  onSubmit,
  submitTest,
  examDurationInSeconds,
}) => {
  const totalQuestions = questionLength;
  const questionNumbers = Array.from({ length: totalQuestions }, (_, index) => index + 1);

  const [timeLeft, setTimeLeft] = useState(examDurationInSeconds * 60);

  const rows = [];
  for (let i = 0; i < questionNumbers.length; i += 5) {
    rows.push(questionNumbers.slice(i, i + 5));
  }

  useEffect(() => {
    setTimeLeft(examDurationInSeconds * 60);
  }, [examDurationInSeconds]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTimeUp = () => {
    toast.warning('Time is up! Submitting your test...');
    submitTest();
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Box position="sticky" top="0" zIndex={1} bgcolor="white" paddingY="10px" width="100%" px={3}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Typography variant="h6">
            Question: {currentQuestionIndex + 1}/{totalQuestions}
          </Typography>
          <Typography variant="h6">Time Left: {formatTime(timeLeft)}</Typography>
          {allowBackNavigation && (
            <Button
              variant="contained"
              color="success"
              onClick={onSubmit}
              disabled={!allAnswered}
            >
              Submit Exam
            </Button>
          )}
        </Stack>
      </Box>

      <Box p={3} mt={5} maxHeight="270px">
        <Grid container spacing={1}>
          {rows.map((row, rowIndex) => (
            <Grid key={rowIndex} item xs={12}>
              <Stack direction="row" alignItems="center" justifyContent="start">
                {row.map((questionNumber) => {
                  const index = questionNumber - 1;
                  const isAnswered = questions[index] && answeredQuestionIds.includes(questions[index]._id);
                  const isCurrent = index === currentQuestionIndex;

                  return (
                    <Avatar
                      key={questionNumber}
                      variant="rounded"
                      style={{
                        width: '40px',
                        height: '40px',
                        fontSize: '20px',
                        cursor: allowBackNavigation ? 'pointer' : 'default',
                        margin: '3px',
                        background: isAnswered ? '#66bb6a' : '#ccc',
                        border: isCurrent ? '3px solid #1976d2' : 'none',
                        opacity: allowBackNavigation ? 1 : 0.7,
                      }}
                      onClick={() => allowBackNavigation && onJumpToQuestion(index)}
                    >
                      {questionNumber}
                    </Avatar>
                  );
                })}
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Box>
    </>
  );
};

export default NumberOfQuestions;