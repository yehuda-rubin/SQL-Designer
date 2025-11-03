# Cardinality Constraints Implementation

## Overview
This update adds comprehensive cardinality-based constraints to the SQL generator, ensuring that foreign key relationships properly reflect their cardinality (0..1, 1, N) through appropriate SQL constraints.

## Changes Made

### 1. Store Cardinality in FK Attributes (`erdToDsdConverter.js`)

**Added `cardinality` property to FK attributes:**
```javascript
{
  name: "b_ba",
  type: "VARCHAR(255)",
  isForeignKey: true,
  references: "b",
  cardinality: "1",  // ✅ NEW: stores original cardinality
  isNullable: false
}
```

This allows the SQL generator to make decisions based on the relationship's cardinality.

---

### 2. Surrogate Keys for Tables with FKs (`sqlGenerator.js`)

**Problem:** When FKs are part of the PRIMARY KEY and one FK is optional (0..1), the PK cannot be NULL.

**Solution:** Add `id SERIAL PRIMARY KEY` to tables with foreign keys (except junction tables):

```sql
-- Before:
CREATE TABLE d (
    a_aa VARCHAR(255),
    b_ba VARCHAR(255),
    PRIMARY KEY (a_aa, b_ba)  -- ❌ a_aa can't be NULL
);

-- After:
CREATE TABLE d (
    id SERIAL PRIMARY KEY,    -- ✅ Surrogate key
    a_aa VARCHAR(255),        -- ✅ Can be NULL now
    b_ba VARCHAR(255) NOT NULL
);
```

**Implementation:**
- Detects if `foreignKeyColumns.length > 0 && !isJunctionTable`
- Adds `id SERIAL PRIMARY KEY` as first column
- Removes FK columns from PRIMARY KEY constraint

---

### 3. NOT NULL Based on Cardinality

**Logic:**
- `'0..1'` → `NULL` (optional, at most one)
- `'1'` → `NOT NULL` (mandatory, exactly one)
- `'N'` → `NOT NULL` (mandatory, one-to-many)

**Implementation in `generateCreateTable()`:**
```javascript
const isRequired = attr.cardinality === '1' || attr.cardinality === 'N';
const nullable = isRequired ? ' NOT NULL' : '';
```

**Example:**
```sql
CREATE TABLE d (
    id SERIAL PRIMARY KEY,
    a_aa VARCHAR(255),          -- '0..1' → NULL
    b_ba VARCHAR(255) NOT NULL, -- '1' → NOT NULL
    c_cc VARCHAR(255) NOT NULL  -- 'N' → NOT NULL
);
```

---

### 4. UNIQUE Constraints Based on Cardinality

**Logic:**
- `'0..1'` or `'1'` → Add UNIQUE constraint (at most one relationship)
- `'N'` → No UNIQUE (many relationships allowed)

**Implementation in `generateUniqueConstraints()`:**
```javascript
if (cardinality === '0..1' || cardinality === '1') {
  sql += `ALTER TABLE ${name} ADD CONSTRAINT ${constraintName} UNIQUE (${columns});\n`;
}
```

**Example:**
```sql
-- 🔒 UNIQUE constraint for 0..1 cardinality
ALTER TABLE d
    ADD CONSTRAINT uq_d_a
    UNIQUE (a_aa);  -- Each A can appear at most once
```

---

### 5. ON DELETE Behaviors Based on Cardinality

**Logic:**
- `'0..1'` → `ON DELETE SET NULL` (optional, don't cascade)
- `'1'` → `ON DELETE CASCADE` (mandatory, dependent relationship)
- `'N'` → `ON DELETE RESTRICT` (prevent deletion of parent with children)

**Implementation in `generateForeignKeys()`:**
```javascript
if (cardinality === '0..1') {
  onDelete = 'ON DELETE SET NULL';
} else if (cardinality === '1') {
  onDelete = 'ON DELETE CASCADE';
} else if (cardinality === 'N') {
  onDelete = 'ON DELETE RESTRICT';
}
```

**Example:**
```sql
ALTER TABLE d
    ADD CONSTRAINT fk_d_a
    FOREIGN KEY (a_aa)
    REFERENCES a(aa)
    ON DELETE SET NULL;  -- Optional: deletion of A doesn't delete D

ALTER TABLE d
    ADD CONSTRAINT fk_d_b
    FOREIGN KEY (b_ba, b_bb)
    REFERENCES b(ba, bb)
    ON DELETE CASCADE;  -- Mandatory: deletion of B deletes D

ALTER TABLE d
    ADD CONSTRAINT fk_d_c
    FOREIGN KEY (c_cc)
    REFERENCES c(cc)
    ON DELETE RESTRICT;  -- One-to-many: can't delete C if D exists
```

---

### 6. Performance Indexes on FKs

**New function `generateIndexes()`** creates indexes on all foreign key columns for query performance:

```sql
CREATE INDEX idx_d_a ON d(a_aa);
CREATE INDEX idx_d_b ON d(b_ba, b_bb);
CREATE INDEX idx_d_c ON d(c_cc);
```

---

## Complete Example

### Input (ERD relationships):
- A → D: 0..1 (optional, at most one)
- B → D: 1 (mandatory, exactly one)
- C → D: N (one-to-many)

### Generated SQL:

```sql
-- ========================================
-- שלב 1: יצירת טבלאות
-- ========================================

CREATE TABLE a (
    aa VARCHAR(255) PRIMARY KEY,
    ab VARCHAR(255)
);

CREATE TABLE b (
    ba VARCHAR(255),
    bb VARCHAR(255),
    PRIMARY KEY (ba, bb)
);

CREATE TABLE c (
    cc VARCHAR(255) PRIMARY KEY,
    cd VARCHAR(255)
);

CREATE TABLE d (
    id SERIAL PRIMARY KEY,          -- ✅ Surrogate key
    dvsvs VARCHAR(255),
    a_aa VARCHAR(255),              -- ✅ NULL (optional)
    b_ba VARCHAR(255) NOT NULL,     -- ✅ NOT NULL (mandatory)
    b_bb VARCHAR(255) NOT NULL,     -- ✅ NOT NULL (mandatory)
    c_cc VARCHAR(255) NOT NULL      -- ✅ NOT NULL (mandatory)
);

-- ========================================
-- שלב 2: הוספת Foreign Keys
-- ========================================

ALTER TABLE d
    ADD CONSTRAINT fk_d_a_...
    FOREIGN KEY (a_aa)
    REFERENCES a(aa)
    ON DELETE SET NULL;             -- ✅ Optional behavior

-- 🔑 Composite Foreign Key Group (2 columns)
ALTER TABLE d
    ADD CONSTRAINT fk_d_b_...
    FOREIGN KEY (b_ba, b_bb)
    REFERENCES b(ba, bb)
    ON DELETE CASCADE;              -- ✅ Mandatory behavior

ALTER TABLE d
    ADD CONSTRAINT fk_d_c_...
    FOREIGN KEY (c_cc)
    REFERENCES c(cc)
    ON DELETE RESTRICT;             -- ✅ One-to-many behavior

-- ========================================
-- שלב 3: UNIQUE Constraints (cardinality-based)
-- ========================================

-- 🔒 UNIQUE constraint for 0..1 cardinality
ALTER TABLE d
    ADD CONSTRAINT uq_d_a
    UNIQUE (a_aa);                  -- ✅ At most one

-- ========================================
-- שלב 4: אינדקסים לביצועים
-- ========================================

CREATE INDEX idx_d_a ON d(a_aa);
CREATE INDEX idx_d_b ON d(b_ba, b_bb);
CREATE INDEX idx_d_c ON d(c_cc);
```

---

## Benefits

1. ✅ **Correct cardinality enforcement**: SQL constraints match ERD semantics
2. ✅ **Optional relationships work**: Surrogate keys allow nullable FKs
3. ✅ **Data integrity**: UNIQUE constraints prevent duplicate relationships
4. ✅ **Referential integrity**: ON DELETE behaviors prevent orphaned data
5. ✅ **Better performance**: Indexes on all FK columns
6. ✅ **Clear documentation**: Comments explain each constraint's purpose

---

## Files Modified

1. `Frontend/src/utils/erdToDsdConverter.js` (1 line):
   - Added `cardinality` property to FK attributes

2. `Frontend/src/utils/sqlGenerator.js` (206 lines changed):
   - `generateCreateTable()`: Added surrogate key logic and cardinality-based NOT NULL
   - `generateForeignKeys()`: Added ON DELETE behaviors
   - `generateUniqueConstraints()`: Rewritten to use cardinality
   - `generateIndexes()`: New function for performance indexes
   - `generateSQL()`: Updated to call all new functions

---

## Testing Checklist

- [ ] Test 0..1 relationship: NULL allowed, UNIQUE enforced, ON DELETE SET NULL
- [ ] Test 1 relationship: NOT NULL enforced, UNIQUE enforced, ON DELETE CASCADE
- [ ] Test N relationship: NOT NULL enforced, no UNIQUE, ON DELETE RESTRICT
- [ ] Test composite FK: All columns grouped in single constraint
- [ ] Test junction tables: No surrogate key, composite PK preserved
- [ ] Verify indexes created on all FK columns
