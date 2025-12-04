const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
  },
  options: [{
    type: String,
    required: true,
  }],
  correctAnswer: {
    type: Number, // Index of the correct option
    required: true,
  },
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
    type: Number, // Duration in minutes
    required: true,
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Admin',
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Test', testSchema);