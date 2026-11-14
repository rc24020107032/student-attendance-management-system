const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const loggerService = require('../services/loggerService');

/**
 * Mark attendance for a class session
 * Also maintains attendance audit logs via Node.js File System (fs) module
 */
exports.markAttendance = async (req, res) => {
  try {
    const { date, course, facultyName, records } = req.body;

    if (!date || !course || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Date, course name, and an array of student attendance records are required.'
      });
    }

    // Normalize date to YYYY-MM-DD
    const sessionDate = new Date(date);
    const startOfDay = new Date(sessionDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(sessionDate.setHours(23, 59, 59, 999));

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    const validatedRecords = [];
    for (const item of records) {
      const status = item.status === 'Absent' ? 'Absent' : item.status === 'Late' ? 'Late' : 'Present';
      if (status === 'Present') presentCount++;
      else if (status === 'Absent') absentCount++;
      else if (status === 'Late') lateCount++;

      validatedRecords.push({
        student: item.studentId || item.student,
        rollNumber: (item.rollNumber || '').toUpperCase(),
        studentName: item.studentName || 'Unknown',
        status,
        remarks: item.remarks || ''
      });
    }

    // Check if attendance already recorded for this date and course
    let attendance = await Attendance.findOne({
      course,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (attendance) {
      // Update existing record
      attendance.facultyName = facultyName || attendance.facultyName;
      attendance.records = validatedRecords;
      attendance.totalPresent = presentCount;
      attendance.totalAbsent = absentCount;
      attendance.totalLate = lateCount;
      await attendance.save();
    } else {
      // Create new session document
      attendance = await Attendance.create({
        date: startOfDay,
        course,
        facultyName: facultyName || 'Faculty In-Charge',
        records: validatedRecords,
        totalPresent: presentCount,
        totalAbsent: absentCount,
        totalLate: lateCount
      });
    }

    // Write audit record to local file log
    await loggerService.logAttendanceEvent({
      action: attendance ? 'ATTENDANCE_RECORDED' : 'ATTENDANCE_CREATED',
      course,
      date: startOfDay.toISOString().split('T')[0],
      faculty: facultyName || 'Faculty In-Charge',
      totalStudents: validatedRecords.length,
      presentCount,
      absentCount,
      details: `Late: ${lateCount}`
    });

    res.status(200).json({
      success: true,
      message: 'Attendance saved successfully and audit log updated.',
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error saving attendance.',
      error: error.message
    });
  }
};

/**
 * Get attendance records and calculate percentage for a specific student
 */
exports.getStudentAttendance = async (req, res) => {
  try {
    const { rollNumber } = req.params;
    const cleanRoll = rollNumber.toUpperCase();

    // Verify student exists
    const student = await Student.findOne({ rollNumber: cleanRoll });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Student with roll number "${cleanRoll}" not found.`
      });
    }

    // Query all sessions containing this student
    const sessions = await Attendance.find({
      'records.rollNumber': cleanRoll
    }).sort({ date: -1 });

    let totalSessions = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    const history = [];

    sessions.forEach((session) => {
      const record = session.records.find((r) => r.rollNumber === cleanRoll);
      if (record) {
        totalSessions++;
        if (record.status === 'Present') presentCount++;
        else if (record.status === 'Absent') absentCount++;
        else if (record.status === 'Late') {
          lateCount++;
          // Late counts as attended in many university policies or partial
          presentCount++;
        }

        history.push({
          date: session.date.toISOString().split('T')[0],
          course: session.course,
          faculty: session.facultyName,
          status: record.status,
          remarks: record.remarks || ''
        });
      }
    });

    const attendancePercentage = totalSessions > 0
      ? Number(((presentCount / totalSessions) * 100).toFixed(1))
      : 0;

    const isShortage = attendancePercentage < 75.0 && totalSessions > 0;

    res.status(200).json({
      success: true,
      student: {
        rollNumber: student.rollNumber,
        name: student.name,
        course: student.course,
        batch: student.batch
      },
      summary: {
        totalSessions,
        presentCount,
        absentCount,
        lateCount,
        attendancePercentage,
        isShortage,
        eligibilityStatus: isShortage ? 'Attendance Shortage (<75%)' : 'Eligible'
      },
      history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving student attendance.',
      error: error.message
    });
  }
};

/**
 * Get recent attendance sessions for all courses
 */
exports.getAllSessions = async (req, res) => {
  try {
    const sessions = await Attendance.find().sort({ date: -1 }).limit(30);
    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance sessions.',
      error: error.message
    });
  }
};

/**
 * Get raw file system audit logs (Task 3 demo)
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await loggerService.readAttendanceLogs(100);
    res.status(200).json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reading audit logs from file system.',
      error: error.message
    });
  }
};
