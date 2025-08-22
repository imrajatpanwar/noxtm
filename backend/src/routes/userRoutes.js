const express = require('express');
const { body } = require('express-validator');
const { getProfile, updateProfile, deleteProfile, getAllUsers } = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');

const router = express.Router();

// Get all users (public)
router.get('/', getAllUsers);

// Get user profile (authenticated)
router.get('/profile', authenticateToken, getProfile);

// Update user profile (authenticated)
router.put('/profile', [
  authenticateToken,
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters'),
  validateRequest
], updateProfile);

// Delete user profile (authenticated)
router.delete('/profile', authenticateToken, deleteProfile);

module.exports = { userRoutes: router };
