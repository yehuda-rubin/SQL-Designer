/**
 * Test Direct SQL Generation
 * Validates SQL generated directly from the functions
 */

import { generateSQL } from './Frontend/src/utils/sqlGenerator.js';

// Example ERD data - A, B, C, D with different cardinalities
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
  // Meaning: Each A can be linked to 0 or 1 D
  // Therefore D receives FK to A with cardinality 0..1
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
  // Meaning: Each B is linked to exactly 1 D, and each D to exactly 1 B
  // Therefore D receives FK to B with cardinality 1
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
  // Meaning: Each C can be linked to many D
  // Therefore D receives FK to C with cardinality N
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
console.log('SQL Generation Test');
console.log('='.repeat(80));
console.log('\nERD Structure:'); 
console.log('- A←D: 0..1 (each A linked to at most one D)'); 
console.log('- B←D: 1 (each B linked to exactly one D)'); 
console.log('- C←D: N (each C linked to many D)'); 
console.log('\nExpected SQL behavior:'); 
console.log('- a_aa: nullable (no NOT NULL), with UNIQUE');
console.log('- b_ba, b_bb: NOT NULL, with composite UNIQUE');
console.log('- c_cc: NOT NULL, without UNIQUE');
console.log('\n' + '='.repeat(80) + '\n');

try {
  const sql = generateSQL(testNodes);
  console.log(sql);

  console.log('\n' + '='.repeat(80));
  console.log('Validation:');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  // Test 1: Surrogate key
  if (sql.includes('id SERIAL PRIMARY KEY')) {
    console.log('✅ Surrogate key (id SERIAL PRIMARY KEY) exists in table d');
    passed++;
  } else {
    console.log('❌ Surrogate key missing in table d');
    failed++;
  }

  // Test 2: a_aa nullable
  if (sql.match(/a_aa VARCHAR\(255\)(?![^,\n]*NOT NULL)/)) {
    console.log('✅ a_aa is nullable (no NOT NULL)');
    passed++;
  } else {
    console.log('❌ a_aa should be nullable');
    failed++;
  }

  // Test 3: b_ba, b_bb NOT NULL
  if (sql.includes('b_ba VARCHAR(255) NOT NULL') && sql.includes('b_bb VARCHAR(255) NOT NULL')) {
    console.log('✅ b_ba and b_bb are NOT NULL');
    passed++;
  } else {
    console.log('❌ b_ba and b_bb must be NOT NULL');
    failed++;
  }

  // Test 4: c_cc NOT NULL
  if (sql.includes('c_cc VARCHAR(255) NOT NULL')) {
    console.log('✅ c_cc is NOT NULL');
    passed++;
  } else {
    console.log('❌ c_cc must be NOT NULL');
    failed++;
  }

  // Test 5: UNIQUE on a_aa
  if (sql.includes('UNIQUE (a_aa)')) {
    console.log('✅ UNIQUE constraint exists on a_aa');
    passed++;
  } else {
    console.log('❌ UNIQUE constraint missing on a_aa');
    failed++;
  }

  // Test 6: UNIQUE on (b_ba, b_bb)
  if (sql.match(/UNIQUE \(b_ba, b_bb\)/)) {
    console.log('✅ UNIQUE constraint exists on (b_ba, b_bb)');
    passed++;
  } else {
    console.log('❌ UNIQUE constraint missing on (b_ba, b_bb)');
    failed++;
  }

  // Test 7: No UNIQUE on c_cc
  const uniqueConstraints = sql.match(/UNIQUE \([^)]*c_cc[^)]*\)/g) || [];
  const onlyCccUnique =
    uniqueConstraints.some(c => c === 'UNIQUE (c_cc)' || c === 'UNIQUE(c_cc)');
  if (!onlyCccUnique) {
    console.log('✅ No UNIQUE constraint on c_cc (correct for N cardinality)');
    passed++;
  } else {
    console.log('❌ c_cc should not have a standalone UNIQUE constraint');
    failed++;
  }

  // Test 8: ON DELETE SET NULL
  if (sql.includes('ON DELETE SET NULL')) {
    console.log('✅ ON DELETE SET NULL exists (for 0..1 cardinality)');
    passed++;
  } else {
    console.log('❌ ON DELETE SET NULL missing');
    failed++;
  }

  // Test 9: ON DELETE CASCADE
  if (sql.includes('ON DELETE CASCADE')) {
    console.log('✅ ON DELETE CASCADE exists (for 1 cardinality)');
    passed++;
  } else {
    console.log('❌ ON DELETE CASCADE missing');
    failed++;
  }

  // Test 10: ON DELETE RESTRICT
  if (sql.includes('ON DELETE RESTRICT')) {
    console.log('✅ ON DELETE RESTRICT exists (for N cardinality)');
    passed++;
  } else {
    console.log('❌ ON DELETE RESTRICT missing');
    failed++;
  }

  // Test 11: Indexes
  const indexCount = (sql.match(/CREATE INDEX/g) || []).length;
  if (indexCount >= 3) {
    console.log(`✅ Indexes created (${indexCount} found)`);
    passed++;
  } else {
    console.log(`❌ Missing indexes (${indexCount} found, expected at least 3)`);
    failed++;
  }

  console.log('\n' + '='.repeat(80));
  console.log(`Summary: ${passed} ✅  |  ${failed} ❌`);
  console.log('='.repeat(80));

  if (failed === 0) {
    console.log('\n🎉 All tests passed! SQL generation is correct.');
  } else {
    console.log('\n⚠️  Some checks failed.');
  }

} catch (error) {
  console.error('Error running the test:', error.message);
  console.error(error.stack);
}
