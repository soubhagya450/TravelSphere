// Booking and Hotel Detail Module

let currentHotel = null;
let currentTripId = null;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('hotelDetailContainer')) {
    initHotelDetailPage();
  }
});

async function initHotelDetailPage() {
  const params = new URLSearchParams(window.location.search);
  const hotelId = params.get('id');
  currentTripId = params.get('trip_id') || '';

  if (!hotelId) {
    API.showToast('No hotel specified', 'error');
    setTimeout(() => { window.location.href = '/hotels.html'; }, 1000);
    return;
  }

  // Pre-set dates
  setupDefaultDates();

  try {
    const res = await API.get(`/hotels/${hotelId}`);
    currentHotel = res.hotel;
    renderHotelDetails(currentHotel);
    calculateBookingEstimate();
  } catch (err) {
    API.showToast(err.message, 'error');
  }

  // Attach change listeners to dates & rooms
  const checkIn = document.getElementById('bookCheckIn');
  const checkOut = document.getElementById('bookCheckOut');
  const rooms = document.getElementById('bookRooms');

  if (checkIn && checkOut && rooms) {
    checkIn.addEventListener('change', () => {
      // Ensure checkOut >= checkIn + 1
      const inDate = new Date(checkIn.value);
      const minOut = new Date(inDate);
      minOut.setDate(minOut.getDate() + 1);
      checkOut.min = minOut.toISOString().split('T')[0];
      if (new Date(checkOut.value) <= inDate) {
        checkOut.value = minOut.toISOString().split('T')[0];
      }
      calculateBookingEstimate();
    });

    checkOut.addEventListener('change', calculateBookingEstimate);
    rooms.addEventListener('change', calculateBookingEstimate);
  }

  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.addEventListener('submit', handleCreateBooking);
  }
}

function setupDefaultDates() {
  const checkIn = document.getElementById('bookCheckIn');
  const checkOut = document.getElementById('bookCheckOut');

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  if (checkIn && checkOut) {
    checkIn.min = tomorrow.toISOString().split('T')[0];
    checkIn.value = tomorrow.toISOString().split('T')[0];

    checkOut.min = dayAfter.toISOString().split('T')[0];
    checkOut.value = dayAfter.toISOString().split('T')[0];
  }
}

function renderHotelDetails(hotel) {
  document.title = `${hotel.name} - TravelSphere`;

  const heroImg = document.getElementById('hotelHeroImg');
  if (heroImg) heroImg.src = hotel.image_url;

  const nameEl = document.getElementById('hotelName');
  if (nameEl) nameEl.innerText = hotel.name;

  const addrEl = document.getElementById('hotelAddress');
  if (addrEl) addrEl.innerText = `📍 ${hotel.address}, ${hotel.city}`;

  const ratingEl = document.getElementById('hotelRating');
  if (ratingEl) ratingEl.innerText = `★ ${hotel.rating} / 5.0`;

  const descEl = document.getElementById('hotelDescription');
  if (descEl) descEl.innerText = hotel.description || 'Experience extraordinary luxury and hospitality.';

  const priceEl = document.getElementById('hotelPricePerNight');
  if (priceEl) priceEl.innerText = `₹${hotel.price_per_night.toLocaleString()}`;

  const amenitiesContainer = document.getElementById('hotelAmenitiesList');
  if (amenitiesContainer && Array.isArray(hotel.amenities)) {
    amenitiesContainer.innerHTML = hotel.amenities.map(a => `
      <div style="background:rgba(255,255,255,0.05);padding:0.6rem 1rem;border-radius:var(--radius-md);border:1px solid var(--border-color);display:flex;align-items:center;gap:0.5rem;font-size:0.9rem;">
        <span>✨</span> <span>${a}</span>
      </div>
    `).join('');
  }

  // Pre-fill user profile if logged in
  const user = API.getUser();
  if (user) {
    const nameInput = document.getElementById('guestName');
    const emailInput = document.getElementById('guestEmail');
    const phoneInput = document.getElementById('guestPhone');
    if (nameInput) nameInput.value = user.name;
    if (emailInput) emailInput.value = user.email;
    if (phoneInput && user.phone) phoneInput.value = user.phone;
  }
}

async function calculateBookingEstimate() {
  if (!currentHotel) return;

  const checkInVal = document.getElementById('bookCheckIn')?.value;
  const checkOutVal = document.getElementById('bookCheckOut')?.value;
  const roomsVal = parseInt(document.getElementById('bookRooms')?.value || '1');

  if (!checkInVal || !checkOutVal) return;

  const dIn = new Date(checkInVal);
  const dOut = new Date(checkOutVal);
  const nights = Math.max(1, Math.round((dOut - dIn) / (1000 * 60 * 60 * 24)));

  const nightsEl = document.getElementById('summaryNights');
  const roomsEl = document.getElementById('summaryRooms');
  const basePriceEl = document.getElementById('summaryBasePrice');
  const taxesEl = document.getElementById('summaryTaxes');
  const totalEl = document.getElementById('summaryTotal');
  const availabilityBadge = document.getElementById('availabilityBadge');

  if (nightsEl) nightsEl.innerText = `${nights} night${nights > 1 ? 's' : ''}`;
  if (roomsEl) roomsEl.innerText = `${roomsVal} room${roomsVal > 1 ? 's' : ''}`;

  const subtotal = currentHotel.price_per_night * nights * roomsVal;
  const taxes = Math.round(subtotal * 0.12);
  const total = subtotal; // Matching backend calculation: price_per_night * nights * rooms

  if (basePriceEl) basePriceEl.innerText = `₹${subtotal.toLocaleString()}`;
  if (taxesEl) taxesEl.innerText = `Included`;
  if (totalEl) totalEl.innerText = `₹${total.toLocaleString()}`;

  // Check room availability with server
  try {
    const res = await API.post('/bookings/check-availability', {
      hotel_id: currentHotel.id,
      check_in: checkInVal,
      check_out: checkOutVal,
      rooms: roomsVal
    });

    if (availabilityBadge) {
      if (res.available) {
        availabilityBadge.innerHTML = `<span style="color:#10b981;">✓ ${res.available_rooms} rooms available for these dates</span>`;
      } else {
        availabilityBadge.innerHTML = `<span style="color:#ef4444;">✕ ${res.message}</span>`;
      }
    }
  } catch (e) {
    // Ignore validation blips while typing
  }
}

async function handleCreateBooking(e) {
  e.preventDefault();

  if (!API.getToken()) {
    API.showToast('Please sign in or register to complete your booking', 'info');
    setTimeout(() => {
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }, 800);
    return;
  }

  const checkIn = document.getElementById('bookCheckIn').value;
  const checkOut = document.getElementById('bookCheckOut').value;
  const rooms = parseInt(document.getElementById('bookRooms').value);
  const guestName = document.getElementById('guestName').value.trim();
  const guestEmail = document.getElementById('guestEmail').value.trim();
  const guestPhone = document.getElementById('guestPhone').value.trim();
  const submitBtn = document.getElementById('bookSubmitBtn');

  if (!checkIn || !checkOut) {
    API.showToast('Please select valid check-in and check-out dates', 'warning');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerText = 'Reserving Rooms...';

  try {
    const res = await API.post('/bookings', {
      hotel_id: currentHotel.id,
      trip_id: currentTripId ? parseInt(currentTripId) : null,
      check_in: checkIn,
      check_out: checkOut,
      rooms: rooms,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone
    });

    API.showToast('Booking created! Redirecting to secure checkout...', 'success');
    setTimeout(() => {
      window.location.href = `/payment.html?booking_id=${res.booking.id}`;
    }, 700);
  } catch (err) {
    API.showToast(err.message, 'error');
    submitBtn.disabled = false;
    submitBtn.innerText = 'Confirm Booking & Pay →';
  }
}
