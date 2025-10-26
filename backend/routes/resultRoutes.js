const express = require('express');
const { submitTest, getResultsByTestId, checkSubmissionStatus } = require('../controllers/resultController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public route for students to submit answers
router.post('/submit', submitTest);

// Public route to check if test has been submitted by email
router.get('/check/:testId/:email', checkSubmissionStatus);

// Protected route for admins to view results of a test
router.get('/:testId', protect, getResultsByTestId);

module.exports = router;