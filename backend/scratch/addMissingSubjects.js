require('dotenv').config();
const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const Department = require('../models/Department');
const configureDns = require('../config/dns');

const addMissingSubjects = async () => {
  try {
    configureDns();
    await mongoose.connect(process.env.MONGODB_URI);
    const dept = await Department.findOne({ code: 'CSE' });
    if (dept) {
      await Subject.updateOne(
        { code: 'CSE103' },
        { $set: { name: 'Discrete Mathematics', department: dept._id, credits: 4, year: 1, semester: 2 } },
        { upsert: true }
      );
      await Subject.updateOne(
        { code: 'CSE203' },
        { $set: { name: 'Computer Networks', department: dept._id, credits: 4, year: 2, semester: 4 } },
        { upsert: true }
      );
      console.log('Subjects for Semester 2 and 4 added!');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};

addMissingSubjects();
