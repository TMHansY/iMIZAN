export function validateProgress(body) {
  const { answers, currentQuestionIndex, proctoringLog = {} } = body;
  if (
    !answers ||
    typeof answers !== 'object' ||
    Array.isArray(answers) ||
    Object.values(answers).some((value) => typeof value !== 'string') ||
    !Number.isInteger(currentQuestionIndex) ||
    currentQuestionIndex < 0
  ) {
    const error = new Error('Invalid exam progress.');
    error.statusCode = 400;
    throw error;
  }
  const log = {};
  for (const key of ['noFaceCount', 'multipleFaceCount', 'cellPhoneCount', 'tabSwitchCount']) {
    const value = Number(proctoringLog?.[key] || 0);
    log[key] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }
  log.screenshots = (Array.isArray(proctoringLog?.screenshots) ? proctoringLog.screenshots : [])
    .filter(
      (s) =>
        s &&
        typeof s.url === 'string' &&
        ['noFace', 'multipleFace', 'cellPhone', 'tabSwitch'].includes(s.type),
    )
    .map(({ url, type, detectedAt, eventId, durationSeconds }) => ({
      url,
      type,
      detectedAt,
      ...(type === 'tabSwitch'
        ? {
            ...(typeof eventId === 'string' ? { eventId } : {}),
            ...(durationSeconds === null
              ? { durationSeconds: null }
              : typeof durationSeconds === 'number' &&
                Number.isFinite(durationSeconds) &&
                durationSeconds >= 0
              ? { durationSeconds }
              : {}),
          }
        : {}),
    }));
  return { answers, currentQuestionIndex, proctoringLog: log };
}

export function attemptDeadline(exam, now) {
  return new Date(
    Math.min(now.getTime() + exam.duration * 60000, new Date(exam.deadDate).getTime()),
  );
}

// Close an absence at submission/expiry even if the student never returned.
export function finalizeProctoringLog(log = {}, endedAt) {
  return {
    ...log,
    screenshots: (log.screenshots || []).map((event) => {
      if (event.type !== 'tabSwitch' || !event.eventId) return event;
      const maxDuration = Math.max(0, (new Date(endedAt) - new Date(event.detectedAt)) / 1000);
      if (!Number.isFinite(maxDuration)) return event;
      return {
        ...event,
        durationSeconds:
          event.durationSeconds == null
            ? maxDuration
            : Math.min(event.durationSeconds, maxDuration),
      };
    }),
  };
}
