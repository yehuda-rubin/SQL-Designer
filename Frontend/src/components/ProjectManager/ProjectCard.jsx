import React from 'react';
import { Calendar, Trash2, Edit } from 'lucide-react';
import Button from '../Common/Button';

const ProjectCard = ({ project, onOpen, onDelete }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את הפרויקט "${project.name}"?`)) {
      onDelete(project.id);
    }
  };

  return (
    <div
      onClick={() => onOpen(project.id)}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-200 hover:border-primary-400 fade-in"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <Edit className="w-5 h-5 ml-2 text-primary-600" />
            {project.name}
          </h3>
          <button
            onClick={handleDelete}
            className="text-red-500 hover:text-red-700 transition-colors p-2 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Entities</div>
            <div className="text-2xl font-bold text-primary-600">
              {project.data?.nodes?.length || 0}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Relationships</div>
            <div className="text-2xl font-bold text-green-600">
              {project.data?.edges?.length || 0}
            </div>
          </div>
        </div>

        {/* Last updated date */}
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="w-4 h-4 ml-1" />
          <span>Updated: {formatDate(project.updated_at)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 rounded-b-lg border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(project.id);
          }}
        >
          Open Project
        </Button>
      </div>
    </div>
  );
};

export default ProjectCard;
