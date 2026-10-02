# Security System Document
## Real-Time Travel & Hotel Booking Platform

---

## 1. Authentication Security

| Area | Implementation |
|---|---|
| Password storage | Hash with **bcrypt** (via `flask-bcrypt` or `werkzeug.security`), never store plaintext |
| Session/Token | Use **JWT** (via `flask-jwt-extended`) with short expiry (e.g., 15–30 min access token) + refresh token, OR server-side sessions with `flask-login` and secure cookies |
| Token storage on client | Prefer **httpOnly, Secure, SameSite=Strict cookies** over localStorage (localStorage is vulnerable to XSS token theft) |
| Login rate limiting | Use `flask-limiter` to block brute-force attempts (e.g., max 5 attempts/minute per IP) |
| Password policy | Enforce minimum length (8+), require mix of letters/numbers on registration |
| Email verification | Recommended: send verification link before allowing login (prevents fake accounts) |
| Password reset | Time-limited, single-use token sent via email; never send the password itself |

---

## 2. Authorization / Access Control

- **Role-Based Access Control (RBAC):** `user` vs `admin` roles stored in DB, checked via a decorator (`@admin_required`) on all admin routes.
- Every protected route verifies the JWT/session **and** checks that the resource belongs to the requesting user (e.g., a user can only view/cancel their own bookings — verify `booking.user_id == current_user.id` server-side, never trust a booking ID passed from the frontend blindly).

---

## 3. Input Validation & Injection Prevention

| Threat | Mitigation |
|---|---|
| SQL Injection | Use **SQLAlchemy ORM** with parameterized queries — never string-concatenate raw SQL |
| XSS (Cross-Site Scripting) | Escape all user-generated content when rendering (Jinja2 auto-escapes by default); sanitize any hotel review/comment fields |
| CSRF | Use `flask-wtf` CSRF tokens for any form-based POST; for pure JSON APIs, rely on SameSite cookies + custom header checks |
| Mass assignment | Explicitly whitelist fields accepted from request JSON — never do `Model(**request.json)` blindly |
| File upload (hotel images) | Validate file type/extension, limit size, store outside web-root or use cloud storage (S3), rename files to prevent path traversal |

---

## 4. Payment Security (Critical)

- **Never handle raw card numbers on your server** — use the payment gateway's hosted checkout / tokenized flow (Razorpay Checkout, Stripe Elements). This keeps you out of full PCI-DSS scope.
- **Server-side amount calculation only** — the amount sent to the payment gateway must be computed by the backend from the DB (`price_per_night * nights * rooms`), never trusted from the frontend request.
- **Signature verification** — always verify the HMAC signature returned after payment (Razorpay: `razorpay_signature`; Stripe: webhook signing secret) before marking a booking as confirmed.
- **Webhooks as source of truth** — implement gateway webhooks server-to-server as a backup confirmation path in case the client-side redirect fails or is tampered with.
- **Idempotency** — ensure a webhook or double-click can't create duplicate confirmed bookings/charges (use unique constraint on `gateway_order_id`).
- **API keys/secrets** — store gateway secret keys in environment variables (`.env`, never committed to git), loaded via `python-dotenv`.

---

## 5. Transport & Infrastructure Security

- **Enforce HTTPS everywhere** (TLS certificate via Let's Encrypt) — required for geolocation API to work in browsers anyway, and mandatory for handling auth/payment data.
- **CORS policy** — restrict `Access-Control-Allow-Origin` to your actual frontend domain, not `*`.
- **Security headers** — set `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` (via `flask-talisman`).
- **Environment separation** — separate `.env` configs for dev/staging/production; never expose Flask debug mode (`debug=False`) in production.
- **Database access** — MySQL user for the app should have least-privilege permissions (no `DROP`/`GRANT` rights), separate from root/admin DB user.
- **Secrets management** — DB password, JWT secret key, map API key, payment gateway keys all in environment variables, not hardcoded.

---

## 6. Location/Privacy Security

- Request geolocation permission explicitly; handle denial gracefully (fallback to manual address entry).
- Do not store continuous live location history longer than needed — store only the trip's origin/destination snapshot, not a full location trail, unless the user is informed and opts in.
- Clearly disclose in a Privacy Policy what location data is collected and why.

---

## 7. Logging & Monitoring

- Log authentication attempts, failed logins, and payment events (without logging sensitive data like passwords or full card/payment details).
- Set up error monitoring (e.g., Sentry) to catch and alert on backend exceptions.
- Regularly audit admin actions (hotel add/edit/delete) with an audit trail (who did what, when).

---

## 8. Security Checklist Before Going Live

- [ ] All passwords hashed with bcrypt
- [ ] HTTPS enforced site-wide
- [ ] JWT/session expiry configured correctly
- [ ] Rate limiting on login/register endpoints
- [ ] SQL queries all via ORM (no raw string concatenation)
- [ ] CSRF protection on state-changing requests
- [ ] Payment amount always computed server-side
- [ ] Payment signature verified before confirming booking
- [ ] Webhook endpoint verified via gateway signing secret
- [ ] `.env` file excluded from git (`.gitignore`)
- [ ] Flask `debug=False` in production
- [ ] Admin routes protected by role check
- [ ] Input validation on every form (both client- and server-side)
- [ ] File upload validation (type, size) for hotel images
- [ ] Database user has least-privilege access
