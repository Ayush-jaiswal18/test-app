const express = require('express');
const path = require('path');
const {
  createTest,
  getAllTestsForAdmin,
  getTestById,
  getTestByIdForAdmin,
  updateTest,
  deleteTest,
  generateShareableLink,
  getTestByShareLink
} = require('../controllers/testController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const { extractQuestions } = require('../utils/questionExtractor');

const router = express.Router();

// @desc    Extract questions from uploaded PDF/DOCX file
// @route   POST /api/tests/extract-questions
// @access  Private (Admin)
router.post('/extract-questions', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded. Please upload a PDF or DOCX file.' 
      });
    }
    
    const fileExt = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    
    const result = await extractQuestions(req.file.buffer, fileExt);
    
    const totalQuestions = result.totalFound + (result.totalCodingFound || 0);
    
    res.json({
      success: true,
      message: `Successfully extracted ${result.totalFound} MCQ questions and ${result.totalCodingFound || 0} coding questions`,
      data: {
        questions: result.questions,
        codingQuestions: result.codingQuestions || [],
        totalFound: result.totalFound,
        totalCodingFound: result.totalCodingFound || 0,
        totalQuestions: totalQuestions,
        fileName: req.file.originalname,
        rawText: result.rawText // Include raw text for manual parsing if needed
      }
    });
    
  } catch (error) {
    console.error('Error extracting questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extract questions from file',
      error: error.message
    });
  }
});

// Routes for Admin
router.route('/')
  .post(protect, createTest)
  .get(protect, getAllTestsForAdmin);

// Routes for Admin
router.route('/:id')
  .get(protect, getTestByIdForAdmin)
  .put(protect, updateTest)
  .delete(protect, deleteTest);

// Generate shareable link for a test
router.post('/:id/share', protect, generateShareableLink);

// Public route for students to get test details by shareable link
router.get('/share/:shareLink', getTestByShareLink);

// Public route for students to get test details (original)
router.get('/:id/public', getTestById);

module.exports = router;