import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Key, Trash2 } from 'lucide-react';

/**
 * AttributeNode - Ullman's notation
 * Displays an attribute as an ellipse connected to an entity or relationship
 */
const AttributeNode = ({ data, selected }) => {
  const { name, type, isPrimaryKey, onDelete, onEdit } = data;

  return (
    <div
      className="relative"
      onDoubleClick={onEdit}
    >
      {/* Handles - connection points */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-2 h-2 !bg-gray-400 opacity-0" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-2 h-2 !bg-gray-400 opacity-0" 
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        className="w-2 h-2 !bg-gray-400 opacity-0" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-2 h-2 !bg-gray-400 opacity-0" 
      />

      {/* Ellipse container */}
      <div
        className={`relative bg-white rounded-full border-2 px-6 py-3 min-w-[120px] flex items-center justify-center transition-all duration-200 ${
          isPrimaryKey
            ? selected
              ? 'border-yellow-600 shadow-lg bg-yellow-50'
              : 'border-yellow-500 shadow-md bg-yellow-50'
            : selected
            ? 'border-gray-600 shadow-lg'
            : 'border-gray-400 shadow-md'
        } ${isPrimaryKey ? 'border-4' : ''}`}
        style={{
          minHeight: '60px',
        }}
      >
        {/* Delete button */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute -top-2 -right-2 z-10 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors shadow-md"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}

        {/* Attribute content */}
        <div className="flex items-center gap-2">
          {/* Primary key indicator */}
          {isPrimaryKey && (
            <Key className="w-4 h-4 text-yellow-600 flex-shrink-0" />
          )}
          
          {/* Attribute name */}
          <div className="text-center">
            <span
              className={`text-sm font-medium ${
                isPrimaryKey ? 'text-gray-900 font-bold' : 'text-gray-700'
              }`}
            >
              {name || 'תכונה'}
            </span>
            
            {/* Attribute type - smaller text below */}
            {type && (
              <div className="text-xs text-gray-500 mt-0.5">
                {type}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Underline for primary key (Ullman's convention) */}
      {isPrimaryKey && (
        <div
          className="absolute left-1/2 transform -translate-x-1/2"
          style={{
            bottom: '18px',
            width: '80%',
            height: '2px',
            backgroundColor: '#000',
          }}
        />
      )}
    </div>
  );
};

export default memo(AttributeNode);