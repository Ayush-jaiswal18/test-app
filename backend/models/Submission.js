// backend/models/Submission.js
const mongoose = require("mongoose");

const SubmissionSchema = new mongoose.Schema({
  question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  language: { type: String, required: true },
  sourceCode: { type: String, required: true },
  results: { type: Array, default: [] }, // per-testcase results
  score: { type: Number, default: 0 },
  status: { type: String, enum: ["pending","done","error"], default: "pending" },
}, { timestamps: true });

module.exports = mongoose.model("Submission", SubmissionSchema);
