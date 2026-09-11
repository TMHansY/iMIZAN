import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Select,
  MenuItem,
  Typography,
  Alert,
  Card,
} from '@mui/material';
import swal from 'sweetalert';
import {
  useCreateQuestionMutation,
  useGetExamsQuery,
  useGetQuestionsQuery,
} from 'src/slices/examApiSlice';
import { toast } from 'react-toastify';
import { uploadcareClient } from '../../../utils/uploadcareClient';

const AddQuestionForm = () => {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [correctOptions, setCorrectOptions] = useState([false, false, false, false]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [imageUrl, setImageUrl] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleOptionChange = (index) => {
    const updatedCorrectOptions = [false, false, false, false];
    updatedCorrectOptions[index] = true;
    setCorrectOptions(updatedCorrectOptions);
  };
  const handleImageSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const result = await uploadcareClient.uploadFile(file, { store: true });
      setImageUrl(result.cdnUrl);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
  };

  const [createQuestion, { isLoading }] = useCreateQuestionMutation();
  const { data: examsData } = useGetExamsQuery();
  const { data: existingQuestionsData, refetch: refetchExistingQuestions } = useGetQuestionsQuery(selectedExamId, {
    skip: !selectedExamId,
  });

  useEffect(() => {
    if (examsData && examsData.length > 0) {
      setSelectedExamId(examsData[0].examId);
    }
  }, [examsData]);

  // Reset the in-session question list whenever the selected exam changes
  useEffect(() => {
    setQuestions([]);
  }, [selectedExamId]);

  const selectedExam = examsData?.find((exam) => exam.examId === selectedExamId);
  const questionLimit = selectedExam?.totalQuestions || 0;
  const existingCount = existingQuestionsData?.length || 0;
  const totalAdded = existingCount + questions.length;
  const limitReached = questionLimit > 0 && totalAdded >= questionLimit;

  const handleAddQuestion = async () => {
    if (limitReached) {
      swal('', `This exam already has its ${questionLimit} questions. You cannot add more.`, 'warning');
      return;
    }

    if (newQuestion.trim() === '' || newOptions.some((option) => option.trim() === '')) {
      swal('', 'Please fill out the question and all options.', 'error');
      return;
    }

    if (!correctOptions.some((isCorrect) => isCorrect)) {
      swal('', 'Please select at least one correct answer.', 'error');
      return;
    }

    const newQuestionObj = {
      question: newQuestion,
      options: newOptions.map((option, index) => ({
        optionText: option,
        isCorrect: correctOptions[index],
      })),
      examId: selectedExamId,
      imageUrl: imageUrl,
    };

    try {
      const res = await createQuestion(newQuestionObj).unwrap();
      if (res) {
        toast.success('Question added successfully!!!');
      }
      await refetchExistingQuestions();
      setNewQuestion('');
      setNewOptions(['', '', '', '']);
      setCorrectOptions([false, false, false, false]);
      setImageUrl(null);
    } catch (err) {
      swal('', 'Failed to create question. Please try again.', 'error');
    }
  };

  return (
    <div>
      <Select
        label="Select Exam"
        value={selectedExamId}
        onChange={(e) => {
          console.log(e.target.value, 'option ID');
          setSelectedExamId(e.target.value);
        }}
        fullWidth
        sx={{ mb: 2 }}
      >
        {examsData &&
          examsData.map((exam) => (
            <MenuItem key={exam.examId} value={exam.examId}>
              {exam.examName}
            </MenuItem>
          ))}
        </Select>

        {selectedExamId && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              {totalAdded} of {questionLimit} questions added
            </Typography>
            {limitReached && (
              <Alert severity="warning">
                This exam's question limit has been reached. Select a different exam or increase the
                limit when editing the exam.
              </Alert>
            )}
          </Box>
        )}

        {questions.map((questionObj, questionIndex) => (
          <Card key={questionIndex} variant="outlined" sx={{ mb: 3, p: 2 }}>
            <TextField
              label={`Question ${questionIndex + 1}`}
              value={questionObj.question}
              fullWidth
              multiline
              InputProps={{
                readOnly: true,
              }}
              sx={{ mb: 2 }}
            />
            {questionObj.imageUrl && (
              <Box sx={{ mb: 2 }}>
                <img
                  src={questionObj.imageUrl}
                  alt="Question"
                  style={{ maxWidth: '100%', maxHeight: 200, display: 'block', borderRadius: 4 }}
                />
              </Box>
            )}
            <Stack spacing={2}>
              {questionObj.options.map((option, optionIndex) => (
                <Stack
                  key={optionIndex}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{
                    bgcolor: option.isCorrect ? 'success.light' : 'transparent',
                    borderRadius: 1,
                    px: 1,
                  }}
                >
                  <TextField
                    label={`Option ${optionIndex + 1}`}
                    value={option.optionText}
                    fullWidth
                    InputProps={{
                      readOnly: true,
                    }}
                  />
                  <FormControlLabel
                    control={<Radio checked={option.isCorrect} disabled />}
                    label="Correct Answer"
                    sx={{ whiteSpace: 'nowrap' }}
                  />
                </Stack>
              ))}
            </Stack>
          </Card>
        ))}

      <TextField
        label="New Question"
        value={newQuestion}
        onChange={(e) => setNewQuestion(e.target.value)}
        fullWidth
        rows={4}
        sx={{ mb: 1 }}
      />

      <Box sx={{ mb: 2 }}>
        <Button variant="outlined" component="label" disabled={isUploadingImage}>
          {isUploadingImage ? 'Uploading...' : imageUrl ? 'Replace Image' : 'Add Image (optional)'}
          <input type="file" accept="image/*" hidden onChange={handleImageSelect} />
        </Button>
        {imageUrl && (
          <Box sx={{ mt: 1 }}>
            <img
              src={imageUrl}
              alt="Question"
              style={{ maxWidth: '100%', maxHeight: 200, display: 'block', borderRadius: 4 }}
            />
            <Button size="small" color="error" onClick={handleRemoveImage} sx={{ mt: 0.5 }}>
              Remove Image
            </Button>
          </Box>
        )}
      </Box>

      <RadioGroup
        value={correctOptions.findIndex((v) => v)}
        onChange={(e) => handleOptionChange(Number(e.target.value))}
      >
        {newOptions.map((option, index) => (
          <Stack
            key={index}
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
            mb={1}
          >
            <TextField
              label={`Option ${index + 1}`}
              value={newOptions[index]}
              onChange={(e) => {
                const updatedOptions = [...newOptions];
                updatedOptions[index] = e.target.value;
                setNewOptions(updatedOptions);
              }}
              fullWidth
              sx={{ flex: '80%' }}
            />
            <FormControlLabel value={index} control={<Radio />} label="Correct Answer" />
          </Stack>
        ))}
      </RadioGroup>

      <Stack mt={2} direction="row" spacing={2}>
        <Button variant="outlined" onClick={handleAddQuestion} disabled={limitReached || isUploadingImage}>
          Add Question
        </Button>
      </Stack>
    </div>
  );
};

export default AddQuestionForm;
