const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  semester: { type: Number },
  year: { type: Number },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

classSchema.index({ name: 1, department: 1 }, { unique: true });

module.exports = mongoose.model('Class', classSchema);
