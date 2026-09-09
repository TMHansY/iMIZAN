import React, { useEffect, useState } from 'react';
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
  saveUserTestScore,
  submitTest,
  recordAnswer,
}) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);

  const [isLastQuestion, setIsLastQuestion] = useState(false);

  useEffect(() => {
    setIsLastQuestion(currentQuestion === questions.length - 1);
  }, [currentQuestion, questions.length]);

  const handleOptionChange = (event) => {
    const value = event.target.value;
    setSelectedOption(value);
    recordAnswer(questions[currentQuestion]._id, value);
  };

  const handleNextQuestion = () => {
    let isCorrect = false;
    const currentQuestionData = questions[currentQuestion];

    if (currentQuestionData && currentQuestionData.options) {
      const correctOption = currentQuestionData.options.find((option) => option.isCorrect);
      if (correctOption && selectedOption) {
        isCorrect = correctOption.id === selectedOption;
      }
    }

    if (isCorrect) {
      setScore(score + 1);
      saveUserTestScore();
    }

    if (isLastQuestion) {
      submitTest();
      return;
    }

    setSelectedOption(null);
    setCurrentQuestion(currentQuestion + 1);
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
        <Typography s variant="h4" mb={3}>
          Question {currentQuestion + 1}:
        </Typography>
        <Typography variant="body1" mb={3}>
          {questions[currentQuestion].question}
        </Typography>
        <Box mb={10}>
          <FormControl component="fieldset">
            <RadioGroup
              aria-label="quiz"
              name="quiz"
              value={selectedOption}
              onChange={handleOptionChange}
            >
              {questions[currentQuestion].options.map((option) => (
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
        <Stack direction="row" spacing={2} justifyContent="space-between">
          <Button
            variant="contained"
            color="primary"
            onClick={handleNextQuestion}
            disabled={selectedOption === null}
            style={{ marginLeft: 'auto' }}
          >
            {isLastQuestion ? 'Finish Test' : 'Next Question'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
