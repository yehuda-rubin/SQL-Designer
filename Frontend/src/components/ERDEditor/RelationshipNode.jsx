import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Link, Trash2, Key } from 'lucide-react';

const RelationshipNode = ({ data, selected }) => {
  const { name, attributes = [], onDelete, onEdit } = data;

  return (
    <div className="relative" onDoubleClick={onEdit}>
      {/* Handles - נקודות חיבור */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-purple-500" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-purple-500" />
      <Handle type="source" position={Position.Left} className="w-3 h-3 !bg-purple-500" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-purple-500" />

      {/* מעויין - Relationship */}
      <div
        className={`relative transform rotate-45 min-w-[140px] min-h-[140px] transition-all duration-200 ${
          selected ? 'shadow-2xl scale-110' : 'shadow-lg'
        }`}
        style={{
          transformOrigin: 'center',
        }}
      >
        {/* רקע מעויין */}
        <div
          className={`absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 border-4 ${
            selected ? 'border-purple-800' : 'border-purple-400'
          }`}
        />

        {/* כפתור מחיקה */}
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

        {/* תוכן - מסובב חזרה */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-4 transform -rotate-45"
          style={{ transformOrigin: 'center' }}
        >
          {/* אייקון */}
          <Link className="w-6 h-6 text-white mb-2" />
          
          {/* שם הקשר */}
          <span className="font-bold text-white text-center text-sm leading-tight max-w-full overflow-hidden">
            {name || 'קשר חדש'}
          </span>

          {/* מספר תכונות */}
          {attributes.length > 0 && (
            <div className="mt-2 bg-white/20 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
              {attributes.length} תכונות
            </div>
          )}
        </div>
      </div>

      {/* תכונות מתחת למעויין */}
      {attributes.length > 0 && (
        <div className="absolute top-[160px] left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-md border-2 border-purple-200 p-2 min-w-[180px] z-20">
          <div className="space-y-1">
            {attributes.slice(0, 3).map((attr, index) => (
              <div
                key={index}
                className="px-2 py-1 rounded bg-purple-50 border border-purple-100 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-1">
                  {attr.isPrimaryKey && <Key className="w-3 h-3 text-yellow-600" />}
                  <span className={attr.isPrimaryKey ? 'font-semibold' : ''}>
                    {attr.name}
                  </span>
                </div>
                {attr.type && (
                  <span className="text-gray-500">{attr.type}</span>
                )}
              </div>
            ))}
            {attributes.length > 3 && (
              <div className="text-center text-gray-400 text-xs">
                +{attributes.length - 3} עוד...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(RelationshipNode);