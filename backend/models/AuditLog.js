const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  details: { type: Object },
  ipAddress: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false });

module.exports = mongoose.model('AuditLog', auditLogSchema);
