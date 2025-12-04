import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import Proctoring from './Proctoring';
import CodeEditor from './CodeEditor';

const SUPPORTED_LANGUAGES = ['javascript', 'python', 'cpp', 'java'];

const TestPage = () => {
  const { testId, shareLink } = useParams();
  const [test, setTest] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [answers, setAnswers] = useState([]);
  const [codingAnswers, setCodingAnswers] = useState([]); // 🆕 Store coding question answers
  const [questionMode, setQuestionMode] = useState('mcq'); // 'mcq' or 'coding'
  const [currentCodingQuestion, setCurrentCodingQuestion] = useState(0);
  
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [savedProgress, setSavedProgress] = useState(null);
  const [error, setError] = useState('');
  const [isResumed, setIsResumed] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Auto-switch to coding questions if no MCQ questions in current section
  useEffect(() => {
    if (started && test && test.sections && test.sections.length > 0) {
      const currentSectionData = test.sections[currentSection];
      const hasMCQ = currentSectionData.questions && currentSectionData.questions.length > 0;
      const hasCoding = currentSectionData.codingQuestions && currentSectionData.codingQuestions.length > 0;
      
      // If no MCQ but has coding questions, switch to coding mode
      if (!hasMCQ && hasCoding && questionMode === 'mcq') {
        setQuestionMode('coding');
        setCurrentCodingQuestion(0);
      }
      // If no coding but has MCQ questions, switch to MCQ mode
      else if (!hasCoding && hasMCQ && questionMode === 'coding') {
        setQuestionMode('mcq');
        setCurrentQuestion(0);
      }
    }
  }, [currentSection, started, test, questionMode]);

  // Function to save progress periodically
  const saveProgress = useCallback(async () => {
    if (!started || !studentEmail || !test) return;

    try {
      const progressData = {
        studentEmail,
        studentName,
        rollNumber,
        testId: test._id,
        currentSection,
        currentQuestion,
        answers,
        codingAnswers, // 🆕 Include coding answers
        timeSpent
      };
      
      console.log('🔄 SAVING PROGRESS:', {
        answersCount: answers.length,
        currentSection,
        currentQuestion,
        timeSpent,
        answers: answers.map((a, idx) => ({
          index: idx,
          sectionIndex: a?.sectionIndex,
          questionIndex: a?.questionIndex,
          selectedOption: a?.selectedOption
        }))
      });
      
      await axios.post(`${API_URL}/api/progress/save`, progressData);
      console.log('✅ Progress saved successfully');
    } catch (err) {
      console.error('❌ Failed to save progress:', err);
    }
  }, [started, studentEmail, studentName, rollNumber, test, currentSection, currentQuestion, answers, timeSpent, API_URL]);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        let response;
        if (shareLink) {
          response = await axios.get(`${API_URL}/api/tests/share/${shareLink}`);
        } else {
          response = await axios.get(`${API_URL}/api/tests/${testId}/public`);
        }
        
        const testData = response.data.data;
        setTest(testData);
        
        // Initialize answers array based on test structure
        if (testData.sections && testData.sections.length > 0) {
          // For sectioned tests
          const totalQuestions = testData.sections.reduce((sum, section) => sum + section.questions.length, 0);
          setAnswers(new Array(totalQuestions).fill(null));
          // Initialize coding answers
          const totalCodingQuestions = testData.sections.reduce((sum, section) => sum + (section.codingQuestions?.length || 0), 0);
          setCodingAnswers(new Array(totalCodingQuestions).fill(null));
        } else {
          // For traditional tests
          setAnswers(new Array(testData.questions.length).fill(null));
          setCodingAnswers([]);
        }
        
        setTimeLeft(testData.duration * 60);
      } catch (err) {
        setError('Failed to load the test. The link may be invalid.');
      }
    };
    fetchTest();
  }, [testId, shareLink, API_URL]);

  // Check for existing submission and progress when email is entered
  const checkExistingProgress = async (email) => {
    if (!email || !test) return;

    try {
      // First check if test has already been submitted
      const submissionResponse = await axios.get(`${API_URL}/api/results/check/${test._id}/${email}`);
      
      if (submissionResponse.data.isSubmitted) {
        // Test already submitted - show submission result
        const submissionData = submissionResponse.data.data;
        setScore({
          score: submissionData.score,
          totalMarks: submissionData.totalMarks,
          message: 'Test already submitted!',
          submittedAt: submissionData.submittedAt
        });
        setSubmitted(true);
        setStarted(false);
        return;
      }

      // If not submitted, check for existing progress
      try {
        const progressResponse = await axios.get(`${API_URL}/api/progress/${test._id}/${email}`);
        const savedData = progressResponse.data.data;
        
        console.log('📥 RETRIEVED PROGRESS:', {
          answersCount: savedData.answers?.length || 0,
          currentSection: savedData.currentSection,
          currentQuestion: savedData.currentQuestion,
          timeSpent: savedData.timeSpent,
          answers: savedData.answers?.map((a, idx) => ({
            index: idx,
            sectionIndex: a?.sectionIndex,
            questionIndex: a?.questionIndex,
            selectedOption: a?.selectedOption
          })) || []
        });
        
        setSavedProgress(savedData);
        setShowResumeDialog(true);
      } catch (progressErr) {
        // No existing progress found, which is fine
        setSavedProgress(null);
      }
    } catch (err) {
      console.error('Error checking existing progress/submission:', err);
      // Continue with normal flow if there's an error
      setSavedProgress(null);
    }
  };

  useEffect(() => {
    let timer;
    if (started && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prevTime => {
          const newTimeLeft = prevTime - 1;
          console.log('Timer tick - Time left:', newTimeLeft);
          return newTimeLeft;
        });
        setTimeSpent(prevTime => {
          const newTimeSpent = prevTime + 1;
          console.log('Timer tick - Time spent:', newTimeSpent);
          return newTimeSpent;
        });
      }, 1000);
    } else if (timeLeft === 0 && started) {
      // Auto-submit when timer reaches 0
      console.log('Time up! Auto-submitting test');
      handleSubmit();
    }
    return () => clearInterval(timer);
  }, [started, timeLeft]);

  // Auto-save progress every 30 seconds
  useEffect(() => {
    let autoSaveTimer;
    if (started) {
      autoSaveTimer = setInterval(saveProgress, 30000);
    }
    return () => clearInterval(autoSaveTimer);
  }, [started, saveProgress]);

  const handleStart = async () => {
    if (studentName.trim() && studentEmail.trim() && rollNumber.trim()) {
      await checkExistingProgress(studentEmail);
      
      // If no dialog is shown (no existing progress/submission), start fresh
      if (!showResumeDialog) {
        // Initialize fresh start values
        setTimeSpent(0);
        setTimeLeft(test.duration * 60);
        setCurrentSection(0);
        setCurrentQuestion(0);
        setCurrentCodingQuestion(0);
        setIsResumed(false);
        
        // Auto-set question mode based on first section
        if (test.sections && test.sections.length > 0) {
          const firstSection = test.sections[0];
          const hasMCQ = firstSection.questions && firstSection.questions.length > 0;
          const hasCoding = firstSection.codingQuestions && firstSection.codingQuestions.length > 0;
          
          if (!hasMCQ && hasCoding) {
            setQuestionMode('coding');
          } else {
            setQuestionMode('mcq');
          }
        }
        
        console.log('Starting fresh test (no existing progress):', {
          totalDuration: test.duration * 60,
          timeSpent: 0,
          timeLeft: test.duration * 60
        });
        
        setStarted(true);
      }
    } else {
      alert('Please enter your name, email, and roll number.');
    }
  };

  const handleResumeTest = () => {
    if (savedProgress) {
      setCurrentSection(savedProgress.currentSection || 0);
      setCurrentQuestion(savedProgress.currentQuestion || 0);
      
      // Clean up answers array - remove any null/undefined values and ensure number types
      const cleanAnswers = (savedProgress.answers || []).filter(answer => 
        answer && 
        answer.hasOwnProperty('questionIndex') && 
        answer.hasOwnProperty('selectedOption') &&
        answer.selectedOption !== null &&
        answer.selectedOption !== undefined
      ).map(answer => ({
        ...answer,
        sectionIndex: parseInt(answer.sectionIndex, 10) || 0,
        questionIndex: parseInt(answer.questionIndex, 10),
        selectedOption: parseInt(answer.selectedOption, 10)
      }));
      
      setAnswers(cleanAnswers);
      
      // 🆕 Restore coding answers
      const cleanCodingAnswers = (savedProgress.codingAnswers || []).filter(answer => 
        answer && 
        answer.hasOwnProperty('codingQuestionIndex') &&
        answer.sourceCode &&
        answer.sourceCode.trim() !== ''
      );
      setCodingAnswers(cleanCodingAnswers);
      
      // Calculate the time properly for resumed test
      const totalDurationSeconds = test.duration * 60;
      const timeAlreadySpent = savedProgress.timeSpent || 0;
      const remainingTime = Math.max(0, totalDurationSeconds - timeAlreadySpent);
      
      setTimeSpent(timeAlreadySpent);
      setTimeLeft(remainingTime);
      setIsResumed(true);
      
      console.log('🔄 RESUMING TEST with details:', {
        totalDuration: totalDurationSeconds,
        timeAlreadySpent,
        remainingTime,
        savedProgress: savedProgress.timeSpent,
        originalAnswersCount: savedProgress.answers?.length || 0,
        cleanedAnswersCount: cleanAnswers.length,
        currentSection: savedProgress.currentSection,
        currentQuestion: savedProgress.currentQuestion
      });
      
      // Debug: Show what answers are being restored
      cleanAnswers.forEach((answer, index) => {
        console.log(`🔸 Restored Answer ${index}:`, {
          sectionIndex: answer.sectionIndex,
          questionIndex: answer.questionIndex,
          selectedOption: answer.selectedOption
        });
      });
      
      // Debug: After state is set, check what should be marked
      setTimeout(() => {
        console.log('🎯 POST-RESUME VERIFICATION:');
        if (test && test.sections) {
          test.sections.forEach((section, sIdx) => {
            section.questions.forEach((question, qIdx) => {
              const matchingAnswer = cleanAnswers.find(a => 
                a.sectionIndex === sIdx && a.questionIndex === qIdx
              );
              console.log(`Section ${sIdx}, Q${qIdx}: ${matchingAnswer ? '✅ HAS ANSWER' : '❌ NO ANSWER'}`, 
                matchingAnswer ? `(Option: ${matchingAnswer.selectedOption})` : ''
              );
            });
          });
        }
      }, 500);
    }
    setShowResumeDialog(false);
    setStarted(true);
  };

  const handleStartFresh = () => {
    // Reset all progress for fresh start
    setCurrentSection(0);
    setCurrentQuestion(0);
    setAnswers(test.sections && test.sections.length > 0 
      ? new Array(test.sections.reduce((sum, section) => sum + section.questions.length, 0)).fill(null)
      : new Array(test.questions?.length || 0).fill(null)
    );
    setTimeSpent(0);
    setTimeLeft(test.duration * 60);
    setIsResumed(false);
    
    console.log('Starting fresh test:', {
      totalDuration: test.duration * 60,
      timeSpent: 0,
      timeLeft: test.duration * 60
    });
    
    setShowResumeDialog(false);
    setStarted(true);
  };

  const handleAnswerChange = (sectionIndex, questionIndex, optionIndex) => {
    // Ensure all indices are numbers (convert from string if needed)
    const sIdx = parseInt(sectionIndex, 10);
    const qIdx = parseInt(questionIndex, 10);
    const oIdx = parseInt(optionIndex, 10);
    
    console.log('🎯 ANSWER CHANGE - Type conversion:', {
      original: { sectionIndex, questionIndex, optionIndex },
      converted: { sIdx, qIdx, oIdx },
      types: {
        original: { s: typeof sectionIndex, q: typeof questionIndex, o: typeof optionIndex },
        converted: { s: typeof sIdx, q: typeof qIdx, o: typeof oIdx }
      }
    });
    
    // Clean the current answers array first
    const cleanAnswers = answers.filter(a => a && a.hasOwnProperty('questionIndex'));
    
    const answerObj = test.sections && test.sections.length > 0
      ? { sectionIndex: sIdx, questionIndex: qIdx, selectedOption: oIdx }
      : { sectionIndex: 0, questionIndex: qIdx, selectedOption: oIdx }; // Always include sectionIndex for consistency

    // Find existing answer and update or add new one
    const existingIndex = cleanAnswers.findIndex(a => {
      if (test.sections && test.sections.length > 0) {
        return a.sectionIndex === sIdx && a.questionIndex === qIdx;
      } else {
        return a.questionIndex === qIdx && (a.sectionIndex === 0 || a.sectionIndex === undefined);
      }
    });

    if (existingIndex !== -1) {
      cleanAnswers[existingIndex] = answerObj;
      console.log('Updated existing answer:', answerObj, 'at index:', existingIndex);
    } else {
      cleanAnswers.push(answerObj);
      console.log('Added new answer:', answerObj);
    }

    console.log('All answers after change:', cleanAnswers);
    console.log('🔥 ANSWER CHANGED:', {
      originalIndices: { sectionIndex, questionIndex, optionIndex },
      convertedIndices: { sIdx, qIdx, oIdx },
      answerObj,
      totalAnswers: cleanAnswers.length
    });
    
    setAnswers(cleanAnswers);
    
    // Force immediate save and also schedule a delayed save for safety
    saveProgress();
    setTimeout(() => {
      console.log('🔄 Delayed save triggered for answer:', answerObj);
      if (started && studentEmail && test) {
        axios.post(`${API_URL}/api/progress/save`, {
          studentEmail,
          studentName,
          rollNumber,
          testId: test._id,
          currentSection,
          currentQuestion,
          answers: cleanAnswers,
          timeSpent
        }).then(() => {
          console.log('✅ Delayed save completed');
        }).catch(err => {
          console.error('❌ Delayed save failed:', err);
        });
      }
    }, 500); // 500ms delay
  };

  // 🆕 Handle coding answer changes
  const handleCodingAnswerChange = (sectionIndex, codingQuestionIndex, code, language) => {
    const sIdx = parseInt(sectionIndex, 10);
    const cqIdx = parseInt(codingQuestionIndex, 10);
    const answerObj = {
      sectionIndex: sIdx,
      codingQuestionIndex: cqIdx,
      sourceCode: code,
      language: language
    };

    const cleanAnswers = codingAnswers.filter(a => a && a.hasOwnProperty('codingQuestionIndex'));
    
    const existingIndex = cleanAnswers.findIndex(a => 
      a.sectionIndex === sIdx && a.codingQuestionIndex === cqIdx
    );

    if (existingIndex !== -1) {
      cleanAnswers[existingIndex] = answerObj;
    } else {
      cleanAnswers.push(answerObj);
    }

    setCodingAnswers(cleanAnswers);
    
    // Auto-save coding answers
    if (started && studentEmail && test) {
      setTimeout(() => {
        axios.post(`${API_URL}/api/progress/save`, {
          studentEmail,
          studentName,
          rollNumber,
          testId: test._id,
          currentSection,
          currentQuestion,
          answers,
          codingAnswers: cleanAnswers,
          timeSpent
        }).catch(err => {
          console.error('❌ Failed to save coding answer:', err);
        });
      }, 1000);
    }
  };

  const handleSubmit = async () => {
    if(!started) return; // Prevent submitting before starting or after time is up from another tab
    
    try {
      const payload = {
        studentName,
        studentEmail,
        rollNumber,
        testId: test._id,
        answers: answers.filter(a => a !== null && a !== undefined),
        codingAnswers: codingAnswers.filter(a => a !== null && a !== undefined), // 🆕 Include coding answers
        timeSpent,
        isResumed
      };
      const response = await axios.post(`${API_URL}/api/results/submit`, payload);
      
      // Mark test as completed
      await axios.post(`${API_URL}/api/progress/complete`, {
        studentEmail,
        testId: test._id
      });
      
      setScore(response.data.data);
      setSubmitted(true);
      setStarted(false); // Stop timer and interactions
    } catch (err) {
      setError('Test Submitted successfully you can leave the page.');
    }
  };

  const navigateSection = (direction) => {
    if (!test.sections) return;
    
    const newSection = direction === 'next' 
      ? Math.min(currentSection + 1, test.sections.length - 1)
      : Math.max(currentSection - 1, 0);
    
    setCurrentSection(newSection);
    setCurrentQuestion(0);
    setCurrentCodingQuestion(0);
    
    // Auto-switch mode based on available questions in new section
    const newSectionData = test.sections[newSection];
    const hasMCQ = newSectionData.questions && newSectionData.questions.length > 0;
    const hasCoding = newSectionData.codingQuestions && newSectionData.codingQuestions.length > 0;
    
    if (!hasMCQ && hasCoding) {
      setQuestionMode('coding');
    } else if (hasMCQ) {
      setQuestionMode('mcq');
    }
  };

  const navigateQuestion = (direction) => {
    const currentSectionData = test.sections ? test.sections[currentSection] : null;
    const maxQuestions = currentSectionData ? currentSectionData.questions.length : test.questions.length;
    
    const newQuestion = direction === 'next'
      ? Math.min(currentQuestion + 1, maxQuestions - 1)
      : Math.max(currentQuestion - 1, 0);
    
    setCurrentQuestion(newQuestion);
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
        <h2 className="text-3xl font-bold mb-4">
          {score.submittedAt ? 'Test Already Submitted!' : 'Test Submitted!'}
        </h2>
        <p className="text-xl">Thank you, {studentName}.</p>
        <p className="text-2xl mt-6">Your Score: <span className="font-bold text-blue-600">{score.score}</span> / {score.totalMarks}</p>
        {score.submittedAt && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-gray-600">
              <strong>Submitted on:</strong> {new Date(score.submittedAt).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              You cannot retake this test as it has already been submitted with this email address.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Resume dialog
  if (showResumeDialog && savedProgress) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg mx-auto">
        <h2 className="text-2xl font-bold mb-4">Resume Test?</h2>
        <p className="text-gray-600 mb-4">
          We found that you have previously started this test. Would you like to resume from where you left off?
        </p>
        <div className="mb-4 p-4 bg-gray-100 rounded">
          <p><strong>Last saved:</strong> {new Date(savedProgress.lastSaved).toLocaleString()}</p>
          <p><strong>Time spent:</strong> {Math.floor(savedProgress.timeSpent / 60)} minutes</p>
          {test.sections && test.sections.length > 0 && (
            <p><strong>Current section:</strong> {savedProgress.currentSection + 1} of {test.sections.length}</p>
          )}
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={handleResumeTest}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
          >
            Resume Test
          </button>
          <button 
            onClick={handleStartFresh}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Start Fresh
          </button>
        </div>
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
          <input 
            type="text" 
            value={studentName} 
            onChange={(e) => setStudentName(e.target.value)} 
            className="w-full p-2 border rounded" 
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Email Address</label>
          <input 
            type="email" 
            value={studentEmail} 
            onChange={(e) => setStudentEmail(e.target.value)} 
            className="w-full p-2 border rounded" 
            placeholder="your.email@example.com"
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Roll Number</label>
          <input 
            type="text" 
            value={rollNumber} 
            onChange={(e) => setRollNumber(e.target.value)} 
            className="w-full p-2 border rounded" 
          />
        </div>
        {test.allowResume && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              📝 This test supports resume functionality. If you get disconnected, you can continue from where you left off using the same email address.
            </p>
          </div>
        )}
        <button onClick={handleStart} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
          Start Test
        </button>
      </div>
    );
  }

  // Render sectioned test
  if (test.sections && test.sections.length > 0) {
    const currentSectionData = test.sections[currentSection];
    const currentQuestionData = currentSectionData.questions[currentQuestion];
    const isLastQuestion = currentQuestion === currentSectionData.questions.length - 1;
    const isLastSection = currentSection === test.sections.length - 1;
    const isFirstQuestion = currentQuestion === 0;
    const isFirstSection = currentSection === 0;
    
    // Get current answer for this question - improved logic
    const currentAnswer = answers.find(a => {
      if (!a) return false;
      
      // For sectioned tests, match both sectionIndex and questionIndex
      if (test.sections && test.sections.length > 0) {
        return a.sectionIndex === currentSection && a.questionIndex === currentQuestion;
      } else {
        // For traditional tests, just match questionIndex
        return a.questionIndex === currentQuestion;
      }
    });
    
    console.log('🔍 SECTION RENDER DEBUG:', {
      currentSection,
      currentQuestion,
      totalAnswers: answers.length,
      currentAnswer: currentAnswer,
      lookingFor: `section ${currentSection}, question ${currentQuestion}`,
      
      // Debug exact match logic
      answersDetailed: answers.map((a, idx) => ({
        index: idx,
        sectionIndex: a?.sectionIndex,
        questionIndex: a?.questionIndex,
        selectedOption: a?.selectedOption,
        matchesSection: a?.sectionIndex === currentSection,
        matchesQuestion: a?.questionIndex === currentQuestion,
        isExactMatch: a?.sectionIndex === currentSection && a?.questionIndex === currentQuestion,
        dataTypes: {
          sectionIndex: typeof a?.sectionIndex,
          questionIndex: typeof a?.questionIndex,
          currentSection: typeof currentSection,
          currentQuestion: typeof currentQuestion
        }
      })),
      answersFiltered: answers.filter(a => a && a.sectionIndex === currentSection)
    });

    const hasMCQ = currentSectionData.questions && currentSectionData.questions.length > 0;
    const hasCoding = currentSectionData.codingQuestions && currentSectionData.codingQuestions.length > 0;
    const totalQuestions = (hasMCQ ? currentSectionData.questions.length : 0) + (hasCoding ? currentSectionData.codingQuestions.length : 0);
    
    // Get current coding answer
    const currentCodingAnswer = codingAnswers.find(a => 
      a && a.sectionIndex === currentSection && a.codingQuestionIndex === currentCodingQuestion
    );
    const currentCodingQuestionData = hasCoding ? currentSectionData.codingQuestions[currentCodingQuestion] : null;

    return (
      <div className="min-h-screen w-full px-6 py-6">
        <Proctoring onMaxWarnings={() => {
          console.warn("Maximum warnings reached, auto-submitting test...");
          handleSubmit();
        }} />
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold">{test.title}</h1>
            <p className="text-gray-600">
              Section {currentSection + 1} of {test.sections.length}: {currentSectionData.sectionTitle}
            </p>
            {currentSectionData.sectionDescription && (
              <p className="text-sm text-gray-500">{currentSectionData.sectionDescription}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold text-red-500">{formatTime(timeLeft)}</div>
            <div className="text-sm text-gray-500">
              {questionMode === 'mcq' 
                ? `MCQ ${currentQuestion + 1} of ${hasMCQ ? currentSectionData.questions.length : 0}`
                : `Coding ${currentCodingQuestion + 1} of ${hasCoding ? currentSectionData.codingQuestions.length : 0}`
              }
            </div>
          </div>
        </div>

        {/* Question Type Tabs */}
        {(hasMCQ && hasCoding) && (
          <div className="mb-4 flex gap-2 border-b">
            <button
              onClick={() => {
                setQuestionMode('mcq');
                setCurrentQuestion(0);
              }}
              className={`px-4 py-2 font-medium transition-colors ${
                questionMode === 'mcq'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Multiple Choice ({hasMCQ ? currentSectionData.questions.length : 0})
            </button>
            <button
              onClick={() => {
                setQuestionMode('coding');
                setCurrentCodingQuestion(0);
              }}
              className={`px-4 py-2 font-medium transition-colors ${
                questionMode === 'coding'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Coding Questions ({hasCoding ? currentSectionData.codingQuestions.length : 0})
            </button>
          </div>
        )}

        {/* MCQ Questions */}
        {questionMode === 'mcq' && hasMCQ && (
          <div className="mb-8">
            <p className="text-xl font-semibold mb-4">
              {currentQuestion + 1}. {currentQuestionData.questionText}
            </p>
            <div className="space-y-2">
              {currentQuestionData.options.map((option, oIndex) => (
                <label key={oIndex} className="flex items-center p-3 border rounded-lg hover:bg-gray-100 cursor-pointer">
                  <input
                    type="radio"
                    name={`section-${currentSection}-question-${currentQuestion}`}
                    className="mr-3"
                    checked={currentAnswer && currentAnswer.selectedOption === oIndex}
                    onChange={() => handleAnswerChange(currentSection, currentQuestion, oIndex)}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Coding Questions */}
        {questionMode === 'coding' && hasCoding && currentCodingQuestionData && (
          <div className="mb-8">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold mb-1">
                  {currentCodingQuestion + 1}. {currentCodingQuestionData.title}
                </h3>
                <p className="text-sm text-gray-500">Scroll inside either panel to view full content.</p>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-4 bg-white border rounded-xl shadow-sm h-[calc(100vh-280px)]">
              <div className="lg:w-1/2 h-full overflow-y-auto p-4 border-b lg:border-b-0 lg:border-r">
                <h4 className="text-lg font-semibold mb-3 text-gray-800">Problem Statement</h4>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-700 whitespace-pre-wrap">
                  {currentCodingQuestionData.description}
                </div>
                {currentCodingQuestionData.sampleInput && (
                  <div className="mt-4">
                    <h5 className="text-sm font-semibold text-gray-600 mb-1">Sample Input</h5>
                    <pre className="bg-gray-900 text-green-300 text-sm rounded-lg p-3 overflow-x-auto">{currentCodingQuestionData.sampleInput}</pre>
                  </div>
                )}
                {currentCodingQuestionData.sampleOutput && (
                  <div className="mt-3">
                    <h5 className="text-sm font-semibold text-gray-600 mb-1">Sample Output</h5>
                    <pre className="bg-gray-900 text-green-300 text-sm rounded-lg p-3 overflow-x-auto">{currentCodingQuestionData.sampleOutput}</pre>
                  </div>
                )}
              </div>

              <div className="lg:w-1/2 h-full overflow-y-auto p-4 flex flex-col gap-4">
                <div className="flex-1 min-h-[420px]">
                  <CodeEditor
                    key={`section-${currentSection}-coding-${currentCodingQuestion}`}
                    questionId={null} // Coding questions in tests don't use the separate Question model
                    starterCode={currentCodingQuestionData.starterCode || ""}
                    defaultLanguage={currentCodingAnswer?.language || currentCodingQuestionData.language || "javascript"}
                    onCodeChange={(code, language) => 
                      handleCodingAnswerChange(currentSection, currentCodingQuestion, code, language)
                    }
                    initialCode={currentCodingAnswer?.sourceCode || currentCodingQuestionData.starterCode || ""}
                    readOnly={false}
                    allowedLanguages={
                      (currentCodingQuestionData.allowedLanguages && currentCodingQuestionData.allowedLanguages.length > 0)
                        ? currentCodingQuestionData.allowedLanguages
                        : SUPPORTED_LANGUAGES
                    }
                  />
                </div>
                {currentCodingQuestionData.testCases && currentCodingQuestionData.testCases.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Test Cases</h4>
                    <div className="space-y-3">
                      {currentCodingQuestionData.testCases.map((tc, idx) => (
                        <div key={idx} className="bg-white border rounded-lg p-3 shadow-sm">
                          <div className="flex justify-between text-xs text-gray-500 mb-2">
                            <span>Test Case {idx + 1}</span>
                            <span>Weight: {tc.weight || 1}</span>
                          </div>
                          <div className="mb-2">
                            <p className="text-xs font-semibold text-gray-600 mb-1">Input</p>
                            <pre className="bg-gray-900 text-green-300 text-xs rounded p-2 overflow-x-auto">{tc.input || 'N/A'}</pre>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1">Expected Output</p>
                            <pre className="bg-gray-900 text-green-300 text-xs rounded p-2 overflow-x-auto">{tc.expectedOutput || 'N/A'}</pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Show message if no questions of selected type */}
        {((questionMode === 'mcq' && !hasMCQ) || (questionMode === 'coding' && !hasCoding)) && (
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">
              No {questionMode === 'mcq' ? 'multiple choice' : 'coding'} questions in this section.
            </p>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            {questionMode === 'mcq' ? (
              <>
                <button 
                  onClick={() => navigateQuestion('prev')}
                  disabled={isFirstQuestion && isFirstSection}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button 
                  onClick={() => navigateQuestion('next')}
                  disabled={isLastQuestion && isLastSection}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setCurrentCodingQuestion(Math.max(0, currentCodingQuestion - 1))}
                  disabled={currentCodingQuestion === 0}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button 
                  onClick={() => setCurrentCodingQuestion(Math.min((hasCoding ? currentSectionData.codingQuestions.length - 1 : 0), currentCodingQuestion + 1))}
                  disabled={currentCodingQuestion >= (hasCoding ? currentSectionData.codingQuestions.length - 1 : 0)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </>
            )}
          </div>

          <div className="flex space-x-2">
            {!isLastSection && (
              <button 
                onClick={() => navigateSection('next')}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Next Section
              </button>
            )}
            <button 
              onClick={handleSubmit} 
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-bold"
            >
              Submit Test
            </button>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Overall Progress</span>
            <span>
              {answers.filter(a => a).length + codingAnswers.filter(a => a).length} / {
                test.sections.reduce((sum, section) => 
                  sum + section.questions.length + (section.codingQuestions?.length || 0), 0
                )
              } answered
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{
                width: `${((answers.filter(a => a).length + codingAnswers.filter(a => a).length) / 
                  test.sections.reduce((sum, section) => 
                    sum + section.questions.length + (section.codingQuestions?.length || 0), 0
                  )) * 100}%`
              }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  // Render traditional test (backward compatibility)
  return (
    <div className="min-h-screen w-full px-6 py-6">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h1 className="text-3xl font-bold">{test.title}</h1>
        <div className="text-2xl font-semibold text-red-500">{formatTime(timeLeft)}</div>
      </div>
      {test.questions.map((q, qIndex) => {
        const currentAnswer = answers.find(a => {
          if (!a) return false;
          return a.questionIndex === qIndex && (a.sectionIndex === undefined || a.sectionIndex === 0);
        });
        
        console.log(`🔍 TRADITIONAL TEST - Question ${qIndex}:`, {
          questionIndex: qIndex,
          currentAnswer: currentAnswer,
          detailedMatch: answers.map((a, idx) => ({
            index: idx,
            questionIndex: a?.questionIndex,
            sectionIndex: a?.sectionIndex,
            selectedOption: a?.selectedOption,
            matchesQuestion: a?.questionIndex === qIndex,
            sectionUndefinedOrZero: a?.sectionIndex === undefined || a?.sectionIndex === 0,
            isMatch: a?.questionIndex === qIndex && (a?.sectionIndex === undefined || a?.sectionIndex === 0),
            dataTypes: {
              questionIndex: typeof a?.questionIndex,
              qIndex: typeof qIndex
            }
          }))
        });
        
        return (
          <div key={qIndex} className="mb-8">
            <p className="text-xl font-semibold mb-4">{qIndex + 1}. {q.questionText}</p>
            <div className="space-y-2">
              {q.options.map((option, oIndex) => (
                <label key={oIndex} className="flex items-center p-3 border rounded-lg hover:bg-gray-100 cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${qIndex}`}
                    className="mr-3"
                    checked={currentAnswer && currentAnswer.selectedOption === oIndex}
                    onChange={() => handleAnswerChange(0, qIndex, oIndex)}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
        );
      })}
      <button onClick={handleSubmit} className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition text-lg font-bold">
        Submit Test
      </button>
    </div>
  );
};

export default TestPage;
