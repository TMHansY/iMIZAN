import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { IconButton, Stack, Box, Button } from '@mui/material';
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
// Deterministic pick based on examId, so each exam always shows the same icon
const pickFromId = (id, arr) => {
  const hash = (id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return arr[hash % arr.length];
};

export default function ExamCard({ exam }) {
  const { examName, duration, totalQuestions, examId } = exam;
  const { userInfo } = useSelector((state) => state.auth);
  const isLecturer = userInfo?.role === 'lecturer';

  const navigate = useNavigate();
  const isExamActive = true;

  const Icon = pickFromId(examId, cardIcons);

  const handleCardClick = () => {
    if (isLecturer) {
      toast.error('You are a lecturer, you cannot take this exam');
    }
    if (isExamActive && !isLecturer) {
      navigate(`/exam/${examId}`);
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            m: 2.5,
            mb: 0,
            borderRadius: 2,
            bgcolor: 'primary.light',
            color: 'primary.main',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Icon sx={{ fontSize: 26 }} />
        </Box>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', flex: 1, p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
            <Typography
              gutterBottom
              variant="h5"
              component="div"
              title={examName}
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                wordBreak: 'break-word',
              }}
            >
              {examName}
            </Typography>
            {/* Edit/Delete icons at the right end - only show for lecturers */}
            {isLecturer && (
              <Stack direction="row" spacing={0.5} flexShrink={0}>
                <IconButton
                  aria-label="edit"
                  size="small"
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
            Multiple choice assessment
          </Typography>

          <Stack
            direction="row"
            flexWrap="wrap"
            gap={1}
            alignItems="center"
            justifyContent="space-between"
            mt={2}
            mb={2}
          >
            <Typography variant="h6">{totalQuestions} questions</Typography>
            <Typography color="textSecondary">{duration} min</Typography>
          </Stack>
          {!isLecturer && (
            <Button variant="outlined" fullWidth onClick={handleCardClick} sx={{ mt: 'auto' }}>
              View exam
            </Button>
          )}
        </CardContent>
      </Box>
    </Card>
  );
}
