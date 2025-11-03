/**
 * Test Direct SQL Generation
 * בודק את ה-SQL שנוצר ישירות מהפונקציות
 */

import { generateSQL } from './Frontend/src/utils/sqlGenerator.js';

// נתוני ERD לדוגמה - A, B, C, D עם קרדינליות שונות
const testNodes = [
  // Entity A
  {
    id: 'entity_a',
    type: 'entity',
    data: {
      name: 'a',
      attributes: [
        { name: 'aa', type: 'VARCHAR(255)', isPrimaryKey: true },
        { name: 'ab', type: 'VARCHAR(255)', isPrimaryKey: false }
      ]
    },
    position: { x: 0, y: 0 }
  },

  // Entity B (composite PK)
  {
    id: 'entity_b',
    type: 'entity',
    data: {
      name: 'b',
      attributes: [
        { name: 'ba', type: 'VARCHAR(255)', isPrimaryKey: true },
        { name: 'bb', type: 'VARCHAR(255)', isPrimaryKey: true }
      ]
    },
    position: { x: 100, y: 0 }
  },

  // Entity C
  {
    id: 'entity_c',
    type: 'entity',
    data: {
      name: 'c',
      attributes: [
        { name: 'cc', type: 'VARCHAR(255)', isPrimaryKey: true },
        { name: 'cd', type: 'VARCHAR(255)', isPrimaryKey: false }
      ]
    },
    position: { x: 200, y: 0 }
  },

  // Entity D
  {
    id: 'entity_d',
    type: 'entity',
    data: {
      name: 'd',
      attributes: [
        { name: 'dvsvs', type: 'VARCHAR(255)', isPrimaryKey: false }
      ]
    },
    position: { x: 300, y: 0 }
  },

  // Relationship: A --(1)-- <R_A_D> --(0..1)-- D
  // משמעות: כל A יכול להיות מקושר ל-0 או 1 D
  // לכן D מקבל FK ל-A עם cardinality 0..1
  {
    id: 'rel_a_d',
    type: 'relationship',
    data: {
      name: 'R_A_D',
      connections: [
        { entityId: 'entity_a', entityName: 'a', cardinality: '1' },
        { entityId: 'entity_d', entityName: 'd', cardinality: '0..1' }
      ],
      attributes: []
    },
    position: { x: 150, y: 100 }
  },

  // Relationship: B --(1)-- <R_B_D> --(1)-- D
  // משמעות: כל B מקושר לדיוק 1 D, וכל D מקושר לדיוק 1 B
  // לכן D מקבל FK ל-B עם cardinality 1
  {
    id: 'rel_b_d',
    type: 'relationship',
    data: {
      name: 'R_B_D',
      connections: [
        { entityId: 'entity_b', entityName: 'b', cardinality: '1' },
        { entityId: 'entity_d', entityName: 'd', cardinality: '1' }
      ],
      attributes: []
    },
    position: { x: 250, y: 100 }
  },

  // Relationship: C --(1)-- <R_C_D> --(N)-- D
  // משמעות: כל C יכול להיות מקושר להרבה D
  // לכן D מקבל FK ל-C עם cardinality N
  {
    id: 'rel_c_d',
    type: 'relationship',
    data: {
      name: 'R_C_D',
      connections: [
        { entityId: 'entity_c', entityName: 'c', cardinality: '1' },
        { entityId: 'entity_d', entityName: 'd', cardinality: 'N' }
      ],
      attributes: []
    },
    position: { x: 350, y: 100 }
  }
];

console.log('='.repeat(80));
console.log('בדיקת יצירת SQL');
console.log('='.repeat(80));
console.log('\nתצורת ERD:');
console.log('- A→D: 0..1 (לכל A יש לכל היותר 1 D)');
console.log('- B→D: 1 (לכל B יש בדיוק 1 D)');
console.log('- C→D: N (לכל C יש הרבה D)');
console.log('\nמה אמור להיווצר:');
console.log('- a_aa: nullable (בלי NOT NULL), עם UNIQUE');
console.log('- b_ba, b_bb: NOT NULL, עם UNIQUE (מורכב)');
console.log('- c_cc: NOT NULL, בלי UNIQUE');
console.log('\n' + '='.repeat(80) + '\n');

try {
  const sql = generateSQL(testNodes);
  console.log(sql);

  console.log('\n' + '='.repeat(80));
  console.log('בדיקת תקינות:');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  // Test 1: Surrogate key
  if (sql.includes('id SERIAL PRIMARY KEY')) {
    console.log('✅ יש מפתח סרוגט (id SERIAL PRIMARY KEY) בטבלה d');
    passed++;
  } else {
    console.log('❌ חסר מפתח סרוגט בטבלה d');
    failed++;
  }

  // Test 2: a_aa nullable
  if (sql.match(/a_aa VARCHAR\(255\)(?![^,\n]*NOT NULL)/)) {
    console.log('✅ a_aa הוא nullable (בלי NOT NULL)');
    passed++;
  } else {
    console.log('❌ a_aa צריך להיות nullable');
    failed++;
  }

  // Test 3: b_ba, b_bb NOT NULL
  if (sql.includes('b_ba VARCHAR(255) NOT NULL') && sql.includes('b_bb VARCHAR(255) NOT NULL')) {
    console.log('✅ b_ba ו-b_bb הם NOT NULL');
    passed++;
  } else {
    console.log('❌ b_ba ו-b_bb צריכים להיות NOT NULL');
    failed++;
  }

  // Test 4: c_cc NOT NULL
  if (sql.includes('c_cc VARCHAR(255) NOT NULL')) {
    console.log('✅ c_cc הוא NOT NULL');
    passed++;
  } else {
    console.log('❌ c_cc צריך להיות NOT NULL');
    failed++;
  }

  // Test 5: UNIQUE on a_aa
  if (sql.includes('UNIQUE (a_aa)')) {
    console.log('✅ יש UNIQUE constraint על a_aa');
    passed++;
  } else {
    console.log('❌ חסר UNIQUE constraint על a_aa');
    failed++;
  }

  // Test 6: UNIQUE on b_ba, b_bb
  if (sql.match(/UNIQUE \(b_ba, b_bb\)/)) {
    console.log('✅ יש UNIQUE constraint על (b_ba, b_bb)');
    passed++;
  } else {
    console.log('❌ חסר UNIQUE constraint על (b_ba, b_bb)');
    failed++;
  }

  // Test 7: No UNIQUE on c_cc (should not have its own UNIQUE)
  const uniqueConstraints = sql.match(/UNIQUE \([^)]*c_cc[^)]*\)/g) || [];
  const onlyCccUnique = uniqueConstraints.some(constraint =>
    constraint === 'UNIQUE (c_cc)' || constraint === 'UNIQUE(c_cc)'
  );
  if (!onlyCccUnique) {
    console.log('✅ אין UNIQUE constraint על c_cc (נכון ל-N cardinality)');
    passed++;
  } else {
    console.log('❌ לא צריך להיות UNIQUE constraint על c_cc בלבד');
    failed++;
  }

  // Test 8: ON DELETE SET NULL for a_aa
  if (sql.includes('ON DELETE SET NULL')) {
    console.log('✅ יש ON DELETE SET NULL (לקרדינליות 0..1)');
    passed++;
  } else {
    console.log('❌ חסר ON DELETE SET NULL');
    failed++;
  }

  // Test 9: ON DELETE CASCADE
  if (sql.includes('ON DELETE CASCADE')) {
    console.log('✅ יש ON DELETE CASCADE (לקרדינליות 1)');
    passed++;
  } else {
    console.log('❌ חסר ON DELETE CASCADE');
    failed++;
  }

  // Test 10: ON DELETE RESTRICT
  if (sql.includes('ON DELETE RESTRICT')) {
    console.log('✅ יש ON DELETE RESTRICT (לקרדינליות N)');
    passed++;
  } else {
    console.log('❌ חסר ON DELETE RESTRICT');
    failed++;
  }

  // Test 11: Indexes
  const indexCount = (sql.match(/CREATE INDEX/g) || []).length;
  if (indexCount >= 3) {
    console.log(`✅ נוצרו אינדקסים (${indexCount} נמצאו)`);
    passed++;
  } else {
    console.log(`❌ חסרים אינדקסים (נמצאו ${indexCount}, צריך לפחות 3)`);
    failed++;
  }

  console.log('\n' + '='.repeat(80));
  console.log(`סיכום: ${passed} ✅  |  ${failed} ❌`);
  console.log('='.repeat(80));

  if (failed === 0) {
    console.log('\n🎉 כל הבדיקות עברו בהצלחה! הקוד עובד נכון.');
  } else {
    console.log('\n⚠️  יש בעיות שצריך לתקן.');
  }

} catch (error) {
  console.error('שגיאה בהרצת הבדיקה:', error.message);
  console.error(error.stack);
}
