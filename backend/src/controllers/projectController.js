const Project = require('../models/Project');

const createProject = async (req, res) => {
  try {
    const { title, description, tags, isPublic } = req.body;
    
    const project = new Project({
      title,
      description,
      tags: tags || [],
      isPublic: isPublic !== undefined ? isPublic : true,
      creator: req.user.userId
    });

    await project.save();
    
    // Populate creator info
    await project.populate('creator', 'name email');
    
    res.status(201).json({ project });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find({ isPublic: true })
      .populate('creator', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({ projects });
  } catch (error) {
    console.error('Get all projects error:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
};

const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('creator', 'name email');
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user can access private project
    if (!project.isPublic && (!req.user || project.creator._id.toString() !== req.user.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Get project by ID error:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
};

const getUserProjects = async (req, res) => {
  try {
    const projects = await Project.find({ creator: req.user.userId })
      .populate('creator', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ projects });
  } catch (error) {
    console.error('Get user projects error:', error);
    res.status(500).json({ error: 'Failed to get user projects' });
  }
};

const updateProject = async (req, res) => {
  try {
    const { title, description, tags, isPublic } = req.body;
    const updateData = {};

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (tags) updateData.tags = tags;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is the creator
    if (project.creator.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only the creator can update this project' });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('creator', 'name email');

    res.json({ project: updatedProject });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is the creator
    if (project.creator.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only the creator can delete this project' });
    }

    await Project.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  getUserProjects,
  updateProject,
  deleteProject
};
