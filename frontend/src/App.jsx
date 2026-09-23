import { CheatingLogProvider, useCheatingLog } from './context/CheatingLogContext';

function App() {
  const { cheatingLog, updateCheatingLog, resetCheatingLog } = useCheatingLog();

  return <CheatingLogProvider></CheatingLogProvider>;
}

export default App;
