import { useEffect, useSyncExternalStore } from 'react';
import {
  getProctoringSnapshot,
  subscribeToProctoring,
  prepareProctoringModels,
} from '../utils/proctoringModels';

export default function useProctoringModels(enabled = true) {
  const state = useSyncExternalStore(subscribeToProctoring, getProctoringSnapshot);
  const retry = () => prepareProctoringModels().catch(() => {});
  useEffect(() => {
    if (enabled) prepareProctoringModels().catch(() => {});
  }, [enabled]);
  return { ...state, retry };
}
