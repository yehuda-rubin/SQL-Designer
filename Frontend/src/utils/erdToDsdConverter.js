/**
 * ERD to DSD Converter - Ullman Method (FIXED VERSION)
 * Converts an ERD diagram to a DSD (Database Schema Diagram) according to Ullman's method
 * * ✅ Critical Fix: Preserves the true primary keys of the parent tables
 */

/**
 * 🔧 New helper function - finds the primary keys of an entity
 * @param {Object} entity - The entity
 * @returns {Array} - Array of primary keys
 */
const getPrimaryKeys = (entity) => {
  if (!entity || !entity.data || !entity.data.attributes) {
    return [];
  }
  
  const primaryKeys = entity.data.attributes.filter(attr => attr.isPrimaryKey);
  
  // If no primary keys are defined, return the first column (fallback)
  if (primaryKeys.length === 0 && entity.data.attributes.length > 0) {
    return [entity.data.attributes[0]];
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
 * 🔧 Adds a Foreign Key to a table - fixed!
 * Now saves the true primary keys of the referenced table
 * And groups them into one group when it's a Composite FK
 *
 * @param {Object} table - The table
 * @param {Object} referencedEntity - The referenced entity (not just a name!)
 * @param {String} cardinality - The connection's cardinality
 * @param {String} relationshipType - The relationship type ('1:1' or '1:N')
 * @returns {Object} - The updated table
 */
const addForeignKeyToTable = (table, referencedEntity, cardinality, relationshipType = '1:N') => {
  if (!referencedEntity) return table;

  const referencedTableName = referencedEntity.data.name;

  // 🔧 Find the true primary keys of the referenced table
  let referencedPrimaryKeys = getPrimaryKeys(referencedEntity);

  // 🔧 Handle table with no defined primary key - uses the first attribute
  if (referencedPrimaryKeys.length === 0) {
    console.warn(`⚠️ אין מפתחות ראשיים ב-${referencedTableName} - משתמש בתכונה הראשונה`);
    const attributes = referencedEntity.data.attributes || [];
    if (attributes.length === 0) {
      console.error(`❌ אין תכונות ב-${referencedTableName}`);
      return table;
    }
    // Takes only the first attribute
    referencedPrimaryKeys = [attributes[0]];
  }

  // 🔧 Create a unique ID for the FK group (for handling Composite FK)
  const fkGroupId = `fk_${table.data.name}_${referencedTableName}_${Date.now()}`.toLowerCase();

  // 🔧 Check if an FK to this table already exists
  const existingFKGroup = table.data.attributes.find(attr =>
    attr.isForeignKey && attr.references === referencedTableName
  );

  if (existingFKGroup) {
    console.warn(`⚠️ כבר קיים FK ל-${referencedTableName} בטבלה ${table.data.name}`);
    return table;
  }

  // 🔧 Create an FK for each PK column in the parent table - as a unified group
  const newForeignKeys = referencedPrimaryKeys.map((pkAttr, index) => {
    const fkName = `${referencedTableName.toLowerCase()}_${pkAttr.name.toLowerCase()}`;

    return {
      name: fkName,
      type: pkAttr.type, // 🔧 Use the true type of the primary key!
      isForeignKey: true,
      references: referencedTableName,
      referencedColumns: referencedPrimaryKeys.map(pk => pk.name), // 🔧 All FKs get all the referenced columns!
      foreignKeyGroup: fkGroupId, // 🔧 FK group ID to link the columns
      foreignKeyGroupIndex: index, // 🔧 Column's position in the group
      foreignKeyGroupSize: referencedPrimaryKeys.length, // 🔧 Group size
      cardinality: cardinality, // 🔧 Save the original cardinality
      relationshipType: relationshipType, // 🔧 Save the relationship type (1:1 or 1:N)
      isPrimaryKey: false,
      isNullable: cardinality === '0..1' // If optional
    };
  });

  return {
    ...table,
    data: {
      ...table.data,
      attributes: [...table.data.attributes, ...newForeignKeys]
    }
  };
};

/**
 * 🔧 Creates a Junction Table from a relationship - fixed!
 * Now saves precise primary keys from all entities
 * And groups FKs into groups according to the original entity
 *
 * @param {Object} relationship - The relationship object
 * @param {Array} entities - The entities array
 * @returns {Object} - The new table object
 */
const createJunctionTable = (relationship, entities) => {
  const { id, data } = relationship;
  const { name, connections = [], attributes = [] } = data;

  // Table name
  const tableName = name || `Junction_${id}`;

  // 🔧 Create Foreign Keys for each connected entity - with precise primary keys
  const foreignKeys = [];
  const primaryKeyColumns = []; // For creating a Composite PK

  connections
    .filter(conn => conn.entityId || conn.entityName)
    .forEach(conn => {
      const entity = entities.find(e =>
        e.id === conn.entityId ||
        e.data.name === conn.entityName
      );

      if (!entity) {
        console.warn(`⚠️ לא נמצאה ישות עבור ${conn.entityName || conn.entityId}`);
        return;
      }

      const entityName = entity.data.name;
      const primaryKeys = getPrimaryKeys(entity);

      // 🔧 Create a unique ID for the FK group for this entity
      const fkGroupId = `fk_${tableName}_${entityName}_${Date.now()}`.toLowerCase();

      // Create an FK for each of the entity's PKs - as a unified group
      primaryKeys.forEach((pkAttr, index) => {
        const fkName = `${entityName.toLowerCase()}_${pkAttr.name.toLowerCase()}`;

        foreignKeys.push({
          name: fkName,
          type: pkAttr.type, // 🔧 True type
          isForeignKey: true,
          references: entityName,
          referencedColumns: primaryKeys.map(pk => pk.name), // 🔧 All FKs get all the referenced columns!
          foreignKeyGroup: fkGroupId, // 🔧 FK group ID
          foreignKeyGroupIndex: index, // 🔧 Position in group
          foreignKeyGroupSize: primaryKeys.length, // 🔧 Group size
          cardinality: conn.cardinality || 'N', // 🔧 Save the cardinality (usually 'N' in a junction table)
          isPrimaryKey: true // Part of the Composite Primary Key of the junction table
        });

        primaryKeyColumns.push(fkName);
      });
    });

  // Add the relationship's attributes as regular columns
  const relationshipAttributes = attributes.map(attr => ({
    ...attr,
    isPrimaryKey: false,
    isForeignKey: false
  }));

  return {
    id: `table_${id}`,
    type: 'table',
    data: {
      name: tableName,
      attributes: [...foreignKeys, ...relationshipAttributes],
      isJunctionTable: true,
      originalRelationship: id,
      primaryKeyColumns // Save the PK list for use in the SQL Generator
    },
    position: relationship.position
  };
};

/**
 * Converts an entity to a table
 * @param {Object} entity - The entity object
 * @returns {Object} - The table object
 */
const entityToTable = (entity) => {
  return {
    id: entity.id,
    type: 'table',
    data: {
      name: entity.data.name,
      attributes: entity.data.attributes || [],
      isJunctionTable: false
    },
    position: entity.position
  };
};

/**
 * Handles a 1:N or 1:1 relationship - adds FK to the appropriate side
 * @param {Object} relationship - The relationship
 * @param {Array} tables - The tables array
 * @param {Array} entities - The entities array
 * @returns {Array} - The updated tables array
 */
const handleOneToManyOrOneToOne = (relationship, tables, entities) => {
  const { connections = [] } = relationship.data;

  if (connections.length !== 2) return tables;

  const [conn1, conn2] = connections;

  // 🔧 Identify relationship type: 1:1 or 1:N
  const isOneToOne =
    (conn1.cardinality === '1' || conn1.cardinality === '0..1') &&
    (conn2.cardinality === '1' || conn2.cardinality === '0..1');

  const relationshipType = isOneToOne ? '1:1' : '1:N';

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

  // 🔧 Add the FK - now also passes the relationship type
  const updatedSourceTable = addForeignKeyToTable(
    sourceTable,
    targetEntity, // 🔧 Passes the whole entity!
    targetCardinality,
    relationshipType // 🔧 Passes the relationship type
  );

  // Return the updated array
  return tables.map(t =>
    t.id === updatedSourceTable.id ? updatedSourceTable : t
  );
};

/**
 * Main conversion from ERD to DSD
 * @param {Array} nodes - Array of nodes (entities + relationships)
 * @returns {Object} - { tables, relationships }
 */
export const convertERDtoDSD = (nodes) => {
  const entities = nodes.filter(n => n.type === 'entity');
  const relationships = nodes.filter(n => n.type === 'relationship');
  
  // Step 1: Convert all entities to tables
  let tables = entities.map(entityToTable);
  
  // Step 2: Process all relationships
  const junctionTables = [];
  
  relationships.forEach(rel => {
    const { connections = [] } = rel.data;
    
    if (needsJunctionTable(connections)) {
      // Create junction table
      const junctionTable = createJunctionTable(rel, entities);
      junctionTables.push(junctionTable);
    } else {
      // Add FK to the appropriate table
      tables = handleOneToManyOrOneToOne(rel, tables, entities);
    }
  });
  
  // Step 3: Combine all tables
  const allTables = [...tables, ...junctionTables];
  
  // Step 4: Create relationships (edges) between tables based on FKs
  const dsdRelationships = [];

  allTables.forEach(table => {
    const foreignKeys = table.data.attributes.filter(attr => attr.isForeignKey);

    // 🔧 Group FKs by foreignKeyGroup to create one relationship per group
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
            foreignKeyNames: sortedGroupFks.map(f => f.name), // 🔧 All column names
            referencedColumns: fk.referencedColumns || [], // 🔧 Save the referenced columns
            isNullable: fk.isNullable || false,
            isComposite: groupFks.length > 1 // 🔧 Mark as composite FK
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
 * @returns {String} - JSON string
 */
export const exportDSDtoJSON = (nodes) => {
  const dsd = convertERDtoDSD(nodes);
  return JSON.stringify(dsd, null, 2);
};
