import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

const LecturerRoute = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const isLecturer = userInfo.role === 'lecturer';

  return isLecturer ? <Outlet /> : <Navigate to="/dashboard" replace />;
};
export default LecturerRoute;
