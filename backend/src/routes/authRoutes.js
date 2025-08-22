const express = require('express');
const { body } = require('express-validator');
const { register, login, verifyToken, refreshToken } = require('../controllers/authController');
const { validateRequest } = require('../middleware/validateRequest');

const router = express.Router();

// Register route
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  validateRequest
], register);

// Login route
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  validateRequest
], login);

// Verify token route
router.get('/verify', verifyToken);

// Refresh token route
router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  validateRequest
], refreshToken);

module.exports = { authRoutes: router };
