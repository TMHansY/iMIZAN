import { useEffect, useRef } from 'react';

// Store the event before uploading so a slow/failed upload cannot lose the flag.
export default function useTabInactivity({
  cheatingLog,
  incrementViolation,
  updateViolation,
  capture,
}) {
  const callbacks = useRef();
  callbacks.current = { incrementViolation, updateViolation, capture };
  const initialLog = useRef(cheatingLog);

  useEffect(() => {
    let active = true;
    let period = null;
    let cursorOutside = false;
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    const upload = async (event, isRetry = false) => {
      if (event.uploading || event.uploaded) return;
      event.uploading = true;
      const screenshot = await callbacks.current.capture('tabSwitch', event.detectedAt);
      event.uploading = false;
      if (active && screenshot) {
        event.uploaded = true;
        callbacks.current.updateViolation(event.eventId, { url: screenshot.url });
      } else if (active && !document.hidden && period !== event && !isRetry) {
        upload(event, true);
      }
    };
    const finish = () => {
      if (!period) return;
      const event = period;
      period = null;
      callbacks.current.updateViolation(event.eventId, {
        durationSeconds: Math.max(0, (Date.now() - new Date(event.detectedAt).getTime()) / 1000),
      });
      // Some browsers pause the camera while hidden; retry once it is visible.
      upload(event);
    };
    const sync = () => {
      if (document.hidden || cursorOutside) {
        if (period) return;
        period = {
          eventId: crypto.randomUUID(),
          type: 'tabSwitch',
          detectedAt: new Date().toISOString(),
          durationSeconds: null,
          url: '',
        };
        callbacks.current.incrementViolation('tabSwitch', { ...period });
        upload(period);
      } else {
        finish();
      }
    };
    const visibility = () => {
      // Returning to the tab ends the absence even if mouseenter was not fired.
      if (!document.hidden) cursorOutside = false;
      sync();
    };
    const leave = (event) => {
      if (event.relatedTarget) return;
      cursorOutside = true;
      sync();
    };
    const enter = () => {
      cursorOutside = false;
      sync();
    };
    const pending = initialLog.current?.screenshots?.find(
      (event) => event.type === 'tabSwitch' && event.eventId && event.durationSeconds == null,
    );
    if (pending) {
      period = { ...pending, uploaded: Boolean(pending.url) };
    }
    sync();
    document.addEventListener('visibilitychange', visibility);
    if (!isTouchDevice) {
      document.addEventListener('mouseleave', leave);
      document.addEventListener('mouseenter', enter);
    }
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('mouseleave', leave);
      document.removeEventListener('mouseenter', enter);
    };
  }, []);
}
