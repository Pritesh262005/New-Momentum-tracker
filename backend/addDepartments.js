require('dotenv').config();
const configureDns = require('./config/dns');
const mongoose = require('mongoose');
const Department = require('./models/Department');

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

const addDepartments = async () => {
  try {
    await connectDB();

    console.log('🏢 Adding 2 more departments...');
    
    const civil = await Department.findOne({ code: 'CIVIL' });
    const ee = await Department.findOne({ code: 'EE' });

    if (!civil) {
      await Department.create({ 
        name: 'Civil Engineering', 
        code: 'CIVIL', 
        description: 'Civil Engineering Department' 
      });
      console.log('✅ Added Civil Engineering');
    } else {
      console.log('⚠️  Civil Engineering already exists');
    }

    if (!ee) {
      await Department.create({ 
        name: 'Electrical Engineering', 
        code: 'EE', 
        description: 'Electrical Engineering Department' 
      });
      console.log('✅ Added Electrical Engineering');
    } else {
      console.log('⚠️  Electrical Engineering already exists');
    }

    const total = await Department.countDocuments();
    console.log(`\n📊 Total departments: ${total}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

addDepartments();
