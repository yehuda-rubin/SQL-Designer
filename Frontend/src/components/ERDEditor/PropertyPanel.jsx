import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Key } from 'lucide-react';
import Button from '../Common/Button';
import useProjectStore from '../../store/projectStore';

const PropertyPanel = ({ entity, onClose, onSave }) => {
  const [name, setName] = useState(entity?.data.name || '');
  const [attributes, setAttributes] = useState(entity?.data.attributes || []);
  const [connections, setConnections] = useState(entity?.data.connections || []);
  const isRelationship = entity?.type === 'relationship';
  
  // קבלת רשימת כל הישויות מה-store
  const { nodes } = useProjectStore();
  const availableEntities = nodes.filter(n => n.type === 'entity');

  useEffect(() => {
    if (entity) {
      setName(entity.data.name || '');
      setAttributes(entity.data.attributes || []);
      
      // אם זה קשר וצריך לאתחל connections
      if (entity.type === 'relationship') {
        const existingConnections = entity.data.connections || [];
        // אם אין connections כלל, נתחיל עם 2 ריקים
        if (existingConnections.length === 0) {
          setConnections([
            { entityId: '', entityName: '', cardinality: '1' },
            { entityId: '', entityName: '', cardinality: '1' }
          ]);
        } else {
          setConnections(existingConnections);
        }
      }
    }
  }, [entity]);

  if (!entity) return null;

  const dataTypes = [
    'INT',
    'VARCHAR(255)',
    'TEXT',
    'DATE',
    'DATETIME',
    'BOOLEAN',
    'DECIMAL',
    'FLOAT',
  ];

  const cardinalityOptions = [
    { value: '1', label: 'חובה פעם אחת (1)', symbol: '—|' },
    { value: '0..1', label: 'מקסימום 1 (0..1)', symbol: '—○' },
    { value: 'N', label: 'רבים (N)', symbol: '—<' },
  ];

  // פונקציות לניהול Attributes
  const addAttribute = () => {
    setAttributes([
      ...attributes,
      {
        name: '',
        type: 'VARCHAR(255)',
        isPrimaryKey: false,
      },
    ]);
  };

  const updateAttribute = (index, field, value) => {
    const updated = [...attributes];
    updated[index] = { ...updated[index], [field]: value };
    setAttributes(updated);
  };

  const deleteAttribute = (index) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const togglePrimaryKey = (index) => {
    const updated = [...attributes];
    updated[index].isPrimaryKey = !updated[index].isPrimaryKey;
    setAttributes(updated);
  };

  // פונקציות לניהול Connections (רק לקשרים)
  const addConnection = () => {
    setConnections([
      ...connections,
      { entityId: '', entityName: '', cardinality: '1' }
    ]);
  };

  const updateConnection = (index, field, value) => {
    const updated = [...connections];
    
    if (field === 'entityId') {
      // אם בחרו ישות מהרשימה
      const selectedEntity = availableEntities.find(e => e.id === value);
      updated[index] = {
        ...updated[index],
        entityId: value,
        entityName: selectedEntity ? selectedEntity.data.name : ''
      };
    } else if (field === 'entityName') {
      // אם הקלידו שם ידנית
      updated[index] = {
        ...updated[index],
        entityName: value,
        entityId: '' // נמחק את ה-ID אם הקלידו ידנית
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    
    setConnections(updated);
  };

  const deleteConnection = (index) => {
    setConnections(connections.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert(isRelationship ? 'יש להזין שם לקשר' : 'יש להזין שם לישות');
      return;
    }

    const dataToSave = {
      name: name.trim(),
      attributes: attributes.filter((attr) => attr.name.trim()),
    };

    // אם זה קשר, נוסיף את החיבורים
    if (isRelationship) {
      dataToSave.connections = connections;
    }

    onSave(entity.id, dataToSave);
  };

  return (
    <div className="fixed left-0 top-16 bottom-0 w-96 bg-white shadow-2xl border-r border-gray-200 z-40 overflow-y-auto">
      {/* Header */}
      <div 
        className={`sticky top-0 text-white p-4 flex items-center justify-between ${
          isRelationship ? 'bg-purple-600' : 'bg-primary-600'
        }`}
      >
        <h3 className="text-lg font-bold">
          {isRelationship ? 'עריכת קשר' : 'עריכת ישות'}
        </h3>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Entity/Relationship Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isRelationship ? 'שם הקשר' : 'שם הישות'}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isRelationship ? 'לדוגמה: רשום' : 'לדוגמה: Student'}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Connections Section - רק לקשרים */}
        {isRelationship && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
                חיבורי ישויות
              </label>
              <Button onClick={addConnection} variant="ghost" size="sm" icon={Plus}>
                הוסף ישות
              </Button>
            </div>

            <div className="space-y-4">
              {connections.map((conn, index) => (
                <div
                  key={index}
                  className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg space-y-3"
                >
                  {/* כותרת + כפתור מחיקה */}
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-purple-800 text-sm">
                      ישות #{index + 1}
                    </span>
                    {connections.length > 0 && (
                      <button
                        onClick={() => deleteConnection(index)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-100"
                        title="מחק חיבור"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* בחירת ישות - Dropdown */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      בחר מרשימה:
                    </label>
                    <select
                      value={conn.entityId}
                      onChange={(e) => updateConnection(index, 'entityId', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">-- בחר ישות --</option>
                      {availableEntities.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.data.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* הקלדת שם ישות ידנית */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      או הקלד שם ישות:
                    </label>
                    <input
                      type="text"
                      value={conn.entityName}
                      onChange={(e) => updateConnection(index, 'entityName', e.target.value)}
                      placeholder="לדוגמה: Student"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Cardinality */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Cardinality (שיטת אולמן):
                    </label>
                    <select
                      value={conn.cardinality}
                      onChange={(e) => updateConnection(index, 'cardinality', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                    >
                      {cardinalityOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.symbol} {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {connections.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                אין חיבורים עדיין
              </div>
            )}
          </div>
        )}

        {/* Attributes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">
              {isRelationship ? 'תכונות הקשר' : 'מאפיינים'}
            </label>
            <Button onClick={addAttribute} variant="ghost" size="sm" icon={Plus}>
              הוסף
            </Button>
          </div>

          <div className="space-y-3">
            {attributes.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                {isRelationship ? 'אין תכונות עדיין' : 'אין מאפיינים עדיין'}
              </div>
            ) : (
              attributes.map((attr, index) => (
                <div
                  key={index}
                  className={`rounded-lg p-3 border space-y-2 ${
                    isRelationship 
                      ? 'bg-purple-50 border-purple-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  {/* Attribute Name */}
                  <input
                    type="text"
                    value={attr.name}
                    onChange={(e) => updateAttribute(index, 'name', e.target.value)}
                    placeholder={isRelationship ? 'שם התכונה' : 'שם המאפיין'}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                  />

                  {/* Attribute Type & Actions */}
                  <div className="flex items-center gap-2">
                    <select
                      value={attr.type}
                      onChange={(e) => updateAttribute(index, 'type', e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                    >
                      {dataTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => togglePrimaryKey(index)}
                      className={`p-2 rounded transition-colors ${
                        attr.isPrimaryKey
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                      }`}
                      title="מפתח ראשי"
                    >
                      <Key className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => deleteAttribute(index)}
                      className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                      title={isRelationship ? 'מחק תכונה' : 'מחק מאפיין'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Hint for Relationships */}
        {isRelationship && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-800">
              💡 <strong>טיפ:</strong> בחר ישויות מהרשימה או הקלד שמות ידנית. הקווים יווצרו אוטומטית!
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={handleSave} variant="primary" className="flex-1">
            שמור שינויים
          </Button>
          <Button onClick={onClose} variant="secondary">
            ביטול
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PropertyPanel;