import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import Button from '../Common/Button';
import useProjectStore from '../../store/projectStore';

const PropertyPanel = ({ entity, onClose, onSave }) => {
  const [name, setName] = useState(entity?.data.name || '');
  const [connections, setConnections] = useState(entity?.data.connections || []);
  const isRelationship = entity?.type === 'relationship';
  
  // Get all entities and nodes from the store
  const { nodes, edges, addNode, addEdge } = useProjectStore();
  const availableEntities = nodes.filter(n => n.type === 'entity');
  
  // Get existing attribute nodes connected to this entity/relationship
  const connectedAttributeNodes = nodes.filter(node => {
    if (node.type !== 'attribute') return false;
    
    // Check if there's an edge connecting this node to our entity/relationship
    return edges.some(edge => 
      (edge.source === entity.id && edge.target === node.id) ||
      (edge.target === entity.id && edge.source === node.id)
    );
  });

  useEffect(() => {
    if (entity) {
      setName(entity.data.name || '');
      
      // If this is a relationship, initialize connections
      if (entity.type === 'relationship') {
        const existingConnections = entity.data.connections || [];
        // If no connections exist, start with two empty ones
        if (existingConnections.length === 0) {
          setConnections([
            { entityId: '', entityName: '', cardinality: '1' },
            { entityId: '', entityName: '', cardinality: '1' }
          ]);
        } else {
          setConnections(existingConnections);
        }
      }
    }
  }, [entity]);

  if (!entity) return null;

  const dataTypes = [
    'INT',
    'VARCHAR(255)',
    'TEXT',
    'DATE',
    'DATETIME',
    'BOOLEAN',
    'DECIMAL',
    'FLOAT',
  ];

  const cardinalityOptions = [
    { value: '1', label: 'חובה פעם אחת (1)', symbol: '—|' },
    { value: '0..1', label: 'לכל היותר פעם אחת (0..1)', symbol: '—○' },
    { value: 'N', label: 'רבים (N)', symbol: '—<' },
  ];

  // ============ NEW LOGIC: Create AttributeNode instead of adding to array ============
  const addAttribute = () => {
    const newAttributeId = `attr-${Date.now()}`;
    
    // Calculate position: place the attribute below the entity/relationship
    const attributePosition = {
      x: entity.position.x + Math.random() * 100 - 50, // Slight random offset
      y: entity.position.y + 150 + (connectedAttributeNodes.length * 80)
    };
    
    // Create new AttributeNode
    const newAttributeNode = {
      id: newAttributeId,
      type: 'attribute',
      position: attributePosition,
      data: {
        name: 'תכונה חדשה',
        type: 'VARCHAR(255)',
        isPrimaryKey: false,
        parentId: entity.id,
        onDelete: () => {
          // This will be set by ERDCanvas
        },
        onEdit: () => {
          // This will be set by ERDCanvas
        }
      }
    };
    
    // Create edge connecting the attribute to the entity/relationship
    const newEdge = {
      id: `e-${entity.id}-${newAttributeId}`,
      source: entity.id,
      target: newAttributeId,
      type: 'default',
      style: { stroke: '#94a3b8', strokeWidth: 1.5 },
      animated: false
    };
    
    // Add to store
    addNode(newAttributeNode);
    addEdge(newEdge);
  };

  // Delete attribute node
  const deleteAttribute = (attributeNodeId) => {
    const { deleteNode } = useProjectStore.getState();
    deleteNode(attributeNodeId);
  };

  // Update attribute node
  const updateAttribute = (attributeNodeId, field, value) => {
    const { setNodes } = useProjectStore.getState();
    const currentNodes = useProjectStore.getState().nodes;
    
    setNodes(
      currentNodes.map(node => 
        node.id === attributeNodeId
          ? {
              ...node,
              data: {
                ...node.data,
                [field]: value
              }
            }
          : node
      )
    );
  };

  // Toggle primary key
  const togglePrimaryKey = (attributeNodeId) => {
    const attributeNode = nodes.find(n => n.id === attributeNodeId);
    if (attributeNode) {
      updateAttribute(attributeNodeId, 'isPrimaryKey', !attributeNode.data.isPrimaryKey);
    }
  };

  // Functions for managing Connections (for relationships only)
  const addConnection = () => {
    setConnections([
      ...connections,
      { entityId: '', entityName: '', cardinality: '1' },
    ]);
  };

  const updateConnection = (index, field, value) => {
    const newConnections = [...connections];
    newConnections[index][field] = value;

    // If entityId is selected from dropdown, also update entityName
    if (field === 'entityId' && value) {
      const selectedEntity = availableEntities.find(e => e.id === value);
      if (selectedEntity) {
        newConnections[index].entityName = selectedEntity.data.name;
      }
    }

    setConnections(newConnections);
  };

  const deleteConnection = (index) => {
    const newConnections = connections.filter((_, i) => i !== index);
    setConnections(newConnections);
  };

  // Save changes
  const handleSave = () => {
    const updatedData = {
      name,
      ...(isRelationship && { connections }),
    };

    onSave(entity.id, updatedData);
    onClose();
  };

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${isRelationship ? 'bg-purple-600' : 'bg-primary-600'} text-white px-6 py-4 flex items-center justify-between`}>
          <h2 className="text-xl font-bold">
            {isRelationship ? 'עריכת יחס' : 'עריכת ישות'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Entity/Relationship Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isRelationship ? 'שם היחס' : 'שם הישות'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isRelationship ? 'לדוגמה: עובד_ב' : 'לדוגמה: לקוח'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Connections (for relationships only) */}
          {isRelationship && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  חיבורים לישויות
                </label>
                <Button onClick={addConnection} variant="ghost" size="sm" icon={Plus}>
                  הוסף חיבור
                </Button>
              </div>

              <div className="space-y-4">
                {connections.map((conn, index) => (
                  <div
                    key={index}
                    className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-purple-800">
                        חיבור {index + 1}
                      </span>
                      {connections.length > 2 && (
                        <button
                          onClick={() => deleteConnection(index)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Entity Selection */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        בחר ישות:
                      </label>
                      <select
                        value={conn.entityId}
                        onChange={(e) => updateConnection(index, 'entityId', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">-- בחר ישות --</option>
                        {availableEntities.map((ent) => (
                          <option key={ent.id} value={ent.id}>
                            {ent.data.name || 'ישות ללא שם'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Entity Name (manual input) */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        או הקלד שם ישות ידנית:
                      </label>
                      <input
                        type="text"
                        value={conn.entityName}
                        onChange={(e) => updateConnection(index, 'entityName', e.target.value)}
                        placeholder="שם הישות"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {/* Cardinality */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Cardinality (סימון אולמן):
                      </label>
                      <select
                        value={conn.cardinality}
                        onChange={(e) => updateConnection(index, 'cardinality', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                      >
                        {cardinalityOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.symbol} {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {connections.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                  אין חיבורים עדיין
                </div>
              )}
            </div>
          )}

          {/* Attributes - NEW: Show connected AttributeNodes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
                תכונות (Ullman Notation)
              </label>
              <Button onClick={addAttribute} variant="ghost" size="sm" icon={Plus}>
                הוסף תכונה
              </Button>
            </div>

            <div className="space-y-3">
              {connectedAttributeNodes.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                  אין תכונות עדיין - לחץ "הוסף תכונה" ליצירת אליפסה חדשה
                </div>
              ) : (
                connectedAttributeNodes.map((attrNode) => (
                  <div
                    key={attrNode.id}
                    className={`rounded-lg p-3 border space-y-2 ${
                      attrNode.data.isPrimaryKey
                        ? 'bg-yellow-50 border-yellow-300'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {/* Attribute Name */}
                    <input
                      type="text"
                      value={attrNode.data.name}
                      onChange={(e) => updateAttribute(attrNode.id, 'name', e.target.value)}
                      placeholder="שם התכונה"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                    />

                    {/* Attribute Type & Actions */}
                    <div className="flex items-center gap-2">
                      <select
                        value={attrNode.data.type}
                        onChange={(e) => updateAttribute(attrNode.id, 'type', e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                      >
                        {dataTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => togglePrimaryKey(attrNode.id)}
                        className={`p-2 rounded transition-colors ${
                          attrNode.data.isPrimaryKey
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                        }`}
                        title="מפתח ראשי"
                      >
                        🔑
                      </button>

                      <button
                        onClick={() => deleteAttribute(attrNode.id)}
                        className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                        title="מחק תכונה"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className={`${isRelationship ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4`}>
            <p className="text-sm text-gray-800">
              💡 <strong>הערה:</strong> לפי שיטת אולמן, כל תכונה מוצגת כאליפסה נפרדת המחוברת בקו ל{isRelationship ? 'יחס' : 'ישות'}.
              השינויים ישמרו אוטומטית בעת סגירת החלון.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t">
          <Button onClick={onClose} variant="ghost">
            ביטול
          </Button>
          <Button onClick={handleSave} variant="primary">
            שמור שינויים
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PropertyPanel;