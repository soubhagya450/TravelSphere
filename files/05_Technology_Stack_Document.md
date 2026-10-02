# Technology Stack Document
## Real-Time Travel & Hotel Booking Platform

---

## 1. Frontend

| Layer | Technology | Purpose |
|---|---|---|
| Structure | HTML5 | Page markup |
| Styling | CSS3 (optionally + Bootstrap or Tailwind CDN) | Responsive layout, styling |
| Logic | Vanilla JavaScript (ES6+) | DOM manipulation, API calls, form handling |
| Maps/Geolocation | Google Maps JavaScript API + Directions API + Geocoding API (or Leaflet.js + OpenStreetMap + OSRM as free alternative) | Render map, markers, routes, live position |
| HTTP calls | Fetch API | Communicate with Flask REST backend |
| Payment UI | Razorpay Checkout.js / Stripe.js | Secure hosted payment widget |

---

## 2. Backend

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Flask (Python) | REST API server |
| ORM | SQLAlchemy (Flask-SQLAlchemy) | Database models & queries |
| Migrations | Flask-Migrate (Alembic) | Schema version control |
| Authentication | Flask-JWT-Extended or Flask-Login | Token/session-based auth |
| Password hashing | Flask-Bcrypt / Werkzeug security | Secure password storage |
| CORS | Flask-CORS | Cross-origin requests from frontend |
| Rate limiting | Flask-Limiter | Prevent brute-force attacks |
| Security headers | Flask-Talisman | HTTPS enforcement, CSP headers |
| Environment config | python-dotenv | Manage secrets via `.env` |
| Email | Flask-Mail (SMTP) or SendGrid API | Booking confirmations, password resets |
| Background jobs (optional, for scale) | Celery + Redis | Async email sending, cleanup of expired pending bookings |

---

## 3. Database

| Component | Technology |
|---|---|
| RDBMS | MySQL 8.x |
| Driver | PyMySQL or mysqlclient |
| Admin tool | phpMyAdmin / MySQL Workbench (for dev convenience) |

---

## 4. External APIs / Third-Party Services

| Service | Purpose | Alternative |
|---|---|---|
| Google Maps Platform (Maps JS, Geocoding, Directions API) | Location display, address→coords, routing | Mapbox / Leaflet + OpenStreetMap + OSRM (free) |
| Razorpay | Payments (cards, UPI, netbanking, wallets) | Stripe, PayPal |
| SMTP / SendGrid | Transactional emails | Amazon SES, Mailgun |

---

## 5. Development & DevOps Tools

| Purpose | Tool |
|---|---|
| Version control | Git + GitHub/GitLab |
| API testing | Postman / Thunder Client |
| WSGI server (production) | Gunicorn |
| Reverse proxy | Nginx |
| Process manager | systemd or Supervisor |
| Hosting (options) | VPS (DigitalOcean/AWS EC2), or PaaS (Render, Railway, PythonAnywhere for MVP) |
| SSL Certificate | Let's Encrypt (Certbot) |
| Environment | Python virtualenv / venv |
| Dependency management | `requirements.txt` (or Poetry) |

---

## 6. Suggested Python Dependencies (`requirements.txt`)

```
Flask==3.x
Flask-SQLAlchemy==3.x
Flask-Migrate==4.x
Flask-JWT-Extended==4.x
Flask-Bcrypt==1.x
Flask-CORS==4.x
Flask-Limiter==3.x
Flask-Talisman==1.x
Flask-Mail==0.x
PyMySQL==1.x
python-dotenv==1.x
razorpay==1.x   # or stripe==8.x
gunicorn==22.x
```

---

## 7. Folder Structure Overview (Frontend)

```
frontend/
├── index.html
├── login.html
├── register.html
├── dashboard.html
├── hotels.html
├── hotel-detail.html
├── booking.html
├── payment.html
├── admin.html
├── /css
│   └── style.css
├── /js
│   ├── api.js
│   ├── auth.js
│   ├── map.js
│   ├── hotels.js
│   ├── booking.js
│   └── payment.js
└── /assets
    └── images/
```

---

## 8. Why This Stack

- **HTML/CSS/JS**: matches your requirement — no heavy frontend framework needed for an MVP; keeps it lightweight and fast to build.
- **Flask**: lightweight, flexible Python framework, easy to structure with Blueprints, huge ecosystem for auth/payments/security.
- **MySQL**: reliable relational DB, ideal for structured data like bookings, users, hotels with clear relationships (foreign keys, transactions for booking integrity).
- **SQLAlchemy ORM**: protects against SQL injection and makes schema migrations manageable as the project grows.
