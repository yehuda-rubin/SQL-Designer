/**
 * ERD to DSD Converter - Ullman Method (FIXED VERSION)
 * ממיר תרשים ERD לתרשים DSD (Database Schema Diagram) לפי שיטת אולמן
 * 
 * ✅ תיקון קריטי: שמירת המפתחות הראשיים האמיתיים של טבלאות האב
 */

/**
 * 🔧 פונקצית עזר חדשה - מוצאת את המפתחות הראשיים של ישות
 * @param {Object} entity - הישות
 * @returns {Array} - מערך המפתחות הראשיים
 */
const getPrimaryKeys = (entity) => {
  if (!entity || !entity.data || !entity.data.attributes) {
    return [];
  }
  
  const primaryKeys = entity.data.attributes.filter(attr => attr.isPrimaryKey);
  
  // אם אין מפתחות ראשיים מוגדרים, נחזיר את העמודה הראשונה (fallback)
  if (primaryKeys.length === 0 && entity.data.attributes.length > 0) {
    return [entity.data.attributes[0]];
  }
  
  return primaryKeys;
};

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
 * 🔧 מוסיף Foreign Key לטבלה - תוקן!
 * כעת שומר את המפתחות הראשיים האמיתיים של הטבלה המוזכרת
 * וקובץ אותם לקבוצה אחת כאשר מדובר ב-Composite FK
 *
 * @param {Object} table - הטבלה
 * @param {Object} referencedEntity - הישות המוזכרת (לא רק שם!)
 * @param {String} cardinality - cardinality של החיבור
 * @param {String} relationshipType - סוג הקשר ('1:1' או '1:N')
 * @returns {Object} - הטבלה המעודכנת
 */
const addForeignKeyToTable = (table, referencedEntity, cardinality, relationshipType = '1:N') => {
  if (!referencedEntity) return table;

  const referencedTableName = referencedEntity.data.name;

  // 🔧 מוצאים את המפתחות הראשיים האמיתיים של הטבלה המוזכרת
  let referencedPrimaryKeys = getPrimaryKeys(referencedEntity);

  // 🔧 טיפול בטבלה ללא מפתח ראשי מוגדר - משתמש בתכונה הראשונה
  if (referencedPrimaryKeys.length === 0) {
    console.warn(`⚠️ אין מפתחות ראשיים ב-${referencedTableName} - משתמש בתכונה הראשונה`);
    const attributes = referencedEntity.data.attributes || [];
    if (attributes.length === 0) {
      console.error(`❌ אין תכונות ב-${referencedTableName}`);
      return table;
    }
    // לוקח רק את התכונה הראשונה
    referencedPrimaryKeys = [attributes[0]];
  }

  // 🔧 יצירת מזהה ייחודי לקבוצת FK (לטיפול ב-Composite FK)
  const fkGroupId = `fk_${table.data.name}_${referencedTableName}_${Date.now()}`.toLowerCase();

  // 🔧 בדיקה אם כבר קיים FK לטבלה זו
  const existingFKGroup = table.data.attributes.find(attr =>
    attr.isForeignKey && attr.references === referencedTableName
  );

  if (existingFKGroup) {
    console.warn(`⚠️ כבר קיים FK ל-${referencedTableName} בטבלה ${table.data.name}`);
    return table;
  }

  // 🔧 יצירת FK לכל עמודת PK בטבלת האב - כקבוצה מאוחדת
  const newForeignKeys = referencedPrimaryKeys.map((pkAttr, index) => {
    const fkName = `${referencedTableName.toLowerCase()}_${pkAttr.name.toLowerCase()}`;

    return {
      name: fkName,
      type: pkAttr.type, // 🔧 משתמשים בטיפוס האמיתי של המפתח הראשי!
      isForeignKey: true,
      references: referencedTableName,
      referencedColumns: referencedPrimaryKeys.map(pk => pk.name), // 🔧 כל ה-FKs מקבלים את כל העמודות המוזכרות!
      foreignKeyGroup: fkGroupId, // 🔧 מזהה קבוצת FK לקישור בין העמודות
      foreignKeyGroupIndex: index, // 🔧 מיקום העמודה בקבוצה
      foreignKeyGroupSize: referencedPrimaryKeys.length, // 🔧 גודל הקבוצה
      cardinality: cardinality, // 🔧 שמירת הקרדינליות המקורית
      relationshipType: relationshipType, // 🔧 שמירת סוג הקשר (1:1 או 1:N)
      isPrimaryKey: false,
      isNullable: cardinality === '0..1' // אם אופציונלי
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
 * 🔧 יוצר טבלת חיבור (Junction Table) מקשר - תוקן!
 * כעת שומר מפתחות ראשיים מדויקים מכל הישויות
 * וקובץ FKs לקבוצות לפי הישות המקורית
 *
 * @param {Object} relationship - אובייקט הקשר
 * @param {Array} entities - מערך הישויות
 * @returns {Object} - אובייקט הטבלה החדשה
 */
const createJunctionTable = (relationship, entities) => {
  const { id, data } = relationship;
  const { name, connections = [], attributes = [] } = data;

  // שם הטבלה
  const tableName = name || `Junction_${id}`;

  // 🔧 יצירת Foreign Keys לכל ישות מחוברת - עם מפתחות ראשיים מדויקים
  const foreignKeys = [];
  const primaryKeyColumns = []; // לצורך יצירת Composite PK

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

      // 🔧 יצירת מזהה ייחודי לקבוצת FK עבור הישות הזו
      const fkGroupId = `fk_${tableName}_${entityName}_${Date.now()}`.toLowerCase();

      // יצירת FK לכל PK של הישות - כקבוצה מאוחדת
      primaryKeys.forEach((pkAttr, index) => {
        const fkName = `${entityName.toLowerCase()}_${pkAttr.name.toLowerCase()}`;

        foreignKeys.push({
          name: fkName,
          type: pkAttr.type, // 🔧 טיפוס אמיתי
          isForeignKey: true,
          references: entityName,
          referencedColumns: primaryKeys.map(pk => pk.name), // 🔧 כל ה-FKs מקבלים את כל העמודות המוזכרות!
          foreignKeyGroup: fkGroupId, // 🔧 מזהה קבוצת FK
          foreignKeyGroupIndex: index, // 🔧 מיקום בקבוצה
          foreignKeyGroupSize: primaryKeys.length, // 🔧 גודל הקבוצה
          cardinality: conn.cardinality || 'N', // 🔧 שמירת הקרדינליות (בדרך כלל 'N' ב-junction table)
          isPrimaryKey: true // חלק מה-Composite Primary Key של טבלת החיבור
        });

        primaryKeyColumns.push(fkName);
      });
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
      originalRelationship: id,
      primaryKeyColumns // שמירת רשימת ה-PK לשימוש ב-SQL Generator
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

  // 🔧 זיהוי סוג הקשר: 1:1 או 1:N
  const isOneToOne =
    (conn1.cardinality === '1' || conn1.cardinality === '0..1') &&
    (conn2.cardinality === '1' || conn2.cardinality === '0..1');

  const relationshipType = isOneToOne ? '1:1' : '1:N';

  // קביעת איזה צד מקבל את ה-FK
  let sourceTable, targetEntity, targetCardinality;

  if (conn1.cardinality === 'N' || conn1.cardinality === '0..1') {
    // conn1 בצד ה-Many או האופציונלי - הוא מקבל את ה-FK
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
    // conn2 בצד ה-Many או האופציונלי - הוא מקבל את ה-FK
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

  // 🔧 הוספת ה-FK - עכשיו מעביר גם את סוג הקשר
  const updatedSourceTable = addForeignKeyToTable(
    sourceTable,
    targetEntity, // 🔧 מעביר ישות שלמה!
    targetCardinality,
    relationshipType // 🔧 מעביר את סוג הקשר
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

    // 🔧 קיבוץ FK לפי foreignKeyGroup כדי ליצור קשר אחד לכל קבוצה
    const processedGroups = new Set();

    foreignKeys.forEach(fk => {
      const targetTable = allTables.find(t => t.data.name === fk.references);
      if (!targetTable) return;

      // אם יש foreignKeyGroup, בודקים אם כבר עיבדנו את הקבוצה הזו
      if (fk.foreignKeyGroup) {
        if (processedGroups.has(fk.foreignKeyGroup)) {
          return; // כבר יצרנו edge לקבוצה הזו
        }
        processedGroups.add(fk.foreignKeyGroup);

        // מוצאים את כל ה-FKs בקבוצה
        const groupFks = foreignKeys.filter(f => f.foreignKeyGroup === fk.foreignKeyGroup);
        const sortedGroupFks = groupFks.sort((a, b) =>
          (a.foreignKeyGroupIndex || 0) - (b.foreignKeyGroupIndex || 0)
        );

        // יוצרים edge אחד עבור כל הקבוצה
        dsdRelationships.push({
          id: `fk_${table.id}_${targetTable.id}_${fk.foreignKeyGroup}`,
          type: 'foreignKey',
          source: table.id,
          target: targetTable.id,
          data: {
            foreignKeyGroup: fk.foreignKeyGroup,
            foreignKeyNames: sortedGroupFks.map(f => f.name), // 🔧 כל שמות העמודות
            referencedColumns: fk.referencedColumns || [], // 🔧 שומרים את העמודות המוזכרות
            isNullable: fk.isNullable || false,
            isComposite: groupFks.length > 1 // 🔧 סימון שזה FK מורכב
          }
        });
      } else {
        // FK ישן ללא קבוצה - יוצרים edge בודד
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
 * ייצוא הדיאגרמה לפורמט JSON להורדה
 * @param {Array} nodes - מערך של nodes
 * @returns {String} - JSON string
 */
export const exportDSDtoJSON = (nodes) => {
  const dsd = convertERDtoDSD(nodes);
  return JSON.stringify(dsd, null, 2);
};