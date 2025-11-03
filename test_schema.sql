-- Testing the user's proposed schema
-- Issue: a_aa is in PRIMARY KEY but needs to be nullable for 0..1 cardinality

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

-- User's proposed schema:
CREATE TABLE d (
    dvsvs VARCHAR(255),
    a_aa VARCHAR(255),              -- Should be nullable for 0..1 cardinality
    b_ba VARCHAR(255) NOT NULL,
    b_bb VARCHAR(255) NOT NULL,
    c_cc VARCHAR(255) NOT NULL,
    PRIMARY KEY (a_aa, b_ba, b_bb, c_cc),  -- ❌ PROBLEM: PK makes a_aa NOT NULL!
    FOREIGN KEY (a_aa) REFERENCES a(aa),
    FOREIGN KEY (b_ba, b_bb) REFERENCES b(ba, bb),
    FOREIGN KEY (c_cc) REFERENCES c(cc),
    UNIQUE (a_aa),          -- For 0..1 cardinality
    UNIQUE (b_ba, b_bb)     -- For 1..1 cardinality
);

-- The issue: In PostgreSQL, PRIMARY KEY columns are implicitly NOT NULL
-- So a_aa CANNOT be NULL, which violates the 0..1 cardinality requirement

-- Test insertion with NULL a_aa:
-- INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc) VALUES ('test', NULL, 'b1', 'b2', 'c1');
-- This will FAIL because a_aa is part of PRIMARY KEY
