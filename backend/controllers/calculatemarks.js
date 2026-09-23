const calculateMarks = (questions, userResponses) => {
  let totalMarks = 0;

  questions.forEach((question, index) => {
    const userAnswer = userResponses[index];

    const correctOption = question.options.find((option) => option.isCorrect);

    if (correctOption && correctOption.optionText === userAnswer) {
      totalMarks += question.ansmarks;
    }
  });

  return totalMarks;
};
