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
    .map(({ url, type, detectedAt }) => ({ url, type, detectedAt }));
  return { answers, currentQuestionIndex, proctoringLog: log };
}

export function attemptDeadline(exam, now) {
  return new Date(
    Math.min(now.getTime() + exam.duration * 60000, new Date(exam.deadDate).getTime()),
  );
}
