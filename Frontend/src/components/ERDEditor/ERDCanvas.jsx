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
import AttributeNode from './AttributeNode';
import CustomEdge from './CustomEdge';
import PropertyPanel from './PropertyPanel';
import EdgeEditModal from './EdgeEditModal';
import useProjectStore from '../../store/projectStore';

// ============ UPDATED: Added 'attribute' node type ============
const nodeTypes = {
  entity: EntityNode,
  relationship: RelationshipNode,
  attribute: AttributeNode, // NEW
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
        alert('לא ניתן לחבר יחס ליחס אחר!');
        return false;
      }

      // ============ NEW: Allow attribute-to-entity/relationship connections ============
      // Attributes can only connect to entities or relationships
      if (sourceNode?.type === 'attribute' || targetNode?.type === 'attribute') {
        const nonAttributeNode = sourceNode?.type === 'attribute' ? targetNode : sourceNode;
        if (nonAttributeNode?.type !== 'entity' && nonAttributeNode?.type !== 'relationship') {
          alert('תכונות יכולות להתחבר רק לישויות או יחסים!');
          return false;
        }
      }

      return true;
    },
    [nodes]
  );

  // Manual edge creation
  const onConnect = useCallback(
    (params) => {
      if (!isValidConnection(params)) {
        return;
      }

      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);

      // ============ NEW: Handle attribute connections ============
      if (sourceNode?.type === 'attribute' || targetNode?.type === 'attribute') {
        // Create simple edge for attribute connections
        const newEdge = {
          ...params,
          id: `e${params.source}-${params.target}-${Date.now()}`,
          type: 'default',
          style: { stroke: '#94a3b8', strokeWidth: 1.5 },
          animated: false,
        };
        setEdges((eds) => addEdge(newEdge, eds));
        setStoreEdges([...edges, newEdge]);
        return;
      }

      // Prevent manual edge creation if source or target is a relationship
      if (sourceNode?.type === 'relationship' || targetNode?.type === 'relationship') {
        alert('יחסים מנוהלים רק דרך פאנל המאפיינים!');
        return;
      }

      // Regular entity-to-entity connection
      const newEdge = {
        ...params,
        id: `e${params.source}-${params.target}-${Date.now()}`,
        type: 'custom',
        data: {
          cardinality: '1',
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
    // ============ NEW: Attributes open their parent entity/relationship panel ============
    if (node.type === 'attribute') {
      const parentNode = nodes.find(n => n.id === node.data.parentId);
      if (parentNode) {
        setSelectedEntity(parentNode);
      } else {
        setSelectedEntity(node);
      }
    } else {
      setSelectedEntity(node);
    }
    setSelectedEdge(null);
  }, [nodes]);

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
        // Remove old edges of that relationship (but keep attribute edges)
        const edgesWithoutRelationship = edges.filter(
          (edge) => {
            // Keep attribute edges
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            if (sourceNode?.type === 'attribute' || targetNode?.type === 'attribute') {
              return true;
            }
            
            // Remove relationship edges
            return edge.source !== nodeId && edge.target !== nodeId;
          }
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
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...data,
              },
            }
          : node
      );
      setStoreNodes(updatedNodes);
    },
    [nodes, edges, setNodes, setEdges, setStoreEdges, setStoreNodes, createEdgesFromRelationship]
  );

  // Save edge changes
  const handleSaveEdge = useCallback(
    (edgeId, newData) => {
      setEdges((eds) =>
        eds.map((edge) =>
          edge.id === edgeId
            ? {
                ...edge,
                data: {
                  ...edge.data,
                  ...newData,
                },
              }
            : edge
        )
      );
      
      const updatedEdges = edges.map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              data: {
                ...edge.data,
                ...newData,
              },
            }
          : edge
      );
      setStoreEdges(updatedEdges);
    },
    [edges, setEdges, setStoreEdges]
  );

  // ============ UPDATED: Assign callbacks to all node types including attributes ============
  const nodesWithCallbacks = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onDelete: () => deleteNode(node.id),
      onEdit: () => {
        if (node.type === 'attribute') {
          // For attributes, open their parent's panel
          const parentNode = nodes.find(n => n.id === node.data.parentId);
          if (parentNode) {
            setSelectedEntity(parentNode);
          }
        } else {
          setSelectedEntity(node);
        }
      },
    },
  }));

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodesWithCallbacks}
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
        fitView
        attributionPosition="bottom-left"
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'entity':
                return '#3b82f6';
              case 'relationship':
                return '#9333ea';
              case 'attribute':
                return node.data.isPrimaryKey ? '#eab308' : '#94a3b8';
              default:
                return '#6b7280';
            }
          }}
        />
      </ReactFlow>

      {/* Property Panel */}
      {selectedEntity && (
        <PropertyPanel
          entity={selectedEntity}
          onClose={() => setSelectedEntity(null)}
          onSave={handleSaveEntity}
        />
      )}

      {/* Edge Edit Modal */}
      {selectedEdge && selectedEdge.type === 'custom' && (
        <EdgeEditModal
          edge={selectedEdge}
          onClose={() => setSelectedEdge(null)}
          onSave={handleSaveEdge}
        />
      )}
    </div>
  );
};

export default ERDCanvas;