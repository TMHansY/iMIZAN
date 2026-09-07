import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { IconButton, Stack, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DeleteIcon from '../../lecturer/components/DeleteIcon';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import EditIcon from '@mui/icons-material/Edit';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import QuizIcon from '@mui/icons-material/Quiz';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SchoolIcon from '@mui/icons-material/School';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import EditNoteIcon from '@mui/icons-material/EditNote';

const cardIcons = [MenuBookIcon, QuizIcon, AssignmentIcon, SchoolIcon, FactCheckIcon, EditNoteIcon];
const cardColors = ['#5C6BC0', '#26A69A', '#EF5350', '#AB47BC', '#FFA726', '#42A5F5', '#66BB6A'];

// Deterministic pick based on examId, so each exam always shows the same icon/color
const pickFromId = (id, arr) => {
  const hash = (id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return arr[hash % arr.length];
};

export default function ExamCard({ exam }) {
  const { examName, duration, totalQuestions, examId, liveDate, deadDate } = exam;
  const { userInfo } = useSelector((state) => state.auth);
  const isLecturer = userInfo?.role === 'lecturer';

  const navigate = useNavigate();
  const isExamActive = true;

  const Icon = pickFromId(examId, cardIcons);
  const iconBgColor = pickFromId(examId + 'color', cardColors);

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
        <Box
          sx={{
            height: 140,
            bgcolor: iconBgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease',
            '&:hover': { transform: 'scale(1.03)' },
          }}
        >
          <Icon sx={{ fontSize: 64, color: 'white' }} />
        </Box>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography gutterBottom variant="h5" component="div">
              {examName}
            </Typography>
            {/* Edit/Delete icons at the right end - only show for lecturers */}
            {isLecturer && (
              <Stack direction="row" spacing={0.5}>
                <IconButton
                  aria-label="edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/edit-exam/${examId}`);
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <DeleteIcon examId={examId} />
              </Stack>
            )}
            
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
