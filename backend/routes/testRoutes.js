const express = require('express');
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

const router = express.Router();

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