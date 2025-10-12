const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  studentName: {
    type: String,
    required: [true, "Please enter the student's name"],
    trim: true,
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
  answers: [{
    questionIndex: Number,
    selectedOption: Number,
  }, ],
}, {
  timestamps: true
});

module.exports = mongoose.model('Result', resultSchema);