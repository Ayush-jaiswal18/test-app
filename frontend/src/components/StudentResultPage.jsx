import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

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
    setError('');
    setResult(null);

    if (!rollNumber.trim() || !email.trim()) {
      setError('Please enter both roll number and email.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/results/student/${testId}`, {
        rollNumber: rollNumber.trim(),
        studentEmail: email.trim()
      });
      setResult(response.data.data);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const percentage = result
    ? ((result.score / result.totalMarks) * 100).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-brand-soft overflow-x-hidden">
      {/* ── Header / Navbar ── */}
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

      {/* ── Main Content ── */}
      {!result ? (
        /* ════════ LOOKUP FORM (centered) ════════ */
        <div className="flex items-center justify-center px-4 py-12 min-h-[calc(100vh-80px)]">
          <div className="w-full max-w-md">
            <div className="bg-white/90 backdrop-blur rounded-3xl border border-slate-200 shadow-card p-8">
              <div className="text-center mb-8">
                <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-brand-gradient text-white flex items-center justify-center shadow-brand text-2xl">
                  📋
                </div>
                <h1 className="text-3xl font-bold text-brand-primary">View Your Result</h1>
                <p className="text-slate-500 text-sm mt-2">
                  Enter your roll number and email to view your test result.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Roll Number
                  </label>
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="Enter your roll number"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-gradient text-white py-3 rounded-lg font-semibold shadow-brand hover:shadow-lg disabled:opacity-50 transition transform hover:-translate-y-0.5"
                >
                  {loading ? 'Loading...' : 'View Result'}
                </button>
              </form>
            </div>
          </div>
        </div>

      ) : (
        /* ════════ FULL-SCREEN RESULT VIEW ════════ */
        <div className="container mx-auto px-6 py-10">

          {/* Test Title Header */}
          <div className="bg-brand-gradient text-white p-8 rounded-3xl shadow-brand mb-8">
            <h1 className="text-4xl font-bold">{result.testTitle}</h1>
            {result.testDescription && (
              <p className="text-white/80 mt-2">{result.testDescription}</p>
            )}
          </div>

          {/* Top Row: Student Info + Score side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">

            {/* Student Info Card */}
            <div className="lg:col-span-2 bg-white/90 backdrop-blur rounded-3xl border border-slate-200 shadow-card p-8">
              <h2 className="text-xl font-bold text-brand-primary mb-6">Student Details</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="text-slate-500 text-sm">Name</span>
                  <p className="font-semibold text-brand-dark text-lg">{result.studentName}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-sm">Roll Number</span>
                  <p className="font-semibold text-brand-dark text-lg">{result.rollNumber}</p>
                </div>
                <div className="overflow-hidden">
                  <span className="text-slate-500 text-sm">Email</span>
                  <p className="font-semibold text-brand-dark text-lg break-all">{result.studentEmail}</p>
                </div>
                <div className="overflow-hidden">
                  <span className="text-slate-500 text-sm">Submitted At</span>
                  <p className="font-semibold text-brand-dark text-lg">
                    {new Date(result.submittedAt).toLocaleString()}
                  </p>
                </div>
                {result.timeSpent > 0 && (
                  <div>
                    <span className="text-slate-500 text-sm">Time Spent</span>
                    <p className="font-semibold text-brand-dark text-lg">
                      {Math.floor(result.timeSpent / 60)} min {result.timeSpent % 60} sec
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Score Card */}
            <div className="bg-white/90 backdrop-blur rounded-3xl border border-slate-200 shadow-card p-8 flex flex-col items-center justify-center text-center">
              <p className="text-slate-500 text-sm mb-2">Your Score</p>
              <div
                className={`w-32 h-32 rounded-3xl flex items-center justify-center text-3xl font-bold shadow-card mb-4 ${
                  percentage >= 70
                    ? 'bg-emerald-50 text-emerald-700'
                    : percentage >= 40
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {percentage}%
              </div>
              <p className="text-4xl font-bold text-brand-primary">
                {result.score}
                <span className="text-lg text-slate-400"> / {result.totalMarks}</span>
              </p>
              <p className={`mt-2 text-sm font-semibold ${
                percentage >= 70 ? 'text-emerald-600' : percentage >= 40 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {percentage >= 70 ? 'Excellent!' : percentage >= 40 ? 'Good Effort' : 'Needs Improvement'}
              </p>
            </div>
          </div>

          {/* Section Breakdown */}
          {result.sectionBreakdown && result.sectionBreakdown.length > 0 && (
            <div className="bg-white/90 backdrop-blur rounded-3xl border border-slate-200 shadow-card p-8 mb-8">
              <h2 className="text-xl font-bold text-brand-primary mb-6">Section-wise Breakdown</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.sectionBreakdown.map((section, idx) => {
                  const secPct = section.totalMarks > 0
                    ? ((section.score / section.totalMarks) * 100).toFixed(0)
                    : 0;
                  return (
                    <div key={idx} className="bg-brand-soft rounded-2xl border border-slate-100 p-5 flex items-center justify-between">
                      <div>
                        <p className="text-brand-dark font-semibold">{section.sectionTitle}</p>
                        <p className="text-slate-500 text-sm mt-1">{section.score} / {section.totalMarks}</p>
                      </div>
                      <div
                        className={`w-14 h-14 rounded-xl flex items-center justify-center text-sm font-bold ${
                          secPct >= 70
                            ? 'bg-emerald-100 text-emerald-700'
                            : secPct >= 40
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {secPct}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Back button */}
          <div className="text-center">
            <button
              onClick={() => { setResult(null); setError(''); }}
              className="bg-slate-100 text-slate-700 px-8 py-3 rounded-lg font-semibold hover:bg-slate-200 transition"
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
