import React from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';

const CreateExam = ({ formik, title, subtitle, subtext, submitLabel = 'Create Exam' }) => {
  const { values, errors, touched, handleBlur, handleChange, handleSubmit, setFieldValue } = formik;

  return (
    <>
      {title ? (
        <Typography fontWeight="700" variant="h2" mb={1}>
          {title}
        </Typography>
      ) : null}

      {subtext}

      <Box component="form">
        <Stack mb={3}>
          <CustomTextField
            id="examName"
            name="examName"
            label="Exam Name"
            variant="outlined"
            fullWidth
            value={values.examName}
            onChange={handleChange}
            error={touched.examName && Boolean(errors.examName)}
            helperText={touched.examName && errors.examName}
          />
        </Stack>

        <Stack mb={3}>
          <CustomTextField
            id="totalQuestions"
            name="totalQuestions"
            label="Total Number of Questions"
            variant="outlined"
            fullWidth
            value={values.totalQuestions}
            onChange={handleChange}
            error={touched.totalQuestions && Boolean(errors.totalQuestions)}
            helperText={touched.totalQuestions && errors.totalQuestions}
          />
        </Stack>

        <Stack mb={3}>
          <CustomTextField
            id="duration"
            name="duration"
            label="Exam Duration (minutes)"
            variant="outlined"
            fullWidth
            value={values.duration}
            onChange={handleChange}
            error={touched.duration && Boolean(errors.duration)}
            helperText={touched.duration && errors.duration}
          />
        </Stack>

        <Stack mb={3}>
          <CustomTextField
            id="maxAttempts"
            name="maxAttempts"
            label="Maximum Attempts Allowed"
            variant="outlined"
            fullWidth
            value={values.maxAttempts}
            onChange={handleChange}
            error={touched.maxAttempts && Boolean(errors.maxAttempts)}
            helperText={touched.maxAttempts && errors.maxAttempts}
          />
        </Stack>

        <Stack mb={3}>
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(values.allowReview)}
                onChange={(e) => setFieldValue('allowReview', e.target.checked)}
              />
            }
            label="Allow students to review their answers after the exam"
          />
        </Stack>

        <Stack mb={3}>
          <CustomTextField
            id="liveDate"
            name="liveDate"
            label="Live Date and Time"
            type="datetime-local"
            variant="outlined"
            fullWidth
            value={values.liveDate}
            onChange={handleChange}
            error={touched.liveDate && Boolean(errors.liveDate)}
            helperText={touched.liveDate && errors.liveDate}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Stack>

        <Stack mb={3}>
          <CustomTextField
            id="deadDate"
            name="deadDate"
            label="Dead Date and Time"
            type="datetime-local"
            variant="outlined"
            fullWidth
            value={values.deadDate}
            onChange={handleChange}
            error={touched.deadDate && Boolean(errors.deadDate)}
            helperText={touched.deadDate && errors.deadDate}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Stack>

        <Button
          color="primary"
          variant="contained"
          size="large"
          fullWidth
          type="submit"
          disabled={formik.isSubmitting}
          onClick={handleSubmit}
        >
          {submitLabel}
        </Button>
      </Box>

      {subtitle}
    </>
  );
};

export default CreateExam;
