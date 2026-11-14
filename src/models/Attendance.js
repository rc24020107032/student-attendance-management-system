const mongoose = require('mongoose');

const attendanceRecordItemSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    rollNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    studentName: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late'],
      default: 'Present',
      required: true
    },
    remarks: {
      type: String,
      default: ''
    }
  },
  { _id: true }
);

const attendanceSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, 'Attendance date is required'],
      index: true
    },
    course: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true
    },
    facultyName: {
      type: String,
      default: 'Faculty In-Charge',
      trim: true
    },
    semester: {
      type: Number,
      default: 5
    },
    records: [attendanceRecordItemSchema],
    totalPresent: {
      type: Number,
      default: 0
    },
    totalAbsent: {
      type: Number,
      default: 0
    },
    totalLate: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Compound index to prevent duplicate sessions for the same course on the same date
attendanceSchema.index({ date: 1, course: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);

