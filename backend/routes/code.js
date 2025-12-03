// backend/routes/code.js
const express = require("express");
const axios = require("axios");
const Question = require("../models/Question.js");
const Submission = require("../models/Submission.js");

const router = express.Router();

// Load env: JUDGE0_URL, JUDGE0_KEY
const JUDGE0_URL = process.env.JUDGE0_URL || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_KEY = process.env.JUDGE0_KEY || "";

function languageIdFor(lang){
  // Minimal mapping, expand as needed:
  const map = { javascript: 63, python: 71, cpp: 54, java: 62 }; 
  return map[lang] || 63;
}

// 1) Run code (single-run, returns stdout/stderr)
router.post("/run", async (req, res) => {
  const { source_code, language = "javascript", stdin = "" } = req.body;
  try {
    // Using Judge0 rapidapi endpoint example (headers vary by host)
    const data = {
      source_code,
      language_id: languageIdFor(language),
      stdin,
      // "cpu_time_limit": 2, // optional
    };

    // If you use RapidAPI hosted Judge0:
    const headers = JUDGE0_KEY ? {
      "content-type": "application/json",
      "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
      "X-RapidAPI-Key": JUDGE0_KEY
    } : {"content-type":"application/json"};

    // Create submission
    const createRes = await axios.post(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, data, { headers });
    return res.json(createRes.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).json({ error: "Execution failed", details: err.response?.data || err.message });
  }
});

// 2) Submit for evaluation against testcases
router.post("/submit/:questionId", async (req, res) => {
  const { questionId } = req.params;
  const { sourceCode, language = "javascript", userId = null } = req.body;

  try {
    const question = await Question.findById(questionId);
    if(!question) return res.status(404).json({ error: "Question not found" });

    const submission = new Submission({
      question: question._id,
      user: userId,
      language,
      sourceCode,
      status: "pending"
    });
    await submission.save();

    // evaluate each testcase sequentially (could parallelize)
    const results = [];
    let score = 0;
    for(const tc of question.testCases){
      // Hit Judge0 for each test case (or batch them)
      const execResp = await axios.post(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
        source_code: sourceCode,
        language_id: languageIdFor(language),
        stdin: tc.input,
        // cpu_time_limit: question.timeLimitSeconds
      }, { headers: JUDGE0_KEY ? {
        "content-type": "application/json",
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        "X-RapidAPI-Key": JUDGE0_KEY
      } : {"content-type":"application/json"} });

      const { stdout, stderr, status } = execResp.data;
      const out = (stdout || "").trim();
      const expected = (tc.expectedOutput || "").trim();

      const passed = out === expected;
      if(passed) score += (tc.weight || 1);

      results.push({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        stdout: stdout,
        stderr: stderr,
        passed,
        status
      });
    }

    submission.results = results;
    submission.score = score;
    submission.status = "done";
    await submission.save();

    return res.json({ submission });
  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).json({ error: "Submission failed", details: err.response?.data || err.message });
  }
});

module.exports = router;
