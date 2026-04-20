const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const {
  createUser,
  getAllUsers,
  deleteUser,
  permanentlyDeleteUser,
  toggleUserActive,
  resetUserPassword,
  createDepartment,
  getAllDepartments,
  getAllSubjects,
  createSubject,
  getAdminDashboard,
  getAuditLogs,
  getAnalytics
} = require('../controllers/adminController');

router.use(auth);
router.use(roleCheck('ADMIN'));

router.post('/users', createUser);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.delete('/users/:id/permanent', permanentlyDeleteUser);
router.patch('/users/:id/toggle', toggleUserActive);
router.post('/users/:id/reset-password', resetUserPassword);

router.post('/departments', createDepartment);
router.get('/departments', getAllDepartments);
router.post('/subjects', createSubject);
router.get('/subjects', getAllSubjects);

router.get('/dashboard', getAdminDashboard);
router.get('/audit-logs', getAuditLogs);
router.get('/analytics', getAnalytics);

module.exports = router;
