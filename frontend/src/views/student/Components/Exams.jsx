import ContentSkeleton from 'src/components/shared/ContentSkeleton';
import React from 'react';
import { Grid, Typography, Box, Alert } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import ExamCard from './ExamCard';
import { useGetExamsQuery } from 'src/slices/examApiSlice';

const Exams = () => {
  const { data: userExams, isLoading, isError } = useGetExamsQuery();
  console.log('Exam USer ', userExams);

  if (isLoading) {
    return <ContentSkeleton />;
  }

  if (isError) {
    return <Alert severity="error">Unable to load exams. Please try again later.</Alert>;
  }

  return (
    <PageContainer title="Exams" description="List of exams">
      {userExams.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 6,
            px: 2,
            bgcolor: 'background.paper',
            borderRadius: 3,
            border: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h5" mb={1}>
            No exams available yet
          </Typography>
          <Typography color="text.secondary">
            Your available assessments will appear here.
          </Typography>
        </Box>
      )}
      <Grid container spacing={3}>
        {userExams.map((exam) => (
          <Grid item xs={12} sm={6} md={6} lg={4} key={exam._id}>
            <ExamCard exam={exam} />
          </Grid>
        ))}
      </Grid>
    </PageContainer>
  );
};

export default Exams;
