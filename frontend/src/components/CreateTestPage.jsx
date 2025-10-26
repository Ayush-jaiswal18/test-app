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
  const [useSections, setUseSections] = useState(true); // Always use sections, hide the option
  
  // Sectioned questions (now the only format)
  const [sections, setSections] = useState([
    { 
      sectionTitle: 'Section 1', // Auto-generated 
      sectionDescription: '', // Always empty
      timeLimit: null, // No time limits
      questions: [{ questionText: '', options: ['', '', '', ''], correctAnswer: 0 }]
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
          setAllowResume(testData.allowResume !== undefined ? testData.allowResume : true);
          setShareableLink(testData.shareableLink || '');
          
          if (testData.sections && testData.sections.length > 0) {
            // Test already has sections - ensure auto-generated titles
            const sectionsWithTitles = testData.sections.map((section, index) => ({
              ...section,
              sectionTitle: `Section ${index + 1}`, // Auto-generate title
              sectionDescription: '', // Clear description
              timeLimit: null // Clear time limit
            }));
            setSections(sectionsWithTitles);
          } else if (testData.questions && testData.questions.length > 0) {
            // Convert traditional test to sectioned format with auto-generated title
            setSections([{
              sectionTitle: 'Section 1', // Auto-generated
              sectionDescription: '', // Empty description
              timeLimit: null, // No time limit
              questions: testData.questions
            }]);
          } else {
            // No questions at all, use default with auto-generated title
            setSections([
              { 
                sectionTitle: 'Section 1', // Auto-generated
                sectionDescription: '', // Empty description
                timeLimit: null, // No time limit
                questions: [{ questionText: '', options: ['', '', '', ''], correctAnswer: 0 }]
              }
            ]);
          }
        } catch (err) {
          setError('Failed to fetch test data for editing.');
        }
      };
      fetchTest();
    }
  }, [testId, isEditing, API_URL]);

  // Section handlers
  const handleSectionChange = (sIndex, field, value) => {
    const values = [...sections];
    values[sIndex][field] = value;
    setSections(values);
  };

  const handleSectionQuestionChange = (sIndex, qIndex, event) => {
    const values = [...sections];
    values[sIndex].questions[qIndex][event.target.name] = event.target.value;
    setSections(values);
  };

  const handleSectionOptionChange = (sIndex, qIndex, oIndex, event) => {
    const values = [...sections];
    values[sIndex].questions[qIndex].options[oIndex] = event.target.value;
    setSections(values);
  };

  const handleSectionCorrectAnswerChange = (sIndex, qIndex, event) => {
    const values = [...sections];
    values[sIndex].questions[qIndex].correctAnswer = parseInt(event.target.value);
    setSections(values);
  };

  const addSection = () => {
    setSections([...sections, {
      sectionTitle: `Section ${sections.length + 1}`, // Auto-generated title
      sectionDescription: '', // Empty description
      timeLimit: null, // No time limit
      questions: [{ questionText: '', options: ['', '', '', ''], correctAnswer: 0 }]
    }]);
  };

  const removeSection = (index) => {
    if (sections.length > 1) {
      const values = [...sections];
      values.splice(index, 1);
      setSections(values);
    }
  };

  const addSectionQuestion = (sIndex) => {
    const values = [...sections];
    values[sIndex].questions.push({ questionText: '', options: ['', '', '', ''], correctAnswer: 0 });
    setSections(values);
  };

  const removeSectionQuestion = (sIndex, qIndex) => {
    const values = [...sections];
    if (values[sIndex].questions.length > 1) {
      values[sIndex].questions.splice(qIndex, 1);
      setSections(values);
    }
  };

  const generateShareableLink = async () => {
    if (!testId) {
      setError('Please save the test first before generating a shareable link.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.post(`${API_URL}/api/tests/${testId}/share`, {}, config);
      setShareableLink(response.data.data.shareableLink);
      alert('Shareable link generated successfully!');
    } catch (err) {
      setError('Failed to generate shareable link.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate data before submission
    if (!title.trim() || !description.trim() || duration < 1) {
      setError('Please fill in all required fields with valid data.');
      return;
    }

    // Validate sections
    const hasValidSections = sections.some(section => 
      section.questions.some(q => 
        q.questionText.trim() && 
        q.options.every(opt => opt.trim()) &&
        q.options.length >= 2
      )
    );
    if (!hasValidSections) {
      setError('Please ensure you have at least one complete question with all options filled.');
      return;
    }

    const testData = {
      title: title.trim(),
      description: description.trim(),
      duration: Number(duration),
      allowResume,
      questions: [], // Always empty for sectioned tests
      sections: sections
    };
    
    console.log('Submitting test data:', testData);
    
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      if (isEditing) {
        await axios.put(`${API_URL}/api/tests/${testId}`, testData, config);
        alert('Test updated successfully!');
      } else {
        const response = await axios.post(`${API_URL}/api/tests`, testData, config);
        alert('Test created successfully!');
        // Navigate to edit mode to allow generating shareable link
        navigate(`/edit-test/${response.data.data._id}`);
        return;
      }
      navigate('/dashboard');
    } catch (err) {
      console.error('Full error object:', err);
      console.error('Error response:', err.response?.data);
      
      const errorMessage = err.response?.data?.message || 'An error occurred. Please check your data and try again.';
      const errorDetails = err.response?.data?.details;
      
      if (errorDetails && errorDetails.length > 0) {
        const detailsMessage = errorDetails.map(detail => `${detail.field}: ${detail.message}`).join(', ');
        setError(`${errorMessage}. Details: ${detailsMessage}`);
      } else {
        setError(errorMessage);
      }
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-center">{isEditing ? 'Edit Test' : 'Create a New Test'}</h2>
      {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</p>}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 mb-2">Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="w-full p-2 border rounded" 
              required 
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Duration (in minutes)</label>
            <input 
              type="number" 
              value={duration} 
              onChange={(e) => setDuration(e.target.value)} 
              className="w-full p-2 border rounded" 
              required 
              min="1" 
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Description</label>
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            className="w-full p-2 border rounded" 
            required
          ></textarea>
        </div>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={allowResume}
                  onChange={(e) => setAllowResume(e.target.checked)}
                  className="mr-2"
                />
                Allow students to resume test if interrupted
              </label>
            </div>
          </div>

          {isEditing && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Shareable Link</h4>
                  {shareableLink ? (
                    <p className="text-sm text-gray-600">
                      Link: <span className="font-mono bg-gray-100 p-1 rounded">{`${window.location.origin}/test/share/${shareableLink}`}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">No shareable link generated yet</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={generateShareableLink}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  {shareableLink ? 'Regenerate Link' : 'Generate Shareable Link'}
                </button>
              </div>
            </div>
          )}
        </div>

        <hr className="my-6"/>

        <div className="mb-6">
          <h3 className="text-2xl font-semibold mb-4">Test Sections</h3>
            {sections.map((section, sIndex) => (
              <div key={sIndex} className="mb-8 p-6 border-2 border-blue-200 rounded-lg bg-blue-50">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xl font-semibold text-blue-800">Section {sIndex + 1}</h4>
                </div>

                <h5 className="text-lg font-semibold mb-3 text-gray-800">Questions</h5>
                {section.questions.map((question, qIndex) => (
                  <div key={qIndex} className="mb-6 p-4 border rounded-lg bg-white">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-gray-700 font-semibold">Question {qIndex + 1}</label>
                    </div>
                    
                    <textarea
                      name="questionText"
                      value={question.questionText}
                      onChange={event => handleSectionQuestionChange(sIndex, qIndex, event)}
                      className="w-full p-2 border rounded mb-2"
                      placeholder="Enter the question text"
                      required
                    ></textarea>

                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center mb-2">
                        <input
                          type="text"
                          value={option}
                          onChange={event => handleSectionOptionChange(sIndex, qIndex, oIndex, event)}
                          className="w-full p-2 border rounded"
                          placeholder={`Option ${oIndex + 1}`}
                          required
                        />
                      </div>
                    ))}
                    
                    <div className="mt-2">
                      <label className="block text-sm text-gray-600">Correct Answer:</label>
                      <select 
                        name="correctAnswer" 
                        value={question.correctAnswer} 
                        onChange={event => handleSectionCorrectAnswerChange(sIndex, qIndex, event)} 
                        className="w-full p-2 border rounded"
                      >
                        {question.options.map((_, oIndex) => (
                          <option key={oIndex} value={oIndex}>Option {oIndex + 1}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}

                <button 
                  type="button" 
                  onClick={() => addSectionQuestion(sIndex)} 
                  className="bg-blue-200 text-blue-700 px-4 py-2 rounded hover:bg-blue-300"
                >
                  Add Question to Section
                </button>
              </div>
            ))}

            <button 
              type="button" 
              onClick={addSection} 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-6"
            >
              Add New Section
            </button>
        </div>

        <div className="flex justify-center">
          <button 
            type="submit" 
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition text-lg font-semibold"
          >
            {isEditing ? 'Update Test' : 'Save Test'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTestPage;
