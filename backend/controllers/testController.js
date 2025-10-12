const Test = require('../models/testModel');

// @desc    Create a new test
// @route   POST /api/tests
// @access  Private (Admin)
exports.createTest = async (req, res) => {
  const { title, description, duration, questions } = req.body;
  
  try {
    const test = await Test.create({
      title,
      description,
      duration,
      questions,
      createdBy: req.admin._id,
    });
    res.status(201).json({ success: true, data: test });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get all tests for the logged-in admin
// @route   GET /api/tests
// @access  Private (Admin)
exports.getAllTestsForAdmin = async (req, res) => {
  try {
    const tests = await Test.find({ createdBy: req.admin._id });
    res.status(200).json({ success: true, count: tests.length, data: tests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get a single test by ID (for students)
// @route   GET /api/tests/:id/public
// @access  Public
exports.getTestById = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }
    // Optionally, you might want to remove correct answers before sending to student
    const testForStudent = { ...test.toObject() };
    testForStudent.questions.forEach(q => delete q.correctAnswer);

    res.status(200).json({ success: true, data: testForStudent });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update a test
// @route   PUT /api/tests/:id
// @access  Private (Admin)
exports.updateTest = async (req, res) => {
  try {
    let test = await Test.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    // Make sure admin is the owner
    if (test.createdBy.toString() !== req.admin._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to update this test' });
    }

    test = await Test.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: test });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Delete a test
// @route   DELETE /api/tests/:id
// @access  Private (Admin)
exports.deleteTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    // Make sure admin is the owner
    if (test.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(401).json({ success: false, message: 'Not authorized to delete this test' });
    }

    await test.deleteOne();
    // Also delete associated results (optional, but good practice)
    // await Result.deleteMany({ test: req.params.id });


    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};