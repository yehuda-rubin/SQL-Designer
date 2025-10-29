/**
 * ERD to DSD Converter - Ullman Method
 * ממיר תרשים ERD לתרשים DSD (Database Schema Diagram) לפי שיטת אולמן
 */

/**
 * קובע האם צריך ליצור טבלת חיבור (Junction Table) לפי שיטת אולמן
 * @param {Array} connections - מערך החיבורים של הקשר
 * @returns {boolean} - true אם צריך טבלת חיבור
 */
const needsJunctionTable = (connections) => {
  if (!connections || connections.length < 2) return false;
  
  // אם יש 3+ ישויות - תמיד צריך טבלת חיבור (n-ary relationship)
  if (connections.length > 2) return true;
  
  // בדיקה לפי cardinality של 2 הישויות
  const cardinalities = connections.map(c => c.cardinality);
  
  // N:N - צריך טבלת חיבור
  if (cardinalities.includes('N') && cardinalities.filter(c => c === 'N').length >= 2) {
    return true;
  }
  
  // 1:N, 1:1, 0..1:N - לא צריך טבלת חיבור
  return false;
};

/**
 * יוצר טבלת חיבור (Junction Table) מקשר
 * @param {Object} relationship - אובייקט הקשר
 * @param {Array} entities - מערך הישויות
 * @returns {Object} - אובייקט הטבלה החדשה
 */
const createJunctionTable = (relationship, entities) => {
  const { id, data } = relationship;
  const { name, connections = [], attributes = [] } = data;
  
  // שם הטבלה
  const tableName = name || `Junction_${id}`;
  
  // יצירת Foreign Keys לכל ישות מחוברת
  const foreignKeys = connections
    .filter(conn => conn.entityId || conn.entityName)
    .map(conn => {
      const entityName = conn.entityName || 
        entities.find(e => e.id === conn.entityId)?.data.name || 
        'Unknown';
      
      return {
        name: `${entityName.toLowerCase()}_id`,
        type: 'INT',
        isForeignKey: true,
        references: entityName,
        isPrimaryKey: true // חלק מה-Composite Primary Key
      };
    });
  
  // הוספת תכונות הקשר כעמודות רגילות
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
      originalRelationship: id
    },
    position: relationship.position
  };
};

/**
 * ממיר ישות ל-טבלה
 * @param {Object} entity - אובייקט הישות
 * @returns {Object} - אובייקט הטבלה
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
 * מוסיף Foreign Key לטבלה
 * @param {Object} table - הטבלה
 * @param {String} referencedTable - שם הטבלה המוזכרת
 * @param {String} cardinality - cardinality של החיבור
 * @returns {Object} - הטבלה המעודכנת
 */
const addForeignKeyToTable = (table, referencedTable, cardinality) => {
  const fkName = `${referencedTable.toLowerCase()}_id`;
  
  // בדיקה אם ה-FK כבר קיים
  const existingFK = table.data.attributes.find(attr => attr.name === fkName);
  if (existingFK) return table;
  
  const foreignKey = {
    name: fkName,
    type: 'INT',
    isForeignKey: true,
    references: referencedTable,
    isPrimaryKey: false,
    isNullable: cardinality === '0..1' // אם אופציונלי
  };
  
  return {
    ...table,
    data: {
      ...table.data,
      attributes: [...table.data.attributes, foreignKey]
    }
  };
};

/**
 * מטפל בקשר 1:N או 1:1 - מוסיף FK לצד המתאים
 * @param {Object} relationship - הקשר
 * @param {Array} tables - מערך הטבלאות
 * @param {Array} entities - מערך הישויות
 * @returns {Array} - מערך הטבלאות המעודכן
 */
const handleOneToManyOrOneToOne = (relationship, tables, entities) => {
  const { connections = [] } = relationship.data;
  
  if (connections.length !== 2) return tables;
  
  const [conn1, conn2] = connections;
  
  // קביעת איזה צד מקבל את ה-FK
  let sourceTable, targetTable, targetCardinality;
  
  if (conn1.cardinality === 'N' || conn1.cardinality === '0..1') {
    // conn1 בצד ה-Many או האופציונלי - הוא מקבל את ה-FK
    sourceTable = tables.find(t => 
      t.id === conn1.entityId || 
      t.data.name === conn1.entityName
    );
    targetTable = tables.find(t => 
      t.id === conn2.entityId || 
      t.data.name === conn2.entityName
    );
    targetCardinality = conn1.cardinality;
  } else {
    // conn2 בצד ה-Many או האופציונלי - הוא מקבל את ה-FK
    sourceTable = tables.find(t => 
      t.id === conn2.entityId || 
      t.data.name === conn2.entityName
    );
    targetTable = tables.find(t => 
      t.id === conn1.entityId || 
      t.data.name === conn1.entityName
    );
    targetCardinality = conn2.cardinality;
  }
  
  if (!sourceTable || !targetTable) return tables;
  
  // הוספת ה-FK
  const updatedSourceTable = addForeignKeyToTable(
    sourceTable, 
    targetTable.data.name,
    targetCardinality
  );
  
  // החזרת המערך המעודכן
  return tables.map(t => 
    t.id === updatedSourceTable.id ? updatedSourceTable : t
  );
};

/**
 * המרה ראשית מ-ERD ל-DSD
 * @param {Array} nodes - מערך של nodes (entities + relationships)
 * @returns {Object} - { tables, relationships }
 */
export const convertERDtoDSD = (nodes) => {
  const entities = nodes.filter(n => n.type === 'entity');
  const relationships = nodes.filter(n => n.type === 'relationship');
  
  // שלב 1: המרת כל הישויות לטבלאות
  let tables = entities.map(entityToTable);
  
  // שלב 2: עיבוד כל הקשרים
  const junctionTables = [];
  
  relationships.forEach(rel => {
    const { connections = [] } = rel.data;
    
    if (needsJunctionTable(connections)) {
      // יצירת טבלת חיבור
      const junctionTable = createJunctionTable(rel, entities);
      junctionTables.push(junctionTable);
    } else {
      // הוספת FK לטבלה המתאימה
      tables = handleOneToManyOrOneToOne(rel, tables, entities);
    }
  });
  
  // שלב 3: איחוד כל הטבלאות
  const allTables = [...tables, ...junctionTables];
  
  // שלב 4: יצירת קשרים (edges) בין טבלאות לפי FK
  const dsdRelationships = [];
  
  allTables.forEach(table => {
    const foreignKeys = table.data.attributes.filter(attr => attr.isForeignKey);
    
    foreignKeys.forEach(fk => {
      const targetTable = allTables.find(t => t.data.name === fk.references);
      if (targetTable) {
        dsdRelationships.push({
          id: `fk_${table.id}_${targetTable.id}_${fk.name}`,
          type: 'foreignKey',
          source: table.id,
          target: targetTable.id,
          data: {
            foreignKeyName: fk.name,
            isNullable: fk.isNullable || false
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
 * ייצוא הדיאגרמה לפורמט JSON להורדה
 * @param {Array} nodes - מערך של nodes
 * @returns {String} - JSON string
 */
export const exportDSDtoJSON = (nodes) => {
  const dsd = convertERDtoDSD(nodes);
  return JSON.stringify(dsd, null, 2);
};