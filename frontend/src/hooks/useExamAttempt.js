import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import axios from '../axios';

const messageFor = (error) =>
  error?.response?.data?.message ||
  'Unable to save exam progress. Check your connection and retry.';

export default function useExamAttempt(examId) {
  const [attempt, setAttempt] = useState(null);
  const [progress, setProgress] = useState({
    answers: {},
    currentQuestionIndex: 0,
    proctoringLog: {},
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isFinalizing, setFinalizing] = useState(false);
  const finishing = useRef(false);
  const [submitted, setSubmitted] = useState(false);
  const [isLeaving, setLeaving] = useState(false);
  const leaving = useRef(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const active = useRef(null);
  const snapshot = useRef(progress);
  const queue = useRef(Promise.resolve());
  const submitting = useRef(false);
  const autoSubmitted = useRef(false);
  const mounted = useRef(true);
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    Boolean(attempt && !submitted && currentLocation.pathname !== nextLocation.pathname),
  );

  const backup = useCallback((value) => {
    if (!active.current) return;
    try {
      sessionStorage.setItem(`imizan-attempt-${active.current._id}`, JSON.stringify(value));
    } catch {
      /* Server autosave remains available. */
    }
  }, []);

  const save = useCallback((value) => {
    const session = active.current;
    if (!session) return Promise.resolve(false);
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        if (Date.now() >= session.localDeadline) return false;
        try {
          await axios.put(`/api/users/exam-attempts/${session._id}`, value, {
            withCredentials: true,
            timeout: 15000,
          });
          if (mounted.current) setError('');
          if (snapshot.current === value) {
            try {
              sessionStorage.removeItem(`imizan-attempt-${session._id}`);
            } catch {
              /* Optional local backup. */
            }
          }
          return true;
        } catch (failure) {
          if (mounted.current) setError(messageFor(failure));
          return false;
        }
      });
    return queue.current;
  }, []);

  useEffect(() => {
    mounted.current = true;
    active.current = null;
    autoSubmitted.current = false;
    setAttempt(null);
    setLoading(true);
    setError('');
    setSubmitted(false);
    setFinalizing(false);
    finishing.current = false;
    setTimeLeft(null);
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await axios.post(
          `/api/users/exam-attempts/${examId}/start`,
          {},
          { withCredentials: true, timeout: 15000 },
        );
        if (cancelled) return;
        const session = {
          ...data.data,
          localDeadline: data.data.finishedAt
            ? Date.now()
            : Date.now() + (new Date(data.data.expiresAt) - new Date(data.serverNow)),
        };
        let hasPendingBackup = false;
        let value = {
          answers: session.answers || {},
          currentQuestionIndex: session.currentQuestionIndex || 0,
          proctoringLog: session.proctoringLog || {},
        };
        try {
          const pending = JSON.parse(sessionStorage.getItem(`imizan-attempt-${session._id}`));
          if (
            pending &&
            Date.now() < session.localDeadline &&
            pending.answers &&
            Number.isInteger(pending.currentQuestionIndex)
          ) {
            value = pending;
            hasPendingBackup = true;
          }
        } catch {
          /* Ignore an unreadable local backup and restore server progress. */
        }
        active.current = session;
        finishing.current = Boolean(session.finishedAt);
        setFinalizing(Boolean(session.finishedAt));
        snapshot.current = value;
        setProgress(value);
        setAttempt(session);
        setTimeLeft(Math.max(0, Math.ceil((session.localDeadline - Date.now()) / 1000)));
        if (hasPendingBackup && Date.now() < session.localDeadline) save(value);
      } catch (failure) {
        if (!cancelled) setError(messageFor(failure));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, [examId, save]);

  const update = useCallback(
    (change) => {
      if (
        !mounted.current ||
        !active.current ||
        submitting.current ||
        finishing.current ||
        Date.now() >= active.current.localDeadline
      )
        return;
      const value = change(snapshot.current);
      snapshot.current = value;
      setProgress(value);
      backup(value);
      save(value);
    },
    [backup, save],
  );

  const submit = useCallback(async () => {
    if (submitting.current || !active.current) return;
    submitting.current = true;
    setSubmitting(true);
    try {
      // Complete queued saves before freezing the attempt on the server.
      await queue.current;
      if (
        !finishing.current &&
        Date.now() < active.current.localDeadline &&
        !(await save(snapshot.current))
      )
        return;
      finishing.current = true;
      setFinalizing(true);
      await axios.post(
        '/api/users/results',
        { examId, attemptId: active.current._id },
        { withCredentials: true, timeout: 15000 },
      );
      try {
        sessionStorage.removeItem(`imizan-attempt-${active.current._id}`);
      } catch {
        /* Optional backup. */
      }
      if (mounted.current) {
        setSubmitted(true);
        setError('');
      }
    } catch (failure) {
      if (mounted.current) setError(messageFor(failure));
    } finally {
      submitting.current = false;
      if (mounted.current) setSubmitting(false);
    }
  }, [examId, save]);

  useEffect(() => {
    if (!attempt || submitted) return;
    const tick = () =>
      setTimeLeft(Math.max(0, Math.ceil((attempt.localDeadline - Date.now()) / 1000)));
    const timer = setInterval(tick, 1000);
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeunload', warn);
    };
  }, [attempt, submitted]);

  useEffect(() => {
    if (timeLeft === 0 && !submitted && !isSubmitting && !autoSubmitted.current) {
      autoSubmitted.current = true;
      submit();
    }
  }, [timeLeft, submitted, isSubmitting, submit]);

  const leave = async () => {
    if (submitting.current || leaving.current) return;
    leaving.current = true;
    setLeaving(true);
    try {
      if (
        !finishing.current &&
        Date.now() < active.current.localDeadline &&
        !(await save(snapshot.current))
      )
        return;
      blocker.proceed?.();
    } finally {
      leaving.current = false;
      if (mounted.current) setLeaving(false);
    }
  };
  return {
    attempt,
    progress,
    update,
    timeLeft,
    error,
    loading,
    isSubmitting,
    isFinalizing,
    isLeaving,
    submitted,
    submit,
    blocker,
    leave,
  };
}
