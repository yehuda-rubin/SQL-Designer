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
import RelationshipNode from './RelationshipNode';
import CustomEdge from './CustomEdge';
import PropertyPanel from './PropertyPanel';
import EdgeEditModal from './EdgeEditModal';
import useProjectStore from '../../store/projectStore';

const nodeTypes = {
  entity: EntityNode,
  relationship: RelationshipNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

const ERDCanvas = () => {
  const { nodes: storeNodes, edges: storeEdges, setNodes: setStoreNodes, setEdges: setStoreEdges, deleteNode } = useProjectStore();
  
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);

  // ✅ סנכרון בין store ל-Canvas
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

  // בדיקה אם חיבור מותר (קשר לא יכול להתחבר לקשר אחר)
  const isValidConnection = useCallback(
    (connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      // אם שני הצדדים הם קשרים - לא מותר
      if (sourceNode?.type === 'relationship' && targetNode?.type === 'relationship') {
        alert('לא ניתן לחבר קשר לקשר אחר!');
        return false;
      }

      return true;
    },
    [nodes]
  );

  // חיבור בין ישויות/קשרים (יצירת edge)
  const onConnect = useCallback(
    (params) => {
      if (!isValidConnection(params)) {
        return;
      }

      const newEdge = {
        ...params,
        id: `e${params.source}-${params.target}-${Date.now()}`,
        type: 'custom',
        data: {
          cardinality: 'optional', // ברירת מחדל: 0..1 (חץ רגיל)
          label: '1:N',
        },
        animated: true,
        style: { strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
      setStoreEdges([...edges, newEdge]);
    },
    [edges, setEdges, setStoreEdges, isValidConnection]
  );

  // לחיצה על הקנבס
  const onPaneClick = useCallback(() => {
    setSelectedEntity(null);
    setSelectedEdge(null);
  }, []);

  // לחיצה על node
  const onNodeClick = useCallback((event, node) => {
    setSelectedEntity(node);
    setSelectedEdge(null);
  }, []);

  // לחיצה כפולה על node
  const onNodeDoubleClick = useCallback((event, node) => {
    setSelectedEntity(node);
    setSelectedEdge(null);
  }, []);

  // לחיצה על edge
  const onEdgeClick = useCallback((event, edge) => {
    setSelectedEdge(edge);
    setSelectedEntity(null);
  }, []);

  // שמירת שינויים בישות/קשר
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

  // עדכון edge (cardinality ו-label)
  const handleSaveEdge = useCallback(
    (edgeId, data) => {
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id === edgeId) {
            return {
              ...edge,
              data: {
                ...edge.data,
                ...data,
              },
            };
          }
          return edge;
        })
      );

      const updatedEdges = edges.map((edge) =>
        edge.id === edgeId ? { ...edge, data: { ...edge.data, ...data } } : edge
      );
      setStoreEdges(updatedEdges);
      setSelectedEdge(null);
    },
    [edges, setEdges, setStoreEdges]
  );

  // מחיקת ישות/קשר
  const handleDeleteEntity = useCallback(
    (nodeId) => {
      const node = nodes.find((n) => n.id === nodeId);
      const typeName = node?.type === 'relationship' ? 'קשר' : 'ישות';
      
      if (window.confirm(`האם אתה בטוח שברצונך למחוק ${typeName} זה?`)) {
        deleteNode(nodeId);
        setNodes((nds) => nds.filter((node) => node.id !== nodeId));
        setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
        setSelectedEntity(null);
      }
    },
    [nodes, deleteNode, setNodes, setEdges]
  );

  // הוספת onDelete ו-onEdit לכל node
  const nodesWithActions = nodes.map((node) => ({
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
        nodes={nodesWithActions}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        isValidConnection={isValidConnection}
        fitView
        attributionPosition="bottom-left"
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            return node.type === 'relationship' ? '#9333ea' : '#3b82f6';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>

      {/* Property Panel for Entity/Relationship */}
      <PropertyPanel
        entity={selectedEntity}
        onClose={() => setSelectedEntity(null)}
        onSave={handleSaveEntity}
      />

      {/* Edge Edit Modal */}
      <EdgeEditModal
        edge={selectedEdge}
        onClose={() => setSelectedEdge(null)}
        onSave={handleSaveEdge}
        onDelete={(edgeId) => {
          if (window.confirm('האם אתה בטוח שברצונך למחוק קשר זה?')) {
            setEdges((eds) => eds.filter((e) => e.id !== edgeId));
            setStoreEdges(edges.filter((e) => e.id !== edgeId));
            setSelectedEdge(null);
          }
        }}
      />
    </div>
  );
};

export default ERDCanvas;