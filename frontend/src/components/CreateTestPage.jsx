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
  const [questions, setQuestions] = useState([
    { questionText: '', options: ['', '', '', ''], correctAnswer: 0 }
  ]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing) {
      const fetchTest = async () => {
        try {
          const response = await axios.get(`${API_URL}/api/tests/${testId}/public`);
          const { title, description, duration, questions } = response.data.data;
          setTitle(title);
          setDescription(description);
          setDuration(duration);
          setQuestions(questions.map(q => ({...q, options: q.options, correctAnswer: q.correctAnswer || 0})));

        } catch (err) {
          setError('Failed to fetch test data for editing.');
        }
      };
      fetchTest();
    }
  }, [testId, isEditing, API_URL]);


  const handleQuestionChange = (index, event) => {
    const values = [...questions];
    values[index][event.target.name] = event.target.value;
    setQuestions(values);
  };

  const handleOptionChange = (qIndex, oIndex, event) => {
    const values = [...questions];
    values[qIndex].options[oIndex] = event.target.value;
    setQuestions(values);
  };

  const handleCorrectAnswerChange = (qIndex, event) => {
    const values = [...questions];
    values[qIndex].correctAnswer = parseInt(event.target.value);
    setQuestions(values);
  };

  const addQuestion = () => {
    setQuestions([...questions, { questionText: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  };

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      const values = [...questions];
      values.splice(index, 1);
      setQuestions(values);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const testData = { title, description, duration: Number(duration), questions };
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
        if(isEditing){
             await axios.put(`${API_URL}/api/tests/${testId}`, testData, config);
             alert('Test updated successfully!');
        } else {
             await axios.post(`${API_URL}/api/tests`, testData, config);
             alert('Test created successfully!');
        }
      navigate('/dashboard');
    } catch (err) {
      setError('An error occurred. Please check your data and try again.');
      console.error(err);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-center">{isEditing ? 'Edit Test' : 'Create a New Test'}</h2>
      {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border rounded" required />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 border rounded" required></textarea>
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Duration (in minutes)</label>
          <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full p-2 border rounded" required min="1" />
        </div>

        <hr className="my-6"/>

        <h3 className="text-2xl font-semibold mb-4">Questions</h3>
        {questions.map((question, qIndex) => (
          <div key={qIndex} className="mb-6 p-4 border rounded-lg bg-gray-50">
            <div className="flex justify-between items-center mb-2">
                <label className="block text-gray-700 font-semibold">Question {qIndex + 1}</label>
                 <button type="button" onClick={() => removeQuestion(qIndex)} className="text-red-500 hover:text-red-700">Remove</button>
            </div>
            
            <textarea
              name="questionText"
              value={question.questionText}
              onChange={event => handleQuestionChange(qIndex, event)}
              className="w-full p-2 border rounded mb-2"
              placeholder="Enter the question text"
              required
            ></textarea>

            {question.options.map((option, oIndex) => (
              <div key={oIndex} className="flex items-center mb-2">
                <input
                  type="text"
                  value={option}
                  onChange={event => handleOptionChange(qIndex, oIndex, event)}
                  className="w-full p-2 border rounded"
                  placeholder={`Option ${oIndex + 1}`}
                  required
                />
              </div>
            ))}
            
            <div className="mt-2">
                <label className="block text-sm text-gray-600">Correct Answer:</label>
                 <select name="correctAnswer" value={question.correctAnswer} onChange={event => handleCorrectAnswerChange(qIndex, event)} className="w-full p-2 border rounded">
                  {question.options.map((_, oIndex) => (
                    <option key={oIndex} value={oIndex}>Option {oIndex + 1}</option>
                  ))}
                </select>
            </div>
          </div>
        ))}

        <div className="flex justify-between items-center mt-6">
            <button type="button" onClick={addQuestion} className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
            Add Another Question
            </button>
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
            {isEditing ? 'Update Test' : 'Save Test'}
            </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTestPage;
