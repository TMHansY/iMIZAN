import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  Button,
  Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PageContainer from 'src/components/container/PageContainer';
import axiosInstance from '../../axios';
import { useGetQuestionsQuery } from 'src/slices/examApiSlice';
import { toast } from 'react-toastify';

const ReviewPage = () => {
  const { resultId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(`/api/users/results/single/${resultId}`, {
          withCredentials: true,
        });
        setResult(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load result');
        toast.error('Failed to load result');
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [resultId]);

  const { data: questions, isLoading: questionsLoading } = useGetQuestionsQuery(
    result?.examId,
    { skip: !result?.examId },
  );

  if (loading || questionsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <PageContainer title="Review Answers" description="Review your exam answers">
      <Box maxWidth={800} mx="auto" py={4} px={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" fontWeight={700}>
            Review Answers
          </Typography>
          <Chip
            label={`Score: ${result.percentage.toFixed(1)}%`}
            color={result.percentage >= 50 ? 'success' : 'error'}
          />
        </Stack>

        {(questions || []).map((question, index) => {
          const selectedOptionId = result.answers?.[question._id];
          const correctOption = question.options.find((opt) => opt.isCorrect);
          const wasCorrect = selectedOptionId === correctOption?._id;

          return (
            <Card key={question._id} sx={{ mb: 2 }} variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Typography variant="subtitle1" fontWeight={600} mb={2}>
                    {index + 1}. {question.question}
                  </Typography>
                  {wasCorrect ? (
                    <CheckCircleIcon color="success" />
                  ) : (
                    <CancelIcon color="error" />
                  )}
                </Stack>

                {question.imageUrl && (
                  <Box mb={2}>
                    <img
                      src={question.imageUrl}
                      alt="Question"
                      style={{ maxWidth: '100%', maxHeight: 250, display: 'block', borderRadius: 4 }}
                    />
                  </Box>
                )}

                <Stack spacing={1}>
                  {question.options.map((option) => {
                    const isSelected = option._id === selectedOptionId;
                    const isCorrectOption = option.isCorrect;

                    let bgColor = 'transparent';
                    if (isCorrectOption) bgColor = 'success.light';
                    else if (isSelected && !isCorrectOption) bgColor = 'error.light';

                    return (
                      <Box
                        key={option._id}
                        sx={{
                          px: 2,
                          py: 1,
                          borderRadius: 1,
                          bgcolor: bgColor,
                          border: isSelected ? '2px solid' : '1px solid transparent',
                          borderColor: isSelected ? 'primary.main' : 'transparent',
                        }}
                      >
                        <Typography variant="body2">
                          {option.optionText}
                          {isSelected && ' (Your answer)'}
                          {isCorrectOption && !isSelected && ' (Correct answer)'}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          );
        })}

        <Divider sx={{ my: 3 }} />

        <Button variant="contained" onClick={() => navigate('/result')}>
          Back to Results
        </Button>
      </Box>
    </PageContainer>
  );
};

export default ReviewPage;
