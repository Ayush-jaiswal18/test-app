const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  studentName: {
    type: String,
    required: [true, "Please enter the student's name"],
    trim: true,
  },
  studentEmail: {
    type: String,
    required: [true, "Please enter the student's email"],
    trim: true,
    lowercase: true,
  },
  rollNumber: {
    type: String,
    required: [true, "Please enter the student's roll number"],
    trim: true,
  },
  test: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Test',
  },
  score: {
    type: Number,
    required: true,
  },
  totalMarks: {
    type: Number,
    required: true,
  },
  // Support both old format (questionIndex) and new format (sectionIndex + questionIndex)
  answers: [{
    sectionIndex: {
      type: Number,
      default: 0, // For backward compatibility
    },
    questionIndex: Number,
    selectedOption: Number,
  }],
  timeSpent: {
    type: Number,
    default: 0, // Total time spent in seconds
  },
  isResumed: {
    type: Boolean,
    default: false, // Track if test was resumed
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Result', resultSchema);