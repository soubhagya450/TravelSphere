// Centralized API Client and Notification Helper

const API_BASE = '/api';

const API = {
  getToken() {
    return localStorage.getItem('travel_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('travel_token', token);
    } else {
      localStorage.removeItem('travel_token');
    }
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('travel_user'));
    } catch {
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('travel_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('travel_user');
    }
  },

  clearAuth() {
    localStorage.removeItem('travel_token');
    localStorage.removeItem('travel_user');
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          if (window.location.pathname.includes('dashboard') || 
              window.location.pathname.includes('booking') || 
              window.location.pathname.includes('payment') ||
              window.location.pathname.includes('my-bookings') ||
              window.location.pathname.includes('admin')) {
            this.clearAuth();
            window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
          }
        }
        const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      throw err;
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${message}</span>
      <button style="background:none;border:none;color:#9ca3af;cursor:pointer;margin-left:0.5rem;" onclick="this.parentElement.remove()">&times;</button>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4500);
  }
};
