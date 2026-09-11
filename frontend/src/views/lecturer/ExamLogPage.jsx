import React from 'react';
import { Typography } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import CheatingTable from './components/CheatingTable';

const ExamLogPage = () => {
  return (
    <PageContainer title="Exam Log Page" description="this is Exam Log page">
      <DashboardCard title="Exam Log Page">
        <Typography>This is a Exam Log page</Typography>
        <CheatingTable />
      </DashboardCard>
    </PageContainer>
  );
};

export default ExamLogPage;
