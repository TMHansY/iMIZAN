import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PageContainer from 'src/components/container/PageContainer';
import { toast } from 'react-toastify';
import {
  useGetExamsQuery,
  useGetQuestionsQuery,
  useUpdateQuestionMutation,
  useDeleteQuestionMutation,
} from '../../slices/examApiSlice';
import { getYouTubeEmbedUrl } from '../../utils/youtube';
import { uploadcareClient } from '../../utils/uploadcareClient';

export default function ExamPreviewPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { data: exams, isLoading: examsLoading } = useGetExamsQuery();
  const { data: questions, isLoading: questionsLoading, isError } = useGetQuestionsQuery(examId);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValues, setEditValues] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [updateQuestion, { isLoading: isSaving }] = useUpdateQuestionMutation();
  const [deleteQuestion, { isLoading: isDeleting }] = useDeleteQuestionMutation();
  const exam = exams?.find((item) => item.examId === examId);
  const orderedQuestions = useMemo(() => questions || [], [questions]);
  const openQuestionEditor = (question, index) => {
    setEditingQuestion(question);
    setEditingIndex(index);
    setEditValues({
      question: question.question || '',
      options: (question.options || []).map((option) => ({
        optionText: option.optionText || '',
        isCorrect: Boolean(option.isCorrect),
      })),
      imageUrl: question.imageUrl || '',
      videoUrl: question.videoUrl || '',
    });
  };

  const saveQuestion = async () => {
    if (
      !editValues.question.trim() ||
      editValues.options.length < 2 ||
      editValues.options.some((option) => !option.optionText.trim()) ||
      !editValues.options.some((option) => option.isCorrect)
    ) {
      toast.error('Add question text, fill in every option, and select a correct answer.');
      return;
    }
    try {
      await updateQuestion({ questionId: editingQuestion._id, ...editValues }).unwrap();
      toast.success('Question updated.');
      setEditingQuestion(null);
      setEditingIndex(null);
      setEditValues(null);
    } catch (error) {
      toast.error(error?.data?.message || 'Unable to update this question.');
    }
  };

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const result = await uploadcareClient.uploadFile(file, { store: true });
      setEditValues((values) => ({ ...values, imageUrl: result.cdnUrl }));
      toast.success('Image uploaded. Save the question to apply it.');
    } catch {
      toast.error('Image upload failed. Please try again.');
    } finally {
      setIsUploadingImage(false);
      event.target.value = '';
    }
  };

  const removeQuestion = async () => {
    try {
      await deleteQuestion(editingQuestion._id).unwrap();
      toast.success('Question deleted. The exam question count was adjusted.');
      setConfirmDeleteOpen(false);
      setEditingQuestion(null);
      setEditingIndex(null);
      setEditValues(null);
    } catch (error) {
      toast.error(error?.data?.message || 'Unable to delete this question.');
    }
  };

  if (examsLoading || questionsLoading) {
    return (
      <Box display="flex" justifyContent="center" p={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (!exam) return <Alert severity="error">Exam not found.</Alert>;

  return (
    <PageContainer title="Preview Exam" description="Student view preview">
      <Stack spacing={2} maxWidth={900} mx="auto" py={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              {exam.examName}
            </Typography>
            <Typography color="text.secondary">
              Student view preview · {orderedQuestions.length} questions
            </Typography>
          </Box>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/edit-exam/${examId}`)}>
            Back to exam
          </Button>
        </Stack>
        <Alert severity="info">Student-view Preview; The questions may or may not be randomised depending on the exam settings.</Alert>
        {isError ? (
          <Alert severity="error">Unable to load this exam’s questions.</Alert>
        ) : !orderedQuestions.length ? (
          <Alert severity="warning">No questions have been added to this exam yet.</Alert>
        ) : (
          <Stack spacing={2}>
            {orderedQuestions.map((question, index) => {
              const videoUrl = getYouTubeEmbedUrl(question.videoUrl);
              return (
                <Card variant="outlined" key={question._id}>
                  <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={2}
                    >
                      <Typography
                        variant="h6"
                        fontWeight={700}
                        sx={{ fontSize: { xs: '1.2rem', md: '1.35rem' } }}
                      >
                        Question {index + 1}
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<EditOutlinedIcon />}
                        onClick={() => openQuestionEditor(question, index)}
                      >
                        Edit this question
                      </Button>
                    </Stack>
                    <Typography
                      variant="body1"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        mb: 3,
                        color: 'text.primary',
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        fontSize: { xs: '1.15rem', md: '1.35rem' },
                        lineHeight: 1.8,
                      }}
                    >
                      {question.question}
                    </Typography>
                    {question.imageUrl && (
                      <Box mb={3}>
                        <img
                          src={question.imageUrl}
                          alt={`Question ${index + 1}`}
                          style={{ maxWidth: '100%', maxHeight: 360, borderRadius: 4 }}
                        />
                      </Box>
                    )}
                    {videoUrl && (
                      <Box mb={3} sx={{ width: '100%', aspectRatio: '16 / 9' }}>
                        <iframe
                          title={`Video for question ${index + 1}`}
                          src={videoUrl}
                          width="100%"
                          height="100%"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          referrerPolicy="strict-origin-when-cross-origin"
                          style={{ border: 0 }}
                        />
                      </Box>
                    )}
                    <Stack spacing={1}>
                      {(question.options || []).map((option) => (
                        <FormControlLabel
                          key={option._id}
                          disabled
                          control={<Radio />}
                          label={
                            <Stack
                              direction="row"
                              spacing={1.5}
                              alignItems="center"
                              justifyContent="space-between"
                              width="100%"
                            >
                              <Typography
                                component="span"
                                sx={{
                                  color: 'text.primary',
                                  fontFamily: 'Georgia, "Times New Roman", serif',
                                  fontSize: { xs: '1.05rem', md: '1.2rem' },
                                  lineHeight: 1.65,
                                  overflowWrap: 'anywhere',
                                }}
                              >
                                {option.optionText}
                              </Typography>
                              {option.isCorrect && (
                                <Chip
                                  icon={<CheckCircleOutlineIcon />}
                                  label="Correct answer"
                                  color="success"
                                  size="small"
                                  sx={{ flexShrink: 0 }}
                                />
                              )}
                            </Stack>
                          }
                          sx={{
                            m: 0,
                            p: { xs: 1.25, md: 1.5 },
                            minHeight: 58,
                            alignItems: 'center',
                            border: '1px solid',
                            borderColor: option.isCorrect ? 'success.main' : 'divider',
                            borderRadius: 1,
                            bgcolor: option.isCorrect ? 'success.light' : 'transparent',
                            '& .MuiFormControlLabel-label.Mui-disabled': {
                              color: 'text.primary',
                              opacity: 1,
                            },
                            '& .MuiRadio-root.Mui-disabled': {
                              color: 'text.secondary',
                              opacity: 1,
                            },
                          }}
                        />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
        <Dialog
          open={Boolean(editingQuestion)}
          onClose={() => !isSaving && setEditingQuestion(null)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Edit question {(editingIndex ?? 0) + 1}</DialogTitle>
          {editValues && (
            <DialogContent>
              <Stack spacing={2} pt={1}>
                <TextField
                  label="Question"
                  value={editValues.question}
                  multiline
                  minRows={3}
                  fullWidth
                  onChange={(event) =>
                    setEditValues({ ...editValues, question: event.target.value })
                  }
                />
                <Typography variant="subtitle2">Options · choose the correct answer</Typography>
                <RadioGroup
                  value={editValues.options.findIndex((option) => option.isCorrect)}
                  onChange={(event) => {
                    const correctIndex = Number(event.target.value);
                    setEditValues({
                      ...editValues,
                      options: editValues.options.map((option, index) => ({
                        ...option,
                        isCorrect: index === correctIndex,
                      })),
                    });
                  }}
                >
                  {editValues.options.map((option, index) => (
                    <Stack key={index} direction="row" alignItems="center" spacing={1}>
                      <Radio value={index} checked={option.isCorrect} />
                      <TextField
                        fullWidth
                        label={`Option ${index + 1}`}
                        value={option.optionText}
                        onChange={(event) =>
                          setEditValues({
                            ...editValues,
                            options: editValues.options.map((item, optionIndex) =>
                              optionIndex === index
                                ? { ...item, optionText: event.target.value }
                                : item,
                            ),
                          })
                        }
                      />
                    </Stack>
                  ))}
                </RadioGroup>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button variant="outlined" component="label" disabled={isUploadingImage}>
                      {isUploadingImage
                        ? 'Uploading…'
                        : editValues.imageUrl
                        ? 'Replace image'
                        : 'Upload image'}
                      <input type="file" accept="image/*" hidden onChange={uploadImage} />
                    </Button>
                    {editValues.imageUrl && (
                      <Button
                        color="error"
                        onClick={() => setEditValues({ ...editValues, imageUrl: '' })}
                      >
                        Remove image
                      </Button>
                    )}
                  </Stack>
                  {editValues.imageUrl && (
                    <Box mt={1}>
                      <img
                        src={editValues.imageUrl}
                        alt="Question preview"
                        style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 4 }}
                      />
                    </Box>
                  )}
                </Box>
                <TextField
                  label="YouTube video URL (optional)"
                  value={editValues.videoUrl}
                  onChange={(event) =>
                    setEditValues({ ...editValues, videoUrl: event.target.value })
                  }
                  fullWidth
                />
              </Stack>
            </DialogContent>
          )}
          <DialogActions>
            <Button
              color="error"
              startIcon={<DeleteOutlineIcon />}
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={isSaving || isDeleting || isUploadingImage}
              sx={{ mr: 'auto' }}
            >
              Delete question
            </Button>
            <Button onClick={() => setEditingQuestion(null)} disabled={isSaving || isDeleting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={saveQuestion}
              disabled={isSaving || isDeleting || isUploadingImage}
            >
              {isSaving ? 'Saving…' : 'Save question'}
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog open={confirmDeleteOpen} onClose={() => !isDeleting && setConfirmDeleteOpen(false)}>
          <DialogTitle>Delete this question?</DialogTitle>
          <DialogContent>
            This permanently removes the question and decreases the exam’s question count by one.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDeleteOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={removeQuestion}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete question'}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </PageContainer>
  );
}
