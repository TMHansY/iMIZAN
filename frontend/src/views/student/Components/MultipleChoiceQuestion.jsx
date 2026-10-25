import React, { useEffect } from 'react';
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
import { getYouTubeEmbedUrl } from '../../../utils/youtube';

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
}) {
  useEffect(() => {
    const preventCopy = (event) => {
      event.preventDefault();
    };

    const preventCopyShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && ['c', 'x', 'a'].includes(event.key.toLowerCase())) {
        event.preventDefault();
      }
    };

    document.addEventListener('copy', preventCopy);
    document.addEventListener('cut', preventCopy);
    document.addEventListener('contextmenu', preventCopy);
    document.addEventListener('keydown', preventCopyShortcut);

    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('cut', preventCopy);
      document.removeEventListener('contextmenu', preventCopy);
      document.removeEventListener('keydown', preventCopyShortcut);
    };
  }, []);
  const currentQuestionData = questions[currentQuestionIndex];
  const embeddedVideoUrl = getYouTubeEmbedUrl(currentQuestionData?.videoUrl);

  if (!currentQuestionData) {
    return null;
  }

  const handleOptionChange = (event) => {
    onSelectOption(event.target.value);
  };

  const handleLinearNext = () => {
    if (isLastQuestion) {
      submitTest();
    } else {
      onNext();
    }
  };

  return (
    <Card
      sx={{
        width: '100%',
        borderRadius: 0,
        boxShadow: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Question {currentQuestionIndex + 1}:
        </Typography>
        <Typography
          variant="body1"
          sx={{
            fontSize: { xs: '1rem', sm: '1.0625rem' },
            lineHeight: 1.7,
            mb: 3,
            overflowWrap: 'anywhere',
          }}
        >
          {currentQuestionData.question}
        </Typography>
        {currentQuestionData.imageUrl && (
          <Box mb={3}>
            <img
              src={currentQuestionData.imageUrl}
              alt="Question"
              style={{ maxWidth: '100%', maxHeight: 300, display: 'block', borderRadius: 4 }}
            />
          </Box>
        )}
        {embeddedVideoUrl && (
          <Box
            mb={3}
            sx={{
              width: '100%',
              aspectRatio: '16 / 9',
              bgcolor: 'common.black',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <iframe
              title={`Video for question ${currentQuestionIndex + 1}`}
              src={embeddedVideoUrl}
              width="100%"
              height="100%"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              style={{ border: 0, display: 'block' }}
            />
          </Box>
        )}
        <Box mb={5}>
          <FormControl component="fieldset" fullWidth>
            <RadioGroup
              aria-label="quiz"
              name="quiz"
              value={selectedOption}
              onChange={handleOptionChange}
              sx={{ gap: 1 }}
            >
              {currentQuestionData.options.map((option) => (
                <FormControlLabel
                  key={option._id}
                  value={option._id}
                  control={<Radio />}
                  label={
                    <Typography
                      component="span"
                      sx={{ whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.6 }}
                    >
                      {option.optionText}
                    </Typography>
                  }
                  sx={{
                    m: 0,
                    p: { xs: 1, sm: 1.25 },
                    minWidth: 0,
                    alignItems: 'flex-start',
                    border: '1px solid',
                    borderColor: selectedOption === option._id ? 'primary.main' : 'divider',
                    borderRadius: 1.5,
                    bgcolor: selectedOption === option._id ? 'action.selected' : 'background.paper',
                    transition: 'border-color 150ms ease, background-color 150ms ease',
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                    '& .MuiRadio-root': { pt: 0.25 },
                  }}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </Box>

        {allowBackNavigation ? (
          <Stack direction="row" spacing={2} justifyContent="space-between">
            <Button variant="outlined" onClick={onPrevious} disabled={currentQuestionIndex === 0}>
              Previous
            </Button>
            <Button variant="contained" color="primary" onClick={onNext} disabled={isLastQuestion}>
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
