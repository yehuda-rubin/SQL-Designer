import React, { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import EntityNode from './EntityNode';
import PropertyPanel from './PropertyPanel';
import useProjectStore from '../../store/projectStore';

const nodeTypes = {
  entity: EntityNode,
};

const edgeOptions = {
  animated: true,
  style: { stroke: '#3b82f6', strokeWidth: 2 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#3b82f6',
  },
};

const ERDCanvas = () => {
  const { nodes: storeNodes, edges: storeEdges, setNodes: setStoreNodes, setEdges: setStoreEdges, deleteNode } = useProjectStore();
  
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  const [selectedEntity, setSelectedEntity] = useState(null);

  // ✅ תיקון - סנכרון בין store ל-Canvas
  useEffect(() => {
    setNodes(storeNodes);
  }, [storeNodes, setNodes]);

  useEffect(() => {
    setEdges(storeEdges);
  }, [storeEdges, setEdges]);

  // עדכון ה-store כשמשנים nodes/edges
  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      setStoreNodes(nodes);
    },
    [nodes, onNodesChange, setStoreNodes]
  );

  const handleEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      setStoreEdges(edges);
    },
    [edges, onEdgesChange, setStoreEdges]
  );

  // חיבור בין ישויות (יצירת קשר)
  const onConnect = useCallback(
    (params) => {
      const newEdge = {
        ...params,
        ...edgeOptions,
        id: `e${params.source}-${params.target}-${Date.now()}`,
        label: '1:N',
        type: 'smoothstep',
      };
      setEdges((eds) => addEdge(newEdge, eds));
      setStoreEdges([...edges, newEdge]);
    },
    [edges, setEdges, setStoreEdges]
  );

  // לחיצה על הקנבס
  const onPaneClick = useCallback(() => {
    setSelectedEntity(null);
  }, []);

  // לחיצה על node
  const onNodeClick = useCallback((event, node) => {
    setSelectedEntity(node);
  }, []);

  // לחיצה כפולה על node
  const onNodeDoubleClick = useCallback((event, node) => {
    setSelectedEntity(node);
  }, []);

  // שמירת שינויים בישות
  const handleSaveEntity = useCallback(
    (nodeId, data) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...data,
              },
            };
          }
          return node;
        })
      );
      
      // עדכון ה-store
      const updatedNodes = nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      );
      setStoreNodes(updatedNodes);
      setSelectedEntity(null);
    },
    [nodes, setNodes, setStoreNodes]
  );

  // מחיקת ישות
  const handleDeleteEntity = useCallback(
    (nodeId) => {
      if (window.confirm('האם אתה בטוח שברצונך למחוק ישות זו?')) {
        deleteNode(nodeId);
        setNodes((nds) => nds.filter((node) => node.id !== nodeId));
        setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
        setSelectedEntity(null);
      }
    },
    [deleteNode, setNodes, setEdges]
  );

  // הוספת onDelete לכל node
  const nodesWithDelete = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onDelete: () => handleDeleteEntity(node.id),
      onEdit: () => setSelectedEntity(node),
    },
  }));

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodesWithDelete}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={edgeOptions}
        fitView
        attributionPosition="bottom-left"
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            return '#3b82f6';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>

      {/* Property Panel */}
      <PropertyPanel
        entity={selectedEntity}
        onClose={() => setSelectedEntity(null)}
        onSave={handleSaveEntity}
      />
    </div>
  );
};

export default ERDCanvas;