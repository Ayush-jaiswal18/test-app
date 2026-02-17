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
    originalQuestionIndex: Number, // Original index for randomized questions
    originalQuestionIndex: Number, // Original index for randomized questions
    selectedOption: mongoose.Schema.Types.Mixed, // Can be Number (MCQ/TF), String (Fill-Blank/Descriptive), or Object (File Upload)
  }],
  // Descriptive question answers
  descriptiveAnswers: [{
    sectionIndex: {
      type: Number,
      default: 0,
    },
    questionIndex: Number, // Index within the questions array
    answerText: String, // Student's descriptive answer
    score: Number, // Score given by admin
    feedback: String, // Admin feedback
  }],
  // Coding question answers
  codingAnswers: [{
    sectionIndex: {
      type: Number,
      default: 0,
    },
    codingQuestionIndex: Number, // Index within the codingQuestions array
    sourceCode: String,
    language: String,
    submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' }, // Reference to Submission if evaluated
    score: Number, // Score for this coding question
    feedback: String, // Admin feedback for the coding answer
  }],
  timeSpent: {
    type: Number,
    default: 0, // Total time spent in seconds
  },
  isResumed: {
    type: Boolean,
    default: false, // Track if test was resumed
  },
  warnings: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    event: String // Warning event description (e.g., "No face detected", "Tab switched", etc.)
  }],
}, {
  timestamps: true
});

// Create a unique compound index to prevent duplicate submissions
resultSchema.index({ test: 1, studentEmail: 1 }, { unique: true });

module.exports = mongoose.model('Result', resultSchema);