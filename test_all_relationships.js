/**
 * Comprehensive Relationship Testing
 * Tests all relationship types: 1:1, 1:N, 0..1:N, and M:N
 */

const testNodes = [
  // Entity: Department
  {
    id: 'entity_dept',
    type: 'entity',
    data: {
      name: 'Department',
      attributes: [
        { name: 'dept_id', type: 'INT', isPrimaryKey: true },
        { name: 'name', type: 'VARCHAR(255)', isPrimaryKey: false }
      ]
    },
    position: { x: 0, y: 0 }
  },

  // Entity: Manager (1:1 with Department)
  {
    id: 'entity_manager',
    type: 'entity',
    data: {
      name: 'Manager',
      attributes: [
        { name: 'manager_id', type: 'INT', isPrimaryKey: true },
        { name: 'name', type: 'VARCHAR(255)', isPrimaryKey: false }
      ]
    },
    position: { x: 200, y: 0 }
  },

  // Entity: Employee (1:N with Department, M:N with Project)
  {
    id: 'entity_employee',
    type: 'entity',
    data: {
      name: 'Employee',
      attributes: [
        { name: 'emp_id', type: 'INT', isPrimaryKey: true },
        { name: 'name', type: 'VARCHAR(255)', isPrimaryKey: false }
      ]
    },
    position: { x: 400, y: 0 }
  },

  // Entity: Project (M:N with Employee)
  {
    id: 'entity_project',
    type: 'entity',
    data: {
      name: 'Project',
      attributes: [
        { name: 'project_id', type: 'INT', isPrimaryKey: true },
        { name: 'title', type: 'VARCHAR(255)', isPrimaryKey: false }
      ]
    },
    position: { x: 600, y: 0 }
  },

  // Relationship 1: Department 1:1 Manager (each department has exactly one manager)
  {
    id: 'rel_dept_manager',
    type: 'relationship',
    data: {
      name: 'Manages',
      connections: [
        { entityId: 'entity_dept', entityName: 'Department', cardinality: '1' },
        { entityId: 'entity_manager', entityName: 'Manager', cardinality: '1' }
      ],
      attributes: []
    },
    position: { x: 100, y: 100 }
  },

  // Relationship 2: Department 1:N Employee (each employee belongs to one department)
  {
    id: 'rel_dept_employee',
    type: 'relationship',
    data: {
      name: 'WorksIn',
      connections: [
        { entityId: 'entity_dept', entityName: 'Department', cardinality: '1' },
        { entityId: 'entity_employee', entityName: 'Employee', cardinality: 'N' }
      ],
      attributes: []
    },
    position: { x: 300, y: 100 }
  },

  // Relationship 3: Employee M:N Project (many-to-many through Assignment)
  {
    id: 'rel_emp_project',
    type: 'relationship',
    data: {
      name: 'Assignment',
      connections: [
        { entityId: 'entity_employee', entityName: 'Employee', cardinality: 'N' },
        { entityId: 'entity_project', entityName: 'Project', cardinality: 'N' }
      ],
      attributes: [
        { name: 'role', type: 'VARCHAR(255)', isPrimaryKey: false },
        { name: 'hours', type: 'INT', isPrimaryKey: false }
      ]
    },
    position: { x: 500, y: 100 }
  }
];

import { generateSQL } from './Frontend/src/utils/sqlGenerator.js';

console.log('='.repeat(80));
console.log('Comprehensive Relationship Testing');
console.log('='.repeat(80));
console.log('\nRelationships:');
console.log('1. Department 1:1 Manager (each dept has exactly one manager)');
console.log('2. Department 1:N Employee (each employee in one department)');
console.log('3. Employee M:N Project (junction table: Assignment)');
console.log('\n' + '='.repeat(80));

const sql = generateSQL(testNodes);
console.log(sql);

console.log('\n' + '='.repeat(80));
console.log('Verification Summary:');
console.log('='.repeat(80));

let passCount = 0;
let totalTests = 0;

const runTest = (condition, message) => {
  totalTests++;
  if (condition) {
    console.log(`✅ ${message}`);
    passCount++;
  } else {
    console.log(`❌ ${message}`);
  }
};

// Test 1:1 relationship (Manager has FK to Department)
runTest(
  sql.includes('department_dept_id') &&
  sql.match(/Manager[\s\S]*?department_dept_id[\s\S]*?NOT NULL/),
  '1:1 - Manager has NOT NULL FK to Department'
);

runTest(
  sql.match(/ALTER TABLE Manager[\s\S]*?UNIQUE.*department_dept_id/),
  '1:1 - Manager has UNIQUE constraint on FK'
);

runTest(
  sql.match(/ALTER TABLE Manager[\s\S]*?REFERENCES Department[\s\S]*?ON DELETE RESTRICT/),
  '1:1 - Manager FK has ON DELETE RESTRICT (prevents orphaned managers)'
);

// Test 1:N relationship (Employee has FK to Department)
runTest(
  sql.includes('department_dept_id') &&
  sql.match(/Employee[\s\S]*?department_dept_id[\s\S]*?NOT NULL/),
  '1:N - Employee has NOT NULL FK to Department'
);

runTest(
  !sql.match(/UNIQUE.*employee.*department/) &&
  !sql.match(/uq_employee_department/),
  '1:N - Employee has NO UNIQUE on FK (allows many)'
);

runTest(
  sql.match(/ALTER TABLE Employee[\s\S]*?REFERENCES Department[\s\S]*?ON DELETE RESTRICT/),
  '1:N - Employee FK has ON DELETE RESTRICT'
);

// Test M:N relationship (Junction table: Assignment)
runTest(
  sql.includes('CREATE TABLE Assignment'),
  'M:N - Junction table "Assignment" created'
);

runTest(
  sql.match(/Assignment[\s\S]*?PRIMARY KEY \(.*employee.*,.*project.*\)/) ||
  sql.match(/Assignment[\s\S]*?PRIMARY KEY \(.*project.*,.*employee.*\)/),
  'M:N - Assignment has composite PK'
);

runTest(
  sql.match(/ALTER TABLE Assignment[\s\S]*?REFERENCES Employee[\s\S]*?ON DELETE CASCADE/),
  'M:N - Assignment FK to Employee has CASCADE'
);

runTest(
  sql.match(/ALTER TABLE Assignment[\s\S]*?REFERENCES Project[\s\S]*?ON DELETE CASCADE/),
  'M:N - Assignment FK to Project has CASCADE'
);

runTest(
  sql.includes('role') && sql.includes('hours'),
  'M:N - Assignment includes relationship attributes (role, hours)'
);

// Test indexes
const indexCount = (sql.match(/CREATE INDEX/g) || []).length;
runTest(
  indexCount >= 4, // dept->manager, dept->employee, assignment->employee, assignment->project
  `Indexes - Found ${indexCount} indexes (expected >= 4)`
);

console.log('\n' + '='.repeat(80));
console.log(`TOTAL: ${passCount}/${totalTests} tests passed`);
if (passCount === totalTests) {
  console.log('🎉 All tests passed!');
} else {
  console.log(`⚠️  ${totalTests - passCount} test(s) failed`);
}
console.log('='.repeat(80));
