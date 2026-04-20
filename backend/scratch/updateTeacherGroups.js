require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const configureDns = require('../config/dns');

const updateGroups = async () => {
  try {
    configureDns();
    await mongoose.connect(process.env.MONGODB_URI);
    
    const teacher = await User.findOne({ email: 'teacher1@almts.com' });
    if (teacher) {
      teacher.assignedYearGroups = [
        { year: 1, semesters: [1, 2] },
        { year: 2, semesters: [3, 4] },
        { year: 3, semesters: [5, 6] },
        { year: 4, semesters: [7, 8] }
      ];
      await teacher.save();
      console.log('Teacher updated! Now assigned to Years 1, 2, 3, and 4.');
    } else {
      console.log('Teacher not found.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
};

updateGroups();
