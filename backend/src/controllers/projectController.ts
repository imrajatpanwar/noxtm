import { Request, Response } from 'express';
import { Project } from '../models/Project';

export const createProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { title, description, tags, isPublic } = req.body;

    const project = new Project({
      title,
      description,
      tags: tags || [],
      isPublic: isPublic !== undefined ? isPublic : true,
      creator: userId
    });

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('creator', 'name email');

    res.status(201).json({
      message: 'Project created successfully',
      project: populatedProject
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

export const getAllProjects = async (req: Request, res: Response) => {
  try {
    const projects = await Project.find({ isPublic: true })
      .populate('creator', 'name email')
      .sort({ createdAt: -1 });

    res.json({ projects });
  } catch (error) {
    console.error('Get all projects error:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id)
      .populate('creator', 'name email');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if project is public or user is the creator
    const userId = (req as any).user?.userId;
    if (!project.isPublic && project.creator._id.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
};

export const getUserProjects = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const projects = await Project.find({ creator: userId })
      .populate('creator', 'name email')
      .sort({ createdAt: -1 });

    res.json({ projects });
  } catch (error) {
    console.error('Get user projects error:', error);
    res.status(500).json({ error: 'Failed to get user projects' });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    const { title, description, tags, isPublic } = req.body;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is the creator
    if (project.creator.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update fields if provided
    if (title) project.title = title;
    if (description !== undefined) project.description = description;
    if (tags) project.tags = tags;
    if (isPublic !== undefined) project.isPublic = isPublic;

    await project.save();

    const updatedProject = await Project.findById(id)
      .populate('creator', 'name email');

    res.json({
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is the creator
    if (project.creator.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await Project.findByIdAndDelete(id);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};
