/**
 * Fix for table creation logic – handles cardinality correctly
 *
 * Original problem:
 * The code creates a surrogate key (id SERIAL) for every table with FKs
 * that is not a junction table.
 * This is incorrect because relationship tables with mixed cardinalities
 * (0..1, 1, N) must use a natural key.
 *
 * Solution:
 * Automatically detect FK with cardinality='1' and use it as the natural PK.
 */

/**
 * 🔧 Detect the natural primary key (Natural Key) for a relationship table
 * @param {Array} foreignKeyColumns - FK columns
 * @returns {Array|null} - FK columns that can serve as PK, or null
 */
const findNaturalPrimaryKey = (foreignKeyColumns) => {
  if (foreignKeyColumns.length === 0) return null;

  // Look for FK groups with cardinality='1' (Mandatory once)
  const fkGroups = new Map();

  foreignKeyColumns.forEach(fk => {
    const groupKey = fk.foreignKeyGroup || `single_${fk.name}`;

    if (!fkGroups.has(groupKey)) {
      fkGroups.set(groupKey, {
        columns: [],
        cardinality: fk.cardinality,
        relationshipType: fk.relationshipType
      });
    }

    fkGroups.get(groupKey).columns.push(fk);
  });

  // Find FK group with cardinality='1'
  for (const [groupKey, group] of fkGroups) {
    if (group.cardinality === '1') {
      // ✅ Found! This is the natural PK
      return group.columns;
    }
  }

  // If no FK with cardinality='1', there is no natural PK
  return null;
};

/**
 * 🔧 Generates a CREATE TABLE SQL statement (fixed version)
 * @param {Object} table - table object
 * @returns {String} - CREATE TABLE statement
 */
const generateCreateTable_FIXED = (table) => {
  const { name, attributes = [], isJunctionTable = false } = table.data;

  if (attributes.length === 0) {
    return `-- Table ${name} has no columns\n`;
  }

  // Split attributes by type
  const regularColumns = attributes.filter(attr => !attr.isForeignKey);
  const foreignKeyColumns = attributes.filter(attr => attr.isForeignKey);
  let primaryKeys = attributes.filter(attr => attr.isPrimaryKey);

  // 🔧 Detect natural PK (if exists)
  const naturalPK = findNaturalPrimaryKey(foreignKeyColumns);

  // 🔧 Decide whether to add a surrogate key
  const needsSurrogateKey =
    foreignKeyColumns.length > 0 &&  // has FKs
    !isJunctionTable &&              // not a junction table
    !naturalPK;                      // no natural PK

  let sql = `CREATE TABLE ${name} (\n`;
  const allColumns = [];

  // 🔧 If a surrogate key is needed – add id SERIAL
  if (needsSurrogateKey) {
    allColumns.push(`    id SERIAL PRIMARY KEY`);
  }

  // 🔧 Handle table with no defined primary key
  if (primaryKeys.length === 0 && !needsSurrogateKey && !naturalPK) {
    sql += `    -- ⚠️ Warning: no primary key defined!\n`;
    sql += `    -- 🔧 Using the first attribute as a temporary primary key\n`;
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

  // Combine columns
  allColumns.push(...columnDefinitions, ...fkColumnDefinitions);

  // 🔧 Add PRIMARY KEY constraint
  if (naturalPK) {
    // ✅ Use natural PK (FK with cardinality='1')
    const pkColumns = naturalPK.map(fk => fk.name).join(', ');
    allColumns.push(`    PRIMARY KEY (${pkColumns})  -- Natural key from cardinality='1' FK`);
  } else if (!needsSurrogateKey && primaryKeys.length > 0) {
    // ✅ Use predefined PK
    const pkColumns = primaryKeys.map(pk => pk.name).join(', ');
    allColumns.push(`    PRIMARY KEY (${pkColumns})`);
  }
  // Otherwise: surrogate key already added above

  sql += allColumns.join(',\n');
  sql += '\n);\n';

  return sql;
};

/**
 * Example outputs
 */

// Example 1: table with FK cardinality='1' (like our table d)
const exampleTable1 = {
  data: {
    name: 'd',
    attributes: [
      { name: 'dvsvs', type: 'VARCHAR(255)', isForeignKey: false },
      { name: 'a_aa', type: 'VARCHAR(255)', isForeignKey: true, cardinality: '0..1', foreignKeyGroup: 'fk_a' },
      { name: 'b_ba', type: 'VARCHAR(255)', isForeignKey: true, cardinality: '1', foreignKeyGroup: 'fk_b', foreignKeyGroupIndex: 0 },
      { name: 'b_bb', type: 'VARCHAR(255)', isForeignKey: true, cardinality: '1', foreignKeyGroup: 'fk_b', foreignKeyGroupIndex: 1 },
      { name: 'c_cc', type: 'VARCHAR(255)', isForeignKey: true, cardinality: 'N', foreignKeyGroup: 'fk_c' }
    ],
    isJunctionTable: false
  }
};

console.log("Example 1: Relationship table with cardinality='1' (natural PK)");
console.log("========================================");
// Expected result:
// CREATE TABLE d (
//     dvsvs VARCHAR(255),
//     a_aa VARCHAR(255),              -- ✅ NULLABLE (cardinality='0..1')
//     b_ba VARCHAR(255) NOT NULL,     -- ✅ NOT NULL (cardinality='1')
//     b_bb VARCHAR(255) NOT NULL,     -- ✅ NOT NULL (cardinality='1')
//     c_cc VARCHAR(255) NOT NULL,     -- ✅ NOT NULL (cardinality='N')
//     PRIMARY KEY (b_ba, b_bb)        -- ✅ Natural key!
// );

// Example 2: junction table (M:N)
const exampleTable2 = {
  data: {
    name: 'Enrollment',
    attributes: [
      { name: 'student_id', type: 'INT', isForeignKey: true, cardinality: 'N', isPrimaryKey: true },
      { name: 'course_id', type: 'INT', isForeignKey: true, cardinality: 'N', isPrimaryKey: true },
      { name: 'enrollment_date', type: 'DATE', isForeignKey: false },
    ],
    isJunctionTable: true
  }
};

console.log("\nExample 2: Junction table (M:N)");
console.log("========================================");
// Expected:
// CREATE TABLE Enrollment (
//     enrollment_date DATE,
//     student_id INT NOT NULL,
//     course_id INT NOT NULL,
//     PRIMARY KEY (student_id, course_id)  -- ✅ Composite PK from isPrimaryKey
// );

// Example 3: table with FKs but no cardinality='1' (needs surrogate key)
const exampleTable3 = {
  data: {
    name: 'OrderItem',
    attributes: [
      { name: 'quantity', type: 'INT', isForeignKey: false },
      { name: 'order_id', type: 'INT', isForeignKey: true, cardinality: 'N' },
      { name: 'product_id', type: 'INT', isForeignKey: true, cardinality: 'N' }
    ],
    isJunctionTable: false
  }
};

console.log("\nExample 3: Table with FKs cardinality='N' (surrogate key)");
console.log("========================================");
// Expected:
// CREATE TABLE OrderItem (
//     id SERIAL PRIMARY KEY,          -- ✅ Surrogate key
//     quantity INT,
//     order_id INT NOT NULL,
//     product_id INT NOT NULL
// );

/**
 * Summary of corrected logic:
 *
 * 1. Junction table (isJunctionTable=true):
 *    ← Uses predefined isPrimaryKey (composite PK)
 *
 * 2. Relationship table with FK cardinality='1':
 *    ← Uses that FK as natural PK
 *    ← Example: table d in our case
 *
 * 3. Regular table with FKs but no cardinality='1':
 *    ← Adds a surrogate key (id SERIAL)
 *    ← Example: OrderItem
 *
 * 4. Independent entity without FKs:
 *    ← Uses predefined primary key
 *    ← Example: tables a, b, c
 */

module.exports = {
  findNaturalPrimaryKey,
  generateCreateTable_FIXED
};
