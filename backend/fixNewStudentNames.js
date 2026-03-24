require('dotenv').config();
const configureDns = require('./config/dns');
const mongoose = require('mongoose');

const User = require('./models/User');

configureDns();

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(mongoUri);

  const updates = [
    { rollNumber: 'CSE011', name: 'Ishaan', email: 'ishaan.cse011@student.almts.com' },
    { rollNumber: 'CSE012', name: 'Neha', email: 'neha.cse012@student.almts.com' },
    { rollNumber: 'CSE013', name: 'Raghu', email: 'raghu.cse013@student.almts.com' },
    { rollNumber: 'CSE014', name: 'Sneha', email: 'sneha.cse014@student.almts.com' },
    { rollNumber: 'CSE015', name: 'Ayesha', email: 'ayesha.cse015@student.almts.com' }
  ];

  const seenEmails = new Set();
  for (const u of updates) {
    const email = u.email.toLowerCase();
    if (seenEmails.has(email)) throw new Error(`Duplicate email in updates: ${email}`);
    seenEmails.add(email);
  }

  const results = [];

  for (const next of updates) {
    const user = await User.findOne({ role: 'STUDENT', rollNumber: next.rollNumber });
    if (!user) {
      results.push({ rollNumber: next.rollNumber, status: 'not_found' });
      continue;
    }

    const old = { name: user.name, email: user.email, rollNumber: user.rollNumber };
    user.name = next.name;
    user.email = next.email.toLowerCase();
    await user.save();

    results.push({
      rollNumber: next.rollNumber,
      status: 'updated',
      from: old,
      to: { name: user.name, email: user.email }
    });
  }

  const updated = results.filter((r) => r.status === 'updated');
  const missing = results.filter((r) => r.status === 'not_found');

  console.log(`Updated ${updated.length} students.`);
  for (const r of updated) {
    console.log(`- ${r.rollNumber}: "${r.from.name}" -> "${r.to.name}", ${r.from.email} -> ${r.to.email}`);
  }
  if (missing.length > 0) {
    console.log(`Not found: ${missing.map((m) => m.rollNumber).join(', ')}`);
  }
}

main()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('Fix student names failed:', err.message || err);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  });

