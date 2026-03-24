require('dotenv').config();
const configureDns = require('./config/dns');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Department = require('./models/Department');
const Class = require('./models/Class');

configureDns();

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const toEmailSlug = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(mongoUri);

  const cseDept =
    (await Department.findOne({ code: 'CSE' })) ||
    (await Department.findOne({ name: /computer\s*science/i }));
  if (!cseDept) throw new Error('CSE department not found. Seed departments first.');

  const targetClass =
    (await Class.findOne({ name: 'CSE-A', department: cseDept._id })) ||
    (await Class.findOne({ department: cseDept._id }));
  if (!targetClass) throw new Error('No class found for CSE department. Seed classes first.');

  const last = await User.findOne({
    role: 'STUDENT',
    department: cseDept._id,
    rollNumber: { $regex: /^CSE\d{3}$/ }
  })
    .sort({ rollNumber: -1 })
    .select('rollNumber')
    .lean();

  const lastNum = last?.rollNumber ? Number(last.rollNumber.slice(3)) : 0;

  const newNames = [
    'Ishaan Singh',
    'Neha Kapoor',
    'Rahul Nair',
    'Sneha Kulkarni',
    'Ayesha Khan'
  ];

  const createdIds = [];
  const createdRows = [];
  const passwordHash = await hashPassword('Student@123');

  for (let i = 0; i < 5; i++) {
    const n = lastNum + i + 1;
    const rollNum = `CSE${String(n).padStart(3, '0')}`;
    const name = newNames[i] || `Student ${rollNum}`;
    const email = `${toEmailSlug(name)}.${rollNum.toLowerCase()}@student.almts.com`;

    const student = await User.create({
      name,
      email,
      password: passwordHash,
      role: 'STUDENT',
      userId: 'STU-' + rollNum,
      rollNumber: rollNum,
      department: cseDept._id,
      class: targetClass._id,
      isFirstLogin: false,
      isTempPassword: false
    });

    createdIds.push(student._id);
    createdRows.push({ name, email, rollNumber: rollNum, userId: student.userId });
  }

  await Class.updateOne(
    { _id: targetClass._id },
    { $addToSet: { students: { $each: createdIds } } }
  );

  console.log(`Created ${createdRows.length} students in class ${targetClass.name} (${cseDept.code})`);
  for (const row of createdRows) {
    console.log(`- ${row.rollNumber} ${row.name} (${row.email})`);
  }
  console.log('Default password for these students: Student@123');
}

main()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('Add students failed:', err.message || err);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  });

