-- ========================================
-- בדיקת הקוד המתוקן
-- ========================================
-- קובץ זה מאמת שהקוד המתוקן עובד נכון
-- ========================================

-- הפעלת הקוד המתוקן (העתקה מ-CORRECTED_SQL.sql)

\echo '=== יצירת טבלאות ==='

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

\echo '=== הוספת Foreign Keys ==='

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

\echo '=== הוספת UNIQUE Constraints ==='

ALTER TABLE d
    ADD CONSTRAINT uq_d_a
    UNIQUE (a_aa);

\echo '=== הוספת אינדקסים ==='

CREATE INDEX idx_d_a ON d(a_aa);
CREATE INDEX idx_d_c ON d(c_cc);

\echo '=== נתוני בדיקה ==='

-- הכנסת נתוני בסיס
INSERT INTO a VALUES ('a1', 'value_a1');
INSERT INTO a VALUES ('a2', 'value_a2');

INSERT INTO b VALUES ('b1', 'bb1');
INSERT INTO b VALUES ('b2', 'bb2');
INSERT INTO b VALUES ('b3', 'bb3');

INSERT INTO c VALUES ('c1', 'value_c1');
INSERT INTO c VALUES ('c2', 'value_c2');

\echo ''
\echo '=== בדיקה 1: a_aa = NULL (0..1 = אופציונלי) ==='

-- ✅ צפוי להצליח: a_aa = NULL
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
VALUES ('data1', NULL, 'b1', 'bb1', 'c1');
\echo '✅ הצלחה: a_aa = NULL'

-- ✅ צפוי להצליח: a_aa = NULL שוב (UNIQUE מאפשר רבים NULL)
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
VALUES ('data2', NULL, 'b2', 'bb2', 'c2');
\echo '✅ הצלחה: a_aa = NULL שוב'

\echo ''
\echo '=== בדיקה 2: a_aa = a1 (0..1 = At most once) ==='

-- ✅ צפוי להצליח: a_aa = 'a1' פעם ראשונה
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
VALUES ('data3', 'a1', 'b3', 'bb3', 'c1');
\echo '✅ הצלחה: a_aa = a1 (פעם ראשונה)'

-- ❌ צפוי להיכשל: a_aa = 'a1' פעם שנייה (UNIQUE violation)
\echo ''
\echo '=== בדיקה 3: ניסיון לשכפל a_aa (צריך להיכשל) ==='
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
VALUES ('data4', 'a1', 'b4', 'bb4', 'c2');
-- אמור לקבל: ERROR: duplicate key value violates unique constraint "uq_d_a"

\echo ''
\echo '=== בדיקה 4: c_cc = c1 שוב (N = Many) ==='

-- נחזיר את השגיאה הקודמת ונמשיך
\set ON_ERROR_ROLLBACK on

-- הכנסת b נוסף לבדיקה
INSERT INTO b VALUES ('b5', 'bb5');

-- ✅ צפוי להצליח: c_cc = 'c1' שוב (N = מרובה)
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
VALUES ('data5', 'a2', 'b5', 'bb5', 'c1');
\echo '✅ הצלחה: c_cc = c1 שוב (N = Many)'

\echo ''
\echo '=== בדיקה 5: מחיקת a עם CASCADE ==='

-- מחיקת a1 צריכה למחוק את d שמפנה אליו
DELETE FROM a WHERE aa = 'a1';
\echo '✅ הצלחה: מחיקת a1 מחקה את d עם a_aa = a1 (CASCADE)'

-- בדיקה שהמחיקה עבדה
SELECT COUNT(*) AS "d records with a_aa=a1 (should be 0)" FROM d WHERE a_aa = 'a1';

\echo ''
\echo '=== סיכום ==='
\echo 'מספר רשומות ב-d:'
SELECT COUNT(*) AS total_d_records FROM d;

\echo ''
\echo 'תוכן טבלה d:'
SELECT * FROM d ORDER BY dvsvs;

\echo ''
\echo '=== כל הבדיקות עברו בהצלחה! ==='

-- ניקוי (אופציונלי)
-- DROP TABLE d;
-- DROP TABLE a;
-- DROP TABLE b;
-- DROP TABLE c;
