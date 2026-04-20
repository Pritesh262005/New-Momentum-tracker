require('dotenv').config();
const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const User = require('../models/User');
const configureDns = require('../config/dns');

configureDns();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

const clampYear = (year) => {
  const value = Number(year);
  return Number.isInteger(value) && value >= 1 && value <= 4 ? value : null;
};
const clampSemester = (semester) => {
  const value = Number(semester);
  return Number.isInteger(value) && value >= 1 && value <= 8 ? value : null;
};

const sanitizeAssignedYearGroups = (groups) => (
  Array.isArray(groups) ? groups : []
).map((group) => ({
  year: clampYear(group?.year),
  semesters: Array.isArray(group?.semesters)
    ? [...new Set(group.semesters.map((semester) => clampSemester(semester)).filter(Boolean))]
    : []
})).filter((group) => group.year);

const teacherYearGroups = (user) => sanitizeAssignedYearGroups(user?.assignedYearGroups);

const buildTeacherYearSemesterMongoFilter = (user, prefix = '') => {
  const groups = teacherYearGroups(user);
  if (groups.length === 0) return {};

  const yearKey = prefix ? `${prefix}.year` : 'year';
  const semesterKey = prefix ? `${prefix}.semester` : 'semester';

  return {
    $or: groups.map((group) => (
      group.semesters.length > 0
        ? { [yearKey]: group.year, [semesterKey]: { $in: group.semesters } }
        : { [yearKey]: group.year }
    ))
  };
};

const test = async () => {
  await connectDB();
  const teacher = await User.findOne({ email: 'teacher1@almts.com' });
  console.log('Teacher:', teacher.name, 'Dept:', teacher.department);
  console.log('Groups:', teacher.assignedYearGroups);

  const filter = {
    department: teacher.department,
    ...buildTeacherYearSemesterMongoFilter(teacher)
  };
  filter.year = 1;
  filter.semester = 1;

  console.log('Filter:', JSON.stringify(filter, null, 2));

  const subjects = await Subject.find(filter);
  console.log('Subjects found:', subjects.map(s => s.name));
  process.exit(0);
};

test();
