import React from 'react';
import { Plus, Save, Home, Database, FileCode, Link } from 'lucide-react';
import Button from '../Common/Button';
import { useNavigate } from 'react-router-dom';

const Toolbar = ({ projectName, onAddEntity, onAddRelationship, onSave, isSaving }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white shadow-md border-b border-gray-200">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Right Section - Project Info */}
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            size="sm"
            icon={Home}
          >
            חזרה
          </Button>
          <div className="border-r border-gray-300 h-8"></div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{projectName}</h2>
            <p className="text-xs text-gray-500">עורך ERD - שיטת אולמן</p>
          </div>
        </div>

        {/* Center Section - Tools */}
        <div className="flex items-center gap-3">
          <Button onClick={onAddEntity} variant="primary" size="md" icon={Plus}>
            הוסף ישות
          </Button>

          <Button 
            onClick={onAddRelationship} 
            variant="secondary" 
            size="md" 
            icon={Link}
            className="bg-purple-100 hover:bg-purple-200 text-purple-700"
          >
            הוסף קשר
          </Button>

          <div className="border-r border-gray-300 h-8"></div>

          <Button
            variant="ghost"
            size="md"
            icon={Database}
            disabled
            className="opacity-50"
          >
            הפק DSD
          </Button>

          <Button
            variant="ghost"
            size="md"
            icon={FileCode}
            disabled
            className="opacity-50"
          >
            הפק SQL
          </Button>
        </div>

        {/* Left Section - Save */}
        <div>
          <Button
            onClick={onSave}
            variant="primary"
            size="md"
            icon={Save}
            disabled={isSaving}
          >
            {isSaving ? 'שומר...' : 'שמור פרויקט'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;