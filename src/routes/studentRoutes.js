const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

// Define routes for students
router.post('/', studentController.addStudent);
router.get('/', studentController.getAllStudents);
router.get('/:rollNumber', studentController.getStudentByRoll);
router.delete('/:id', studentController.deleteStudent);

module.exports = router;

