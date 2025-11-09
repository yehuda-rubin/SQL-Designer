-- ========================================
-- SQL Database Schema (CORRECTED)
-- Database: PostgreSQL
-- ========================================
-- Fix: proper implementation of cardinality from ERD
-- ========================================

-- ========================================
-- Step 1: Creating Tables
-- ========================================

CREATE TABLE a (
    aa VARCHAR(255),
    ab VARCHAR(255),
    PRIMARY KEY (aa)
);

CREATE TABLE c (
    cc VARCHAR(255),
    cd VARCHAR(255),
    PRIMARY KEY (cc)
);

CREATE TABLE b (
    ba VARCHAR(255),
    bb VARCHAR(255),
    PRIMARY KEY (ba, bb)
);

-- ✅ Critical fix: table d as a relationship table with the correct PK
CREATE TABLE d (
    -- Relationship attribute
    dvsvs VARCHAR(255),

    -- Relationship a (0..1 "At most once") - optional and unique
    a_aa VARCHAR(255),  -- ✅ NULLABLE (not NOT NULL!)

    -- Relationship b (1 "Mandatory once") - mandatory and unique
    b_ba VARCHAR(255) NOT NULL,
    b_bb VARCHAR(255) NOT NULL,

    -- Relationship c (N "Many") - mandatory, many
    c_cc VARCHAR(255) NOT NULL,

    -- ✅ Correct PK: only b (the only one that is Mandatory + Once)
    PRIMARY KEY (b_ba, b_bb)
);


-- ========================================
-- Step 2: Adding Foreign Keys
-- ========================================

-- Relationship a (0..1) - CASCADE because d fully depends on it
ALTER TABLE d
    ADD CONSTRAINT fk_d_a
    FOREIGN KEY (a_aa)
    REFERENCES a(aa)
    ON DELETE CASCADE;

-- 🔑 Relationship b (1) - composite FK - CASCADE because d fully depends on it
ALTER TABLE d
    ADD CONSTRAINT fk_d_b
    FOREIGN KEY (b_ba, b_bb)
    REFERENCES b(ba, bb)
    ON DELETE CASCADE;

-- Relationship c (N) - CASCADE because d fully depends on it
ALTER TABLE d
    ADD CONSTRAINT fk_d_c
    FOREIGN KEY (c_cc)
    REFERENCES c(cc)
    ON DELETE CASCADE;


-- ========================================
-- Step 3: UNIQUE Constraints (cardinality-based)
-- ========================================

-- ✅ UNIQUE on a_aa (0..1 "At most once")
-- Allows NULL, but if a value exists – it must be unique
ALTER TABLE d
    ADD CONSTRAINT uq_d_a
    UNIQUE (a_aa);

-- ❌ No need for UNIQUE on (b_ba, b_bb) – already the PRIMARY KEY!

-- ❌ No need for UNIQUE on c_cc – cardinality N (Many)


-- ========================================
-- Step 4: Indexes for performance
-- ========================================

-- ✅ Index on a_aa (although UNIQUE creates one automatically, added for clarity)
CREATE INDEX idx_d_a ON d(a_aa);

-- ❌ No need for index on (b_ba, b_bb) – PRIMARY KEY already creates one!

-- ✅ Index on c_cc (cardinality N – needed for JOIN performance)
CREATE INDEX idx_d_c ON d(c_cc);


-- ========================================
-- Step 5: INSERT Examples (optional)
-- ========================================

-- INSERT INTO a VALUES ('a1', 'value_ab');
-- INSERT INTO b VALUES ('b1', 'b1_val');
-- INSERT INTO c VALUES ('c1', 'value_cd');

-- Example INSERTs for table d:

-- ✅ Valid: a_aa is NULL (0..1 = optional)
-- INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
-- VALUES ('data1', NULL, 'b1', 'b1_val', 'c1');

-- ✅ Valid: a_aa exists (but only once!)
-- INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
-- VALUES ('data2', 'a1', 'b1', 'b1_val', 'c1');

-- ❌ Invalid: cannot have two d records with the same b (b is the PK!)
-- INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
-- VALUES ('data3', 'a2', 'b1', 'b1_val', 'c2');  -- ERROR: duplicate key

-- ========================================
-- End
-- ========================================
