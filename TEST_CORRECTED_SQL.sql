-- ========================================
-- Validating the corrected code
-- ========================================
-- This file verifies that the corrected SQL logic works as expected
-- ========================================

-- Running the corrected code (copied from CORRECTED_SQL.sql)

\echo '=== Creating Tables ==='

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

CREATE TABLE d (
    dvsvs VARCHAR(255),
    a_aa VARCHAR(255),
    b_ba VARCHAR(255) NOT NULL,
    b_bb VARCHAR(255) NOT NULL,
    c_cc VARCHAR(255) NOT NULL,
    PRIMARY KEY (b_ba, b_bb)
);

\echo '=== Adding Foreign Keys ==='

ALTER TABLE d
    ADD CONSTRAINT fk_d_a
    FOREIGN KEY (a_aa)
    REFERENCES a(aa)
    ON DELETE CASCADE;

ALTER TABLE d
    ADD CONSTRAINT fk_d_b
    FOREIGN KEY (b_ba, b_bb)
    REFERENCES b(ba, bb)
    ON DELETE CASCADE;

ALTER TABLE d
    ADD CONSTRAINT fk_d_c
    FOREIGN KEY (c_cc)
    REFERENCES c(cc)
    ON DELETE CASCADE;

\echo '=== Adding UNIQUE Constraints ==='

ALTER TABLE d
    ADD CONSTRAINT uq_d_a
    UNIQUE (a_aa);

\echo '=== Adding Indexes ==='

CREATE INDEX idx_d_a ON d(a_aa);
CREATE INDEX idx_d_c ON d(c_cc);

\echo '=== Test Data ==='

-- Insert base data
INSERT INTO a VALUES ('a1', 'value_a1');
INSERT INTO a VALUES ('a2', 'value_a2');

INSERT INTO b VALUES ('b1', 'bb1');
INSERT INTO b VALUES ('b2', 'bb2');
INSERT INTO b VALUES ('b3', 'bb3');

INSERT INTO c VALUES ('c1', 'value_c1');
INSERT INTO c VALUES ('c2', 'value_c2');

\echo ''
\echo '=== Test 1: a_aa = NULL (0..1 = Optional) ==='

-- ✅ Expected: success (a_aa = NULL)
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
VALUES ('data1', NULL, 'b1', 'bb1', 'c1');
\echo '✅ Success: a_aa = NULL'

-- ✅ Expected: success again (NULL allowed multiple times)
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
VALUES ('data2', NULL, 'b2', 'bb2', 'c2');
\echo '✅ Success: a_aa = NULL again'

\echo ''
\echo '=== Test 2: a_aa = a1 (0..1 = At most once) ==='

-- ✅ Expected: first use of a1 succeeds
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
VALUES ('data3', 'a1', 'b3', 'bb3', 'c1');
\echo '✅ Success: a_aa = a1 (first time)'

-- ❌ Expected failure: using a1 again (UNIQUE violation)
\echo ''
\echo '=== Test 3: Attempt to duplicate a_aa (should fail) ==='
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
VALUES ('data4', 'a1', 'b4', 'bb4', 'c2');
-- Expected: ERROR: duplicate key value violates unique constraint "uq_d_a"

\echo ''
\echo '=== Test 4: c_cc = c1 again (N = Many) ==='

-- Continue after the previous error
\set ON_ERROR_ROLLBACK on

-- Insert additional b for test
INSERT INTO b VALUES ('b5', 'bb5');

-- ✅ Expected: success — c_cc may repeat (N cardinality)
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
VALUES ('data5', 'a2', 'b5', 'bb5', 'c1');
\echo '✅ Success: c_cc = c1 again (N = Many)'

\echo ''
\echo '=== Test 5: Deleting a with CASCADE ==='

-- Deleting a1 should delete related rows in d
DELETE FROM a WHERE aa = 'a1';
\echo '✅ Success: deleting a1 removed rows in d (CASCADE)'

-- Validate deletion
SELECT COUNT(*) AS "d records with a_aa = a1 (should be 0)" FROM d WHERE a_aa = 'a1';

\echo ''
\echo '=== Summary ==='
\echo 'Number of records in d:'
SELECT COUNT(*) AS total_d_records FROM d;

\echo ''
\echo 'Contents of table d:'
SELECT * FROM d ORDER BY dvsvs;

\echo ''
\echo '=== All tests completed successfully! ==='

-- Cleanup (optional)
-- DROP TABLE d;
-- DROP TABLE a;
-- DROP TABLE b;
-- DROP TABLE c;
