/**
 * תיקון ללוגיקת יצירת טבלאות - מטפל בקרדינליות נכון
 *
 * הבעיה המקורית:
 * הקוד יוצר surrogate key (id SERIAL) לכל טבלה עם FKs שאינה junction table.
 * זה פגום כי טבלאות קשר עם קרדינליות מעורבת (0..1, 1, N) צריכות natural key.
 *
 * הפתרון:
 * זיהוי אוטומטי של FK עם cardinality='1' ושימוש בו כ-PK טבעי.
 */

/**
 * 🔧 זיהוי ה-PK הטבעי (Natural Key) לטבלת קשר
 * @param {Array} foreignKeyColumns - עמודות ה-FK
 * @returns {Array|null} - FK columns שיכולים לשמש כ-PK, או null
 */
const findNaturalPrimaryKey = (foreignKeyColumns) => {
  if (foreignKeyColumns.length === 0) return null;

  // מחפשים קבוצות FK עם cardinality='1' (Mandatory once)
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

  // מחפשים קבוצת FK עם cardinality='1'
  for (const [groupKey, group] of fkGroups) {
    if (group.cardinality === '1') {
      // ✅ מצאנו! זה ה-PK הטבעי
      return group.columns;
    }
  }

  // אם אין FK עם cardinality='1', אין PK טבעי
  return null;
};

/**
 * 🔧 יוצר SQL statement ליצירת טבלה (גרסה מתוקנת)
 * @param {Object} table - אובייקט הטבלה
 * @returns {String} - CREATE TABLE statement
 */
const generateCreateTable_FIXED = (table) => {
  const { name, attributes = [], isJunctionTable = false } = table.data;

  if (attributes.length === 0) {
    return `-- טבלה ${name} ללא עמודות\n`;
  }

  // פילוח עמודות לפי סוג
  const regularColumns = attributes.filter(attr => !attr.isForeignKey);
  const foreignKeyColumns = attributes.filter(attr => attr.isForeignKey);
  let primaryKeys = attributes.filter(attr => attr.isPrimaryKey);

  // 🔧 זיהוי ה-PK הטבעי (אם קיים)
  const naturalPK = findNaturalPrimaryKey(foreignKeyColumns);

  // 🔧 החלטה: האם צריך surrogate key?
  const needsSurrogateKey =
    foreignKeyColumns.length > 0 &&  // יש FKs
    !isJunctionTable &&              // לא junction table
    !naturalPK;                      // ואין PK טבעי

  let sql = `CREATE TABLE ${name} (\n`;
  const allColumns = [];

  // 🔧 אם צריך surrogate key - מוסיפים id SERIAL
  if (needsSurrogateKey) {
    allColumns.push(`    id SERIAL PRIMARY KEY`);
  }

  // 🔧 טיפול בטבלה ללא מפתח ראשי מוגדר
  if (primaryKeys.length === 0 && !needsSurrogateKey && !naturalPK) {
    sql += `    -- ⚠️ אזהרה: לא הוגדר מפתח ראשי!\n`;
    sql += `    -- 🔧 משתמש בתכונה הראשונה כמפתח ראשי זמני\n`;
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

  // 🔧 הוספת PRIMARY KEY constraint
  if (naturalPK) {
    // ✅ משתמשים ב-natural PK (FK עם cardinality='1')
    const pkColumns = naturalPK.map(fk => fk.name).join(', ');
    allColumns.push(`    PRIMARY KEY (${pkColumns})  -- Natural key from cardinality='1' FK`);
  } else if (!needsSurrogateKey && primaryKeys.length > 0) {
    // ✅ משתמשים ב-PK מוגדר מראש
    const pkColumns = primaryKeys.map(pk => pk.name).join(', ');
    allColumns.push(`    PRIMARY KEY (${pkColumns})`);
  }
  // אחרת: surrogate key כבר נוסף למעלה

  sql += allColumns.join(',\n');
  sql += '\n);\n';

  return sql;
};

/**
 * דוגמאות לתוצאות
 */

// דוגמה 1: טבלה עם FK cardinality='1' (כמו טבלה d שלנו)
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

console.log("דוגמה 1: טבלת קשר עם cardinality='1' (natural PK)");
console.log("========================================");
// תוצאה צפויה:
// CREATE TABLE d (
//     dvsvs VARCHAR(255),
//     a_aa VARCHAR(255),              -- ✅ NULLABLE (cardinality='0..1')
//     b_ba VARCHAR(255) NOT NULL,     -- ✅ NOT NULL (cardinality='1')
//     b_bb VARCHAR(255) NOT NULL,     -- ✅ NOT NULL (cardinality='1')
//     c_cc VARCHAR(255) NOT NULL,     -- ✅ NOT NULL (cardinality='N')
//     PRIMARY KEY (b_ba, b_bb)        -- ✅ Natural key!
// );

// דוגמה 2: junction table (M:N)
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

console.log("\nדוגמה 2: Junction table (M:N)");
console.log("========================================");
// תוצאה צפויה:
// CREATE TABLE Enrollment (
//     enrollment_date DATE,
//     student_id INT NOT NULL,
//     course_id INT NOT NULL,
//     PRIMARY KEY (student_id, course_id)  -- ✅ Composite PK מ-isPrimaryKey
// );

// דוגמה 3: טבלה עם FKs אך ללא cardinality='1' (צריך surrogate key)
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

console.log("\nדוגמה 3: טבלה עם FKs cardinality='N' (surrogate key)");
console.log("========================================");
// תוצאה צפויה:
// CREATE TABLE OrderItem (
//     id SERIAL PRIMARY KEY,          -- ✅ Surrogate key
//     quantity INT,
//     order_id INT NOT NULL,
//     product_id INT NOT NULL
// );

/**
 * סיכום הלוגיקה המתוקנת:
 *
 * 1. Junction table (isJunctionTable=true):
 *    → משתמש ב-isPrimaryKey מוגדר מראש (composite PK)
 *
 * 2. טבלת קשר עם FK cardinality='1':
 *    → משתמש ב-FK הזה כ-natural PK
 *    → דוגמה: טבלה d במקרה שלנו
 *
 * 3. טבלה רגילה עם FKs אך ללא cardinality='1':
 *    → מוסיף surrogate key (id SERIAL)
 *    → דוגמה: OrderItem
 *
 * 4. ישות עצמאית ללא FKs:
 *    → משתמש ב-PK מוגדר מראש
 *    → דוגמה: טבלאות a, b, c
 */

module.exports = {
  findNaturalPrimaryKey,
  generateCreateTable_FIXED
};
