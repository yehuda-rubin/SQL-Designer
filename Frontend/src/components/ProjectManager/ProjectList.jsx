import React, { useEffect, useState } from 'react';
import { Plus, FolderOpen } from 'lucide-react';
import useProjectStore from '../../store/projectStore';
import ProjectCard from './ProjectCard';
import Button from '../Common/Button';
import Modal from '../Common/Modal';
import { useNavigate } from 'react-router-dom';

const ProjectList = () => {
  const navigate = useNavigate();
  const { projects, isLoading, fetchProjects, createProject, deleteProject } = useProjectStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      alert('אנא הזן שם לפרויקט');
      return;
    }

    try {
      const project = await createProject(newProjectName);
      setIsCreateModalOpen(false);
      setNewProjectName('');
      navigate(`/designer/${project.id}`);
    } catch (error) {
      alert('שגיאה ביצירת הפרויקט: ' + error.message);
    }
  };

  const handleOpenProject = (projectId) => {
    navigate(`/designer/${projectId}`);
  };

  const handleDeleteProject = async (projectId) => {
    try {
      await deleteProject(projectId);
    } catch (error) {
      alert('שגיאה במחיקת הפרויקט: ' + error.message);
    }
  };

  if (isLoading && projects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען פרויקטים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            SQL Designer
          </h1>
          <p className="text-xl text-gray-600">
            מחולל קוד חכם מטבלאות ERD
          </p>
        </div>

        {/* Create Button */}
        <div className="flex justify-center mb-8">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            variant="primary"
            size="lg"
            icon={Plus}
          >
            פרויקט חדש
          </Button>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">
              אין פרויקטים עדיין
            </h3>
            <p className="text-gray-500 mb-6">
              צור את הפרויקט הראשון שלך ותתחיל לעצב ERD
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              variant="primary"
              icon={Plus}
            >
              צור פרויקט
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={handleOpenProject}
                onDelete={handleDeleteProject}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setNewProjectName('');
        }}
        title="פרויקט חדש"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              שם הפרויקט
            </label>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateProject()}
              placeholder="לדוגמה: מערכת אוניברסיטה"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => {
                setIsCreateModalOpen(false);
                setNewProjectName('');
              }}
              variant="secondary"
            >
              ביטול
            </Button>
            <Button onClick={handleCreateProject} variant="primary">
              צור פרויקט
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProjectList;