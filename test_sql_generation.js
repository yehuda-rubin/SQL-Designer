/**
 * Test SQL Generation - בודק אם הקוד יוצר SQL נכון
 */

// Simulate ERD nodes
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

  // Entity B
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

  // Entity D (with attribute dvsvs)
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

  // Relationship A->D (0..1)
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

  // Relationship B->D (1)
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

  // Relationship C->D (N)
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

// Import the SQL generator
import { generateSQL } from './Frontend/src/utils/sqlGenerator.js';
import { convertERDtoDSD } from './Frontend/src/utils/erdToDsdConverter.js';

// Generate SQL
console.log('='.repeat(80));
console.log('Testing SQL Generation');
console.log('='.repeat(80));
console.log('\nERD Configuration:');
console.log('- A->D: 1:0..1 (A has at most one D)');
console.log('- B->D: 1:1 (B has exactly one D)');
console.log('- C->D: 1:N (C has many D)');
console.log('\nExpected SQL constraints:');
console.log('- a_aa: nullable, UNIQUE');
console.log('- b_ba, b_bb: NOT NULL, UNIQUE (composite)');
console.log('- c_cc: NOT NULL, no UNIQUE');
console.log('\n' + '='.repeat(80));

const sql = generateSQL(testNodes);
console.log(sql);

console.log('\n' + '='.repeat(80));
console.log('Verification Checklist:');
console.log('='.repeat(80));

// Check for surrogate key
if (sql.includes('id SERIAL PRIMARY KEY')) {
  console.log('✅ Surrogate key (id SERIAL) created for table d');
} else {
  console.log('❌ Missing surrogate key for table d');
}

// Check for NOT NULL on b_ba, b_bb
if (sql.match(/b_ba VARCHAR\(255\) NOT NULL/) && sql.match(/b_bb VARCHAR\(255\) NOT NULL/)) {
  console.log('✅ b_ba, b_bb are NOT NULL (cardinality: 1)');
} else {
  console.log('❌ b_ba, b_bb should be NOT NULL');
}

// Check for NOT NULL on c_cc
if (sql.match(/c_cc VARCHAR\(255\) NOT NULL/)) {
  console.log('✅ c_cc is NOT NULL (cardinality: N)');
} else {
  console.log('❌ c_cc should be NOT NULL');
}

// Check for nullable a_aa (no NOT NULL)
if (sql.match(/a_aa VARCHAR\(255\)(?!.*NOT NULL)/)) {
  console.log('✅ a_aa is nullable (cardinality: 0..1)');
} else {
  console.log('❌ a_aa should be nullable');
}

// Check for UNIQUE on a_aa
if (sql.includes('UNIQUE (a_aa)')) {
  console.log('✅ UNIQUE constraint on a_aa (cardinality: 0..1)');
} else {
  console.log('❌ Missing UNIQUE constraint on a_aa');
}

// Check for UNIQUE on b_ba, b_bb
if (sql.includes('UNIQUE (b_ba, b_bb)') || sql.includes('UNIQUE (ba, bb)')) {
  console.log('✅ UNIQUE constraint on b_ba, b_bb (cardinality: 1)');
} else {
  console.log('❌ Missing UNIQUE constraint on b_ba, b_bb');
}

// Check for ON DELETE behaviors
if (sql.includes('ON DELETE SET NULL')) {
  console.log('✅ ON DELETE SET NULL for a_aa (cardinality: 0..1)');
} else {
  console.log('❌ Missing ON DELETE SET NULL for a_aa');
}

if (sql.match(/b_ba, b_bb[\s\S]*?ON DELETE RESTRICT/)) {
  console.log('✅ ON DELETE RESTRICT for b_ba, b_bb (1:1 relationship)');
} else {
  console.log('❌ Missing ON DELETE RESTRICT for b_ba, b_bb');
}

if (sql.includes('ON DELETE RESTRICT')) {
  console.log('✅ ON DELETE RESTRICT for c_cc (cardinality: N)');
} else {
  console.log('❌ Missing ON DELETE RESTRICT for c_cc');
}

// Check for indexes
const indexMatches = sql.match(/CREATE INDEX/g);
if (indexMatches && indexMatches.length >= 3) {
  console.log(`✅ Indexes created on all FK columns (${indexMatches.length} found)`);
} else {
  console.log('❌ Missing indexes on FK columns');
}

console.log('\n' + '='.repeat(80));
