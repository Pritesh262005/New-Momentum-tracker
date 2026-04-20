require('dotenv').config();
const mongoose = require('mongoose');
const Subject = require('./models/Subject');
const Department = require('./models/Department');
const User = require('./models/User');
const MCQTest = require('./models/MCQTest');
const MCQAttempt = require('./models/MCQAttempt');
const configureDns = require('./config/dns');

configureDns();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

const addTestScores = async () => {
  try {
    await connectDB();

    // 1. Get a Teacher and their Department
    const teacher = await User.findOne({ role: 'TEACHER' }).populate('department');
    if (!teacher) {
      console.log('No teacher found');
      process.exit(1);
    }
    const departmentId = teacher.department._id;

    // 2. Get a Subject in that Department
    const subject = await Subject.findOne({ department: departmentId });
    if (!subject) {
      console.log('No subject found for department');
      process.exit(1);
    }

    // 3. Create a MCQTest named "Test Exam"
    const test = await MCQTest.create({
      title: 'Test Exam',
      description: 'Mid-semester assessment test',
      subject: subject._id,
      createdBy: teacher._id,
      department: departmentId,
      targetYear: subject.year,
      targetSemester: subject.semester,
      duration: 60,
      startDateTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      endDateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      questions: [
        {
          questionText: 'What is 2+2?',
          options: ['3', '4', '5', '6'],
          correctAnswer: 1,
          marks: 5,
          difficulty: 'EASY',
          explanation: 'Basic math'
        },
        {
          questionText: 'Capital of France?',
          options: ['Berlin', 'London', 'Paris', 'Madrid'],
          correctAnswer: 2,
          marks: 5,
          difficulty: 'EASY',
          explanation: 'Geography'
        }
      ],
      passingMarks: 4,
      instructions: 'Attempt all questions.',
      isPublished: true,
      showResultImmediately: true,
      allowReview: true,
      maxAttempts: 1
    });

    console.log('Created MCQTest:', test.title);

    // 4. Get some students in the same department
    const students = await User.find({ role: 'STUDENT', department: departmentId }).limit(5);

    // 5. Add MCQAttempt records with good scores
    for (const student of students) {
      const percentage = Math.floor(Math.random() * 41) + 60; // 60 to 100
      const totalMarks = test.questions.reduce((sum, q) => sum + q.marks, 0);
      const score = Math.round((percentage / 100) * totalMarks);

      await MCQAttempt.create({
        student: student._id,
        test: test._id,
        status: 'SUBMITTED',
        startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        submittedAt: new Date(),
        answers: [],
        totalScore: score,
        percentage: percentage,
        isPassed: percentage >= 40
      });
      console.log(`Added score for student ${student.name}: ${percentage}%`);
    }

    console.log('Scores added successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

addTestScores();
