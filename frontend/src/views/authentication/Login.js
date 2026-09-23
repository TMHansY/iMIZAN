import AuthLayout from './AuthLayout';
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stack, Typography } from '@mui/material';

import PageContainer from 'src/components/container/PageContainer';
import AuthLogin from './auth/AuthLogin';

import { useFormik } from 'formik';
import * as yup from 'yup';

import { useDispatch, useSelector } from 'react-redux';

import { useLoginMutation } from './../../slices/usersApiSlice';

import { setCredentials } from './../../slices/authSlice';
import { toast } from 'react-toastify';
import Loader from './Loader';

const userValidationSchema = yup.object({
  identifier: yup.string().required('Email or ID Number is required'),
  password: yup
    .string('Enter your password')
    .min(2, 'Password should be of minimum 8 characters length')
    .required('Password is required'),
});
const initialUserValues = {
  identifier: '',
  password: '',
};

const Login = () => {
  const formik = useFormik({
    initialValues: initialUserValues,
    validationSchema: userValidationSchema,
    onSubmit: (values, action) => {
      handleSubmit(values);
    },
  });

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [login, { isLoading }] = useLoginMutation();

  const { userInfo } = useSelector((state) => state.auth);

  useEffect(() => {
    if (userInfo) {
      navigate('/');
    }
  }, [navigate, userInfo]);

  const handleSubmit = async ({ identifier, password }) => {
    try {
      const res = await login({ identifier, password }).unwrap();

      dispatch(setCredentials({ ...res }));
      formik.resetForm();

      const redirectLocation = JSON.parse(localStorage.getItem('redirectLocation'));
      if (redirectLocation) {
        localStorage.removeItem('redirectLocation');
        navigate(redirectLocation.pathname);
      } else {
        navigate('/');
      }
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  return (
    <PageContainer title="Login" description="this is Login page">
      <AuthLayout title="Welcome back" description="Sign in to your examination workspace.">
        <AuthLogin
          formik={formik}
          subtitle={
            <Stack
              direction="row"
              spacing={1}
              justifyContent="center"
              flexWrap="wrap"
              useFlexGap
              mt={3}
            >
              <Typography color="textSecondary" variant="h6" fontWeight="500">
                New to iMIZAN?
              </Typography>
              <Typography
                component={Link}
                to="/auth/register"
                fontWeight="500"
                sx={{
                  textDecoration: 'none',
                  color: 'primary.main',
                }}
              >
                Create an account
              </Typography>
              {isLoading && <Loader />}
            </Stack>
          }
        />
      </AuthLayout>
    </PageContainer>
  );
};

export default Login;
