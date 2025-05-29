const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// Create a new database or open existing one
const db = new sqlite3.Database('./luavang.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database');
    createTables();
  }
});

// Function to create tables
function createTables() {
  console.log('Creating tables...');
  
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
    } else {
      console.log('Users table created or already exists');
      
      // Create categories table
      db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL
        )
      `, (err) => {
        if (err) {
          console.error('Error creating categories table:', err.message);
        } else {
          console.log('Categories table created or already exists');
          
          // Create products table with foreign key
          db.run(`
            CREATE TABLE IF NOT EXISTS products (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              description TEXT,
              price REAL NOT NULL,
              image TEXT,
              category_id INTEGER,
              FOREIGN KEY (category_id) REFERENCES categories (id)
            )
          `, (err) => {
            if (err) {
              console.error('Error creating products table:', err.message);
            } else {
              console.log('Products table created or already exists');
              
              // Create feedback table
              db.run(`
                CREATE TABLE IF NOT EXISTS feedback (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  email TEXT NOT NULL,
                  message TEXT NOT NULL,
                  created_at TEXT NOT NULL
                )
              `, (err) => {
                if (err) {
                  console.error('Error creating feedback table:', err.message);
                } else {
                  console.log('Feedback table created or already exists');
                  insertSampleData();
                }
              });
            }
          });
        }
      });
    }
  });
}

// Function to insert sample data
function insertSampleData() {
  console.log('Inserting sample data...');
  
  // Check if admin user exists
  db.get('SELECT COUNT(*) as count FROM users WHERE username = ?', ['suongngo1811@gmail.com'], (err, result) => {
    if (err) {
      console.error('Error checking admin user:', err.message);
      return;
    }
    
    if (result.count === 0) {
      // Insert admin user with hashed password
      bcrypt.hash('Suongngo@1234', 10, (err, hash) => {
        if (err) {
          console.error('Error hashing password:', err.message);
          return;
        }
        
        db.run(
          'INSERT INTO users (username, password, is_admin, created_at) VALUES (?, ?, ?, datetime("now"))',
          ['suongngo1811@gmail.com', hash, 1],
          function(err) {
            if (err) {
              console.error('Error inserting admin user:', err.message);
            } else {
              console.log(`Admin user inserted with ID ${this.lastID}`);
            }
          }
        );
      });
    } else {
      console.log('Admin user already exists');
    }
  });
  
  // Check if categories table is empty
  db.get('SELECT COUNT(*) as count FROM categories', (err, result) => {
    if (err) {
      console.error('Error checking categories table:', err.message);
      return;
    }
    
    if (result.count === 0) {
      // Insert categories
      const categories = [
        { name: 'Rice' },
        { name: 'Rice Seeds' }
      ];
      
      categories.forEach(category => {
        db.run('INSERT INTO categories (name) VALUES (?)', [category.name], function(err) {
          if (err) {
            console.error('Error inserting category:', err.message);
          } else {
            console.log(`Category "${category.name}" inserted with ID ${this.lastID}`);
          }
        });
      });
      
      // Wait for categories to be inserted
      setTimeout(() => {
        // Check if products table is empty
        db.get('SELECT COUNT(*) as count FROM products', (err, result) => {
          if (err) {
            console.error('Error checking products table:', err.message);
            return;
          }
          
          if (result.count === 0) {
            // Insert products
            const products = [
              { name: 'Premium Basmati Rice', description: 'Authentic premium quality Basmati rice imported from India', price: 18.99, image: 'images/rice1.jpg', category_id: 1 },
              { name: 'Organic Thai Jasmine Rice', description: 'Certified organic fragrant and aromatic Thai Jasmine rice', price: 14.99, image: 'images/rice2.jpg', category_id: 1 },
              { name: 'Italian Arborio Rice', description: 'Perfect for making risotto', price: 14.99, image: 'images/rice3.jpg', category_id: 1 },
              { name: 'Premium VN20 Rice Seeds', description: 'High-quality certified organic rice seeds with 95% germination rate', price: 29.99, image: 'images/VN20.jpg', category_id: 2 },
              { name: 'IR 4625 Premium Hybrid Seeds', description: 'Drought-resistant high yielding rice seeds with excellent pest tolerance', price: 26.99, image: 'images/ir4625.jpg', category_id: 2 },
              { name: 'Organic OM 4900 Rice Seeds', description: 'Traditional Vietnamese rice variety with exceptional flavor profile', price: 24.99, image: 'images/om4900.jpg', category_id: 2 }
            ];
            
            products.forEach(product => {
              db.run(
                'INSERT INTO products (name, description, price, image, category_id) VALUES (?, ?, ?, ?, ?)',
                [product.name, product.description, product.price, product.image, product.category_id],
                function(err) {
                  if (err) {
                    console.error('Error inserting product:', err.message);
                  } else {
                    console.log(`Product "${product.name}" inserted with ID ${this.lastID}`);
                  }
                }
              );
            });
          } else {
            console.log('Products table already has data');
          }
        });
      }, 1000);
    } else {
      console.log('Categories table already has data');
    }
  });
}

// Close the database connection when done
process.on('SIGINT', () => {
  db.close(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});
