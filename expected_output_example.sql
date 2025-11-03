-- ========================================
-- דוגמה: מה הקוד הנוכחי אמור לייצר
-- ========================================
--
-- נתון ERD:
-- - Entity A (aa PK, ab)
-- - Entity B (ba PK, bb PK)  -- מפתח מורכב
-- - Entity C (cc PK, cd)
-- - Entity D (dvsvs)
--
-- קשרים:
-- - A→D: 0..1 (כל A מקושר ל-0 או 1 D)
-- - B→D: 1 (כל B מקושר לדיוק 1 D)
-- - C→D: N (כל C מקושר להרבה D)
--
-- ========================================

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

-- ✅ טבלה d עם מפתח סרוגט (id SERIAL PRIMARY KEY)
CREATE TABLE d (
    id SERIAL PRIMARY KEY,          -- ✅ מפתח סרוגט מאפשר FKs nullable
    dvsvs VARCHAR(255),
    a_aa VARCHAR(255),              -- ✅ nullable (ל-0..1)
    b_ba VARCHAR(255) NOT NULL,     -- ✅ NOT NULL (ל-1)
    b_bb VARCHAR(255) NOT NULL,     -- ✅ NOT NULL (ל-1)
    c_cc VARCHAR(255) NOT NULL      -- ✅ NOT NULL (ל-N)
);

-- ========================================
-- שלב 2: הוספת Foreign Keys
-- ========================================

-- FK ל-A עם קרדינליות 0..1
ALTER TABLE d
    ADD CONSTRAINT fk_d_a_1234567890  -- שם דינמי
    FOREIGN KEY (a_aa)
    REFERENCES a(aa)
    ON DELETE SET NULL;             -- ✅ אופציונלי → SET NULL

-- 🔑 Composite Foreign Key Group (2 columns)
-- FK ל-B עם קרדינליות 1
ALTER TABLE d
    ADD CONSTRAINT fk_d_b_1234567890  -- שם דינמי
    FOREIGN KEY (b_ba, b_bb)
    REFERENCES b(ba, bb)
    ON DELETE CASCADE;              -- ✅ חובה → CASCADE

-- FK ל-C עם קרדינליות N
ALTER TABLE d
    ADD CONSTRAINT fk_d_c_1234567890  -- שם דינמי
    FOREIGN KEY (c_cc)
    REFERENCES c(cc)
    ON DELETE RESTRICT;             -- ✅ רבים → RESTRICT

-- ========================================
-- שלב 3: UNIQUE Constraints (cardinality-based)
-- ========================================

-- 🔒 UNIQUE constraint for 0..1 cardinality
ALTER TABLE d
    ADD CONSTRAINT uq_d_a
    UNIQUE (a_aa);                  -- ✅ מבטיח "לכל היותר אחד"

-- 🔒 UNIQUE constraint for 1 cardinality
ALTER TABLE d
    ADD CONSTRAINT uq_d_b
    UNIQUE (b_ba, b_bb);            -- ✅ מבטיח "בדיוק אחד"

-- 🔓 אין UNIQUE ל-c_cc (קרדינליות N)

-- ========================================
-- שלב 4: אינדקסים לביצועים
-- ========================================

CREATE INDEX idx_d_a ON d(a_aa);
CREATE INDEX idx_d_b ON d(b_ba, b_bb);
CREATE INDEX idx_d_c ON d(c_cc);

-- ========================================
-- למה זה עובד נכון?
-- ========================================

-- ✅ קרדינליות 0..1 (A→D):
--    - a_aa הוא nullable (אפשר NULL = 0 קשרים)
--    - UNIQUE(a_aa) מבטיח שכל A מופיע לכל היותר פעם אחת
--    - ON DELETE SET NULL לא מוחק את D כשמוחקים A

-- ✅ קרדינליות 1 (B→D):
--    - b_ba, b_bb הם NOT NULL (חובה להיות קשר)
--    - UNIQUE(b_ba, b_bb) מבטיח שכל B מופיע בדיוק פעם אחת
--    - ON DELETE CASCADE מוחק את D כשמוחקים B (D תלוי ב-B)

-- ✅ קרדינליות N (C→D):
--    - c_cc הוא NOT NULL (חובה להיות קשר)
--    - אין UNIQUE → כל C יכול להופיע כמה פעמים שרוצים
--    - ON DELETE RESTRICT מונע מחיקת C אם יש D שמקושרים אליו

-- ========================================
-- דוגמאות הכנסת נתונים
-- ========================================

-- הכנסת נתונים בטבלאות האב
INSERT INTO a VALUES ('a1', 'data_a1');
INSERT INTO a VALUES ('a2', 'data_a2');
INSERT INTO b VALUES ('b1', 'b2');
INSERT INTO c VALUES ('c1', 'data_c1');

-- ✅ רשומה 1: a_aa=NULL (0 קשרים ל-A)
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
VALUES ('row1', NULL, 'b1', 'b2', 'c1');

-- ✅ רשומה 2: a_aa='a1' (1 קשר ל-A)
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
VALUES ('row2', 'a1', 'b1', 'b2', 'c1');  -- ❌ יכשל! b_ba,b_bb כבר בשימוש (UNIQUE)

-- תיקון: משנים את b_ba,b_bb
INSERT INTO b VALUES ('b3', 'b4');
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
VALUES ('row2', 'a1', 'b3', 'b4', 'c1');  -- ✅ עובד

-- ❌ רשומה 3: a_aa='a1' שוב - יכשל בגלל UNIQUE(a_aa)
INSERT INTO b VALUES ('b5', 'b6');
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
VALUES ('row3', 'a1', 'b5', 'b6', 'c1');
-- ERROR: duplicate key value violates unique constraint "uq_d_a"

-- ✅ רשומה 3 מתוקנת: a_aa='a2' (A שונה)
INSERT INTO d (dvsvs, a_aa, b_ba, b_bb, c_cc)
VALUES ('row3', 'a2', 'b5', 'b6', 'c1');  -- ✅ עובד

-- ✅ c_cc יכול להיות זהה - N cardinality
-- כל 3 הרשומות שלנו יכולות להצביע על אותו c1

-- ========================================
-- למה הסכימה שלך לא עובדת?
-- ========================================

-- הצעת השתמשת ב:
-- PRIMARY KEY (a_aa, b_ba, b_bb, c_cc)

-- הבעיה:
-- 1. כל עמודה ב-PRIMARY KEY חייבת להיות NOT NULL
-- 2. אבל a_aa צריך להיות nullable (ל-0..1 cardinality)
-- 3. → סתירה! לא יכול להיות גם ב-PK וגם nullable

-- דוגמה שנכשלת:
/*
CREATE TABLE d_wrong (
    dvsvs VARCHAR(255),
    a_aa VARCHAR(255),              -- רוצה להיות NULL
    b_ba VARCHAR(255) NOT NULL,
    b_bb VARCHAR(255) NOT NULL,
    c_cc VARCHAR(255) NOT NULL,
    PRIMARY KEY (a_aa, b_ba, b_bb, c_cc)  -- ❌ הופך את a_aa ל-NOT NULL!
);

-- ניסיון הכנסה עם NULL:
INSERT INTO d_wrong (dvsvs, a_aa, b_ba, b_bb, c_cc)
VALUES ('test', NULL, 'b1', 'b2', 'c1');
-- ERROR: null value in column "a_aa" violates not-null constraint
*/

-- ========================================
-- סיכום
-- ========================================

-- ✅ הקוד הנוכחי (עם id SERIAL PRIMARY KEY) עובד מצוין
-- ❌ הסכימה שלך (עם PK מורכב כולל a_aa) לא אפשרית
-- 💡 הפתרון: מפתח סרוגט (id SERIAL) שמאפשר FKs nullable
