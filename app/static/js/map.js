// Map, Geolocation, Animated Motion Tracking, and Route-Proximity Hotels Module using Leaflet & OSRM

let map = null;
let originMarker = null;
let destinationMarker = null;
let customPinMarker = null;
let vehicleMarker = null;
let routePolyline = null;
let watchId = null;
let currentTrip = null;

// Vehicle Motion & Proximity State
let routeCoords = [];
let vehicleIndex = 0;
let isVehicleMoving = false;
let vehicleInterval = null;
let routeHotels = [];
let hotelMarkers = [];
let notifiedHotelIds = new Set();

// Default center: India (Mumbai)
const DEFAULT_LAT = 18.9220;
const DEFAULT_LNG = 72.8347;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('map')) {
    initMap();
    initMapControls();
    initMotionControls();
    checkQueryParameters();
  }
});

function initMap() {
  map = L.map('map', {
    zoomControl: true
  }).setView([DEFAULT_LAT, DEFAULT_LNG], 12);

  // OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  // Custom marker icons
  window.originIcon = L.divIcon({
    className: 'custom-map-pin origin-pin',
    html: '<div style="background:#3b82f6;width:26px;height:26px;border-radius:50%;border:3px solid #ffffff;box-shadow:0 0 14px #3b82f6;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:bold;">A</div>',
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });

  window.destIcon = L.divIcon({
    className: 'custom-map-pin dest-pin',
    html: '<div style="background:#ef4444;width:26px;height:26px;border-radius:50%;border:3px solid #ffffff;box-shadow:0 0 14px #ef4444;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:bold;">B</div>',
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });

  window.hotelIcon = L.divIcon({
    className: 'custom-map-pin hotel-pin',
    html: '<div style="background:#10b981;width:30px;height:30px;border-radius:50%;border:3px solid #ffffff;box-shadow:0 0 16px #10b981;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;">🏨</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });

  window.customPinIcon = L.divIcon({
    className: 'custom-map-pin interactive-pin',
    html: '<div style="background:#8b5cf6;width:30px;height:30px;border-radius:50%;border:3px solid #ffffff;box-shadow:0 0 18px #8b5cf6;display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;animation:pulseGlow 2s infinite;">📍</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });

  // Animated Vehicle Marker Icon (🚘)
  window.vehicleIcon = L.divIcon({
    className: 'custom-map-pin vehicle-pin',
    html: '<div style="background:#2563eb;width:36px;height:36px;border-radius:50%;border:3px solid #ffffff;box-shadow:0 0 20px #2563eb;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;animation:pulseGlow 1.5s infinite;">🚘</div>',
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });

  // Enable Interactive Pin Dropping on Map Click
  map.on('click', handleMapClick);
}

function initMapControls() {
  const locateBtn = document.getElementById('locateMeBtn');
  if (locateBtn) {
    locateBtn.addEventListener('click', handleDetectCurrentLocation);
  }

  const routeForm = document.getElementById('routeForm');
  if (routeForm) {
    routeForm.addEventListener('submit', handleCalculateRoute);
  }

  const liveTrackToggle = document.getElementById('liveTrackToggle');
  if (liveTrackToggle) {
    liveTrackToggle.addEventListener('change', (e) => {
      toggleLiveTracking(e.target.checked);
    });
  }
}

// ----------------------------------------------------
// Vehicle Motion Tracking & Proximity Controls
// ----------------------------------------------------
function initMotionControls() {
  const startBtn = document.getElementById('startMotionBtn');
  const pauseBtn = document.getElementById('pauseMotionBtn');
  const resetBtn = document.getElementById('resetMotionBtn');

  if (startBtn) startBtn.addEventListener('click', startVehicleMotion);
  if (pauseBtn) pauseBtn.addEventListener('click', pauseVehicleMotion);
  if (resetBtn) resetBtn.addEventListener('click', resetVehicleMotion);
}

function startVehicleMotion() {
  if (routeCoords.length === 0) {
    API.showToast('Please calculate a route first before starting journey motion', 'warning');
    return;
  }

  isVehicleMoving = true;
  updateMotionUI('Moving', true);

  const speedMultiplier = parseInt(document.getElementById('motionSpeedSelect').value || '2');
  const intervalMs = Math.max(100, 1000 / (speedMultiplier * 3));

  if (vehicleInterval) clearInterval(vehicleInterval);
  vehicleInterval = setInterval(stepVehicleMotion, intervalMs);

  API.showToast('🚘 Traveler journey motion started! Tracking along route...', 'info');
}

function pauseVehicleMotion() {
  isVehicleMoving = false;
  if (vehicleInterval) clearInterval(vehicleInterval);
  updateMotionUI('Paused', false);
  API.showToast('⏸ Journey motion paused', 'info');
}

function resetVehicleMotion() {
  pauseVehicleMotion();
  vehicleIndex = 0;
  notifiedHotelIds.clear();

  if (routeCoords.length > 0 && vehicleMarker) {
    vehicleMarker.setLatLng(routeCoords[0]);
    map.panTo(routeCoords[0]);
  }
  updateMotionUI('Ready', false);
  API.showToast('🔄 Vehicle position reset to origin', 'info');
}

function stepVehicleMotion() {
  if (!isVehicleMoving || vehicleIndex >= routeCoords.length) {
    if (vehicleIndex >= routeCoords.length && isVehicleMoving) {
      pauseVehicleMotion();
      updateMotionUI('Arrived at Destination! 🏁', false);
      API.showToast('🎉 You have arrived at your destination!', 'success');
    }
    return;
  }

  const currentPt = routeCoords[vehicleIndex];

  // Create or move vehicle marker
  if (!vehicleMarker) {
    vehicleMarker = L.marker(currentPt, { icon: window.vehicleIcon, zIndexOffset: 1000 }).addTo(map);
  } else {
    vehicleMarker.setLatLng(currentPt);
  }

  vehicleMarker.bindPopup(`
    <div style="font-family:'Inter',sans-serif;text-align:center;padding:0.25rem;">
      <strong style="color:#2563eb;font-size:0.9rem;">🚘 Vehicle En Route</strong><br/>
      <span style="font-size:0.78rem;color:#475569;">Progress: ${Math.round((vehicleIndex / routeCoords.length) * 100)}%</span>
    </div>
  `).openPopup();

  // Smoothly center map on vehicle position periodically
  if (vehicleIndex % 5 === 0) {
    map.panTo(currentPt, { animate: true, duration: 0.5 });
  }

  // Check proximity to nearby hotels along the road
  checkProximityToHotels(currentPt[0], currentPt[1]);

  vehicleIndex++;
}

function updateMotionUI(statusText, isRunning) {
  const badge = document.getElementById('motionStatusBadge');
  const startBtn = document.getElementById('startMotionBtn');
  const pauseBtn = document.getElementById('pauseMotionBtn');

  if (badge) badge.innerText = statusText;
  if (startBtn) startBtn.disabled = isRunning;
  if (pauseBtn) pauseBtn.disabled = !isRunning;
}

// ----------------------------------------------------
// Proximity Detection for Hotels Along the Route
// ----------------------------------------------------
async function loadAndDisplayHotelsAlongRoute(coords) {
  const card = document.getElementById('nearbyRouteHotelsCard');
  const list = document.getElementById('routeHotelsList');
  const badge = document.getElementById('routeHotelCountBadge');

  if (card) card.style.display = 'block';

  // Clear previous hotel markers
  hotelMarkers.forEach(m => map.removeLayer(m));
  hotelMarkers = [];
  routeHotels = [];
  notifiedHotelIds.clear();

  try {
    const res = await API.post('/hotels/nearby-route', {
      waypoints: coords,
      max_dist_km: 250
    });

    routeHotels = res.hotels || [];

    if (badge) badge.innerText = `${routeHotels.length} found`;

    if (routeHotels.length === 0) {
      if (list) list.innerHTML = `<div style="font-size:0.78rem;color:var(--text-secondary);text-align:center;padding:0.5rem;">No hotels listed along this specific path.</div>`;
      return;
    }

    // Render hotel markers on map and sidebar list
    if (list) {
      list.innerHTML = routeHotels.map(h => {
        const distLabel = h.distance_to_route_km !== undefined ? `${h.distance_to_route_km} km off route` : h.city;

        return `
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:0.5rem;display:flex;align-items:center;justify-content:space-between;gap:0.5rem;">
            <div style="overflow:hidden;">
              <strong style="font-size:0.8rem;color:#fff;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(h.name)}</strong>
              <small style="font-size:0.72rem;color:#34d399;">📍 ${distLabel} | ★ ${h.rating}</small>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <span style="font-size:0.82rem;font-weight:700;color:var(--accent-blue);display:block;">₹${h.price_per_night.toLocaleString()}</span>
              <a href="/hotel-detail.html?id=${h.id}" class="btn btn-success btn-sm" style="font-size:0.68rem;padding:0.15rem 0.4rem;margin-top:0.2rem;display:inline-block;">Book →</a>
            </div>
          </div>
        `;
      }).join('');
    }

    // Add map markers for hotels along route
    routeHotels.forEach(h => {
      const marker = L.marker([h.lat, h.lng], { icon: window.hotelIcon }).addTo(map);

      // Permanent visible tooltip displaying the Hotel Name directly above the pin
      marker.bindTooltip(`🏨 ${escapeHTML(h.name)}`, {
        permanent: true,
        direction: 'top',
        className: 'hotel-name-badge-tooltip',
        offset: [0, -12]
      });

      marker.bindPopup(`
        <div style="font-family:'Inter',sans-serif;color:#0f172a;max-width:220px;padding:0.2rem;">
          <img src="${h.image_url}" style="width:100%;height:90px;object-fit:cover;border-radius:6px;margin-bottom:0.4rem;" />
          <strong style="font-size:0.88rem;display:block;margin-bottom:0.2rem;">${escapeHTML(h.name)}</strong>
          <div style="font-size:0.75rem;color:#475569;margin-bottom:0.3rem;">📍 ${escapeHTML(h.address)}, ${escapeHTML(h.city)}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">
            <span style="font-weight:700;color:#2563eb;font-size:0.88rem;">₹${h.price_per_night.toLocaleString()} / night</span>
            <span style="background:#ecfdf5;color:#047857;padding:0.1rem 0.4rem;border-radius:4px;font-size:0.72rem;font-weight:600;">★ ${h.rating}</span>
          </div>
          <a href="/hotel-detail.html?id=${h.id}" style="display:block;text-align:center;background:#10b981;color:#fff;text-decoration:none;padding:0.35rem;border-radius:4px;font-size:0.75rem;font-weight:600;">
            Inspect & Reserve Room →
          </a>
        </div>
      `, { maxWidth: 240 });
      marker._hotelData = h;
      hotelMarkers.push(marker);
    });


  } catch (err) {
    console.warn('Failed to load route hotels:', err);
  }
}

function checkProximityToHotels(vehLat, vehLng) {
  routeHotels.forEach(h => {
    if (notifiedHotelIds.has(h.id)) return;

    // Calculate distance between moving vehicle and hotel
    const distKm = calculateHaversineKm(vehLat, vehLng, h.lat, h.lng);

    // If vehicle gets within 15 km of hotel along the road
    if (distKm <= 15) {
      notifiedHotelIds.add(h.id);
      API.showToast(`🏨 Passing nearby: ${h.name} (${distKm.toFixed(1)} km away) — ₹${h.price_per_night.toLocaleString()}/night`, 'info');

      // Find marker and trigger open popup
      const targetMarker = hotelMarkers.find(m => m._hotelData && m._hotelData.id === h.id);
      if (targetMarker) {
        targetMarker.openPopup();
      }
    }
  });
}

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// ----------------------------------------------------
// Interactive Pin Dropping & Detailed Geocoding
// ----------------------------------------------------
async function handleMapClick(e) {
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;

  if (customPinMarker) {
    customPinMarker.setLatLng([lat, lng]);
  } else {
    customPinMarker = L.marker([lat, lng], {
      icon: window.customPinIcon,
      draggable: true
    }).addTo(map);

    customPinMarker.on('dragend', async (evt) => {
      const pos = evt.target.getLatLng();
      await inspectAndPopupLocation(pos.lat, pos.lng, customPinMarker, 'Custom Pin');
    });
  }

  await inspectAndPopupLocation(lat, lng, customPinMarker, 'Dropped Pin');
}

async function inspectAndPopupLocation(lat, lng, marker, titlePrefix = 'Location Pin') {
  marker.bindPopup('<div style="padding:0.5rem;font-size:0.85rem;color:#333;">Fetching location details... ⏳</div>').openPopup();

  try {
    const res = await API.post('/location/reverse', { lat, lng });
    const details = res.data;

    marker._locationData = details;
    const popupHTML = buildPinPopupHTML(details, titlePrefix);
    marker.bindPopup(popupHTML, { maxWidth: 300 }).openPopup();

    updateLocationDetailsCard(details);
  } catch (err) {
    const fallbackDetails = {
      lat, lng,
      display_name: `Latitude: ${lat.toFixed(5)}, Longitude: ${lng.toFixed(5)}`,
      short_address: `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`
    };
    marker._locationData = fallbackDetails;
    marker.bindPopup(buildPinPopupHTML(fallbackDetails, titlePrefix), { maxWidth: 300 }).openPopup();
    updateLocationDetailsCard(fallbackDetails);
  }
}

function buildPinPopupHTML(details, titlePrefix = 'Pinned Location') {
  const latStr = parseFloat(details.lat).toFixed(6);
  const lngStr = parseFloat(details.lng).toFixed(6);
  const shortAddr = escapeHTML(details.short_address || details.display_name || 'Selected Location');
  const road = escapeHTML(details.road || '');
  const city = escapeHTML(details.city || details.state || '');
  const postcode = escapeHTML(details.postcode || '');

  return `
    <div style="font-family:'Inter',sans-serif;color:#1e293b;padding:0.25rem;">
      <div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.4rem;">
        <span style="font-size:1.1rem;">📍</span>
        <strong style="font-size:0.95rem;color:#0f172a;">${escapeHTML(titlePrefix)}</strong>
      </div>
      <div style="background:#f1f5f9;padding:0.5rem;border-radius:6px;font-size:0.8rem;margin-bottom:0.5rem;">
        <div style="font-weight:600;color:#0f172a;margin-bottom:0.2rem;">${shortAddr}</div>
        ${road ? `<div style="color:#64748b;font-size:0.75rem;">🛣️ ${road}</div>` : ''}
        ${city ? `<div style="color:#64748b;font-size:0.75rem;">🏙️ ${city} ${postcode ? '('+postcode+')' : ''}</div>` : ''}
        <div style="color:#3b82f6;font-family:monospace;font-size:0.75rem;margin-top:0.3rem;">
          📐 Lat: ${latStr} | Lng: ${lngStr}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.3rem;">
        <button onclick="window.setPinAsOrigin(${details.lat}, ${details.lng}, '${escapeHTML(shortAddr).replace(/'/g, "\\'")}')" 
                style="background:#3b82f6;color:#fff;border:none;padding:0.35rem 0.6rem;border-radius:4px;font-size:0.75rem;font-weight:600;cursor:pointer;width:100%;">
          📍 Set as Trip Origin
        </button>
        <button onclick="window.setPinAsDestination(${details.lat}, ${details.lng}, '${escapeHTML(shortAddr).replace(/'/g, "\\'")}')" 
                style="background:#ef4444;color:#fff;border:none;padding:0.35rem 0.6rem;border-radius:4px;font-size:0.75rem;font-weight:600;cursor:pointer;width:100%;">
          🏁 Set as Destination
        </button>
        <button onclick="window.copyPinCoordinates(${details.lat}, ${details.lng})" 
                style="background:#64748b;color:#fff;border:none;padding:0.35rem 0.6rem;border-radius:4px;font-size:0.75rem;font-weight:500;cursor:pointer;width:100%;">
          📋 Copy Lat/Lng Coordinates
        </button>
      </div>
    </div>
  `;
}

function updateLocationDetailsCard(details) {
  const cardName = document.getElementById('pinnedLocationName');
  const cardAddr = document.getElementById('pinnedLocationAddress');
  const btnOrigin = document.getElementById('pinSetOriginBtn');
  const btnDest = document.getElementById('pinSetDestBtn');
  const btnCopy = document.getElementById('pinCopyCoordsBtn');

  const latStr = parseFloat(details.lat).toFixed(6);
  const lngStr = parseFloat(details.lng).toFixed(6);
  const name = details.short_address || 'Pinned Location';
  const full = details.display_name || name;

  if (cardName) cardName.innerText = name;
  if (cardAddr) cardAddr.innerHTML = `<strong>Address:</strong> ${escapeHTML(full)}<br/><span style="color:#a78bfa;font-family:monospace;">Coordinates: ${latStr}, ${lngStr}</span>`;

  if (btnOrigin) {
    btnOrigin.style.display = 'inline-block';
    btnOrigin.onclick = () => window.setPinAsOrigin(details.lat, details.lng, name);
  }
  if (btnDest) {
    btnDest.style.display = 'inline-block';
    btnDest.onclick = () => window.setPinAsDestination(details.lat, details.lng, name);
  }
  if (btnCopy) {
    btnCopy.style.display = 'inline-block';
    btnCopy.onclick = () => window.copyPinCoordinates(details.lat, details.lng);
  }
}

// Global action handlers for pin popup & panel buttons
window.setPinAsOrigin = function(lat, lng, label) {
  setOriginLocation(lat, lng, label);
  const originInput = document.getElementById('originInput');
  if (originInput) originInput.value = label;
  API.showToast(`Origin set to: ${label}`, 'success');

  if (destinationMarker && destinationMarker._locationData) {
    const d = destinationMarker._locationData;
    drawRouteAndDisplayStats(lat, lng, d.lat, d.lng);
  }
};

window.setPinAsDestination = function(lat, lng, label) {
  setDestinationLocation(lat, lng, label);
  const destInput = document.getElementById('destInput');
  if (destInput) destInput.value = label;
  API.showToast(`Destination set to: ${label}`, 'success');

  if (originMarker && originMarker._locationData) {
    const o = originMarker._locationData;
    drawRouteAndDisplayStats(o.lat, o.lng, lat, lng);
  }
};

window.copyPinCoordinates = function(lat, lng) {
  const coordStr = `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`;
  navigator.clipboard.writeText(coordStr).then(() => {
    API.showToast(`Coordinates copied: ${coordStr}`, 'info');
  }).catch(() => {
    API.showToast(`Coordinates: ${coordStr}`, 'info');
  });
};

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ----------------------------------------------------
// Location Detection & Marker Placement
// ----------------------------------------------------
function handleDetectCurrentLocation() {
  if (!navigator.geolocation) {
    API.showToast('Geolocation is not supported by your browser', 'error');
    return;
  }

  const originInput = document.getElementById('originInput');
  if (originInput) originInput.value = 'Locating GPS position...';

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      let label = 'My Current Location';
      try {
        const res = await API.post('/location/reverse', { lat, lng });
        if (res.data && res.data.short_address) {
          label = res.data.short_address;
        }
      } catch(e) {}

      setOriginLocation(lat, lng, label);
      if (originInput) originInput.value = label;
      map.setView([lat, lng], 14);
      API.showToast('Location detected & pinned successfully', 'success');
    },
    (err) => {
      if (originInput) originInput.value = 'Mumbai, Maharashtra';
      setOriginLocation(DEFAULT_LAT, DEFAULT_LNG, 'Mumbai, Maharashtra');
      API.showToast('Could not access live GPS. Using default origin.', 'warning');
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

function setOriginLocation(lat, lng, label) {
  if (originMarker) {
    originMarker.setLatLng([lat, lng]);
  } else {
    originMarker = L.marker([lat, lng], {
      icon: window.originIcon,
      draggable: true
    }).addTo(map);

    originMarker.on('dragend', async (evt) => {
      const pos = evt.target.getLatLng();
      const res = await API.post('/location/reverse', { lat: pos.lat, lng: pos.lng });
      const newLabel = (res.data && res.data.short_address) ? res.data.short_address : `Origin (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})`;
      setOriginLocation(pos.lat, pos.lng, newLabel);
      const input = document.getElementById('originInput');
      if (input) input.value = newLabel;

      if (destinationMarker && destinationMarker._locationData) {
        const d = destinationMarker._locationData;
        drawRouteAndDisplayStats(pos.lat, pos.lng, d.lat, d.lng);
      }
    });
  }

  originMarker.bindPopup(`<b>Origin:</b> ${escapeHTML(label)}<br/><small style="color:#64748b;">(Drag pin to refine exact location)</small>`).openPopup();
  originMarker._locationData = { lat, lng, label };
}

function setDestinationLocation(lat, lng, label, isHotel = false) {
  const icon = isHotel ? window.hotelIcon : window.destIcon;
  if (destinationMarker) {
    destinationMarker.setLatLng([lat, lng]);
    destinationMarker.setIcon(icon);
  } else {
    destinationMarker = L.marker([lat, lng], {
      icon: icon,
      draggable: true
    }).addTo(map);

    destinationMarker.on('dragend', async (evt) => {
      const pos = evt.target.getLatLng();
      const res = await API.post('/location/reverse', { lat: pos.lat, lng: pos.lng });
      const newLabel = (res.data && res.data.short_address) ? res.data.short_address : `Destination (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})`;
      setDestinationLocation(pos.lat, pos.lng, newLabel, isHotel);
      const input = document.getElementById('destInput');
      if (input) input.value = newLabel;

      if (originMarker && originMarker._locationData) {
        const o = originMarker._locationData;
        drawRouteAndDisplayStats(o.lat, o.lng, pos.lat, pos.lng);
      }
    });
  }

  destinationMarker.bindPopup(`<b>${isHotel ? 'Booked Hotel' : 'Destination'}:</b> ${escapeHTML(label)}<br/><small style="color:#64748b;">(Drag pin to refine exact location)</small>`).openPopup();
  destinationMarker._locationData = { lat, lng, label };
}

// ----------------------------------------------------
// Route Calculation & Stats
// ----------------------------------------------------
async function handleCalculateRoute(e) {
  if (e) e.preventDefault();

  const originVal = document.getElementById('originInput').value.trim();
  const destVal = document.getElementById('destInput').value.trim();
  const routeBtn = document.getElementById('routeSubmitBtn');

  if (!originVal || !destVal) {
    API.showToast('Please enter both origin and destination', 'warning');
    return;
  }

  if (routeBtn) {
    routeBtn.disabled = true;
    routeBtn.innerText = 'Calculating Route...';
  }

  try {
    // 1. Geocode origin
    let oLat, oLng, oLabel;
    if (originMarker && originMarker._locationData && originMarker._locationData.label === originVal) {
      oLat = originMarker._locationData.lat;
      oLng = originMarker._locationData.lng;
      oLabel = originMarker._locationData.label;
    } else {
      const oRes = await API.post('/location/geocode', { address: originVal });
      oLat = oRes.data.lat;
      oLng = oRes.data.lng;
      oLabel = oRes.data.display_name;
      setOriginLocation(oLat, oLng, oLabel);
    }

    // 2. Geocode destination
    let dLat, dLng, dLabel;
    if (destinationMarker && destinationMarker._locationData && destinationMarker._locationData.label === destVal) {
      dLat = destinationMarker._locationData.lat;
      dLng = destinationMarker._locationData.lng;
      dLabel = destinationMarker._locationData.label;
    } else {
      const dRes = await API.post('/location/geocode', { address: destVal });
      dLat = dRes.data.lat;
      dLng = dRes.data.lng;
      dLabel = dRes.data.display_name;
      setDestinationLocation(dLat, dLng, dLabel);
    }

    // 3. Draw route polyline
    await drawRouteAndDisplayStats(oLat, oLng, dLat, dLng);

    // 4. Save trip record if logged in
    if (API.getToken()) {
      try {
        const tripRes = await API.post('/location/trip', {
          origin_address: oLabel || originVal,
          origin_lat: oLat,
          origin_lng: oLng,
          destination_address: dLabel || destVal,
          destination_lat: dLat,
          destination_lng: dLng
        });
        currentTrip = tripRes.trip;
        localStorage.setItem('current_trip', JSON.stringify(currentTrip));
      } catch (err) {
        console.warn('Trip save skipped:', err);
      }
    }

    // 5. Update "Find Hotels" button
    const findHotelsBtn = document.getElementById('findHotelsBtn');
    if (findHotelsBtn) {
      findHotelsBtn.style.display = 'inline-flex';
      findHotelsBtn.onclick = () => {
        const cityParam = encodeURIComponent(destVal.split(',')[0].trim());
        const tripParam = currentTrip ? `&trip_id=${currentTrip.id}` : '';
        window.location.href = `/hotels.html?city=${cityParam}${tripParam}`;
      };
    }

    API.showToast('Route tracked successfully!', 'success');
  } catch (err) {
    API.showToast(`Routing failed: ${err.message}`, 'error');
  } finally {
    if (routeBtn) {
      routeBtn.disabled = false;
      routeBtn.innerText = 'Calculate & Track Route';
    }
  }
}

async function drawRouteAndDisplayStats(oLat, oLng, dLat, dLng) {
  if (routePolyline) {
    map.removeLayer(routePolyline);
  }

  let distanceKm = 0;
  let durationMins = 0;
  let coords = [];

  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`;
    const res = await fetch(osrmUrl);
    const data = await res.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      distanceKm = (route.distance / 1000).toFixed(1);
      durationMins = Math.round(route.duration / 60);
      coords = route.geometry.coordinates.map(pt => [pt[1], pt[0]]);
    } else {
      throw new Error('No OSRM route found');
    }
  } catch (err) {
    coords = [[oLat, oLng], [dLat, dLng]];
    const R = 6371;
    const dLatR = (dLat - oLat) * Math.PI / 180;
    const dLngR = (dLng - oLng) * Math.PI / 180;
    const a = Math.sin(dLatR/2) * Math.sin(dLatR/2) +
              Math.cos(oLat * Math.PI / 180) * Math.cos(dLat * Math.PI / 180) *
              Math.sin(dLngR/2) * Math.sin(dLngR/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    distanceKm = (R * c).toFixed(1);
    durationMins = Math.round(distanceKm * 1.5);
  }

  routeCoords = coords;
  vehicleIndex = 0;

  routePolyline = L.polyline(coords, {
    color: '#8b5cf6',
    weight: 5,
    opacity: 0.85,
    lineJoin: 'round'
  }).addTo(map);

  map.fitBounds(routePolyline.getBounds(), { padding: [50, 50] });

  const distEl = document.getElementById('statDistance');
  const timeEl = document.getElementById('statDuration');
  const banner = document.getElementById('routeStatsBanner');
  const motionCard = document.getElementById('motionControlsCard');

  if (distEl) distEl.innerText = `${distanceKm} km`;
  if (timeEl) {
    const hours = Math.floor(durationMins / 60);
    const mins = durationMins % 60;
    timeEl.innerText = hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`;
  }
  if (banner) banner.style.display = 'flex';
  if (motionCard) motionCard.style.display = 'block';

  // Load and display hotels along this route
  await loadAndDisplayHotelsAlongRoute(coords);
}

function toggleLiveTracking(enable) {
  const statusEl = document.getElementById('liveStatus');

  if (enable) {
    if (!navigator.geolocation) {
      API.showToast('Geolocation not supported', 'error');
      return;
    }

    if (statusEl) {
      statusEl.innerHTML = '<span style="color:#10b981;">● Live GPS Active</span>';
    }

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setOriginLocation(lat, lng, 'Live GPS Location');

        if (destinationMarker && destinationMarker._locationData) {
          const d = destinationMarker._locationData;
          drawRouteAndDisplayStats(lat, lng, d.lat, d.lng);
        }
      },
      (err) => {
        console.warn('watchPosition error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    API.showToast('Real-time tracking enabled. Map will update as you move.', 'info');
  } else {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    if (statusEl) {
      statusEl.innerHTML = '<span style="color:#9ca3af;">○ Live GPS Off</span>';
    }
    API.showToast('Real-time tracking stopped', 'info');
  }
}

function checkQueryParameters() {
  const params = new URLSearchParams(window.location.search);
  const hotelLat = params.get('hotel_lat');
  const hotelLng = params.get('hotel_lng');
  const hotelName = params.get('hotel_name');
  const originName = params.get('origin') || 'Current Location';

  if (hotelLat && hotelLng) {
    const destInput = document.getElementById('destInput');
    const originInput = document.getElementById('originInput');
    if (destInput) destInput.value = hotelName || 'Booked Hotel';
    if (originInput && !originInput.value) originInput.value = originName;

    handleDetectCurrentLocation();

    setTimeout(() => {
      setDestinationLocation(parseFloat(hotelLat), parseFloat(hotelLng), hotelName || 'Booked Hotel', true);
      const oData = originMarker ? originMarker._locationData : { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
      drawRouteAndDisplayStats(oData.lat, oData.lng, parseFloat(hotelLat), parseFloat(hotelLng));
      API.showToast(`Route updated to your booked hotel: ${hotelName}`, 'success');
    }, 1000);
  }
}
