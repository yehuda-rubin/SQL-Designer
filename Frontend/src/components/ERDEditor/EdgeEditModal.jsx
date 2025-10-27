import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import Button from '../Common/Button';

const EdgeEditModal = ({ edge, onClose, onSave, onDelete }) => {
  const [cardinality, setCardinality] = useState('optional');
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (edge) {
      setCardinality(edge.data?.cardinality || 'optional');
      setLabel(edge.data?.label || '');
    }
  }, [edge]);

  if (!edge) return null;

  const handleSave = () => {
    onSave(edge.id, {
      cardinality,
      label: label.trim(),
    });
  };

  const handleDelete = () => {
    onDelete(edge.id);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-xl font-semibold text-gray-900">עריכת קשר</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Cardinality Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                סוג הקשר (Cardinality)
              </label>
              <div className="space-y-3">
                <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                       style={{
                         borderColor: cardinality === 'optional' ? '#3b82f6' : '#e5e7eb'
                       }}>
                  <input
                    type="radio"
                    name="cardinality"
                    value="optional"
                    checked={cardinality === 'optional'}
                    onChange={(e) => setCardinality(e.target.value)}
                    className="ml-3 w-4 h-4 text-primary-600"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">אופציונלי (0..1)</div>
                    <div className="text-sm text-gray-500">חץ רגיל - הישות יכולה להופיע 0 או 1 פעמים</div>
                  </div>
                  <div className="text-2xl text-blue-500">→</div>
                </label>

                <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                       style={{
                         borderColor: cardinality === 'mandatory' ? '#ef4444' : '#e5e7eb'
                       }}>
                  <input
                    type="radio"
                    name="cardinality"
                    value="mandatory"
                    checked={cardinality === 'mandatory'}
                    onChange={(e) => setCardinality(e.target.value)}
                    className="ml-3 w-4 h-4 text-red-600"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">חובה (1..1)</div>
                    <div className="text-sm text-gray-500">חץ עם עיגול - הישות חייבת להופיע בדיוק פעם אחת</div>
                  </div>
                  <div className="text-2xl text-red-500">—●</div>
                </label>
              </div>
            </div>

            {/* Label Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                תווית (אופציונלי)
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="לדוגמה: 1:N, M:N"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                תווית תופיע על הקשר בתרשים
              </p>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 <strong>טיפ:</strong> השתמש בחיצים אלה כדי לציין את ה-cardinality של הקשר בין הישויות
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t">
            <Button onClick={handleSave} variant="primary" className="flex-1">
              שמור שינויים
            </Button>
            <Button onClick={onClose} variant="secondary">
              ביטול
            </Button>
            <Button 
              onClick={handleDelete} 
              variant="danger" 
              icon={Trash2}
              className="px-4"
              title="מחק קשר"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EdgeEditModal;