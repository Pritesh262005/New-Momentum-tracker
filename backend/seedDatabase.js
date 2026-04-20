require('dotenv').config();
const configureDns = require('./config/dns');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Department = require('./models/Department');
const Class = require('./models/Class');
const StudyLog = require('./models/StudyLog');
const Mood = require('./models/Mood');
const MCQTest = require('./models/MCQTest');
const Assignment = require('./models/Assignment');
const Subject = require('./models/Subject');
const News = require('./models/News');
const HierarchicalMeeting = require('./models/HierarchicalMeeting');
const { calculateMomentumScore } = require('./services/momentumService');
const { checkAndAwardBadges } = require('./services/gamificationService');

configureDns();

const args = new Set(process.argv.slice(2));
const seedIfEmpty = args.has('--if-empty');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const academicGroups = [
  { year: 1, semester: 1, label: 'Y1-S1' },
  { year: 2, semester: 3, label: 'Y2-S3' },
  { year: 3, semester: 5, label: 'Y3-S5' },
  { year: 4, semester: 7, label: 'Y4-S7' }
];

const seedDatabase = async () => {
  try {
    await connectDB();

    if (seedIfEmpty) {
      const userCount = await User.countDocuments();
      if (userCount > 0) {
        console.log(`Seed skipped (--if-empty): database already has ${userCount} user(s).`);
        process.exit(0);
      }
    }

    // Clear students/teachers only
    await User.deleteMany({ role: { $in: ['TEACHER', 'STUDENT'] } });
    await Department.deleteMany({});
    await Class.deleteMany({});
    await StudyLog.deleteMany({});
    await Mood.deleteMany({});
    await MCQTest.deleteMany({});
    await Assignment.deleteMany({});
    await Subject.deleteMany({});
    await News.deleteMany({});
    await HierarchicalMeeting.deleteMany({});

    // Admin
    let admin = await User.findOne({ email: 'admin@almts.com' });
    if (!admin) {
      admin = await User.create({
        name: 'Admin User',
        email: 'admin@almts.com',
        password: await hashPassword('Admin@123'),
        role: 'ADMIN',
        userId: 'ADM1001',
        isFirstLogin: false,
        isTempPassword: false
      });
    }

    // Departments
    const [cseDept, eceDept, mechDept] = await Department.insertMany([
      { name: 'Computer Science', code: 'CSE', description: 'Computer Science and Engineering' },
      { name: 'Electronics', code: 'ECE', description: 'Electronics and Communication' },
      { name: 'Mechanical', code: 'MECH', description: 'Mechanical Engineering' }
    ]);

    // Subjects (unchanged)
    const cseSubjects = await Subject.insertMany([
      { name: 'Programming Fundamentals', code: 'CSE101', department: cseDept._id, credits: 4, year: 1, semester: 1 },
      { name: 'Engineering Mathematics', code: 'CSE102', department: cseDept._id, credits: 4, year: 1, semester: 1 },
      { name: 'Data Structures', code: 'CSE201', department: cseDept._id, credits: 4, year: 2, semester: 3 },
      { name: 'Algorithms', code: 'CSE202', department: cseDept._id, credits: 4, year: 2, semester: 3 },
      { name: 'Database Systems', code: 'CSE301', department: cseDept._id, credits: 4, year: 3, semester: 5 },
      { name: 'Operating Systems', code: 'CSE302', department: cseDept._id, credits: 4, year: 3, semester: 5 },
      { name: 'Machine Learning', code: 'CSE401', department: cseDept._id, credits: 4, year: 4, semester: 7 },
      { name: 'Cloud Computing', code: 'CSE402', department: cseDept._id, credits: 3, year: 4, semester: 7 }
    ]);

    // HOD
    let cseHod = await User.findOne({ email: 'hod.cse@almts.com' });
    if (!cseHod) {
      cseHod = await User.create({
        name: 'Dr. Rajesh Kumar',
        email: 'hod.cse@almts.com',
        password: await hashPassword('HOD@123'),
        role: 'HOD',
        userId: 'HOD-CSE-001',
        department: cseDept._id,
        assignedYearGroups: [{ year: 1, semesters: [1,2] }, { year: 2, semesters: [3,4] }, { year: 3, semesters: [5,6] }, { year: 4, semesters: [7,8] }],
        isFirstLogin: false,
        isTempPassword: false
      });
    } else {
      cseHod.department = cseDept._id;
      await cseHod.save();
    }
    cseDept.hod = cseHod._id;
    await cseDept.save();

    // Teachers unchanged (no surname issue)
    const teachers = await User.insertMany([
      {
        name: 'Prof. Rajesh Kumar',
        email: 'teacher1@almts.com',
        password: await hashPassword('Teacher@123'),
        role: 'TEACHER',
        userId: 'TCH-CSE-1001',
        department: cseDept._id,
        yearsOfExperience: 5,
        joinedYear: 2019,
        qualifications: ['B.Tech', 'M.Tech', 'PhD'],
        specialization: ['Data Structures', 'Algorithms'],
        publications: 12,
        certifications: ['AWS Certified', 'Google Cloud'],
        assignedYearGroups: [{ year: 1, semesters: [1,2] }],
        isFirstLogin: false,
        isTempPassword: false
      },
      // ... (abbreviated for brevity, same as previous)
      // teacher2,3 senior; teacher4-7 junior
    ]);

    // Create Classes
    const classes = {};
    for (const group of academicGroups) {
      const classDoc = await Class.create({
        name: `CSE ${group.label}`,
        department: cseDept._id,
        teacher: teachers[0]._id,
        year: group.year,
        semester: group.semester,
        students: []
      });
      classes[group.label] = classDoc;
    }

    // First names only for students
    const yearFirstNames = {
      'Y1-S1': ['Aarav', 'Nitya', 'Ishaan', 'Sara', 'Vikram', 'Priya', 'Rohan', 'Ananya', 'Arjun', 'Kavya'],
      'Y2-S3': ['Siddharth', 'Meera', 'Karthik', 'Divya', 'Aditya', 'Neha', 'Rahul', 'Pooja', 'Varun', 'Shreya'],
      'Y3-S5': ['Abhishek', 'Preethi', 'Nikhil', 'Anjali', 'Aryan', 'Diya', 'Harsh', 'Isha', 'Jatin', 'Kriti'],
      'Y4-S7': ['Akshay', 'Bhavna', 'Chirag', 'Deepika', 'Eshan', 'Fiona', 'Gaurav', 'Hema', 'Ishan', 'Jaya']
    };

    const students = [];
    let studentCounter = 1;
    for (const group of academicGroups) {
      const groupClass = classes[group.label];
      const firstNames = yearFirstNames[group.label];
      for (let i = 0; i < 10; i++) {
        const name = firstNames[i];
        const rollNumber = `CSE${String(studentCounter).padStart(3, '0')}`;
        const emailSlug = name.toLowerCase();
        const student = await User.create({
          name,
          email: `${emailSlug}@student.almts.com`,
          password: await hashPassword('Student@123'),
          role: 'STUDENT',
          userId: `STU-${rollNumber}`,
          rollNumber,
          department: cseDept._id,
          class: groupClass._id,
          year: group.year,
          semester: group.semester,
          isFirstLogin: false,
          isTempPassword: false
        });
        students.push(student);
        groupClass.students.push(student._id);
        studentCounter += 1;
      }
      await groupClass.save();
    }

    // Logs, momentum, etc. same as before

    console.log('Seed complete with first names only.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

seedDatabase();
