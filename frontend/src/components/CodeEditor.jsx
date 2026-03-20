// frontend/src/components/CodeEditor.jsx
import React, { useState, useEffect, useRef } from "react";
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
  const [activeTab, setActiveTab] = useState("input"); // code | input | output

  // Update code when initialCode or starterCode changes
  useEffect(() => {
    if (initialCode !== undefined) {
      setCode(initialCode);
    } else if (starterCode) {
      setCode(starterCode);
    }
  }, [initialCode, starterCode]);

  const defaultLanguageRef = useRef(defaultLanguage || "javascript");
  const editorRef = useRef(null);
  const pasteHandlerRef = useRef(null);

  // Notify parent of code changes
  useEffect(() => {
    if (onCodeChange) {
      onCodeChange(code, language);
    }
  }, [code, language, onCodeChange]);

  // Sync language only when parent default actually changes (e.g., switching questions)
  useEffect(() => {
    if (defaultLanguage && defaultLanguage !== defaultLanguageRef.current) {
      defaultLanguageRef.current = defaultLanguage;
      setLanguage(defaultLanguage);
    }
  }, [defaultLanguage]);

  useEffect(() => {
    return () => {
      if (editorRef.current && pasteHandlerRef.current) {
        const domNode = editorRef.current.getDomNode();
        domNode?.removeEventListener("paste", pasteHandlerRef.current, true);
      }
    };
  }, []);

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;

    if (pasteHandlerRef.current && editor.getDomNode()) {
      editor.getDomNode().removeEventListener("paste", pasteHandlerRef.current, true);
    }

    pasteHandlerRef.current = (event) => {
      event.preventDefault();
      alert("Pasting is disabled during the test.");
    };

    const domNode = editor.getDomNode();
    domNode?.addEventListener("paste", pasteHandlerRef.current, true);

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {});
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Insert, () => {});
  };

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
      setActiveTab("output");
      return;
    }

    setRunning(true);
    setOutput("Running your code...");
    setActiveTab("output");
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
      setActiveTab("output");
      return;
    }

    if (!questionId) {
      setOutput("Error: Question ID not provided");
      setActiveTab("output");
      return;
    }

    setSubmitting(true);
    setOutput("Submitting your code...");
    setActiveTab("output");
    
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
    <div className="w-full h-full bg-slate-900 text-white rounded-2xl shadow-xl overflow-hidden border border-slate-700 flex flex-col">
      {/* Toolbar */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-200">Language</label>
          <select
            value={language}
            onChange={handleLanguageChange}
            disabled={readOnly || running || submitting}
            className="bg-slate-900 text-white px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors text-sm font-semibold"
          >
            {running ? "Running..." : "Run Code"}
          </button>
          {questionId && (
            <button
              onClick={submitCode}
              disabled={running || submitting || readOnly}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors text-sm font-semibold"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          )}
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 min-h-[420px] border-b border-slate-700">
        <Editor
          height="100%"
          language={getLanguageId(language)}
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            readOnly: readOnly,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            formatOnPaste: false,
            formatOnType: false,
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            parameterHints: { enabled: false },
            lightbulb: { enabled: false },
            suggest: {
              showWords: false,
              showFunctions: false,
              showVariables: false,
              showModules: false,
              showSnippets: false,
            },
          }}
        />
      </div>

      {/* Input/Output Tabs */}
      <div className="px-4 pt-3 pb-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("code")}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${
              activeTab === "code"
                ? "bg-slate-900 text-white border-slate-600"
                : "bg-slate-800 text-gray-300 border-slate-700 hover:bg-slate-700"
            }`}
          >
            Code
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("input")}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${
              activeTab === "input"
                ? "bg-slate-900 text-white border-slate-600"
                : "bg-slate-800 text-gray-300 border-slate-700 hover:bg-slate-700"
            }`}
          >
            Input
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("output")}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${
              activeTab === "output"
                ? "bg-slate-900 text-white border-slate-600"
                : "bg-slate-800 text-gray-300 border-slate-700 hover:bg-slate-700"
            }`}
          >
            Output
          </button>
        </div>
      </div>

      {activeTab === "code" && (
        <div className="px-4 pb-4" />
      )}

      {activeTab === "input" && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-200">Standard Input (stdin)</h4>
            <button
              onClick={() => setStdin("")}
              disabled={readOnly || running || submitting}
              className="text-xs text-gray-300 hover:text-white disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              Clear
            </button>
          </div>
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            disabled={readOnly || running || submitting}
            placeholder="Enter input here..."
            className="w-full p-3 font-mono text-sm border border-slate-700 bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-colors"
            rows={3}
          />
        </div>
      )}

      {activeTab === "output" && (
        <div className="px-4 pb-4">
          <div className="mb-2">
            <h4 className="text-sm font-semibold text-gray-200">Output</h4>
          </div>
          <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 font-mono text-sm text-green-200 max-h-64 overflow-auto">
            <pre className="whitespace-pre-wrap">
              {output || "No output yet. Run your code to see results."}
            </pre>
          </div>
        </div>
      )}

      {/* Test Results */}
      {testResults && testResults.length > 0 && (
        <div className="bg-slate-800/40 border-t border-slate-700 p-4">
          <h4 className="text-sm font-semibold text-gray-200 mb-3">Test Case Results</h4>
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-xl border ${
                  result.passed
                    ? "bg-emerald-500/10 border-emerald-500/20"
                    : "bg-red-500/10 border-red-500/20"
                }`}
              >
                <div className="mb-2">
                  <span className={`text-sm font-semibold ${result.passed ? "text-emerald-200" : "text-red-200"}`}>
                    Test Case {index + 1}: {result.passed ? "Passed" : "Failed"}
                  </span>
                </div>
                <div className="text-xs text-gray-300 space-y-1">
                  <div>
                    <strong className="text-gray-200">Input:</strong>{" "}
                    <code className="bg-slate-900 px-2 py-0.5 rounded">{result.input || "N/A"}</code>
                  </div>
                  <div>
                    <strong className="text-gray-200">Expected:</strong>{" "}
                    <code className="bg-slate-900 px-2 py-0.5 rounded">{result.expectedOutput || "N/A"}</code>
                  </div>
                  <div>
                    <strong className="text-gray-200">Got:</strong>{" "}
                    <code className="bg-slate-900 px-2 py-0.5 rounded">{result.stdout || "N/A"}</code>
                  </div>
                  {result.stderr && (
                    <div>
                      <strong className="text-gray-200">Error:</strong>{" "}
                      <code className="bg-red-900/20 px-2 py-0.5 rounded text-red-200">{result.stderr}</code>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
