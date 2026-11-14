const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', '..', 'logs');
const logFilePath = path.join(logsDir, 'attendance.log');

// Ensure log directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Append an attendance action entry to the audit log file using the File System (fs) module
 */
const logAttendanceEvent = async (event) => {
  const timestamp = new Date().toISOString();
  const {
    action = 'ATTENDANCE_MARKED',
    course = 'N/A',
    date = new Date().toISOString().split('T')[0],
    faculty = 'System/Faculty',
    totalStudents = 0,
    presentCount = 0,
    absentCount = 0,
    details = ''
  } = event;

  const logEntry = `[${timestamp}] [${action}] Course: "${course}" | Date: ${date} | Faculty: ${faculty} | Total: ${totalStudents} | Present: ${presentCount} | Absent: ${absentCount} | Info: ${details}\n`;

  try {
    await fs.promises.appendFile(logFilePath, logEntry, 'utf8');
  } catch (err) {
    console.error(`[FS Logger Error] Failed to write attendance log: ${err.message}`);
  }
};

/**
 * Read the latest logs from the log file using fs.promises.readFile
 */
const readAttendanceLogs = async (linesLimit = 50) => {
  try {
    if (!fs.existsSync(logFilePath)) {
      return [];
    }
    const data = await fs.promises.readFile(logFilePath, 'utf8');
    const lines = data.trim().split('\n').filter(Boolean);
    return lines.slice(-linesLimit).reverse();
  } catch (err) {
    console.error(`[FS Logger Error] Failed to read attendance log: ${err.message}`);
    return [];
  }
};

/**
 * Clear or reset logs (useful for maintenance)
 */
const clearLogs = async () => {
  try {
    await fs.promises.writeFile(logFilePath, '', 'utf8');
    return true;
  } catch (err) {
    console.error(`[FS Logger Error] Failed to clear attendance log: ${err.message}`);
    return false;
  }
};

module.exports = {
  logFilePath,
  logAttendanceEvent,
  readAttendanceLogs,
  clearLogs
};

