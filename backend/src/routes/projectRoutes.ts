import { Router } from 'express';
import { body } from 'express-validator';
import { 
  createProject, 
  getAllProjects, 
  getProjectById, 
  updateProject, 
  deleteProject,
  getUserProjects
} from '../controllers/projectController';
import { validateRequest } from '../middleware/validateRequest';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Create new project
router.post('/', [
  authenticateToken,
  body('title').trim().isLength({ min: 1, max: 100 }),
  body('description').trim().isLength({ max: 1000 }),
  body('tags').optional().isArray(),
  body('isPublic').optional().isBoolean(),
  validateRequest
], createProject);

// Get all public projects
router.get('/', getAllProjects);

// Get user's projects
router.get('/my-projects', authenticateToken, getUserProjects);

// Get project by ID
router.get('/:id', getProjectById);

// Update project
router.put('/:id', [
  authenticateToken,
  body('title').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('tags').optional().isArray(),
  body('isPublic').optional().isBoolean(),
  validateRequest
], updateProject);

// Delete project
router.delete('/:id', authenticateToken, deleteProject);

export { router as projectRoutes };
