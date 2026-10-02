# Workflow Document
## Real-Time Travel & Hotel Booking Platform

This document describes the step-by-step operational workflows (user journeys + system logic) for the platform.

---

## 1. User Registration & Login Workflow

```
User → Fill Register Form (name, email, password, phone)
     → Frontend validates input (client-side)
     → POST /api/auth/register
     → Backend validates + checks email uniqueness
     → Password hashed (bcrypt) → stored in MySQL
     → Success response → redirect to Login page

User → Fill Login Form (email, password)
     → POST /api/auth/login
     → Backend verifies password hash
     → Generates JWT (or session cookie) → sent to client
     → Frontend stores token (httpOnly cookie preferred over localStorage)
     → Redirect to Dashboard
```

---

## 2. Real-Time Location & Route Tracking Workflow

```
User → Lands on Dashboard/Map page
     → Enters Origin (or clicks "Use my current location")
     → Enters Destination (city/hotel area/address)
     → Frontend geocodes both (or sends to backend geocoding endpoint)
     → System calls Directions API → gets route, distance, ETA
     → Map renders:
          - Marker A = Origin
          - Marker B = Destination
          - Polyline = route path
     → If "live tracking" toggled ON:
          - Browser watchPosition() fires on movement
          - Origin marker updates in real time
          - Route recalculates if origin drifts significantly
     → Trip record saved to `trips` table (origin, destination coords)
```

---

## 3. Hotel Search & Selection Workflow

```
User → From Dashboard, clicks "Find Hotels near Destination"
     → GET /api/hotels?city=<destination_city>&filters...
     → Backend queries `hotels` table (WHERE city matches / lat-lng radius)
     → Frontend displays hotel cards (image, name, price, rating)
     → User applies filters (price, amenities, rating) → re-fetch
     → User clicks a hotel → GET /api/hotels/<id> → Hotel Detail Page
```

---

## 4. Booking Workflow

```
User (on Hotel Detail Page)
     → Selects check-in date, check-out date, rooms/guests
     → Clicks "Book Now"
     → POST /api/bookings { hotel_id, trip_id, check_in, check_out, rooms }
     → Backend:
          1. Validates dates (check_out > check_in, not in the past)
          2. Checks room availability for that date range
             (query existing bookings for overlap)
          3. If unavailable → return error, prompt user to change dates
          4. If available → calculate total_amount server-side
             (price_per_night * nights * rooms) — NEVER trust client price
          5. Create booking row with status = 'pending'
     → Return booking_id + amount to frontend
     → Frontend redirects to Payment Page
```

---

## 5. Payment Workflow

```
Frontend (Payment Page)
     → POST /api/payments/create-order { booking_id }
     → Backend:
          1. Fetch booking, verify it belongs to logged-in user & still pending
          2. Call Payment Gateway API to create an order (amount in paise/cents)
          3. Save gateway_order_id in `payments` table (status='created')
          4. Return order details + gateway key to frontend
     → Frontend opens Gateway Checkout widget (Razorpay/Stripe Checkout)
     → User completes payment (card/UPI/wallet)
     → Gateway returns payment_id + signature to frontend
     → Frontend → POST /api/payments/verify { payment_id, order_id, signature }
     → Backend:
          1. Verifies signature using gateway secret (HMAC check)
          2. If valid → update payment.status = 'success'
                        → update booking.status = 'confirmed'
                        → decrement available rooms
          3. If invalid/failed → payment.status = 'failed', booking stays pending/expires
     → Backend ALSO listens to Gateway Webhook (server-to-server) as a
       source of truth backup, in case frontend callback is interrupted
     → On success: send confirmation email, update map to show
       route: Origin → Hotel Location (trips.linked_hotel_id updated)
     → Redirect user to Booking Confirmation page
```

---

## 6. Post-Booking: Updated Tracking Workflow

```
Once booking is confirmed:
     → trips.destination_lat/lng updated to hotel's lat/lng
     → trips.linked_hotel_id = booked hotel's id
     → Dashboard map re-renders route: Origin → Hotel (instead of generic destination)
     → User can view this route anytime from "My Bookings" → "Track Route"
```

---

## 7. Booking Cancellation Workflow

```
User → My Bookings page → selects a booking → "Cancel"
     → PUT /api/bookings/<id>/cancel
     → Backend checks cancellation policy (e.g., free before 24h of check-in)
     → Updates booking.status = 'cancelled'
     → Increments available rooms back
     → If eligible, triggers refund via Payment Gateway API
     → Sends cancellation confirmation email
```

---

## 8. Admin Workflow

```
Admin → Login (role check = 'admin')
      → Admin Dashboard
      → Add/Edit/Delete Hotel Listings
      → View All Bookings (filter by date/hotel/user)
      → View Payment/Revenue Reports
      → Manage Users (view, deactivate if needed)
```

---

## 9. High-Level Sequence Diagram (Text Form)

```
[User] → [Frontend] → [Flask API] → [MySQL]
                    → [Maps API]  (geocode/route)
                    → [Payment Gateway] (order/verify)
                    → [Email Service] (notifications)
```
