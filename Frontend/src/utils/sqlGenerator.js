/**
 * SQL Generator for PostgreSQL (FIXED VERSION)
 * Generates complete SQL code from an ERD diagram
 * * ✅ Critical Fix: Using true primary keys instead of the fabricated _id
 */

import { convertERDtoDSD } from './erdToDsdConverter.js';

/**
 * Converts data type from ERD to PostgreSQL format
 * @param {String} type - Data type
 * @returns {String} - Data type in PostgreSQL
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
 * 🔧 New helper function - finds the primary keys of a table
 * @param {Object} table - The table object
 * @returns {Array} - Array of attributes that are PKs
 */
const getPrimaryKeysOfTable = (table) => {
  return table.data.attributes.filter(attr => attr.isPrimaryKey);
};

/**
 * 🔧 New helper function - finds a table by name
 * @param {Array} tables - Array of tables
 * @param {String} tableName - Table name
 * @returns {Object|null} - The table or null
 */
const findTableByName = (tables, tableName) => {
  return tables.find(t => t.data.name === tableName);
};

/**
 * Creates an SQL statement for table creation
 * @param {Object} table - The table object
 * @returns {String} - CREATE TABLE statement
 */
const generateCreateTable = (table) => {
  const { name, attributes = [], isJunctionTable = false } = table.data;

  if (attributes.length === 0) {
    return `-- טבלה ${name} ללא עמודות\n`;
  }

  // Column breakdown by type
  const regularColumns = attributes.filter(attr => !attr.isForeignKey);
  const foreignKeyColumns = attributes.filter(attr => attr.isForeignKey);
  let primaryKeys = attributes.filter(attr => attr.isPrimaryKey);

  // 🔧 Check if this table needs a surrogate key
  const needsSurrogateKey = foreignKeyColumns.length > 0 && !isJunctionTable;

  let sql = `CREATE TABLE ${name} (\n`;
  const allColumns = [];

  // 🔧 If a surrogate key is needed - add id SERIAL
  if (needsSurrogateKey) {
    allColumns.push(`    id SERIAL PRIMARY KEY`);
  }

  // 🔧 Handle table with no defined primary key (only if not a junction table)
  if (primaryKeys.length === 0 && !needsSurrogateKey) {
    sql += `    -- ⚠️ אזהרה: לא הוגדר מפתח ראשי!\n`;
    sql += `    -- 🔧 משתמש בתכונה הראשונה כמפתח ראשי זמני\n`;

    // Takes the first non-FK attribute
    primaryKeys = regularColumns.length > 0 ? [regularColumns[0]] : (attributes.length > 0 ? [attributes[0]] : []);
  }

  // Create regular columns
  const columnDefinitions = regularColumns.map(attr => {
    const nullable = attr.isNullable !== false ? '' : ' NOT NULL';
    return `    ${attr.name} ${convertDataType(attr.type)}${nullable}`;
  });

  // Create FK columns
  const fkColumnDefinitions = foreignKeyColumns.map(attr => {
    // 🔧 NOT NULL according to cardinality: '1' or 'N' = required, '0..1' = optional
    const isRequired = attr.cardinality === '1' || attr.cardinality === 'N';
    const nullable = isRequired ? ' NOT NULL' : '';
    return `    ${attr.name} ${convertDataType(attr.type)}${nullable}`;
  });

  // Combine all columns
  allColumns.push(...columnDefinitions, ...fkColumnDefinitions);

  // Add PRIMARY KEY constraint (only if no surrogate key was added)
  if (!needsSurrogateKey && primaryKeys.length > 0) {
    const pkColumns = primaryKeys.map(pk => pk.name).join(', ');
    allColumns.push(`    PRIMARY KEY (${pkColumns})`);
  }

  sql += allColumns.join(',\n');
  sql += '\n);\n';

  return sql;
};

/**
 * 🔧 Generates SQL statements for adding Foreign Keys - fixed! (v5)
 * v4: Support for Foreign Key Groups - identifies FK groups and creates a composite constraint for each group
 * v5: Support for Junction Tables - ON DELETE CASCADE for junction tables
 *
 * @param {Object} table - The table object
 * @param {Array} allTables - Array of all tables (for searching)
 * @returns {String} - ALTER TABLE statements
 */
const generateForeignKeys = (table, allTables) => {
  const { name, attributes = [], isJunctionTable = false } = table.data;
  const foreignKeys = attributes.filter(attr => attr.isForeignKey && attr.references);

  if (foreignKeys.length === 0) return '';

  // 🔧 Group FK by foreignKeyGroup (if exists) or by references (fallback)
  const fkGroups = new Map();

  foreignKeys.forEach(fk => {
    // If foreignKeyGroup exists, use it for grouping
    // Otherwise, group by the name of the referenced table (old behavior)
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

  // 🔧 Create FK constraint for each group
  fkGroups.forEach((group, groupKey) => {
    const { foreignKeys: fks, referencedTable: referencedTableName, isGrouped } = group;

    const referencedTable = findTableByName(allTables, referencedTableName);

    if (!referencedTable) {
      sql += `-- ⚠️ שגיאה: לא נמצאה טבלה ${referencedTableName}\n\n`;
      return;
    }

    let referencedPKs = getPrimaryKeysOfTable(referencedTable);

    // 🔧 Handle table with no defined primary key
    if (referencedPKs.length === 0) {
      sql += `-- ⚠️ אזהרה: טבלה ${referencedTableName} ללא מפתח ראשי מוגדר!\n`;
      sql += `-- 🔧 משתמש בתכונה הראשונה כמפתח ראשי זמני\n`;

      const nonFKAttributes = referencedTable.data.attributes.filter(attr => !attr.isForeignKey);

      if (nonFKAttributes.length === 0 && referencedTable.data.attributes.length === 0) {
        sql += `-- ❌ שגיאה קריטית: אין תכונות ב-${referencedTableName}\n\n`;
        return;
      }

      // Takes only the first non-FK attribute
      referencedPKs = nonFKAttributes.length > 0 ? [nonFKAttributes[0]] : [referencedTable.data.attributes[0]];
    }

    // 🔧 Sort FKs by foreignKeyGroupIndex if exists
    const sortedFks = isGrouped
      ? [...fks].sort((a, b) => (a.foreignKeyGroupIndex || 0) - (b.foreignKeyGroupIndex || 0))
      : fks;

    // 🔧 Build FK column list (left side)
    const fkColumns = sortedFks.map(fk => fk.name).join(', ');

    // 🔧 Build target column list (right side)
    let referencedColumns;

    if (isGrouped && sortedFks[0].referencedColumns) {
      // If it is a defined group, FKs have referencedColumns - use them
      referencedColumns = sortedFks[0].referencedColumns.join(', ');
    } else {
      // Otherwise, manually group all referencedColumns
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

    // 🔧 Add a note if it is a composite FK group
    if (isGrouped && sortedFks.length > 1) {
      sql += `-- 🔑 Composite Foreign Key Group (${sortedFks.length} columns)\n`;
    }

    // 🔧 Determine ON DELETE behavior by cardinality and table/relationship type
    const cardinality = sortedFks[0].cardinality;
    const relationshipType = sortedFks[0].relationshipType;
    let onDelete = '';

    if (isJunctionTable) {
      // 🔧 In Junction Tables (M:N) - always CASCADE
      // Deleting a record from the parent table should delete the connections in the junction table
      // Example: Deleting a Student deletes all their registrations in Enrollment
      onDelete = '\n        ON DELETE CASCADE';
    } else if (cardinality === '0..1') {
      // 🔧 Optional relationship - SET NULL
      // Deleting the reference should not delete the main record
      // Example: Deleting a Passport resets passport_id in Person
      onDelete = '\n        ON DELETE SET NULL';
    } else {
      // 🔧 All other relationships (1:1, 1:N, N) - RESTRICT
      // Principle: No automatic deletion of data, only preventing deletion with an error
      // 1:1 - Cannot delete Department if it has a Manager
      // 1:N - Cannot delete Department if it has Employees
      // N - Cannot delete if dependencies exist
      onDelete = '\n        ON DELETE RESTRICT';
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
 * 🔧 Creates UNIQUE constraints based on cardinality (v2)
 * @param {Object} table - The table object
 * @returns {String} - ALTER TABLE statements for UNIQUE
 */
const generateUniqueConstraints = (table) => {
  const { name, attributes = [] } = table.data;
  const foreignKeys = attributes.filter(attr => attr.isForeignKey && attr.references);

  if (foreignKeys.length === 0) return '';

  // 🔧 Group FK by foreignKeyGroup
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

  // 🔧 Create UNIQUE constraint for each group with cardinality '0..1' or '1'
  fkGroups.forEach((group, groupKey) => {
    const { foreignKeys: fks, cardinality, references } = group;

    // UNIQUE only for cardinality '0..1' or '1' (at most one)
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
 * 🔧 Creates indexes on FKs for performance
 * @param {Object} table - The table object
 * @returns {String} - CREATE INDEX statements
 */
const generateIndexes = (table) => {
  const { name, attributes = [] } = table.data;
  const foreignKeys = attributes.filter(attr => attr.isForeignKey && attr.references);

  if (foreignKeys.length === 0) return '';

  // 🔧 Group FK by foreignKeyGroup
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

  // 🔧 Create index for each FK group
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
 * Generates complete SQL code
 * @param {Array} nodes - Array of nodes (entities + relationships)
 * @returns {String} - Complete SQL code
 */
export const generateSQL = (nodes) => {
  if (!nodes || nodes.length === 0) {
    return '-- אין נתונים להמרה';
  }
  
  const { tables } = convertERDtoDSD(nodes);
  
  let sql = '';
  
  // Header
  sql += '-- ========================================\n';
  sql += '-- SQL Database Schema\n';
  sql += `-- Generated: ${new Date().toLocaleString('he-IL')}\n`;
  sql += '-- Database: PostgreSQL\n';
  sql += '-- ========================================\n\n';
  
  // Step 1: Create all tables (without FK)
  sql += '-- ========================================\n';
  sql += '-- שלב 1: יצירת טבלאות\n';
  sql += '-- ========================================\n\n';
  
  tables.forEach(table => {
    sql += generateCreateTable(table);
    sql += '\n';
  });
  
  // Step 2: Add Foreign Keys
  sql += '\n-- ========================================\n';
  sql += '-- שלב 2: הוספת Foreign Keys\n';
  sql += '-- ========================================\n\n';
  
  tables.forEach(table => {
    const fkSQL = generateForeignKeys(table, tables); // 🔧 Passes all tables!
    if (fkSQL) {
      sql += fkSQL;
    }
  });
  
  // Step 3: Add UNIQUE constraints based on cardinality
  sql += '\n-- ========================================\n';
  sql += '-- שלב 3: UNIQUE Constraints (cardinality-based)\n';
  sql += '-- ========================================\n\n';

  tables.forEach(table => {
    const uniqueSQL = generateUniqueConstraints(table);
    if (uniqueSQL) {
      sql += uniqueSQL;
    }
  });

  // Step 4: Add indexes for performance
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

  // Step 5: INSERT examples (optional)
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
 * Exports SQL to a file for download
 * @param {Array} nodes - Array of nodes
 * @param {String} filename - The file name
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
