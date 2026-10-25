// Theme Provider
import { ColorModeProvider, useColorMode } from './context/ColorModeContext';
import { useEffect } from 'react';
// Router Provider
import { RouterProvider } from 'react-router-dom';
import Router from './routes/Router';

// Redux Provider
import { Provider } from 'react-redux';
import store from './store';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from './slices/authSlice';
// Tostify
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// Cheating Log Provider
import { CheatingLogProvider } from './context/CheatingLogContext';

function SessionExpiryHandler() {
  const dispatch = useDispatch();
  const { userInfo, sessionExpiresAt } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!userInfo || !sessionExpiresAt) return undefined;

    const remaining = Date.parse(sessionExpiresAt) - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) {
      dispatch(logout());
      return undefined;
    }

    const timeoutId = window.setTimeout(() => dispatch(logout()), remaining);
    return () => window.clearTimeout(timeoutId);
  }, [dispatch, sessionExpiresAt, userInfo]);

  return null;
}

function AppContent() {
  const { mode } = useColorMode();
  return (
    <>
      <Provider store={store}>
        <CheatingLogProvider>
          <SessionExpiryHandler />
          <ToastContainer theme={mode} />
          <RouterProvider router={Router} />
        </CheatingLogProvider>
      </Provider>
    </>
  );
}

export default function App() {
  return (
    <ColorModeProvider>
      <AppContent />
    </ColorModeProvider>
  );
}
