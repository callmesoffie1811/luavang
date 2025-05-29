// Authentication utilities for client-side pages

// Check if user is logged in and update UI accordingly
async function checkAuthStatus() {
  try {
    const response = await fetch('/api/user', {
      credentials: 'include'
    });
    
    const navLoginLink = document.querySelector('a[href="login.html"]');
    
    if (response.ok) {
      const user = await response.json();
      
      // Update login nav item to show logout instead
      if (navLoginLink) {
        navLoginLink.textContent = 'Logout';
        navLoginLink.href = '#';
        navLoginLink.addEventListener('click', function(e) {
          e.preventDefault();
          logout();
        });
      }
      
      // Add admin link if user is admin
      if (user.is_admin === 1) {
        const navUl = document.querySelector('#navbarNav ul');
        if (navUl) {
          const adminLi = document.createElement('li');
          adminLi.className = 'nav-item';
          
          const adminLink = document.createElement('a');
          adminLink.className = 'nav-link';
          adminLink.href = 'admin.html';
          adminLink.textContent = 'Admin';
          
          adminLi.appendChild(adminLink);
          navUl.appendChild(adminLi);
        }
      }
      
      return user;
    } else {
      // User is not logged in
      if (navLoginLink) {
        navLoginLink.textContent = 'Login';
        navLoginLink.href = 'login.html';
      }
      return null;
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return null;
  }
}

// Logout function
async function logout() {
  try {
    const response = await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    if (response.ok) {
      window.location.href = 'index.html';
    } else {
      console.error('Logout failed');
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Call this on every page load
document.addEventListener('DOMContentLoaded', function() {
  checkAuthStatus();
});
