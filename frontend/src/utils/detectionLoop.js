// Schedule from completion, rather than allowing slow inference calls to overlap.
export function startDetectionLoop(detect, onError, interval = 1000) {
  let stopped = false;
  let timer;
  const isActive = () => !stopped;
  const tick = async () => {
    try {
      if (!stopped) await detect(isActive);
    } catch (error) {
      if (!stopped) onError(error);
    } finally {
      if (!stopped) timer = setTimeout(tick, interval);
    }
  };
  timer = setTimeout(tick, 0);
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
