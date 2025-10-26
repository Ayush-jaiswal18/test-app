const express = require('express');
const router = express.Router();
const {
  saveProgress,
  getProgress,
  completeTest,
  resetProgress
} = require('../controllers/progressController');

// @route   POST /api/progress/save
// @desc    Save test progress
// @access  Public
router.post('/save', saveProgress);

// @route   GET /api/progress/:testId/:email
// @desc    Get test progress for a student
// @access  Public
router.get('/:testId/:email', getProgress);

// @route   POST /api/progress/complete
// @desc    Mark test as completed
// @access  Public
router.post('/complete', completeTest);

// @route   DELETE /api/progress/:testId/:email
// @desc    Reset progress for a student
// @access  Public
router.delete('/:testId/:email', resetProgress);

module.exports = router;