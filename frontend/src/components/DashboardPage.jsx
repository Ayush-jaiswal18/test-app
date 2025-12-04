import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const DashboardPage = () => {
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
      setError('Failed to fetch tests.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
    <div className="min-h-screen relative overflow-hidden">

      {/* Watermark Background */}
      <img
        src="/background.png"
        alt="watermark"
        className="
      absolute top-1/2 left-1/2 
      w-[900px] 
      -translate-x-1/2 -translate-y-1/2 
      opacity-10 
      pointer-events-none select-none 
      -z-10
    "/>

      {/* Actual dashboard content */}
      <div className="relative z-10 min-h-screen px-10 py-8">

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-[#324158]">My Tests</h1>
          <Link to="/create-test" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
            Create New Test
          </Link>
        </div>

        {tests.length === 0 ? (
          <p className="text-center text-gray-500 mt-12">
            You haven't created any tests yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test) => {
              const shareableLink = `${window.location.origin}/test/${test._id}`;

              return (
                <div key={test._id} className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition">

                  <h2 className="text-2xl font-semibold mb-2">{test.title}</h2>
                  <p className="text-gray-600 mb-4">{test.description}</p>

                  <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                    <span>
                      {test.sections && test.sections.length > 0
                        ? `${test.sections.reduce((sum, section) => sum + section.questions.length, 0)} Questions (${test.sections.length} Sections)`
                        : `${test.questions?.length || 0} Questions`}
                    </span>
                    <span>{test.duration} Minutes</span>
                  </div>

                  {test.allowResume && (
                    <div className="mb-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                      ✓ Resume enabled
                    </div>
                  )}

                  <div className="mt-4 space-y-2">
                    <button
                      onClick={() => copyToClipboard(test.shareableLink
                        ? `${window.location.origin}/test/share/${test.shareableLink}`
                        : shareableLink)}
                      className="w-full text-center bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                    >
                      Copy Link
                    </button>

                    <Link to={`/results/${test._id}`} className="block w-full text-center bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-200 transition">
                      View Results
                    </Link>

                    <Link to={`/edit-test/${test._id}`} className="block w-full text-center bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg hover:bg-yellow-200 transition">
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
