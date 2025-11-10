import React from 'react';
import { Plus, Save, Home, Database, FileCode, Link, BarChart3 } from 'lucide-react';
import Button from '../Common/Button';
import { useNavigate } from 'react-router-dom';
import useProjectStore from '../../store/projectStore';
import { downloadDSDHTML } from '../../utils/dsdExporter';
import { downloadSQL } from '../../utils/sqlGenerator';
import { downloadNormalizationReport } from '../../utils/normalizationAnalyzer';

const Toolbar = ({ projectName, onAddEntity, onAddRelationship, onSave, isSaving }) => {
  const navigate = useNavigate();
  const { nodes } = useProjectStore();

  /**
   * Handle DSD export
   */
  const handleExportDSD = () => {
    if (!nodes || nodes.length === 0) {
      alert('אין נתונים לייצוא. אנא צור ישויות וקשרים תחילה.');
      return;
    }
    
    const entities = nodes.filter(n => n.type === 'entity');
    if (entities.length === 0) {
      alert('אנא צור לפחות ישות אחת לפני ייצוא DSD');
      return;
    }
    
    try {
      downloadDSDHTML(nodes, `${projectName}_dsd.html`);
      console.log('✅ DSD exported successfully!');
    } catch (error) {
      console.error('שגיאה בייצוא DSD:', error);
      alert('אירעה שגיאה בייצוא DSD. אנא נסה שוב.');
    }
  };

  /**
   * Handle SQL export
   */
  const handleExportSQL = () => {
    if (!nodes || nodes.length === 0) {
      alert('אין נתונים לייצוא. אנא צור ישויות וקשרים תחילה.');
      return;
    }
    
    const entities = nodes.filter(n => n.type === 'entity');
    if (entities.length === 0) {
      alert('אנא צור לפחות ישות אחת לפני ייצוא SQL');
      return;
    }
    
    try {
      downloadSQL(nodes, `${projectName}_schema.sql`);
      console.log('✅ SQL exported successfully!');
    } catch (error) {
      console.error('שגיאה בייצוא SQL:', error);
      alert('אירעה שגיאה בייצוא SQL. אנא נסה שוב.');
    }
  };

  /**
   * Handle Normalization Analysis
   * ניתוח רמת נרמול - NEW! 🎯
   */
  const handleNormalizationAnalysis = () => {
    if (!nodes || nodes.length === 0) {
      alert('אין נתונים לניתוח. אנא צור ישויות וקשרים תחילה.');
      return;
    }
    
    const entities = nodes.filter(n => n.type === 'entity');
    if (entities.length === 0) {
      alert('אנא צור לפחות ישות אחת לפני ניתוח נרמול');
      return;
    }
    
    try {
      downloadNormalizationReport(nodes, `${projectName}_normalization.html`);
      console.log('✅ Normalization report generated successfully!');
    } catch (error) {
      console.error('שגיאה בניתוח נרמול:', error);
      alert('אירעה שגיאה בניתוח נרמול. אנא נסה שוב.');
    }
  };

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

          {/* ✅ Generate DSD button */}
          <Button
            onClick={handleExportDSD}
            variant="ghost"
            size="md"
            icon={Database}
            className="hover:bg-gray-100"
          >
            הפק DSD
          </Button>

          {/* ✅ Generate SQL button */}
          <Button
            onClick={handleExportSQL}
            variant="ghost"
            size="md"
            icon={FileCode}
            className="hover:bg-gray-100"
          >
            הפק SQL
          </Button>

          {/* 🆕 Normalization Analysis button - NEW! */}
          <Button
            onClick={handleNormalizationAnalysis}
            variant="ghost"
            size="md"
            icon={BarChart3}
            className="hover:bg-purple-50 text-purple-600 hover:text-purple-700"
          >
            ניתוח נרמול
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