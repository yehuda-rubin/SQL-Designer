import React from 'react';
import { getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Cardinality לפי אולמן: '1', '0..1', 'N'
  const cardinality = data?.cardinality || '1';
  const label = data?.label || '';

  // חישוב זווית הקו לצורך הצבת הסימנים
  const angle = Math.atan2(targetY - sourceY, targetX - sourceX);
  
  // קונפיגורציה לפי סוג הקשר
  const cardinalityConfig = {
    '1': {
      symbol: '|',
      color: '#ef4444', // אדום לחובה
    },
    '0..1': {
      symbol: '○',
      color: '#3b82f6', // כחול לאופציונלי
    },
    'N': {
      symbol: '<',
      color: '#10b981', // ירוק לרבים
    },
  };

  const config = cardinalityConfig[cardinality] || cardinalityConfig['1'];

  return (
    <>
      {/* הקו הבסיסי */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: config.color,
          strokeWidth: 2,
        }}
      />

      {/* סימון אולמן בסוף הקו */}
      {cardinality === '1' && (
        // קו מאונך —|
        <g transform={`translate(${targetX},${targetY}) rotate(${angle * 180 / Math.PI})`}>
          <line
            x1={-10}
            y1={-8}
            x2={-10}
            y2={8}
            stroke={config.color}
            strokeWidth={3}
            strokeLinecap="round"
          />
        </g>
      )}

      {cardinality === '0..1' && (
        // עיגול —○
        <circle
          cx={targetX}
          cy={targetY}
          r={6}
          fill="white"
          stroke={config.color}
          strokeWidth={2.5}
        />
      )}

      {cardinality === 'N' && (
        // רגלי עוף —< (שלוש קווים)
        <g transform={`translate(${targetX},${targetY}) rotate(${angle * 180 / Math.PI})`}>
          <line x1={-12} y1={0} x2={-20} y2={-6} stroke={config.color} strokeWidth={2} strokeLinecap="round" />
          <line x1={-12} y1={0} x2={-20} y2={0} stroke={config.color} strokeWidth={2} strokeLinecap="round" />
          <line x1={-12} y1={0} x2={-20} y2={6} stroke={config.color} strokeWidth={2} strokeLinecap="round" />
        </g>
      )}

      {/* Label */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div 
              className="bg-white px-2 py-1 rounded shadow-md border-2 text-xs font-semibold"
              style={{ borderColor: config.color, color: config.color }}
            >
              {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default CustomEdge;