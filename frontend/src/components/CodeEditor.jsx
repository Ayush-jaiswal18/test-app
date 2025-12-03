// frontend/src/components/CodeEditor.jsx
import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function CodeEditor({ 
  questionId, 
  starterCode, 
  defaultLanguage = "javascript",
  onCodeChange,
  initialCode,
  readOnly = false,
  allowedLanguages = ["javascript", "python", "cpp", "java"]
}) {
  const [code, setCode] = useState(initialCode || starterCode || "");
  const [language, setLanguage] = useState(defaultLanguage || "javascript");
  const [output, setOutput] = useState("");
  const [stdin, setStdin] = useState("");
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [showOutput, setShowOutput] = useState(false);

  // Update code when initialCode or starterCode changes
  useEffect(() => {
    if (initialCode !== undefined) {
      setCode(initialCode);
    } else if (starterCode) {
      setCode(starterCode);
    }
  }, [initialCode, starterCode]);

  // Notify parent of code changes
  useEffect(() => {
    if (onCodeChange) {
      onCodeChange(code, language);
    }
  }, [code, language, onCodeChange]);

  const getLanguageId = (lang) => {
    const map = {
      javascript: "javascript",
      python: "python",
      cpp: "cpp",
      java: "java"
    };
    return map[lang] || "javascript";
  };

  const formatOutput = (data) => {
    if (!data) return "No output";
    
    if (data.status) {
      const status = data.status;
      if (status.id === 3) {
        // Accepted
        return data.stdout || "Program executed successfully!";
      } else if (status.id === 4) {
        // Wrong Answer
        return `Wrong Answer\n${data.stderr || ""}\n${data.stdout || ""}`;
      } else if (status.id === 5) {
        // Time Limit Exceeded
        return "Time Limit Exceeded";
      } else if (status.id === 6) {
        // Compilation Error
        return `Compilation Error:\n${data.compile_output || data.stderr || ""}`;
      } else if (status.id === 7) {
        // Runtime Error
        return `Runtime Error:\n${data.stderr || ""}`;
      } else {
        return `Status: ${status.description || "Unknown"}\n${data.stderr || ""}\n${data.stdout || ""}`;
      }
    }
    
    return JSON.stringify(data, null, 2);
  };

  const runCode = async () => {
    if (!code.trim()) {
      setOutput("Error: Please write some code first");
      setShowOutput(true);
      return;
    }

    setRunning(true);
    setOutput("Running your code...");
    setShowOutput(true);
    setTestResults(null);
    
    try {
      const resp = await axios.post(`${API_URL}/api/code/run`, {
        source_code: code,
        language: getLanguageId(language),
        stdin: stdin
      });
      
      const formattedOutput = formatOutput(resp.data);
      setOutput(formattedOutput);
    } catch (err) {
      setOutput(`Error: ${err.response?.data?.error || err.message || "Failed to execute code"}`);
    } finally {
      setRunning(false);
    }
  };

  const submitCode = async () => {
    if (!code.trim()) {
      setOutput("Error: Please write some code first");
      setShowOutput(true);
      return;
    }

    if (!questionId) {
      setOutput("Error: Question ID not provided");
      setShowOutput(true);
      return;
    }

    setSubmitting(true);
    setOutput("Submitting your code...");
    setShowOutput(true);
    
    try {
      const resp = await axios.post(`${API_URL}/api/code/submit/${questionId}`, {
        sourceCode: code,
        language: getLanguageId(language),
      });
      
      if (resp.data.submission) {
        const submission = resp.data.submission;
        setTestResults(submission.results || []);
        
        if (submission.results && submission.results.length > 0) {
          const passed = submission.results.filter(r => r.passed).length;
          const total = submission.results.length;
          setOutput(`Test Results: ${passed}/${total} test cases passed\nScore: ${submission.score || 0}`);
        } else {
          setOutput("Submission successful!");
        }
      } else {
        setOutput(JSON.stringify(resp.data, null, 2));
      }
    } catch (err) {
      setOutput(`Error: ${err.response?.data?.error || err.message || "Failed to submit code"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCodeChange = (value) => {
    setCode(value || "");
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    // Optionally reset code when language changes
    if (starterCode && !initialCode) {
      setCode(starterCode);
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Language:</label>
          <select
            value={language}
            onChange={handleLanguageChange}
            disabled={readOnly || running || submitting}
            className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {allowedLanguages.map(lang => (
              <option key={lang} value={lang}>
                {lang === "javascript" ? "JavaScript (Node.js)" :
                 lang === "python" ? "Python 3" :
                 lang === "cpp" ? "C++" :
                 lang === "java" ? "Java" : lang}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={runCode}
            disabled={running || submitting || readOnly}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors text-sm font-medium"
          >
            {running ? "Running..." : "▶ Run Code"}
          </button>
          {questionId && (
            <button
              onClick={submitCode}
              disabled={running || submitting || readOnly}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors text-sm font-medium"
            >
              {submitting ? "Submitting..." : "✓ Submit"}
            </button>
          )}
        </div>
      </div>

      {/* Code Editor */}
      <div className="border-t border-gray-300">
        <Editor
          height="500px"
          language={getLanguageId(language)}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{
            readOnly: readOnly,
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: "on",
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      </div>

      {/* Input/Output Section */}
      <div className="border-t border-gray-300">
        {/* Input Section */}
        <div className="border-b border-gray-300">
          <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700">Standard Input (stdin)</h4>
            <button
              onClick={() => setStdin("")}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            disabled={readOnly || running || submitting}
            placeholder="Enter input for your program (optional)"
            className="w-full p-3 font-mono text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
          />
        </div>

        {/* Output Section */}
        <div>
          <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700">Output</h4>
            <button
              onClick={() => setShowOutput(!showOutput)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {showOutput ? "Hide" : "Show"}
            </button>
          </div>
          {showOutput && (
            <div className="p-4 bg-gray-900 text-green-400 font-mono text-sm max-h-64 overflow-auto">
              <pre className="whitespace-pre-wrap">{output || "No output yet. Run your code to see results."}</pre>
            </div>
          )}
        </div>

        {/* Test Results */}
        {testResults && testResults.length > 0 && (
          <div className="border-t border-gray-300 bg-gray-50 p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Test Case Results</h4>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border ${
                    result.passed
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-sm font-semibold ${
                        result.passed ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      Test Case {index + 1}: {result.passed ? "✓ Passed" : "✗ Failed"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>
                      <strong>Input:</strong> <code className="bg-gray-100 px-1 rounded">{result.input || "N/A"}</code>
                    </div>
                    <div>
                      <strong>Expected:</strong> <code className="bg-gray-100 px-1 rounded">{result.expectedOutput || "N/A"}</code>
                    </div>
                    <div>
                      <strong>Got:</strong> <code className="bg-gray-100 px-1 rounded">{result.stdout || "N/A"}</code>
                    </div>
                    {result.stderr && (
                      <div>
                        <strong>Error:</strong> <code className="bg-red-100 px-1 rounded text-red-700">{result.stderr}</code>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
