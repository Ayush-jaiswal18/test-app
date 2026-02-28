const Test = require('../models/testModel');
const crypto = require('crypto');

const SUPPORTED_LANGUAGES = ['javascript', 'python', 'cpp', 'java'];

/**
 * Validates startTime and endTime for test availability window.
 * Returns { valid: boolean, message?: string }
 */
const validateAvailabilityWindow = (startTime, endTime, isCreate = false) => {
  if (startTime == null && endTime == null) return { valid: true };
  if (startTime == null || endTime == null) {
    return { valid: false, message: 'Both startTime and endTime must be provided together, or both omitted.' };
  }
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { valid: false, message: 'Invalid startTime or endTime.' };
  }
  if (start >= end) {
    return { valid: false, message: 'startTime must be before endTime.' };
  }
  if (isCreate && end <= new Date()) {
    return { valid: false, message: 'endTime must be in the future when creating a test.' };
  }
  return { valid: true };
};

/**
 * Checks if current time is within test availability window.
 * Returns { allowed: boolean, statusCode: number, message: string }
 */
const checkTestAvailability = (test) => {
  if (!test.startTime || !test.endTime) return { allowed: true };
  const now = new Date();
  const start = new Date(test.startTime);
  const end = new Date(test.endTime);
  if (now < start) {
    return { allowed: false, statusCode: 403, message: 'Test has not started yet' };
  }
  if (now > end) {
    return { allowed: false, statusCode: 403, message: 'Test has expired' };
  }
  return { allowed: true };
};

const normalizeCodingQuestion = (codingQuestion = {}) => {
  const sanitizedLanguage = SUPPORTED_LANGUAGES.includes(codingQuestion.language)
    ? codingQuestion.language
    : 'javascript';

  let allowedLanguages = Array.isArray(codingQuestion.allowedLanguages)
    ? codingQuestion.allowedLanguages.filter(lang => SUPPORTED_LANGUAGES.includes(lang))
    : [];

  if (allowedLanguages.length === 0) {
    allowedLanguages = [sanitizedLanguage];
  }

  return {
    ...codingQuestion,
    language: sanitizedLanguage,
    allowedLanguages,
  };
};

const normalizeSections = (sections = []) => {
  if (!Array.isArray(sections)) return [];
  return sections.map(section => ({
    ...section,
    codingQuestions: (section.codingQuestions || []).map(normalizeCodingQuestion),
  }));
};

// @desc    Create a new test
// @route   POST /api/tests
// @access  Private (Admin)
exports.createTest = async (req, res) => {
  const { title, description, duration, globalDuration, perQuestionDuration, timerType, questions, sections, allowResume, maxWarnings, showScoreToStudents, startTime, endTime } = req.body;
  
  try {
    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide title and description' 
      });
    }

    // Validate timer configuration
    const effectiveTimerType = timerType || 'GLOBAL';
    if (effectiveTimerType === 'GLOBAL') {
      const effectiveDuration = globalDuration || duration;
      if (!effectiveDuration || Number(effectiveDuration) <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please provide a valid duration for global timer' 
        });
      }
    } else if (effectiveTimerType === 'PER_QUESTION') {
      if (!perQuestionDuration || Number(perQuestionDuration) <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please provide a valid per-question duration' 
        });
      }
    }

    // Ensure at least questions or sections are provided
    if ((!questions || questions.length === 0) && (!sections || sections.length === 0)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide at least one question or section' 
      });
    }

    const testData = {
      title,
      description,
      timerType: effectiveTimerType,
      allowResume: allowResume !== undefined ? allowResume : true,
      showScoreToStudents: showScoreToStudents !== undefined ? showScoreToStudents : false,
      createdBy: req.admin._id,
      isPublic: false, // Default to false
    };

    // Set duration fields based on timer type
    if (effectiveTimerType === 'GLOBAL') {
      const effectiveDuration = Number(globalDuration || duration);
      testData.duration = effectiveDuration;
      testData.globalDuration = effectiveDuration;
    } else if (effectiveTimerType === 'PER_QUESTION') {
      testData.perQuestionDuration = Number(perQuestionDuration);
      // Set a dummy duration for backward compatibility (can be calculated from questions)
      testData.duration = null;
    }

    // If admin provided maxWarnings, validate and include it
    if (maxWarnings !== undefined) {
      const parsed = Number(maxWarnings);
      if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 20) {
        testData.maxWarnings = parsed;
      }
    }

    // Optional availability window
    if (startTime != null || endTime != null) {
      const validation = validateAvailabilityWindow(startTime, endTime, true);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.message });
      }
      testData.startTime = new Date(startTime);
      testData.endTime = new Date(endTime);
    }

    // Add questions or sections based on what's provided
    if (sections && sections.length > 0) {
      testData.sections = normalizeSections(sections);
      testData.questions = []; // Empty array for backward compatibility
    } else {
      testData.questions = questions || [];
      testData.sections = []; // Empty array for new format
    }

    // Don't include shareableLink field when creating - it will be added later when needed

    console.log('Creating test with data:', JSON.stringify(testData, null, 2));
    
    const test = await Test.create(testData);
    res.status(201).json({ success: true, data: test });
  } catch (error) {
    console.error('Test creation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error', 
      error: error.message,
      details: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : []
    });
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

// @desc    Get a single test by ID (for admin editing)
// @route   GET /api/tests/:id
// @access  Private (Admin)
exports.getTestByIdForAdmin = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    // Make sure admin is the owner
    if (test.createdBy.toString() !== req.admin._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to view this test' });
    }

    // Return full test data including correct answers for admin
    res.status(200).json({ success: true, data: test });
  } catch (error) {
    console.error('Error fetching test for admin:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
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
    const availability = checkTestAvailability(test);
    if (!availability.allowed) {
      return res.status(availability.statusCode).json({
        success: false,
        message: availability.message,
      });
    }
    // Optionally, you might want to remove correct answers before sending to student
    const testForStudent = { ...test.toObject() };
    testForStudent.questions.forEach(q => {
      delete q.correctAnswer;
      delete q.modelAnswer;
    });

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

    const updatePayload = { ...req.body };
    if (updatePayload.startTime != null || updatePayload.endTime != null) {
      const validation = validateAvailabilityWindow(
        updatePayload.startTime ?? test.startTime,
        updatePayload.endTime ?? test.endTime,
        false
      );
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.message });
      }
      if (updatePayload.startTime != null) updatePayload.startTime = new Date(updatePayload.startTime);
      if (updatePayload.endTime != null) updatePayload.endTime = new Date(updatePayload.endTime);
    }
    if (updatePayload.sections && updatePayload.sections.length > 0) {
      updatePayload.sections = normalizeSections(updatePayload.sections);
    }

    test = await Test.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: test });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Generate shareable link for a test
// @route   POST /api/tests/:id/share
// @access  Private (Admin)
exports.generateShareableLink = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    // Make sure admin is the owner
    if (test.createdBy.toString() !== req.admin._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to share this test' });
    }

    // Generate unique shareable link
    const shareableLink = crypto.randomBytes(16).toString('hex');
    
    test.shareableLink = shareableLink;
    test.isPublic = true;
    await test.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const normalizedFrontendUrl = frontendUrl.endsWith('/')
      ? frontendUrl.slice(0, -1)
      : frontendUrl;
    const shareUrl = `${normalizedFrontendUrl}/test/share/${shareableLink}`;

    res.status(200).json({ 
      success: true, 
      data: { 
        shareableLink: shareableLink,
        shareUrl: shareUrl,
        testId: test._id 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get test by shareable link
// @route   GET /api/tests/share/:shareLink
// @access  Public
exports.getTestByShareLink = async (req, res) => {
  try {
    const test = await Test.findOne({ shareableLink: req.params.shareLink, isPublic: true });
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found or link has expired' });
    }
    const availability = checkTestAvailability(test);
    if (!availability.allowed) {
      return res.status(availability.statusCode).json({
        success: false,
        message: availability.message,
      });
    }

    // Helper function to shuffle array (Fisher-Yates algorithm)
    const shuffleArray = (array) => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Helper function to add original index to questions
    const addOriginalIndex = (questions) => {
      return questions.map((q, index) => ({
        ...q.toObject ? q.toObject() : q,
        originalIndex: index
      }));
    };

    // Remove correct answers before sending to student
    const testForStudent = { ...test.toObject() };
    
    // Handle both old questions format and new sections format
    if (testForStudent.sections && testForStudent.sections.length > 0) {
      testForStudent.sections = testForStudent.sections.map(section => {
        // Add original index to each question before shuffling
        const questionsWithIndex = addOriginalIndex(section.questions || []);
        const codingQuestionsWithIndex = addOriginalIndex(section.codingQuestions || []);
        
        // Shuffle questions for each student
        const shuffledQuestions = shuffleArray(questionsWithIndex);
        const shuffledCodingQuestions = shuffleArray(codingQuestionsWithIndex);
        
        // Remove correct answers and acceptable answers (keep them secret)
        shuffledQuestions.forEach(q => {
          delete q.correctAnswer;
          delete q.acceptableAnswers;
          delete q.caseSensitive;
          delete q.modelAnswer;
        });
        
        return {
          ...section,
          questions: shuffledQuestions,
          codingQuestions: shuffledCodingQuestions
        };
      });
    } else if (testForStudent.questions && testForStudent.questions.length > 0) {
      // Add original index before shuffling
      const questionsWithIndex = addOriginalIndex(testForStudent.questions);
      const shuffledQuestions = shuffleArray(questionsWithIndex);
      
      shuffledQuestions.forEach(q => {
        delete q.correctAnswer;
        delete q.acceptableAnswers;
        delete q.caseSensitive;
        delete q.modelAnswer;
      });
      
      testForStudent.questions = shuffledQuestions;
    }

    res.status(200).json({ success: true, data: testForStudent });
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