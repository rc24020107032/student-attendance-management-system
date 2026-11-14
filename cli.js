#!/usr/bin/env node

require('dotenv').config();
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const mongoose = require('mongoose');

const connectDB = require('./src/config/db');
const Student = require('./src/models/Student');
const Attendance = require('./src/models/Attendance');
const loggerService = require('./src/services/loggerService');

const initDB = async () => {
  return await connectDB();
};

const closeDB = async () => {
  await mongoose.connection.close();
};

yargs(hideBin(process.argv))
  .scriptName('attendance-cli')
  .usage('$0 <cmd> [args]')
  .command(
    'add-student',
    'Register a new student in the database',
    (y) => {
      return y
        .option('roll', {
          alias: 'r',
          describe: 'Student Roll Number',
          type: 'string',
          demandOption: true
        })
        .option('name', {
          alias: 'n',
          describe: 'Student Full Name',
          type: 'string',
          demandOption: true
        })
        .option('email', {
          alias: 'e',
          describe: 'Student Email Address',
          type: 'string'
        })
        .option('course', {
          alias: 'c',
          describe: 'Course Name',
          type: 'string',
          default: 'B.Voc Software Development'
        })
        .option('batch', {
          alias: 'b',
          describe: 'Batch Year',
          type: 'string',
          default: '2024-2027'
        });
    },
    async (argv) => {
      try {
        await initDB();
        const roll = argv.roll.toUpperCase();
        const existing = await Student.findOne({ rollNumber: roll });
        if (existing) {
          console.log(`[Error] Student with roll number "${roll}" already exists.`);
        } else {
          const student = await Student.create({
            rollNumber: roll,
            name: argv.name,
            email: argv.email || `${roll.toLowerCase()}@university.edu`,
            course: argv.course,
            batch: argv.batch
          });
          console.log(`Student registered successfully:`);
          console.log(`  Roll:   ${student.rollNumber}`);
          console.log(`  Name:   ${student.name}`);
          console.log(`  Course: ${student.course}`);
        }
      } catch (err) {
        console.error(`[Error] Failed to add student: ${err.message}`);
      } finally {
        await closeDB();
      }
    }
  )
  .command(
    'mark',
    'Mark attendance for an individual student and update file system log',
    (y) => {
      return y
        .option('roll', {
          alias: 'r',
          describe: 'Student Roll Number',
          type: 'string',
          demandOption: true
        })
        .option('status', {
          alias: 's',
          describe: 'Attendance status (Present, Absent, Late)',
          choices: ['Present', 'Absent', 'Late'],
          default: 'Present'
        })
        .option('date', {
          alias: 'd',
          describe: 'Date (YYYY-MM-DD)',
          type: 'string',
          default: new Date().toISOString().split('T')[0]
        })
        .option('course', {
          alias: 'c',
          describe: 'Course Name',
          type: 'string',
          default: 'Full Stack Web Dev - 2'
        })
        .option('faculty', {
          alias: 'f',
          describe: 'Faculty In-Charge Name',
          type: 'string',
          default: 'Faculty In-Charge'
        });
    },
    async (argv) => {
      try {
        await initDB();
        const roll = argv.roll.toUpperCase();
        const student = await Student.findOne({ rollNumber: roll });
        if (!student) {
          console.log(`[Error] Student with roll "${roll}" not found in database.`);
          return;
        }

        const dateObj = new Date(argv.date);
        const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0));
        const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999));

        let session = await Attendance.findOne({
          course: argv.course,
          date: { $gte: startOfDay, $lte: endOfDay }
        });

        const recordEntry = {
          student: student._id,
          rollNumber: student.rollNumber,
          studentName: student.name,
          status: argv.status
        };

        if (session) {
          const recIdx = session.records.findIndex((r) => r.rollNumber === roll);
          if (recIdx >= 0) {
            session.records[recIdx].status = argv.status;
          } else {
            session.records.push(recordEntry);
          }
        } else {
          session = new Attendance({
            date: startOfDay,
            course: argv.course,
            facultyName: argv.faculty,
            records: [recordEntry]
          });
        }

        session.totalPresent = session.records.filter((r) => r.status === 'Present').length;
        session.totalAbsent = session.records.filter((r) => r.status === 'Absent').length;
        session.totalLate = session.records.filter((r) => r.status === 'Late').length;

        await session.save();

        await loggerService.logAttendanceEvent({
          action: 'CLI_ATTENDANCE_MARKED',
          course: argv.course,
          date: argv.date,
          faculty: argv.faculty,
          totalStudents: session.records.length,
          presentCount: session.totalPresent,
          absentCount: session.totalAbsent,
          details: `Student ${roll} marked ${argv.status}`
        });

        console.log(`Attendance recorded successfully:`);
        console.log(`  Student: ${student.name} (${student.rollNumber})`);
        console.log(`  Status:  ${argv.status}`);
        console.log(`  Date:    ${argv.date}`);
        console.log(`  Course:  ${argv.course}`);
      } catch (err) {
        console.error(`[Error] Failed to mark attendance: ${err.message}`);
      } finally {
        await closeDB();
      }
    }
  )
  .command(
    'view-student',
    'View attendance percentage and history for a student',
    (y) => {
      return y.option('roll', {
        alias: 'r',
        describe: 'Student Roll Number',
        type: 'string',
        demandOption: true
      });
    },
    async (argv) => {
      try {
        await initDB();
        const roll = argv.roll.toUpperCase();
        const student = await Student.findOne({ rollNumber: roll });
        if (!student) {
          console.log(`[Error] Student with roll "${roll}" not found.`);
          return;
        }

        const sessions = await Attendance.find({ 'records.rollNumber': roll }).sort({ date: -1 });
        let total = 0;
        let present = 0;
        let absent = 0;

        console.log(`\n========================================`);
        console.log(`Attendance Report: ${student.name} (${student.rollNumber})`);
        console.log(`Course: ${student.course} | Batch: ${student.batch}`);
        console.log(`========================================`);

        sessions.forEach((s) => {
          const rec = s.records.find((r) => r.rollNumber === roll);
          if (rec) {
            total++;
            if (rec.status === 'Present' || rec.status === 'Late') present++;
            else absent++;
            const dt = s.date.toISOString().split('T')[0];
            console.log(`Date: ${dt} | Course: ${s.course.padEnd(25)} | Status: ${rec.status}`);
          }
        });

        const pct = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';
        const isShortage = Number(pct) < 75.0 && total > 0;

        console.log(`----------------------------------------`);
        console.log(`Total Sessions Conducted: ${total}`);
        console.log(`Total Sessions Attended:  ${present}`);
        console.log(`Attendance Percentage:    ${pct}%`);
        console.log(`Eligibility Status:       ${isShortage ? 'Shortage (< 75%)' : 'Eligible (>= 75%)'}`);
        console.log(`========================================\n`);
      } catch (err) {
        console.error(`[Error] Failed to query student attendance: ${err.message}`);
      } finally {
        await closeDB();
      }
    }
  )
  .command(
    'view-logs',
    'Display attendance audit logs from file system',
    (y) => {
      return y.option('limit', {
        alias: 'l',
        describe: 'Number of log lines to show',
        type: 'number',
        default: 10
      });
    },
    async (argv) => {
      try {
        const logs = await loggerService.readAttendanceLogs(argv.limit);
        console.log(`\n--- Last ${logs.length} Log Entries (logs/attendance.log) ---`);
        if (logs.length === 0) {
          console.log('(No logs recorded yet)');
        } else {
          logs.forEach((line) => console.log(line));
        }
        console.log('-----------------------------------------------------------\n');
      } catch (err) {
        console.error(`[Error] Failed to read logs: ${err.message}`);
      }
    }
  )
  .demandCommand(1, 'Please provide a valid command.')
  .help()
  .argv;
