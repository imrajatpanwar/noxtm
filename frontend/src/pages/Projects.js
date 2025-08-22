import React from 'react';
import { Plus, Search, Filter, Folder } from 'lucide-react';

const Projects = () => {
  const projects = [
    {
      id: 1,
      title: 'E-commerce Platform',
      description: 'A modern e-commerce platform built with React and Node.js',
      tags: ['React', 'Node.js', 'MongoDB'],
      status: 'In Progress',
      progress: 75,
      creator: 'John Doe',
      createdAt: '2024-01-15',
    },
    {
      id: 2,
      title: 'Mobile App Development',
      description: 'Cross-platform mobile application for task management',
      tags: ['React Native', 'Firebase'],
      status: 'Planning',
      progress: 25,
      creator: 'Jane Smith',
      createdAt: '2024-01-10',
    },
    {
      id: 3,
      title: 'Website Redesign',
      description: 'Complete redesign of company website with modern UI/UX',
      tags: ['Next.js', 'Tailwind CSS'],
      status: 'Completed',
      progress: 100,
      creator: 'Mike Johnson',
      createdAt: '2024-01-05',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600">Discover and manage your projects</p>
        </div>
        <button className="btn-primary mt-4 sm:mt-0 flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Create Project</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search projects..."
            className="input-field pl-10"
          />
        </div>
        <button className="btn-secondary flex items-center space-x-2">
          <Filter className="w-4 h-4" />
          <span>Filter</span>
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div key={project.id} className="card hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{project.title}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                project.status === 'Completed' ? 'bg-green-100 text-green-800' :
                project.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {project.status}
              </span>
            </div>
            
            <p className="text-gray-600 mb-4 line-clamp-2">{project.description}</p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {project.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                >
                  {tag}
                </span>
              ))}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Progress</span>
                <span className="font-medium">{project.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>By {project.creator}</span>
                <span>{new Date(project.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Folder className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
          <p className="text-gray-600 mb-6">Get started by creating your first project.</p>
          <button className="btn-primary">
            Create Project
          </button>
        </div>
      )}
    </div>
  );
};

export default Projects;
