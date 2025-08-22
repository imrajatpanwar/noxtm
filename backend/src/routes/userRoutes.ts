import { Router } from 'express';
import { body } from 'express-validator';
import { 
  getProfile, 
  updateProfile, 
  deleteProfile, 
  getAllUsers 
} from '../controllers/userController';
import { validateRequest } from '../middleware/validateRequest';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get user profile
router.get('/profile', authenticateToken, getProfile);

// Update user profile
router.put('/profile', [
  authenticateToken,
  body('name').optional().trim().isLength({ min: 2 }),
  body('bio').optional().trim().isLength({ max: 500 }),
  body('avatar').optional().isURL(),
  validateRequest
], updateProfile);

// Delete user profile
router.delete('/profile', authenticateToken, deleteProfile);

// Get all users (admin only)
router.get('/', authenticateToken, getAllUsers);

export { router as userRoutes };
