import React, { lazy } from 'react';
import { Navigate, Route, createBrowserRouter, createRoutesFromElements } from 'react-router-dom';
import Loadable from '../layouts/full/shared/loadable/Loadable';
import { useSelector } from 'react-redux';

/* ***Layouts**** */
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const ExamLayout = Loadable(lazy(() => import('../layouts/full/ExamLayout')));

/* ****Pages***** */
// const Dashboard = Loadable(lazy(() => import('../views/dashboard/Dashboard')));
const SamplePage = Loadable(lazy(() => import('../views/sample-page/SamplePage')));
const Success = Loadable(lazy(() => import('../views/Success')));

// const Icons = Loadable(lazy(() => import('../views/icons/Icons')));
// const TypographyPage = Loadable(lazy(() => import('../views/utilities/TypographyPage')));
// const Shadow = Loadable(lazy(() => import('../views/utilities/Shadow')));
//Student Routes

const TestPage = Loadable(lazy(() => import('./../views/student/TestPage')));
const ExamPage = Loadable(lazy(() => import('./../views/student/ExamPage')));
const Dashboard = Loadable(lazy(() => import('./../views/Dashboard')));
const ExamDetails = Loadable(lazy(() => import('./../views/student/ExamDetails')));
const ResultPage = Loadable(lazy(() => import('./../views/student/ResultPage')));
const ReviewPage = Loadable(lazy(() => import('./../views/student/ReviewPage')));
//Auth Routes
const Error = Loadable(lazy(() => import('../views/authentication/Error')));
const Register = Loadable(lazy(() => import('../views/authentication/Register')));
const Login = Loadable(lazy(() => import('../views/authentication/Login')));
const UserAccount = Loadable(lazy(() => import('../views/authentication/UserAccount')));
const MyTasksPage = Loadable(lazy(() => import('../views/user/MyTasksPage')));

// Lecturer Routes
const CreateExamPage = Loadable(lazy(() => import('./../views/lecturer/CreateExamPage')));
const EditExamPage = Loadable(lazy(() => import('./../views/lecturer/EditExamPage')));
const ExamLogPage = Loadable(lazy(() => import('./../views/lecturer/ExamLogPage')));
const AddQuestions = Loadable(lazy(() => import('./../views/lecturer/AddQuestions')));
const PrivateRoute = Loadable(lazy(() => import('src/views/authentication/PrivateRoute')));
const LecturerRoute = Loadable(lazy(() => import('src/views/authentication/LecturerRoute')));
const AdminRoute = Loadable(lazy(() => import('src/views/authentication/AdminRoute')));
const PendingApprovals = Loadable(lazy(() => import('../views/admin/PendingApprovals')));
const AccountManagement = Loadable(lazy(() => import('../views/admin/AccountManagement')));
const SystemStats = Loadable(lazy(() => import('../views/admin/SystemStats')));

const Router = createBrowserRouter(
  createRoutesFromElements(
    // Every router we create will now go in here as
    // they going to be child of our main App component
    <>
      {/* // Private Routes */}
      <Route path="" element={<PrivateRoute />} errorElement={<Error />}>
        {/* // Main layout */}
        <Route path="/" element={<FullLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" exact={true} element={<Dashboard />} />
          <Route path="/sample-page" exact={true} element={<SamplePage />} />
          <Route path="/Success" exact={true} element={<Success />} />
          <Route path="/exam" exact={true} element={<ExamPage />} />
          <Route path="/result" exact={true} element={<ResultPage />} />
          <Route path="/review/:resultId" exact={true} element={<ReviewPage />} />
          <Route path="" element={<LecturerRoute />}>
            <Route path="/create-exam" exact={true} element={<CreateExamPage />} />
            <Route path="/edit-exam/:examId" exact={true} element={<EditExamPage />} />
            <Route path="/add-questions" exact={true} element={<AddQuestions />} />
            <Route path="/exam-log" exact={true} element={<ExamLogPage />} />
          </Route>
          <Route path="" element={<AdminRoute />}>
            <Route path="/admin/approvals" exact={true} element={<PendingApprovals />} />
            <Route path="/admin/accounts" exact={true} element={<AccountManagement />} />
            <Route path="/admin/stats" exact={true} element={<SystemStats />} />
          </Route>
        </Route>
        <Route path="/" element={<ExamLayout />}>
          <Route path="exam/:examId" exact={true} element={<ExamDetails />} />
          <Route path="exam/:examId/:testId" exact={true} element={<TestPage />} />
        </Route>
      </Route>
      {/* User layout */}
      <Route path="/user" element={<FullLayout />}>
        <Route path="account" exact={true} element={<UserAccount />} />
        <Route path="tasks" exact={true} element={<MyTasksPage />} />
      </Route>

      {/* Authentication layout */}
      <Route path="/auth" element={<BlankLayout />}>
        <Route path="404" element={<Error />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/auth/login" element={<Login />} />
        {/* <Route path="*" element={<Navigate to="/auth/404" />} /> */}
      </Route>
    </>,
  ),
);

export default Router;
