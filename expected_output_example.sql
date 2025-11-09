-- ========================================
-- Example: What the current code is supposed to generate
-- ========================================
--
-- Given ERD:
-- - Entity A (aa PK, ab)
-- - Entity B (ba PK, bb PK)  -- composite key
-- - Entity C (cc PK, cd)
-- - Entity D (dvsvs)
--
-- Relationships:
-- - A←D: 0..1 (each A relates to 0 or 1 D)
-- - B←D: 1 (each B relates to exactly 1 D)
-- - C←D: N (each C relates to many D)
-- 
-- ======================================== 
 
-- ======================================== 
-- Step 1: Create Tables
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
 
-- ✅ Table d with surrogate key (id SERIAL PRIMARY KEY)
CREATE TABLE d ( 
    id SERIAL PRIMARY KEY,          -- ✅ surrogate key allows nullable FKs
    dvsvs VARCHAR(255), 
    a_aa VARCHAR(255),              -- ✅ nullable (for 0..1)
    b_ba VARCHAR(255) NOT NULL,     -- ✅ NOT NULL (for 1)
    b_bb VARCHAR(255) NOT NULL,     -- ✅ NOT NULL (for 1)
    c_cc VARCHAR(255) NOT NULL      -- ✅ NOT NULL (for N)
); 
 
-- ======================================== 
-- Step 2: Add Foreign Keys
-- ======================================== 
 
-- FK to A with cardinality 0..1
ALTER TABLE d 
    ADD CONSTRAINT fk_d_a_1234567890  -- dynamic name
    FOREIGN KEY (a_aa) 
    REFERENCES a(aa) 
    ON DELETE SET NULL;             -- ✅ optional → SET NULL 
 
-- 🔑 Composite Foreign Key Group (2 columns)
-- FK to B with cardinality 1
ALTER TABLE d 
    ADD CONSTRAINT fk_d_b_1234567890  -- dynamic name
    FOREIGN KEY (b_ba, b_bb) 
    REFERENCES b(ba, bb) 
    ON DELETE CASCADE;              -- ✅ mandatory → CASCADE 
 
-- FK to C with cardinality N
ALTER TABLE d 
    ADD CONSTRAINT fk_d_c_1234567890  -- dynamic name
    FOREIGN KEY (c_cc) 
    REFERENCES c(cc) 
    ON DELETE RESTRICT;             -- ✅ many → RESTRICT 
 
-- ======================================== 
-- Step 3: UNIQUE Constraints (cardinality-based)
-- ======================================== 
 
-- 🔒 UNIQUE constraint for 0..1 cardinality
ALTER TABLE d 
    ADD CONSTRAINT uq_d_a 
    UNIQUE (a_aa);                  -- ✅ enforces "at most once"
 
-- 🔒 UNIQUE constraint for 1 cardinality
ALTER TABLE d 
    ADD CONSTRAINT uq_d_b 
    UNIQUE (b_ba, b_bb);            -- ✅ enforces "exactly once"
 
-- 🔓 No UNIQUE for c_cc (N cardinality) 
 
-- ======================================== 
-- Step 4: Performance Indexes
-- ======================================== 
 
CREATE INDEX idx_d_a ON d(a_aa); 
CREATE INDEX idx_d_b ON d(b_ba, b_bb); 
CREATE INDEX idx_d_c ON d(c_cc); 
 
-- ======================================== 
-- Why does this work correctly?
-- ======================================== 
 
-- ✅ Cardinality 0..1 (A←D):
--    - a_aa is nullable (allows 0 relationships)
--    - UNIQUE(a_aa) ensures each A appears at most once
--    - ON DELETE SET NULL keeps D when A is deleted
 
-- ✅ Cardinality 1 (B←D):
--    - b_ba, b_bb are NOT NULL (must have exactly one relationship)
--    - UNIQUE(b_ba, b_bb) ensures each B appears exactly once
--    - ON DELETE CASCADE removes D when B is deleted
 
-- ✅ Cardinality N (C←D):
--    - c_cc is NOT NULL (must be related)
--    - No UNIQUE → C may appear multiple times
--    - ON DELETE RESTRICT prevents deleting C if D depends on it
 
-- ======================================== 
-- Example Inserts
-- ======================================== 
 
-- Insert into parent tables
INSERT INTO a VALUES ('a1', 'data_a1'); 
INSERT INTO a VALUES ('a2', 'data_a2'); 
INSERT INTO b VALUES ('b1', 'b2'); 
INSERT INTO c VALUES ('c1', 'data_c1'); 
 
-- ✅ Row 1: a_aa=NULL (0 relationships to A)
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc) 
VALUES ('row1', NULL, 'b1', 'b2', 'c1'); 
 
-- ✅ Row 2: a_aa='a1' (1 relationship to A)
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc) 
VALUES ('row2', 'a1', 'b1', 'b2', 'c1');  -- ❌ will fail! b_ba,b_bb already used (UNIQUE)
 
-- Fix: change b_ba,b_bb
INSERT INTO b VALUES ('b3', 'b4'); 
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc) 
VALUES ('row2', 'a1', 'b3', 'b4', 'c1');  -- ✅ works 
 
-- ❌ Row 3: a_aa='a1' again — fails due to UNIQUE(a_aa)
INSERT INTO b VALUES ('b5', 'b6'); 
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc) 
VALUES ('row3', 'a1', 'b5', 'b6', 'c1'); 
-- ERROR: duplicate key value violates unique constraint "uq_d_a" 
 
-- ✅ Corrected Row 3: a_aa='a2'
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc) 
VALUES ('row3', 'a2', 'b5', 'b6', 'c1');  -- ✅ works 
 
-- ✅ c_cc may repeat — N cardinality
-- All 3 rows can reference the same c1 
 
-- ======================================== 
-- Why your schema does NOT work?
-- ======================================== 
 
-- You proposed:
-- PRIMARY KEY (a_aa, b_ba, b_bb, c_cc)
 
-- Problem:
-- 1. Every PK column must be NOT NULL
-- 2. But a_aa must be NULLABLE (0..1 cardinality)
-- 3. → Contradiction! It cannot be both PK and NULLABLE
 
-- Failing example:
 /*
CREATE TABLE d_wrong (
    dvsvs VARCHAR(255),
    a_aa VARCHAR(255),              -- should be NULLABLE
    b_ba VARCHAR(255) NOT NULL,
    b_bb VARCHAR(255) NOT NULL,
    c_cc VARCHAR(255) NOT NULL,
    PRIMARY KEY (a_aa, b_ba, b_bb, c_cc)  -- ❌ forces a_aa to be NOT NULL!
);

-- Attempt insert with NULL:
INSERT INTO d_wrong (dvsvs, a_aa, b_ba, b_bb, c_cc)
VALUES ('test', NULL, 'b1', 'b2', 'c1');
-- ERROR: null value in column "a_aa" violates not-null constraint
*/
 
-- ========================================
-- Summary
-- ========================================

-- ✅ The current schema (with surrogate id SERIAL) works perfectly
-- ❌ Your schema (composite PK that includes a_aa) is not valid
-- 💡 Solution: surrogate key (id SERIAL) that allows nullable FKs
