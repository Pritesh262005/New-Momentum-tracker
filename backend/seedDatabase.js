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

    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Department.deleteMany({});
    await Class.deleteMany({});
    await StudyLog.deleteMany({});
    await Mood.deleteMany({});
    await MCQTest.deleteMany({});
    await Assignment.deleteMany({});
    await Subject.deleteMany({});
    await News.deleteMany({});
    await HierarchicalMeeting.deleteMany({});

    console.log('👤 Creating Admin user...');
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@almts.com',
      password: await hashPassword('Admin@123'),
      role: 'ADMIN',
      userId: 'ADM' + Date.now().toString().slice(-4),
      isFirstLogin: false,
      isTempPassword: false
    });

    console.log('🏢 Creating Departments...');
    const cseDept = await Department.create({ name: 'Computer Science', code: 'CSE', description: 'Computer Science and Engineering' });
    const eceDept = await Department.create({ name: 'Electronics', code: 'ECE', description: 'Electronics and Communication' });
    const mechDept = await Department.create({ name: 'Mechanical', code: 'MECH', description: 'Mechanical Engineering' });

    console.log('📘 Creating Subjects...');
    const dataStructures = await Subject.create({
      name: 'Data Structures',
      code: 'CSE-DS',
      department: cseDept._id,
      description: 'Arrays, linked lists, stacks, queues, trees, and graphs',
      credits: 4,
      semester: 6
    });

    await Subject.create({
      name: 'Algorithms',
      code: 'CSE-ALGO',
      department: cseDept._id,
      description: 'Algorithm design and analysis',
      credits: 4,
      semester: 6
    });

    console.log('👔 Creating HOD users...');
    const cseHod = await User.create({
      name: 'Dr. Rajesh Kumar',
      email: 'hod.cse@almts.com',
      password: await hashPassword('HOD@123'),
      role: 'HOD',
      userId: 'HOD-CSE-' + Math.floor(Math.random() * 1000),
      department: cseDept._id,
      isFirstLogin: false,
      isTempPassword: false
    });

    cseDept.hod = cseHod._id;
    await cseDept.save();

    console.log('👨‍🏫 Creating Teacher users...');
    const teachers = [];
    const teacherNames = [
      { name: 'Prof. Rajesh Kumar', email: 'teacher1@almts.com' },
      { name: 'Prof. Priya Sharma', email: 'teacher2@almts.com' },
      { name: 'Prof. Amit Patel', email: 'teacher3@almts.com' }
    ];

    for (let i = 0; i < teacherNames.length; i++) {
      const t = teacherNames[i];
      const teacher = await User.create({
        name: t.name,
        email: t.email,
        password: await hashPassword('Teacher@123'),
        role: 'TEACHER',
        userId: 'TCH-CSE-' + (1000 + i),
        department: cseDept._id,
        isFirstLogin: false,
        isTempPassword: false
      });
      teachers.push(teacher);
    }

    console.log('🎓 Creating Classes...');
    const cseClassA = await Class.create({
      name: 'CSE-A',
      department: cseDept._id,
      teacher: teachers[0]._id,
      semester: 6,
      year: 2024
    });

    const cseClassB = await Class.create({
      name: 'CSE-B',
      department: cseDept._id,
      teacher: teachers[1]._id,
      semester: 6,
      year: 2024
    });

    console.log('👨‍🎓 Creating Student users...');
    const studentNames = [
      'Arjun Mehta', 'Ananya Iyer', 'Rohan Gupta', 'Kavya Nair', 'Aditya Verma',
      'Preethi Raj', 'Siddharth Bose', 'Meera Pillai', 'Karthik Nair', 'Divya Sharma'
    ];

    const students = [];
    for (let i = 0; i < studentNames.length; i++) {
      const rollNum = `CSE${String(i + 1).padStart(3, '0')}`;
      const student = await User.create({
        name: studentNames[i],
        email: `${studentNames[i].toLowerCase().replace(' ', '.')}@student.almts.com`,
        password: await hashPassword('Student@123'),
        role: 'STUDENT',
        userId: 'STU-' + rollNum,
        rollNumber: rollNum,
        department: cseDept._id,
        class: cseClassA._id,
        semester: cseClassA.semester,
        semesterStartedAt: new Date(),
        isFirstLogin: false,
        isTempPassword: false
      });
      students.push(student);
      cseClassA.students.push(student._id);
    }
    await cseClassA.save();

    console.log('📚 Creating Study Logs...');
    const subjects = ['Data Structures', 'Algorithms', 'Database Systems', 'Operating Systems', 'Computer Networks'];
    const topics = ['Arrays', 'Linked Lists', 'Trees', 'Graphs', 'Sorting', 'Searching'];

    for (const student of students) {
      for (let day = 0; day < 14; day++) {
        const date = new Date();
        date.setDate(date.getDate() - day);
        
        const logsPerDay = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < logsPerDay; i++) {
          const attempted = Math.floor(Math.random() * 50) + 10;
          const correct = Math.floor(Math.random() * attempted);
          await StudyLog.create({
            student: student._id,
            subject: subjects[Math.floor(Math.random() * subjects.length)],
            topic: topics[Math.floor(Math.random() * topics.length)],
            duration: Math.floor(Math.random() * 120) + 30,
            questionsAttempted: attempted,
            questionsCorrect: correct,
            date
          });
        }
      }
    }

    console.log('😊 Creating Mood Entries...');
    for (const student of students) {
      for (let day = 0; day < 14; day++) {
        const date = new Date();
        date.setDate(date.getDate() - day);
        date.setHours(0, 0, 0, 0);

        await Mood.create({
          student: student._id,
          level: Math.floor(Math.random() * 5) + 1,
          date
        });
      }
    }

    console.log('📊 Calculating Momentum Scores...');
    const now = new Date();
    for (let week = 0; week < 2; week++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (now.getDay() + week * 7));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      for (const student of students) {
        await calculateMomentumScore(student._id, weekStart, weekEnd);
      }
    }

    console.log('📝 Creating MCQ Tests...');
    await MCQTest.create({
      title: 'Data Structures Mid-Term',
      description: 'Comprehensive test on arrays, linked lists, and trees',
      createdBy: teachers[0]._id,
      department: cseDept._id,
      class: cseClassA._id,
      subject: dataStructures._id,
      questions: [
        {
          questionText: 'What is the time complexity of binary search?',
          options: ['O(n)', 'O(log n)', 'O(n^2)', 'O(1)'],
          correctAnswer: 1,
          marks: 2
        },
        {
          questionText: 'Which data structure uses LIFO?',
          options: ['Queue', 'Stack', 'Array', 'Tree'],
          correctAnswer: 1,
          marks: 2
        }
      ],
      duration: 60,
      passingMarks: 2,
      isPublished: true,
      startDateTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      randomizeQuestions: true
    });

    console.log('📄 Creating Assignment...');
    await Assignment.create({
      title: 'Algorithm Analysis Report',
      description: 'Analyze and compare sorting algorithms',
      createdBy: teachers[0]._id,
      department: cseDept._id,
      class: cseClassA._id,
      subject: 'Algorithms',
      assignmentFile: {
        fileName: 'sample_assignment.pdf',
        filePath: 'uploads/assignments/sample.pdf',
        fileSize: 1024
      },
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      totalMarks: 100,
      isPublished: true
    });

    console.log('📰 Creating News Articles...');
    await News.create({
      title: 'Welcome to ALMTS',
      content: 'We are excited to launch the Academic Learning Momentum Tracker System!',
      author: admin._id,
      authorRole: 'ADMIN',
      targetType: 'ALL_USERS',
      commentsEnabled: true
    });

    await News.create({
      title: 'CSE Department Updates',
      content: 'New lab equipment has been installed in the CSE department.',
      author: cseHod._id,
      authorRole: 'HOD',
      targetType: 'SPECIFIC_DEPARTMENT',
      targetDepartment: cseDept._id,
      commentsEnabled: true
    });

    console.log('🤝 Creating Meetings...');
    await HierarchicalMeeting.create({
      title: 'Monthly HOD Meeting',
      description: 'Discuss department performance and upcoming events',
      organizer: admin._id,
      level: 'ADMIN_LEVEL',
      participants: [cseHod._id],
      scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      duration: 90,
      location: 'Admin Conference Room',
      isOnline: false
    });

    await HierarchicalMeeting.create({
      title: 'CSE Faculty Meeting',
      description: 'Curriculum review and student feedback',
      organizer: cseHod._id,
      level: 'DEPARTMENT_LEVEL',
      department: cseDept._id,
      participants: teachers.map(t => t._id),
      scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      duration: 60,
      isOnline: true,
      meetingLink: 'https://meet.google.com/abc-defg-hij'
    });

    console.log('🏆 Awarding Badges...');
    for (const student of students) {
      await checkAndAwardBadges(student._id);
    }

    console.log('✅ Seeding complete!');
    console.log('\n📋 Login Credentials:');
    console.log('Admin: admin@almts.com / Admin@123');
    console.log('HOD (CSE): hod.cse@almts.com / HOD@123');
    console.log('Teacher: teacher1@almts.com / Teacher@123');
    console.log('Student: arjun.mehta@student.almts.com / Student@123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
