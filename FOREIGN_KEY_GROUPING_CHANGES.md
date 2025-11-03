# Foreign Key Grouping Implementation

## Overview
This update implements proper grouping for composite foreign keys in the SQL Designer application. Previously, when a foreign key referenced a table with a composite primary key, each column was treated as an individual foreign key. Now, they are properly grouped together as a single composite foreign key constraint.

## Changes Made

### 1. ERD to DSD Converter (`Frontend/src/utils/erdToDsdConverter.js`)

#### `addForeignKeyToTable()` Function
- **Before**: Created separate FK attributes for each PK column, each with `referencedColumns: [single_column]`
- **After**: Creates FK attributes as a unified group with:
  - `foreignKeyGroup`: Unique identifier for the FK group
  - `foreignKeyGroupIndex`: Position of the column within the group (0, 1, 2, ...)
  - `foreignKeyGroupSize`: Total number of columns in the group
  - `referencedColumns`: Array of ALL referenced columns (shared across all FKs in the group)

**Example Output**:
```javascript
// Table: Orders referencing Persons (with composite PK: first_name, last_name)
attributes: [
  {
    name: "persons_first_name",
    type: "VARCHAR(255)",
    isForeignKey: true,
    references: "Persons",
    referencedColumns: ["first_name", "last_name"], // All columns
    foreignKeyGroup: "fk_orders_persons_1730650635123",
    foreignKeyGroupIndex: 0,
    foreignKeyGroupSize: 2
  },
  {
    name: "persons_last_name",
    type: "VARCHAR(255)",
    isForeignKey: true,
    references: "Persons",
    referencedColumns: ["first_name", "last_name"], // All columns
    foreignKeyGroup: "fk_orders_persons_1730650635123", // Same group ID
    foreignKeyGroupIndex: 1,
    foreignKeyGroupSize: 2
  }
]
```

#### `createJunctionTable()` Function
- Updated to use the same grouping mechanism for junction tables
- Each FK to a parent entity is now properly grouped

#### DSD Relationship Creation
- Modified to recognize FK groups and create ONE relationship edge per group instead of one per column
- Composite FKs are marked with `isComposite: true`

### 2. SQL Generator (`Frontend/src/utils/sqlGenerator.js`)

#### `generateForeignKeys()` Function (v4)
- **New grouping logic**: Groups FKs by `foreignKeyGroup` instead of just by `references`
- Sorts FKs within a group by `foreignKeyGroupIndex` to maintain correct column order
- Generates a single `ALTER TABLE ... ADD CONSTRAINT` statement per group
- Adds comment for composite FKs: `-- 🔑 Composite Foreign Key Group (N columns)`

**Example SQL Output**:
```sql
-- 🔑 Composite Foreign Key Group (2 columns)
ALTER TABLE Orders
    ADD CONSTRAINT fk_orders_persons_1730650635123
    FOREIGN KEY (persons_first_name, persons_last_name)
    REFERENCES Persons(first_name, last_name);
```

### 3. DSD Exporter (`Frontend/src/utils/dsdExporter.js`)

#### `enrichTableData()` Function
- Groups FKs for export by `foreignKeyGroup`
- Exports FK information showing which columns belong to composite groups
- Preserves grouping metadata in column information

#### HTML Export
- **New badges**:
  - `FK`: Single foreign key column (green)
  - `FK Group`: Composite foreign key column (orange)
  - Group indicator: `[1/2]`, `[2/2]` showing position within the group

**Example HTML Display**:
```
Column Name          | Badges              | Type
---------------------|---------------------|-------------
persons_first_name   | FK Group [1/2]      | VARCHAR(255)
persons_last_name    | FK Group [2/2]      | VARCHAR(255)
```

## Benefits

1. **Clarity**: It's now immediately clear which columns belong to the same foreign key constraint
2. **Correctness**: Matches standard SQL behavior where composite FKs are defined as a single constraint
3. **Better SQL Output**: Generated SQL correctly shows grouped constraints with proper comments
4. **Improved Exports**: HTML and JSON exports clearly indicate composite FK relationships
5. **Backward Compatible**: Old FKs without `foreignKeyGroup` still work via fallback logic

## Testing Recommendations

### Test Case 1: Composite Primary Key Reference
1. Create Entity A with composite PK: `(col1, col2)`
2. Create Entity B with relationship to Entity A (1:N)
3. Convert to DSD
4. **Expected Result**: Entity B has 2 FK columns with same `foreignKeyGroup` ID
5. **SQL Output**: Single `FOREIGN KEY (a_col1, a_col2) REFERENCES A(col1, col2)` constraint

### Test Case 2: Junction Table
1. Create Entity A with composite PK: `(a1, a2)`
2. Create Entity B with composite PK: `(b1, b2)`
3. Create M:N relationship between them
4. Convert to DSD
5. **Expected Result**: Junction table has 4 FK columns in 2 groups
6. **SQL Output**: Two composite FK constraints, one for each entity

### Test Case 3: HTML Export
1. Create entities with composite FKs as above
2. Export to HTML
3. **Expected Result**: FK columns show "FK Group" badge with position indicators like `[1/2]`

## Files Modified

1. `Frontend/src/utils/erdToDsdConverter.js`
   - `addForeignKeyToTable()` - Lines 51-112
   - `createJunctionTable()` - Lines 114-192
   - DSD relationship creation - Lines 299-355

2. `Frontend/src/utils/sqlGenerator.js`
   - `generateForeignKeys()` - Lines 104-211

3. `Frontend/src/utils/dsdExporter.js`
   - `enrichTableData()` - Lines 32-93
   - CSS styles - Added FK Group badge styling
   - HTML generation - Lines 335-352

## Migration Notes

- **No database migration needed**: This is a data model improvement, not a schema change
- **Existing projects**: Old FKs without grouping metadata will continue to work via fallback logic
- **New projects**: Will automatically use the new grouped FK system
