const Result = require('../models/resultModel');
const Test = require('../models/testModel');
const TestProgress = require('../models/testProgressModel');

// @desc    Submit a test
// @route   POST /api/results/submit
// @access  Public
exports.submitTest = async (req, res) => {
  const { studentName, studentEmail, rollNumber, testId, answers, timeSpent, isResumed } = req.body;

  try {
    // Fetch the test to get correct answers
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    let score = 0;
    let totalMarks = 0;

    // Handle both sectioned and non-sectioned tests
    if (test.sections && test.sections.length > 0) {
      // Calculate score for sectioned test
      test.sections.forEach((section, sectionIndex) => {
        section.questions.forEach((question, questionIndex) => {
          totalMarks++;
          const studentAnswer = answers.find(a => 
            a.sectionIndex === sectionIndex && a.questionIndex === questionIndex
          );
          if (studentAnswer && studentAnswer.selectedOption === question.correctAnswer) {
            score++;
          }
        });
      });
    } else {
      // Calculate score for traditional test
      totalMarks = test.questions.length;
      test.questions.forEach((question, index) => {
        const studentAnswer = answers.find(a => a.questionIndex === index);
        if (studentAnswer && studentAnswer.selectedOption === question.correctAnswer) {
          score++;
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
      timeSpent: timeSpent || 0,
      isResumed: isResumed || false,
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
