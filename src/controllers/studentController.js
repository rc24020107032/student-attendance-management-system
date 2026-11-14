const Student = require('../models/Student');

/**
 * Register a new student
 */
exports.addStudent = async (req, res) => {
  try {
    const { rollNumber, name, email, course, batch, semester } = req.body;

    if (!rollNumber || !name) {
      return res.status(400).json({
        success: false,
        message: 'Roll number and student name are required fields.'
      });
    }

    const existingStudent = await Student.findOne({ rollNumber: rollNumber.toUpperCase() });
    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: `Student with roll number "${rollNumber.toUpperCase()}" already exists.`
      });
    }

    const newStudent = await Student.create({
      rollNumber: rollNumber.toUpperCase(),
      name,
      email,
      course: course || 'B.Voc Software Development',
      batch: batch || '2024-2027',
      semester: semester || 5
    });

    res.status(201).json({
      success: true,
      message: 'Student registered successfully.',
      data: newStudent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add student.',
      error: error.message
    });
  }
};

/**
 * Get all students (with optional course filter)
 */
exports.getAllStudents = async (req, res) => {
  try {
    const { course, search } = req.query;
    const filter = { isActive: true };

    if (course) {
      filter.course = course;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await Student.find(filter).sort({ rollNumber: 1 });

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching students list.',
      error: error.message
    });
  }
};

/**
 * Get student by Roll Number
 */
exports.getStudentByRoll = async (req, res) => {
  try {
    const { rollNumber } = req.params;
    const student = await Student.findOne({ rollNumber: rollNumber.toUpperCase() });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Student with roll number "${rollNumber.toUpperCase()}" not found.`
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching student.',
      error: error.message
    });
  }
};

/**
 * Delete a student
 */
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Student.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting student.',
      error: error.message
    });
  }
};

