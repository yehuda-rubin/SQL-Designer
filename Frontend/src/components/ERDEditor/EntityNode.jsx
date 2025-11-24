import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Trash2 } from 'lucide-react';

/**
 * EntityNode - Ullman's notation (simplified)
 * Only displays the entity name in a rectangle
 * Attributes are separate AttributeNode instances connected with edges
 */
const EntityNode = ({ data, selected }) => {
  const { name, onDelete, onEdit } = data;

  return (
    <div
      className={`bg-white rounded-lg shadow-lg border-2 min-w-[160px] transition-all duration-200 ${
        selected ? 'border-primary-600 shadow-xl' : 'border-gray-300'
      }`}
      onDoubleClick={onEdit}
    >
      {/* Handles - connection points */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-primary-500" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-primary-500" />
      <Handle type="source" position={Position.Left} className="w-3 h-3 !bg-primary-500" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-primary-500" />

      {/* Entity name - centered */}
      <div className="bg-primary-600 text-white px-6 py-4 rounded-lg flex items-center justify-between">
        <span className="font-bold text-lg flex-1 text-center">{name || 'ישות חדשה'}</span>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-white hover:text-red-200 transition-colors p-1 hover:bg-primary-700 rounded ml-2"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Hint text */}
      <div className="px-4 py-2 text-center text-xs text-gray-400 bg-gray-50 rounded-b-lg">
        לחץ פעמיים להוספת תכונות
      </div>
    </div>
  );
};

export default memo(EntityNode);