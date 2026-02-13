import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

const SUPPORTED_LANGUAGES = ['javascript', 'python', 'cpp', 'java'];
const LANGUAGE_LABELS = {
  javascript: 'JavaScript (Node.js)',
  python: 'Python 3',
  cpp: 'C++',
  java: 'Java'
};

const CreateTestPage = () => {
  const { testId } = useParams();
  const isEditing = Boolean(testId);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(10);
  const [allowResume, setAllowResume] = useState(true);
  const [maxWarnings, setMaxWarnings] = useState(6);
  const [showScoreToStudents, setShowScoreToStudents] = useState(false);

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

  // File upload states for question extraction
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [extractedCodingQuestions, setExtractedCodingQuestions] = useState([]);
  const [showExtractedModal, setShowExtractedModal] = useState(false);
  const [selectedExtractedQuestions, setSelectedExtractedQuestions] = useState([]);
  const [selectedExtractedCodingQuestions, setSelectedExtractedCodingQuestions] = useState([]);
  const [extractionTab, setExtractionTab] = useState('mcq'); // 'mcq' or 'coding'
  const [targetSectionIndex, setTargetSectionIndex] = useState(0);
  const fileInputRef = useRef(null);
  const codingFileInputRef = useRef(null); // Separate ref for coding questions extraction

  // Handle file upload for question extraction
  const handleFileUpload = async (e, sectionIndex, defaultTab = 'mcq') => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|doc|txt)$/i)) {
      setError('Please upload a PDF, DOCX, or TXT file');
      return;
    }

    setIsExtracting(true);
    setError('');
    setTargetSectionIndex(sectionIndex);

    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');

    try {
      const response = await axios.post(`${API_URL}/api/tests/extract-questions`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const { questions, codingQuestions } = response.data.data;
      const hasMCQ = questions && questions.length > 0;
      const hasCoding = codingQuestions && codingQuestions.length > 0;

      if (hasMCQ || hasCoding) {
        setExtractedQuestions(questions || []);
        setExtractedCodingQuestions(codingQuestions || []);
        setSelectedExtractedQuestions((questions || []).map((_, i) => i)); // Select all by default
        setSelectedExtractedCodingQuestions((codingQuestions || []).map((_, i) => i)); // Select all by default
        // Use defaultTab if that type has questions, otherwise show the type that has questions
        if (defaultTab === 'coding' && hasCoding) {
          setExtractionTab('coding');
        } else if (defaultTab === 'mcq' && hasMCQ) {
          setExtractionTab('mcq');
        } else {
          setExtractionTab(hasMCQ ? 'mcq' : 'coding');
        }
        setShowExtractedModal(true);
      } else {
        setError('No questions found in the uploaded file. Please check the file format.');
      }
    } catch (err) {
      console.error('Error extracting questions:', err);
      setError(err.response?.data?.message || 'Failed to extract questions from file');
    } finally {
      setIsExtracting(false);
      // Reset file inputs
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (codingFileInputRef.current) {
        codingFileInputRef.current.value = '';
      }
    }
  };

  // Toggle selection of extracted question
  const toggleExtractedQuestionSelection = (index) => {
    setSelectedExtractedQuestions(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  // Toggle selection of extracted coding question
  const toggleExtractedCodingQuestionSelection = (index) => {
    setSelectedExtractedCodingQuestions(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  // Add selected extracted questions to section
  const addExtractedQuestionsToSection = () => {
    const values = [...sections];
    
    // Add MCQ questions
    selectedExtractedQuestions.forEach(index => {
      const eq = extractedQuestions[index];
      
      if (eq.type === 'mcq' && eq.options && eq.options.length > 0) {
        // Add as MCQ
        values[targetSectionIndex].questions.push({
          questionType: 'mcq',
          questionText: eq.questionText,
          options: eq.options.map(opt => opt.text || opt),
          correctAnswer: eq.correctAnswer !== undefined ? eq.correctAnswer : 0, // Use extracted correct answer
          imageUrl: '',
          acceptableAnswers: [],
          caseSensitive: false,
          points: 1
        });
      } else {
        // Add as fill-in-the-blank or subjective
        values[targetSectionIndex].questions.push({
          questionType: 'fill-blank',
          questionText: eq.questionText,
          options: [],
          correctAnswer: 0,
          imageUrl: '',
          acceptableAnswers: [''],
          caseSensitive: false,
          points: 1
        });
      }
    });

    // Add Coding questions
    selectedExtractedCodingQuestions.forEach(index => {
      const cq = extractedCodingQuestions[index];
      
      // Build the full description with input/output format and constraints
      let fullDescription = cq.description || '';
      if (cq.inputFormat) {
        fullDescription += '\n\n**Input Format:**\n' + cq.inputFormat;
      }
      if (cq.outputFormat) {
        fullDescription += '\n\n**Output Format:**\n' + cq.outputFormat;
      }
      if (cq.constraints) {
        fullDescription += '\n\n**Constraints:**\n' + cq.constraints;
      }

      values[targetSectionIndex].codingQuestions.push({
        title: cq.title || `Coding Question ${cq.questionNumber || values[targetSectionIndex].codingQuestions.length + 1}`,
        description: fullDescription.trim(),
        starterCode: cq.starterCode || '// Write your code here',
        language: cq.language || 'javascript',
        allowedLanguages: cq.allowedLanguages || ['javascript', 'python', 'java', 'cpp'],
        testCases: cq.testCases || []
      });
    });
    
    setSections(values);
    setShowExtractedModal(false);
    setExtractedQuestions([]);
    setExtractedCodingQuestions([]);
    setSelectedExtractedQuestions([]);
    setSelectedExtractedCodingQuestions([]);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');

    // 🔒 FRONTEND GUARD
    if (!token) {
      navigate('/admin/login');
      return;
    }

    if (isEditing) {
      const fetchTest = async () => {
        try {
          const config = { headers: { Authorization: `Bearer ${token}` } };
          const response = await axios.get(`${API_URL}/api/tests/${testId}`, config);
          const testData = response.data.data;

          setTitle(testData.title);
          setDescription(testData.description);
          setDuration(testData.duration);
          setAllowResume(testData.allowResume ?? true);
          setMaxWarnings(testData.maxWarnings ?? 6);
          setShowScoreToStudents(testData.showScoreToStudents ?? false);
          setShareableLink(testData.shareableLink || '');

          if (testData.sections?.length > 0) {
            const sectionsWithTitles = testData.sections.map((section, index) => ({
              ...section,
              sectionTitle: section.sectionTitle || `Section ${index + 1}`,
              codingQuestions: (section.codingQuestions || []).map(cq => ({
                ...cq,
                language: cq.language || 'javascript',
                allowedLanguages:
                  cq.allowedLanguages?.length > 0
                    ? cq.allowedLanguages
                    : [...SUPPORTED_LANGUAGES]
              }))
            }));
            setSections(sectionsWithTitles);
          }
        } catch (err) {
          // ❌ Invalid / expired token
          if (err.response?.status === 401) {
            localStorage.removeItem('token');
            navigate('/admin/login');
          } else {
            setError('Failed to fetch test data for editing.');
          }
        }
      };

      fetchTest();
    }
  }, [testId, isEditing, API_URL, navigate]);


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
      questionType: 'mcq',
      questionText: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      imageUrl: '',
      acceptableAnswers: [],
      caseSensitive: false,
      points: 1
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
      allowedLanguages: [...SUPPORTED_LANGUAGES],
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
    if (field === 'language') {
      const allowed = values[sIndex].codingQuestions[cqIndex].allowedLanguages || [];
      if (!allowed.includes(value)) {
        values[sIndex].codingQuestions[cqIndex].allowedLanguages = [...allowed, value];
      }
    }
    setSections(values);
  };

  const toggleAllowedLanguage = (sIndex, cqIndex, lang) => {
    const values = [...sections];
    const codingQuestion = values[sIndex].codingQuestions[cqIndex];
    if (!codingQuestion.allowedLanguages) {
      codingQuestion.allowedLanguages = [];
    }

    if (codingQuestion.allowedLanguages.includes(lang)) {
      if (codingQuestion.allowedLanguages.length === 1) {
        alert('Each coding question must allow at least one language.');
        return; // Ensure at least one language remains
      }
      codingQuestion.allowedLanguages = codingQuestion.allowedLanguages.filter(l => l !== lang);
    } else {
      codingQuestion.allowedLanguages = [...codingQuestion.allowedLanguages, lang];
    }
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

    const normalizeCodingQuestion = (codingQuestion) => {
      const sanitizedLanguage = SUPPORTED_LANGUAGES.includes(codingQuestion.language)
        ? codingQuestion.language
        : 'javascript';
      const sanitizedAllowed = (codingQuestion.allowedLanguages && codingQuestion.allowedLanguages.length > 0
        ? codingQuestion.allowedLanguages
        : [sanitizedLanguage]
      ).filter(lang => SUPPORTED_LANGUAGES.includes(lang));

      return {
        ...codingQuestion,
        language: sanitizedLanguage,
        allowedLanguages: sanitizedAllowed.length > 0 ? sanitizedAllowed : [sanitizedLanguage],
      };
    };

    const testData = {
      title: title.trim(),
      description: description.trim(),
      duration: Number(duration),
      allowResume,
      maxWarnings: Number(maxWarnings),
      showScoreToStudents,
      questions: [],
      sections: sections.map(s => ({
        ...s,
        codingQuestions: (s.codingQuestions || []).map(normalizeCodingQuestion)
      }))
    };

    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      if (isEditing) {
        await axios.put(`${API_URL}/api/tests/${testId}`, testData, config);
        alert('Test updated successfully!');
        navigate('/dashboard');
      } else {
        const response = await axios.post(`${API_URL}/api/tests`, testData, config);
        alert('Test created successfully!');
        navigate('/dashboard');
        return;
      }

    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/admin/login');
      } else {
        setError('An error occurred while saving the test.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-brand-soft w-full pt-8 pb-8">
      <div className="bg-white p-8 shadow-card rounded-2xl w-full h-full border border-slate-100">
        <h2 className="text-3xl font-bold mb-6 text-center">
          {isEditing ? 'Edit Test' : 'Create a New Test'}
        </h2>
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

            <div className="mb-4">
              <label className="flex items-center p-3 border-2 border-green-200 rounded-lg bg-green-50 cursor-pointer hover:bg-green-100 transition">
                <input
                  type="checkbox"
                  checked={showScoreToStudents}
                  onChange={(e) => setShowScoreToStudents(e.target.checked)}
                  className="mr-2 w-5 h-5"
                />
                <div>
                  <span className="text-gray-700 font-semibold block">Show Score to Students</span>
                  <span className="text-xs text-gray-600 block mt-1">If enabled, students will see their scores immediately after submission. If disabled, only you (admin) can view scores.</span>
                </div>
              </label>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Maximum Warnings (for proctoring)</label>
              <input
                type="number"
                value={maxWarnings}
                onChange={(e) => setMaxWarnings(e.target.value)}
                min="1"
                max="20"
                className="w-full p-2 border rounded"
                placeholder="Enter maximum number of warnings"
              />
              <p className="text-sm text-gray-500 mt-1">Customize the warning here </p>
            </div>
          </div>

          <hr className="my-6" />

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
                  <h4 className="text-xl font-semibold text-black">Section {sIndex + 1}</h4>
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
                    <h5 className="text-lg font-semibold text-gray-800">Questions <span className="text-sm font-normal text-gray-500">(Optional)</span></h5>
                    <div className="flex gap-2">
                      <label className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 text-sm cursor-pointer flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        {isExtracting ? 'Extracting...' : 'Extract from File'}
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept=".pdf,.docx,.doc,.txt"
                          onChange={(e) => handleFileUpload(e, sIndex, 'mcq')}
                          className="hidden"
                          disabled={isExtracting}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => addQuestion(sIndex)}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
                      >
                        + Add Question
                      </button>
                    </div>
                  </div>

                  {section.questions.length === 0 ? (
                    <p className="text-sm text-gray-500 italic mb-3">No questions added. Click "+ Add Question" to add questions.</p>
                  ) : (
                    section.questions.map((question, qIndex) => (
                      <div key={qIndex} className="mb-4 p-4 border rounded-lg bg-white">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-gray-700 font-semibold">Question {qIndex + 1}</label>
                          <button
                            type="button"
                            onClick={() => removeQuestion(sIndex, qIndex)}
                            className="bg-red-200 text-red-700 px-2 py-1 rounded hover:bg-red-300 text-xs"
                          >
                            Remove
                          </button>
                        </div>

                        {/* Question Type Selector */}
                        <div className="mb-3">
                          <label className="block text-gray-700 text-sm font-semibold mb-2">Question Type:</label>
                          <select
                            value={question.questionType || 'mcq'}
                            onChange={(e) => {
                              const newType = e.target.value;
                              handleQuestionChange(sIndex, qIndex, 'questionType', newType);
                              // Reset fields based on type
                              if (newType === 'true-false') {
                                handleQuestionChange(sIndex, qIndex, 'options', ['True', 'False']);
                              } else if (newType === 'fill-blank') {
                                handleQuestionChange(sIndex, qIndex, 'options', []);
                                handleQuestionChange(sIndex, qIndex, 'acceptableAnswers', ['']);
                              } else if (newType === 'mcq' || newType === 'image-based') {
                                if (!question.options || question.options.length === 0) {
                                  handleQuestionChange(sIndex, qIndex, 'options', ['', '', '', '']);
                                }
                              }
                            }}
                            className="w-full p-2 border rounded"
                          >
                            <option value="mcq">Multiple Choice (MCQ)</option>
                            <option value="true-false">True/False</option>
                            <option value="fill-blank">Fill in the Blank</option>
                            <option value="image-based">Image-Based Question</option>
                          </select>
                        </div>

                        {/* Image URL for image-based questions */}
                        {question.questionType === 'image-based' && (
                          <div className="mb-3">
                            <label className="block text-gray-700 text-sm font-semibold mb-2">Image URL:</label>
                            <input
                              type="text"
                              value={question.imageUrl || ''}
                              onChange={(e) => handleQuestionChange(sIndex, qIndex, 'imageUrl', e.target.value)}
                              className="w-full p-2 border rounded"
                              placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                            />
                            {question.imageUrl && (
                              <img src={question.imageUrl} alt="Preview" className="mt-2 max-w-xs border rounded" onError={(e) => { e.target.style.display = 'none'; }} />
                            )}
                          </div>
                        )}

                        <textarea
                          value={question.questionText}
                          onChange={(e) => handleQuestionChange(sIndex, qIndex, 'questionText', e.target.value)}
                          required
                          className="w-full p-2 border rounded mb-3"
                          rows={2}
                          placeholder="Enter question text"
                        />

                        {/* Options for MCQ, True/False, and Image-Based */}
                        {(question.questionType === 'mcq' || question.questionType === 'true-false' || question.questionType === 'image-based') && (
                          <div className="mb-3">
                            <label className="block text-gray-700 text-sm font-semibold mb-2">Options:</label>
                            {question.options && question.options.map((option, oIndex) => (
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
                                  inputMode="text"
                                  value={option || ''}
                                  onChange={(e) => handleOptionChange(sIndex, qIndex, oIndex, e.target.value)}
                                  disabled={question.questionType === 'true-false'}
                                  className="flex-1 p-2 border rounded disabled:bg-gray-100"
                                  placeholder={`Option ${oIndex + 1}`}
                                  autoComplete="off"
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Fill in the Blank */}
                        {question.questionType === 'fill-blank' && (
                          <div className="mb-3">
                            <label className="block text-gray-700 text-sm font-semibold mb-2">Acceptable Answers:</label>
                            <p className="text-xs text-gray-500 mb-2">Add all acceptable variations (e.g., "color", "colour")</p>
                            {(question.acceptableAnswers || ['']).map((answer, aIndex) => (
                              <div key={aIndex} className="flex items-center mb-2">
                                <input
                                  type="text"
                                  value={answer}
                                  onChange={(e) => {
                                    const newAnswers = [...(question.acceptableAnswers || [''])];
                                    newAnswers[aIndex] = e.target.value;
                                    handleQuestionChange(sIndex, qIndex, 'acceptableAnswers', newAnswers);
                                  }}
                                  className="flex-1 p-2 border rounded mr-2"
                                  placeholder={`Answer ${aIndex + 1}`}
                                />
                                {aIndex > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newAnswers = (question.acceptableAnswers || ['']).filter((_, idx) => idx !== aIndex);
                                      handleQuestionChange(sIndex, qIndex, 'acceptableAnswers', newAnswers);
                                    }}
                                    className="bg-red-200 text-red-700 px-2 py-1 rounded hover:bg-red-300 text-xs"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const newAnswers = [...(question.acceptableAnswers || ['']), ''];
                                handleQuestionChange(sIndex, qIndex, 'acceptableAnswers', newAnswers);
                              }}
                              className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                            >
                              + Add Alternative Answer
                            </button>
                            <div className="mt-2">
                              <label className="flex items-center text-sm">
                                <input
                                  type="checkbox"
                                  checked={question.caseSensitive || false}
                                  onChange={(e) => handleQuestionChange(sIndex, qIndex, 'caseSensitive', e.target.checked)}
                                  className="mr-2"
                                />
                                Case Sensitive
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Points */}
                        <div className="mb-2">
                          <label className="block text-gray-700 text-sm font-semibold mb-1">Points:</label>
                          <input
                            type="number"
                            value={question.points || 1}
                            onChange={(e) => handleQuestionChange(sIndex, qIndex, 'points', parseInt(e.target.value) || 1)}
                            min="1"
                            className="w-24 p-2 border rounded"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Coding Questions Section */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="text-lg font-semibold text-gray-800">Coding Questions <span className="text-sm font-normal text-gray-500">(Optional)</span></h5>
                    <div className="flex gap-2">
                      <label className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 text-sm cursor-pointer flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        {isExtracting ? 'Extracting...' : 'Extract from File'}
                        <input
                          type="file"
                          ref={codingFileInputRef}
                          accept=".pdf,.docx,.doc,.txt"
                          onChange={(e) => handleFileUpload(e, sIndex, 'coding')}
                          className="hidden"
                          disabled={isExtracting}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => addCodingQuestion(sIndex)}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
                      >
                        + Add Coding Question
                      </button>
                    </div>
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
                        <label className="block text-gray-700 text-sm mb-1">Default Language (pre-selected):</label>
                        <select
                          value={cq.language}
                          onChange={(e) => handleCodingQuestionChange(sIndex, cqIndex, "language", e.target.value)}
                          className="w-full p-2 border rounded mb-2"
                        >
                          {SUPPORTED_LANGUAGES.map(lang => (
                            <option key={lang} value={lang}>
                              {LANGUAGE_LABELS[lang] || lang}
                            </option>
                          ))}
                        </select>

                        <label className="block text-gray-700 text-sm mb-1">Allowed Languages (students can switch):</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {SUPPORTED_LANGUAGES.map(lang => {
                            const isSelected = cq.allowedLanguages?.includes(lang);
                            return (
                              <label
                                key={lang}
                                className={`flex items-center px-3 py-1 border rounded cursor-pointer text-sm ${isSelected ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 border-gray-300'
                                  }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleAllowedLanguage(sIndex, cqIndex, lang)}
                                  className="mr-2"
                                />
                                {LANGUAGE_LABELS[lang] || lang}
                              </label>
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-500 mb-2">Select at least one language. If only one is selected, students will code in that language.</p>

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
            <button type="submit" className="bg-brand-gradient text-white px-8 py-3 rounded-lg shadow-brand hover:shadow-lg transition transform hover:-translate-y-0.5">
              {isEditing ? 'Update Test' : 'Save Test'}
            </button>
          </div>
        </form>
      </div>

      {/* Extracted Questions Modal */}
      {showExtractedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">
                  Extracted Questions
                </h3>
                <button
                  onClick={() => setShowExtractedModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Select the questions you want to add to Section {targetSectionIndex + 1}
              </p>

              {/* Tabs for MCQ and Coding */}
              <div className="flex mt-4 border-b">
                <button
                  onClick={() => setExtractionTab('mcq')}
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
                    extractionTab === 'mcq'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  MCQ Questions ({extractedQuestions.length})
                </button>
                <button
                  onClick={() => setExtractionTab('coding')}
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
                    extractionTab === 'coding'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Coding Questions ({extractedCodingQuestions.length})
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* MCQ Questions Tab */}
              {extractionTab === 'mcq' && (
                <div className="space-y-3">
                  {extractedQuestions.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No MCQ questions found in the file</p>
                  ) : (
                    extractedQuestions.map((eq, index) => (
                      <div
                        key={index}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                          selectedExtractedQuestions.includes(index)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => toggleExtractedQuestionSelection(index)}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedExtractedQuestions.includes(index)}
                            onChange={() => toggleExtractedQuestionSelection(index)}
                            className="mt-1 w-5 h-5"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-500">Q{eq.questionNumber || index + 1}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                eq.type === 'mcq' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {eq.type === 'mcq' ? 'MCQ' : 'Fill in Blank'}
                              </span>
                              {eq.type === 'mcq' && eq.correctAnswer !== undefined && eq.correctAnswer >= 0 && (
                                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                  Answer: {String.fromCharCode(65 + eq.correctAnswer)}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-800">{eq.questionText}</p>
                            {eq.options && eq.options.length > 0 && (
                              <div className="mt-2 pl-4 space-y-1">
                                {eq.options.map((opt, optIndex) => (
                                  <div 
                                    key={optIndex} 
                                    className={`text-sm flex items-center gap-1 ${
                                      eq.correctAnswer === optIndex 
                                        ? 'text-green-700 font-medium' 
                                        : 'text-gray-600'
                                    }`}
                                  >
                                    {eq.correctAnswer === optIndex && (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                    <span className="font-medium">{opt.label || String.fromCharCode(65 + optIndex)})</span> {opt.text || opt}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Coding Questions Tab */}
              {extractionTab === 'coding' && (
                <div className="space-y-4">
                  {extractedCodingQuestions.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No coding questions found in the file</p>
                  ) : (
                    extractedCodingQuestions.map((cq, index) => (
                      <div
                        key={index}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                          selectedExtractedCodingQuestions.includes(index)
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => toggleExtractedCodingQuestionSelection(index)}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedExtractedCodingQuestions.includes(index)}
                            onChange={() => toggleExtractedCodingQuestionSelection(index)}
                            className="mt-1 w-5 h-5"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-semibold text-gray-500">#{cq.questionNumber || index + 1}</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                                Coding
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                                {cq.language || 'javascript'}
                              </span>
                              {cq.testCases && cq.testCases.length > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                                  {cq.testCases.length} test case(s)
                                </span>
                              )}
                            </div>
                            
                            <h4 className="font-semibold text-gray-800 mb-1">
                              {cq.title || 'Untitled Problem'}
                            </h4>
                            
                            <p className="text-gray-600 text-sm line-clamp-3">
                              {cq.description?.substring(0, 200)}{cq.description?.length > 200 ? '...' : ''}
                            </p>
                            
                            {/* Show input/output format preview */}
                            {(cq.inputFormat || cq.outputFormat) && (
                              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                {cq.inputFormat && (
                                  <div className="bg-gray-50 p-2 rounded">
                                    <span className="font-medium text-gray-700">Input:</span>
                                    <span className="text-gray-500 ml-1">{cq.inputFormat.substring(0, 50)}...</span>
                                  </div>
                                )}
                                {cq.outputFormat && (
                                  <div className="bg-gray-50 p-2 rounded">
                                    <span className="font-medium text-gray-700">Output:</span>
                                    <span className="text-gray-500 ml-1">{cq.outputFormat.substring(0, 50)}...</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Show test cases preview */}
                            {cq.testCases && cq.testCases.length > 0 && (
                              <div className="mt-2 text-xs">
                                <span className="font-medium text-gray-700">Sample Test Case:</span>
                                <div className="mt-1 bg-gray-50 p-2 rounded font-mono text-gray-600">
                                  <div><span className="text-green-600">Input:</span> {cq.testCases[0].input?.substring(0, 50) || 'N/A'}</div>
                                  <div><span className="text-blue-600">Output:</span> {cq.testCases[0].expectedOutput?.substring(0, 50) || 'N/A'}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <span className="mr-4">
                  <span className="font-medium text-blue-600">{selectedExtractedQuestions.length}</span> MCQ selected
                </span>
                <span>
                  <span className="font-medium text-purple-600">{selectedExtractedCodingQuestions.length}</span> Coding selected
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExtractedModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={addExtractedQuestionsToSection}
                  disabled={selectedExtractedQuestions.length === 0 && selectedExtractedCodingQuestions.length === 0}
                  className={`px-4 py-2 rounded-lg text-white transition ${
                    (selectedExtractedQuestions.length > 0 || selectedExtractedCodingQuestions.length > 0)
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  Add Selected Questions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateTestPage;
