const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionType: {
    type: String,
    enum: ['mcq', 'true-false', 'fill-blank', 'image-based', 'descriptive'],
    default: 'mcq',
    required: true
  },
  questionText: {
    type: String,
    required: true,
  },
  // For image-based questions
  imageUrl: {
    type: String,
    default: ''
  },
  // For MCQ and True/False
  options: [{
    type: String,
  }],
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed, // Can be Number (index) or String (for fill-blank)
  },
  // For fill-in-the-blank - array of acceptable answers
  acceptableAnswers: [{
    type: String,
  }],
  caseSensitive: {
    type: Boolean,
    default: false // For fill-in-the-blank answers
  },
  // For descriptive questions
  modelAnswer: {
    type: String,
    default: '' // Reference answer for admin evaluation
  },
  wordLimit: {
    type: Number,
    default: 0 // 0 means no limit
  },
  points: {
    type: Number,
    default: 1
  }
});

const codingQuestionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  starterCode: {
    type: String,
    default: '',
  },
  language: {
    type: String,
    default: 'javascript',
    enum: ['javascript', 'python', 'cpp', 'java'],
  },
  allowedLanguages: [{
    type: String,
    enum: ['javascript', 'python', 'cpp', 'java'],
  }],
  testCases: [{
    input: String,
    expectedOutput: String,
    weight: { type: Number, default: 1 }
  }],
});

const sectionSchema = new mongoose.Schema({
  sectionTitle: {
    type: String,
    required: true,
    trim: true,
  },
  sectionDescription: {
    type: String,
    default: '',
  },
  timeLimit: {
    type: Number, // Time limit for this section in minutes (optional)
    default: null,
  },
  questions: [questionSchema],
  codingQuestions: [codingQuestionSchema], // 🆕 Support coding questions
});

const testSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
  },
  duration: {
    type: Number, // Duration in minutes (for global timer)
    required: false, // Not required if using per-question timer
  },
  timerType: {
    type: String,
    enum: ['GLOBAL', 'PER_QUESTION'],
    default: 'GLOBAL',
  },
  globalDuration: {
    type: Number, // Global duration in minutes (same as duration, for clarity)
    default: null,
  },
  perQuestionDuration: {
    type: Number, // Per question duration in seconds
    default: null,
  },
  // Keep backward compatibility - if sections exist, use them, otherwise use questions
  questions: [questionSchema], // For backward compatibility
  sections: [sectionSchema], // New sectioned approach
  shareableLink: {
    type: String,
    unique: true,
    sparse: true, // Allow null values
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  allowResume: {
    type: Boolean,
    default: true, // Allow students to resume test if interrupted
  },
  maxWarnings: {
    type: Number,
    min: 1,
    max: 20
  },
  showScoreToStudents: {
    type: Boolean,
    default: false, // Admin can decide if students see their scores
  },
  // Test availability window (optional - backward compatible)
  startTime: {
    type: Date,
    default: null,
  },
  endTime: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Admin',
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Test', testSchema);