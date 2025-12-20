const express = require('express');
const { submitTest, getResultsByTestId, checkSubmissionStatus, getResultById, evaluateCodingQuestion } = require('../controllers/resultController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public route for students to submit answers
router.post('/submit', submitTest);

// Public route to check if test has been submitted by email
router.get('/check/:testId/:email', checkSubmissionStatus);

// Protected route for admins to view results of a test
router.get('/:testId', protect, getResultsByTestId);

// Protected route for admins to get detailed result
router.get('/:testId/:resultId', protect, getResultById);

// Protected route for admins to evaluate coding questions
router.post('/:resultId/evaluate-coding', protect, evaluateCodingQuestion);


module.exports = router;