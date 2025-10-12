import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const TestPage = () => {
  const { testId } = useParams();
  const [test, setTest] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [answers, setAnswers] = useState([]);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [error, setError] = useState('');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/tests/${testId}/public`);
        setTest(response.data.data);
        setAnswers(new Array(response.data.data.questions.length).fill(null));
        setTimeLeft(response.data.data.duration * 60);
      } catch (err) {
        setError('Failed to load the test. The link may be invalid.');
      }
    };
    fetchTest();
  }, [testId, API_URL]);

  useEffect(() => {
    let timer;
    if (started && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0 && started) {
      // Auto-submit when timer reaches 0
      handleSubmit();
    }
    return () => clearInterval(timer);
  }, [started, timeLeft]);

  const handleStart = () => {
    if (studentName.trim() && rollNumber.trim()) {
      setStarted(true);
    } else {
      alert('Please enter your name and roll number.');
    }
  };

  const handleAnswerChange = (qIndex, oIndex) => {
    const newAnswers = [...answers];
    newAnswers[qIndex] = { questionIndex: qIndex, selectedOption: oIndex };
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if(!started) return; // Prevent submitting before starting or after time is up from another tab
    
    try {
      const payload = {
        studentName,
        rollNumber,
        testId,
        answers: answers.filter(a => a !== null)
      };
      const response = await axios.post(`${API_URL}/api/results/submit`, payload);
      setScore(response.data.data);
      setSubmitted(true);
      setStarted(false); // Stop timer and interactions
    } catch (err) {
      setError('There was an error submitting your test.');
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (error) return <p className="text-center mt-8 text-red-500">{error}</p>;
  if (!test) return <p className="text-center mt-8">Loading test...</p>;

  if (submitted) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">Test Submitted!</h2>
        <p className="text-xl">Thank you, {studentName}.</p>
        <p className="text-2xl mt-6">Your Score: <span className="font-bold text-blue-600">{score.score}</span> / {score.totalMarks}</p>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg mx-auto">
        <h1 className="text-3xl font-bold mb-2">{test.title}</h1>
        <p className="text-gray-600 mb-6">{test.description}</p>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Your Name</label>
          <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} className="w-full p-2 border rounded" />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Roll Number</label>
          <input type="text" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} className="w-full p-2 border rounded" />
        </div>
        <button onClick={handleStart} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
          Start Test
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h1 className="text-3xl font-bold">{test.title}</h1>
        <div className="text-2xl font-semibold text-red-500">{formatTime(timeLeft)}</div>
      </div>
      {test.questions.map((q, qIndex) => (
        <div key={qIndex} className="mb-8">
          <p className="text-xl font-semibold mb-4">{qIndex + 1}. {q.questionText}</p>
          <div className="space-y-2">
            {q.options.map((option, oIndex) => (
              <label key={oIndex} className="flex items-center p-3 border rounded-lg hover:bg-gray-100 cursor-pointer">
                <input
                  type="radio"
                  name={`question-${qIndex}`}
                  className="mr-3"
                  onChange={() => handleAnswerChange(qIndex, oIndex)}
                />
                {option}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button onClick={handleSubmit} className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition text-lg font-bold">
        Submit Test
      </button>
    </div>
  );
};

export default TestPage;
