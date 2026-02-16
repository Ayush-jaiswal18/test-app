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
  const [descriptiveAnswers, setDescriptiveAnswers] = useState([]); // 🆕 Store descriptive question answers
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
  const [showInstructions, setShowInstructions] = useState(false);
  const [agreedToInstructions, setAgreedToInstructions] = useState(false);
  const [showSectionPreview, setShowSectionPreview] = useState(false);
  const [previewSectionIndex, setPreviewSectionIndex] = useState(0);
  const [viewedSections, setViewedSections] = useState(new Set());
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
        descriptiveAnswers, // 🆕 Include descriptive answers
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
        setShowInstructions(false);
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
        setShowInstructions(false);
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
    if (!agreedToInstructions) {
      alert('Please read and agree to the test instructions before starting the test.');
      return;
    }

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
        
        setShowInstructions(false);
        setStarted(true);
        // Show preview for the first section
        setPreviewSectionIndex(0);
        setShowSectionPreview(true);
        setViewedSections(new Set());
      }
    } else {
      alert('Please enter your name, email, and roll number.');
    }
  };

  const handleResumeTest = () => {
    if (savedProgress) {
      const resumeSection = savedProgress.currentSection || 0;
      setCurrentSection(resumeSection);
      setCurrentQuestion(savedProgress.currentQuestion || 0);
      
      // Mark all sections up to and including the current section as viewed
      const viewedSet = new Set();
      for (let i = 0; i <= resumeSection; i++) {
        viewedSet.add(i);
      }
      setViewedSections(viewedSet);
      
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
    setShowInstructions(false);
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
    setShowInstructions(false);
    setStarted(true);
    // Show preview for the first section
    setPreviewSectionIndex(0);
    setShowSectionPreview(true);
    setViewedSections(new Set());
  };

  const handleAnswerChange = (sectionIndex, questionIndex, optionIndex) => {
    // Ensure all indices are numbers (convert from string if needed)
    const sIdx = parseInt(sectionIndex, 10);
    const qIdx = parseInt(questionIndex, 10);
    const oIdx = parseInt(optionIndex, 10);
    
    // Get the original index from the question object (for randomized questions)
    let originalQuestionIndex = qIdx;
    if (test.sections && test.sections.length > 0) {
      const currentSectionData = test.sections[sIdx];
      if (currentSectionData && currentSectionData.questions && currentSectionData.questions[qIdx]) {
        originalQuestionIndex = currentSectionData.questions[qIdx].originalIndex !== undefined 
          ? currentSectionData.questions[qIdx].originalIndex 
          : qIdx;
      }
    }
    
    console.log('🎯 ANSWER CHANGE - Type conversion:', {
      original: { sectionIndex, questionIndex, optionIndex },
      converted: { sIdx, qIdx, oIdx },
      originalQuestionIndex,
      types: {
        original: { s: typeof sectionIndex, q: typeof questionIndex, o: typeof optionIndex },
        converted: { s: typeof sIdx, q: typeof qIdx, o: typeof oIdx }
      }
    });
    
    // Clean the current answers array first
    const cleanAnswers = answers.filter(a => a && a.hasOwnProperty('questionIndex'));
    
    const answerObj = test.sections && test.sections.length > 0
      ? { 
          sectionIndex: sIdx, 
          questionIndex: qIdx, 
          originalQuestionIndex: originalQuestionIndex, // Store original index for backend
          selectedOption: oIdx 
        }
      : { 
          sectionIndex: 0, 
          questionIndex: qIdx, 
          originalQuestionIndex: originalQuestionIndex, // Store original index for backend
          selectedOption: oIdx 
        }; // Always include sectionIndex for consistency

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
          codingAnswers, // 🆕 Include coding answers
          descriptiveAnswers, // 🆕 Include descriptive answers
          timeSpent
        }).then(() => {
          console.log('✅ Delayed save completed');
        }).catch(err => {
          console.error('❌ Delayed save failed:', err);
        });
      }
    }, 1000);
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
          descriptiveAnswers,
          timeSpent
        }).catch(err => {
          console.error('❌ Failed to save coding answer:', err);
        });
      }, 1000);
    }
  };

  // 🆕 Handle descriptive answer changes
  const handleDescriptiveAnswerChange = (sectionIndex, questionIndex, text) => {
    const sIdx = parseInt(sectionIndex, 10);
    const qIdx = parseInt(questionIndex, 10);
    const answerObj = {
      sectionIndex: sIdx,
      questionIndex: qIdx,
      answerText: text
    };

    const cleanAnswers = descriptiveAnswers.filter(a => a && a.hasOwnProperty('questionIndex'));
    
    const existingIndex = cleanAnswers.findIndex(a => 
      a.sectionIndex === sIdx && a.questionIndex === qIdx
    );

    if (existingIndex !== -1) {
      cleanAnswers[existingIndex] = answerObj;
    } else {
      cleanAnswers.push(answerObj);
    }

    setDescriptiveAnswers(cleanAnswers);
    
    // Auto-save descriptive answers (debounced)
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
          codingAnswers,
          descriptiveAnswers: cleanAnswers,
          timeSpent
        }).catch(err => {
          console.error('❌ Failed to save descriptive answer:', err);
        });
      }, 2000);
    }
  };

  const handleSubmit = async () => {
    if(!started) return; // Prevent submitting before starting or after time is up from another tab
    
    try {
      // Get warnings from sessionStorage
      const warnings = JSON.parse(sessionStorage.getItem('testWarnings') || '[]');
      
      const payload = {
        studentName,
        studentEmail,
        rollNumber,
        testId: test._id,
        answers: answers.filter(a => a !== null && a !== undefined),
        codingAnswers: codingAnswers.filter(a => a !== null && a !== undefined), // 🆕 Include coding answers
        descriptiveAnswers: descriptiveAnswers.filter(a => a !== null && a !== undefined), // 🆕 Include descriptive answers
        timeSpent,
        isResumed,
        warnings // Include warnings collected during test
      };
      const response = await axios.post(`${API_URL}/api/results/submit`, payload);
      
      // Clear warnings from sessionStorage
      sessionStorage.removeItem('testWarnings');
      
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

  const navigateToSection = (sectionIndex) => {
    if (!test.sections) return;
    
    setCurrentSection(sectionIndex);
    setCurrentQuestion(0);
    setCurrentCodingQuestion(0);
    
    // Mark section as viewed
    setViewedSections(prev => new Set(prev).add(sectionIndex));
    
    // Auto-switch mode based on available questions in new section
    const newSectionData = test.sections[sectionIndex];
    const hasMCQ = newSectionData.questions && newSectionData.questions.length > 0;
    const hasCoding = newSectionData.codingQuestions && newSectionData.codingQuestions.length > 0;
    
    if (!hasMCQ && hasCoding) {
      setQuestionMode('coding');
    } else if (hasMCQ) {
      setQuestionMode('mcq');
    }
    
    setShowSectionPreview(false);
  };

  const navigateSection = (direction) => {
    if (!test.sections) return;
    
    const newSection = direction === 'next' 
      ? Math.min(currentSection + 1, test.sections.length - 1)
      : Math.max(currentSection - 1, 0);
    
    // Check if we've already viewed this section
    if (viewedSections.has(newSection)) {
      // Already viewed, navigate directly
      navigateToSection(newSection);
    } else {
      // Not viewed yet, show preview
      setPreviewSectionIndex(newSection);
      setShowSectionPreview(true);
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
    const shouldShowScore = score.showScoreToStudents !== false; // Default to true for backward compatibility
    const percentage = score.totalMarks > 0 ? Math.round((score.score / score.totalMarks) * 100) : 0;
    const isPassed = percentage >= 50; // Consider 50% as passing
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Score Hidden Notice */}
          {!shouldShowScore && (
            <div>
              {/* Success Icon Animation */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg mb-4 animate-bounce">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-4xl font-bold text-gray-800 mb-2">Test Submitted Successfully!</h1>
                <p className="text-lg text-gray-600">Your answers have been recorded</p>
              </div>

              {/* Main Info Card */}
              <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border-t-4 border-blue-500">
                <div className="flex items-start mb-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14 16a2 2 0 100-4 2 2 0 000 4zM6 16a2 2 0 100-4 2 2 0 000 4z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">What happens next?</h2>
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 font-semibold text-sm flex items-center justify-center mr-3 mt-0.5">1</span>
                        <p className="text-gray-700">Your test has been securely submitted and saved in our system.</p>
                      </div>
                      <div className="flex items-start">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 font-semibold text-sm flex items-center justify-center mr-3 mt-0.5">2</span>
                        <p className="text-gray-700">The instructor will review your submission and grade it accordingly.</p>
                      </div>
                      <div className="flex items-start">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 font-semibold text-sm flex items-center justify-center mr-3 mt-0.5">3</span>
                        <p className="text-gray-700">You will be notified once your results are available.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg">
                  <div className="flex">
                    <svg className="w-5 h-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-semibold text-amber-800 mb-1">About Your Score</h3>
                      <p className="text-sm text-amber-700">
                        The instructor has chosen not to display scores immediately. Your detailed results and feedback will be shared with you once the evaluation is complete.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Info Card */}
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  Submission Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Student Name</p>
                    <p className="font-semibold text-gray-900">{studentName}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Email</p>
                    <p className="font-semibold text-gray-900">{studentEmail}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Roll Number</p>
                    <p className="font-semibold text-gray-900">{rollNumber}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Test Name</p>
                    <p className="font-semibold text-gray-900">{test.title}</p>
                  </div>
                  {score.submittedAt && (
                    <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Submitted On</p>
                      <p className="font-semibold text-gray-900">{new Date(score.submittedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Confirmation Message */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 text-center">
                <svg className="w-16 h-16 mx-auto text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-bold text-green-800 mb-2">Your submission has been recorded</h3>
                <p className="text-green-700 text-sm">You may now close this page. Thank you for completing the test!</p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {shouldShowScore && (
            <div className={`mb-6 p-6 rounded-lg shadow-lg ${isPassed ? 'bg-green-50 border-l-4 border-green-500' : 'bg-yellow-50 border-l-4 border-yellow-500'}`}>
              <div className="flex items-center mb-3">
                {isPassed ? (
                  <svg className="w-8 h-8 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-yellow-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                <h2 className={`text-2xl font-bold ${isPassed ? 'text-green-700' : 'text-yellow-700'}`}>
                  {isPassed ? '🎉 Congratulations!' : '⏳ Test Submitted'}
                </h2>
              </div>
              <p className={`text-sm ${isPassed ? 'text-green-600' : 'text-yellow-600'}`}>
                {isPassed 
                  ? 'You have successfully passed the test!'
                  : 'Your test has been submitted successfully.'}
              </p>
            </div>
          )}

          {/* Score Card - Only show if enabled */}
          {shouldShowScore && (
            <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
              <div className="text-center mb-8">
                <h3 className="text-gray-600 text-sm uppercase tracking-wide mb-2">Your Score</h3>
                <div className="flex items-center justify-center gap-4">
                  <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle cx="64" cy="64" r="60" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                      <circle 
                        cx="64" 
                        cy="64" 
                        r="60" 
                        fill="none" 
                        stroke={isPassed ? '#10b981' : '#f59e0b'} 
                        strokeWidth="8"
                        strokeDasharray={`${(percentage / 100) * 376.99} 376.99`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-gray-800">{percentage}%</span>
                      <span className="text-xs text-gray-500">Complete</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-2">Marks Obtained</p>
                    <p className="text-4xl font-bold text-blue-600 mb-4">{score.score}/{score.totalMarks}</p>
                    <p className={`text-sm font-semibold px-3 py-1 rounded-full inline-block ${
                      isPassed 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {isPassed ? 'PASSED' : 'SUBMITTED'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Performance Details - Only show if enabled */}
          {shouldShowScore && (
            <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Test Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="text-gray-600 text-sm">Test Name</p>
                  <p className="text-gray-900 font-semibold">{test.title}</p>
                </div>
                <div className="border-l-4 border-purple-500 pl-4">
                  <p className="text-gray-600 text-sm">Total Questions</p>
                  <p className="text-gray-900 font-semibold">{score.totalMarks}</p>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <p className="text-gray-600 text-sm">Time Taken</p>
                  <p className="text-gray-900 font-semibold">
                    {Math.floor(timeSpent / 60)} min {timeSpent % 60} sec
                  </p>
                </div>
                <div className="border-l-4 border-orange-500 pl-4">
                  <p className="text-gray-600 text-sm">Correct Answers</p>
                  <p className="text-gray-900 font-semibold">{score.score} questions</p>
                </div>
                <div className="border-l-4 border-red-500 pl-4">
                  <p className="text-gray-600 text-sm">Wrong Answers</p>
                  <p className="text-gray-900 font-semibold">{score.totalMarks - score.score} questions</p>
                </div>
                <div className="border-l-4 border-indigo-500 pl-4">
                  <p className="text-gray-600 text-sm">Accuracy</p>
                  <p className="text-gray-900 font-semibold">{percentage}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Student Info - Always show */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Student Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Name</span>
                <span className="font-semibold text-gray-900">{studentName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Email</span>
                <span className="font-semibold text-gray-900">{studentEmail}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Roll Number</span>
                <span className="font-semibold text-gray-900">{rollNumber}</span>
              </div>
            </div>
          </div>

          {/* Submission Time - Show for all */}
          {score.submittedAt && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0zM8 7a1 1 0 000 2h6a1 1 0 000-2H8zm0 3a1 1 0 000 2h6a1 1 0 000-2H8z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-blue-900">Submitted on</p>
                  <p className="text-sm text-blue-700">{new Date(score.submittedAt).toLocaleString()}</p>
                  <p className="text-xs text-blue-600 mt-2">✓ Your test submission has been recorded.</p>
                </div>
              </div>
            </div>
          )}
        </div>
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

  if (!started && !showInstructions) {
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
        <button 
          onClick={() => {
            if (studentName.trim() && studentEmail.trim() && rollNumber.trim()) {
              setShowInstructions(true);
            } else {
              alert('Please enter your name, email, and roll number.');
            }
          }} 
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Continue
        </button>
      </div>
    );
  }

  // Instruction box
  if (!started && showInstructions) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">{test.title}</h1>
        <h2 className="text-2xl font-semibold mb-4">Test Instructions</h2>
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="space-y-3 text-gray-700">
            <p><strong>Duration:</strong> {test.duration} minutes</p>
            <p><strong>Instructions:</strong></p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Read each question carefully before answering.</li>
              <li>Ensure you have a stable internet connection throughout the test.</li>
              <li>Do not navigate away from the test page or open other tabs.</li>
              <li>The timer will continue running even if you close the browser accidentally.</li>
              <li>Once submitted, you cannot change your answers.</li>
              {test.allowResume && (
                <li>You can resume this test from where you left off if you get disconnected.</li>
              )}
            </ul>
            {test.description && (
              <div className="mt-4 pt-4 border-t border-gray-300">
                <p><strong>Test Description:</strong></p>
                <p className="mt-2">{test.description}</p>
              </div>
            )}
          </div>
        </div>
        <div className="mb-6">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToInstructions}
              onChange={(e) => setAgreedToInstructions(e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-gray-700 font-medium">
              I have read and understood the test instructions. I agree to proceed with the test.
            </span>
          </label>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => {
              setShowInstructions(false);
              setAgreedToInstructions(false);
            }}
            className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition"
          >
            Back
          </button>
          <button
            onClick={handleStart}
            disabled={!agreedToInstructions}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Test
          </button>
        </div>
      </div>
    );
  }

  // Section preview dialog
  if (started && showSectionPreview && test.sections && test.sections.length > 0) {
    const previewSectionData = test.sections[previewSectionIndex];
    const hasMCQ = previewSectionData.questions && previewSectionData.questions.length > 0;
    const hasCoding = previewSectionData.codingQuestions && previewSectionData.codingQuestions.length > 0;
    const totalQuestions = (hasMCQ ? previewSectionData.questions.length : 0) + (hasCoding ? previewSectionData.codingQuestions.length : 0);
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl w-full">
          <h1 className="text-3xl font-bold mb-2">{test.title}</h1>
          <h2 className="text-2xl font-semibold mb-6 text-blue-600">
            Section {previewSectionIndex + 1} of {test.sections.length}
          </h2>
          
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-3">{previewSectionData.sectionTitle}</h3>
            {previewSectionData.sectionDescription && (
              <p className="text-gray-700 mb-4">{previewSectionData.sectionDescription}</p>
            )}
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold mb-3 text-gray-800">Section Overview:</h4>
            <div className="space-y-2 text-gray-700">
              <p><strong>Total Questions:</strong> {totalQuestions}</p>
              {hasMCQ && (
                <p><strong>Multiple Choice Questions:</strong> {previewSectionData.questions.length}</p>
              )}
              {hasCoding && (
                <p><strong>Coding Questions:</strong> {previewSectionData.codingQuestions.length}</p>
              )}
              {previewSectionData.timeLimit && (
                <p><strong>Section Time Limit:</strong> {previewSectionData.timeLimit} minutes</p>
              )}
            </div>
          </div>

          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Please review the section information above. Once you proceed, you'll be able to answer questions in this section.
            </p>
          </div>

          <button
            onClick={() => navigateToSection(previewSectionIndex)}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold text-lg"
          >
            Start Section {previewSectionIndex + 1}
          </button>
        </div>
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
        <Proctoring 
          maxWarnings={test.maxWarnings || 6}
          onMaxWarnings={() => {
            console.warn("Maximum warnings reached, auto-submitting test...");
            handleSubmit();
          }} 
        />
        <div className="mb-6 border-b pb-4">
          <div className="mb-4">
            <h1 className="text-2xl font-bold">{test.title}</h1>
            <p className="text-gray-600">
              Section {currentSection + 1} of {test.sections.length}: {currentSectionData.sectionTitle}
            </p>
            {currentSectionData.sectionDescription && (
              <p className="text-sm text-gray-500">{currentSectionData.sectionDescription}</p>
            )}
          </div>
          <div className="flex justify-center gap-6 items-center py-2 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-500">{formatTime(timeLeft)}</div>
              <div className="text-xs text-gray-600 mt-0.5">Time Remaining</div>
            </div>
            <div className="w-px h-8 bg-gray-300"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {questionMode === 'mcq' 
                  ? `${currentQuestion + 1}/${hasMCQ ? currentSectionData.questions.length : 0}`
                  : `${currentCodingQuestion + 1}/${hasCoding ? currentSectionData.codingQuestions.length : 0}`
                }
              </div>
              <div className="text-xs text-gray-600 mt-0.5">
                {questionMode === 'mcq' ? 'MCQ Question' : 'Coding Question'}
              </div>
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
          <div className="mb-8 flex gap-6 h-[calc(100vh-300px)]">
            <div className="flex-1 bg-gray-50 p-8 rounded-lg border border-gray-200 overflow-y-auto">
              <h3 className="text-sm font-bold text-gray-600 uppercase mb-4 sticky pt-0 bg-gray-50 py-2">Question</h3>
              
              {/* Image-based question image */}
              {currentQuestionData.questionType === 'image-based' && currentQuestionData.imageUrl && (
                <div className="mb-4">
                  <img 
                    src={currentQuestionData.imageUrl} 
                    alt="Question" 
                    className="max-w-full h-auto rounded-lg border border-gray-300"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
              
              <p className="text-lg font-semibold text-gray-800">
                {currentQuestion + 1}. {currentQuestionData.questionText}
              </p>
            </div>
            <div className="flex-1 bg-white p-8 rounded-lg border border-gray-200 overflow-y-auto">
              <h3 className="text-sm font-bold text-gray-600 uppercase mb-4 sticky top-0 bg-white py-2">
                {currentQuestionData.questionType === 'fill-blank' ? 'Answer' : currentQuestionData.questionType === 'descriptive' ? 'Your Answer' : 'Options'}
              </h3>
              
              {/* Fill in the Blank */}
              {currentQuestionData.questionType === 'fill-blank' && (
                <div>
                  <input
                    type="text"
                    value={currentAnswer?.selectedOption || ''}
                    onChange={(e) => handleAnswerChange(currentSection, currentQuestion, e.target.value)}
                    placeholder="Type your answer here"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-2">Case Sensitive: {currentQuestionData.caseSensitive ? 'Yes' : 'No'}</p>
                </div>
              )}

              {/* Descriptive / Essay */}
              {currentQuestionData.questionType === 'descriptive' && (
                <div>
                  <textarea
                    value={(() => {
                      const da = descriptiveAnswers.find(a => a && a.sectionIndex === currentSection && a.questionIndex === currentQuestion);
                      return da?.answerText || '';
                    })()}
                    onChange={(e) => handleDescriptiveAnswerChange(currentSection, currentQuestion, e.target.value)}
                    placeholder="Write your answer here..."
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-y min-h-[200px]"
                    rows={8}
                  />
                  <div className="flex justify-between mt-2">
                    <p className="text-xs text-gray-500">
                      {currentQuestionData.wordLimit > 0
                        ? `Word limit: ${(() => {
                            const da = descriptiveAnswers.find(a => a && a.sectionIndex === currentSection && a.questionIndex === currentQuestion);
                            const words = (da?.answerText || '').trim().split(/\s+/).filter(w => w.length > 0).length;
                            return words;
                          })()} / ${currentQuestionData.wordLimit}`
                        : 'No word limit'}
                    </p>
                    <p className="text-xs text-gray-400">📝 This question will be evaluated by the instructor</p>
                  </div>
                  {currentQuestionData.wordLimit > 0 && (() => {
                    const da = descriptiveAnswers.find(a => a && a.sectionIndex === currentSection && a.questionIndex === currentQuestion);
                    const words = (da?.answerText || '').trim().split(/\s+/).filter(w => w.length > 0).length;
                    return words > currentQuestionData.wordLimit;
                  })() && (
                    <p className="text-xs text-red-500 mt-1">⚠️ You have exceeded the word limit</p>
                  )}
                </div>
              )}
              
              {/* MCQ, True/False, and Image-based options */}
              {(currentQuestionData.questionType === 'mcq' || 
                currentQuestionData.questionType === 'true-false' || 
                currentQuestionData.questionType === 'image-based') && (
                <div className="space-y-2">
                  {currentQuestionData.options && currentQuestionData.options.map((option, oIndex) => (
                    <label key={oIndex} className="flex items-center p-3 border rounded-lg hover:bg-blue-50 cursor-pointer transition">
                      <input
                        type="radio"
                        name={`section-${currentSection}-question-${currentQuestion}`}
                        className="mr-3 w-4 h-4 flex-shrink-0"
                        checked={currentAnswer && currentAnswer.selectedOption === oIndex}
                        onChange={() => handleAnswerChange(currentSection, currentQuestion, oIndex)}
                      />
                      <span className="text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              )}
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
              {answers.filter(a => a).length + codingAnswers.filter(a => a).length + descriptiveAnswers.filter(a => a && a.answerText).length} / {
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
                width: `${((answers.filter(a => a).length + codingAnswers.filter(a => a).length + descriptiveAnswers.filter(a => a && a.answerText).length) / 
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
