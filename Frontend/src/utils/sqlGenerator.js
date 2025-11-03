/**
 * SQL Generator for PostgreSQL (FIXED VERSION)
 * מחולל קוד SQL מלא מתרשים ERD
 * 
 * ✅ תיקון קריטי: שימוש במפתחות ראשיים אמיתיים במקום _id המומצא
 */

import { convertERDtoDSD } from './erdToDsdConverter.js';

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
  const { name, attributes = [], isJunctionTable = false } = table.data;

  if (attributes.length === 0) {
    return `-- טבלה ${name} ללא עמודות\n`;
  }

  // פילוח עמודות לפי סוג
  const regularColumns = attributes.filter(attr => !attr.isForeignKey);
  const foreignKeyColumns = attributes.filter(attr => attr.isForeignKey);
  let primaryKeys = attributes.filter(attr => attr.isPrimaryKey);

  // 🔧 בדיקה אם טבלה זו צריכה surrogate key
  const needsSurrogateKey = foreignKeyColumns.length > 0 && !isJunctionTable;

  let sql = `CREATE TABLE ${name} (\n`;
  const allColumns = [];

  // 🔧 אם צריך surrogate key - מוסיפים id SERIAL
  if (needsSurrogateKey) {
    allColumns.push(`    id SERIAL PRIMARY KEY`);
  }

  // 🔧 טיפול בטבלה ללא מפתח ראשי מוגדר (רק אם לא junction table)
  if (primaryKeys.length === 0 && !needsSurrogateKey) {
    sql += `    -- ⚠️ אזהרה: לא הוגדר מפתח ראשי!\n`;
    sql += `    -- 🔧 משתמש בתכונה הראשונה כמפתח ראשי זמני\n`;

    // לוקח את התכונה הראשונה הלא-FK
    primaryKeys = regularColumns.length > 0 ? [regularColumns[0]] : (attributes.length > 0 ? [attributes[0]] : []);
  }

  // יצירת עמודות רגילות
  const columnDefinitions = regularColumns.map(attr => {
    const nullable = attr.isNullable !== false ? '' : ' NOT NULL';
    return `    ${attr.name} ${convertDataType(attr.type)}${nullable}`;
  });

  // יצירת עמודות FK
  const fkColumnDefinitions = foreignKeyColumns.map(attr => {
    // 🔧 NOT NULL לפי cardinality: '1' או 'N' = חובה, '0..1' = אופציונלי
    const isRequired = attr.cardinality === '1' || attr.cardinality === 'N';
    const nullable = isRequired ? ' NOT NULL' : '';
    return `    ${attr.name} ${convertDataType(attr.type)}${nullable}`;
  });

  // איחוד כל העמודות
  allColumns.push(...columnDefinitions, ...fkColumnDefinitions);

  // הוספת PRIMARY KEY constraint (רק אם לא הוספנו surrogate key)
  if (!needsSurrogateKey && primaryKeys.length > 0) {
    const pkColumns = primaryKeys.map(pk => pk.name).join(', ');
    allColumns.push(`    PRIMARY KEY (${pkColumns})`);
  }

  sql += allColumns.join(',\n');
  sql += '\n);\n';

  return sql;
};

/**
 * 🔧 יוצר SQL statements להוספת Foreign Keys - תוקן! (v5)
 * v4: תמיכה ב-Foreign Key Groups - מזהה קבוצות FK ויוצר constraint מורכב לכל קבוצה
 * v5: תמיכה ב-Junction Tables - ON DELETE CASCADE עבור טבלאות חיבור
 *
 * @param {Object} table - אובייקט הטבלה
 * @param {Array} allTables - מערך כל הטבלאות (לחיפוש)
 * @returns {String} - ALTER TABLE statements
 */
const generateForeignKeys = (table, allTables) => {
  const { name, attributes = [], isJunctionTable = false } = table.data;
  const foreignKeys = attributes.filter(attr => attr.isForeignKey && attr.references);

  if (foreignKeys.length === 0) return '';

  // 🔧 קיבוץ FK לפי foreignKeyGroup (אם קיים) או לפי references (fallback)
  const fkGroups = new Map();

  foreignKeys.forEach(fk => {
    // אם יש foreignKeyGroup, משתמשים בו לקיבוץ
    // אחרת, קובצים לפי שם הטבלה המוזכרת (התנהגות ישנה)
    const groupKey = fk.foreignKeyGroup || `legacy_${fk.references}`;

    if (!fkGroups.has(groupKey)) {
      fkGroups.set(groupKey, {
        foreignKeys: [],
        referencedTable: fk.references,
        isGrouped: !!fk.foreignKeyGroup
      });
    }

    fkGroups.get(groupKey).foreignKeys.push(fk);
  });

  let sql = '';

  // 🔧 יצירת FK constraint לכל קבוצה
  fkGroups.forEach((group, groupKey) => {
    const { foreignKeys: fks, referencedTable: referencedTableName, isGrouped } = group;

    const referencedTable = findTableByName(allTables, referencedTableName);

    if (!referencedTable) {
      sql += `-- ⚠️ שגיאה: לא נמצאה טבלה ${referencedTableName}\n\n`;
      return;
    }

    let referencedPKs = getPrimaryKeysOfTable(referencedTable);

    // 🔧 טיפול בטבלה ללא מפתח ראשי מוגדר
    if (referencedPKs.length === 0) {
      sql += `-- ⚠️ אזהרה: טבלה ${referencedTableName} ללא מפתח ראשי מוגדר!\n`;
      sql += `-- 🔧 משתמש בתכונה הראשונה כמפתח ראשי זמני\n`;

      const nonFKAttributes = referencedTable.data.attributes.filter(attr => !attr.isForeignKey);

      if (nonFKAttributes.length === 0 && referencedTable.data.attributes.length === 0) {
        sql += `-- ❌ שגיאה קריטית: אין תכונות ב-${referencedTableName}\n\n`;
        return;
      }

      // לוקח רק את התכונה הראשונה הלא-FK
      referencedPKs = nonFKAttributes.length > 0 ? [nonFKAttributes[0]] : [referencedTable.data.attributes[0]];
    }

    // 🔧 מיון ה-FKs לפי foreignKeyGroupIndex אם קיים
    const sortedFks = isGrouped
      ? [...fks].sort((a, b) => (a.foreignKeyGroupIndex || 0) - (b.foreignKeyGroupIndex || 0))
      : fks;

    // 🔧 בניית רשימת עמודות ה-FK (צד שמאל)
    const fkColumns = sortedFks.map(fk => fk.name).join(', ');

    // 🔧 בניית רשימת עמודות היעד (צד ימין)
    let referencedColumns;

    if (isGrouped && sortedFks[0].referencedColumns) {
      // אם זו קבוצה מוגדרת, יש ל-FKs את referencedColumns - משתמשים בהם
      referencedColumns = sortedFks[0].referencedColumns.join(', ');
    } else {
      // אחרת, קיבוץ ידני של כל ה-referencedColumns
      const allReferencedColumns = new Set();
      sortedFks.forEach(fk => {
        if (fk.referencedColumns && fk.referencedColumns.length > 0) {
          fk.referencedColumns.forEach(col => allReferencedColumns.add(col));
        }
      });

      if (allReferencedColumns.size > 0) {
        referencedColumns = Array.from(allReferencedColumns).join(', ');
      } else {
        referencedColumns = referencedPKs.map(pk => pk.name).join(', ');
      }
    }

    // 🔧 הוספת הערה אם מדובר בקבוצת FK מורכבת
    if (isGrouped && sortedFks.length > 1) {
      sql += `-- 🔑 Composite Foreign Key Group (${sortedFks.length} columns)\n`;
    }

    // 🔧 קביעת ON DELETE behavior לפי cardinality וסוג הטבלה
    const cardinality = sortedFks[0].cardinality;
    let onDelete = '';

    if (isJunctionTable) {
      // 🔧 ב-Junction Tables (M:N) - תמיד CASCADE
      // מחיקת רשומה מטבלת האב צריכה למחוק את הקשרים בטבלת החיבור
      onDelete = '\n    ON DELETE CASCADE';
    } else if (cardinality === '0..1') {
      onDelete = '\n    ON DELETE SET NULL';
    } else if (cardinality === '1') {
      onDelete = '\n    ON DELETE CASCADE';
    } else if (cardinality === 'N') {
      onDelete = '\n    ON DELETE RESTRICT';
    }

    const constraintName = isGrouped
      ? groupKey.replace(/\s/g, '_')
      : `fk_${name}_${referencedTableName}`.toLowerCase().replace(/\s/g, '_');

    sql += `ALTER TABLE ${name}\n`;
    sql += `    ADD CONSTRAINT ${constraintName}\n`;
    sql += `    FOREIGN KEY (${fkColumns})\n`;
    sql += `    REFERENCES ${referencedTableName}(${referencedColumns})${onDelete};\n\n`;
  });

  return sql;
};

/**
 * 🔧 יוצר UNIQUE constraints לפי cardinality (v2)
 * @param {Object} table - אובייקט הטבלה
 * @returns {String} - ALTER TABLE statements עבור UNIQUE
 */
const generateUniqueConstraints = (table) => {
  const { name, attributes = [] } = table.data;
  const foreignKeys = attributes.filter(attr => attr.isForeignKey && attr.references);

  if (foreignKeys.length === 0) return '';

  // 🔧 קיבוץ FK לפי foreignKeyGroup
  const fkGroups = new Map();

  foreignKeys.forEach(fk => {
    const groupKey = fk.foreignKeyGroup || `legacy_${fk.references}`;

    if (!fkGroups.has(groupKey)) {
      fkGroups.set(groupKey, {
        foreignKeys: [],
        cardinality: fk.cardinality,
        references: fk.references
      });
    }

    fkGroups.get(groupKey).foreignKeys.push(fk);
  });

  let sql = '';

  // 🔧 יצירת UNIQUE constraint לכל קבוצה עם cardinality '0..1' או '1'
  fkGroups.forEach((group, groupKey) => {
    const { foreignKeys: fks, cardinality, references } = group;

    // UNIQUE רק לקרדינליות '0..1' או '1' (at most one)
    if (cardinality === '0..1' || cardinality === '1') {
      const sortedFks = fks.sort((a, b) => (a.foreignKeyGroupIndex || 0) - (b.foreignKeyGroupIndex || 0));
      const columnNames = sortedFks.map(fk => fk.name).join(', ');
      const constraintName = `uq_${name}_${references}`.toLowerCase().replace(/\s/g, '_');

      sql += `-- 🔒 UNIQUE constraint for ${cardinality} cardinality\n`;
      sql += `ALTER TABLE ${name}\n`;
      sql += `    ADD CONSTRAINT ${constraintName}\n`;
      sql += `    UNIQUE (${columnNames});\n\n`;
    }
  });

  return sql;
};

/**
 * 🔧 יוצר אינדקסים על FKs לביצועים
 * @param {Object} table - אובייקט הטבלה
 * @returns {String} - CREATE INDEX statements
 */
const generateIndexes = (table) => {
  const { name, attributes = [] } = table.data;
  const foreignKeys = attributes.filter(attr => attr.isForeignKey && attr.references);

  if (foreignKeys.length === 0) return '';

  // 🔧 קיבוץ FK לפי foreignKeyGroup
  const fkGroups = new Map();

  foreignKeys.forEach(fk => {
    const groupKey = fk.foreignKeyGroup || `legacy_${fk.references}`;

    if (!fkGroups.has(groupKey)) {
      fkGroups.set(groupKey, {
        foreignKeys: [],
        references: fk.references
      });
    }

    fkGroups.get(groupKey).foreignKeys.push(fk);
  });

  let sql = '';

  // 🔧 יצירת אינדקס לכל קבוצת FK
  fkGroups.forEach((group, groupKey) => {
    const { foreignKeys: fks, references } = group;
    const sortedFks = fks.sort((a, b) => (a.foreignKeyGroupIndex || 0) - (b.foreignKeyGroupIndex || 0));
    const columnNames = sortedFks.map(fk => fk.name).join(', ');
    const indexName = `idx_${name}_${references}`.toLowerCase().replace(/\s/g, '_');

    sql += `CREATE INDEX ${indexName} ON ${name}(${columnNames});\n`;
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
  
  // שלב 3: הוספת UNIQUE constraints לפי cardinality
  sql += '\n-- ========================================\n';
  sql += '-- שלב 3: UNIQUE Constraints (cardinality-based)\n';
  sql += '-- ========================================\n\n';

  tables.forEach(table => {
    const uniqueSQL = generateUniqueConstraints(table);
    if (uniqueSQL) {
      sql += uniqueSQL;
    }
  });

  // שלב 4: הוספת אינדקסים לביצועים
  sql += '\n-- ========================================\n';
  sql += '-- שלב 4: אינדקסים לביצועים\n';
  sql += '-- ========================================\n\n';

  tables.forEach(table => {
    const indexSQL = generateIndexes(table);
    if (indexSQL) {
      sql += indexSQL;
    }
  });
  sql += '\n';

  // שלב 5: דוגמאות INSERT (אופציונלי)
  sql += '-- ========================================\n';
  sql += '-- שלב 5: דוגמאות INSERT (אופציונלי)\n';
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