// Admin Dashboard Module

let adminHotels = [];
let adminBookings = [];
let adminUsers = [];

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('adminContainer')) {
    checkAdminAccess();
    initAdminTabs();
    loadAdminData();
    initHotelModalEvents();
    initUserModalEvents();
  }
});

function checkAdminAccess() {
  const user = API.getUser();
  if (!user || user.role !== 'admin') {
    API.showToast('Access denied: Admin privileges required', 'error');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 800);
  }
}

function initAdminTabs() {
  const tabs = document.querySelectorAll('.admin-nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.dataset.tab;
      document.getElementById('tabHotels').style.display = target === 'hotels' ? 'block' : 'none';
      document.getElementById('tabBookings').style.display = target === 'bookings' ? 'block' : 'none';
      document.getElementById('tabUsers').style.display = target === 'users' ? 'block' : 'none';
    });
  });
}

async function loadAdminData() {
  await Promise.all([loadHotels(), loadBookings(), loadUsers()]);
  updateDashboardMetrics();
}

async function loadHotels() {
  try {
    const res = await API.get('/hotels');
    adminHotels = res.hotels || [];
    renderHotelsTable(adminHotels);
  } catch (err) {
    API.showToast(`Error loading hotels: ${err.message}`, 'error');
  }
}

async function loadBookings() {
  try {
    const res = await API.get('/bookings/all');
    adminBookings = res.bookings || [];
    renderBookingsTable(adminBookings);
  } catch (err) {
    API.showToast(`Error loading bookings: ${err.message}`, 'error');
  }
}

async function loadUsers() {
  try {
    const res = await API.get('/auth/users');
    adminUsers = res.users || [];
    renderUsersTable(adminUsers);
  } catch (err) {
    API.showToast(`Error loading users: ${err.message}`, 'error');
  }
}

function updateDashboardMetrics() {
  const hotelsCount = document.getElementById('metricHotelsCount');
  const bookingsCount = document.getElementById('metricBookingsCount');
  const usersCount = document.getElementById('metricUsersCount');
  const revenue = document.getElementById('metricRevenue');

  if (hotelsCount) hotelsCount.innerText = adminHotels.length;
  if (bookingsCount) bookingsCount.innerText = adminBookings.length;
  if (usersCount) usersCount.innerText = adminUsers.length;

  const totalRevenue = adminBookings
    .filter(b => b.status === 'confirmed')
    .reduce((sum, b) => sum + b.total_amount, 0);

  if (revenue) revenue.innerText = `₹${totalRevenue.toLocaleString()}`;
}

function renderHotelsTable(hotels) {
  const tbody = document.getElementById('hotelsTableBody');
  if (!tbody) return;

  if (hotels.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">No hotels registered yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = hotels.map(h => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <img src="${h.image_url}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;" />
          <div>
            <strong>${escapeHTML(h.name)}</strong>
            <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHTML(h.city)}</div>
          </div>
        </div>
      </td>
      <td>${escapeHTML(h.address)}</td>
      <td><strong>₹${h.price_per_night.toLocaleString()}</strong></td>
      <td>${h.total_rooms}</td>
      <td>★ ${h.rating}</td>
      <td>${h.lat.toFixed(4)}, ${h.lng.toFixed(4)}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="openEditHotelModal(${h.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="handleDeleteHotel(${h.id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

function renderBookingsTable(bookings) {
  const tbody = document.getElementById('bookingsTableBody');
  if (!tbody) return;

  if (bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">No bookings made yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = bookings.map(b => {
    let badgeClass = 'badge-pending';
    if (b.status === 'confirmed') badgeClass = 'badge-confirmed';
    if (b.status === 'cancelled') badgeClass = 'badge-cancelled';

    return `
      <tr>
        <td>#${b.id}</td>
        <td>
          <strong>${escapeHTML(b.guest_name || 'Traveler')}</strong>
          <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHTML(b.guest_email || '')}</div>
        </td>
        <td>${b.hotel ? escapeHTML(b.hotel.name) : 'N/A'}</td>
        <td>${b.check_in} → ${b.check_out} (${b.rooms_booked} room)</td>
        <td><strong>₹${b.total_amount.toLocaleString()}</strong></td>
        <td><span class="badge ${badgeClass}">${b.status}</span></td>
        <td>${b.created_at ? b.created_at.split('T')[0] : 'N/A'}</td>
      </tr>
    `;
  }).join('');
}

function renderUsersTable(users) {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No users registered yet.</td></tr>`;
    return;
  }

  const currentUser = API.getUser();

  tbody.innerHTML = users.map(u => {
    const isSelf = currentUser && currentUser.id === u.id;
    const badgeStyle = u.role === 'admin' 
      ? 'background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3);' 
      : 'background:rgba(59,130,246,0.15);color:#60a5fa;border:1px solid rgba(59,130,246,0.3);';

    const nextRole = u.role === 'admin' ? 'user' : 'admin';
    const toggleBtnLabel = u.role === 'admin' ? 'Make User' : 'Make Admin';

    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:0.6rem;">
            <div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-weight:bold;color:#fff;">
              ${u.name ? u.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <strong>${escapeHTML(u.name)}</strong> ${isSelf ? '<small style="color:var(--accent-blue);">(You)</small>' : ''}
              <div style="font-size:0.75rem;color:var(--text-muted);">ID: #${u.id}</div>
            </div>
          </div>
        </td>
        <td>${escapeHTML(u.email)}</td>
        <td>${escapeHTML(u.phone || 'N/A')}</td>
        <td>
          <span style="padding:0.25rem 0.6rem;border-radius:4px;font-size:0.78rem;font-weight:600;${badgeStyle}">
            ${u.role.toUpperCase()}
          </span>
        </td>
        <td>${u.created_at ? u.created_at.split('T')[0] : 'N/A'}</td>
        <td>
          ${isSelf ? '<span style="font-size:0.78rem;color:var(--text-muted);">Current Active Admin</span>' : `
            <button class="btn btn-secondary btn-sm" onclick="handleToggleUserRole(${u.id}, '${nextRole}')">${toggleBtnLabel}</button>
            <button class="btn btn-danger btn-sm" onclick="handleDeleteUser(${u.id})">Delete</button>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

function initUserModalEvents() {
  const addBtn = document.getElementById('addNewUserBtn');
  const modal = document.getElementById('userModal');
  const closeBtn = document.getElementById('closeUserModalBtn');
  const userForm = document.getElementById('userForm');

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      userForm.reset();
      modal.classList.add('active');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  }

  if (userForm) {
    userForm.addEventListener('submit', handleSaveUser);
  }
}

async function handleSaveUser(e) {
  e.preventDefault();
  const name = document.getElementById('uName').value.trim();
  const email = document.getElementById('uEmail').value.trim();
  const password = document.getElementById('uPassword').value;
  const phone = document.getElementById('uPhone').value.trim();
  const role = document.getElementById('uRole').value;

  try {
    await API.post('/auth/users', { name, email, password, phone, role });
    API.showToast(`New ${role} account created successfully!`, 'success');
    document.getElementById('userModal').classList.remove('active');
    await loadUsers();
    updateDashboardMetrics();
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

async function handleToggleUserRole(userId, newRole) {
  if (!confirm(`Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`)) return;
  try {
    await API.put(`/auth/users/${userId}/role`, { role: newRole });
    API.showToast(`User role updated to ${newRole}`, 'success');
    await loadUsers();
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

async function handleDeleteUser(userId) {
  if (!confirm('Are you sure you want to delete this user account from the database?')) return;
  try {
    await API.delete(`/auth/users/${userId}`);
    API.showToast('User account deleted successfully', 'success');
    await loadUsers();
    updateDashboardMetrics();
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

function initHotelModalEvents() {
  const addBtn = document.getElementById('addNewHotelBtn');
  const modal = document.getElementById('hotelModal');
  const closeBtn = document.getElementById('closeHotelModalBtn');
  const hotelForm = document.getElementById('hotelForm');

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      document.getElementById('modalTitle').innerText = 'Add New Hotel';
      hotelForm.reset();
      document.getElementById('hotelId').value = '';
      modal.classList.add('active');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  }

  if (hotelForm) {
    hotelForm.addEventListener('submit', handleSaveHotel);
  }
}

function openEditHotelModal(id) {
  const hotel = adminHotels.find(h => h.id === id);
  if (!hotel) return;

  document.getElementById('modalTitle').innerText = 'Edit Hotel Listing';
  document.getElementById('hotelId').value = hotel.id;
  document.getElementById('hName').value = hotel.name;
  document.getElementById('hAddress').value = hotel.address;
  document.getElementById('hCity').value = hotel.city;
  document.getElementById('hLat').value = hotel.lat;
  document.getElementById('hLng').value = hotel.lng;
  document.getElementById('hPrice').value = hotel.price_per_night;
  document.getElementById('hRooms').value = hotel.total_rooms;
  document.getElementById('hRating').value = hotel.rating;
  document.getElementById('hImage').value = hotel.image_url;
  document.getElementById('hAmenities').value = Array.isArray(hotel.amenities) ? hotel.amenities.join(', ') : '';
  document.getElementById('hDesc').value = hotel.description || '';

  document.getElementById('hotelModal').classList.add('active');
}

async function handleSaveHotel(e) {
  e.preventDefault();
  const id = document.getElementById('hotelId').value;
  const name = document.getElementById('hName').value.trim();
  const address = document.getElementById('hAddress').value.trim();
  const city = document.getElementById('hCity').value.trim();
  const lat = parseFloat(document.getElementById('hLat').value);
  const lng = parseFloat(document.getElementById('hLng').value);
  const price = parseFloat(document.getElementById('hPrice').value);
  const rooms = parseInt(document.getElementById('hRooms').value);
  const rating = parseFloat(document.getElementById('hRating').value || '4.5');
  const imageUrl = document.getElementById('hImage').value.trim();
  const amenitiesStr = document.getElementById('hAmenities').value;
  const description = document.getElementById('hDesc').value.trim();

  const amenities = amenitiesStr.split(',').map(a => a.trim()).filter(Boolean);

  const payload = {
    name, address, city, lat, lng, price_per_night: price, total_rooms: rooms,
    rating, image_url: imageUrl, amenities, description
  };

  try {
    if (id) {
      await API.put(`/hotels/${id}`, payload);
      API.showToast('Hotel updated successfully', 'success');
    } else {
      await API.post('/hotels', payload);
      API.showToast('Hotel added successfully', 'success');
    }
    document.getElementById('hotelModal').classList.remove('active');
    await loadHotels();
    updateDashboardMetrics();
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

async function handleDeleteHotel(id) {
  if (!confirm('Are you sure you want to delete this hotel listing?')) return;
  try {
    await API.delete(`/hotels/${id}`);
    API.showToast('Hotel deleted successfully', 'success');
    await loadHotels();
    updateDashboardMetrics();
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
