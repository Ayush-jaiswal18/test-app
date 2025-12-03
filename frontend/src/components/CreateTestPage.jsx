import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

const CreateTestPage = () => {
  const { testId } = useParams();
  const isEditing = Boolean(testId);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(10);
  const [allowResume, setAllowResume] = useState(true);
  
  const [sections, setSections] = useState([
    { 
      sectionTitle: 'Section 1',
      sectionDescription: '',
      timeLimit: null,
      questions: [], // Start with empty - MCQ questions are optional
      codingQuestions: [] // Coding questions are also optional
    }
  ]);

  const [shareableLink, setShareableLink] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing) {
      const fetchTest = async () => {
        try {
          const token = localStorage.getItem('token');
          const config = { headers: { Authorization: `Bearer ${token}` } };
          const response = await axios.get(`${API_URL}/api/tests/${testId}`, config);
          const testData = response.data.data;
          
          setTitle(testData.title);
          setDescription(testData.description);
          setDuration(testData.duration);
          setAllowResume(testData.allowResume ?? true);
          setShareableLink(testData.shareableLink || '');
          
          if (testData.sections?.length > 0) {
            const sectionsWithTitles = testData.sections.map((section, index) => ({
              ...section,
              sectionTitle: section.sectionTitle || `Section ${index + 1}`,
              codingQuestions: section.codingQuestions || []
            }));
            setSections(sectionsWithTitles);
          }
        } catch (err) {
          setError('Failed to fetch test data for editing.');
        }
      };
      fetchTest();
    }
  }, [testId, isEditing, API_URL]);

  // Section Handlers
  const addSection = () => {
    setSections([...sections, {
      sectionTitle: `Section ${sections.length + 1}`,
      sectionDescription: '',
      timeLimit: null,
      questions: [{ questionText: '', options: ['', '', '', ''], correctAnswer: 0 }],
      codingQuestions: []
    }]);
  };

  const removeSection = (sIndex) => {
    if (sections.length > 1) {
      const values = sections.filter((_, index) => index !== sIndex);
      setSections(values);
    } else {
      alert('At least one section is required');
    }
  };

  const handleSectionChange = (sIndex, field, value) => {
    const values = [...sections];
    values[sIndex][field] = value;
    setSections(values);
  };

  // MCQ Question Handlers
  const addQuestion = (sIndex) => {
    const values = [...sections];
    values[sIndex].questions.push({
      questionText: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    });
    setSections(values);
  };

  const removeQuestion = (sIndex, qIndex) => {
    const values = [...sections];
    values[sIndex].questions.splice(qIndex, 1);
    setSections(values);
  };

  const handleQuestionChange = (sIndex, qIndex, field, value) => {
    const values = [...sections];
    values[sIndex].questions[qIndex][field] = value;
    setSections(values);
  };

  const handleOptionChange = (sIndex, qIndex, oIndex, value) => {
    const values = [...sections];
    values[sIndex].questions[qIndex].options[oIndex] = value;
    setSections(values);
  };

  // Coding Question Handlers
  const addCodingQuestion = (sIndex) => {
    const values = [...sections];
    values[sIndex].codingQuestions.push({
      title: '',
      description: '',
      starterCode: '// write your code here',
      language: 'javascript',
      testCases: []
    });
    setSections(values);
  };

  const removeCodingQuestion = (sIndex, cqIndex) => {
    const values = [...sections];
    values[sIndex].codingQuestions.splice(cqIndex, 1);
    setSections(values);
  };

  const handleCodingQuestionChange = (sIndex, cqIndex, field, value) => {
    const values = [...sections];
    values[sIndex].codingQuestions[cqIndex][field] = value;
    setSections(values);
  };

  // Test Case Handlers
  const addTestCase = (sIndex, cqIndex) => {
    const values = [...sections];
    if (!values[sIndex].codingQuestions[cqIndex].testCases) {
      values[sIndex].codingQuestions[cqIndex].testCases = [];
    }
    values[sIndex].codingQuestions[cqIndex].testCases.push({
      input: '',
      expectedOutput: '',
      weight: 1
    });
    setSections(values);
  };

  const removeTestCase = (sIndex, cqIndex, tcIndex) => {
    const values = [...sections];
    values[sIndex].codingQuestions[cqIndex].testCases.splice(tcIndex, 1);
    setSections(values);
  };

  const handleTestCaseChange = (sIndex, cqIndex, tcIndex, field, value) => {
    const values = [...sections];
    values[sIndex].codingQuestions[cqIndex].testCases[tcIndex][field] = value;
    setSections(values);
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    const testData = {
      title: title.trim(),
      description: description.trim(),
      duration: Number(duration),
      allowResume,
      questions: [],
      sections: sections.map(s => ({
        ...s,
        codingQuestions: s.codingQuestions || []
      }))
    };

    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      if (isEditing) {
        await axios.put(`${API_URL}/api/tests/${testId}`, testData, config);
        alert('Test updated successfully!');
      } else {
        const response = await axios.post(`${API_URL}/api/tests`, testData, config);
        alert('Test created successfully!');
        navigate(`/edit-test/${response.data.data._id}`);
        return;
      }
      navigate('/dashboard');
    } catch (err) {
      setError('An error occurred while saving the test.');
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-center">{isEditing ? 'Edit Test' : 'Create a New Test'}</h2>
      {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</p>}

      <form onSubmit={handleSubmit}>
        {/* Basic Test Information */}
        <div className="mb-6">
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Test Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full p-2 border rounded"
              placeholder="Enter test title"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full p-2 border rounded"
              rows={3}
              placeholder="Enter test description"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Duration (minutes) *</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
              min="1"
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={allowResume}
                onChange={(e) => setAllowResume(e.target.checked)}
                className="mr-2"
              />
              <span className="text-gray-700">Allow students to resume test if interrupted</span>
            </label>
          </div>
        </div>

        <hr className="my-6"/>

        {/* Sections */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-semibold">Test Sections</h3>
            <button
              type="button"
              onClick={addSection}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              + Add Section
            </button>
          </div>

          {sections.map((section, sIndex) => (
            <div key={sIndex} className="mb-8 p-6 border-2 border-blue-200 rounded-lg bg-blue-50">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xl font-semibold text-blue-800">Section {sIndex + 1}</h4>
                {sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSection(sIndex)}
                    className="bg-red-200 text-red-700 px-3 py-1 rounded hover:bg-red-300 text-sm"
                  >
                    Remove Section
                  </button>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Section Title *</label>
                <input
                  type="text"
                  value={section.sectionTitle}
                  onChange={(e) => handleSectionChange(sIndex, 'sectionTitle', e.target.value)}
                  required
                  className="w-full p-2 border rounded bg-white"
                  placeholder="Enter section title"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Section Description</label>
                <textarea
                  value={section.sectionDescription}
                  onChange={(e) => handleSectionChange(sIndex, 'sectionDescription', e.target.value)}
                  className="w-full p-2 border rounded bg-white"
                  rows={2}
                  placeholder="Enter section description (optional)"
                />
              </div>

              {/* MCQ Questions Section */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="text-lg font-semibold text-gray-800">Multiple Choice Questions (MCQ) <span className="text-sm font-normal text-gray-500">(Optional)</span></h5>
                  <button
                    type="button"
                    onClick={() => addQuestion(sIndex)}
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
                  >
                    + Add MCQ
                  </button>
                </div>

                {section.questions.length === 0 ? (
                  <p className="text-sm text-gray-500 italic mb-3">No MCQ questions added. Click "+ Add MCQ" to add questions.</p>
                ) : (
                  section.questions.map((question, qIndex) => (
                    <div key={qIndex} className="mb-4 p-4 border rounded-lg bg-white">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-gray-700 font-semibold">MCQ Question {qIndex + 1}</label>
                        <button
                          type="button"
                          onClick={() => removeQuestion(sIndex, qIndex)}
                          className="bg-red-200 text-red-700 px-2 py-1 rounded hover:bg-red-300 text-xs"
                        >
                          Remove
                        </button>
                      </div>

                    <textarea
                      value={question.questionText}
                      onChange={(e) => handleQuestionChange(sIndex, qIndex, 'questionText', e.target.value)}
                      required
                      className="w-full p-2 border rounded mb-3"
                      rows={2}
                      placeholder="Enter question text"
                    />

                    <div className="mb-3">
                      <label className="block text-gray-700 text-sm font-semibold mb-2">Options:</label>
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center mb-2">
                          <input
                            type="radio"
                            name={`correct-${sIndex}-${qIndex}`}
                            checked={question.correctAnswer === oIndex}
                            onChange={() => handleQuestionChange(sIndex, qIndex, 'correctAnswer', oIndex)}
                            className="mr-2"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => handleOptionChange(sIndex, qIndex, oIndex, e.target.value)}
                            required
                            className="flex-1 p-2 border rounded"
                            placeholder={`Option ${oIndex + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  ))
                )}
              </div>

              {/* Coding Questions Section */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="text-lg font-semibold text-gray-800">Coding Questions <span className="text-sm font-normal text-gray-500">(Optional)</span></h5>
                  <button
                    type="button"
                    onClick={() => addCodingQuestion(sIndex)}
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
                  >
                    + Add Coding Question
                  </button>
                </div>

                {section.codingQuestions.length === 0 ? (
                  <p className="text-sm text-gray-500 italic mb-3">No coding questions added. Click "+ Add Coding Question" to add questions.</p>
                ) : (
                  section.codingQuestions.map((cq, cqIndex) => (
                  <div key={cqIndex} className="mb-6 p-4 border rounded-lg bg-white">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-gray-700 font-semibold">Coding Question {cqIndex + 1}</label>
                      <button
                        type="button"
                        onClick={() => removeCodingQuestion(sIndex, cqIndex)}
                        className="bg-red-200 text-red-700 px-2 py-1 rounded hover:bg-red-300 text-xs"
                      >
                        Remove
                      </button>
                    </div>

                    <input
                      type="text"
                      value={cq.title}
                      onChange={(e) => handleCodingQuestionChange(sIndex, cqIndex, "title", e.target.value)}
                      placeholder="Enter coding question title"
                      className="w-full p-2 border rounded mb-2"
                    />
                    <textarea
                      value={cq.description}
                      onChange={(e) => handleCodingQuestionChange(sIndex, cqIndex, "description", e.target.value)}
                      placeholder="Describe the problem statement"
                      className="w-full p-2 border rounded mb-2"
                      rows={3}
                    />
                    <label className="block text-gray-700 text-sm mb-1">Starter Code:</label>
                    <textarea
                      value={cq.starterCode}
                      onChange={(e) => handleCodingQuestionChange(sIndex, cqIndex, "starterCode", e.target.value)}
                      className="w-full p-2 border rounded font-mono mb-2"
                      rows={5}
                    />
                    <label className="block text-gray-700 text-sm mb-1">Language:</label>
                    <select
                      value={cq.language}
                      onChange={(e) => handleCodingQuestionChange(sIndex, cqIndex, "language", e.target.value)}
                      className="w-full p-2 border rounded mb-2"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="cpp">C++</option>
                      <option value="java">Java</option>
                    </select>

                    {/* Test Cases Section */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-gray-700 text-sm font-semibold">Test Cases (for automatic evaluation):</label>
                        <button
                          type="button"
                          onClick={() => addTestCase(sIndex, cqIndex)}
                          className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                        >
                          + Add Test Case
                        </button>
                      </div>
                      {cq.testCases && cq.testCases.length > 0 ? (
                        <div className="space-y-2">
                          {cq.testCases.map((testCase, tcIndex) => (
                            <div key={tcIndex} className="p-2 bg-white border rounded">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold text-gray-600">Test Case {tcIndex + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => removeTestCase(sIndex, cqIndex, tcIndex)}
                                  className="text-xs bg-red-200 text-red-700 px-2 py-1 rounded hover:bg-red-300"
                                >
                                  Remove
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Input:</label>
                                  <textarea
                                    value={testCase.input}
                                    onChange={(e) => handleTestCaseChange(sIndex, cqIndex, tcIndex, "input", e.target.value)}
                                    placeholder="Test input"
                                    className="w-full p-1 border rounded text-xs font-mono"
                                    rows={2}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Expected Output:</label>
                                  <textarea
                                    value={testCase.expectedOutput}
                                    onChange={(e) => handleTestCaseChange(sIndex, cqIndex, tcIndex, "expectedOutput", e.target.value)}
                                    placeholder="Expected output"
                                    className="w-full p-1 border rounded text-xs font-mono"
                                    rows={2}
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Weight (points):</label>
                                <input
                                  type="number"
                                  value={testCase.weight || 1}
                                  onChange={(e) => handleTestCaseChange(sIndex, cqIndex, tcIndex, "weight", parseInt(e.target.value) || 1)}
                                  min="1"
                                  className="w-20 p-1 border rounded text-xs"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">No test cases added. Code will be saved for manual evaluation.</p>
                      )}
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700">
            {isEditing ? 'Update Test' : 'Save Test'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTestPage;
