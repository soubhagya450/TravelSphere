// Authentication Module

document.addEventListener('DOMContentLoaded', () => {
  renderNavbarAuth();
  initAuthForms();
  initMobileNavToggle();
});

function initMobileNavToggle() {
  const toggleBtn = document.getElementById('mobileNavToggle');
  const navMenu = document.getElementById('navMenu');

  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navMenu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
        navMenu.classList.remove('active');
      }
    });
  }
}


function renderNavbarAuth() {
  const user = API.getUser();
  const authContainer = document.getElementById('navAuthContainer');
  if (!authContainer) return;

  if (user) {
    let adminLink = '';
    if (user.role === 'admin') {
      adminLink = `<a href="/admin.html" class="nav-link" style="color: #a5b4fc;"><span class="badge badge-admin">Admin</span></a>`;
    }

    authContainer.innerHTML = `
      ${adminLink}
      <a href="/my-bookings.html" class="nav-link">My Bookings</a>
      <span style="font-size:0.88rem;color:var(--text-secondary);margin:0 0.4rem;">
        👤 <strong style="color:#fff;">${user.name.split(' ')[0]}</strong>
      </span>
      <button class="btn btn-secondary btn-sm" onclick="handleLogout()">Log Out</button>
    `;
  } else {
    authContainer.innerHTML = `
      <a href="/login.html" class="btn btn-secondary btn-sm">Log In</a>
      <a href="/register.html" class="btn btn-primary btn-sm">Sign Up</a>
    `;
  }
}

async function handleLogout() {
  try {
    await API.post('/auth/logout', {});
  } catch (e) {
    // Ignore error on logout
  }
  API.clearAuth();
  API.showToast('Logged out successfully', 'info');
  setTimeout(() => {
    window.location.href = '/index.html';
  }, 500);
}

function initAuthForms() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      if (!email || !password) {
        API.showToast('Please fill in both email and password', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerText = 'Logging in...';

      try {
        const res = await API.post('/auth/login', { email, password });
        API.setToken(res.data.access_token);
        API.setUser(res.data.user);
        API.showToast(`Welcome back, ${res.data.user.name}!`, 'success');

        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect') || (res.data.user.role === 'admin' ? '/admin.html' : '/dashboard.html');
        setTimeout(() => {
          window.location.href = redirect;
        }, 600);
      } catch (err) {
        API.showToast(err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerText = 'Log In';
      }
    });
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const phone = document.getElementById('phone').value.trim();
      const role = document.getElementById('role') ? document.getElementById('role').value : 'user';
      const submitBtn = registerForm.querySelector('button[type="submit"]');

      if (!name || !email || !password) {
        API.showToast('Please fill in all required fields', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerText = 'Creating account...';

      try {
        const res = await API.post('/auth/register', { name, email, password, phone, role });
        API.setToken(res.data.access_token);
        API.setUser(res.data.user);
        API.showToast('Account created successfully! Welcome to TravelSphere.', 'success');
        setTimeout(() => {
          window.location.href = '/dashboard.html';
        }, 800);
      } catch (err) {
        API.showToast(err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerText = 'Create Account';
      }
    });
  }
}
