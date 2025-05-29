document.addEventListener("DOMContentLoaded", function () {
    const forms = document.querySelectorAll(".needs-validation");
  
    forms.forEach(function (form) {
      form.addEventListener("submit", function (event) {
        const name = form.querySelector("#name");
        const email = form.querySelector("#email");
        const phone = form.querySelector("#phone");
        const message = form.querySelector("#message");
  
        let valid = true;
  
        // Email validation
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email.value)) {
          email.setCustomValidity("Please enter a valid email address.");
          valid = false;
        } else {
          email.setCustomValidity("");
        }
  
        // Phone validation: 8–15 digits
        const phoneRegex = /^[0-9]{8,15}$/;
        if (!phoneRegex.test(phone.value)) {
          phone.setCustomValidity("Phone must be 8 to 15 digits.");
          valid = false;
        } else {
          phone.setCustomValidity("");
        }
  
        if (!form.checkValidity() || !valid) {
          event.preventDefault();
          event.stopPropagation();
        }
  
        form.classList.add("was-validated");
      });
    });
  });

  document.addEventListener("DOMContentLoaded", function () {
    const button = document.querySelector(".floating-button");
    const icon = button.querySelector("i");
    const container = document.querySelector(".floating-container");
  
    button.addEventListener("click", () => {
      container.classList.toggle("show");
  
      if (container.classList.contains("show")) {
        icon.classList.remove("fa-comment-dots");
        icon.classList.add("fa-times");
      } else {
        icon.classList.remove("fa-times");
        icon.classList.add("fa-comment-dots");
      }
    });
  });
  
  function toggleChatOptions() {
    const options = document.getElementById('chatOptions');
    options.style.display = options.style.display === 'flex' ? 'none' : 'flex';
  }

  function validateForm() {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const message = document.getElementById('message').value.trim();
    const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;
  
    if (name.length < 2) {
      alert('Please enter a valid name.');
      return false;
    }
  
    if (!email.match(emailPattern)) {
      alert('Please enter a valid email address.');
      return false;
    }
  
    if (message.length < 10) {
      alert('Message should be at least 10 characters long.');
      return false;
    }
  
    return true;
  }
  

  // Bootstrap-style form validation
(() => {
  const form = document.getElementById('contactForm');
  
  form.addEventListener('submit', function (event) {
    if (!form.checkValidity()) {
      event.preventDefault();
      event.stopPropagation();
    }

    form.classList.add('was-validated');
  });

  form.addEventListener('reset', function () {
    form.classList.remove('was-validated');
  });
})();

// Bootstrap validation ricepage
(() => {
  const form = document.getElementById('contactForm');

  form.addEventListener('submit', function (event) {
    if (!form.checkValidity()) {
      event.preventDefault();
      event.stopPropagation();
    }

    form.classList.add('was-validated');
  });
})();

// Check login status and update navigation
document.addEventListener('DOMContentLoaded', function() {
  checkLoginStatus();
});

async function checkLoginStatus() {
  try {
    const response = await fetch('/api/user');
    
    // Update navigation based on login status
    const navbarNav = document.getElementById('navbarNav');
    if (!navbarNav) return;
    
    const navList = navbarNav.querySelector('ul');
    
    if (response.ok) {
      // User is logged in
      const userData = await response.json();
      
      // Find login link and replace with account info
      const loginItem = Array.from(navList.querySelectorAll('li')).find(
        li => li.querySelector('a').getAttribute('href') === 'login.html'
      );
      
      if (loginItem) {
        loginItem.innerHTML = `<a class="nav-link" href="#">${userData.username}</a>`;
      }
      
      // Add logout button if not exists
      const logoutExists = Array.from(navList.querySelectorAll('li')).some(
        li => li.querySelector('a').getAttribute('id') === 'logoutBtn'
      );
      
      if (!logoutExists) {
        const logoutItem = document.createElement('li');
        logoutItem.className = 'nav-item';
        logoutItem.innerHTML = `<a class="nav-link" href="#" id="logoutBtn">Logout</a>`;
        navList.appendChild(logoutItem);
        
        // Add logout event listener
        document.getElementById('logoutBtn').addEventListener('click', logout);
      }
      
      // Check if admin link exists
      const adminExists = Array.from(navList.querySelectorAll('li')).some(
        li => li.querySelector('a')?.getAttribute('href') === 'admin.html'
      );
      
      // Add or remove admin link based on user role
      if (userData.is_admin === 1) {
        if (!adminExists) {
          const adminItem = document.createElement('li');
          adminItem.className = 'nav-item';
          adminItem.innerHTML = `<a class="nav-link" href="admin.html">Admin</a>`;
          // Insert before logout button
          const logoutItem = Array.from(navList.querySelectorAll('li')).find(
            li => li.querySelector('a').getAttribute('id') === 'logoutBtn'
          );
          if (logoutItem) {
            navList.insertBefore(adminItem, logoutItem);
          } else {
            navList.appendChild(adminItem);
          }
        }
      } else {
        // Remove admin link for non-admin users
        const adminItem = Array.from(navList.querySelectorAll('li')).find(
          li => li.querySelector('a')?.getAttribute('href') === 'admin.html'
        );
        if (adminItem) {
          navList.removeChild(adminItem);
        }
      }
    } else {
      // User is not logged in - remove admin and logout links
      
      // Find and remove logout button
      const logoutItem = Array.from(navList.querySelectorAll('li')).find(
        li => li.querySelector('a').getAttribute('id') === 'logoutBtn'
      );
      if (logoutItem) {
        navList.removeChild(logoutItem);
      }
      
      // Find and remove admin link
      const adminItem = Array.from(navList.querySelectorAll('li')).find(
        li => li.querySelector('a')?.getAttribute('href') === 'admin.html'
      );
      if (adminItem) {
        navList.removeChild(adminItem);
      }
      
      // Ensure login link exists
      const loginExists = Array.from(navList.querySelectorAll('li')).some(
        li => li.querySelector('a').getAttribute('href') === 'login.html'
      );
      if (!loginExists) {
        const loginItem = document.createElement('li');
        loginItem.className = 'nav-item';
        loginItem.innerHTML = `<a class="nav-link" href="login.html"><i class="fas fa-sign-in-alt"></i> Login</a>`;
        navList.appendChild(loginItem);
      }
    }
  } catch (error) {
    console.error('Auth status check error:', error);
    // On error, make sure admin link is not shown
    const navbarNav = document.getElementById('navbarNav');
    if (navbarNav) {
      const navList = navbarNav.querySelector('ul');
      const adminItem = Array.from(navList.querySelectorAll('li')).find(
        li => li.querySelector('a')?.getAttribute('href') === 'admin.html'
      );
      if (adminItem) {
        navList.removeChild(adminItem);
      }
    }
  }
}

async function logout() {
  try {
    const response = await fetch('/api/logout', {
      method: 'POST'
    });
    
    if (response.ok) {
      window.location.reload();
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
}
