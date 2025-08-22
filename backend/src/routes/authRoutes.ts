import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, verifyToken, refreshToken } from '../controllers/authController';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();

// Register route
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 }),
  validateRequest
], register);

// Login route
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validateRequest
], login);

// Verify token route
router.get('/verify', verifyToken);

// Refresh token route
router.post('/refresh', refreshToken);

export { router as authRoutes };
