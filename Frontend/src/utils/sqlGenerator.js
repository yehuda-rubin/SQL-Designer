/**
 * SQL Generator for PostgreSQL
 * מחולל קוד SQL מלא מתרשים ERD
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
  const primaryKeys = attributes.filter(attr => attr.isPrimaryKey);
  
  let sql = `CREATE TABLE ${name} (\n`;
  
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
 * יוצר SQL statements להוספת Foreign Keys
 * @param {Object} table - אובייקט הטבלה
 * @returns {String} - ALTER TABLE statements
 */
const generateForeignKeys = (table) => {
  const { name, attributes = [] } = table.data;
  const foreignKeys = attributes.filter(attr => attr.isForeignKey && attr.references);
  
  if (foreignKeys.length === 0) return '';
  
  let sql = '';
  
  foreignKeys.forEach(fk => {
    const constraintName = `fk_${name}_${fk.references}_${fk.name}`.toLowerCase();
    sql += `ALTER TABLE ${name}\n`;
    sql += `    ADD CONSTRAINT ${constraintName}\n`;
    sql += `    FOREIGN KEY (${fk.name})\n`;
    sql += `    REFERENCES ${fk.references}(${fk.references.toLowerCase()}_id);\n\n`;
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
        const fkColumnName = `${otherConn.entityName.toLowerCase()}_id`;
        
        const fkExists = table.data.attributes.find(attr => 
          attr.name === fkColumnName && attr.isForeignKey
        );
        
        if (fkExists) {
          sql += `ALTER TABLE ${table.data.name}\n`;
          sql += `    ADD CONSTRAINT uq_${table.data.name}_${fkColumnName}\n`;
          sql += `    UNIQUE (${fkColumnName});\n\n`;
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
    const fkSQL = generateForeignKeys(table);
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