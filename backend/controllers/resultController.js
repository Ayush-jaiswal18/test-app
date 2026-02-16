const Result = require('../models/resultModel');
const Test = require('../models/testModel');
const TestProgress = require('../models/testProgressModel');

// @desc    Submit a test
// @route   POST /api/results/submit
// @access  Public
exports.submitTest = async (req, res) => {
  const { studentName, studentEmail, rollNumber, testId, answers, codingAnswers, descriptiveAnswers, timeSpent, isResumed, warnings } = req.body;

  try {
    // Fetch the test to get correct answers
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    // Check if this student has already submitted this test
    const existingResult = await Result.findOne({ 
      test: testId, 
      studentEmail: studentEmail.toLowerCase() 
    });

    if (existingResult) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already submitted this test. Each student can only submit once.',
        submittedAt: existingResult.createdAt
      });
    }

    let score = 0;
    let totalMarks = 0;

    // Handle both sectioned and non-sectioned tests
    if (test.sections && test.sections.length > 0) {
      // Calculate score for sectioned test
      test.sections.forEach((section, sectionIndex) => {
        // Score MCQ questions
        section.questions.forEach((question, questionIndex) => {
          totalMarks += (question.points || 1);
          
          // Find answer by displayed question index
          const studentAnswer = answers.find(a => 
            a.sectionIndex === sectionIndex && a.questionIndex === questionIndex
          );
          
          if (studentAnswer) {
            // Handle different question types
            if (question.questionType === 'descriptive') {
              // Descriptive questions are NOT auto-scored; admin evaluates later
              // totalMarks already counted above; score stays 0 for now
            } else if (question.questionType === 'fill-blank') {
              // For fill-in-the-blank, check if answer is in acceptableAnswers
              const userAnswer = studentAnswer.selectedOption;
              const acceptableAnswers = question.acceptableAnswers || [];
              
              let isCorrect = false;
              if (question.caseSensitive) {
                isCorrect = acceptableAnswers.includes(userAnswer);
              } else {
                isCorrect = acceptableAnswers.some(ans => 
                  ans.toLowerCase() === userAnswer.toLowerCase()
                );
              }
              
              if (isCorrect) {
                score += (question.points || 1);
              }
            } else if (question.questionType === 'true-false' || 
                       question.questionType === 'mcq' || 
                       question.questionType === 'image-based') {
              // For multiple choice, true/false, and image-based questions
              if (studentAnswer.selectedOption === question.correctAnswer) {
                score += (question.points || 1);
              }
            }
          }
        });
        
        // Score coding questions (if test cases exist, evaluate them; otherwise just save the code)
        if (section.codingQuestions && section.codingQuestions.length > 0) {
          section.codingQuestions.forEach((codingQuestion, codingQuestionIndex) => {
            totalMarks += (codingQuestion.testCases?.length || 1); // Weight by test cases or default to 1
            const studentCodingAnswer = codingAnswers?.find(a => 
              a.sectionIndex === sectionIndex && a.codingQuestionIndex === codingQuestionIndex
            );
            
            // For now, coding questions are saved but not auto-evaluated during test submission
            // They can be evaluated later by admin or through a separate endpoint
            // If test cases exist and we want to evaluate, we'd need to call the code execution service
            if (studentCodingAnswer && studentCodingAnswer.sourceCode) {
              // Code submitted - could evaluate here if needed
              // For now, we'll just save it and let admin evaluate later
            }
          });
        }
      });
    } else {
      // Calculate score for traditional test
      test.questions.forEach((question, index) => {
        totalMarks += (question.points || 1);
        const studentAnswer = answers.find(a => a.questionIndex === index);
        
        if (studentAnswer) {
          // Handle different question types
          if (question.questionType === 'descriptive') {
            // Descriptive questions are NOT auto-scored; admin evaluates later
          } else if (question.questionType === 'fill-blank') {
            const userAnswer = studentAnswer.selectedOption;
            const acceptableAnswers = question.acceptableAnswers || [];
            
            let isCorrect = false;
            if (question.caseSensitive) {
              isCorrect = acceptableAnswers.includes(userAnswer);
            } else {
              isCorrect = acceptableAnswers.some(ans => 
                ans.toLowerCase() === userAnswer.toLowerCase()
              );
            }
            
            if (isCorrect) {
              score += (question.points || 1);
            }
          } else if (question.questionType === 'true-false' || 
                     question.questionType === 'mcq' || 
                     question.questionType === 'image-based') {
            if (studentAnswer.selectedOption === question.correctAnswer) {
              score += (question.points || 1);
            }
          }
        }
      });
    }

    // Save the result
    const result = await Result.create({
      studentName,
      studentEmail: studentEmail.toLowerCase(),
      rollNumber,
      test: testId,
      score,
      totalMarks,
      answers,
      codingAnswers: codingAnswers || [], // 🆕 Save coding answers
      descriptiveAnswers: descriptiveAnswers || [], // 🆕 Save descriptive answers
      timeSpent: timeSpent || 0,
      isResumed: isResumed || false,
      warnings: warnings || [], // Save warnings/proctoring events
    });

    // Mark test as completed in progress tracking
    if (studentEmail) {
      await TestProgress.findOneAndUpdate(
        { studentEmail: studentEmail.toLowerCase(), test: testId },
        { isCompleted: true, lastSaved: new Date() }
      );
    }

    res.status(201).json({
      success: true,
      data: {
        message: 'Test submitted successfully!',
        score: result.score,
        totalMarks: result.totalMarks,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};


// @desc    Check if test has been submitted by email
// @route   GET /api/results/check/:testId/:email
// @access  Public
exports.checkSubmissionStatus = async (req, res) => {
  const { testId, email } = req.params;

  try {
    const existingResult = await Result.findOne({ 
      test: testId, 
      studentEmail: email.toLowerCase() 
    });

    if (existingResult) {
      return res.status(200).json({
        success: true,
        isSubmitted: true,
        data: {
          submittedAt: existingResult.createdAt,
          score: existingResult.score,
          totalMarks: existingResult.totalMarks,
          studentName: existingResult.studentName,
          rollNumber: existingResult.rollNumber
        }
      });
    } else {
      return res.status(200).json({
        success: true,
        isSubmitted: false
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error checking submission status', 
      error: error.message 
    });
  }
};

// @desc    Get all results for a specific test
// @route   GET /api/results/:testId
// @access  Private (Admin)
exports.getResultsByTestId = async (req, res) => {
    try {
        const test = await Test.findById(req.params.testId);
        if(!test){
            return res.status(404).json({ success: false, message: 'Test not found' });
        }

        // Ensure the admin requesting results is the one who created the test
        if (test.createdBy.toString() !== req.admin._id.toString()) {
            return res.status(401).json({ success: false, message: 'Not authorized to view these results' });
        }

        const results = await Result.find({ test: req.params.testId });
        res.status(200).json({ success: true, count: results.length, data: results });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get a single result with full details
// @route   GET /api/results/:testId/:resultId
// @access  Private (Admin)
exports.getResultById = async (req, res) => {
    try {
        const { testId, resultId } = req.params;
        
        const test = await Test.findById(testId);
        if(!test){
            return res.status(404).json({ success: false, message: 'Test not found' });
        }

        // Ensure the admin requesting results is the one who created the test
        if (test.createdBy.toString() !== req.admin._id.toString()) {
            return res.status(401).json({ success: false, message: 'Not authorized to view these results' });
        }

        const result = await Result.findById(resultId).populate('test');
        if(!result){
            return res.status(404).json({ success: false, message: 'Result not found' });
        }

        res.status(200).json({ success: true, data: result });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Evaluate a coding question submission
// @route   POST /api/results/:resultId/evaluate-coding
// @access  Private (Admin)
exports.evaluateCodingQuestion = async (req, res) => {
    try {
        const { resultId } = req.params;
        const { sectionIndex, codingQuestionIndex, score, feedback } = req.body;

        const result = await Result.findById(resultId);
        if(!result){
            return res.status(404).json({ success: false, message: 'Result not found' });
        }

        // Find the coding answer
        const codingAnswer = result.codingAnswers.find(a => 
            a.sectionIndex === sectionIndex && a.codingQuestionIndex === codingQuestionIndex
        );

        if(!codingAnswer){
            return res.status(404).json({ success: false, message: 'Coding answer not found' });
        }

        // Update the score
        codingAnswer.score = score || 0;
        if(feedback) codingAnswer.feedback = feedback;

        // Recalculate total score
        const test = await Test.findById(result.test);
        let newScore = 0;
        let totalMarks = 0;

        // Calculate MCQ score
        if (test.sections && test.sections.length > 0) {
            test.sections.forEach((section, sIdx) => {
                section.questions.forEach((question, qIdx) => {
                    totalMarks += (question.points || 1);
                    const studentAnswer = result.answers.find(a => 
                        a.sectionIndex === sIdx && a.questionIndex === qIdx
                    );
                    
                    if (question.questionType === 'descriptive') {
                        // For descriptive, use evaluated score
                        const descAnswer = result.descriptiveAnswers.find(a => 
                            a.sectionIndex === sIdx && a.questionIndex === qIdx
                        );
                        newScore += (descAnswer?.score || 0);
                    } else if (question.questionType === 'fill-blank') {
                        if (studentAnswer) {
                            const userAnswer = studentAnswer.selectedOption;
                            const acceptableAnswers = question.acceptableAnswers || [];
                            let isCorrect = question.caseSensitive
                                ? acceptableAnswers.includes(userAnswer)
                                : acceptableAnswers.some(ans => ans.toLowerCase() === userAnswer.toLowerCase());
                            if (isCorrect) newScore += (question.points || 1);
                        }
                    } else {
                        if (studentAnswer && studentAnswer.selectedOption === question.correctAnswer) {
                            newScore += (question.points || 1);
                        }
                    }
                });
            });
        } else {
            totalMarks = test.questions.length;
            test.questions.forEach((question, index) => {
                const studentAnswer = result.answers.find(a => a.questionIndex === index);
                if (question.questionType === 'descriptive') {
                    const descAnswer = result.descriptiveAnswers.find(a => a.questionIndex === index);
                    newScore += (descAnswer?.score || 0);
                } else if (studentAnswer && studentAnswer.selectedOption === question.correctAnswer) {
                    newScore++;
                }
            });
        }

        // Add coding question scores
        result.codingAnswers.forEach(ca => {
            const section = test.sections?.[ca.sectionIndex];
            const codingQuestion = section?.codingQuestions?.[ca.codingQuestionIndex];
            if(codingQuestion) {
                const maxScore = codingQuestion.testCases?.reduce((sum, tc) => sum + (tc.weight || 1), 0) || 10;
                totalMarks += maxScore;
                newScore += (ca.score || 0);
            }
        });

        result.score = newScore;
        result.totalMarks = totalMarks;
        await result.save();

        res.status(200).json({ 
            success: true, 
            message: 'Coding question evaluated successfully',
            data: result 
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Evaluate a descriptive question answer
// @route   POST /api/results/:resultId/evaluate-descriptive
// @access  Private (Admin)
exports.evaluateDescriptiveQuestion = async (req, res) => {
    try {
        const { resultId } = req.params;
        const { sectionIndex, questionIndex, score, feedback } = req.body;

        const result = await Result.findById(resultId);
        if(!result){
            return res.status(404).json({ success: false, message: 'Result not found' });
        }

        // Find the descriptive answer
        let descriptiveAnswer = result.descriptiveAnswers.find(a => 
            a.sectionIndex === sectionIndex && a.questionIndex === questionIndex
        );

        if(!descriptiveAnswer){
            // If no descriptive answer exists yet, create one
            result.descriptiveAnswers.push({
                sectionIndex,
                questionIndex,
                answerText: '',
                score: score || 0,
                feedback: feedback || ''
            });
            descriptiveAnswer = result.descriptiveAnswers[result.descriptiveAnswers.length - 1];
        } else {
            descriptiveAnswer.score = score || 0;
            if(feedback) descriptiveAnswer.feedback = feedback;
        }

        // Recalculate total score
        const test = await Test.findById(result.test);
        let newScore = 0;
        let totalMarks = 0;

        // Calculate MCQ + descriptive score
        if (test.sections && test.sections.length > 0) {
            test.sections.forEach((section, sIdx) => {
                section.questions.forEach((question, qIdx) => {
                    totalMarks += (question.points || 1);
                    const studentAnswer = result.answers.find(a => 
                        a.sectionIndex === sIdx && a.questionIndex === qIdx
                    );
                    
                    if (question.questionType === 'descriptive') {
                        // For descriptive, use evaluated score
                        const descAnswer = result.descriptiveAnswers.find(a => 
                            a.sectionIndex === sIdx && a.questionIndex === qIdx
                        );
                        newScore += (descAnswer?.score || 0);
                    } else if (question.questionType === 'fill-blank') {
                        if (studentAnswer) {
                            const userAnswer = studentAnswer.selectedOption;
                            const acceptableAnswers = question.acceptableAnswers || [];
                            let isCorrect = question.caseSensitive
                                ? acceptableAnswers.includes(userAnswer)
                                : acceptableAnswers.some(ans => ans.toLowerCase() === userAnswer.toLowerCase());
                            if (isCorrect) newScore += (question.points || 1);
                        }
                    } else {
                        if (studentAnswer && studentAnswer.selectedOption === question.correctAnswer) {
                            newScore += (question.points || 1);
                        }
                    }
                });
            });
        }

        // Add coding question scores
        result.codingAnswers.forEach(ca => {
            const section = test.sections?.[ca.sectionIndex];
            const codingQuestion = section?.codingQuestions?.[ca.codingQuestionIndex];
            if(codingQuestion) {
                const maxScore = codingQuestion.testCases?.reduce((sum, tc) => sum + (tc.weight || 1), 0) || 10;
                totalMarks += maxScore;
                newScore += (ca.score || 0);
            }
        });

        result.score = newScore;
        result.totalMarks = totalMarks;
        await result.save();

        res.status(200).json({ 
            success: true, 
            message: 'Descriptive question evaluated successfully',
            data: result 
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
