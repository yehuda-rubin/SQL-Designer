import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Link, Trash2 } from 'lucide-react';

/**
 * RelationshipNode - Ullman's notation (simplified)
 * Only displays the relationship name in a diamond
 * Attributes are separate AttributeNode instances connected with edges
 */
const RelationshipNode = ({ data, selected }) => {
  const { name, onDelete, onEdit } = data;

  return (
    <div className="relative" onDoubleClick={onEdit}>
      {/* Handles - connection points */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-purple-500" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-purple-500" />
      <Handle type="source" position={Position.Left} className="w-3 h-3 !bg-purple-500" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-purple-500" />

      {/* Diamond shape - Relationship */}
      <div
        className={`relative transform rotate-45 min-w-[120px] min-h-[120px] transition-all duration-200 ${
          selected ? 'shadow-2xl scale-110' : 'shadow-lg'
        }`}
        style={{
          transformOrigin: 'center',
        }}
      >
        {/* Diamond background */}
        <div
          className={`absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 border-4 ${
            selected ? 'border-purple-800' : 'border-purple-400'
          }`}
        />

        {/* Delete button */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute -top-2 -right-2 z-10 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors shadow-lg transform -rotate-45"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}

        {/* Inner content - rotated back */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-4 transform -rotate-45"
          style={{ transformOrigin: 'center' }}
        >
          {/* Icon */}
          <Link className="w-6 h-6 text-white mb-1" />
          
          {/* Relationship name */}
          <span className="font-bold text-white text-center text-sm leading-tight max-w-full overflow-hidden">
            {name || 'יחס חדש'}
          </span>

          {/* Hint text */}
          <div className="mt-2 text-xs text-white/80 text-center">
            הוסף תכונות
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(RelationshipNode);