import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';

const ResultsPage = () => {
  const { testId } = useParams();
  const [results, setResults] = useState([]);
  const [testTitle, setTestTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        const resultsRes = await axios.get(`${API_URL}/api/results/${testId}`, config);
        setResults(resultsRes.data.data);
        
        const testRes = await axios.get(`${API_URL}/api/tests/${testId}/public`);
        setTestTitle(testRes.data.data.title);

      } catch (err) {
        setError('Failed to fetch results.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [testId, API_URL]);

  if (loading) return <p className="text-center mt-8">Loading results...</p>;
  if (error) return <p className="text-center mt-8 text-red-500">{error}</p>;

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Results for "{testTitle}"</h1>
        <Link to="/dashboard" className="text-blue-600 hover:underline">Back to Dashboard</Link>
      </div>

      {results.length === 0 ? (
        <p className="text-center text-gray-500 mt-12">No students have taken this test yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left">Student Name</th>
                <th className="py-3 px-4 text-left">Roll Number</th>
                <th className="py-3 px-4 text-left">Score</th>
                <th className="py-3 px-4 text-left">Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result._id} className="border-b">
                  <td className="py-3 px-4">{result.studentName}</td>
                  <td className="py-3 px-4">{result.rollNumber}</td>
                  <td className="py-3 px-4">{result.score} / {result.totalMarks}</td>
                  <td className="py-3 px-4">{new Date(result.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ResultsPage;
