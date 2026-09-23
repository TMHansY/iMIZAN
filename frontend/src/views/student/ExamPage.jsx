import PageHeading from 'src/components/shared/PageHeading';
import React from 'react';
import PageContainer from 'src/components/container/PageContainer';
import Exams from './Components/Exams';

const ExamPage = () => {
  return (
    <PageContainer title="Exam Page" description="Active Exams">
      <PageHeading
        title="Exams"
        description="Find your assessments and prepare for what comes next."
      />
      <Exams />
    </PageContainer>
  );
};

export default ExamPage;
