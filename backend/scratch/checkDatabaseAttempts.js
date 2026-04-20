require('dotenv').config();
const mongoose = require('mongoose');
const MCQAttempt = require('../models/MCQAttempt');
const MCQTest = require('../models/MCQTest');
const User = require('../models/User');
const Department = require('../models/Department');
const Subject = require('../models/Subject');
const configureDns = require('../config/dns');

async function checkAttempts() {
  try {
    configureDns();
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const attemptsCount = await MCQAttempt.countDocuments();
    console.log(`Total MCQ attempts in database: ${attemptsCount}`);

    const lastAttempts = await MCQAttempt.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('student', 'name email')
      .populate('test', 'title');

    console.log('\nLast 5 attempts:');
    lastAttempts.forEach(a => {
      console.log(`- Student: ${a.student?.name} (${a.student?.email}), Test: ${a.test?.title}, Status: ${a.status}, Created: ${a.createdAt}`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
  }
}

checkAttempts();
