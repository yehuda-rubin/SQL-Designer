import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import useProjectStore from '../store/projectStore';
import Toolbar from '../components/ERDEditor/Toolbar';
import ERDCanvas from '../components/ERDEditor/ERDCanvas';

const DesignerPage = () => {
  const { projectId } = useParams();
  const { currentProject, loadProject, saveProject, addNode, isLoading } = useProjectStore();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadProject(parseInt(projectId));
    }
  }, [projectId, loadProject]);

  const handleAddEntity = () => {
    const newNode = {
      id: `node-${Date.now()}`,
      type: 'entity',
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
      },
      data: {
        name: 'ישות חדשה',
        attributes: [],
      },
    };
    addNode(newNode);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveProject();
      alert('הפרויקט נשמר בהצלחה!');
    } catch (error) {
      alert('שגיאה בשמירת הפרויקט: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען פרויקט...</p>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">פרויקט לא נמצא</h2>
          <p className="text-gray-600">הפרויקט שביקשת אינו קיים</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Toolbar
        projectName={currentProject.name}
        onAddEntity={handleAddEntity}
        onSave={handleSave}
        isSaving={isSaving}
      />
      <div className="flex-1">
        <ERDCanvas />
      </div>
    </div>
  );
};

export default DesignerPage;