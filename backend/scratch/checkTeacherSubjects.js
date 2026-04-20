require('dotenv').config();
const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const User = require('../models/User');
const configureDns = require('../config/dns');

const test = async () => {
  configureDns();
  await mongoose.connect(process.env.MONGODB_URI);
  
  const teacher = await User.findOne({ email: 'teacher1@almts.com' });
  if (!teacher) {
    console.log('Teacher not found');
    process.exit(1);
  }

  console.log('Teacher:', teacher.name, 'Role:', teacher.role, 'Dept:', teacher.department);
  console.log('Assigned Groups:', JSON.stringify(teacher.assignedYearGroups));

  const subjects = await Subject.find({ department: teacher.department });
  console.log('\nAll Subjects in Dept:', subjects.map(s => `${s.name} (Y${s.year} S${s.semester})`).join(', '));

  process.exit(0);
};

test();
