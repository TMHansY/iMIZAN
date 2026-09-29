import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Header from './header/Header';

const ExamLayout = () => (
  <Box>
    <Header />
    <Outlet />
  </Box>
);

export default ExamLayout;
