const mongoose = require('mongoose');

const testProgressSchema = new mongoose.Schema({
  studentEmail: {
    type: String,
    required: [true, "Please enter student email"],
    trim: true,
    lowercase: true,
  },
  studentName: {
    type: String,
    required: [true, "Please enter student name"],
    trim: true,
  },
  rollNumber: {
    type: String,
    required: [true, "Please enter student roll number"],
    trim: true,
  },
  test: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Test',
  },
  currentSection: {
    type: Number,
    default: 0, // Current section index
  },
  currentQuestion: {
    type: Number,
    default: 0, // Current question index within the section
  },
  answers: [{
    sectionIndex: Number,
    questionIndex: Number,
    originalQuestionIndex: Number, // For randomized questions
    selectedOption: mongoose.Schema.Types.Mixed, // Can be Number or String for fill-blank
  }],
  codingAnswers: [{
    sectionIndex: Number,
    codingQuestionIndex: Number,
    sourceCode: String,
    language: String,
  }],
  timeSpent: {
    type: Number,
    default: 0, // Time spent in seconds
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  lastSaved: {
    type: Date,
    default: Date.now,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true
});

// Create compound index for faster queries
testProgressSchema.index({ studentEmail: 1, test: 1 }, { unique: true });

module.exports = mongoose.model('TestProgress', testProgressSchema);