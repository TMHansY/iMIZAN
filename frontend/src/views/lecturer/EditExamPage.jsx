import React, { useEffect } from 'react';
import { Grid, Box, Card, Typography, CircularProgress } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from 'src/components/container/PageContainer';
import ExamForm from './components/ExamForm';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { useGetExamsQuery, useUpdateExamMutation } from '../../slices/examApiSlice.js';

const examValidationSchema = yup.object({
  examName: yup.string().required('Exam Name is required'),
  totalQuestions: yup
    .number()
    .typeError('Total Number of Questions must be a number')
    .integer('Total Number of Questions must be an integer')
    .positive('Total Number of Questions must be positive')
    .required('Total Number of Questions is required'),
  duration: yup
    .number()
    .typeError('Exam Duration must be a number')
    .integer('Exam Duration must be an integer')
    .min(1, 'Exam Duration must be at least 1 minute')
    .required('Exam Duration is required'),
  liveDate: yup.date().required('Live Date and Time is required'),
  deadDate: yup.date().required('Dead Date and Time is required'),
  maxAttempts: yup
    .number()
    .typeError('Maximum Attempts must be a number')
    .integer('Maximum Attempts must be an integer')
    .min(1, 'Maximum Attempts must be at least 1')
    .required('Maximum Attempts is required'),
});

// Converts an ISO date string to the format datetime-local inputs expect
const toDateTimeLocal = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
};

const EditExamPage = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { data: examsData, isLoading } = useGetExamsQuery();
  const [updateExam, { isLoading: isUpdating }] = useUpdateExamMutation();

  const currentExam = examsData?.find((exam) => exam.examId === examId);

  const formik = useFormik({
    initialValues: {
      examName: '',
      totalQuestions: '',
      duration: '',
      liveDate: '',
      deadDate: '',
      maxAttempts: 1,
      allowReview: false,
      allowBackNavigation: false,
      randomizeQuestions: false,
      randomizeOptions: false,
    },
    validationSchema: examValidationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        await updateExam({ examId, ...values }).unwrap();
        toast.success('Exam updated successfully');
        navigate('/exam');
      } catch (err) {
        toast.error(err?.data?.message || err.error || 'Failed to update exam');
      }
    },
  });

  useEffect(() => {
    if (currentExam) {
      formik.setValues({
        examName: currentExam.examName || '',
        totalQuestions: currentExam.totalQuestions || '',
        duration: currentExam.duration || '',
        liveDate: toDateTimeLocal(currentExam.liveDate),
        deadDate: toDateTimeLocal(currentExam.deadDate),
        maxAttempts: currentExam.maxAttempts || 1,
        allowReview: currentExam.allowReview || false,
        allowBackNavigation: currentExam.allowBackNavigation || false,
        randomizeQuestions: currentExam.randomizeQuestions || false,
        randomizeOptions: currentExam.randomizeOptions || false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExam]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!currentExam) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography>Exam not found.</Typography>
      </Box>
    );
  }

  return (
    <PageContainer title="Edit Exam" description="Edit an existing exam">
      <Box
        sx={{
          position: 'relative',
          '&:before': {
            content: '""',
            background: 'radial-gradient(#d2f1df, #d3d7fa, #bad8f4)',
            backgroundSize: '400% 400%',
            animation: 'gradient 15s ease infinite',
            position: 'absolute',
            height: '100%',
            width: '100%',
            opacity: '0.3',
          },
        }}
      >
        <Grid container spacing={0} justifyContent="center" sx={{ height: '100vh' }}>
          <Grid
            item
            xs={12}
            sm={12}
            lg={12}
            xl={6}
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            <Card elevation={9} sx={{ p: 4, zIndex: 1, width: '100%', maxWidth: '800px' }}>
              <ExamForm
                formik={formik}
                submitLabel="Update Exam"
                title={
                  <Typography variant="h3" textAlign="center" color="textPrimary" mb={1}>
                    Edit Exam
                  </Typography>
                }
              />
            </Card>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default EditExamPage;
