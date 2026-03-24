const AuditLog = require('../models/AuditLog');

const auditLogger = async (userId, action, details = {}, ipAddress = '') => {
  try {
    await AuditLog.create({
      performedBy: userId,
      action,
      details,
      ipAddress
    });
  } catch (error) {
    console.error('Audit log error:', error.message);
  }
};

module.exports = auditLogger;
