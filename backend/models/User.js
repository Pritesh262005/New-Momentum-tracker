const mongoose = require('mongoose');

const yearGroupSchema = new mongoose.Schema({
  year: { type: Number, min: 1, max: 4, required: true },
  semesters: [{ type: Number, min: 1, max: 8 }]
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'HOD', 'TEACHER', 'STUDENT'], required: true },
  userId: { type: String, unique: true, sparse: true },
  rollNumber: { type: String },
  phone: { type: String },
  address: { type: String },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  year: { type: Number, min: 1, max: 4 },
  semester: { type: Number, default: 1, min: 1, max: 8 },
  assignedYearGroups: { type: [yearGroupSchema], default: [] },
  semesterStartedAt: { type: Date, default: Date.now },
  semesterHistory: [{
    semester: { type: Number, min: 1, max: 8 },
    startedAt: { type: Date },
    endedAt: { type: Date }
  }],
  // Teacher experience fields
  yearsOfExperience: { type: Number, min: 0, default: 0 },
  joinedYear: { type: Number, min: 2000 },
  qualifications: [{ type: String }],
  specialization: [{ type: String }],
  publications: { type: Number, min: 0, default: 0 },
  certifications: [{ type: String }],
  isActive: { type: Boolean, default: true },
  isFirstLogin: { type: Boolean, default: true },
  isTempPassword: { type: Boolean, default: true },
  tempPasswordExpiry: { type: Date },
  isEmailVerified: { type: Boolean, default: false },
  profilePicture: { type: String },
  xpPoints: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  lastStudyDate: { type: Date },
  lastLoginAt: { type: Date },
  loginCount: { type: Number, default: 0 },
  badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
  createdByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deactivationReason: { type: String },
  reactivationDate: { type: Date }
}, { timestamps: true });

userSchema.pre('validate', function(next) {
  if (this.semester !== undefined && this.semester !== null) {
    const computedYear = Math.ceil(Number(this.semester) / 2);
    if (!this.year) this.year = computedYear;
  }

  if (this.year && this.semester) {
    const expectedYear = Math.ceil(Number(this.semester) / 2);
    if (expectedYear !== Number(this.year)) {
      return next(new Error('Year must match semester (1-2 => Year 1, 3-4 => Year 2, 5-6 => Year 3, 7-8 => Year 4)'));
    }
  }

  if (Array.isArray(this.assignedYearGroups)) {
    this.assignedYearGroups = this.assignedYearGroups.map((group) => ({
      year: Number(group.year),
      semesters: Array.isArray(group.semesters)
        ? [...new Set(group.semesters.map((s) => Number(s)).filter((s) => s >= 1 && s <= 8))]
        : []
    }));
  }

  next();
});

module.exports = mongoose.model('User', userSchema);
