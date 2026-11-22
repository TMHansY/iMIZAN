import Course from "../models/courseModel.js";

const isCourseHiddenFromEveryone = async (courseId) => {
  if (!courseId) return false;
  const course = await Course.findOne({ courseId }).select("hideFromEveryone");
  return course?.hideFromEveryone === true;
};

export default isCourseHiddenFromEveryone;
