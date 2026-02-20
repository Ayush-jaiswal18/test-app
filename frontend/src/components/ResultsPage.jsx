import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import CodeEditor from './CodeEditor';
import jsPDF from 'jspdf';

/* ─── Toast ─── */
const Toast = ({ toasts }) => (
  <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium
          ${t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}
      >
        {t.msg}
      </div>
    ))}
  </div>
);

/* ─── SavingChip: defined OUTSIDE so it never causes remount ─── */
const SavingChip = ({ status }) => {
  if (!status || status === 'idle') return null;
  if (status === 'pending') return <span className="text-xs text-gray-400 ml-2">typing…</span>;
  if (status === 'saving') return <span className="text-xs text-blue-500 ml-2 animate-pulse">Saving…</span>;
  if (status === 'saved') return <span className="text-xs text-green-600 ml-2">✓ Saved</span>;
  if (status === 'error') return <span className="text-xs text-red-600 ml-2">✗ Error</span>;
  return null;
};

/* ══════════════════════════════════════════════════════════════
   ResultsPage
══════════════════════════════════════════════════════════════ */
const ResultsPage = () => {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [results, setResults] = useState([]);
  const [test, setTest] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* evalState[key] = { score, feedback }
     keys: desc-sIdx-qIdx | coding-sIdx-cqIdx | mcq-sIdx-qIdx */
  const [evalState, setEvalState] = useState({});
  const [savingState, setSavingState] = useState({});
  const [feedbackOpen, setFeedbackOpen] = useState({});
  const [toasts, setToasts] = useState([]);

  const toastIdRef = useRef(0);
  const debounceTimers = useRef({});

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  /* ── helpers ── */
  const addToast = useCallback((msg, type = 'success') => {
    const id = ++toastIdRef.current;
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);

  const getToken = () => localStorage.getItem('token');
  const authCfg = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

  /* ── load results + test on mount ── */
  useEffect(() => {
    if (!getToken()) { navigate('/admin/login'); return; }
    const go = async () => {
      try {
        const [r1, r2] = await Promise.all([
          axios.get(`${API_URL}/api/results/${testId}`, authCfg()),
          axios.get(`${API_URL}/api/tests/${testId}`, authCfg()),
        ]);
        setResults(r1.data.data);
        setTest(r2.data.data);
      } catch (err) {
        if (err.response?.status === 401) { localStorage.removeItem('token'); navigate('/admin/login'); }
        else setError('Failed to fetch results.');
      } finally { setLoading(false); }
    };
    go();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  /* ── fetch one student's details ── */
  const fetchResultDetails = async (resultId) => {
    try {
      const res = await axios.get(`${API_URL}/api/results/${testId}/${resultId}`, authCfg());
      const data = res.data.data;
      setSelectedResult(data);

      const seed = {};
      data.descriptiveAnswers?.forEach(da => {
        seed[`desc-${da.sectionIndex}-${da.questionIndex}`] = {
          score: da.score ?? 0,
          feedback: da.feedback ?? '',
        };
      });
      data.codingAnswers?.forEach(ca => {
        seed[`coding-${ca.sectionIndex}-${ca.codingQuestionIndex}`] = {
          score: ca.score ?? 0,
          feedback: ca.feedback ?? '',
        };
      });
      setEvalState(seed);
      setSavingState({});
      setFeedbackOpen({});
    } catch (err) {
      if (err.response?.status === 401) { localStorage.removeItem('token'); navigate('/admin/login'); }
      else addToast('Failed to fetch result details.', 'error');
    }
  };

  /* ── refresh results table ── */
  const refreshResults = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/results/${testId}`, authCfg());
      setResults(res.data.data);
    } catch (_) { /* silent */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, API_URL]);

  /* ── save descriptive (also used for MCQ feedback) ── */
  const saveDescriptive = useCallback(async (resultId, sIdx, qIdx, score, feedback) => {
    const key = `desc-${sIdx}-${qIdx}`;
    setSavingState(p => ({ ...p, [key]: 'saving' }));
    try {
      await axios.post(
        `${API_URL}/api/results/${resultId}/evaluate-descriptive`,
        { sectionIndex: sIdx, questionIndex: qIdx, score, feedback },
        authCfg()
      );
      setSavingState(p => ({ ...p, [key]: 'saved' }));
      await refreshResults();
      const res = await axios.get(`${API_URL}/api/results/${testId}/${resultId}`, authCfg());
      // Only update score/totalMarks to avoid re-seeding evalState (which would kill focus)
      setSelectedResult(prev => prev ? {
        ...prev,
        score: res.data.data.score,
        totalMarks: res.data.data.totalMarks,
        descriptiveAnswers: res.data.data.descriptiveAnswers,
      } : prev);
    } catch (err) {
      setSavingState(p => ({ ...p, [key]: 'error' }));
      addToast('Save failed: ' + (err.response?.data?.message || err.message), 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, API_URL, refreshResults]);

  /* ── debounce descriptive save ── */
  const scheduleDescriptiveSave = (resultId, sIdx, qIdx, score, feedback) => {
    const key = `desc-${sIdx}-${qIdx}`;
    setSavingState(p => ({ ...p, [key]: 'pending' }));
    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
    debounceTimers.current[key] = setTimeout(() => {
      saveDescriptive(resultId, sIdx, qIdx, score, feedback);
    }, 800);
  };

  /* ── MCQ / fill-blank feedback only ── */
  const saveMcqFeedback = async (resultId, sIdx, qIdx, existingScore, feedback) => {
    const key = `mcq-${sIdx}-${qIdx}`;
    setSavingState(p => ({ ...p, [key]: 'saving' }));
    try {
      await axios.post(
        `${API_URL}/api/results/${resultId}/evaluate-descriptive`,
        { sectionIndex: sIdx, questionIndex: qIdx, score: existingScore, feedback },
        authCfg()
      );
      setSavingState(p => ({ ...p, [key]: 'saved' }));
      addToast('Feedback saved!');
    } catch (err) {
      setSavingState(p => ({ ...p, [key]: 'error' }));
      addToast('Failed: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  /* ── save coding evaluation ── */
  const saveCoding = async (resultId, sIdx, cqIdx) => {
    const key = `coding-${sIdx}-${cqIdx}`;
    const { score = 0, feedback = '' } = evalState[key] || {};
    setSavingState(p => ({ ...p, [key]: 'saving' }));
    try {
      await axios.post(
        `${API_URL}/api/results/${resultId}/evaluate-coding`,
        { sectionIndex: sIdx, codingQuestionIndex: cqIdx, score, feedback },
        authCfg()
      );
      setSavingState(p => ({ ...p, [key]: 'saved' }));
      addToast('Coding evaluation saved!');
      await refreshResults();
      const res = await axios.get(`${API_URL}/api/results/${testId}/${resultId}`, authCfg());
      setSelectedResult(prev => prev ? {
        ...prev,
        score: res.data.data.score,
        totalMarks: res.data.data.totalMarks,
        codingAnswers: res.data.data.codingAnswers,
      } : prev);
    } catch (err) {
      setSavingState(p => ({ ...p, [key]: 'error' }));
      addToast('Failed: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  /* ── PDF ── */
  const downloadResultPDF = () => {
    if (!selectedResult || !test) return;
    const pdf = new jsPDF(); let y = 10;
    pdf.setFontSize(16); pdf.text(`Result Sheet: ${test.title}`, 10, y); y += 10;
    pdf.setFontSize(12);
    pdf.text(`Student Name: ${selectedResult.studentName}`, 10, y); y += 7;
    pdf.text(`Roll Number: ${selectedResult.rollNumber}`, 10, y); y += 7;
    pdf.text(`Email: ${selectedResult.studentEmail}`, 10, y); y += 7;
    pdf.text(`Score: ${selectedResult.score} / ${selectedResult.totalMarks}`, 10, y); y += 7;
    pdf.text(`Time Spent: ${Math.floor(selectedResult.timeSpent / 60)} minutes`, 10, y); y += 10;
    pdf.setFontSize(14); pdf.text('Proctoring Alerts:', 10, y); y += 8;
    if (selectedResult.warnings?.length > 0) {
      selectedResult.warnings.forEach((w, i) => {
        if (y > 280) { pdf.addPage(); y = 10; }
        pdf.setFontSize(10);
        pdf.text(`${i + 1}. ${w.event} (${new Date(w.timestamp).toLocaleString()})`, 10, y); y += 6;
      });
    } else { pdf.setFontSize(10); pdf.text('No proctoring alerts.', 10, y); }
    pdf.save(`${selectedResult.studentName}_Result.pdf`);
  };

  const needsGrading = (result) =>
    result.descriptiveAnswers?.some(da => da.score === undefined || da.score === null);

  /* ══════════ RENDER ══════════ */
  if (loading) return <p className="text-center mt-8 text-gray-500">Loading results…</p>;
  if (error) return <p className="text-center mt-8 text-red-500">{error}</p>;

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-7xl mx-auto">
      <Toast toasts={toasts} />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Results for "{test?.title || 'Test'}"</h1>
        <Link to="/dashboard" className="text-blue-600 hover:underline">Back to Dashboard</Link>
      </div>

      {results.length === 0 ? (
        <p className="text-center text-gray-500 mt-12">No students have taken this test yet.</p>
      ) : (
        <div className="space-y-4">

          {/* ── Table ── */}
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  {['Student Name', 'Roll Number', 'Email', 'Score', 'Submitted At', 'Status', 'Actions'].map(h => (
                    <th key={h} className="py-3 px-4 text-left border text-sm">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 border">{result.studentName}</td>
                    <td className="py-3 px-4 border">{result.rollNumber}</td>
                    <td className="py-3 px-4 border">{result.studentEmail}</td>
                    <td className="py-3 px-4 border font-semibold">{result.score} / {result.totalMarks}</td>
                    <td className="py-3 px-4 border text-sm">{new Date(result.createdAt).toLocaleString()}</td>
                    <td className="py-3 px-4 border">
                      {needsGrading(result)
                        ? <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">⏳ Needs Grading</span>
                        : <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">✓ Graded</span>}
                    </td>
                    <td className="py-3 px-4 border">
                      <button onClick={() => fetchResultDetails(result._id)} className="text-blue-600 hover:underline text-sm">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Detail panel ── */}
          {selectedResult && test && (
            <div className="mt-8 p-6 border-2 border-blue-200 rounded-xl bg-gray-50">

              {/* Header */}
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-2xl font-bold">Detailed View: {selectedResult.studentName}</h2>
                <div className="flex gap-3">
                  <button onClick={downloadResultPDF} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium">
                    ⬇️ Download PDF
                  </button>
                  <button onClick={() => setSelectedResult(null)} className="text-gray-500 hover:text-gray-800 text-xl">✕</button>
                </div>
              </div>

              {/* Score bar */}
              <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-wrap gap-6">
                <div>
                  <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Total Score</p>
                  <p className="text-2xl font-bold text-blue-800">{selectedResult.score} <span className="text-base font-normal text-blue-500">/ {selectedResult.totalMarks}</span></p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Time Spent</p>
                  <p className="text-xl font-bold text-blue-800">{Math.floor(selectedResult.timeSpent / 60)} min</p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Warnings</p>
                  <p className="text-xl font-bold text-blue-800">{selectedResult.warnings?.length ?? 0}</p>
                </div>
              </div>

              {/* Sections */}
              {test.sections?.length > 0 ? test.sections.map((section, sIdx) => (
                <div key={sIdx} className="mb-6 p-5 bg-white rounded-xl border shadow-sm">
                  <h3 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">
                    Section {sIdx + 1}: {section.sectionTitle}
                  </h3>

                  {section.questions.map((question, qIdx) => {

                    /* ── DESCRIPTIVE ── */
                    if (question.questionType === 'descriptive') {
                      const key = `desc-${sIdx}-${qIdx}`;
                      const descriptiveAnswer = selectedResult.descriptiveAnswers?.find(
                        a => a.sectionIndex === sIdx && a.questionIndex === qIdx
                      );
                      const cur = evalState[key] || { score: 0, feedback: '' };
                      const maxPts = question.points || 1;

                      return (
                        <div key={qIdx} className="mb-4 p-4 border-2 border-amber-200 rounded-xl bg-amber-50/30">
                          <div className="flex items-start gap-2 mb-3">
                            <span className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold">{qIdx + 1}</span>
                            <div>
                              <p className="font-semibold text-gray-800">{question.questionText}</p>
                              <div className="flex gap-2 mt-1">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Descriptive</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{maxPts} pt{maxPts !== 1 ? 's' : ''}</span>
                                {question.wordLimit > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">Limit: {question.wordLimit} words</span>}
                              </div>
                            </div>
                          </div>

                          {descriptiveAnswer?.answerText ? (
                            <>
                              {/* Student answer */}
                              <div className="mb-3">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Student's Answer</label>
                                <div className="bg-white border border-gray-200 rounded-lg p-3 whitespace-pre-wrap text-gray-700 text-sm max-h-48 overflow-y-auto">
                                  {descriptiveAnswer.answerText}
                                </div>
                                {question.wordLimit > 0 && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    {descriptiveAnswer.answerText.trim().split(/\s+/).filter(w => w.length > 0).length} / {question.wordLimit} words
                                  </p>
                                )}
                              </div>

                              {/* Model answer */}
                              {question.modelAnswer && (
                                <div className="mb-3">
                                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">📋 Model Answer</label>
                                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm whitespace-pre-wrap text-gray-700">
                                    {question.modelAnswer}
                                  </div>
                                </div>
                              )}

                              {/* Real-time marking panel */}
                              <div className="mt-3 p-4 bg-white border-2 border-amber-300 rounded-xl">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-sm font-bold text-gray-700">🎯 Mark this answer</span>
                                  <SavingChip status={savingState[key]} />
                                </div>

                                {/* Slider + number */}
                                <div className="mb-3">
                                  <label className="text-xs text-gray-500 font-medium block mb-1">
                                    Score: <span className="text-amber-700 font-bold text-base">{cur.score}</span> / {maxPts}
                                  </label>
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="range" min="0" max={maxPts} step="1"
                                      value={cur.score ?? 0}
                                      onChange={(e) => {
                                        const s = Number(e.target.value);
                                        setEvalState(p => ({ ...p, [key]: { ...p[key], score: s } }));
                                        scheduleDescriptiveSave(selectedResult._id, sIdx, qIdx, s, cur.feedback || '');
                                      }}
                                      className="flex-1 accent-amber-500"
                                    />
                                    <input
                                      type="number" min="0" max={maxPts}
                                      value={cur.score ?? 0}
                                      onChange={(e) => {
                                        const s = Math.min(maxPts, Math.max(0, Number(e.target.value)));
                                        setEvalState(p => ({ ...p, [key]: { ...p[key], score: s } }));
                                        scheduleDescriptiveSave(selectedResult._id, sIdx, qIdx, s, cur.feedback || '');
                                      }}
                                      className="w-16 p-1.5 border border-amber-300 rounded text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                                    />
                                  </div>

                                  {/* Quick-tap score buttons */}
                                  <div className="flex gap-1 mt-2 flex-wrap">
                                    {Array.from({ length: maxPts + 1 }, (_, v) => v).map(v => (
                                      <button
                                        key={v}
                                        onClick={() => {
                                          setEvalState(p => ({ ...p, [key]: { ...p[key], score: v } }));
                                          scheduleDescriptiveSave(selectedResult._id, sIdx, qIdx, v, cur.feedback || '');
                                        }}
                                        className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors
                                          ${cur.score === v ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400'}`}
                                      >{v}</button>
                                    ))}
                                  </div>
                                </div>

                                {/* Feedback */}
                                <div>
                                  <label className="text-xs text-gray-500 font-medium block mb-1">💬 Admin Feedback (optional)</label>
                                  <textarea
                                    value={cur.feedback || ''}
                                    onChange={(e) => {
                                      const fb = e.target.value;
                                      setEvalState(p => ({ ...p, [key]: { ...p[key], feedback: fb } }));
                                      scheduleDescriptiveSave(selectedResult._id, sIdx, qIdx, cur.score ?? 0, fb);
                                    }}
                                    rows={2}
                                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                                    placeholder="Write feedback for the student…"
                                  />
                                </div>
                              </div>
                            </>
                          ) : (
                            <p className="text-gray-400 italic text-sm">No answer submitted.</p>
                          )}
                        </div>
                      );
                    }

                    /* ── FILL-BLANK ── */
                    if (question.questionType === 'fill-blank') {
                      const mcqKey = `mcq-${sIdx}-${qIdx}`;
                      const answer = selectedResult.answers.find(a => a.sectionIndex === sIdx && a.questionIndex === qIdx);
                      const userAns = answer?.selectedOption;
                      const accepted = question.acceptableAnswers || [];
                      const isCorrect = question.caseSensitive
                        ? accepted.includes(userAns)
                        : accepted.some(a => a.toLowerCase() === (userAns || '').toLowerCase());
                      const mcqCur = evalState[mcqKey] || { feedback: '' };

                      return (
                        <div key={qIdx} className={`mb-4 p-4 rounded-xl border-2 ${isCorrect ? 'border-green-200 bg-green-50/20' : 'border-red-200 bg-red-50/20'}`}>
                          <div className="flex items-start gap-2 mb-2">
                            <span className={`mt-0.5 shrink-0 w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>{qIdx + 1}</span>
                            <div>
                              <p className="font-semibold text-gray-800">{question.questionText}</p>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Fill-blank</span>
                            </div>
                          </div>
                          <div className="ml-8 space-y-1 text-sm">
                            <p><span className="font-medium text-gray-600">Student's Answer:</span> <span className={`font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>{userAns ?? <em className="text-gray-400">Not answered</em>}</span></p>
                            <p><span className="font-medium text-gray-600">Accepted:</span> {accepted.join(', ')}</p>
                            <p className={`font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>{isCorrect ? '✓ Correct' : '✗ Incorrect'}</p>
                          </div>
                          {/* Feedback toggle */}
                          <div className="ml-8 mt-2">
                            <button
                              onClick={() => setFeedbackOpen(p => ({ ...p, [mcqKey]: !p[mcqKey] }))}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                            >
                              💬 {feedbackOpen[mcqKey] ? 'Hide' : 'Add'} Admin Feedback
                              {mcqCur.feedback && !feedbackOpen[mcqKey] && <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">✓</span>}
                            </button>
                            {feedbackOpen[mcqKey] && (
                              <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                {mcqCur.feedback && <p className="text-xs text-indigo-700 mb-2 italic">Current: "{mcqCur.feedback}"</p>}
                                <textarea
                                  value={mcqCur.feedback || ''}
                                  onChange={(e) => {
                                    const fb = e.target.value;
                                    setEvalState(p => ({ ...p, [mcqKey]: { ...p[mcqKey], feedback: fb } }));
                                  }}
                                  rows={2}
                                  className="w-full p-2 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                  placeholder="Write feedback for the student…"
                                />
                                <div className="flex items-center gap-3 mt-2">
                                  <button
                                    onClick={() => saveMcqFeedback(selectedResult._id, sIdx, qIdx, isCorrect ? (question.points || 1) : 0, mcqCur.feedback || '')}
                                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700"
                                  >Save Feedback</button>
                                  <SavingChip status={savingState[mcqKey]} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    /* ── MCQ / TRUE-FALSE / IMAGE-BASED ── */
                    const mcqKey = `mcq-${sIdx}-${qIdx}`;
                    const answer = selectedResult.answers.find(a => a.sectionIndex === sIdx && a.questionIndex === qIdx);
                    const isCorrect = answer && answer.selectedOption === question.correctAnswer;
                    const mcqCur = evalState[mcqKey] || { feedback: '' };

                    return (
                      <div key={qIdx} className={`mb-4 p-4 rounded-xl border-2 ${isCorrect ? 'border-green-200 bg-green-50/20' : 'border-red-200 bg-red-50/20'}`}>
                        <div className="flex items-start gap-2 mb-2">
                          <span className={`mt-0.5 shrink-0 w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold ${isCorrect ? 'bg-green-500' : answer ? 'bg-red-500' : 'bg-gray-400'}`}>{qIdx + 1}</span>
                          <div>
                            <p className="font-semibold text-gray-800">{question.questionText}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{question.questionType.replace('-', '/')}</span>
                          </div>
                        </div>

                        {question.imageUrl && (
                          <div className="ml-8 mb-2">
                            <img src={question.imageUrl} alt="Question" className="max-h-40 rounded border" />
                          </div>
                        )}

                        <div className="ml-8 space-y-1 mt-2">
                          {question.options?.map((option, oIdx) => (
                            <div key={oIdx} className={`px-3 py-2 rounded-lg text-sm border ${oIdx === question.correctAnswer
                                ? 'bg-green-100 border-green-400 font-semibold text-green-800'
                                : answer && answer.selectedOption === oIdx && !isCorrect
                                  ? 'bg-red-100 border-red-400 text-red-800'
                                  : 'bg-white border-gray-200 text-gray-700'}`}>
                              {option}
                              {oIdx === question.correctAnswer && <span className="ml-2 text-green-600">✓</span>}
                              {answer && answer.selectedOption === oIdx && !isCorrect && <span className="ml-2 text-red-600">✗ (student)</span>}
                            </div>
                          ))}
                        </div>

                        <div className="ml-8 mt-2">
                          <p className={`text-sm font-semibold mb-1 ${isCorrect ? 'text-green-600' : answer ? 'text-red-600' : 'text-gray-500'}`}>
                            {isCorrect ? '✓ Correct' : answer ? '✗ Incorrect' : '— Not answered'}
                          </p>

                          {/* Feedback toggle — inline, no sub-component */}
                          <button
                            onClick={() => setFeedbackOpen(p => ({ ...p, [mcqKey]: !p[mcqKey] }))}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                          >
                            💬 {feedbackOpen[mcqKey] ? 'Hide' : 'Add'} Admin Feedback
                            {mcqCur.feedback && !feedbackOpen[mcqKey] && <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">✓</span>}
                          </button>

                          {feedbackOpen[mcqKey] && (
                            <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                              {mcqCur.feedback && <p className="text-xs text-indigo-700 mb-2 italic">Current: "{mcqCur.feedback}"</p>}
                              <textarea
                                value={mcqCur.feedback || ''}
                                onChange={(e) => {
                                  const fb = e.target.value;
                                  setEvalState(p => ({ ...p, [mcqKey]: { ...p[mcqKey], feedback: fb } }));
                                }}
                                rows={2}
                                className="w-full p-2 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                placeholder="Write feedback for the student…"
                              />
                              <div className="flex items-center gap-3 mt-2">
                                <button
                                  onClick={() => saveMcqFeedback(selectedResult._id, sIdx, qIdx, isCorrect ? (question.points || 1) : 0, mcqCur.feedback || '')}
                                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700"
                                >Save Feedback</button>
                                <SavingChip status={savingState[mcqKey]} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* ── Coding Questions ── */}
                  {section.codingQuestions?.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-base font-bold mb-3 text-gray-700">💻 Coding Questions</h4>
                      {section.codingQuestions.map((codingQuestion, cqIdx) => {
                        const key = `coding-${sIdx}-${cqIdx}`;
                        const codingAnswer = selectedResult.codingAnswers?.find(
                          a => a.sectionIndex === sIdx && a.codingQuestionIndex === cqIdx
                        );
                        const cur = evalState[key] || { score: codingAnswer?.score ?? 0, feedback: codingAnswer?.feedback ?? '' };
                        const maxScore = codingQuestion.testCases?.reduce((sum, tc) => sum + (tc.weight || 1), 0) || 10;

                        return (
                          <div key={cqIdx} className="mb-6 p-5 border-2 border-purple-200 rounded-xl bg-white">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="w-7 h-7 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">C{cqIdx + 1}</span>
                              <h5 className="text-base font-bold text-gray-800">{codingQuestion.title}</h5>
                            </div>
                            <div className="mb-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">{codingQuestion.description}</div>

                            {codingAnswer ? (
                              <>
                                <div className="mb-3">
                                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                    Student's Code ({codingAnswer.language})
                                  </label>
                                  <CodeEditor questionId={null} starterCode={codingAnswer.sourceCode} defaultLanguage={codingAnswer.language} readOnly={true} allowedLanguages={[codingAnswer.language]} />
                                </div>

                                {codingQuestion.testCases?.length > 0 && (
                                  <div className="mb-3">
                                    <h6 className="font-semibold text-sm mb-2 text-gray-700">Test Cases:</h6>
                                    <div className="grid gap-2">
                                      {codingQuestion.testCases.map((tc, tcIdx) => (
                                        <div key={tcIdx} className="p-3 bg-gray-50 rounded-lg border text-sm">
                                          <p><strong>Input:</strong> <code className="bg-gray-200 px-1 rounded">{tc.input}</code></p>
                                          <p><strong>Expected:</strong> <code className="bg-gray-200 px-1 rounded">{tc.expectedOutput}</code></p>
                                          <p className="text-gray-500 text-xs mt-1">Weight: {tc.weight || 1} pt</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Coding eval panel */}
                                <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-bold text-purple-800">🎯 Evaluate Code</span>
                                    <SavingChip status={savingState[key]} />
                                  </div>

                                  <div className="mb-3">
                                    <label className="text-xs text-gray-500 font-medium block mb-1">
                                      Score: <span className="text-purple-700 font-bold">{cur.score}</span> / {maxScore}
                                    </label>
                                    <div className="flex items-center gap-3">
                                      <input type="range" min="0" max={maxScore} step="1"
                                        value={cur.score ?? 0}
                                        onChange={(e) => setEvalState(p => ({ ...p, [key]: { ...p[key], score: Number(e.target.value) } }))}
                                        className="flex-1 accent-purple-500"
                                      />
                                      <input type="number" min="0" max={maxScore}
                                        value={cur.score ?? 0}
                                        onChange={(e) => setEvalState(p => ({ ...p, [key]: { ...p[key], score: Math.min(maxScore, Math.max(0, Number(e.target.value))) } }))}
                                        className="w-16 p-1.5 border border-purple-300 rounded text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
                                      />
                                    </div>
                                  </div>

                                  <div className="mb-3">
                                    <label className="text-xs text-gray-500 font-medium block mb-1">💬 Feedback</label>
                                    <textarea
                                      value={cur.feedback || ''}
                                      onChange={(e) => setEvalState(p => ({ ...p, [key]: { ...p[key], feedback: e.target.value } }))}
                                      rows={2}
                                      className="w-full p-2 text-sm border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                                      placeholder="Write feedback on this code submission…"
                                    />
                                  </div>

                                  <button
                                    onClick={() => saveCoding(selectedResult._id, sIdx, cqIdx)}
                                    className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700"
                                  >Save Evaluation</button>
                                </div>
                              </>
                            ) : (
                              <p className="text-gray-400 italic text-sm">No code submitted.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )) : (
                <div className="p-4 bg-white rounded-lg border">
                  <p className="text-gray-500">No sections found in this test.</p>
                </div>
              )}

              {/* Proctoring */}
              <div className="mt-6 p-5 bg-red-50 rounded-xl border border-red-200">
                <h3 className="text-lg font-bold mb-3 text-red-800">🚨 Proctoring Alerts</h3>
                {selectedResult.warnings?.length > 0 ? (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {selectedResult.warnings.map((w, idx) => (
                      <div key={idx} className="p-3 bg-white border border-red-200 rounded-lg text-sm flex justify-between items-start">
                        <p className="font-semibold text-red-700">🚨 {w.event}</p>
                        <span className="text-xs text-gray-400 ml-4 shrink-0">{new Date(w.timestamp).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-green-700 font-semibold">✓ No proctoring alerts during this test.</p>
                )}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResultsPage;
