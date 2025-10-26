import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Key } from 'lucide-react';
import Button from '../Common/Button';

const PropertyPanel = ({ entity, onClose, onSave }) => {
  const [name, setName] = useState(entity?.data.name || '');
  const [attributes, setAttributes] = useState(entity?.data.attributes || []);

  useEffect(() => {
    if (entity) {
      setName(entity.data.name || '');
      setAttributes(entity.data.attributes || []);
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

  const handleSave = () => {
    if (!name.trim()) {
      alert('יש להזין שם לישות');
      return;
    }

    onSave(entity.id, {
      name: name.trim(),
      attributes: attributes.filter((attr) => attr.name.trim()),
    });
  };

  return (
    <div className="fixed left-0 top-16 bottom-0 w-96 bg-white shadow-2xl border-r border-gray-200 z-40 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-primary-600 text-white p-4 flex items-center justify-between">
        <h3 className="text-lg font-bold">עריכת ישות</h3>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Entity Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            שם הישות
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="לדוגמה: Student"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Attributes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">מאפיינים</label>
            <Button onClick={addAttribute} variant="ghost" size="sm" icon={Plus}>
              הוסף
            </Button>
          </div>

          <div className="space-y-3">
            {attributes.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                אין מאפיינים עדיין
              </div>
            ) : (
              attributes.map((attr, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-2"
                >
                  {/* Attribute Name */}
                  <input
                    type="text"
                    value={attr.name}
                    onChange={(e) => updateAttribute(index, 'name', e.target.value)}
                    placeholder="שם המאפיין"
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
                      title="מחק מאפיין"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

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