const express = require('express');
const {
  createTest,
  getAllTestsForAdmin,
  getTestById,
  updateTest,
  deleteTest
} = require('../controllers/testController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Routes for Admin
router.route('/')
  .post(protect, createTest)
  .get(protect, getAllTestsForAdmin);

// Routes for Admin
router.route('/:id')
  .put(protect, updateTest)
  .delete(protect, deleteTest);

// Public route for students to get test details
router.get('/:id/public', getTestById);


module.exports = router;