const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, '/')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'luavang-secret-key',
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 3600000 } // 1 hour
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.get('SELECT id, username, is_admin FROM users WHERE id = ?', [id], (err, user) => {
    if (err) return done(err);
    done(null, user);
  });
});

// Setup Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  (accessToken, refreshToken, profile, done) => {
    // Check if user exists in our database
    db.get('SELECT * FROM users WHERE google_id = ?', [profile.id], (err, user) => {
      if (err) return done(err);
      
      if (user) {
        // User exists, log them in
        return done(null, user);
      } else {
        // User doesn't exist, create a new user
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : '';
        const displayName = profile.displayName || email;
        
        // First check if the email is already registered
        db.get('SELECT * FROM users WHERE username = ?', [email], (err, existingUser) => {
          if (err) return done(err);
          
          if (existingUser) {
            // Update existing user with Google ID
            db.run('UPDATE users SET google_id = ? WHERE id = ?', 
              [profile.id, existingUser.id], 
              (err) => {
                if (err) return done(err);
                return done(null, existingUser);
              }
            );
          } else {
            // Create new user
            db.run(
              'INSERT INTO users (username, google_id, is_admin, created_at) VALUES (?, ?, 0, datetime("now"))',
              [email, profile.id],
              function(err) {
                if (err) return done(err);
                
                const newUser = {
                  id: this.lastID,
                  username: email,
                  is_admin: 0,
                  google_id: profile.id
                };
                
                return done(null, newUser);
              }
            );
          }
        });
      }
    });
  }
));

// Database connection
const db = new sqlite3.Database('./luavang.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database');
  }
});

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
};

// Admin middleware
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.is_admin === 1) {
    next();
  } else {
    res.status(403).json({ error: 'Not authorized' });
  }
};

// Google OAuth routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  (req, res) => {
    // Successful authentication
    req.session.user = {
      id: req.user.id,
      username: req.user.username,
      is_admin: req.user.is_admin
    };
    
    // Redirect based on user role
    if (req.user.is_admin === 1) {
      res.redirect('/admin.html');
    } else {
      res.redirect('/index.html');
    }
  }
);

// Auth routes
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log('Login attempt with username:', username);
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      console.error('Database error during login:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    if (!user) {
      console.log('Login failed: User not found');
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    bcrypt.compare(password, user.password, (err, match) => {
      if (err) {
        console.error('Password comparison error:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      if (!match) {
        console.log('Login failed: Password mismatch');
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      
      console.log('Login successful for user:', user.username, 'Admin:', user.is_admin);
      
      // Set user session without password
      req.session.user = {
        id: user.id,
        username: user.username,
        is_admin: user.is_admin
      };
      
      res.json({
        id: user.id,
        username: user.username,
        is_admin: user.is_admin
      });
    });
  });
});

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  
  console.log('Register attempt with:', { username });
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  // Check password requirements
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }
  
  // Check if username already exists
  db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      console.error('Registration error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    if (user) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    
    // Hash password
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        console.error('Password hashing error:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      // Insert new user
      db.run(
        'INSERT INTO users (username, password, is_admin, created_at) VALUES (?, ?, 0, datetime("now"))',
        [username, hash],
        function(err) {
          if (err) {
            console.error('User insertion error:', err.message);
            return res.status(500).json({ error: err.message });
          }
          
          // Set user session
          req.session.user = {
            id: this.lastID,
            username: username,
            is_admin: 0
          };
          
          res.json({
            id: this.lastID,
            username: username,
            is_admin: 0,
            message: 'User registered successfully'
          });
        }
      );
    });
  });
});

app.get('/api/user', (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Check if user is admin
app.get('/api/admin-check', isAuthenticated, (req, res) => {
  res.json({ is_admin: req.session.user.is_admin === 1 });
});

// API routes
// Get all products
app.get('/api/products', (req, res) => {
  const query = `
    SELECT p.id, p.name, p.description, p.price, p.image, c.name as category
    FROM products p
    JOIN categories c ON p.category_id = c.id
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get products by category
app.get('/api/products/category/:id', (req, res) => {
  const categoryId = req.params.id;
  
  const query = `
    SELECT p.id, p.name, p.description, p.price, p.image, c.name as category
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.category_id = ?
  `;
  
  db.all(query, [categoryId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Search products
app.get('/api/products/search', (req, res) => {
  const searchTerm = req.query.term || '';
  
  const query = `
    SELECT p.id, p.name, p.description, p.price, p.image, c.name as category
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.name LIKE ? OR p.description LIKE ?
  `;
  
  db.all(query, [`%${searchTerm}%`, `%${searchTerm}%`], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get all categories
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Add a new product (admin only)
app.post('/api/products', isAdmin, (req, res) => {
  const { name, description, price, image, category_id } = req.body;
  
  if (!name || !price || !category_id) {
    return res.status(400).json({ error: 'Name, price, and category are required' });
  }
  
  const query = `
    INSERT INTO products (name, description, price, image, category_id)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  db.run(query, [name, description, price, image, category_id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json({
      id: this.lastID,
      message: 'Product added successfully'
    });
  });
});

// Save feedback form
app.post('/api/feedback', (req, res) => {
  const { name, email, message } = req.body;
  
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }
  
  const query = `
    INSERT INTO feedback (name, email, message, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `;
  
  db.run(query, [name, email, message], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json({
      id: this.lastID,
      message: 'Feedback submitted successfully'
    });
  });
});

// Get all feedback (admin only)
app.get('/api/feedback', isAdmin, (req, res) => {
  db.all('SELECT * FROM feedback ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Serve admin page only if authenticated as admin
app.get('/admin.html', (req, res, next) => {
  if (req.session.user && req.session.user.is_admin === 1) {
    next();
  } else {
    res.redirect('/login.html');
  }
});

// Add additional protection for admin resources
app.use('/admin-*.js', (req, res, next) => {
  if (req.session.user && req.session.user.is_admin === 1) {
    next();
  } else {
    res.status(403).send('Forbidden');
  }
});

app.use('/admin-*.css', (req, res, next) => {
  if (req.session.user && req.session.user.is_admin === 1) {
    next();
  } else {
    res.status(403).send('Forbidden');
  }
});

// 404 Error Handler - This should be after all other routes
app.use((req, res, next) => {
  // Check if the request accepts HTML
  if (req.accepts('html')) {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
  } 
  // Check if the request accepts JSON
  else if (req.accepts('json')) {
    res.status(404).json({ error: 'Not found' });
  } 
  // Default to plain text
  else {
    res.status(404).type('txt').send('Not found');
  }
});

// 500 Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Check if the request accepts HTML
  if (req.accepts('html')) {
    res.status(500).sendFile(path.join(__dirname, '500.html'));
  } 
  // Check if the request accepts JSON
  else if (req.accepts('json')) {
    res.status(500).json({ error: 'Server error occurred' });
  } 
  // Default to plain text
  else {
    res.status(500).type('txt').send('Server error');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Close database connection when server is shutting down
process.on('SIGINT', () => {
  db.close(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});
