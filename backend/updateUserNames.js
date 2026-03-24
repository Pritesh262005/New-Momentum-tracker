require('dotenv').config();
const configureDns = require('./config/dns');
const mongoose = require('mongoose');
const User = require('./models/User');

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

const updateUserNames = async () => {
  try {
    await connectDB();

    const updates = [
      { old: 'Arjun Mehta', new: 'Arjun' },
      { old: 'Ananya Iyer', new: 'Ananya' },
      { old: 'Rohan Gupta', new: 'Rohan' },
      { old: 'Kavya Nair', new: 'Kavya' },
      { old: 'Aditya Verma', new: 'Aditya' },
      { old: 'Preethi Raj', new: 'Preethi' },
      { old: 'Siddharth Bose', new: 'Siddharth' },
      { old: 'Meera Pillai', new: 'Meera' },
      { old: 'Karthik Nair', new: 'Karthik' },
      { old: 'Divya Sharma', new: 'Divya' },
      { old: 'Dr. Rajesh Kumar', new: 'Rajesh' },
      { old: 'Dr. Priya Sharma', new: 'Priya' },
      { old: 'Prof. Amit Patel', new: 'Amit' },
      { old: 'Prof. Sneha Reddy', new: 'Sneha' },
      { old: 'Prof. Vikram Singh', new: 'Vikram' },
      { old: 'Prof. Anjali Desai', new: 'Anjali' },
      { old: 'Prof. Kiran Kumar', new: 'Kiran' }
    ];

    for (const update of updates) {
      const result = await User.updateMany(
        { name: update.old },
        { $set: { name: update.new } }
      );
      if (result.modifiedCount > 0) {
        console.log(`✅ Updated: ${update.old} → ${update.new}`);
      }
    }

    console.log('\n✅ All user names updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

updateUserNames();
