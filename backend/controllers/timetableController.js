const Timetable = require('../models/Timetable');

const createTimetable = async (req, res, next) => {
  try {
    const { classId, day, periods } = req.body;

    const timetable = await Timetable.findOneAndUpdate(
      { class: classId, day },
      { class: classId, day, periods },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, data: timetable });
  } catch (error) {
    next(error);
  }
};

const getClassTimetable = async (req, res, next) => {
  try {
    const { classId } = req.params;

    const timetable = await Timetable.find({ class: classId })
      .populate('periods.professor', 'name')
      .sort({ day: 1 });

    res.json({ success: true, data: timetable });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTimetable,
  getClassTimetable
};
