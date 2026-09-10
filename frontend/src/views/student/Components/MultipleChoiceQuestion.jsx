import React from 'react';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

export default function MultipleChoiceQuestion({
  questions,
  currentQuestionIndex,
  selectedOption,
  onSelectOption,
  onNext,
  onPrevious,
  allowBackNavigation,
  isLastQuestion,
  submitTest,
  saveUserTestScore,
}) {
  const currentQuestionData = questions[currentQuestionIndex];

  if (!currentQuestionData) {
    return null;
  }

  const handleOptionChange = (event) => {
    onSelectOption(event.target.value);
  };

  const checkIfCorrect = () => {
    const correctOption = currentQuestionData.options.find((option) => option.isCorrect);
    return correctOption && selectedOption && correctOption.id === selectedOption;
  };

  const handleLinearNext = () => {
    if (checkIfCorrect()) {
      saveUserTestScore();
    }

    if (isLastQuestion) {
      submitTest();
    } else {
      onNext();
    }
  };

  return (
    <Card
      style={{
        width: '50%',
        boxShadow: '2px',
      }}
    >
      <CardContent
        style={{
          boxShadow: '4px',
          padding: '2px',
          paddingRight: '4px',
          margin: '3px',
        }}
      >
        <Typography variant="h4" mb={3}>
          Question {currentQuestionIndex + 1}:
        </Typography>
        <Typography variant="body1" mb={3}>
          {currentQuestionData.question}
        </Typography>
        <Box mb={10}>
          <FormControl component="fieldset">
            <RadioGroup
              aria-label="quiz"
              name="quiz"
              value={selectedOption}
              onChange={handleOptionChange}
            >
              {currentQuestionData.options.map((option) => (
                <FormControlLabel
                  key={option._id}
                  value={option._id}
                  control={<Radio />}
                  label={option.optionText}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </Box>

        {allowBackNavigation ? (
          <Stack direction="row" spacing={2} justifyContent="space-between">
            <Button
              variant="outlined"
              onClick={onPrevious}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={onNext}
              disabled={isLastQuestion}
            >
              Next Question
            </Button>
          </Stack>
        ) : (
          <Stack direction="row" spacing={2} justifyContent="space-between">
            <Button
              variant="contained"
              color="primary"
              onClick={handleLinearNext}
              disabled={selectedOption === null}
              style={{ marginLeft: 'auto' }}
            >
              {isLastQuestion ? 'Finish Test' : 'Next Question'}
            </Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}