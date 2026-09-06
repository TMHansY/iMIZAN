import React from 'react';
import { Grid, Box, Card, Typography } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import ExamForm from './components/ExamForm';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useCreateExamMutation } from '../../slices/examApiSlice.js';

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

const CreateExamPage = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const [createExam, { isLoading }] = useCreateExamMutation();

  const initialExamValues = {
    examName: '',
    totalQuestions: '',
    duration: '',
    liveDate: '',
    deadDate: '',
    maxAttempts: 1,
  };

  const handleSubmit = async (values) => {
    try {
      const examResponse = await createExam(values).unwrap();
      if (examResponse) {
        toast.success('Exam created successfully');
        formik.resetForm();
      }
    } catch (err) {
      console.error('Exam Creation Error:', err);
      toast.error(err?.data?.message || err.error || 'Failed to create exam');
    }
  };

  const formik = useFormik({
    initialValues: initialExamValues,
    validationSchema: examValidationSchema,
    onSubmit: handleSubmit,
  });

  return (
    <PageContainer title="Create Exam" description="Create a new exam">
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
                title={
                  <Typography variant="h3" textAlign="center" color="textPrimary" mb={1}>
                    Create Exam
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

export default CreateExamPage;
