const TestProgress = require('../models/testProgressModel');
const Test = require('../models/testModel');

// @desc    Save test progress
// @route   POST /api/progress/save
// @access  Public
exports.saveProgress = async (req, res) => {
  const { studentEmail, studentName, rollNumber, testId, currentSection, currentQuestion, answers, timeSpent } = req.body;

  try {
    // Check if test exists
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    // Update or create progress record
    const progress = await TestProgress.findOneAndUpdate(
      { studentEmail, test: testId },
      {
        studentName,
        rollNumber,
        currentSection: currentSection || 0,
        currentQuestion: currentQuestion || 0,
        answers: answers || [],
        timeSpent: timeSpent || 0,
        lastSaved: new Date(),
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Progress saved successfully',
      data: progress
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error saving progress', 
      error: error.message 
    });
  }
};

// @desc    Get test progress for a student
// @route   GET /api/progress/:testId/:email
// @access  Public
exports.getProgress = async (req, res) => {
  const { testId, email } = req.params;

  try {
    const progress = await TestProgress.findOne({ 
      studentEmail: email.toLowerCase(), 
      test: testId 
    }).populate('test', 'title duration sections questions');

    if (!progress) {
      return res.status(404).json({ 
        success: false, 
        message: 'No progress found for this student and test' 
      });
    }

    // Check if test is completed
    if (progress.isCompleted) {
      return res.status(400).json({ 
        success: false, 
        message: 'Test has already been completed' 
      });
    }

    res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving progress', 
      error: error.message 
    });
  }
};

// @desc    Mark test as completed
// @route   POST /api/progress/complete
// @access  Public
exports.completeTest = async (req, res) => {
  const { studentEmail, testId } = req.body;

  try {
    const progress = await TestProgress.findOneAndUpdate(
      { studentEmail: studentEmail.toLowerCase(), test: testId },
      { 
        isCompleted: true,
        lastSaved: new Date()
      },
      { new: true }
    );

    if (!progress) {
      return res.status(404).json({ 
        success: false, 
        message: 'Progress record not found' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Test marked as completed',
      data: progress
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error completing test', 
      error: error.message 
    });
  }
};

// @desc    Delete progress (reset test for student)
// @route   DELETE /api/progress/:testId/:email
// @access  Public (or Admin only if you prefer)
exports.resetProgress = async (req, res) => {
  const { testId, email } = req.params;

  try {
    const progress = await TestProgress.findOneAndDelete({ 
      studentEmail: email.toLowerCase(), 
      test: testId 
    });

    if (!progress) {
      return res.status(404).json({ 
        success: false, 
        message: 'No progress found to reset' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Progress reset successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error resetting progress', 
      error: error.message 
    });
  }
};