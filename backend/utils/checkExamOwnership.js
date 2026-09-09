// A lecturer can access an exam if they created it, or if the exam predates
// the createdBy field (legacy exams, accessible to any lecturer).
const isExamOwner = (exam, user) => {
  if (!exam) return false;
  if (user.role !== "lecturer") return false;
  if (!exam.createdBy) return true;
  return exam.createdBy.toString() === user._id.toString();
};

export default isExamOwner;