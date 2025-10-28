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

  // Sync store with canvas
  useEffect(() => {
    setNodes(storeNodes);
  }, [storeNodes, setNodes]);

  useEffect(() => {
    setEdges(storeEdges);
  }, [storeEdges, setEdges]);

  // Update store when nodes/edges change
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

  // Automatically create edges from relationship connections
  const createEdgesFromRelationship = useCallback(
    (relationshipId, connections) => {
      const newEdges = [];
      
      connections.forEach((conn, index) => {
        if (conn.entityId || conn.entityName) {
          const targetId = conn.entityId || conn.entityName;
          
          const newEdge = {
            id: `e-${relationshipId}-${targetId}-${index}-${Date.now()}`,
            source: relationshipId,
            target: targetId,
            type: 'custom',
            data: {
              cardinality: conn.cardinality || '1',
              label: '',
            },
            animated: false,
            style: { strokeWidth: 2 },
          };
          
          newEdges.push(newEdge);
        }
      });
      
      return newEdges;
    },
    []
  );

  // Validate connection (relationship cannot connect to another relationship)
  const isValidConnection = useCallback(
    (connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      // Prevent relationship-to-relationship connection
      if (sourceNode?.type === 'relationship' && targetNode?.type === 'relationship') {
        alert('You cannot connect one relationship to another!');
        return false;
      }

      return true;
    },
    [nodes]
  );

  // Manual edge creation (only between entities)
  const onConnect = useCallback(
    (params) => {
      if (!isValidConnection(params)) {
        return;
      }

      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);

      // Prevent manual edge creation if source or target is a relationship
      if (sourceNode?.type === 'relationship' || targetNode?.type === 'relationship') {
        alert('Relationships are managed only via the PropertyPanel!');
        return;
      }

      const newEdge = {
        ...params,
        id: `e${params.source}-${params.target}-${Date.now()}`,
        type: 'custom',
        data: {
          cardinality: '1', // default value
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
    [edges, setEdges, setStoreEdges, isValidConnection, nodes]
  );

  // Canvas click
  const onPaneClick = useCallback(() => {
    setSelectedEntity(null);
    setSelectedEdge(null);
  }, []);

  // Node click
  const onNodeClick = useCallback((event, node) => {
    setSelectedEntity(node);
    setSelectedEdge(null);
  }, []);

  // Node double-click
  const onNodeDoubleClick = useCallback((event, node) => {
    setSelectedEntity(node);
    setSelectedEdge(null);
  }, []);

  // Edge click
  const onEdgeClick = useCallback((event, edge) => {
    setSelectedEdge(edge);
    setSelectedEntity(null);
  }, []);

  // Save entity/relationship changes
  const handleSaveEntity = useCallback(
    (nodeId, data) => {
      const node = nodes.find(n => n.id === nodeId);
      
      // Update node data
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
      
      // If it's a relationship with connections, generate edges automatically
      if (node?.type === 'relationship' && data.connections) {
        // Remove old edges of that relationship
        const edgesWithoutRelationship = edges.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId
        );
        
        // Create new edges
        const newEdges = createEdgesFromRelationship(nodeId, data.connections);
        
        // Update edges
        const allEdges = [...edgesWithoutRelationship, ...newEdges];
        setEdges(allEdges);
        setStoreEdges(allEdges);
      }
      
      // Update store
      const updatedNodes = nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      );
      setStoreNodes(updatedNodes);
      setSelectedEntity(null);
    },
    [nodes, edges, setNodes, setEdges, setStoreNodes, setStoreEdges, createEdgesFromRelationship]
  );

  // Save edge updates (cardinality/label)
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

  // Delete entity/relationship
  const handleDeleteEntity = useCallback(
    (nodeId) => {
      const node = nodes.find((n) => n.id === nodeId);
      const typeName = node?.type === 'relationship' ? 'relationship' : 'entity';
      
      if (window.confirm(`Are you sure you want to delete this ${typeName}?`)) {
        deleteNode(nodeId);
        setNodes((nds) => nds.filter((node) => node.id !== nodeId));
        setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
        setSelectedEntity(null);
      }
    },
    [nodes, deleteNode, setNodes, setEdges]
  );

  // Add onDelete and onEdit actions to each node
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
          if (window.confirm('Are you sure you want to delete this relationship?')) {
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
