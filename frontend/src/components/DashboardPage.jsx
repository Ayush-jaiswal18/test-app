import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

// Small helper to render a check item similar to the Progrentures services list
const DetailRow = ({ text }) => (
  <div className="flex items-center gap-2 text-slate-600 text-sm">
    <span className="h-5 w-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
      ✓
    </span>
    <span>{text}</span>
  </div>
);


const DashboardPage = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchTests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/tests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTests(response.data.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/admin/login');
      } else {
        setError('Failed to fetch tests.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/admin/login');
      return;
    }

    fetchTests();
  }, []);

  const handleDelete = async (testId) => {
    if (window.confirm('Are you sure you want to delete this test?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/api/tests/${testId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchTests();
      } catch (err) {
        setError('Failed to delete test.');
        console.error(err);
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Link copied to clipboard!');
  };

  if (loading) return <p className="text-center mt-8">Loading tests...</p>;
  if (error) return <p className="text-center mt-8 text-red-500">{error}</p>;

  return (
    <div className="min-h-screen bg-brand-soft">
      <div className="relative z-10 min-h-screen px-6 sm:px-10 py-10">

        <div className="flex flex-wrap gap-3 justify-between items-center mb-10">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">Dashboard</p>
            <h1 className="text-4xl font-bold text-brand-primary">My Tests</h1>
          </div>
          <Link
            to="/create-test"
            className="bg-brand-gradient text-white px-6 py-2 rounded-lg shadow-brand hover:shadow-lg transition transform hover:-translate-y-0.5"
          >
            Create New Test
          </Link>
        </div>

        {tests.length === 0 ? (
          <p className="text-center text-gray-500 mt-12">
            You haven't created any tests yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tests.map((test) => {
              const shareableLink = `${window.location.origin}/test/${test._id}`;
              const sectionsCount = test.sections?.length || 0;
              const totalQuestions = test.sections && test.sections.length > 0
                ? test.sections.reduce((sum, section) => sum + section.questions.length, 0)
                : test.questions?.length || 0;

              return (
                <div
                  key={test._id}
                  className="bg-white/90 backdrop-blur p-6 rounded-3xl border border-slate-200 shadow-card hover:shadow-brand transition duration-200 flex flex-col gap-4 hover:-translate-y-1"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-brand-gradient text-white flex items-center justify-center shadow-brand text-xl">
                      {'</>'}
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-brand-primary leading-tight">{test.title}</h2>
                      <p className="text-slate-600 mt-1">{test.description}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <DetailRow text={`${totalQuestions} Questions${sectionsCount ? ` (${sectionsCount} Sections)` : ''}`} />
                    <DetailRow text={`${test.duration} Minutes`} />
                    {test.allowResume && <DetailRow text="Resume enabled" />}
                  </div>

                  <div className="mt-auto space-y-2 border-t border-slate-100 pt-4">
                    <button
                      onClick={() => copyToClipboard(test.shareableLink
                        ? `${window.location.origin}/test/share/${test.shareableLink}`
                        : shareableLink)}
                      className="w-full text-center bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition"
                    >
                      Copy Link
                    </button>

                    <Link to={`/results/${test._id}`} className="block w-full text-center bg-brand-primary/10 text-brand-primary px-4 py-2 rounded-lg hover:bg-brand-primary/20 transition">
                      View Results
                    </Link>

                    <Link to={`/edit-test/${test._id}`} className="block w-full text-center bg-amber-100 text-amber-700 px-4 py-2 rounded-lg hover:bg-amber-200 transition">
                      Edit
                    </Link>

                    <button onClick={() => handleDelete(test._id)} className="w-full text-center bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition">
                      Delete
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
