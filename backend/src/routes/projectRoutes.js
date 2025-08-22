const express = require('express');
const { body } = require('express-validator');
const { 
  createProject, 
  getAllProjects, 
  getProjectById, 
  getUserProjects, 
  updateProject, 
  deleteProject 
} = require('../controllers/projectController');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');

const router = express.Router();

// Get all public projects
router.get('/', getAllProjects);

// Get user's projects (authenticated)
router.get('/my-projects', authenticateToken, getUserProjects);

// Create new project (authenticated)
router.post('/', [
  authenticateToken,
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title must be between 1 and 100 characters'),
  body('description').trim().isLength({ min: 1, max: 1000 }).withMessage('Description must be between 1 and 1000 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  validateRequest
], createProject);

// Get project by ID
router.get('/:id', getProjectById);

// Update project (authenticated, creator only)
router.put('/:id', [
  authenticateToken,
  body('title').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Title must be between 1 and 100 characters'),
  body('description').optional().trim().isLength({ min: 1, max: 1000 }).withMessage('Description must be between 1 and 1000 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  validateRequest
], updateProject);

// Delete project (authenticated, creator only)
router.delete('/:id', authenticateToken, deleteProject);

module.exports = { projectRoutes: router };
