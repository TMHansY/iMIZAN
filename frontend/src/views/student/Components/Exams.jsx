import React from 'react';
import { Grid, Typography } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import BlankCard from '../../../components/shared/BlankCard';
import ExamCard from './ExamCard';
import { useGetExamsQuery } from 'src/slices/examApiSlice';

const Exams = () => {
  // Fetch exam data from the backend using useGetExamsQuery
  const { data: userExams, isLoading, isError } = useGetExamsQuery();
  console.log('Exam USer ', userExams);

  if (isLoading) {
    return <div>Loading...</div>; // can replace this with a loading spinner component
  }

  if (isError) {
    return <div>Error fetching exams.</div>; 
  }

  return (
    <PageContainer title="Exams" description="List of exams">
      <Grid container spacing={3}>
        {userExams.map((exam) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={exam._id}>
            <BlankCard>
              <ExamCard exam={exam} />
            </BlankCard>
          </Grid>
        ))}
      </Grid>
    </PageContainer>
  );
};

export default Exams;
