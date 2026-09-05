import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import { CardActionArea, IconButton, Stack, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DeleteIcon from '../../lecturer/components/DeleteIcon';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';

const imgUrl =
  'https://images.unsplash.com/photo-1555949963-aa79dcee981c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjB8fGNvbXB1dGVyJTIwc2NpZW5jZXxlbnwwfHwwfHx8MA%3D%3D&w=1000&q=80';

export default function ExamCard({ exam }) {
  const { examName, duration, totalQuestions, examId, liveDate, deadDate } = exam;
  const { userInfo } = useSelector((state) => state.auth);
  const isLecturer = userInfo?.role === 'lecturer';

  const navigate = useNavigate();
  const isExamActive = true;

  const handleCardClick = () => {
    if (isLecturer) {
      toast.error('You are a lecturer, you cannot take this exam');
    }
    if (isExamActive && !isLecturer) {
      navigate(`/exam/${examId}`);
    }
  };

  return (
    <Card>
      <Box onClick={handleCardClick} sx={{ cursor: 'pointer' }}>
        <CardMedia component="img" height="140" image={imgUrl} alt="Exam" />
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography gutterBottom variant="h5" component="div">
              {examName}
            </Typography>
            {/* Delete icon at the right end - only show for lecturers */}
            {isLecturer && <DeleteIcon examId={examId} />}
            
          </Stack>

          <Typography variant="body2" color="text.secondary">
            MCQ
          </Typography>

          <Stack direction="row" alignItems="center" justifyContent="space-between" mt={1}>
            <Typography variant="h6">{totalQuestions} ques</Typography>
            <Typography color="textSecondary">{duration}</Typography>
          </Stack>
        </CardContent>
      </Box>
    </Card>
  );
}
