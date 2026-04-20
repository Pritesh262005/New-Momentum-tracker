require('dotenv').config();
const configureDns = require('./config/dns');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Department = require('./models/Department');
const Subject = require('./models/Subject');

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

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const seedSampleData = async () => {
  try {
    await connectDB();

    await User.deleteMany({});
    await Department.deleteMany({});
    await Subject.deleteMany({});

    const departments = await Department.insertMany([
      { name: 'Computer Science', code: 'CSE', description: 'Computer Science and Engineering' },
      { name: 'Electronics', code: 'ECE', description: 'Electronics and Communication Engineering' },
      { name: 'Mechanical', code: 'MECH', description: 'Mechanical Engineering' },
      { name: 'Civil', code: 'CIVIL', description: 'Civil Engineering' },
      { name: 'Electrical', code: 'EE', description: 'Electrical Engineering' }
    ]);

    await User.insertMany([
      {
        name: 'Admin',
        email: 'admin@almts.com',
        password: await hashPassword('Admin@123'),
        role: 'ADMIN',
        userId: 'ADMIN-001',
        isFirstLogin: false,
        isActive: true,
        isTempPassword: false
      },
      {
        name: 'Dr. Rajesh Kumar',
        email: 'hod.cse@almts.com',
        password: await hashPassword('HOD@123'),
        role: 'HOD',
        userId: 'HOD-CSE-001',
        department: departments[0]._id,
        assignedYearGroups: [
          { year: 1, semesters: [1, 2] },
          { year: 2, semesters: [3, 4] },
          { year: 3, semesters: [5, 6] },
          { year: 4, semesters: [7, 8] }
        ],
        isFirstLogin: false,
        isActive: true,
        isTempPassword: false
      },
      {
        name: 'Prof. Amit Patel',
        email: 'teacher1@almts.com',
        password: await hashPassword('Teacher@123'),
        role: 'TEACHER',
        userId: 'TCH-CSE-001',
        department: departments[0]._id,
        assignedYearGroups: [{ year: 1, semesters: [1, 2] }, { year: 2, semesters: [3, 4] }],
        isFirstLogin: false,
        isActive: true,
        isTempPassword: false
      },
      {
        name: 'Prof. Sneha Reddy',
        email: 'teacher2@almts.com',
        password: await hashPassword('Teacher@123'),
        role: 'TEACHER',
        userId: 'TCH-ECE-001',
        department: departments[1]._id,
        assignedYearGroups: [{ year: 3, semesters: [5, 6] }],
        isFirstLogin: false,
        isActive: true,
        isTempPassword: false
      },
      {
        name: 'Arjun Mehta',
        email: 'arjun.mehta@student.almts.com',
        password: await hashPassword('Student@123'),
        role: 'STUDENT',
        userId: 'STU-001',
        rollNumber: 'CSE001',
        department: departments[0]._id,
        year: 2,
        semester: 3,
        isFirstLogin: false,
        isActive: true,
        isTempPassword: false
      },
      {
        name: 'Ananya Iyer',
        email: 'ananya.iyer@student.almts.com',
        password: await hashPassword('Student@123'),
        role: 'STUDENT',
        userId: 'STU-002',
        rollNumber: 'CSE002',
        department: departments[0]._id,
        year: 2,
        semester: 4,
        isFirstLogin: false,
        isActive: true,
        isTempPassword: false
      }
    ]);

    await Subject.insertMany([
      { name: 'Programming Fundamentals', code: 'CSE101', department: departments[0]._id, description: 'Intro to programming', credits: 4, year: 1, semester: 1 },
      { name: 'Discrete Mathematics', code: 'CSE102', department: departments[0]._id, description: 'Logic and sets', credits: 3, year: 1, semester: 2 },
      { name: 'Data Structures', code: 'CSE201', department: departments[0]._id, description: 'Arrays, trees, graphs', credits: 4, year: 2, semester: 3 },
      { name: 'Algorithms', code: 'CSE202', department: departments[0]._id, description: 'Sorting, searching, DP', credits: 4, year: 2, semester: 4 },
      { name: 'Database Systems', code: 'CSE301', department: departments[0]._id, description: 'SQL and transactions', credits: 3, year: 3, semester: 5 },
      { name: 'Signals and Systems', code: 'ECE301', department: departments[1]._id, description: 'Signals, transforms, systems', credits: 4, year: 3, semester: 5 }
    ]);

    console.log('Sample data seeded successfully');
    console.log('Admin: admin@almts.com / Admin@123');
    console.log('HOD: hod.cse@almts.com / HOD@123');
    console.log('Teacher 1: teacher1@almts.com / Teacher@123');
    console.log('Teacher 2: teacher2@almts.com / Teacher@123');
    console.log('Student 1: arjun.mehta@student.almts.com / Student@123');
    console.log('Student 2: ananya.iyer@student.almts.com / Student@123');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedSampleData();
