# ON DELETE Behavior Specification

## עיקרון מנחה
**התאמה לוגית לסוג הקשר** - כל סוג קשר מקבל את ההתנהגות המתאימה לו מבחינה מקצועית.

---

## 1. קשרי 1:N (יחיד לרבים) → ON DELETE RESTRICT

### דוגמה
```
Department (1) ←── Employee (N)
```

### SQL שנוצר
```sql
CREATE TABLE Employee (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    department_dept_id INTEGER NOT NULL  -- חובה להשתייך למחלקה
);

ALTER TABLE Employee
    ADD CONSTRAINT fk_employee_department
    FOREIGN KEY (department_dept_id)
    REFERENCES Department(dept_id)
    ON DELETE RESTRICT;  -- ⛔ מניעת מחיקה
```

### התנהגות
```sql
-- ניסיון למחוק מחלקה שיש לה עובדים:
DELETE FROM Department WHERE dept_id = 1;

-- תוצאה:
-- ERROR: update or delete on table "department" violates foreign key constraint
-- DETAIL: Key (dept_id)=(1) is still referenced from table "employee"
```

### נימוק מקצועי
אסור למחוק מחלקה אם עדיין משויכים אליה עובדים. האפליקציה חייבת:
1. להעביר את העובדים למחלקה אחרת, או
2. לפטר אותם (למחוק אותם מהטבלה)
3. רק אז ניתן למחוק את המחלקה

זוהי **שלמות נתונים בסיסית** - מניעת יתומים (orphan records).

---

## 2. קשרי M:N (רבים לרבים) → ON DELETE CASCADE

### דוגמה
```
Student (M) ←── Enrollment (Junction) ───→ Course (N)
```

### SQL שנוצר
```sql
CREATE TABLE Enrollment (
    student_student_id INTEGER,
    course_course_id INTEGER,
    enrollment_date DATE,
    grade DECIMAL(10,2),
    PRIMARY KEY (student_student_id, course_course_id)
);

ALTER TABLE Enrollment
    ADD CONSTRAINT fk_enrollment_student
    FOREIGN KEY (student_student_id)
    REFERENCES Student(student_id)
    ON DELETE CASCADE;  -- ✅ מחיקה אוטומטית

ALTER TABLE Enrollment
    ADD CONSTRAINT fk_enrollment_course
    FOREIGN KEY (course_course_id)
    REFERENCES Course(course_id)
    ON DELETE CASCADE;  -- ✅ מחיקה אוטומטית
```

### התנהגות
```sql
-- מחיקת סטודנט:
DELETE FROM Student WHERE student_id = 123;

-- תוצאה:
-- ✅ הסטודנט נמחק
-- ✅ כל ההרשמות שלו ב-Enrollment נמחקות אוטומטית
-- ✅ הקורסים עצמם נשארים קיימים
```

### נימוק מקצועי
הרשומה ב-Enrollment (ההרשמה) היא **רק קשר**. אין לה קיום עצמאי ללא הסטודנט והקורס.

**סכנה בגישה אחרת**: אם היינו משתמשים ב-RESTRICT, לעולם לא היינו יכולים למחוק סטודנט שנרשם אי פעם לקורס. זו **טעות עיצובית חמורה** שתנעל את הנתונים.

---

## 3. קשרי 1:1 (יחיד ליחיד) → ON DELETE RESTRICT

### דוגמה
```
Department (1) ←──→ Manager (1)
```

### SQL שנוצר
```sql
CREATE TABLE Manager (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    department_dept_id INTEGER NOT NULL,  -- כל מנהל משויך למחלקה אחת
    UNIQUE (department_dept_id)           -- כל מחלקה יכולה להיות רק למנהל אחד
);

ALTER TABLE Manager
    ADD CONSTRAINT fk_manager_department
    FOREIGN KEY (department_dept_id)
    REFERENCES Department(dept_id)
    ON DELETE RESTRICT;  -- ⛔ מניעת מחיקה
```

### התנהגות
```sql
-- ניסיון למחוק מחלקה שיש לה מנהל:
DELETE FROM Department WHERE dept_id = 1;

-- תוצאה:
-- ERROR: update or delete on table "department" violates foreign key constraint
-- DETAIL: Key (dept_id)=(1) is still referenced from table "manager"
```

### נימוק מקצועי
מחיקת מחלקה **לא אמורה למחוק אוטומטית את המנהל** (שהוא לרוב גם רשומת Employee בפני עצמה).

**הכלל**: אי אפשר למחוק מחלקה שיש לה מנהל. האפליקציה צריכה קודם:
1. להסיר את הקישור (לעדכן את Manager להצביע למחלקה אחרת), או
2. להעביר את המנהל לתפקיד אחר
3. רק אז לאפשר את מחיקת המחלקה

זו **בחירה מודעת בבטיחות על פני אוטומציה**.

---

## 4. קשרי 0..1 (אופציונלי) → ON DELETE SET NULL

### דוגמה
```
Person (1) ←── Passport (0..1)  // אדם יכול להיות ללא דרכון
```

### SQL שנוצר
```sql
CREATE TABLE Person (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    passport_id INTEGER  -- אופציונלי, יכול להיות NULL
);

ALTER TABLE Person
    ADD CONSTRAINT fk_person_passport
    FOREIGN KEY (passport_id)
    REFERENCES Passport(passport_id)
    ON DELETE SET NULL;  -- 🔄 איפוס לNULL
```

### התנהגות
```sql
-- מחיקת דרכון:
DELETE FROM Passport WHERE passport_id = 456;

-- תוצאה:
-- ✅ הדרכון נמחק
-- ✅ passport_id ב-Person מתאפס ל-NULL
-- ✅ האדם עצמו נשאר קיים במערכת
```

### נימוק מקצועי
קיומו של ה-Person **אינו תלוי** בקיומו של ה-Passport. אם הדרכון נמחק או מבוטל, האדם עדיין קיים.

זו **הלוגיקה המדויקת למערכת יחסים אופציונלית**.

---

## 5. טבלת השוואה מלאה

| סוג קשר | ON DELETE | NULL? | UNIQUE? | דוגמה | נימוק |
|---------|-----------|-------|---------|-------|-------|
| **1:N** | RESTRICT | NOT NULL | ❌ | Department → Employees | מניעת מחיקת parent עם children |
| **M:N** | CASCADE | N/A | ❌ | Student ↔ Course | קשר בלבד, אין קיום עצמאי |
| **1:1** | RESTRICT | NOT NULL | ✅ | Department ↔ Manager | בטיחות על פני אוטומציה |
| **0..1** | SET NULL | NULL | ✅ | Person ↔ Passport | קשר אופציונלי |

---

## 6. שגיאות PostgreSQL - דוגמאות

### RESTRICT Error
```
ERROR:  update or delete on table "department" violates foreign key constraint "fk_employee_department" on table "employee"
DETAIL:  Key (dept_id)=(1) is still referenced from table "employee".
```

**פתרון**: טפל ברשומות התלויות לפני המחיקה.

### SET NULL עם NOT NULL Column
```
ERROR:  update or delete on table "passport" violates foreign key constraint "fk_person_passport" on table "person"
DETAIL:  Key (passport_id)=(456) is still referenced from table "person".
```

**פתרון**: הגדר את העמודה כ-NULLABLE אם משתמשים ב-SET NULL.

---

## 7. עקרונות תכנון

### ✅ עשה
- השתמש ב-RESTRICT כברירת מחדל (בטיחות)
- השתמש ב-CASCADE רק ל-junction tables (M:N)
- השתמש ב-SET NULL רק לקשרים אופציונליים (0..1)
- תן הודעות שגיאה ברורות למפתחים

### ❌ אל תעשה
- אל תשתמש ב-CASCADE באופן גורף (סכנת אובדן נתונים)
- אל תשתמש ב-RESTRICT ל-junction tables (נעילת נתונים)
- אל תשתמש ב-SET NULL לעמודות NOT NULL
- אל תתעלם מהודעות שגיאת FK

---

## 8. תוצאות בדיקות

### Test 1:1 Relationship
```bash
$ node test_all_relationships.js | grep "1:1"
✅ 1:1 - Manager has NOT NULL FK to Department
✅ 1:1 - Manager has UNIQUE constraint on FK
✅ 1:1 - Manager FK has ON DELETE RESTRICT (prevents orphaned managers)
```

### Test 1:N Relationship
```bash
$ node test_all_relationships.js | grep "1:N"
✅ 1:N - Employee has NOT NULL FK to Department
✅ 1:N - Employee has NO UNIQUE on FK (allows many)
✅ 1:N - Employee FK has ON DELETE RESTRICT
```

### Test M:N Relationship
```bash
$ node test_many_to_many.js | grep "CASCADE"
✅ ON DELETE CASCADE on junction table FKs (both sides)
```

---

## סיכום

המערכת מיישמת **אסטרטגיית ON DELETE מקצועית** המבוססת על עקרונות שלמות נתונים:

1. **בטיחות קודם כל** - ברירת מחדל RESTRICT
2. **גמישות בקשרים** - CASCADE ל-junction tables בלבד
3. **אופציונליות נכונה** - SET NULL לקשרים אופציונליים
4. **שגיאות ברורות** - PostgreSQL מספקת מידע מפורט

זה מאזן בין **מניעת אובדן נתונים** לבין **שימושיות בפועל**.
