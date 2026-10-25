import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';

const NumberOfQuestions = ({
  questionLength,
  currentQuestionIndex,
  answeredQuestionIds,
  questions,
  onJumpToQuestion,
  allowBackNavigation,
  allAnswered,
  onSubmit,
  timeLeft,
  isSubmitting,
}) => {
  const answeredCount = questions.filter((question) =>
    answeredQuestionIds.includes(question._id),
  ).length;
  const timerColor =
    timeLeft <= 300 ? 'error.main' : timeLeft <= 600 ? 'warning.main' : 'text.primary';
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 2.25 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1}
        mb={1.5}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Question {currentQuestionIndex + 1} of {questionLength}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {answeredCount} of {questionLength} answered
          </Typography>
        </Box>
        <Box textAlign={{ xs: 'left', sm: 'right' }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Time remaining
          </Typography>
          <Typography variant="h5" fontWeight={700} color={timerColor} aria-live="polite">
            {formatTime(timeLeft)}
          </Typography>
        </Box>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
          gap: 1,
        }}
      >
        {Array.from({ length: questionLength }, (_, index) => {
          const question = questions[index];
          const isAnswered = question && answeredQuestionIds.includes(question._id);
          const isCurrent = index === currentQuestionIndex;

          return (
            <Button
              key={question?._id || index}
              variant={isAnswered ? 'contained' : 'outlined'}
              color={isAnswered ? 'success' : 'inherit'}
              aria-label={`Question ${index + 1}${isCurrent ? ', current' : ''}${
                isAnswered ? ', answered' : ', unanswered'
              }`}
              aria-current={isCurrent ? 'step' : undefined}
              disabled={!allowBackNavigation}
              onClick={() => onJumpToQuestion(index)}
              sx={{
                minWidth: 44,
                width: '100%',
                height: 44,
                p: 0,
                borderWidth: isCurrent ? 3 : 1,
                borderColor: isCurrent ? 'primary.main' : undefined,
                bgcolor: isCurrent && !isAnswered ? 'action.selected' : undefined,
                fontWeight: isCurrent ? 700 : 500,
                '&.Mui-disabled': { opacity: 0.75, color: 'text.primary' },
              }}
            >
              {index + 1}
            </Button>
          );
        })}
      </Box>

      {allowBackNavigation && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
          mt={2}
        >
          <Typography variant="body2" color={allAnswered ? 'success.main' : 'text.secondary'}>
            {allAnswered
              ? 'All questions answered. You can submit when ready.'
              : 'Answer every question to submit the exam.'}
          </Typography>
          <Button
            variant="contained"
            color="success"
            onClick={onSubmit}
            disabled={!allAnswered || isSubmitting || timeLeft === 0}
          >
            {isSubmitting ? 'Submitting…' : 'Submit Exam'}
          </Button>
        </Stack>
      )}
    </Box>
  );
};

export default NumberOfQuestions;
