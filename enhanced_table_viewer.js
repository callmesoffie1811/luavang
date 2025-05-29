const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  fg: {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    red: '\x1b[31m'
  }
};

// Utility function to format phone numbers
function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return '';
  
  // Remove non-digit characters
  const cleaned = String(phoneNumber).replace(/\D/g, '');
  
  // Format based on length
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6, 10)}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 11)}`;
  } else {
    return phoneNumber; // Return original if can't format
  }
}

// Detect if a column might contain phone numbers
function isPhoneNumberColumn(columnName, rows) {
  const phoneColumnNames = ['phone', 'phonenumber', 'mobile', 'cell', 'telephone', 'contact'];
  
  // Check if column name suggests it's a phone number
  const lowerColName = columnName.toLowerCase();
  if (phoneColumnNames.some(name => lowerColName.includes(name))) {
    return true;
  }
  
  // Check if content looks like phone numbers
  if (rows && rows.length > 0) {
    const sampleValues = rows.slice(0, 5).map(row => row[columnName]).filter(Boolean);
    if (sampleValues.length > 0) {
      const phonePattern = /^[\d\s\(\)\-\+]{7,15}$/;
      const potentialPhones = sampleValues.filter(val => phonePattern.test(String(val)));
      return potentialPhones.length >= Math.ceil(sampleValues.length * 0.6); // 60% should match
    }
  }
  
  return false;
}

// Open the database
const db = new sqlite3.Database('./luavang.db', sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log(colors.bright + 'Connected to the luavang database.' + colors.reset);
  showMainMenu();
});

// Main menu function
function showMainMenu() {
  console.log('\n' + colors.bright + colors.fg.cyan + '==== SQLite Database Viewer ====' + colors.reset);
  console.log('1. List all tables');
  console.log('2. View table structure');
  console.log('3. View table data');
  console.log('4. Execute custom SQL query');
  console.log('5. Search for phone number');
  console.log('6. Exit');
  
  rl.question('\nSelect an option (1-6): ', (answer) => {
    switch (answer.trim()) {
      case '1':
        listTables();
        break;
      case '2':
        listTables(() => {
          rl.question('Enter table name to view structure: ', (tableName) => {
            viewTableStructure(tableName);
          });
        });
        break;
      case '3':
        listTables(() => {
          rl.question('Enter table name to view data: ', (tableName) => {
            viewTableData(tableName);
          });
        });
        break;
      case '4':
        rl.question('Enter SQL query: ', (query) => {
          executeCustomQuery(query);
        });
        break;
      case '5':
        searchPhoneNumber();
        break;
      case '6':
        exitProgram();
        break;
      default:
        console.log(colors.fg.yellow + 'Invalid option. Please try again.' + colors.reset);
        showMainMenu();
        break;
    }
  });
}

// List all tables
function listTables(callback) {
  db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, tables) => {
    if (err) {
      console.error('Error getting tables:', err.message);
      return showMainMenu();
    }
    
    console.log('\n' + colors.bright + colors.fg.green + '=== Tables in Database ===' + colors.reset);
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.name}`);
    });
    
    if (callback) {
      callback();
    } else {
      showMainMenu();
    }
  });
}

// View table structure
function viewTableStructure(tableName) {
  db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
    if (err) {
      console.error(`Error getting structure for table ${tableName}:`, err.message);
      return showMainMenu();
    }
    
    if (columns.length === 0) {
      console.log(colors.fg.yellow + `Table "${tableName}" not found or has no columns.` + colors.reset);
      return showMainMenu();
    }
    
    console.log('\n' + colors.bright + colors.fg.magenta + `=== Structure of "${tableName}" Table ===` + colors.reset);
    console.log('\nColumn Name\tType\t\tConstraints');
    console.log('-------------------------------------------');
    
    columns.forEach(column => {
      let constraints = [];
      if (column.pk === 1) constraints.push('PRIMARY KEY');
      if (column.notnull === 1) constraints.push('NOT NULL');
      if (column.dflt_value) constraints.push(`DEFAULT ${column.dflt_value}`);
      
      console.log(
        `${colors.fg.cyan}${column.name}${colors.reset}\t` +
        `${colors.fg.blue}${column.type.padEnd(10)}${colors.reset}\t` +
        `${colors.fg.yellow}${constraints.join(', ')}${colors.reset}`
      );
    });
    
    showMainMenu();
  });
}

// View table data with pagination
function viewTableData(tableName) {
  // First check if table exists
  db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName], (err, table) => {
    if (err) {
      console.error(`Error checking table ${tableName}:`, err.message);
      return showMainMenu();
    }
    
    if (!table) {
      console.log(colors.fg.yellow + `Table "${tableName}" not found.` + colors.reset);
      return showMainMenu();
    }
    
    // Get count of rows
    db.get(`SELECT COUNT(*) as count FROM ${tableName}`, [], (err, result) => {
      if (err) {
        console.error(`Error counting rows in ${tableName}:`, err.message);
        return showMainMenu();
      }
      
      const totalRows = result.count;
      const pageSize = 10; // Number of rows per page
      let currentPage = 1;
      const totalPages = Math.ceil(totalRows / pageSize);
      
      // Function to display a page of data
      function displayPage(page) {
        const offset = (page - 1) * pageSize;
        
        db.all(`SELECT * FROM ${tableName} LIMIT ${pageSize} OFFSET ${offset}`, [], (err, rows) => {
          if (err) {
            console.error(`Error querying ${tableName}:`, err.message);
            return showMainMenu();
          }
          
          console.log('\n' + colors.bright + colors.fg.green + 
            `=== Data in "${tableName}" (Page ${page}/${totalPages}, ${totalRows} total rows) ===` + 
            colors.reset);
          
          if (rows.length === 0) {
            console.log(colors.fg.yellow + 'No data found.' + colors.reset);
          } else {
            // Format phone number columns before display
            if (rows.length > 0) {
              const columns = Object.keys(rows[0]);
              const phoneColumns = columns.filter(col => isPhoneNumberColumn(col, rows));
              
              if (phoneColumns.length > 0) {
                console.log(colors.fg.blue + `Detected phone number column(s): ${phoneColumns.join(', ')}` + colors.reset);
                
                // Format phone numbers in the detected columns
                rows = rows.map(row => {
                  const formattedRow = {...row};
                  phoneColumns.forEach(col => {
                    if (row[col]) {
                      formattedRow[col] = formatPhoneNumber(row[col]);
                    }
                  });
                  return formattedRow;
                });
              }
            }
            
            // Display special formatting for likely phone numbers
            displayFormattedTable(rows);
          }
          
          if (totalPages > 1) {
            console.log('\nNavigation options:');
            if (page > 1) console.log('p - Previous page');
            if (page < totalPages) console.log('n - Next page');
            console.log('g <number> - Go to page');
            console.log('m - Return to main menu');
            
            rl.question('Enter option: ', (option) => {
              option = option.trim().toLowerCase();
              
              if (option === 'p' && page > 1) {
                displayPage(page - 1);
              } else if (option === 'n' && page < totalPages) {
                displayPage(page + 1);
              } else if (option.startsWith('g ')) {
                const pageNum = parseInt(option.substring(2), 10);
                if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                  displayPage(pageNum);
                } else {
                  console.log(colors.fg.yellow + `Invalid page number. Valid range: 1-${totalPages}` + colors.reset);
                  displayPage(page);
                }
              } else if (option === 'm') {
                showMainMenu();
              } else {
                console.log(colors.fg.yellow + 'Invalid option.' + colors.reset);
                displayPage(page);
              }
            });
          } else {
            // If only one page, wait for any key to continue
            rl.question('\nPress Enter to return to main menu...', () => {
              showMainMenu();
            });
          }
        });
      }
      
      // Start by displaying the first page
      displayPage(currentPage);
    });
  });
}

// Function to display formatted table with better handling of phone numbers
function displayFormattedTable(rows) {
  if (!rows || rows.length === 0) {
    return console.log(colors.fg.yellow + 'No data to display' + colors.reset);
  }
  
  // Get all column names
  const columns = Object.keys(rows[0]);
  
  // Determine the max width for each column
  const columnWidths = {};
  columns.forEach(col => {
    // Start with column name length
    columnWidths[col] = col.length;
    
    // Check data for longer values
    rows.forEach(row => {
      const cellValue = row[col] === null ? 'NULL' : String(row[col]);
      columnWidths[col] = Math.max(columnWidths[col], cellValue.length);
    });
    
    // Add some padding and cap at reasonable width
    columnWidths[col] = Math.min(columnWidths[col] + 2, 50);
  });
  
  // Identify phone number columns
  const phoneColumns = columns.filter(col => isPhoneNumberColumn(col, rows));
  
  // Print header row
  let header = '';
  columns.forEach(col => {
    header += colors.bright + colors.fg.cyan + col.padEnd(columnWidths[col]) + colors.reset;
  });
  console.log(header);
  
  // Print separator
  let separator = '';
  columns.forEach(col => {
    separator += colors.fg.cyan + '-'.repeat(columnWidths[col]) + colors.reset;
  });
  console.log(separator);
  
  // Print data rows
  rows.forEach((row, idx) => {
    let rowStr = '';
    columns.forEach(col => {
      const cellValue = row[col] === null ? 'NULL' : String(row[col]);
      
      // Apply special formatting for phone numbers
      if (phoneColumns.includes(col)) {
        rowStr += colors.fg.green + cellValue.padEnd(columnWidths[col]) + colors.reset;
      } else {
        // Alternate row colors for better readability
        const rowColor = idx % 2 === 0 ? colors.reset : colors.dim;
        rowStr += rowColor + cellValue.padEnd(columnWidths[col]) + colors.reset;
      }
    });
    console.log(rowStr);
  });
}

// Execute custom SQL query
function executeCustomQuery(query) {
  // Determine if the query is SELECT (read) or other (write)
  const isSelect = query.trim().toUpperCase().startsWith('SELECT');
  
  if (isSelect) {
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Error executing query:', err.message);
      } else {
        console.log('\n' + colors.bright + colors.fg.blue + '=== Query Results ===' + colors.reset);
        if (rows.length === 0) {
          console.log(colors.fg.yellow + 'No results returned.' + colors.reset);
        } else {
          // Check if any columns might be phone numbers and format them
          if (rows.length > 0) {
            const columns = Object.keys(rows[0]);
            const phoneColumns = columns.filter(col => isPhoneNumberColumn(col, rows));
            
            if (phoneColumns.length > 0) {
              console.log(colors.fg.blue + `Formatting detected phone columns: ${phoneColumns.join(', ')}` + colors.reset);
              rows = rows.map(row => {
                const formattedRow = {...row};
                phoneColumns.forEach(col => {
                  if (row[col]) {
                    formattedRow[col] = formatPhoneNumber(row[col]);
                  }
                });
                return formattedRow;
              });
            }
          }
          
          displayFormattedTable(rows);
          console.log(`${rows.length} row(s) returned.`);
        }
      }
      showMainMenu();
    });
  } else {
    console.log(colors.fg.yellow + 'Only SELECT queries are allowed in read-only mode.' + colors.reset);
    showMainMenu();
  }
}

// Add new option to the main menu for phone number search
function showMainMenu() {
  console.log('\n' + colors.bright + colors.fg.cyan + '==== SQLite Database Viewer ====' + colors.reset);
  console.log('1. List all tables');
  console.log('2. View table structure');
  console.log('3. View table data');
  console.log('4. Execute custom SQL query');
  console.log('5. Search for phone number');
  console.log('6. Exit');
  
  rl.question('\nSelect an option (1-6): ', (answer) => {
    switch (answer.trim()) {
      case '1':
        listTables();
        break;
      case '2':
        listTables(() => {
          rl.question('Enter table name to view structure: ', (tableName) => {
            viewTableStructure(tableName);
          });
        });
        break;
      case '3':
        listTables(() => {
          rl.question('Enter table name to view data: ', (tableName) => {
            viewTableData(tableName);
          });
        });
        break;
      case '4':
        rl.question('Enter SQL query: ', (query) => {
          executeCustomQuery(query);
        });
        break;
      case '5':
        searchPhoneNumber();
        break;
      case '6':
        exitProgram();
        break;
      default:
        console.log(colors.fg.yellow + 'Invalid option. Please try again.' + colors.reset);
        showMainMenu();
        break;
    }
  });
}

// Function to search for phone numbers across tables
function searchPhoneNumber() {
  rl.question('Enter phone number to search (partial or complete): ', async (phoneNumber) => {
    if (!phoneNumber.trim()) {
      console.log(colors.fg.yellow + 'Search cancelled. Empty input.' + colors.reset);
      return showMainMenu();
    }
    
    // Clean the search pattern
    const searchPattern = phoneNumber.replace(/\D/g, '');
    if (searchPattern.length < 3) {
      console.log(colors.fg.yellow + 'Please enter at least 3 digits to search.' + colors.reset);
      return showMainMenu();
    }
    
    console.log(colors.bright + `Searching for phone number containing "${searchPattern}"...` + colors.reset);
    
    try {
      // Get all tables
      const tables = await new Promise((resolve, reject) => {
        db.all(`SELECT name FROM sqlite_master WHERE type='table'`, [], (err, tables) => {
          if (err) reject(err);
          else resolve(tables.map(t => t.name));
        });
      });
      
      let resultsFound = false;
      
      // Check each table
      for (const tableName of tables) {
        if (tableName === 'sqlite_sequence') continue; // Skip internal SQLite tables
        
        // Get columns for this table
        const columns = await new Promise((resolve, reject) => {
          db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
            if (err) reject(err);
            else resolve(columns.map(c => c.name));
          });
        });
        
        // For each column, check if it might contain a phone number
        for (const column of columns) {
          // Check text-like columns that could contain phone numbers
          if (column.toLowerCase().includes('phone') || 
              column.toLowerCase().includes('mobile') || 
              column.toLowerCase().includes('contact')) {
            
            // Search for matching phone numbers
            const results = await new Promise((resolve, reject) => {
              db.all(
                `SELECT * FROM ${tableName} WHERE CAST(${column} AS TEXT) LIKE ?`,
                [`%${searchPattern}%`],
                (err, rows) => {
                  if (err) reject(err);
                  else resolve(rows);
                }
              );
            });
            
            if (results.length > 0) {
              resultsFound = true;
              console.log('\n' + colors.fg.green + 
                `Found ${results.length} matches in table "${tableName}", column "${column}":` + 
                colors.reset);
              
              // Format phone numbers before display
              results.forEach(row => {
                if (row[column]) {
                  row[column] = formatPhoneNumber(row[column]);
                }
              });
              
              displayFormattedTable(results);
            }
          }
        }
      }
      
      if (!resultsFound) {
        console.log(colors.fg.yellow + `No phone numbers found matching "${phoneNumber}".` + colors.reset);
      }
      
    } catch (error) {
      console.error('Error during search:', error.message);
    }
    
    // Return to main menu
    rl.question('\nPress Enter to return to main menu...', () => {
      showMainMenu();
    });
  });
}

// Exit the program
function exitProgram() {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log(colors.fg.green + 'Database connection closed.' + colors.reset);
    }
    rl.close();
    process.exit(0);
  });
}

// Handle CTRL+C
rl.on('SIGINT', () => {
  exitProgram();
});
