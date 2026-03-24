const User = require('../models/User');
const Class = require('../models/Class');
const MomentumScore = require('../models/MomentumScore');
const MCQTest = require('../models/MCQTest');
const PDFAssignment = require('../models/PDFAssignment');
const PDFSubmission = require('../models/PDFSubmission');
const Recommendation = require('../models/Recommendation');

const getProfessorDashboard = async (req, res, next) => {
  try {
    const classes = await Class.find({ professor: req.user._id }).populate('students');
    const totalStudents = classes.reduce((sum, c) => sum + c.students.length, 0);

    const allStudentIds = classes.flatMap(c => c.students.map(s => s._id));
    
    const scores = await MomentumScore.find({ student: { $in: allStudentIds } })
      .sort({ weekStart: -1, createdAt: -1 });
    
    const latestScores = {};
    scores.forEach(s => {
      if (!latestScores[s.student]) latestScores[s.student] = s.score;
    });
    
    const avgMomentum = Object.values(latestScores).reduce((a, b) => a + b, 0) / Object.keys(latestScores).length || 0;

    const testsCreated = await MCQTest.countDocuments({ professor: req.user._id });
    const pendingGrading = await PDFSubmission.countDocuments({ gradedBy: null });

    const atRiskStudents = await Promise.all(
      allStudentIds.map(async (id) => {
        const score = latestScores[id] || 0;
        const burnout = await Recommendation.findOne({ student: id, type: 'BURNOUT' }).sort({ createdAt: -1 });
        if (score < 40 || burnout) {
          const user = await User.findById(id);
          return { name: user.name, score, risk: score < 40 ? 'Low Score' : 'Burnout' };
        }
        return null;
      })
    );

    res.json({
      success: true,
      data: {
        totalStudents,
        avgMomentum: Math.round(avgMomentum * 100) / 100,
        testsCreated,
        pendingGrading,
        atRiskStudents: atRiskStudents.filter(s => s !== null)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getClassStudents = async (req, res, next) => {
  try {
    const classes = await Class.find({ professor: req.user._id }).populate('students');
    const allStudentIds = classes.flatMap(c => c.students.map(s => s._id));

    const students = await Promise.all(
      allStudentIds.map(async (id) => {
        const user = await User.findById(id);
        const score = await MomentumScore.findOne({ student: id }).sort({ weekStart: -1, createdAt: -1 });
        return {
          id: user._id,
          name: user.name,
          rollNumber: user.rollNumber,
          momentumScore: score?.score || 0
        };
      })
    );

    res.json({ success: true, data: students });
  } catch (error) {
    next(error);
  }
};

const getStudentDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate('badges');
    const scores = await MomentumScore.find({ student: id }).sort({ weekStart: -1, createdAt: -1 }).limit(10);

    res.json({ success: true, data: { user, momentumHistory: scores } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfessorDashboard,
  getClassStudents,
  getStudentDetail
};
