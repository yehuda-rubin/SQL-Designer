-- ========================================
-- Schema Comparison: Current Implementation vs User's Proposal
-- ========================================

-- ========================================
-- Approach 1: Current Implementation (with surrogate key)
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
    id SERIAL PRIMARY KEY,          -- ✅ Surrogate key allows nullable FKs
    dvsvs VARCHAR(255),
    a_aa VARCHAR(255),              -- ✅ Can be NULL for 0..1 cardinality
    b_ba VARCHAR(255) NOT NULL,     -- ✅ NOT NULL for 1 cardinality
    b_bb VARCHAR(255) NOT NULL,
    c_cc VARCHAR(255) NOT NULL      -- ✅ NOT NULL for N cardinality
);

ALTER TABLE d
    ADD CONSTRAINT fk_d_a
    FOREIGN KEY (a_aa) REFERENCES a(aa)
    ON DELETE SET NULL;             -- ✅ 0..1: optional

ALTER TABLE d
    ADD CONSTRAINT fk_d_b
    FOREIGN KEY (b_ba, b_bb) REFERENCES b(ba, bb)
    ON DELETE CASCADE;              -- ✅ 1: mandatory

ALTER TABLE d
    ADD CONSTRAINT fk_d_c
    FOREIGN KEY (c_cc) REFERENCES c(cc)
    ON DELETE RESTRICT;             -- ✅ N: many

-- ✅ UNIQUE constraints enforce cardinality
ALTER TABLE d ADD CONSTRAINT uq_d_a UNIQUE (a_aa);          -- 0..1: at most one
ALTER TABLE d ADD CONSTRAINT uq_d_b UNIQUE (b_ba, b_bb);    -- 1: exactly one

CREATE INDEX idx_d_a ON d(a_aa);
CREATE INDEX idx_d_b ON d(b_ba, b_bb);
CREATE INDEX idx_d_c ON d(c_cc);

-- ========================================
-- Test Case: Can we insert with NULL a_aa?
-- ========================================

INSERT INTO a VALUES ('a1', 'test');
INSERT INTO b VALUES ('b1', 'b2');
INSERT INTO c VALUES ('c1', 'test');

-- ✅ This works - a_aa can be NULL
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
VALUES ('data1', NULL, 'b1', 'b2', 'c1');

-- ✅ This works - a_aa has a value
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
VALUES ('data2', 'a1', 'b1', 'b2', 'c1');  -- ❌ Wait, this violates UNIQUE(b_ba, b_bb)!

DROP TABLE d;
DROP TABLE a, b, c;

-- ========================================
-- Approach 2: User's Proposal (composite PK without surrogate key)
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
    dvsvs VARCHAR(255),
    a_aa VARCHAR(255),              -- Wants to be nullable but...
    b_ba VARCHAR(255) NOT NULL,
    b_bb VARCHAR(255) NOT NULL,
    c_cc VARCHAR(255) NOT NULL,
    PRIMARY KEY (a_aa, b_ba, b_bb, c_cc),  -- ❌ Makes a_aa implicitly NOT NULL!
    FOREIGN KEY (a_aa) REFERENCES a(aa),
    FOREIGN KEY (b_ba, b_bb) REFERENCES b(ba, bb),
    FOREIGN KEY (c_cc) REFERENCES c(cc),
    UNIQUE (a_aa),
    UNIQUE (b_ba, b_bb)
);

CREATE INDEX idx_d_a ON d(a_aa);
CREATE INDEX idx_d_b ON d(b_ba, b_bb);
CREATE INDEX idx_d_c ON d(c_cc);

-- ========================================
-- Test Case: Can we insert with NULL a_aa?
-- ========================================

INSERT INTO a VALUES ('a1', 'test');
INSERT INTO b VALUES ('b1', 'b2');
INSERT INTO c VALUES ('c1', 'test');

-- ❌ This FAILS - a_aa is part of PRIMARY KEY, so it CANNOT be NULL
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
VALUES ('data1', NULL, 'b1', 'b2', 'c1');
-- ERROR: null value in column "a_aa" violates not-null constraint

-- ========================================
-- Approach 3: Alternative - Composite PK excluding nullable FK
-- ========================================

DROP TABLE d;

CREATE TABLE d (
    dvsvs VARCHAR(255),
    a_aa VARCHAR(255),              -- ✅ Can be NULL
    b_ba VARCHAR(255) NOT NULL,
    b_bb VARCHAR(255) NOT NULL,
    c_cc VARCHAR(255) NOT NULL,
    PRIMARY KEY (b_ba, b_bb, c_cc), -- ✅ PK only includes NOT NULL FKs
    FOREIGN KEY (a_aa) REFERENCES a(aa),
    FOREIGN KEY (b_ba, b_bb) REFERENCES b(ba, bb),
    FOREIGN KEY (c_cc) REFERENCES c(cc),
    UNIQUE (a_aa),                  -- 0..1 cardinality
    UNIQUE (b_ba, b_bb)             -- 1..1 cardinality
);

CREATE INDEX idx_d_a ON d(a_aa);
CREATE INDEX idx_d_b ON d(b_ba, b_bb);
CREATE INDEX idx_d_c ON d(c_cc);

-- ✅ Now this works!
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
VALUES ('data1', NULL, 'b1', 'b2', 'c1');

-- ========================================
-- Summary
-- ========================================

-- Current Implementation:
-- ✅ Pros: Consistent surrogate key, allows all nullable FKs
-- ❌ Cons: Extra id column, loses semantic PK

-- User's Proposal (as written):
-- ❌ Problem: PRIMARY KEY includes nullable column (impossible in PostgreSQL)

-- Alternative Approach 3:
-- ✅ Pros: No surrogate key, composite PK with semantic meaning
-- ⚠️  Cons: PK excludes the nullable FK (less semantic), what if all FKs are optional?
