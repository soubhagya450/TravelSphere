# Technical Architecture Document
## Real-Time Travel & Hotel Booking Platform

---

## 1. Architecture Style

**Client-Server, 3-Tier Architecture (Monolithic backend, RESTful API)**

```
┌─────────────────────────────┐
│   Frontend (HTML/CSS/JS)    │
│  - Pages, Map UI, Forms     │
└───────────┬──────────────────┘
            │ REST API (JSON over HTTPS)
┌───────────▼──────────────────┐
│     Backend (Flask, Python) │
│  - Auth, Booking, Payment   │
│  - Business Logic           │
└───────────┬──────────────────┘
            │ SQL (via SQLAlchemy/PyMySQL)
┌───────────▼──────────────────┐
│      Database (MySQL)       │
└──────────────────────────────┘

External Services:
  - Google Maps / Mapbox API (Geocoding, Directions, Map render)
  - Payment Gateway API (Razorpay/Stripe)
  - Email service (SMTP/SendGrid) for notifications
```

---

## 2. Component Breakdown

### 2.1 Frontend Layer
- **Pages:** `index.html`, `login.html`, `register.html`, `dashboard.html`, `hotels.html`, `hotel-detail.html`, `booking.html`, `payment.html`, `profile.html`, `admin.html`
- **JS Modules:**
  - `auth.js` – handles login/register form submission, token storage
  - `map.js` – handles Google Maps/Leaflet integration, geolocation, route drawing
  - `hotels.js` – fetch/render hotel listings, filters
  - `booking.js` – handles booking form, date validation, availability check
  - `payment.js` – initiates payment gateway checkout
  - `api.js` – centralized fetch wrapper for calling Flask backend

### 2.2 Backend Layer (Flask)
Structured as a modular Flask app using **Blueprints**:

```
app/
├── __init__.py           # App factory, config load
├── config.py             # Environment configs
├── extensions.py         # db, jwt, cors init
├── models/
│   ├── user.py
│   ├── hotel.py
│   ├── booking.py
│   └── payment.py
├── routes/
│   ├── auth_routes.py     # /api/auth/*
│   ├── location_routes.py # /api/location/*
│   ├── hotel_routes.py    # /api/hotels/*
│   ├── booking_routes.py  # /api/bookings/*
│   └── payment_routes.py  # /api/payments/*
├── services/
│   ├── auth_service.py
│   ├── geocoding_service.py
│   ├── booking_service.py
│   └── payment_service.py
├── utils/
│   ├── validators.py
│   └── security.py
└── run.py
```

### 2.3 Database Layer (MySQL)
See ER model below. Access via **SQLAlchemy ORM** for safety (auto-escaping, prevents SQL injection) and easier migrations (Flask-Migrate/Alembic).

---

## 3. Database Schema (Entity-Relationship Design)

### Table: `users`
| Column | Type | Notes |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| name | VARCHAR(100) | |
| email | VARCHAR(150) UNIQUE | |
| password_hash | VARCHAR(255) | bcrypt hash |
| phone | VARCHAR(20) | |
| role | ENUM('user','admin') | default 'user' |
| created_at | DATETIME | |

### Table: `trips` (origin/destination tracking sessions)
| Column | Type | Notes |
|---|---|---|
| id | INT PK | |
| user_id | INT FK → users.id | |
| origin_address | VARCHAR(255) | |
| origin_lat | DECIMAL(10,7) | |
| origin_lng | DECIMAL(10,7) | |
| destination_address | VARCHAR(255) | |
| destination_lat | DECIMAL(10,7) | |
| destination_lng | DECIMAL(10,7) | |
| linked_hotel_id | INT FK → hotels.id NULL | set once a hotel is booked for this trip |
| created_at | DATETIME | |

### Table: `hotels`
| Column | Type | Notes |
|---|---|---|
| id | INT PK | |
| name | VARCHAR(150) | |
| address | VARCHAR(255) | |
| city | VARCHAR(100) | |
| lat | DECIMAL(10,7) | |
| lng | DECIMAL(10,7) | |
| price_per_night | DECIMAL(10,2) | |
| total_rooms | INT | |
| rating | DECIMAL(2,1) | |
| amenities | TEXT (JSON) | |
| image_url | VARCHAR(255) | |
| created_by_admin_id | INT FK → users.id | |

### Table: `bookings`
| Column | Type | Notes |
|---|---|---|
| id | INT PK | |
| user_id | INT FK → users.id | |
| hotel_id | INT FK → hotels.id | |
| trip_id | INT FK → trips.id | |
| check_in | DATE | |
| check_out | DATE | |
| rooms_booked | INT | |
| total_amount | DECIMAL(10,2) | server-calculated, not client-trusted |
| status | ENUM('pending','confirmed','cancelled') | |
| created_at | DATETIME | |

### Table: `payments`
| Column | Type | Notes |
|---|---|---|
| id | INT PK | |
| booking_id | INT FK → bookings.id | |
| gateway_order_id | VARCHAR(100) | |
| gateway_payment_id | VARCHAR(100) | |
| amount | DECIMAL(10,2) | |
| currency | VARCHAR(10) | |
| status | ENUM('created','success','failed','refunded') | |
| created_at | DATETIME | |

**Relationships:**
- `users (1) → (many) trips`
- `users (1) → (many) bookings`
- `hotels (1) → (many) bookings`
- `trips (1) → (0..1) hotels` (linked once booked)
- `bookings (1) → (1) payments`

---

## 4. API Design (REST Endpoints)

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Register user | No |
| POST | `/api/auth/login` | Login, returns JWT | No |
| POST | `/api/auth/logout` | Invalidate session/token | Yes |
| GET | `/api/auth/me` | Get logged-in user profile | Yes |
| POST | `/api/location/geocode` | Convert address → lat/lng | Yes |
| POST | `/api/location/trip` | Save origin/destination trip | Yes |
| GET | `/api/hotels` | List/search/filter hotels | Optional |
| GET | `/api/hotels/<id>` | Hotel detail | Optional |
| POST | `/api/hotels` | Add hotel (admin only) | Admin |
| PUT | `/api/hotels/<id>` | Edit hotel (admin only) | Admin |
| DELETE | `/api/hotels/<id>` | Remove hotel (admin only) | Admin |
| POST | `/api/bookings` | Create a pending booking | Yes |
| GET | `/api/bookings/my` | User's booking history | Yes |
| PUT | `/api/bookings/<id>/cancel` | Cancel booking | Yes |
| POST | `/api/payments/create-order` | Create payment gateway order | Yes |
| POST | `/api/payments/verify` | Verify payment signature, confirm booking | Yes |
| POST | `/api/payments/webhook` | Gateway server-to-server webhook | Gateway |

---

## 5. Real-Time Location Tracking — Technical Flow

1. Frontend requests browser geolocation permission (`navigator.geolocation.getCurrentPosition` / `watchPosition`).
2. Origin coordinates sent to backend (or geocoded directly client-side via Maps JS API if user typed an address).
3. Destination address is geocoded (backend calls Google Geocoding API / Nominatim for OSM) to get lat/lng.
4. Backend/frontend calls **Directions API** (or OSRM if using OSM) with origin+destination to get route polyline, distance, duration.
5. Frontend renders map with two markers + polyline using Google Maps JS SDK or Leaflet.js.
6. If live tracking is enabled, `watchPosition` continuously updates the origin marker as the user moves.
7. **On hotel booking:** the destination coordinates in the `trips` table are updated to the hotel's `lat/lng`, and the map re-renders the route from origin → hotel.

---

## 6. Deployment Architecture (Recommended)

```
Users → HTTPS → Nginx (reverse proxy + static files)
                   │
                   ▼
             Gunicorn (WSGI server running Flask app)
                   │
                   ▼
              MySQL Database (same server initially, 
              separate managed DB service as you scale)
```

- **Dev environment:** Flask dev server + local MySQL
- **Production:** Gunicorn + Nginx, MySQL on managed service (e.g., AWS RDS) or same VM for MVP
- **Static assets** (CSS/JS/images) served via Nginx or a CDN

---

## 7. Scalability Notes

- Add Redis caching for hotel search results and session/token blacklisting
- Move to connection pooling for MySQL (SQLAlchemy handles this)
- Introduce a message queue (Celery + Redis) for sending emails/notifications asynchronously
- Horizontal scaling: multiple Gunicorn workers behind a load balancer once traffic grows
