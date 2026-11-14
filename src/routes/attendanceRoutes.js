const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

// Define routes for attendance
router.post('/mark', attendanceController.markAttendance);
router.get('/student/:rollNumber', attendanceController.getStudentAttendance);
router.get('/sessions', attendanceController.getAllSessions);
router.get('/logs', attendanceController.getAuditLogs);

module.exports = router;

