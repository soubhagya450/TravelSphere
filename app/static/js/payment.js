// Payment and Checkout Module

let currentBooking = null;
let currentOrder = null;
let selectedPaymentMethod = 'card';

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('paymentContainer')) {
    initPaymentPage();
  }
});

async function initPaymentPage() {
  const params = new URLSearchParams(window.location.search);
  const bookingId = params.get('booking_id');

  if (!bookingId) {
    API.showToast('No booking ID specified', 'error');
    setTimeout(() => { window.location.href = '/my-bookings.html'; }, 1000);
    return;
  }

  try {
    const res = await API.get(`/bookings/${bookingId}`);
    currentBooking = res.booking;

    if (currentBooking.status === 'confirmed') {
      API.showToast('This booking is already paid and confirmed!', 'info');
      showReceiptView(currentBooking.id);
      return;
    }

    renderBookingPaymentSummary(currentBooking);
    await createGatewayOrder(currentBooking.id);
    initPaymentTabs();
  } catch (err) {
    API.showToast(err.message, 'error');
  }
}

function renderBookingPaymentSummary(booking) {
  const hotel = booking.hotel;
  document.getElementById('summaryHotelName').innerText = hotel.name;
  document.getElementById('summaryHotelAddress').innerText = `${hotel.address}, ${hotel.city}`;
  document.getElementById('summaryHotelImg').src = hotel.image_url;
  document.getElementById('summaryDates').innerText = `${booking.check_in} to ${booking.check_out} (${booking.nights} night${booking.nights > 1 ? 's' : ''})`;
  document.getElementById('summaryRooms').innerText = `${booking.rooms_booked} Room${booking.rooms_booked > 1 ? 's' : ''}`;
  document.getElementById('summaryTotalAmount').innerText = `₹${booking.total_amount.toLocaleString()}`;
  document.getElementById('payButtonAmount').innerText = `₹${booking.total_amount.toLocaleString()}`;
}

async function createGatewayOrder(bookingId) {
  try {
    const res = await API.post('/payments/create-order', { booking_id: bookingId });
    currentOrder = res.order;
    const orderRefEl = document.getElementById('orderReference');
    if (orderRefEl) orderRefEl.innerText = currentOrder.order_id;
  } catch (err) {
    API.showToast(`Failed to initialize payment gateway: ${err.message}`, 'error');
  }
}

function initPaymentTabs() {
  const tabs = document.querySelectorAll('.payment-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedPaymentMethod = tab.dataset.method;

      document.getElementById('cardForm').style.display = selectedPaymentMethod === 'card' ? 'block' : 'none';
      document.getElementById('upiForm').style.display = selectedPaymentMethod === 'upi' ? 'block' : 'none';
      document.getElementById('netbankingForm').style.display = selectedPaymentMethod === 'netbanking' ? 'block' : 'none';
    });
  });

  const payBtn = document.getElementById('completePaymentBtn');
  if (payBtn) {
    payBtn.addEventListener('click', handleProcessPayment);
  }
}

async function handleProcessPayment() {
  const payBtn = document.getElementById('completePaymentBtn');
  payBtn.disabled = true;
  payBtn.innerHTML = `
    <span style="display:inline-block;animation:spin 1s linear infinite;">⏳</span>
    Processing Secure Payment...
  `;

  // Simulate payment gateway completion and generate client signature
  setTimeout(async () => {
    try {
      const paymentId = `pay_${Math.random().toString(36).substring(2, 12)}`;
      
      // In development / demo mode, signature verification accepts standard hash or mock token
      const res = await API.post('/payments/verify', {
        order_id: currentOrder.order_id,
        payment_id: paymentId,
        signature: 'mock_sig_valid',
        payment_method: selectedPaymentMethod
      });

      API.showToast('Payment successful! Booking confirmed.', 'success');
      showReceiptView(currentBooking.id);
    } catch (err) {
      API.showToast(`Payment verification failed: ${err.message}`, 'error');
      payBtn.disabled = false;
      payBtn.innerText = `Pay Now (₹${currentBooking.total_amount.toLocaleString()})`;
    }
  }, 1200);
}

async function showReceiptView(bookingId) {
  try {
    const res = await API.get(`/payments/receipt/${bookingId}`);
    const receipt = res.receipt;
    const hotel = currentBooking ? currentBooking.hotel : null;

    document.getElementById('paymentFormSection').style.display = 'none';
    const receiptSection = document.getElementById('paymentReceiptSection');
    receiptSection.style.display = 'block';

    document.getElementById('receiptInvoiceNum').innerText = receipt.invoice_number;
    document.getElementById('receiptPaymentDate').innerText = receipt.payment_date;
    document.getElementById('receiptHotelName').innerText = receipt.hotel_name;
    document.getElementById('receiptHotelAddress').innerText = `${receipt.hotel_address}, ${receipt.hotel_city}`;
    document.getElementById('receiptGuestName').innerText = receipt.guest_name;
    document.getElementById('receiptGuestEmail').innerText = receipt.guest_email;
    document.getElementById('receiptCheckIn').innerText = receipt.check_in;
    document.getElementById('receiptCheckOut').innerText = receipt.check_out;
    document.getElementById('receiptRooms').innerText = receipt.rooms;
    document.getElementById('receiptAmount').innerText = `₹${receipt.total_amount.toLocaleString()}`;
    document.getElementById('receiptPaymentId').innerText = receipt.payment_id;

    // Track route button: route from user's origin to booked hotel coordinates
    const trackBtn = document.getElementById('trackToHotelBtn');
    if (trackBtn) {
      trackBtn.onclick = () => {
        const hotelQuery = new URLSearchParams({
          hotel_lat: hotel ? hotel.lat : (currentBooking.hotel ? currentBooking.hotel.lat : 18.9220),
          hotel_lng: hotel ? hotel.lng : (currentBooking.hotel ? currentBooking.hotel.lng : 72.8347),
          hotel_name: receipt.hotel_name
        });
        window.location.href = `/dashboard.html?${hotelQuery.toString()}`;
      };
    }
  } catch (err) {
    API.showToast(`Could not load receipt: ${err.message}`, 'error');
  }
}
