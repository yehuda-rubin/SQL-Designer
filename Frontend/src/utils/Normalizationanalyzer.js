/**
 * Normalization Analyzer
 * מנתח רמת נרמול של מבנה מסד נתונים (1NF - 5NF)
 */

import { convertERDtoDSD } from './erdToDsdConverter';

/**
 * Safe wrapper for conversion with error handling
 */
const safeConvertERDtoDSD = (nodes) => {
  try {
    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
      throw new Error('Invalid nodes array');
    }
    
    const result = convertERDtoDSD(nodes);
    
    if (!result || !result.tables) {
      throw new Error('Invalid conversion result');
    }
    
    return result.tables;
  } catch (error) {
    console.error('Error in convertERDtoDSD:', error);
    // Return empty array as fallback
    return [];
  }
};

/**
 * Generate error report HTML
 */
const generateErrorReport = (errorMessage) => {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>שגיאה בניתוח נרמול</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            padding: 30px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .container {
            max-width: 600px;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 40px;
            text-align: center;
        }
        
        .error-icon {
            font-size: 5rem;
            margin-bottom: 20px;
        }
        
        h1 {
            color: #e74c3c;
            font-size: 2rem;
            margin-bottom: 20px;
        }
        
        .error-message {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 10px;
            padding: 20px;
            color: #721c24;
            font-size: 1.1rem;
            margin-bottom: 30px;
        }
        
        .suggestions {
            text-align: right;
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
        }
        
        .suggestions h3 {
            color: #856404;
            margin-bottom: 10px;
        }
        
        .suggestions ul {
            color: #856404;
            margin-right: 20px;
        }
        
        .suggestions li {
            margin-bottom: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-icon">❌</div>
        <h1>שגיאה בניתוח נרמול</h1>
        
        <div class="error-message">
            ${errorMessage}
        </div>
        
        <div class="suggestions">
            <h3>💡 אפשרויות לפתרון:</h3>
            <ul>
                <li>ודא שיצרת לפחות ישות אחת עם תכונות</li>
                <li>בדוק שהקשרים בין הישויות מוגדרים כראוי</li>
                <li>נסה לשמור את הפרויקט מחדש</li>
                <li>רענן את הדף ונסה שוב</li>
                <li>אם הבעיה נמשכת, פנה לתמיכה</li>
            </ul>
        </div>
    </div>
</body>
</html>
  `;
};

/**
 * בדיקת 1NF (First Normal Form)
 * כללים:
 * - אין תכונות מרובות ערכים (multi-valued attributes)
 * - כל תכונה מכילה ערך אטומי אחד
 * - יש מפתח ראשי
 */
const check1NF = (tables) => {
  const violations = [];
  let passed = true;

  tables.forEach(table => {
    // Safety checks
    if (!table || !table.data) {
      return;
    }
    
    const tableName = table.data.name || 'Unknown';
    const attributes = table.data.attributes || [];
    
    // 🔧 חילוץ מפתחות ראשיים מתוך attributes
    let primaryKeys = attributes.filter(attr => attr && attr.isPrimaryKey);
    
    // 🔧 אם אין מפתח מוגדר אבל יש תכונות - נתייחס לתכונה הראשונה כמפתח זמני
    let hasImplicitPK = false;
    if (primaryKeys.length === 0 && attributes.length > 0) {
      // נתייחס לתכונה הראשונה כמפתח זמני לצורך הבדיקות
      primaryKeys = [attributes[0]];
      hasImplicitPK = true;
      
      // ⚠️ נוסיף אזהרה אבל לא נכשיל את הבדיקה (כדי שהבדיקות הבאות ימשיכו)
      violations.push({
        table: tableName,
        issue: '⚠️ אזהרה: מפתח ראשי לא מוגדר רשמית',
        description: `הטבלה "${tableName}" לא הגדירה מפתח ראשי באופן מפורש. המערכת מתייחסת ל-"${attributes[0].name}" כמפתח זמני.`,
        suggestion: `הגדר מפתח ראשי מפורש על ידי סימון התכונה המתאימה כ-Primary Key (🔑)`,
        isWarning: true  // 🔧 זו אזהרה ולא שגיאה חמורה
      });
      // ✅ לא נגדיר passed = false כדי שהבדיקות ימשיכו
    } else if (primaryKeys.length === 0 && attributes.length === 0) {
      // אין תכונות בכלל - זו שגיאה אמיתית
      violations.push({
        table: tableName,
        issue: 'טבלה ריקה',
        description: `הטבלה "${tableName}" לא מכילה תכונות כלל`
      });
      passed = false;  // ❌ זו שגיאה אמיתית
    }

    // בדיקה 2: זיהוי תכונות מרובות ערכים (לפי שמות חשודים)
    attributes.forEach(attr => {
      if (!attr || !attr.name) return;
      
      const suspiciousPatterns = [
        /phone[s]?[_]?[12]/i,      // phone1, phone2, phones
        /email[s]?[_]?[12]/i,      // email1, email2
        /address[s]?[_]?[12]/i,    // address1, address2
        /מספר.*[12]/,              // מספר_טלפון1, מספר_טלפון2
        /כתובת.*[12]/              // כתובת1, כתובת2
      ];

      const isMultiValued = suspiciousPatterns.some(pattern => pattern.test(attr.name));
      
      if (isMultiValued) {
        violations.push({
          table: tableName,
          issue: 'תכונה מרובת ערכים חשודה',
          description: `העמודה "${attr.name}" נראית כמו תכונה מרובת ערכים. יש ליצור טבלה נפרדת.`,
          suggestion: `צור טבלה נפרדת עבור ${attr.name.replace(/[_]?[12]$/, '')} עם קשר 1:N`
        });
        passed = false;
      }
    });
  });

  return { passed, violations };
};

/**
 * בדיקת 2NF (Second Normal Form)
 * כללים:
 * - עומדת ב-1NF
 * - אין תלויות חלקיות (partial dependencies)
 * - כל תכונה שאינה מפתח תלויה במפתח הראשי המלא
 */
const check2NF = (tables) => {
  const violations = [];
  let passed = true;

  tables.forEach(table => {
    // Safety checks
    if (!table || !table.data) return;
    
    const attributes = table.data.attributes || [];
    const tableName = table.data.name || 'Unknown';
    
    // 🔧 חילוץ מפתחות ראשיים מתוך attributes
    let primaryKeys = attributes.filter(attr => attr && attr.isPrimaryKey);
    
    // 🔧 אם אין מפתח מוגדר אבל יש תכונות - נתייחס לתכונה הראשונה כמפתח זמני
    if (primaryKeys.length === 0 && attributes.length > 0) {
      primaryKeys = [attributes[0]];
    }
    
    const pkNames = primaryKeys.map(pk => pk.name);
    
    // 2NF רלוונטי רק אם יש מפתח מורכב
    if (pkNames.length > 1) {
      const nonKeyColumns = attributes.filter(
        attr => attr && attr.name && !pkNames.includes(attr.name)
      );

      // זיהוי תלויות חלקיות פוטנציאליות
      // אם שם עמודה מכיל חלק מהמפתח המורכב - זו תלות חלקית חשודה
      nonKeyColumns.forEach(col => {
        pkNames.forEach(keyPart => {
          // הסר סיומות נפוצות כדי להשוות
          const keyBase = keyPart.replace(/_id$/i, '').replace(/_code$/i, '');
          
          if (col.name.toLowerCase().includes(keyBase.toLowerCase()) && 
              col.name !== keyPart) {
            violations.push({
              table: tableName,
              issue: 'תלות חלקית חשודה',
              description: `העמודה "${col.name}" נראית תלויה רק ב-"${keyPart}" ולא במפתח המלא`,
              suggestion: `הזז את "${col.name}" לטבלה המתארת את "${keyPart}"`
            });
            passed = false;
          }
        });
      });
    }
  });

  return { passed, violations };
};

/**
 * בדיקת 3NF (Third Normal Form)
 * כללים:
 * - עומדת ב-2NF
 * - אין תלויות טרנזיטיביות
 * - תכונות שאינן מפתח לא תלויות בתכונות אחרות שאינן מפתח
 */
const check3NF = (tables) => {
  const violations = [];
  let passed = true;

  tables.forEach(table => {
    // Safety checks
    if (!table || !table.data) return;
    
    const attributes = table.data.attributes || [];
    const tableName = table.data.name || 'Unknown';
    
    // 🔧 חילוץ מפתחות ראשיים מתוך attributes
    let primaryKeys = attributes.filter(attr => attr && attr.isPrimaryKey);
    
    // 🔧 אם אין מפתח מוגדר אבל יש תכונות - נתייחס לתכונה הראשונה כמפתח זמני
    if (primaryKeys.length === 0 && attributes.length > 0) {
      primaryKeys = [attributes[0]];
    }
    
    const pkNames = primaryKeys.map(pk => pk.name);
    
    const nonKeyColumns = attributes.filter(
      attr => attr && attr.name && !pkNames.includes(attr.name) && !attr.isForeignKey
    );

    // זיהוי קבוצות עמודות עם קידומת משותפת (תלות טרנזיטיבית חשודה)
    const columnGroups = {};
    
    nonKeyColumns.forEach(col => {
      const match = col.name.match(/^([a-zA-Z_]+?)_/);
      if (match) {
        const prefix = match[1];
        if (!columnGroups[prefix]) {
          columnGroups[prefix] = [];
        }
        columnGroups[prefix].push(col.name);
      }
    });

    // אם יש יותר מ-2 עמודות עם אותה קידומת - תלות טרנזיטיבית חשודה
    Object.entries(columnGroups).forEach(([prefix, cols]) => {
      if (cols.length >= 2) {
        violations.push({
          table: tableName,
          issue: 'תלות טרנזיטיבית חשודה',
          description: `העמודות [${cols.join(', ')}] נראות תלויות אחת בשנייה`,
          suggestion: `צור טבלה נפרדת עבור "${prefix}" והפוך את הקשר ל-N:1`
        });
        passed = false;
      }
    });
  });

  return { passed, violations };
};

/**
 * בדיקת BCNF (Boyce-Codd Normal Form)
 * כללים:
 * - עומדת ב-3NF
 * - כל קובע (determinant) הוא מפתח מועמד
 */
const checkBCNF = (tables) => {
  const violations = [];
  let passed = true;

  tables.forEach(table => {
    // Safety checks
    if (!table || !table.data) return;
    
    const attributes = table.data.attributes || [];
    const tableName = table.data.name || 'Unknown';
    
    // 🔧 חילוץ מפתחות ראשיים מתוך attributes
    let primaryKeys = attributes.filter(attr => attr && attr.isPrimaryKey);
    
    // 🔧 אם אין מפתח מוגדר אבל יש תכונות - נתייחס לתכונה הראשונה כמפתח זמני
    if (primaryKeys.length === 0 && attributes.length > 0) {
      primaryKeys = [attributes[0]];
    }
    
    const pkNames = primaryKeys.map(pk => pk.name);
    
    // BCNF מורכבת - נבדוק מקרים פשוטים
    // אם יש מפתח ייחודי נוסף שאינו PK - זה מועמד ל-BCNF
    const uniqueConstraints = attributes.filter(attr => 
      attr && attr.isUnique && !pkNames.includes(attr.name)
    );

    // אם יש תכונה ייחודית שתכונות אחרות תלויות בה - בעיית BCNF
    if (uniqueConstraints.length > 0) {
      violations.push({
        table: tableName,
        issue: 'הפרת BCNF פוטנציאלית',
        description: `יש תכונות ייחודיות שאינן חלק מהמפתח הראשי`,
        suggestion: 'בדוק אם יש תכונות התלויות בתכונות אלו ולא ב-PK'
      });
      passed = false;
    }
  });

  return { passed, violations };
};

/**
 * בדיקת 4NF (Fourth Normal Form)
 * כללים:
 * - עומדת ב-BCNF
 * - אין תלויות מרובות ערכים (multi-valued dependencies)
 */
const check4NF = (tables) => {
  const violations = [];
  let passed = true;

  tables.forEach(table => {
    // Safety checks
    if (!table || !table.data) return;
    
    const attributes = table.data.attributes || [];
    const tableName = table.data.name || 'Unknown';
    
    // 🔧 חילוץ foreign keys מתוך attributes
    const foreignKeyAttrs = attributes.filter(attr => attr && attr.isForeignKey);
    
    // קבץ לפי foreignKeyGroup
    const fkGroups = new Map();
    foreignKeyAttrs.forEach(fk => {
      const groupId = fk.foreignKeyGroup || `single_${fk.name}`;
      if (!fkGroups.has(groupId)) {
        fkGroups.set(groupId, {
          columns: [],
          isComposite: false
        });
      }
      fkGroups.get(groupId).columns.push(fk);
    });
    
    // סמן קבוצות מורכבות
    fkGroups.forEach(group => {
      group.isComposite = group.columns.length > 1;
    });
    
    const fks = Array.from(fkGroups.values());
    
    // אם יש יותר מ-2 FK עצמאיים - MVD חשודה
    if (fks.length >= 2) {
      const independentFKs = fks.filter(fk => !fk.isComposite);
      
      if (independentFKs.length >= 2) {
        violations.push({
          table: tableName,
          issue: 'תלות מרובת ערכים חשודה (MVD)',
          description: `הטבלה מכילה ${independentFKs.length} מפתחות זרים עצמאיים`,
          suggestion: 'אם הקשרים בין הישויות עצמאיים - פצל לטבלאות נפרדות'
        });
        passed = false;
      }
    }
  });

  return { passed, violations };
};

/**
 * בדיקת 5NF (Fifth Normal Form / Project-Join Normal Form)
 * כללים:
 * - עומדת ב-4NF
 * - אין תלויות חיבור (join dependencies)
 */
const check5NF = (tables) => {
  const violations = [];
  let passed = true;

  tables.forEach(table => {
    // Safety checks
    if (!table || !table.data) return;
    
    const attributes = table.data.attributes || [];
    const tableName = table.data.name || 'Unknown';
    
    // 🔧 חילוץ foreign keys מתוך attributes וקיבוץ לפי foreignKeyGroup
    const foreignKeyAttrs = attributes.filter(attr => attr && attr.isForeignKey);
    
    // קבץ לפי foreignKeyGroup
    const fkGroups = new Set();
    foreignKeyAttrs.forEach(fk => {
      const groupId = fk.foreignKeyGroup || `single_${fk.name}`;
      fkGroups.add(groupId);
    });
    
    const numFKGroups = fkGroups.size;
    
    // 5NF רלוונטי לטבלאות עם 3+ FK groups (n-ary relationships)
    if (numFKGroups >= 3) {
      violations.push({
        table: tableName,
        issue: 'תלות חיבור חשודה (Join Dependency)',
        description: `הטבלה מכילה ${numFKGroups} קבוצות מפתחות זרים - קשר n-ary`,
        suggestion: 'בדוק אם ניתן לפרק לקשרים בינאריים ללא אובדן מידע'
      });
      passed = false;
    }
  });

  return { passed, violations };
};

/**
 * ניתוח מלא של רמת הנרמול
 * @param {Array} nodes - ERD nodes
 * @returns {Object} דוח נרמול מפורט
 */
export const analyzeNormalization = (nodes) => {
  try {
    // Safe conversion with error handling
    const tables = safeConvertERDtoDSD(nodes);
    
    // Check if we have tables
    if (!tables || tables.length === 0) {
      return {
        currentLevel: 'לא ניתן לנתח',
        nextLevel: null,
        tables: 0,
        error: 'לא נמצאו טבלאות לניתוח',
        checks: {}
      };
    }
  
  // בדיקת כל רמה לפי הסדר
  const nf1 = check1NF(tables);
  const nf2 = nf1.passed ? check2NF(tables) : { passed: false, violations: [] };
  const nf3 = nf2.passed ? check3NF(tables) : { passed: false, violations: [] };
  const bcnf = nf3.passed ? checkBCNF(tables) : { passed: false, violations: [] };
  const nf4 = bcnf.passed ? check4NF(tables) : { passed: false, violations: [] };
  const nf5 = nf4.passed ? check5NF(tables) : { passed: false, violations: [] };

  // קביעת רמת הנרמול הנוכחית
  let currentLevel = '0NF';
  let nextLevel = '1NF';
  
  if (nf1.passed) {
    currentLevel = '1NF';
    nextLevel = '2NF';
  }
  if (nf2.passed) {
    currentLevel = '2NF';
    nextLevel = '3NF';
  }
  if (nf3.passed) {
    currentLevel = '3NF';
    nextLevel = 'BCNF';
  }
  if (bcnf.passed) {
    currentLevel = 'BCNF';
    nextLevel = '4NF';
  }
  if (nf4.passed) {
    currentLevel = '4NF';
    nextLevel = '5NF';
  }
  if (nf5.passed) {
    currentLevel = '5NF';
    nextLevel = null; // הגענו לשיא!
  }

  return {
    currentLevel,
    nextLevel,
    tables: tables.length,
    checks: {
      '1NF': nf1,
      '2NF': nf2,
      '3NF': nf3,
      'BCNF': bcnf,
      '4NF': nf4,
      '5NF': nf5
    }
  };
  } catch (error) {
    console.error('Error in analyzeNormalization:', error);
    return {
      currentLevel: 'שגיאה',
      nextLevel: null,
      tables: 0,
      error: error.message || 'שגיאה לא ידועה בניתוח',
      checks: {}
    };
  }
};

/**
 * יצירת דוח HTML מפורט
 */
export const generateNormalizationReport = (nodes) => {
  const analysis = analyzeNormalization(nodes);
  
  // Check for errors
  if (analysis.error || !analysis.checks || Object.keys(analysis.checks).length === 0) {
    return generateErrorReport(analysis.error || 'שגיאה לא ידועה');
  }
  
  const levelDescriptions = {
    '1NF': 'תכונות אטומיות, אין ערכים מרובים, יש מפתח ראשי',
    '2NF': 'אין תלויות חלקיות - כל תכונה תלויה במפתח המלא',
    '3NF': 'אין תלויות טרנזיטיביות - תכונות לא תלויות בתכונות אחרות',
    'BCNF': 'כל קובע הוא מפתח מועמד',
    '4NF': 'אין תלויות מרובות ערכים (MVD)',
    '5NF': 'אין תלויות חיבור (Join Dependencies)'
  };

  const levelColors = {
    '1NF': '#e74c3c',
    '2NF': '#e67e22',
    '3NF': '#f39c12',
    'BCNF': '#27ae60',
    '4NF': '#3498db',
    '5NF': '#9b59b6'
  };

  let html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>דוח ניתוח נרמול</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            min-height: 100vh;
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        
        .header p {
            font-size: 1.1rem;
            opacity: 0.95;
        }
        
        .current-level {
            background: white;
            margin: 30px;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .level-badge {
            display: inline-block;
            font-size: 4rem;
            font-weight: bold;
            color: ${levelColors[analysis.currentLevel]};
            padding: 20px 40px;
            border: 5px solid ${levelColors[analysis.currentLevel]};
            border-radius: 15px;
            margin-bottom: 20px;
            background: ${levelColors[analysis.currentLevel]}15;
        }
        
        .level-description {
            font-size: 1.2rem;
            color: #555;
            margin-top: 15px;
            line-height: 1.8;
        }
        
        .stats {
            display: flex;
            justify-content: space-around;
            padding: 20px 30px;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
        }
        
        .stat-item {
            text-align: center;
        }
        
        .stat-number {
            font-size: 2.5rem;
            font-weight: bold;
            color: #667eea;
        }
        
        .stat-label {
            color: #666;
            font-size: 0.9rem;
            margin-top: 5px;
        }
        
        .checks {
            padding: 30px;
        }
        
        .check-item {
            margin-bottom: 25px;
            padding: 20px;
            border-radius: 10px;
            transition: all 0.3s;
        }
        
        .check-item:hover {
            transform: translateX(-5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .check-item.passed {
            background: #d4edda;
            border-right: 5px solid #28a745;
        }
        
        .check-item.failed {
            background: #f8d7da;
            border-right: 5px solid #dc3545;
        }
        
        .check-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .check-icon {
            font-size: 2rem;
        }
        
        .check-title {
            font-size: 1.5rem;
            font-weight: bold;
        }
        
        .check-subtitle {
            color: #666;
            font-size: 0.95rem;
            margin-top: 5px;
        }
        
        .violations {
            margin-top: 15px;
        }
        
        .violation-item {
            background: white;
            padding: 15px;
            margin-top: 10px;
            border-radius: 8px;
            border-right: 3px solid #e74c3c;
        }
        
        .warning-item {
            background: white;
            padding: 15px;
            margin-top: 10px;
            border-radius: 8px;
            border-right: 3px solid #ffc107;
        }
        
        .violation-table {
            font-weight: bold;
            color: #e74c3c;
            margin-bottom: 5px;
        }
        
        .violation-issue {
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        
        .violation-description {
            color: #666;
            font-size: 0.95rem;
            margin-bottom: 10px;
        }
        
        .violation-suggestion {
            background: #fff3cd;
            padding: 10px;
            border-radius: 5px;
            color: #856404;
            font-size: 0.9rem;
            margin-top: 10px;
        }
        
        .violation-suggestion::before {
            content: "💡 ";
            font-weight: bold;
        }
        
        .next-steps {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            margin: 30px;
            border-radius: 10px;
            text-align: center;
        }
        
        .next-steps h2 {
            font-size: 1.8rem;
            margin-bottom: 15px;
        }
        
        .next-steps p {
            font-size: 1.1rem;
            line-height: 1.8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 דוח ניתוח נרמול</h1>
            <p>ניתוח רמת נרמול למסד הנתונים שלך</p>
        </div>
        
        <div class="current-level">
            <div class="level-badge">${analysis.currentLevel}</div>
            <div class="level-description">
                ${levelDescriptions[analysis.currentLevel]}
            </div>
        </div>
        
        <div class="stats">
            <div class="stat-item">
                <div class="stat-number">${analysis.tables}</div>
                <div class="stat-label">טבלאות</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${analysis.currentLevel}</div>
                <div class="stat-label">רמה נוכחית</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${analysis.nextLevel || 'מושלם!'}</div>
                <div class="stat-label">רמה הבאה</div>
            </div>
        </div>
        
        <div class="checks">
            <h2 style="margin-bottom: 20px; color: #333; font-size: 1.8rem;">🔍 בדיקות מפורטות</h2>
  `;

  // הוספת כל הבדיקות
  Object.entries(analysis.checks).forEach(([level, result]) => {
    const passed = result.passed;
    const statusClass = passed ? 'passed' : 'failed';
    const icon = passed ? '✅' : '❌';
    
    html += `
            <div class="check-item ${statusClass}">
                <div class="check-header">
                    <span class="check-icon">${icon}</span>
                    <div>
                        <div class="check-title">${level}</div>
                        <div class="check-subtitle">${levelDescriptions[level]}</div>
                    </div>
                </div>
    `;
    
    if (result.violations && result.violations.length > 0) {
      html += `<div class="violations">`;
      
      result.violations.forEach(violation => {
        const isWarning = violation.isWarning || false;
        const warningClass = isWarning ? 'warning-item' : 'violation-item';
        const borderColor = isWarning ? '#ffc107' : '#e74c3c';
        
        html += `
                    <div class="${warningClass}" style="border-right-color: ${borderColor}">
                        <div class="violation-table">📋 טבלה: ${violation.table}</div>
                        <div class="violation-issue">${isWarning ? '⚠️' : '❌'} ${violation.issue}</div>
                        <div class="violation-description">${violation.description}</div>
                        ${violation.suggestion ? `<div class="violation-suggestion">${violation.suggestion}</div>` : ''}
                    </div>
        `;
      });
      
      html += `</div>`;
    }
    
    html += `</div>`;
  });

  html += `
        </div>
  `;

  // הצעות לשלב הבא
  if (analysis.nextLevel) {
    html += `
        <div class="next-steps">
            <h2>🎯 השלב הבא</h2>
            <p>כדי להגיע ל-<strong>${analysis.nextLevel}</strong>, תקן את הבעיות שזוהו בבדיקת ${analysis.nextLevel}</p>
            <p style="margin-top: 15px;">עקוב אחרי ההמלצות המופיעות בכל הפרה</p>
        </div>
    `;
  } else {
    html += `
        <div class="next-steps">
            <h2>🎉 מזל טוב!</h2>
            <p>המבנה שלך עומד ב-<strong>5NF</strong> - הרמה הגבוהה ביותר!</p>
            <p style="margin-top: 15px;">מסד הנתונים שלך מנורמל בצורה מושלמת</p>
        </div>
    `;
  }

  html += `
    </div>
</body>
</html>
  `;

  return html;
};

/**
 * הורדת דוח HTML
 */
export const downloadNormalizationReport = (nodes, filename = 'normalization_report.html') => {
  const html = generateNormalizationReport(nodes);
  
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
};