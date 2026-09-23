import AuthLayout from './AuthLayout';
import React, { useEffect } from 'react';
import { Typography, Stack } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import PageContainer from 'src/components/container/PageContainer';
import AuthRegister from './auth/AuthRegister';
import { useFormik } from 'formik';
import * as yup from 'yup';

import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useRegisterMutation } from './../../slices/usersApiSlice';
import Loader from './Loader';

const userValidationSchema = yup.object({
  name: yup.string().min(2).max(25).required('Please enter your name'),
  email: yup.string('Enter your email').email('Enter a valid email').required('Email is required'),
  idNumber: yup.string().required('Matric/Staff Number is required'),
  password: yup
    .string('Enter your password')
    .min(6, 'Password should be of minimum 6 characters length')
    .required('Password is required'),
  confirm_password: yup
    .string()
    .required('Confirm Password is required')
    .oneOf([yup.ref('password'), null], 'Password must match'),
  role: yup.string().oneOf(['student', 'lecturer'], 'Invalid role').required('Role is required'),
});
const initialUserValues = {
  name: '',
  email: '',
  idNumber: '',
  password: '',
  confirm_password: '',
  role: 'student',
};

const Register = () => {
  const formik = useFormik({
    initialValues: initialUserValues,
    validationSchema: userValidationSchema,
    onSubmit: (values, action) => {
      handleSubmit(values);
    },
  });

  const navigate = useNavigate();

  const [register, { isLoading }] = useRegisterMutation();

  const { userInfo } = useSelector((state) => state.auth);

  useEffect(() => {
    if (userInfo) {
      navigate('/');
    }
  }, [navigate, userInfo]);

  const handleSubmit = async ({ name, email, idNumber, password, confirm_password, role }) => {
    if (password !== confirm_password) {
      toast.error('Passwords do not match');
    } else {
      try {
        await register({ name, email, idNumber, password, role }).unwrap();
        formik.resetForm();

        toast.success(
          'Account created! Please wait for an admin to approve your account before logging in.',
        );
        navigate('/auth/login');
      } catch (err) {
        toast.error(err?.data?.message || err.error);
      }
    }
  };

  return (
    <PageContainer title="Register" description="this is Register page">
      <AuthLayout title="Create your account" description="Join your learning community on iMIZAN.">
        <AuthRegister
          formik={formik}
          onSubmit={handleSubmit}
          subtitle={
            <Stack
              direction="row"
              justifyContent="center"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              mt={3}
            >
              <Typography color="textSecondary" variant="h6" fontWeight="400">
                Already have an Account?
              </Typography>
              <Typography
                component={Link}
                to="/auth/login"
                fontWeight="500"
                sx={{
                  textDecoration: 'none',
                  color: 'primary.main',
                }}
              >
                Sign In
              </Typography>
              {isLoading && <Loader />}
            </Stack>
          }
        />
      </AuthLayout>
    </PageContainer>
  );
};
export default Register;
