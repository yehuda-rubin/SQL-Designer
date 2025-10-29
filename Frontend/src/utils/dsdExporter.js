/**
 * DSD Exporter - Graphical Format
 * מייצא את ה-DSD בפורמט גרפי (JSON) שניתן לטעון ולצפות בו
 */

import { convertERDtoDSD } from './erdToDsdConverter';

/**
 * מחשב מיקומים אוטומטיים לטבלאות (Grid Layout)
 * @param {Array} tables - מערך הטבלאות
 * @returns {Array} - מערך טבלאות עם מיקומים מעודכנים
 */
const calculateTablePositions = (tables) => {
  const SPACING_X = 350;
  const SPACING_Y = 250;
  const TABLES_PER_ROW = 4;
  
  return tables.map((table, index) => {
    const row = Math.floor(index / TABLES_PER_ROW);
    const col = index % TABLES_PER_ROW;
    
    return {
      ...table,
      position: {
        x: col * SPACING_X + 50,
        y: row * SPACING_Y + 50
      }
    };
  });
};

/**
 * יוצר מידע מפורט על הטבלה לתצוגה גרפית
 * @param {Object} table - אובייקט הטבלה
 * @returns {Object} - מידע מורחב
 */
const enrichTableData = (table) => {
  const { attributes = [] } = table.data;
  
  return {
    ...table,
    data: {
      ...table.data,
      columns: attributes.map(attr => ({
        name: attr.name,
        type: attr.type,
        isPrimaryKey: attr.isPrimaryKey || false,
        isForeignKey: attr.isForeignKey || false,
        isNullable: attr.isNullable !== false,
        references: attr.references || null
      })),
      primaryKeys: attributes.filter(a => a.isPrimaryKey).map(a => a.name),
      foreignKeys: attributes.filter(a => a.isForeignKey).map(a => ({
        column: a.name,
        references: a.references
      }))
    }
  };
};

/**
 * מייצא DSD לפורמט JSON עבור תצוגה גרפית
 * @param {Array} nodes - מערך של nodes (entities + relationships)
 * @returns {Object} - אובייקט DSD מלא
 */
export const exportDSDGraphical = (nodes) => {
  const { tables, relationships } = convertERDtoDSD(nodes);
  
  // חישוב מיקומים אוטומטיים
  const positionedTables = calculateTablePositions(tables);
  
  // הוספת מידע מפורט
  const enrichedTables = positionedTables.map(enrichTableData);
  
  return {
    version: '1.0',
    type: 'DSD',
    generatedAt: new Date().toISOString(),
    database: 'PostgreSQL',
    schema: {
      tables: enrichedTables,
      relationships: relationships
    },
    metadata: {
      totalTables: enrichedTables.length,
      totalRelationships: relationships.length,
      junctionTables: enrichedTables.filter(t => t.data.isJunctionTable).length
    }
  };
};

/**
 * מוריד את ה-DSD כקובץ JSON
 * @param {Array} nodes - מערך של nodes
 * @param {String} filename - שם הקובץ
 */
export const downloadDSDJSON = (nodes, filename = 'database_schema_dsd.json') => {
  const dsd = exportDSDGraphical(nodes);
  const jsonString = JSON.stringify(dsd, null, 2);
  
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
};

/**
 * מייצר HTML מעוצב לתצוגת DSD
 * @param {Array} nodes - מערך של nodes
 * @returns {String} - HTML string
 */
export const generateDSDHTML = (nodes) => {
  const dsd = exportDSDGraphical(nodes);
  const { tables, relationships } = dsd.schema;
  
  let html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Schema Diagram (DSD)</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            padding: 30px;
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 10px;
            font-size: 2.5rem;
        }
        .metadata {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
            font-size: 0.95rem;
        }
        .tables-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        .table-card {
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
            transition: transform 0.2s, box-shadow 0.2s;
            background: white;
        }
        .table-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }
        .table-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            font-weight: bold;
            font-size: 1.1rem;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .junction-badge {
            background: rgba(255,255,255,0.3);
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
        }
        .table-body {
            padding: 0;
        }
        .column-row {
            padding: 10px 15px;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .column-row:last-child {
            border-bottom: none;
        }
        .column-name {
            font-weight: 500;
            color: #333;
            flex: 1;
        }
        .column-type {
            color: #666;
            font-size: 0.85rem;
            background: #f5f5f5;
            padding: 2px 8px;
            border-radius: 4px;
        }
        .badge {
            font-size: 0.7rem;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 600;
        }
        .badge-pk {
            background: #ffd700;
            color: #333;
        }
        .badge-fk {
            background: #4CAF50;
            color: white;
        }
        .stats {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
        }
        .stat-item {
            text-align: center;
        }
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: #667eea;
        }
        .stat-label {
            color: #666;
            font-size: 0.9rem;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Database Schema Diagram</h1>
        <div class="metadata">
            נוצר: ${new Date().toLocaleString('he-IL')} | PostgreSQL
        </div>
        
        <div class="stats">
            <div class="stat-item">
                <div class="stat-value">${tables.length}</div>
                <div class="stat-label">טבלאות</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${relationships.length}</div>
                <div class="stat-label">קשרים</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${tables.filter(t => t.data.isJunctionTable).length}</div>
                <div class="stat-label">טבלאות חיבור</div>
            </div>
        </div>
        
        <div class="tables-grid">
`;

  tables.forEach(table => {
    const { name, columns, isJunctionTable } = table.data;
    
    html += `
            <div class="table-card">
                <div class="table-header">
                    <span>🗂️ ${name}</span>
                    ${isJunctionTable ? '<span class="junction-badge">טבלת חיבור</span>' : ''}
                </div>
                <div class="table-body">
`;

    columns.forEach(col => {
      html += `
                    <div class="column-row">
                        <span class="column-name">${col.name}</span>
                        ${col.isPrimaryKey ? '<span class="badge badge-pk">PK</span>' : ''}
                        ${col.isForeignKey ? '<span class="badge badge-fk">FK</span>' : ''}
                        <span class="column-type">${col.type}</span>
                    </div>
`;
    });

    html += `
                </div>
            </div>
`;
  });

  html += `
        </div>
    </div>
</body>
</html>
`;

  return html;
};

/**
 * מוריד את ה-DSD כקובץ HTML
 * @param {Array} nodes - מערך של nodes
 * @param {String} filename - שם הקובץ
 */
export const downloadDSDHTML = (nodes, filename = 'database_schema_dsd.html') => {
  const html = generateDSDHTML(nodes);
  
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
};