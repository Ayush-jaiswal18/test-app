// backend/models/Question.js
const mongoose = require("mongoose");

const TestCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
  weight: { type: Number, default: 1 }
});

const QuestionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  prompt: { type: String, required: true },
  starterCode: { type: Map, of: String }, // e.g. { javascript: '...' , python: '...' }
  defaultLanguage: { type: String, default: "javascript" },
  languages: [{ type: String }], // allowed languages
  testCases: [TestCaseSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  timeLimitSeconds: { type: Number, default: 2 }
}, { timestamps: true });

module.exports = mongoose.model("Question", QuestionSchema);
