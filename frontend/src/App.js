// Theme Provider
import { ColorModeProvider, useColorMode } from './context/ColorModeContext';
// Router Provider
import { RouterProvider } from 'react-router-dom';
import Router from './routes/Router';

// Redux Provider
import { Provider } from 'react-redux';
import store from './store';
// Tostify
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// Cheating Log Provider
import { CheatingLogProvider } from './context/CheatingLogContext';

function AppContent() {
  const { mode } = useColorMode();
  return (
    <>
      <Provider store={store}>
        <CheatingLogProvider>
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
