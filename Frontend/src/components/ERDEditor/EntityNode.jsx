import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Key, Trash2 } from 'lucide-react';

const EntityNode = ({ data, selected }) => {
  const { name, attributes = [], onDelete, onEdit } = data;

  return (
    <div
      className={`bg-white rounded-lg shadow-lg border-2 min-w-[200px] transition-all duration-200 ${
        selected ? 'border-primary-600 shadow-xl' : 'border-gray-300'
      }`}
      onDoubleClick={onEdit}
    >
      {/* Handles - נקודות חיבור */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-primary-500" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-primary-500" />
      <Handle type="source" position={Position.Left} className="w-3 h-3 !bg-primary-500" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-primary-500" />

      {/* Header - שם הישות */}
      <div className="bg-primary-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
        <span className="font-bold text-lg">{name || 'ישות חדשה'}</span>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-white hover:text-red-200 transition-colors p-1 hover:bg-primary-700 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Attributes - מאפיינים */}
      <div className="p-2">
        {attributes.length === 0 ? (
          <div className="text-center text-gray-400 py-4 text-sm">
            לחץ פעמיים להוספת מאפיינים
          </div>
        ) : (
          <div className="space-y-1">
            {attributes.map((attr, index) => (
              <div
                key={index}
                className={`px-3 py-2 rounded ${
                  attr.isPrimaryKey
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-gray-50 border border-gray-200'
                } flex items-center justify-between`}
              >
                <div className="flex items-center gap-2">
                  {attr.isPrimaryKey && <Key className="w-4 h-4 text-yellow-600" />}
                  <span
                    className={`text-sm ${
                      attr.isPrimaryKey ? 'font-semibold text-gray-900' : 'text-gray-700'
                    }`}
                  >
                    {attr.name}
                  </span>
                </div>
                {attr.type && (
                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                    {attr.type}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - מידע נוסף */}
      {attributes.length > 0 && (
        <div className="bg-gray-50 px-4 py-2 rounded-b-lg border-t text-xs text-gray-500 text-center">
          {attributes.length} מאפיינים
        </div>
      )}
    </div>
  );
};

export default memo(EntityNode);