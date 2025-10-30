/**
 * SQL Generator for PostgreSQL (FIXED VERSION)
 * מחולל קוד SQL מלא מתרשים ERD
 * 
 * ✅ תיקון קריטי: שימוש במפתחות ראשיים אמיתיים במקום _id המומצא
 */

import { convertERDtoDSD } from './erdToDsdConverter';

/**
 * ממיר data type מ-ERD לפורמט PostgreSQL
 * @param {String} type - סוג הנתון
 * @returns {String} - סוג הנתון ב-PostgreSQL
 */
const convertDataType = (type) => {
  const typeMap = {
    'INT': 'INTEGER',
    'VARCHAR(255)': 'VARCHAR(255)',
    'TEXT': 'TEXT',
    'DATE': 'DATE',
    'DATETIME': 'TIMESTAMP',
    'BOOLEAN': 'BOOLEAN',
    'DECIMAL': 'DECIMAL(10,2)',
    'FLOAT': 'REAL'
  };
  
  return typeMap[type] || type;
};

/**
 * 🔧 פונקצית עזר חדשה - מוצאת את המפתחות הראשיים של טבלה
 * @param {Object} table - אובייקט הטבלה
 * @returns {Array} - מערך של attributes שהם PK
 */
const getPrimaryKeysOfTable = (table) => {
  return table.data.attributes.filter(attr => attr.isPrimaryKey);
};

/**
 * 🔧 פונקצית עזר חדשה - מוצאת טבלה לפי שם
 * @param {Array} tables - מערך הטבלאות
 * @param {String} tableName - שם הטבלה
 * @returns {Object|null} - הטבלה או null
 */
const findTableByName = (tables, tableName) => {
  return tables.find(t => t.data.name === tableName);
};

/**
 * יוצר SQL statement ליצירת טבלה
 * @param {Object} table - אובייקט הטבלה
 * @returns {String} - CREATE TABLE statement
 */
const generateCreateTable = (table) => {
  const { name, attributes = [] } = table.data;
  
  if (attributes.length === 0) {
    return `-- טבלה ${name} ללא עמודות\n`;
  }
  
  // פילוח עמודות לפי סוג
  const regularColumns = attributes.filter(attr => !attr.isForeignKey);
  const foreignKeyColumns = attributes.filter(attr => attr.isForeignKey);
  let primaryKeys = attributes.filter(attr => attr.isPrimaryKey);
  
  let sql = `CREATE TABLE ${name} (\n`;
  
  // 🔧 טיפול בטבלה ללא מפתח ראשי מוגדר
  if (primaryKeys.length === 0) {
    sql += `    -- ⚠️ אזהרה: לא הוגדר מפתח ראשי!\n`;
    sql += `    -- 🔧 משתמש בכל התכונות הלא-FK כמפתח ראשי זמני\n`;
    
    // לוקח את כל התכונות שאינן FK
    primaryKeys = regularColumns.length > 0 ? regularColumns : attributes;
  }
  
  // יצירת עמודות רגילות
  const columnDefinitions = regularColumns.map(attr => {
    const nullable = attr.isNullable !== false ? '' : ' NOT NULL';
    return `    ${attr.name} ${convertDataType(attr.type)}${nullable}`;
  });
  
  // יצירת עמודות FK
  const fkColumnDefinitions = foreignKeyColumns.map(attr => {
    const nullable = attr.isNullable ? '' : ' NOT NULL';
    return `    ${attr.name} ${convertDataType(attr.type)}${nullable}`;
  });
  
  // איחוד כל העמודות
  const allColumns = [...columnDefinitions, ...fkColumnDefinitions];
  
  // הוספת PRIMARY KEY constraint
  if (primaryKeys.length > 0) {
    const pkColumns = primaryKeys.map(pk => pk.name).join(', ');
    allColumns.push(`    PRIMARY KEY (${pkColumns})`);
  }
  
  sql += allColumns.join(',\n');
  sql += '\n);\n';
  
  return sql;
};

/**
 * 🔧 יוצר SQL statements להוספת Foreign Keys - תוקן! (v3)
 * v3: תיקון התאמת מספר העמודות ב-FK המורכב + טיפול בטבלאות ללא PK
 * 
 * @param {Object} table - אובייקט הטבלה
 * @param {Array} allTables - מערך כל הטבלאות (לחיפוש)
 * @returns {String} - ALTER TABLE statements
 */
const generateForeignKeys = (table, allTables) => {
  const { name, attributes = [] } = table.data;
  const foreignKeys = attributes.filter(attr => attr.isForeignKey && attr.references);
  
  if (foreignKeys.length === 0) return '';
  
  // 🔧 קיבוץ FK לפי טבלת היעד - כדי ליצור FK מורכבים
  const fkByReference = {};
  
  foreignKeys.forEach(fk => {
    if (!fkByReference[fk.references]) {
      fkByReference[fk.references] = [];
    }
    fkByReference[fk.references].push(fk);
  });
  
  let sql = '';
  
  // 🔧 יצירת FK אחד לכל טבלת יעד (גם אם מורכב)
  Object.entries(fkByReference).forEach(([referencedTableName, fks]) => {
    const referencedTable = findTableByName(allTables, referencedTableName);
    
    if (!referencedTable) {
      sql += `-- ⚠️ שגיאה: לא נמצאה טבלה ${referencedTableName}\n\n`;
      return;
    }
    
    let referencedPKs = getPrimaryKeysOfTable(referencedTable);
    
    // 🔧 טיפול בטבלה ללא מפתח ראשי מוגדר
    if (referencedPKs.length === 0) {
      sql += `-- ⚠️ אזהרה: טבלה ${referencedTableName} ללא מפתח ראשי מוגדר!\n`;
      sql += `-- 🔧 משתמש בכל התכונות כמפתח ראשי זמני\n`;
      
      // לוקח את כל התכונות שאינן FK
      referencedPKs = referencedTable.data.attributes.filter(attr => !attr.isForeignKey);
      
      if (referencedPKs.length === 0) {
        sql += `-- ❌ שגיאה קריטית: אין תכונות ב-${referencedTableName}\n\n`;
        return;
      }
    }
    
    // 🔧 בניית רשימת עמודות ה-FK (צד שמאל)
    const fkColumns = fks.map(fk => fk.name).join(', ');
    
    // 🔧🔧 v3: איסוף נכון של כל העמודות המוזכרות מכל ה-FKs
    let referencedColumns;
    
    // אוסף את כל ה-referencedColumns מכל ה-FKs
    const allReferencedColumns = [];
    fks.forEach(fk => {
      if (fk.referencedColumns && fk.referencedColumns.length > 0) {
        allReferencedColumns.push(...fk.referencedColumns);
      }
    });
    
    if (allReferencedColumns.length > 0) {
      // יש מידע מפורש - משתמשים בו
      referencedColumns = allReferencedColumns.join(', ');
    } else {
      // אחרת - משתמשים במפתחות הראשיים לפי סדר
      referencedColumns = referencedPKs.map(pk => pk.name).join(', ');
    }
    
    // 🔧 בדיקת התאמה: מספר עמודות FK = מספר עמודות referenced
    const fkCount = fks.length;
    const refCount = allReferencedColumns.length > 0 ? allReferencedColumns.length : referencedPKs.length;
    
    if (fkCount !== refCount) {
      sql += `-- ⚠️ אזהרה: אי התאמה במספר עמודות!\n`;
      sql += `-- FK מכיל ${fkCount} עמודות, אבל ${referencedTableName} מצפה ל-${refCount} עמודות\n`;
      sql += `-- FK: ${fkColumns}\n`;
      sql += `-- Referenced: ${referencedColumns}\n\n`;
      return;
    }
    
    const constraintName = `fk_${name}_${referencedTableName}`.toLowerCase().replace(/\s/g, '_');
    
    sql += `ALTER TABLE ${name}\n`;
    sql += `    ADD CONSTRAINT ${constraintName}\n`;
    sql += `    FOREIGN KEY (${fkColumns})\n`;
    sql += `    REFERENCES ${referencedTableName}(${referencedColumns});\n\n`;
  });
  
  return sql;
};

/**
 * יוצר UNIQUE constraints לקשרים 1:1
 * @param {Object} table - אובייקט הטבלה
 * @param {Array} nodes - מערך של nodes מקוריים
 * @returns {String} - ALTER TABLE statements עבור UNIQUE
 */
const generateUniqueConstraints = (table, nodes) => {
  // מציאת קשרים 1:1
  const relationships = nodes.filter(n => n.type === 'relationship');
  
  let sql = '';
  
  relationships.forEach(rel => {
    const { connections = [] } = rel.data;
    
    // בדיקה אם זה קשר 1:1
    if (connections.length === 2 &&
        connections[0].cardinality === '1' &&
        connections[1].cardinality === '1') {
      
      // מציאת העמודה שצריכה להיות UNIQUE
      const relevantConn = connections.find(conn => 
        conn.entityName === table.data.name || conn.entityId === table.id
      );
      
      if (relevantConn) {
        const otherConn = connections.find(c => c !== relevantConn);
        
        // 🔧 מחפשים את כל ה-FK שמקשרים לטבלה הזו
        const fkColumns = table.data.attributes.filter(attr => 
          attr.isForeignKey && attr.references === otherConn.entityName
        );
        
        if (fkColumns.length > 0) {
          const columnNames = fkColumns.map(fk => fk.name).join(', ');
          const constraintName = `uq_${table.data.name}_${fkColumns[0].references}`.toLowerCase().replace(/\s/g, '_');
          
          sql += `ALTER TABLE ${table.data.name}\n`;
          sql += `    ADD CONSTRAINT ${constraintName}\n`;
          sql += `    UNIQUE (${columnNames});\n\n`;
        }
      }
    }
  });
  
  return sql;
};

/**
 * יוצר קוד SQL מלא
 * @param {Array} nodes - מערך של nodes (entities + relationships)
 * @returns {String} - קוד SQL מלא
 */
export const generateSQL = (nodes) => {
  if (!nodes || nodes.length === 0) {
    return '-- אין נתונים להמרה';
  }
  
  const { tables } = convertERDtoDSD(nodes);
  
  let sql = '';
  
  // כותרת
  sql += '-- ========================================\n';
  sql += '-- SQL Database Schema\n';
  sql += `-- Generated: ${new Date().toLocaleString('he-IL')}\n`;
  sql += '-- Database: PostgreSQL\n';
  sql += '-- ========================================\n\n';
  
  // שלב 1: יצירת כל הטבלאות (ללא FK)
  sql += '-- ========================================\n';
  sql += '-- שלב 1: יצירת טבלאות\n';
  sql += '-- ========================================\n\n';
  
  tables.forEach(table => {
    sql += generateCreateTable(table);
    sql += '\n';
  });
  
  // שלב 2: הוספת Foreign Keys
  sql += '\n-- ========================================\n';
  sql += '-- שלב 2: הוספת Foreign Keys\n';
  sql += '-- ========================================\n\n';
  
  tables.forEach(table => {
    const fkSQL = generateForeignKeys(table, tables); // 🔧 מעביר את כל הטבלאות!
    if (fkSQL) {
      sql += fkSQL;
    }
  });
  
  // שלב 3: הוספת UNIQUE constraints לקשרים 1:1
  sql += '\n-- ========================================\n';
  sql += '-- שלב 3: UNIQUE Constraints (קשרים 1:1)\n';
  sql += '-- ========================================\n\n';
  
  tables.forEach(table => {
    const uniqueSQL = generateUniqueConstraints(table, nodes);
    if (uniqueSQL) {
      sql += uniqueSQL;
    }
  });
  
  // שלב 4: דוגמאות INSERT (אופציונלי)
  sql += '\n-- ========================================\n';
  sql += '-- שלב 4: דוגמאות INSERT (אופציונלי)\n';
  sql += '-- ========================================\n\n';
  
  tables.forEach(table => {
    sql += `-- INSERT INTO ${table.data.name} VALUES (...);\n`;
  });
  
  sql += '\n-- ========================================\n';
  sql += '-- סיום\n';
  sql += '-- ========================================\n';
  
  return sql;
};

/**
 * מייצא SQL לקובץ להורדה
 * @param {Array} nodes - מערך של nodes
 * @param {String} filename - שם הקובץ
 */
export const downloadSQL = (nodes, filename = 'database_schema.sql') => {
  const sql = generateSQL(nodes);
  const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
};