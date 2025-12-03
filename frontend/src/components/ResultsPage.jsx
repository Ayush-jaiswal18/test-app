import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import CodeEditor from './CodeEditor';

const ResultsPage = () => {
  const { testId } = useParams();
  const [results, setResults] = useState([]);
  const [test, setTest] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [evaluating, setEvaluating] = useState({});
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        const resultsRes = await axios.get(`${API_URL}/api/results/${testId}`, config);
        setResults(resultsRes.data.data);
        
        const testRes = await axios.get(`${API_URL}/api/tests/${testId}/public`);
        setTest(testRes.data.data);

      } catch (err) {
        setError('Failed to fetch results.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [testId, API_URL]);

  const fetchResultDetails = async (resultId) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API_URL}/api/results/${testId}/${resultId}`, config);
      setSelectedResult(response.data.data);
    } catch (err) {
      setError('Failed to fetch result details.');
      console.error(err);
    }
  };

  const handleEvaluateCoding = async (resultId, sectionIndex, codingQuestionIndex, score, feedback) => {
    try {
      setEvaluating({ [resultId]: true });
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      await axios.post(
        `${API_URL}/api/results/${resultId}/evaluate-coding`,
        { sectionIndex, codingQuestionIndex, score, feedback },
        config
      );
      
      // Refresh results
      const resultsRes = await axios.get(`${API_URL}/api/results/${testId}`, config);
      setResults(resultsRes.data.data);
      
      // Refresh selected result if viewing it
      if (selectedResult && selectedResult._id === resultId) {
        await fetchResultDetails(resultId);
      }
      
      alert('Coding question evaluated successfully!');
    } catch (err) {
      alert('Failed to evaluate coding question: ' + (err.response?.data?.message || err.message));
    } finally {
      setEvaluating({ [resultId]: false });
    }
  };

  if (loading) return <p className="text-center mt-8">Loading results...</p>;
  if (error) return <p className="text-center mt-8 text-red-500">{error}</p>;

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Results for "{test?.title || 'Test'}"</h1>
        <Link to="/dashboard" className="text-blue-600 hover:underline">Back to Dashboard</Link>
      </div>

      {results.length === 0 ? (
        <p className="text-center text-gray-500 mt-12">No students have taken this test yet.</p>
      ) : (
        <div className="space-y-4">
          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left border">Student Name</th>
                  <th className="py-3 px-4 text-left border">Roll Number</th>
                  <th className="py-3 px-4 text-left border">Email</th>
                  <th className="py-3 px-4 text-left border">Score</th>
                  <th className="py-3 px-4 text-left border">Submitted At</th>
                  <th className="py-3 px-4 text-left border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 border">{result.studentName}</td>
                    <td className="py-3 px-4 border">{result.rollNumber}</td>
                    <td className="py-3 px-4 border">{result.studentEmail}</td>
                    <td className="py-3 px-4 border font-semibold">
                      {result.score} / {result.totalMarks}
                    </td>
                    <td className="py-3 px-4 border">
                      {new Date(result.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 border">
                      <button
                        onClick={() => fetchResultDetails(result._id)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detailed View */}
          {selectedResult && test && (
            <div className="mt-8 p-6 border-2 border-blue-200 rounded-lg bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  Detailed View: {selectedResult.studentName}
                </h2>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  ✕ Close
                </button>
              </div>

              <div className="mb-4 p-3 bg-blue-100 rounded">
                <p><strong>Score:</strong> {selectedResult.score} / {selectedResult.totalMarks}</p>
                <p><strong>Time Spent:</strong> {Math.floor(selectedResult.timeSpent / 60)} minutes</p>
              </div>

              {/* MCQ Answers */}
              {test.sections && test.sections.length > 0 ? (
                test.sections.map((section, sIdx) => (
                  <div key={sIdx} className="mb-6 p-4 bg-white rounded-lg border">
                    <h3 className="text-xl font-semibold mb-3">
                      Section {sIdx + 1}: {section.sectionTitle}
                    </h3>

                    {/* MCQ Questions */}
                    {section.questions.map((question, qIdx) => {
                      const answer = selectedResult.answers.find(a => 
                        a.sectionIndex === sIdx && a.questionIndex === qIdx
                      );
                      const isCorrect = answer && answer.selectedOption === question.correctAnswer;
                      
                      return (
                        <div key={qIdx} className="mb-4 p-3 border rounded">
                          <p className="font-semibold mb-2">
                            Q{qIdx + 1}: {question.questionText}
                          </p>
                          <div className="ml-4">
                            {question.options.map((option, oIdx) => (
                              <div
                                key={oIdx}
                                className={`p-2 mb-1 rounded ${
                                  oIdx === question.correctAnswer
                                    ? 'bg-green-100 border-green-300'
                                    : answer && answer.selectedOption === oIdx && !isCorrect
                                    ? 'bg-red-100 border-red-300'
                                    : 'bg-gray-50'
                                }`}
                              >
                                {option}
                                {oIdx === question.correctAnswer && ' ✓ Correct'}
                                {answer && answer.selectedOption === oIdx && !isCorrect && ' ✗ Selected (Wrong)'}
                              </div>
                            ))}
                          </div>
                          <p className={`text-sm mt-2 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                            {isCorrect ? '✓ Correct Answer' : '✗ Incorrect Answer'}
                          </p>
                        </div>
                      );
                    })}

                    {/* Coding Questions */}
                    {section.codingQuestions && section.codingQuestions.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-lg font-semibold mb-3">Coding Questions</h4>
                        {section.codingQuestions.map((codingQuestion, cqIdx) => {
                          const codingAnswer = selectedResult.codingAnswers?.find(a => 
                            a.sectionIndex === sIdx && a.codingQuestionIndex === cqIdx
                          );
                          
                          return (
                            <div key={cqIdx} className="mb-6 p-4 border-2 border-purple-200 rounded-lg bg-white">
                              <h5 className="text-lg font-semibold mb-2">
                                Coding Q{cqIdx + 1}: {codingQuestion.title}
                              </h5>
                              <div className="mb-3 p-3 bg-gray-50 rounded">
                                <p className="whitespace-pre-wrap">{codingQuestion.description}</p>
                              </div>

                              {codingAnswer ? (
                                <>
                                  <div className="mb-3">
                                    <label className="block text-sm font-semibold mb-1">Student's Code ({codingAnswer.language}):</label>
                                    <CodeEditor
                                      questionId={null}
                                      starterCode={codingAnswer.sourceCode}
                                      defaultLanguage={codingAnswer.language}
                                      readOnly={true}
                                      allowedLanguages={[codingAnswer.language]}
                                    />
                                  </div>

                                  {/* Test Cases Results (if evaluated) */}
                                  {codingQuestion.testCases && codingQuestion.testCases.length > 0 && (
                                    <div className="mb-3">
                                      <h6 className="font-semibold mb-2">Test Cases:</h6>
                                      <div className="space-y-2">
                                        {codingQuestion.testCases.map((tc, tcIdx) => (
                                          <div key={tcIdx} className="p-2 bg-gray-50 rounded border">
                                            <p className="text-sm"><strong>Input:</strong> <code>{tc.input}</code></p>
                                            <p className="text-sm"><strong>Expected:</strong> <code>{tc.expectedOutput}</code></p>
                                            <p className="text-sm"><strong>Weight:</strong> {tc.weight || 1} points</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Evaluation Section */}
                                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                    <label className="block text-sm font-semibold mb-2">
                                      Score: {codingAnswer.score !== undefined ? codingAnswer.score : 'Not evaluated'}
                                      {codingQuestion.testCases && ` / ${codingQuestion.testCases.reduce((sum, tc) => sum + (tc.weight || 1), 0)}`}
                                    </label>
                                    <div className="flex gap-2 mb-2">
                                      <input
                                        type="number"
                                        id={`score-${sIdx}-${cqIdx}`}
                                        min="0"
                                        max={codingQuestion.testCases?.reduce((sum, tc) => sum + (tc.weight || 1), 0) || 10}
                                        defaultValue={codingAnswer.score || 0}
                                        className="w-24 p-2 border rounded"
                                        placeholder="Score"
                                      />
                                      <textarea
                                        id={`feedback-${sIdx}-${cqIdx}`}
                                        defaultValue={codingAnswer.feedback || ''}
                                        className="flex-1 p-2 border rounded"
                                        rows={2}
                                        placeholder="Feedback (optional)"
                                      />
                                    </div>
                                    <button
                                      onClick={() => {
                                        const score = parseInt(document.getElementById(`score-${sIdx}-${cqIdx}`).value) || 0;
                                        const feedback = document.getElementById(`feedback-${sIdx}-${cqIdx}`).value;
                                        handleEvaluateCoding(selectedResult._id, sIdx, cqIdx, score, feedback);
                                      }}
                                      disabled={evaluating[selectedResult._id]}
                                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                                    >
                                      {evaluating[selectedResult._id] ? 'Evaluating...' : 'Save Evaluation'}
                                    </button>
                                    {codingAnswer.feedback && (
                                      <p className="mt-2 text-sm text-gray-600">
                                        <strong>Previous Feedback:</strong> {codingAnswer.feedback}
                                      </p>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <p className="text-gray-500 italic">No code submitted for this question.</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 bg-white rounded-lg border">
                  <p className="text-gray-500">No sections found in this test.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResultsPage;
