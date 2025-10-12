const express = require('express');
const { submitTest, getResultsByTestId } = require('../controllers/resultController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public route for students to submit answers
router.post('/submit', submitTest);

// Protected route for admins to view results of a test
router.get('/:testId', protect, getResultsByTestId);

module.exports = router;