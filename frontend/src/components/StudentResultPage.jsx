import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';

/* ───────────────────────────────────────────
   QuestionRow — renders one question's result
─────────────────────────────────────────────*/
const QuestionRow = ({ q, number }) => {
  const [open, setOpen] = useState(false);

  const typeBadge = {
    mcq: { label: 'MCQ', bg: 'bg-blue-100', text: 'text-blue-700' },
    'true-false': { label: 'True/False', bg: 'bg-cyan-100', text: 'text-cyan-700' },
    'fill-blank': { label: 'Fill-blank', bg: 'bg-violet-100', text: 'text-violet-700' },
    descriptive: { label: 'Descriptive', bg: 'bg-amber-100', text: 'text-amber-700' },
    coding: { label: 'Coding', bg: 'bg-purple-100', text: 'text-purple-700' },
    'image-based': { label: 'Image', bg: 'bg-pink-100', text: 'text-pink-700' },
  }[q.questionType] || { label: q.questionType, bg: 'bg-gray-100', text: 'text-gray-600' };

  /* Score pill colour */
  const isFullMark = q.score >= q.maxScore;
  const isZero = q.score === 0;
  const scoreColour = isFullMark
    ? 'bg-emerald-100 text-emerald-700'
    : isZero
      ? 'bg-red-100 text-red-600'
      : 'bg-amber-100 text-amber-700';

  /* Border colour based on result */
  const borderColour =
    q.isCorrect === true ? 'border-green-200' :
      q.isCorrect === false ? 'border-red-200' :
        'border-amber-200'; // descriptive or coding

  return (
    <div className={`mb-3 border-2 ${borderColour} rounded-xl overflow-hidden`}>
      {/* collapsed header – always visible */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition"
        onClick={() => setOpen(o => !o)}
      >
        {/* Number badge */}
        <span className={`shrink-0 w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center
          ${q.isCorrect === true ? 'bg-green-500' : q.isCorrect === false ? 'bg-red-500' : 'bg-amber-500'}`}>
          {number}
        </span>

        {/* Question text (truncated) */}
        <span className="flex-1 font-medium text-gray-800 text-sm line-clamp-1">{q.questionText || q.title || 'Coding Question'}</span>

        {/* Type badge */}
        <span className={`hidden sm:inline-block text-xs px-2 py-0.5 rounded-full font-medium ${typeBadge.bg} ${typeBadge.text}`}>
          {typeBadge.label}
        </span>

        {/* Score pill */}
        <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${scoreColour}`}>
          {q.score} / {q.maxScore}
        </span>

        {/* Expand arrow */}
        <span className={`shrink-0 text-gray-400 text-sm transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {/* expanded detail */}
      {open && (
        <div className="px-5 pb-4 pt-1 bg-white border-t border-gray-100 space-y-3">

          {/* Image if any */}
          {q.imageUrl && (
            <img src={q.imageUrl} alt="Question" className="max-h-40 rounded border mb-2" />
          )}

          {/* MCQ options */}
          {q.options?.length > 0 && (
            <div className="space-y-1">
              {q.options.map((opt, i) => (
                <div key={i} className={`text-sm px-3 py-2 rounded-lg border ${i === q.correctResponse
                    ? 'bg-green-50 border-green-300 font-semibold text-green-800'
                    : i === q.studentResponse && !q.isCorrect
                      ? 'bg-red-50 border-red-300 text-red-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}>
                  {opt}
                  {i === q.correctResponse && <span className="ml-2 text-green-600">✓ Correct</span>}
                  {i === q.studentResponse && i !== q.correctResponse && (
                    <span className="ml-2 text-red-500">← You chose this</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Fill-blank / Descriptive student response */}
          {(q.questionType === 'fill-blank' || q.questionType === 'descriptive') && (
            <div className="space-y-2 text-sm">
              {q.studentResponse ? (
                <div className={`p-3 rounded-lg border ${q.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Your Answer</p>
                  <p className="text-gray-800 whitespace-pre-wrap">{q.studentResponse}</p>
                </div>
              ) : (
                <p className="italic text-gray-400 text-sm">No answer submitted.</p>
              )}
              {q.correctResponse && (
                <div className="p-3 rounded-lg border bg-green-50 border-green-200">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Accepted Answer(s)</p>
                  <p className="text-green-800 font-medium">{q.correctResponse}</p>
                </div>
              )}
            </div>
          )}

          {/* Coding: just show language and truncated code */}
          {q.questionType === 'coding' && (
            <div className="text-sm">
              {q.language && <p className="text-xs text-gray-500 mb-1">Language: <span className="font-medium">{q.language}</span></p>}
              {q.studentResponse ? (
                <pre className="bg-gray-900 text-gray-100 text-xs p-3 rounded-lg overflow-x-auto max-h-40">{q.studentResponse}</pre>
              ) : (
                <p className="italic text-gray-400">No code submitted.</p>
              )}
            </div>
          )}

          {/* Status line */}
          {q.isCorrect !== null && q.questionType !== 'descriptive' && (
            <p className={`text-sm font-semibold ${q.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
              {q.isCorrect ? '✓ Correct' : '✗ Incorrect'}
            </p>
          )}

          {/* Admin feedback */}
          {q.feedback && (
            <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <p className="text-xs font-semibold text-indigo-600 mb-1">💬 Admin Feedback</p>
              <p className="text-sm text-indigo-900 whitespace-pre-wrap">{q.feedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════
   StudentResultPage
═══════════════════════════════════════════*/
const StudentResultPage = () => {
  const { testId } = useParams();
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setResult(null);
    if (!rollNumber.trim() || !email.trim()) { setError('Please enter both roll number and email.'); return; }
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/results/student/${testId}`, {
        rollNumber: rollNumber.trim(),
        studentEmail: email.trim()
      });
      setResult(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  const percentage = result ? ((result.score / result.totalMarks) * 100).toFixed(1) : 0;

  /* ── Download PDF ── */
  const downloadPDF = () => {
    if (!result) return;
    const pdf = new jsPDF(); let y = 10;

    pdf.setFontSize(18); pdf.text(result.testTitle, 10, y); y += 10;
    if (result.testDescription) { pdf.setFontSize(10); pdf.text(result.testDescription, 10, y); y += 7; }

    pdf.setFontSize(13); pdf.text('Student Details', 10, y); y += 8;
    pdf.setFontSize(10);
    pdf.text(`Name: ${result.studentName}`, 10, y); y += 6;
    pdf.text(`Roll Number: ${result.rollNumber}`, 10, y); y += 6;
    pdf.text(`Email: ${result.studentEmail}`, 10, y); y += 6;
    pdf.text(`Submitted At: ${new Date(result.submittedAt).toLocaleString()}`, 10, y); y += 6;
    pdf.text(`Time Spent: ${Math.floor(result.timeSpent / 60)} min ${result.timeSpent % 60} sec`, 10, y); y += 8;

    pdf.setFontSize(13); pdf.text(`Score: ${result.score} / ${result.totalMarks}  (${percentage}%)`, 10, y); y += 10;

    /* Section breakdown */
    if (result.sectionBreakdown?.length > 0) {
      pdf.setFontSize(12); pdf.text('Section Breakdown', 10, y); y += 7;
      result.sectionBreakdown.forEach(sec => {
        if (y > 280) { pdf.addPage(); y = 10; }
        pdf.setFontSize(10);
        pdf.text(`  ${sec.sectionTitle}: ${sec.score} / ${sec.totalMarks}`, 10, y); y += 6;
      });
      y += 4;
    }

    /* Per-question detail */
    const addSection = (title, qArr) => {
      if (!qArr?.length) return;
      if (y > 260) { pdf.addPage(); y = 10; }
      pdf.setFontSize(12); pdf.text(title, 10, y); y += 7;
      qArr.forEach((q, i) => {
        if (y > 270) { pdf.addPage(); y = 10; }
        const qText = pdf.splitTextToSize(`Q${i + 1}: ${q.questionText || q.title || 'Coding Question'}`, 185);
        pdf.setFontSize(10); pdf.text(qText, 10, y); y += qText.length * 5;
        pdf.text(`  Score: ${q.score} / ${q.maxScore}`, 10, y); y += 5;
        if (q.feedback) {
          const fbLines = pdf.splitTextToSize(`  Admin Feedback: ${q.feedback}`, 185);
          pdf.text(fbLines, 10, y); y += fbLines.length * 5;
        }
        y += 2;
      });
    };

    if (Array.isArray(result.questionDetails) && result.questionDetails.length > 0) {
      if (result.questionDetails[0]?.questions) {
        /* sectioned */
        result.questionDetails.forEach(sec => {
          addSection(`Section: ${sec.sectionTitle}`, sec.questions);
        });
      } else {
        addSection('Questions', result.questionDetails);
      }
    }

    pdf.save(`${result.studentName}_Result.pdf`);
  };

  /* ── Normalise question detail (sectioned vs flat) ── */
  const getSections = () => {
    if (!result?.questionDetails?.length) return null;
    const first = result.questionDetails[0];
    if (first?.questions) return result.questionDetails; // sectioned
    return [{ sectionTitle: null, questions: result.questionDetails }]; // flat
  };

  const sections = getSections();

  /* ═══ RENDER ═══ */
  return (
    <div className="min-h-screen bg-brand-soft overflow-x-hidden">
      {/* Navbar */}
      <nav className="bg-white/90 backdrop-blur shadow-brand sticky top-0 z-30">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="flex items-center text-2xl font-bold text-brand-primary">
              <img src="/logo.png" alt="Logo" className="h-16 w-32 mr-2" />
            </Link>
            <span className="text-sm font-medium text-slate-500">Student Result Portal</span>
          </div>
        </div>
      </nav>

      {!result ? (
        /* ════════ LOOKUP FORM ════════ */
        <div className="flex items-center justify-center px-4 py-12 min-h-[calc(100vh-80px)]">
          <div className="w-full max-w-md">
            <div className="bg-white/90 backdrop-blur rounded-3xl border border-slate-200 shadow-card p-8">
              <div className="text-center mb-8">
                <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-brand-gradient text-white flex items-center justify-center shadow-brand text-2xl">📋</div>
                <h1 className="text-3xl font-bold text-brand-primary">View Your Result</h1>
                <p className="text-slate-500 text-sm mt-2">Enter your roll number and email to view your test result.</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Roll Number</label>
                  <input
                    type="text" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="Enter your roll number"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none transition"
                  />
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full bg-brand-gradient text-white py-3 rounded-lg font-semibold shadow-brand hover:shadow-lg disabled:opacity-50 transition transform hover:-translate-y-0.5"
                >
                  {loading ? 'Loading…' : 'View Result'}
                </button>
              </form>
            </div>
          </div>
        </div>

      ) : (
        /* ════════ RESULT VIEW ════════ */
        <div className="container mx-auto px-6 py-10">

          {/* Title banner */}
          <div className="bg-brand-gradient text-white p-8 rounded-3xl shadow-brand mb-8 flex flex-wrap justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl font-bold">{result.testTitle}</h1>
              {result.testDescription && <p className="text-white/75 mt-1 text-sm">{result.testDescription}</p>}
            </div>
            <button
              onClick={downloadPDF}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition backdrop-blur"
            >
              ⬇️ Download Result (PDF)
            </button>
          </div>

          {/* Top cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

            {/* Student info */}
            <div className="lg:col-span-2 bg-white/90 backdrop-blur rounded-3xl border border-slate-200 shadow-card p-8">
              <h2 className="text-lg font-bold text-brand-primary mb-5">Student Details</h2>
              <div className="grid grid-cols-2 gap-5">
                {[
                  ['Name', result.studentName],
                  ['Roll Number', result.rollNumber],
                  ['Email', result.studentEmail],
                  ['Submitted At', new Date(result.submittedAt).toLocaleString()],
                  result.timeSpent > 0 && ['Time Spent', `${Math.floor(result.timeSpent / 60)} min ${result.timeSpent % 60} sec`],
                ].filter(Boolean).map(([label, value]) => (
                  <div key={label} className="overflow-hidden">
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide">{label}</span>
                    <p className="font-semibold text-brand-dark break-all">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Score card */}
            <div className="bg-white/90 backdrop-blur rounded-3xl border border-slate-200 shadow-card p-8 flex flex-col items-center justify-center text-center">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">Your Score</p>
              <div className={`w-32 h-32 rounded-3xl flex items-center justify-center text-3xl font-bold shadow-card mb-4
                ${percentage >= 70 ? 'bg-emerald-50 text-emerald-700' : percentage >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                {percentage}%
              </div>
              <p className="text-4xl font-bold text-brand-primary">
                {result.score}
                <span className="text-lg text-slate-400"> / {result.totalMarks}</span>
              </p>
              <p className={`mt-2 text-sm font-semibold ${percentage >= 70 ? 'text-emerald-600' : percentage >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                {percentage >= 70 ? '🎉 Excellent!' : percentage >= 40 ? '👍 Good Effort' : '📚 Needs Improvement'}
              </p>
            </div>
          </div>

          {/* Section breakdown */}
          {result.sectionBreakdown?.length > 0 && (
            <div className="bg-white/90 backdrop-blur rounded-3xl border border-slate-200 shadow-card p-8 mb-8">
              <h2 className="text-lg font-bold text-brand-primary mb-5">Section-wise Breakdown</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.sectionBreakdown.map((sec, idx) => {
                  const pct = sec.totalMarks > 0 ? ((sec.score / sec.totalMarks) * 100).toFixed(0) : 0;
                  return (
                    <div key={idx} className="bg-brand-soft rounded-2xl border border-slate-100 p-5 flex items-center justify-between">
                      <div>
                        <p className="text-brand-dark font-semibold">{sec.sectionTitle}</p>
                        <p className="text-slate-400 text-sm mt-1">{sec.score} / {sec.totalMarks}</p>
                      </div>
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-sm font-bold
                        ${pct >= 70 ? 'bg-emerald-100 text-emerald-700' : pct >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {pct}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Per-question detail */}
          {sections && (
            <div className="bg-white/90 backdrop-blur rounded-3xl border border-slate-200 shadow-card p-8 mb-8">
              <h2 className="text-lg font-bold text-brand-primary mb-2">Question-wise Breakdown</h2>
              <p className="text-slate-400 text-sm mb-5">Click a question to see your answer, correct answer, and admin feedback.</p>

              {sections.map((sec, sIdx) => (
                <div key={sIdx} className="mb-6">
                  {sec.sectionTitle && (
                    <h3 className="text-base font-bold text-gray-700 mb-3 pb-1 border-b">
                      Section {sIdx + 1}: {sec.sectionTitle}
                    </h3>
                  )}
                  {sec.questions?.map((q, qIdx) => (
                    <QuestionRow key={`${sIdx}-${qIdx}`} q={q} number={qIdx + 1} />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-4 justify-center mt-2">
            <button
              onClick={downloadPDF}
              className="bg-brand-gradient text-white px-8 py-3 rounded-xl font-semibold shadow-brand hover:shadow-lg transition transform hover:-translate-y-0.5"
            >
              ⬇️ Download Result (PDF)
            </button>
            <button
              onClick={() => { setResult(null); setError(''); }}
              className="bg-slate-100 text-slate-700 px-8 py-3 rounded-xl font-semibold hover:bg-slate-200 transition"
            >
              Check Another Result
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentResultPage;
