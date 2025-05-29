const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const db = new sqlite3.Database('./luavang.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to the luavang database.');
});

// ANSI color codes for better terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
  },
  
  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m'
  }
};

// Function to format rows for better display
function formatTable(rows) {
  if (!rows || rows.length === 0) {
    return '(No data)';
  }
  
  // Get all column names
  const columns = Object.keys(rows[0]);
  
  // Calculate column widths
  const columnWidths = {};
  columns.forEach(column => {
    // Start with the column name length
    columnWidths[column] = column.length;
    
    // Check each row to find the maximum width needed
    rows.forEach(row => {
      const cellValue = row[column] === null ? 'NULL' : String(row[column]);
      columnWidths[column] = Math.max(columnWidths[column], cellValue.length);
    });
    
    // Add some padding
    columnWidths[column] += 2;
  });
  
  // Create the header row
  let output = '\n';
  
  // Add column names
  columns.forEach(column => {
    output += colors.bright + colors.fg.cyan + column.padEnd(columnWidths[column]) + colors.reset;
  });
  output += '\n';
  
  // Add separator
  columns.forEach(column => {
    output += colors.fg.cyan + '─'.repeat(columnWidths[column]) + colors.reset;
  });
  output += '\n';
  
  // Add data rows
  rows.forEach((row, rowIndex) => {
    columns.forEach(column => {
      const cellValue = row[column] === null ? 'NULL' : String(row[column]);
      // Alternate row colors for better readability
      const rowColor = rowIndex % 2 === 0 ? colors.fg.white : colors.dim;
      output += rowColor + cellValue.padEnd(columnWidths[column]) + colors.reset;
    });
    output += '\n';
  });
  
  return output;
}

// Function to get table schema
function getTableSchema(tableName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(columns);
    });
  });
}

// Function to get table data
function getTableData(tableName) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

// Process all tables asynchronously with better flow control
async function processAllTables() {
  try {
    // Get list of tables
    const tables = await new Promise((resolve, reject) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(tables);
      });
    });
    
    console.log(colors.bright + colors.fg.green + '=== Available tables ===\n' + colors.reset);
    tables.forEach(table => {
      console.log(`- ${table.name}`);
    });
    console.log('\n');
    
    // Process each table
    for (const table of tables) {
      if (table.name === 'sqlite_sequence') {
        console.log(colors.dim + '(Skipping sqlite_sequence internal table)' + colors.reset);
        continue;
      }
      
      // Display table header
      console.log(colors.bright + colors.fg.yellow + 
        `\n========== ${table.name.toUpperCase()} TABLE ==========` + 
        colors.reset);
      
      // Get and display table schema
      try {
        const schema = await getTableSchema(table.name);
        console.log(colors.bright + colors.fg.magenta + '\n• Table Structure:' + colors.reset);
        
        // Format schema output
        let schemaOutput = '\n';
        schema.forEach(column => {
          schemaOutput += colors.fg.green + `${column.name}` + colors.reset + 
                         ` (${colors.fg.blue}${column.type}${colors.reset})`;
          
          if (column.pk === 1) {
            schemaOutput += colors.fg.red + ' PRIMARY KEY' + colors.reset;
          }
          if (column.notnull === 1) {
            schemaOutput += colors.fg.yellow + ' NOT NULL' + colors.reset;
          }
          
          schemaOutput += '\n';
        });
        console.log(schemaOutput);
        
        // Get and display table data
        const rows = await getTableData(table.name);
        console.log(colors.bright + colors.fg.magenta + `• Table Data (${rows.length} rows):` + colors.reset);
        console.log(formatTable(rows));
        
        // Add separator between tables
        console.log(colors.fg.yellow + '='.repeat(40) + colors.reset + '\n');
      } catch (err) {
        console.error(`Error processing table ${table.name}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    // Close database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
        return;
      }
      console.log(colors.fg.green + 'Database connection closed.' + colors.reset);
    });
  }
}

// Execute the main function
processAllTables();
