document.addEventListener('DOMContentLoaded', function() {
  // Check if user is already logged in
  checkLoginStatus();
  
  // Handle login form submission
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // Send email as username since server expects a username parameter
            username: email,
            password: password
          })
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('Login successful:', userData);
          
          // Redirect based on user role
          if (userData.is_admin === 1) {
            window.location.href = 'admin.html';
          } else {
            window.location.href = 'index.html';
          }
        } else {
          const errorData = await response.json();
          alert('Login failed: ' + (errorData.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
      }
    });
  }
  
  // Handle registration form submission
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      // Validate passwords match
      if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }
      
      // Validate password strength
      if (password.length < 8) {
        alert('Password must be at least 8 characters long');
        return;
      }
      
      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // Send email as username since server expects a username parameter
            username: email,
            password: password
          })
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('Registration successful:', userData);
          alert('Registration successful! You are now logged in.');
          window.location.href = 'index.html';
        } else {
          const errorData = await response.json();
          alert('Registration failed: ' + (errorData.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed. Please try again.');
      }
    });
  }
  
  // Function to check if user is already logged in
  async function checkLoginStatus() {
    try {
      const response = await fetch('/api/user', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('User is logged in:', userData);
        
        // Redirect based on user role if they're already on the login page
        if (window.location.pathname.includes('login.html')) {
          if (userData.is_admin === 1) {
            window.location.href = 'admin.html';
          } else {
            window.location.href = 'index.html';
          }
        }
      }
    } catch (error) {
      console.error('Error checking login status:', error);
    }
  }
});
