require('dotenv').config();
const configureDns = require('./config/dns');
const mongoose = require('mongoose');
const News = require('./models/News');
const User = require('./models/User');

configureDns();

const testNews = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find admin user
    const admin = await User.findOne({ role: 'ADMIN' });
    if (!admin) {
      console.log('❌ No admin user found');
      return;
    }

    // Create test news
    const news = await News.create({
      title: 'Test News Article',
      content: 'This is a test news article content.',
      author: admin._id,
      authorRole: 'ADMIN',
      targetType: 'ALL_USERS'
    });

    console.log('✅ News created:', news);

    // Fetch all news
    const allNews = await News.find().populate('author', 'name role');
    console.log('📰 All news:', allNews);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testNews();
