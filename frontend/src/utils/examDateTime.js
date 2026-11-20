const toISOStringIfValid = (value) => {
  if (!value) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
};

export const serializeExamDateTimes = (values) => ({
  ...values,
  liveDate: toISOStringIfValid(values.liveDate),
  deadDate: toISOStringIfValid(values.deadDate),
  sectionSchedules: (values.sectionSchedules || []).map((schedule) => ({
    ...schedule,
    liveDate: toISOStringIfValid(schedule.liveDate),
    deadDate: toISOStringIfValid(schedule.deadDate),
  })),
});
