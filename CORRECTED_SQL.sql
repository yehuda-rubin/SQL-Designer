-- ========================================
-- SQL Database Schema (CORRECTED)
-- Database: PostgreSQL
-- ========================================
-- תיקון: יישום נכון של קרדינליות מ-ERD
-- ========================================

-- ========================================
-- שלב 1: יצירת טבלאות
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

-- ✅ תיקון קריטי: טבלה d כטבלת קשר עם PK נכון
CREATE TABLE d (
    -- תכונת הקשר
    dvsvs VARCHAR(255),

    -- קשר a (0..1 "At most once") - אופציונלי וייחודי
    a_aa VARCHAR(255),  -- ✅ NULLABLE (לא NOT NULL!)

    -- קשר b (1 "Mandatory once") - חובה וייחודי
    b_ba VARCHAR(255) NOT NULL,
    b_bb VARCHAR(255) NOT NULL,

    -- קשר c (N "Many") - חובה, מרובה
    c_cc VARCHAR(255) NOT NULL,

    -- ✅ PK נכון: רק b (היחיד ש-Mandatory + Once)
    PRIMARY KEY (b_ba, b_bb)
);


-- ========================================
-- שלב 2: הוספת Foreign Keys
-- ========================================

-- קשר a (0..1) - CASCADE כי d תלויה לחלוטין
ALTER TABLE d
    ADD CONSTRAINT fk_d_a
    FOREIGN KEY (a_aa)
    REFERENCES a(aa)
    ON DELETE CASCADE;

-- 🔑 קשר b (1) - Composite FK - CASCADE כי d תלויה לחלוטין
ALTER TABLE d
    ADD CONSTRAINT fk_d_b
    FOREIGN KEY (b_ba, b_bb)
    REFERENCES b(ba, bb)
    ON DELETE CASCADE;

-- קשר c (N) - CASCADE כי d תלויה לחלוטין
ALTER TABLE d
    ADD CONSTRAINT fk_d_c
    FOREIGN KEY (c_cc)
    REFERENCES c(cc)
    ON DELETE CASCADE;


-- ========================================
-- שלב 3: UNIQUE Constraints (cardinality-based)
-- ========================================

-- ✅ UNIQUE על a_aa (0..1 "At most once")
-- מאפשר NULL, אבל אם קיים ערך - הוא ייחודי
ALTER TABLE d
    ADD CONSTRAINT uq_d_a
    UNIQUE (a_aa);

-- ❌ לא צריך UNIQUE על (b_ba, b_bb) - כבר PRIMARY KEY!
-- (PRIMARY KEY כבר מאכף UNIQUE אוטומטית)

-- ❌ לא צריך UNIQUE על c_cc - קרדינליות N (Many)


-- ========================================
-- שלב 4: אינדקסים לביצועים
-- ========================================

-- ✅ אינדקס על a_aa (למרות ש-UNIQUE יוצר אינדקס, נוסיף במפורש לבהירות)
CREATE INDEX idx_d_a ON d(a_aa);

-- ❌ לא צריך אינדקס על (b_ba, b_bb) - PRIMARY KEY יוצר אינדקס אוטומטית!

-- ✅ אינדקס על c_cc (cardinality N - צריך לביצועי JOIN)
CREATE INDEX idx_d_c ON d(c_cc);


-- ========================================
-- שלב 5: דוגמאות INSERT (אופציונלי)
-- ========================================

-- INSERT INTO a VALUES ('a1', 'value_ab');
-- INSERT INTO b VALUES ('b1', 'b1_val');
-- INSERT INTO c VALUES ('c1', 'value_cd');

-- דוגמאות INSERT לטבלה d:

-- ✅ חוקי: a_aa הוא NULL (0..1 = אופציונלי)
-- INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
-- VALUES ('data1', NULL, 'b1', 'b1_val', 'c1');

-- ✅ חוקי: a_aa קיים (אבל רק פעם אחת!)
-- INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
-- VALUES ('data2', 'a1', 'b1', 'b1_val', 'c1');

-- ❌ לא חוקי: לא יכול להיות שני d's עם אותו b (b הוא PK!)
-- INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
-- VALUES ('data3', 'a2', 'b1', 'b1_val', 'c2');  -- ERROR: duplicate key

-- ========================================
-- סיום
-- ========================================
