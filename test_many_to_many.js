/**
 * Test Many-to-Many Relationships
 * Tests M:N relationships and creation of junction tables
 */

// Simulate ERD nodes with M:N relationship
const testNodes = [
  // Entity: Student
  {
    id: 'entity_student',
    type: 'entity',
    data: {
      name: 'Student',
      attributes: [
        { name: 'student_id', type: 'INT', isPrimaryKey: true },
        { name: 'name', type: 'VARCHAR(255)', isPrimaryKey: false }
      ]
    },
    position: { x: 0, y: 0 }
  },

  // Entity: Course
  {
    id: 'entity_course',
    type: 'entity',
    data: {
      name: 'Course',
      attributes: [
        { name: 'course_id', type: 'INT', isPrimaryKey: true },
        { name: 'title', type: 'VARCHAR(255)', isPrimaryKey: false }
      ]
    },
    position: { x: 300, y: 0 }
  },

  // Relationship: Student N:N Course (Enrollment)
  {
    id: 'rel_enrollment',
    type: 'relationship',
    data: {
      name: 'Enrollment',
      connections: [
        { entityId: 'entity_student', entityName: 'Student', cardinality: 'N' },
        { entityId: 'entity_course', entityName: 'Course', cardinality: 'N' }
      ],
      attributes: [
        { name: 'enrollment_date', type: 'DATE', isPrimaryKey: false },
        { name: 'grade', type: 'DECIMAL', isPrimaryKey: false }
      ]
    },
    position: { x: 150, y: 100 }
  }
];

// Import generators
import { generateSQL } from './Frontend/src/utils/sqlGenerator.js';
import { convertERDtoDSD } from './Frontend/src/utils/erdToDsdConverter.js';

console.log('='.repeat(80));
console.log('Testing Many-to-Many (M:N) Relationship');
console.log('='.repeat(80));
console.log('\nERD Configuration:');
console.log('- Student (student_id: PK)');
console.log('- Course (course_id: PK)');
console.log('- Enrollment: Student N:N Course');
console.log('  - enrollment_date: DATE');
console.log('  - grade: DECIMAL');
console.log('\n' + '='.repeat(80));

// First, check DSD conversion
const dsd = convertERDtoDSD(testNodes);
console.log('\nDSD Conversion Results:');
console.log('Number of tables:', dsd.tables.length);
dsd.tables.forEach(table => {
  console.log(`\nTable: ${table.data.name}`);
  console.log(`  Is Junction Table: ${table.data.isJunctionTable || false}`);
  console.log(`  Attributes:`);
  table.data.attributes.forEach(attr => {
    const flags = [];
    if (attr.isPrimaryKey) flags.push('PK');
    if (attr.isForeignKey) flags.push('FK');
    if (attr.cardinality) flags.push(`cardinality: ${attr.cardinality}`);
    console.log(`    - ${attr.name} ${attr.type} ${flags.join(', ')}`);
  });
});

console.log('\n' + '='.repeat(80));

// Generate SQL
const sql = generateSQL(testNodes);
console.log(sql);

console.log('\n' + '='.repeat(80));
console.log('Verification Checklist for M:N:');
console.log('='.repeat(80));

// Check for junction table creation
if (sql.includes('CREATE TABLE Enrollment') || sql.includes('CREATE TABLE enrollment')) {
  console.log('✅ Junction table "Enrollment" created');
} else {
  console.log('❌ Missing junction table "Enrollment"');
}

// Check for composite PK in junction table
if (sql.match(/PRIMARY KEY \(.*student.*,.*course.*\)/) ||
    sql.match(/PRIMARY KEY \(.*course.*,.*student.*\)/)) {
  console.log('✅ Composite PRIMARY KEY on junction table');
} else {
  console.log('❌ Missing composite PRIMARY KEY on junction table');
}

// Check for FKs to both entities
if (sql.includes('REFERENCES Student') || sql.includes('REFERENCES student')) {
  console.log('✅ Foreign Key to Student');
} else {
  console.log('❌ Missing Foreign Key to Student');
}

if (sql.includes('REFERENCES Course') || sql.includes('REFERENCES course')) {
  console.log('✅ Foreign Key to Course');
} else {
  console.log('❌ Missing Foreign Key to Course');
}

// Check for relationship attributes
if (sql.includes('enrollment_date')) {
  console.log('✅ Relationship attribute "enrollment_date" included');
} else {
  console.log('❌ Missing relationship attribute "enrollment_date"');
}

if (sql.includes('grade')) {
  console.log('✅ Relationship attribute "grade" included');
} else {
  console.log('❌ Missing relationship attribute "grade"');
}

// Check for indexes on junction table FKs
const enrollmentIndexMatches = sql.match(/CREATE INDEX.*enrollment/gi);
if (enrollmentIndexMatches) {
  console.log(`✅ Indexes on junction table FKs (${enrollmentIndexMatches.length} found)`);
} else {
  console.log('⚠️  No indexes found on junction table FKs');
}

// Check for ON DELETE CASCADE on junction table FKs
const cascadeMatches = sql.match(/ALTER TABLE Enrollment[\s\S]*?ON DELETE CASCADE/gi);
if (cascadeMatches && cascadeMatches.length >= 2) {
  console.log('✅ ON DELETE CASCADE on junction table FKs (both sides)');
} else if (cascadeMatches && cascadeMatches.length === 1) {
  console.log('⚠️  ON DELETE CASCADE on only one FK (should be both)');
} else {
  console.log('❌ Missing ON DELETE CASCADE on junction table FKs');
}

console.log('\n' + '='.repeat(80));
