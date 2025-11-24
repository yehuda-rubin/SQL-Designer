/**
 * ERD to DSD Converter - Ullman Method (UPDATED FOR ULLMAN NOTATION)
 * Converts an ERD diagram to a DSD (Database Schema Diagram) according to Ullman's method
 * ✅ NOW supports AttributeNode instances (ellipses) instead of attributes array
 */

/**
 * 🔧 NEW Helper: Get attributes from connected AttributeNodes
 * @param {Object} entity - The entity or relationship
 * @param {Array} allNodes - All nodes in the diagram
 * @param {Array} allEdges - All edges in the diagram
 * @returns {Array} - Array of attributes from connected AttributeNodes
 */
const getAttributesFromNodes = (entity, allNodes, allEdges) => {
  // Find all AttributeNodes connected to this entity/relationship
  const connectedAttributeNodeIds = allEdges
    .filter(edge => 
      edge.source === entity.id || edge.target === entity.id
    )
    .map(edge => edge.source === entity.id ? edge.target : edge.source);
  
  const attributeNodes = allNodes.filter(node => 
    node.type === 'attribute' && connectedAttributeNodeIds.includes(node.id)
  );
  
  return attributeNodes.map(node => ({
    name: node.data.name || 'unnamed',
    type: node.data.type || 'VARCHAR(255)',
    isPrimaryKey: node.data.isPrimaryKey || false
  }));
};

/**
 * 🔧 Helper function - finds the primary keys of an entity
 * @param {Object} entity - The entity
 * @param {Array} allNodes - All nodes (to find AttributeNodes)
 * @param {Array} allEdges - All edges (to find connections)
 * @returns {Array} - Array of primary keys
 */
const getPrimaryKeys = (entity, allNodes, allEdges) => {
  const attributes = getAttributesFromNodes(entity, allNodes, allEdges);
  
  const primaryKeys = attributes.filter(attr => attr.isPrimaryKey);
  
  // If no primary keys are defined, return the first column (fallback)
  if (primaryKeys.length === 0 && attributes.length > 0) {
    return [attributes[0]];
  }
  
  return primaryKeys;
};

/**
 * Determines if a Junction Table needs to be created according to Ullman's method
 * @param {Array} connections - The relationship's connections array
 * @returns {boolean} - true if a junction table is needed
 */
const needsJunctionTable = (connections) => {
  if (!connections || connections.length < 2) return false;
  
  // If there are 3+ entities - always need a junction table (n-ary relationship)
  if (connections.length > 2) return true;
  
  // Check according to the cardinality of the 2 entities
  const cardinalities = connections.map(c => c.cardinality);
  
  // N:N - needs a junction table
  if (cardinalities.includes('N') && cardinalities.filter(c => c === 'N').length >= 2) {
    return true;
  }
  
  // 1:N, 1:1, 0..1:N - no junction table needed
  return false;
};

/**
 * 🔧 Adds a Foreign Key to a table
 * Now saves the true primary keys of the referenced table
 * And groups them into one group when it's a Composite FK
 *
 * @param {Object} table - The table
 * @param {Object} referencedEntity - The referenced entity (not just a name!)
 * @param {String} cardinality - The cardinality from the relationship
 * @param {String} relationshipType - The type of relationship (1:1, 1:N, N:N)
 * @param {Array} allNodes - All nodes (for finding attributes)
 * @param {Array} allEdges - All edges (for finding connections)
 * @returns {Object} - Updated table with the FK
 */
const addForeignKeyToTable = (table, referencedEntity, cardinality, relationshipType, allNodes, allEdges) => {
  if (!table || !referencedEntity) return table;

  // Get the TRUE primary keys of the referenced entity
  const referencedPKs = getPrimaryKeys(referencedEntity, allNodes, allEdges);

  if (referencedPKs.length === 0) {
    console.warn(`Warning: Entity ${referencedEntity.data.name} has no primary keys defined`);
    return table;
  }

  // Generate a unique group ID for this FK group (if composite)
  const foreignKeyGroup = referencedPKs.length > 1 
    ? `fk_group_${referencedEntity.data.name}_${Date.now()}`
    : null;

  // Create FK columns from the referenced PKs
  const newForeignKeys = referencedPKs.map((pk, index) => ({
    name: `${referencedEntity.data.name.toLowerCase()}_${pk.name}`,
    type: pk.type,
    isPrimaryKey: false,
    isForeignKey: true,
    references: referencedEntity.data.name,
    referencedColumns: referencedPKs.map(rpk => rpk.name),
    foreignKeyGroup: foreignKeyGroup,
    foreignKeyGroupIndex: index,
    foreignKeyGroupSize: referencedPKs.length,
    isNullable: cardinality === '0..1',
    cardinality: cardinality
  }));

  return {
    ...table,
    data: {
      ...table.data,
      attributes: [...table.data.attributes, ...newForeignKeys],
    },
  };
};

/**
 * Creates a Junction Table for N:N or N-ary relationships
 * @param {Object} relationship - The relationship object
 * @param {Array} entities - Array of entities
 * @param {Array} allNodes - All nodes (for finding attributes)
 * @param {Array} allEdges - All edges (for finding connections)
 * @returns {Object} - Junction table
 */
const createJunctionTable = (relationship, entities, allNodes, allEdges) => {
  const { connections = [], name: relationshipName } = relationship.data;

  // Create table name from relationship name
  const tableName = relationshipName || 'junction_table';

  // Find the connected entities
  const connectedEntities = connections
    .map(conn => {
      return entities.find(e => 
        e.id === conn.entityId || 
        e.data.name === conn.entityName
      );
    })
    .filter(e => e !== undefined);

  if (connectedEntities.length < 2) {
    console.warn(`Junction table creation failed: not enough entities connected`);
    return null;
  }

  // Collect all primary keys from connected entities
  let junctionAttributes = [];
  let junctionPrimaryKeys = [];

  connectedEntities.forEach(entity => {
    const entityPKs = getPrimaryKeys(entity, allNodes, allEdges);
    
    const foreignKeyGroup = entityPKs.length > 1 
      ? `fk_group_${entity.data.name}_${Date.now()}`
      : null;

    entityPKs.forEach((pk, index) => {
      const fkColumnName = `${entity.data.name.toLowerCase()}_${pk.name}`;
      
      junctionAttributes.push({
        name: fkColumnName,
        type: pk.type,
        isPrimaryKey: true,
        isForeignKey: true,
        references: entity.data.name,
        referencedColumns: entityPKs.map(rpk => rpk.name),
        foreignKeyGroup: foreignKeyGroup,
        foreignKeyGroupIndex: index,
        foreignKeyGroupSize: entityPKs.length,
        isNullable: false
      });
      
      junctionPrimaryKeys.push(fkColumnName);
    });
  });

  // Add relationship attributes (from AttributeNodes connected to the relationship)
  const relationshipAttributes = getAttributesFromNodes(relationship, allNodes, allEdges);
  relationshipAttributes.forEach(attr => {
    if (!attr.isPrimaryKey) {
      junctionAttributes.push({
        ...attr,
        isPrimaryKey: false,
        isForeignKey: false,
      });
    }
  });

  return {
    id: `junction-${relationship.id}`,
    type: 'table',
    data: {
      name: tableName,
      attributes: junctionAttributes,
      primaryKeys: junctionPrimaryKeys,
      isJunctionTable: true,
      sourceRelationship: relationship.id,
    },
  };
};

/**
 * Converts an entity to a table
 * @param {Object} entity - Entity object
 * @param {Array} allNodes - All nodes (for finding attributes)
 * @param {Array} allEdges - All edges (for finding connections)
 * @returns {Object} - Table object
 */
const entityToTable = (entity, allNodes, allEdges) => {
  const { name } = entity.data;
  
  // Get attributes from connected AttributeNodes
  const attributes = getAttributesFromNodes(entity, allNodes, allEdges);

  return {
    id: entity.id,
    type: 'table',
    data: {
      name: name || 'unnamed_table',
      attributes: attributes.length > 0 ? attributes : [],
      primaryKeys: attributes.filter(a => a.isPrimaryKey).map(a => a.name),
    },
  };
};

/**
 * Handles 1:N or 1:1 relationships - adds FK to the appropriate table
 * @param {Object} relationship - The relationship
 * @param {Array} tables - Current array of tables
 * @param {Array} entities - Array of entities
 * @param {Array} allNodes - All nodes
 * @param {Array} allEdges - All edges
 * @returns {Array} - Updated array of tables
 */
const handleOneToManyOrOneToOne = (relationship, tables, entities, allNodes, allEdges) => {
  const { connections = [] } = relationship.data;

  if (connections.length < 2) return tables;

  const conn1 = connections[0];
  const conn2 = connections[1];

  // Determine relationship type
  const relationshipType = conn1.cardinality === '1' && conn2.cardinality === '1'
    ? '1:1' : '1:N';

  // Determine which side gets the FK
  let sourceTable, targetEntity, targetCardinality;

  if (conn1.cardinality === 'N' || conn1.cardinality === '0..1') {
    // conn1 is on the 'Many' or optional side - it gets the FK
    sourceTable = tables.find(t =>
      t.id === conn1.entityId ||
      t.data.name === conn1.entityName
    );
    targetEntity = entities.find(e =>
      e.id === conn2.entityId ||
      e.data.name === conn2.entityName
    );
    targetCardinality = conn1.cardinality;
  } else {
    // conn2 is on the 'Many' or optional side - it gets the FK
    sourceTable = tables.find(t =>
      t.id === conn2.entityId ||
      t.data.name === conn2.entityName
    );
    targetEntity = entities.find(e =>
      e.id === conn1.entityId ||
      e.data.name === conn1.entityName
    );
    targetCardinality = conn2.cardinality;
  }

  if (!sourceTable || !targetEntity) return tables;

  // Add the FK
  const updatedSourceTable = addForeignKeyToTable(
    sourceTable,
    targetEntity,
    targetCardinality,
    relationshipType,
    allNodes,
    allEdges
  );

  // Return the updated array
  return tables.map(t =>
    t.id === updatedSourceTable.id ? updatedSourceTable : t
  );
};

/**
 * Main conversion from ERD to DSD (UPDATED)
 * @param {Array} nodes - Array of nodes (entities + relationships + attributes)
 * @param {Array} edges - Array of edges
 * @returns {Object} - { tables, relationships }
 */
export const convertERDtoDSD = (nodes, edges) => {
  const entities = nodes.filter(n => n.type === 'entity');
  const relationships = nodes.filter(n => n.type === 'relationship');
  
  // Step 1: Convert all entities to tables (with attributes from AttributeNodes)
  let tables = entities.map(entity => entityToTable(entity, nodes, edges));
  
  // Step 2: Process all relationships
  const junctionTables = [];
  
  relationships.forEach(rel => {
    const { connections = [] } = rel.data;
    
    if (needsJunctionTable(connections)) {
      // Create junction table
      const junctionTable = createJunctionTable(rel, entities, nodes, edges);
      if (junctionTable) {
        junctionTables.push(junctionTable);
      }
    } else {
      // Add FK to the appropriate table
      tables = handleOneToManyOrOneToOne(rel, tables, entities, nodes, edges);
    }
  });
  
  // Step 3: Combine all tables
  const allTables = [...tables, ...junctionTables];
  
  // Step 4: Create relationships (edges) between tables based on FKs
  const dsdRelationships = [];

  allTables.forEach(table => {
    const foreignKeys = table.data.attributes.filter(attr => attr.isForeignKey);

    // Group FKs by foreignKeyGroup to create one relationship per group
    const processedGroups = new Set();

    foreignKeys.forEach(fk => {
      const targetTable = allTables.find(t => t.data.name === fk.references);
      if (!targetTable) return;

      // If there is a foreignKeyGroup, check if we've already processed this group
      if (fk.foreignKeyGroup) {
        if (processedGroups.has(fk.foreignKeyGroup)) {
          return; // We already created an edge for this group
        }
        processedGroups.add(fk.foreignKeyGroup);

        // Find all FKs in the group
        const groupFks = foreignKeys.filter(f => f.foreignKeyGroup === fk.foreignKeyGroup);
        const sortedGroupFks = groupFks.sort((a, b) =>
          (a.foreignKeyGroupIndex || 0) - (b.foreignKeyGroupIndex || 0)
        );

        // Create one edge for the whole group
        dsdRelationships.push({
          id: `fk_${table.id}_${targetTable.id}_${fk.foreignKeyGroup}`,
          type: 'foreignKey',
          source: table.id,
          target: targetTable.id,
          data: {
            foreignKeyGroup: fk.foreignKeyGroup,
            foreignKeyNames: sortedGroupFks.map(f => f.name),
            referencedColumns: fk.referencedColumns || [],
            isNullable: fk.isNullable || false,
            isComposite: groupFks.length > 1
          }
        });
      } else {
        // Old FK without a group - create a single edge
        dsdRelationships.push({
          id: `fk_${table.id}_${targetTable.id}_${fk.name}`,
          type: 'foreignKey',
          source: table.id,
          target: targetTable.id,
          data: {
            foreignKeyName: fk.name,
            referencedColumns: fk.referencedColumns || [],
            isNullable: fk.isNullable || false,
            isComposite: false
          }
        });
      }
    });
  });
  
  return {
    tables: allTables,
    relationships: dsdRelationships
  };
};

/**
 * Export the diagram to JSON format for download
 * @param {Array} nodes - Array of nodes
 * @param {Array} edges - Array of edges
 * @returns {String} - JSON string
 */
export const exportDSDtoJSON = (nodes, edges) => {
  const dsd = convertERDtoDSD(nodes, edges);
  return JSON.stringify(dsd, null, 2);
};