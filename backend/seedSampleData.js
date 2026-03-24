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
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
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

    console.log('🗑️ Clearing existing data...');
    await User.deleteMany({});
    await Department.deleteMany({});
    await Subject.deleteMany({});

    console.log('🏢 Creating 5 Departments...');
    const departments = await Department.insertMany([
      { name: 'Computer Science', code: 'CSE', description: 'Computer Science and Engineering' },
      { name: 'Electronics', code: 'ECE', description: 'Electronics and Communication Engineering' },
      { name: 'Mechanical', code: 'MECH', description: 'Mechanical Engineering' },
      { name: 'Civil', code: 'CIVIL', description: 'Civil Engineering' },
      { name: 'Electrical', code: 'EE', description: 'Electrical Engineering' }
    ]);

    console.log('👥 Creating Sample Users...');
    const users = [
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
        password: await hashPassword('Hod@123'),
        role: 'HOD',
        userId: 'HOD-CSE-001',
        department: departments[0]._id,
        isFirstLogin: false,
        isActive: true,
        isTempPassword: false
      },
      {
        name: 'Prof. Amit Patel',
        email: 'teacher1@almts.com',
        password: await hashPassword('Teacher@123'),
        role: 'TEACHER',
        userId: 'TCH-1001',
        department: departments[0]._id,
        isFirstLogin: false,
        isActive: true,
        isTempPassword: false
      },
      {
        name: 'Prof. Sneha Reddy',
        email: 'teacher2@almts.com',
        password: await hashPassword('Teacher@123'),
        role: 'TEACHER',
        userId: 'TCH-1002',
        department: departments[1]._id,
        isFirstLogin: false,
        isActive: true,
        isTempPassword: false
      },
      {
        name: 'Arjun Mehta',
        email: 'student1@almts.com',
        password: await hashPassword('Student@123'),
        role: 'STUDENT',
        userId: 'STU-001',
        rollNumber: 'STU001',
        department: departments[0]._id,
        isFirstLogin: false,
        isActive: true,
        isTempPassword: false
      },
      {
        name: 'Ananya Iyer',
        email: 'student2@almts.com',
        password: await hashPassword('Student@123'),
        role: 'STUDENT',
        userId: 'STU-002',
        rollNumber: 'STU002',
        department: departments[0]._id,
        isFirstLogin: false,
        isActive: true,
        isTempPassword: false
      }
    ];

    await User.insertMany(users);

    console.log('📚 Creating Sample Subjects...');
    await Subject.insertMany([
      { name: 'Data Structures', code: 'CS201', department: departments[0]._id, description: 'Arrays, Trees, Graphs', credits: 4, semester: 3 },
      { name: 'Algorithms', code: 'CS202', department: departments[0]._id, description: 'Sorting, Searching, DP', credits: 4, semester: 4 },
      { name: 'Database Systems', code: 'CS301', department: departments[0]._id, description: 'SQL, NoSQL, Transactions', credits: 3, semester: 5 },
      { name: 'Digital Electronics', code: 'EC101', department: departments[1]._id, description: 'Logic Gates, Circuits', credits: 3, semester: 2 },
      { name: 'Signals & Systems', code: 'EC201', department: departments[1]._id, description: 'Fourier, Laplace', credits: 4, semester: 4 }
    ]);

    console.log('✅ Sample data seeded successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('Admin: admin@almts.com / Admin@123');
    console.log('HOD: hod.cse@almts.com / Hod@123');
    console.log('Teacher 1: teacher1@almts.com / Teacher@123');
    console.log('Teacher 2: teacher2@almts.com / Teacher@123');
    console.log('Student 1: student1@almts.com / Student@123');
    console.log('Student 2: student2@almts.com / Student@123');
    console.log('\n💡 All accounts are active and ready to use!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedSampleData();
