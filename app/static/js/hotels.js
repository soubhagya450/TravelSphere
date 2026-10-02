// Hotels Listing and Search Module

let allHotels = [];
let currentTripId = null;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('hotelsContainer')) {
    initHotelsPage();
  }
});

async function initHotelsPage() {
  const params = new URLSearchParams(window.location.search);
  const cityParam = params.get('city') || '';
  currentTripId = params.get('trip_id') || '';

  const cityInput = document.getElementById('filterCity');
  if (cityInput && cityParam) {
    cityInput.value = cityParam;
  }

  initFilterEvents();
  await fetchAndRenderHotels();
}

function initFilterEvents() {
  const searchInput = document.getElementById('filterSearch');
  const cityInput = document.getElementById('filterCity');
  const maxPriceInput = document.getElementById('filterMaxPrice');
  const priceValDisplay = document.getElementById('priceValDisplay');
  const ratingSelect = document.getElementById('filterRating');
  const amenitySelect = document.getElementById('filterAmenity');
  const resetBtn = document.getElementById('resetFiltersBtn');

  if (maxPriceInput && priceValDisplay) {
    maxPriceInput.addEventListener('input', (e) => {
      priceValDisplay.innerText = `₹${parseInt(e.target.value).toLocaleString()}`;
      debounceFilter();
    });
  }

  [searchInput, cityInput, ratingSelect, amenitySelect].forEach(el => {
    if (el) {
      el.addEventListener('input', debounceFilter);
      el.addEventListener('change', debounceFilter);
    }
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (cityInput) cityInput.value = '';
      if (maxPriceInput) {
        maxPriceInput.value = 25000;
        if (priceValDisplay) priceValDisplay.innerText = '₹25,000';
      }
      if (ratingSelect) ratingSelect.value = '';
      if (amenitySelect) amenitySelect.value = '';
      fetchAndRenderHotels();
    });
  }
}

let debounceTimer = null;
function debounceFilter() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchAndRenderHotels, 300);
}

async function fetchAndRenderHotels() {
  const container = document.getElementById('hotelsContainer');
  const countEl = document.getElementById('resultsCount');
  if (!container) return;

  container.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">
      <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔍 Loading luxury hotels...</div>
    </div>
  `;

  const search = document.getElementById('filterSearch')?.value.trim() || '';
  const city = document.getElementById('filterCity')?.value.trim() || '';
  const maxPrice = document.getElementById('filterMaxPrice')?.value || '';
  const rating = document.getElementById('filterRating')?.value || '';
  const amenity = document.getElementById('filterAmenity')?.value || '';

  const queryParams = new URLSearchParams();
  if (search) queryParams.append('search', search);
  if (city) queryParams.append('city', city);
  if (maxPrice) queryParams.append('max_price', maxPrice);
  if (rating) queryParams.append('min_rating', rating);
  if (amenity) queryParams.append('amenity', amenity);

  try {
    const res = await API.get(`/hotels?${queryParams.toString()}`);
    allHotels = res.hotels || [];

    if (countEl) countEl.innerText = `${allHotels.length} hotels found`;

    if (allHotels.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; color: var(--text-secondary);" class="card">
          <div style="font-size: 2.5rem; margin-bottom: 1rem;">🏨</div>
          <h3>No hotels match your filters</h3>
          <p style="margin-top: 0.5rem; color: var(--text-muted);">Try adjusting your search terms, destination, or price range.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = allHotels.map(hotel => renderHotelCard(hotel)).join('');
  } catch (err) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--accent-rose);">
        Failed to load hotels: ${err.message}
      </div>
    `;
  }
}

function renderHotelCard(hotel) {
  const tripParam = currentTripId ? `&trip_id=${currentTripId}` : '';
  const amenitiesList = Array.isArray(hotel.amenities) ? hotel.amenities.slice(0, 3) : [];

  return `
    <div class="hotel-card">
      <div class="hotel-img-wrapper">
        <img class="hotel-img" src="${hotel.image_url}" alt="${hotel.name}" loading="lazy" />
        <span class="hotel-badge-city">📍 ${hotel.city}</span>
        <span class="hotel-rating-badge">★ ${hotel.rating}</span>
      </div>
      <div class="hotel-body">
        <h3 class="hotel-name">${hotel.name}</h3>
        <p class="hotel-address">📍 ${hotel.address}</p>
        
        <div class="amenities-tags">
          ${amenitiesList.map(a => `<span class="amenity-pill">${a}</span>`).join('')}
          ${hotel.amenities.length > 3 ? `<span class="amenity-pill">+${hotel.amenities.length - 3} more</span>` : ''}
        </div>

        <div class="hotel-footer">
          <div class="hotel-price">
            <span class="price-val">₹${hotel.price_per_night.toLocaleString()}</span>
            <span class="price-sub">per night + taxes</span>
          </div>
          <a href="/hotel-detail.html?id=${hotel.id}${tripParam}" class="btn btn-primary btn-sm">
            View & Book →
          </a>
        </div>
      </div>
    </div>
  `;
}
