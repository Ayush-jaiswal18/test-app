const Result = require('../models/resultModel');
const Test = require('../models/testModel');

// @desc    Submit a test
// @route   POST /api/results/submit
// @access  Public
exports.submitTest = async (req, res) => {
  const { studentName, rollNumber, testId, answers } = req.body;

  try {
    // Fetch the test to get correct answers
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    let score = 0;
    const totalMarks = test.questions.length;

    // Calculate score
    test.questions.forEach((question, index) => {
      const studentAnswer = answers.find(a => a.questionIndex === index);
      if (studentAnswer && studentAnswer.selectedOption === question.correctAnswer) {
        score++;
      }
    });

    // Save the result
    const result = await Result.create({
      studentName,
      rollNumber,
      test: testId,
      score,
      totalMarks,
      answers,
    });

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
