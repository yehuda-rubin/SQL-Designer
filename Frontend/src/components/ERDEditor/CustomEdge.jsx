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

  // סוג הקשר: 'optional' (0..1) או 'mandatory' (1..1)
  const cardinality = data?.cardinality || 'optional';
  const label = data?.label || '';

  // צבעים שונים לפי סוג הקשר
  const edgeColor = cardinality === 'mandatory' ? '#ef4444' : '#3b82f6';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: edgeColor,
          strokeWidth: 2,
        }}
      />

      {/* עיגול בסוף אם זה mandatory */}
      {cardinality === 'mandatory' && (
        <circle
          cx={targetX}
          cy={targetY}
          r={6}
          fill="white"
          stroke={edgeColor}
          strokeWidth={2}
        />
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
            <div className="bg-white px-2 py-1 rounded shadow-md border-2 text-xs font-semibold"
                 style={{ borderColor: edgeColor, color: edgeColor }}>
              {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default CustomEdge;