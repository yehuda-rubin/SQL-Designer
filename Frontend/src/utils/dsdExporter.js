/**
 * DSD Exporter - Professional Graphical Format
 * Exports the DSD in a professional graphical format with connection lines
 */

import { convertERDtoDSD } from './erdToDsdConverter';

/**
 * Calculates automatic positions for tables (Grid Layout)
 * @param {Array} tables - Array of tables
 * @returns {Array} - Array of tables with updated positions
 */
const calculateTablePositions = (tables) => {
  const SPACING_X = 400;
  const SPACING_Y = 350;
  const TABLES_PER_ROW = 3;
  
  return tables.map((table, index) => {
    const row = Math.floor(index / TABLES_PER_ROW);
    const col = index % TABLES_PER_ROW;
    
    return {
      ...table,
      position: {
        x: col * SPACING_X + 100,
        y: row * SPACING_Y + 150
      }
    };
  });
};

/**
 * Creates detailed information about the table for graphical display
 * @param {Object} table - The table object
 * @returns {Object} - Enriched information
 */
const enrichTableData = (table) => {
  const { attributes = [] } = table.data;

  // Group FKs by foreignKeyGroup
  const foreignKeyGroups = new Map();
  const processedFKs = new Set();

  attributes.filter(a => a.isForeignKey).forEach(attr => {
    if (attr.foreignKeyGroup) {
      if (!foreignKeyGroups.has(attr.foreignKeyGroup)) {
        const groupFks = attributes.filter(a => a.foreignKeyGroup === attr.foreignKeyGroup);
        const sortedGroupFks = groupFks.sort((a, b) =>
          (a.foreignKeyGroupIndex || 0) - (b.foreignKeyGroupIndex || 0)
        );

        foreignKeyGroups.set(attr.foreignKeyGroup, {
          columns: sortedGroupFks.map(f => f.name),
          references: attr.references,
          referencedColumns: attr.referencedColumns || [],
          isComposite: sortedGroupFks.length > 1
        });

        sortedGroupFks.forEach(f => processedFKs.add(f.name));
      }
    } else {
      foreignKeyGroups.set(`legacy_${attr.name}`, {
        columns: [attr.name],
        references: attr.references,
        referencedColumns: attr.referencedColumns || [attr.name],
        isComposite: false
      });
      processedFKs.add(attr.name);
    }
  });

  return {
    ...table,
    data: {
      ...table.data,
      columns: attributes.map(attr => ({
        name: attr.name,
        type: attr.type,
        isPrimaryKey: attr.isPrimaryKey || false,
        isForeignKey: attr.isForeignKey || false,
        foreignKeyGroup: attr.foreignKeyGroup || null,
        foreignKeyGroupIndex: attr.foreignKeyGroupIndex,
        foreignKeyGroupSize: attr.foreignKeyGroupSize,
        isNullable: attr.isNullable !== false,
        references: attr.references || null,
        referencedColumns: attr.referencedColumns || null
      })),
      primaryKeys: attributes.filter(a => a.isPrimaryKey).map(a => a.name),
      foreignKeys: Array.from(foreignKeyGroups.values())
    }
  };
};

/**
 * Exports DSD to JSON format for graphical display
 * @param {Array} nodes - Array of nodes (entities + relationships)
 * @returns {Object} - Complete DSD object
 */
export const exportDSDGraphical = (nodes) => {
  const { tables, relationships } = convertERDtoDSD(nodes);
  
  const positionedTables = calculateTablePositions(tables);
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
 * Downloads the DSD as a JSON file
 * @param {Array} nodes - Array of nodes
 * @param {String} filename - The file name
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
 * Determines the relationship type and color according to true cardinality
 * @param {Object} fk - Foreign Key
 * @param {Array} relationships - Array of relationships with cardinality
 * @param {Object} sourceTable - Source table
 * @param {Object} targetTable - Target table
 * @returns {Object} - Information about the relationship
 */
const determineRelationshipType = (fk, relationships, sourceTable, targetTable) => {
  // Default
  let sourceCardinality = 'N';
  let isOptional = false;
  
  // 🔍 Step 1: Try to read cardinality from column attributes (the most accurate source)
  if (fk.columns && fk.columns.length > 0) {
    const firstColName = Array.isArray(fk.columns) ? fk.columns[0] : fk.columns;
    const col = sourceTable.data.columns.find(c => c.name === firstColName);
    
    if (col) {
      // Read cardinality from the column
      if (col.cardinality) {
        sourceCardinality = col.cardinality;
      }
      // Check if nullable
      if (col.isNullable === true) {
        isOptional = true;
      }
    }
  }
  
  // 🔍 Step 2: If not found, try to read from relationships
  if (sourceCardinality === 'N' && relationships && relationships.length > 0) {
    for (const rel of relationships) {
      if (!rel.data) continue;
      
      // Check if this is the correct relationship
      if (rel.source === sourceTable.id && rel.target === targetTable.id) {
        if (rel.data.sourceCardinality) {
          sourceCardinality = rel.data.sourceCardinality;
          break;
        }
      }
    }
  }
  
  // 📊 Determine relationship type by cardinality
  const isJunction = sourceTable.data.isJunctionTable;
  
  // 🔴 N:M - Only if it's a Junction and has 2+ FKs with cardinality='N'
  if (isJunction && sourceCardinality === 'N') {
    return {
      type: 'N:M',
      color: '#e74c3c', // Red
      label: 'N:M',
      strokeWidth: '2.5',
      cardinality: sourceCardinality
    };
  }
  
  // 🟢 0..1 - Optional (dashed line)
  if (sourceCardinality === '0..1' || isOptional) {
    return {
      type: '0..1:N',
      color: '#27ae60', // Green
      label: '0..1:N',
      strokeWidth: '2',
      cardinality: sourceCardinality
    };
  }
  
  // 🔵 1 - Mandatory (solid line)
  if (sourceCardinality === '1') {
    return {
      type: '1:N',
      color: '#3498db', // Blue
      label: '1:N',
      strokeWidth: '2',
      cardinality: sourceCardinality
    };
  }
  
  // 🔵 N - Many (Default - Blue)
  return {
    type: '1:N',
    color: '#3498db', // Blue
    label: '1:N',
    strokeWidth: '2',
    cardinality: sourceCardinality
  };
};

/**
 * Generates SVG connection lines between tables - improved version
 * @param {Array} tables - Array of tables
 * @param {Array} relationships - Array of relationships with cardinality
 * @returns {String} - SVG paths
 */
const generateConnectionLines = (tables, relationships = []) => {
  const lines = [];
  const TABLE_WIDTH = 320;
  const TABLE_HEADER_HEIGHT = 45;
  const ROW_HEIGHT = 35;
  const ARROW_OFFSET = 10;
  
  // Map tables by name
  const tableMap = new Map();
  tables.forEach(table => {
    tableMap.set(table.data.name, table);
  });
  
  // Create lines for each FK
  tables.forEach(sourceTable => {
    if (!sourceTable.data.foreignKeys) return;
    
    sourceTable.data.foreignKeys.forEach((fk, fkIndex) => {
      const targetTable = tableMap.get(fk.references);
      if (!targetTable) return;
      
      // Determine relationship type and color - now with relationships!
      const relationship = determineRelationshipType(fk, relationships, sourceTable, targetTable);
      
      // Calculate start and end points
      const sourceX = sourceTable.position.x + TABLE_WIDTH;
      const sourceY = sourceTable.position.y + TABLE_HEADER_HEIGHT + (fkIndex + 1) * ROW_HEIGHT + ROW_HEIGHT/2;
      
      const targetX = targetTable.position.x;
      const targetY = targetTable.position.y + TABLE_HEADER_HEIGHT / 2;
      
      // Create orthogonal path (straight lines)
      const midX = (sourceX + targetX) / 2;
      
      // Select path based on relative position
      let path;
      if (sourceTable.position.y < targetTable.position.y - 100) {
        // Source above target - line down
        path = `M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`;
      } else if (sourceTable.position.y > targetTable.position.y + 100) {
        // Source below target - line up
        path = `M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`;
      } else {
        // Approximately same height - straight line
        path = `M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`;
      }
      
      // Calculate label position
      const labelX = midX;
      const labelY = (sourceY + targetY) / 2 - 10;
      
      // Line style
      const strokeDasharray = relationship.type === '0..1:N' ? '5,5' : 'none';
      const compositeMarker = fk.isComposite ? ' (Composite)' : '';
      
      lines.push(`
        <!-- Connection: ${sourceTable.data.name} → ${targetTable.data.name} -->
        <g class="relationship-line">
          <path 
            d="${path}" 
            stroke="${relationship.color}" 
            stroke-width="${relationship.strokeWidth}" 
            stroke-dasharray="${strokeDasharray}"
            fill="none" 
            marker-end="url(#arrowhead-${relationship.type.replace(/[:.]/g, '')})"
            opacity="0.85"
          />
          
          <!-- Relationship type label -->
          <text 
            x="${labelX}" 
            y="${labelY}" 
            text-anchor="middle" 
            font-size="11" 
            font-weight="bold" 
            fill="${relationship.color}"
            style="text-shadow: 0 0 3px white, 0 0 3px white, 0 0 3px white;"
          >
            ${relationship.label}${compositeMarker}
          </text>
          
          ${fk.isComposite ? `
          <title>Composite FK: ${fk.columns.join(', ')} → ${fk.referencedColumns.join(', ')}</title>
          ` : `
          <title>${fk.columns[0]} → ${fk.referencedColumns[0]}</title>
          `}
        </g>
      `);
    });
  });
  
  return lines.join('\n');
};

/**
 * Generates styled HTML for a professional DSD display
 * @param {Array} nodes - Array of nodes
 * @returns {String} - HTML string
 */
export const generateDSDHTML = (nodes) => {
  const dsd = exportDSDGraphical(nodes);
  const { tables, relationships } = dsd.schema;
  
  // Calculate canvas size
  const maxX = Math.max(...tables.map(t => t.position.x)) + 400;
  const maxY = Math.max(...tables.map(t => t.position.y)) + 350;
  
  const connectionLines = generateConnectionLines(tables, relationships);
  
  let html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Schema Diagram (DSD) - Professional</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            background: #f5f5f5;
            padding: 20px;
        }
        
        .container {
            max-width: ${maxX + 100}px;
            margin: 0 auto;
            background: white;
            border: 1px solid #ddd;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header {
            background: #2c3e50;
            color: white;
            padding: 20px 30px;
            border-bottom: 3px solid #34495e;
        }
        
        h1 {
            font-size: 1.8rem;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .metadata {
            font-size: 0.9rem;
            color: #bdc3c7;
            margin-top: 5px;
        }
        
        .diagram-area {
            position: relative;
            width: 100%;
            height: ${maxY + 100}px;
            background: white;
            overflow: auto;
        }
        
        svg {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
        }
        
        .relationship-line {
            transition: opacity 0.2s;
        }
        
        .relationship-line:hover {
            opacity: 1 !important;
        }
        
        .relationship-line text {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            pointer-events: none;
        }
        
        .table-box {
            position: absolute;
            border: 2px solid #2c3e50;
            background: white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            min-width: 320px;
            z-index: 10;
        }
        
        .table-header {
            background: #34495e;
            color: white;
            padding: 12px 15px;
            border-bottom: 2px solid #2c3e50;
            font-weight: 600;
            font-size: 1rem;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .junction-indicator {
            background: #e74c3c;
            color: white;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 0.7rem;
            font-weight: bold;
        }
        
        .column-row {
            padding: 8px 15px;
            border-bottom: 1px solid #ecf0f1;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.85rem;
            background: white;
        }
        
        .column-row:last-child {
            border-bottom: none;
        }
        
        .column-row:hover {
            background: #f8f9fa;
        }
        
        .key-icon {
            font-size: 0.9rem;
            width: 20px;
            text-align: center;
        }
        
        .pk-icon {
            color: #f39c12;
        }
        
        .fk-icon {
            color: #3498db;
        }
        
        .column-name {
            flex: 1;
            font-weight: 500;
            color: #2c3e50;
        }
        
        .column-type {
            color: #7f8c8d;
            font-size: 0.75rem;
            background: #ecf0f1;
            padding: 3px 8px;
            border-radius: 3px;
        }
        
        .fk-badge {
            font-size: 0.7rem;
            padding: 2px 6px;
            border-radius: 3px;
            background: #3498db;
            color: white;
            font-weight: 600;
        }
        
        .composite-indicator {
            font-size: 0.65rem;
            color: #e74c3c;
            font-weight: 600;
        }
        
        .legend {
            padding: 20px 30px;
            background: #ecf0f1;
            border-top: 2px solid #bdc3c7;
            display: flex;
            gap: 30px;
            flex-wrap: wrap;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 0.85rem;
            color: #2c3e50;
        }
        
        .legend-line {
            width: 40px;
            height: 2px;
            background: #333;
        }
        
        .legend-line.dashed {
            border-top: 2px dashed #333;
            background: none;
            height: 0;
        }
        
        .arrow-symbol {
            font-size: 1.2rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Database Schema Diagram (DSD)</h1>
            <div class="metadata">
                ${dsd.database} | Created: ${new Date(dsd.generatedAt).toLocaleString('he-IL')} | 
                ${dsd.metadata.totalTables} Tables | ${dsd.metadata.totalRelationships} Relationships
            </div>
        </div>
        
        <div class="diagram-area">
            <svg>
                <defs>
                    <!-- Arrowheads in different colors -->
                    <marker id="arrowhead-1N" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                        <polygon points="0 0, 10 3, 0 6" fill="#3498db" />
                    </marker>
                    <marker id="arrowhead-01N" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                        <polygon points="0 0, 10 3, 0 6" fill="#27ae60" />
                    </marker>
                    <marker id="arrowhead-NM" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                        <polygon points="0 0, 10 3, 0 6" fill="#e74c3c" />
                    </marker>
                </defs>
                ${connectionLines}
            </svg>
`;

  // Create tables
  tables.forEach(table => {
    const isJunction = table.data.isJunctionTable;
    
    html += `
            <div class="table-box" style="left: ${table.position.x}px; top: ${table.position.y}px;">
                <div class="table-header">
                    ${table.data.name}
                    ${isJunction ? '<span class="junction-indicator">JUNCTION</span>' : ''}
                </div>
`;

    // Columns
    table.data.columns.forEach(col => {
      const pkIcon = col.isPrimaryKey ? '<span class="key-icon pk-icon">🔑</span>' : '<span class="key-icon"></span>';
      const fkIcon = col.isForeignKey ? '<span class="key-icon fk-icon">➜</span>' : '';
      
      const isCompositeFK = col.foreignKeyGroup && col.foreignKeyGroupSize > 1;
      const compositeInfo = isCompositeFK 
        ? `<span class="composite-indicator">[${col.foreignKeyGroupIndex + 1}/${col.foreignKeyGroupSize}]</span>` 
        : '';
      
      const fkBadge = col.isForeignKey && col.references 
        ? `<span class="fk-badge">→ ${col.references}</span>` 
        : '';

      html += `
                <div class="column-row">
                    ${pkIcon}
                    ${fkIcon}
                    <span class="column-name">${col.name}</span>
                    ${compositeInfo}
                    ${fkBadge}
                    <span class="column-type">${col.type}</span>
                </div>
`;
    });

    html += `
            </div>
`;
  });

  html += `
        </div>
        
        <div class="legend">
            <div class="legend-item">
                <span class="arrow-symbol">🔑</span>
                <span>Primary Key</span>
            </div>
            <div class="legend-item">
                <span class="arrow-symbol">➜</span>
                <span>Foreign Key</span>
            </div>
            <div class="legend-item">
                <div class="legend-line" style="background: #3498db; height: 3px;"></div>
                <span style="color: #3498db; font-weight: bold;">1:N</span>
                <span>One-to-Many (Required)</span>
            </div>
            <div class="legend-item">
                <div class="legend-line dashed" style="border-color: #27ae60; height: 0;"></div>
                <span style="color: #27ae60; font-weight: bold;">0..1:N</span>
                <span>One-to-Many (Optional)</span>
            </div>
            <div class="legend-item">
                <div class="legend-line" style="background: #e74c3c; height: 3px;"></div>
                <span style="color: #e74c3c; font-weight: bold;">N:M</span>
                <span>Many-to-Many (via Junction)</span>
            </div>
            <div class="legend-item">
                <span style="color: #e74c3c; font-weight: bold;">[1/2]</span>
                <span>Composite Foreign Key</span>
            </div>
        </div>
    </div>
</body>
</html>
`;

  return html;
};

/**
 * Downloads the DSD as an HTML file
 * @param {Array} nodes - Array of nodes
 * @param {String} filename - The file name
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
