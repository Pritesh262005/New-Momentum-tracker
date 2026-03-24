const User = require('../models/User');
const MomentumScore = require('../models/MomentumScore');

const getTop10 = async (req, res, next) => {
  try {
    const students = await User.find({ role: 'STUDENT', isActive: true }).select('name rollNumber');
    
    const rankings = await Promise.all(
      students.map(async (student) => {
        const score = await MomentumScore.findOne({ student: student._id }).sort({ weekStart: -1, createdAt: -1 });
        return {
          id: student._id,
          name: student.name,
          rollNumber: student.rollNumber,
          momentumScore: score?.score || 0
        };
      })
    );

    rankings.sort((a, b) => b.momentumScore - a.momentumScore);
    const top10 = rankings.slice(0, 10);

    res.json({ success: true, data: top10 });
  } catch (error) {
    next(error);
  }
};

const getDepartmentRankings = async (req, res, next) => {
  try {
    const { departmentId } = req.query;
    const students = await User.find({ role: 'STUDENT', department: departmentId, isActive: true });

    const rankings = await Promise.all(
      students.map(async (student) => {
        const score = await MomentumScore.findOne({ student: student._id }).sort({ weekStart: -1, createdAt: -1 });
        return {
          name: student.name,
          rollNumber: student.rollNumber,
          momentumScore: score?.score || 0
        };
      })
    );

    rankings.sort((a, b) => b.momentumScore - a.momentumScore);
    res.json({ success: true, data: rankings });
  } catch (error) {
    next(error);
  }
};

const getClassRankings = async (req, res, next) => {
  try {
    const { classId } = req.query;
    const students = await User.find({ role: 'STUDENT', class: classId, isActive: true });

    const rankings = await Promise.all(
      students.map(async (student) => {
        const score = await MomentumScore.findOne({ student: student._id }).sort({ weekStart: -1, createdAt: -1 });
        return {
          name: student.name,
          rollNumber: student.rollNumber,
          momentumScore: score?.score || 0
        };
      })
    );

    rankings.sort((a, b) => b.momentumScore - a.momentumScore);
    res.json({ success: true, data: rankings });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTop10,
  getDepartmentRankings,
  getClassRankings
};
