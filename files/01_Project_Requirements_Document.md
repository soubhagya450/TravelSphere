# Project Requirements Document (PRD)
## Real-Time Travel & Hotel Booking Platform

**Version:** 1.0
**Date:** September 17, 2026
**Prepared as:** Senior Developer Planning Document

---

## 1. Project Overview

A travel web application that allows users to:
1. Enter an **origin** and **destination**, and view their **real-time location on a map** along with a route/track drawn between the two points.
2. **Register and log in** securely.
3. **Search and book hotels** at the destination.
4. Once a hotel is booked, the tracking system updates to draw a route from the user's **origin → booked hotel location** (instead of a generic destination point).
5. Complete the booking through an integrated **payment system**.

---

## 2. Goals & Objectives

| Goal | Description |
|---|---|
| G1 | Provide live location tracking between two user-defined points |
| G2 | Let users discover and book hotels tied to their travel destination |
| G3 | Provide a secure, seamless payment experience |
| G4 | Ensure secure user authentication (register/login) |
| G5 | Deliver a responsive, fast, mobile-friendly UI using HTML/CSS/JS |

---

## 3. Stakeholders

- **End users (travelers):** search routes, book hotels, make payments
- **Admin:** manages hotel listings, views bookings, manages users
- **Developer/Owner:** maintains the system

---

## 4. Functional Requirements

### 4.1 User Authentication Module
- FR1: User can register with name, email, password, phone number
- FR2: Passwords must be hashed (never stored in plain text)
- FR3: User can log in with email/password
- FR4: JWT or session-based authentication for protected routes
- FR5: User can log out
- FR6: Forgot password / reset password flow (email-based OTP or link)
- FR7: Role-based access — normal user vs admin

### 4.2 Real-Time Location & Tracking Module
- FR8: User enters an **origin** (auto-detect via browser geolocation OR manual text entry)
- FR9: User enters a **destination** (searchable location, auto-complete)
- FR10: System geocodes both origin and destination into lat/lng coordinates
- FR11: Map displays both markers and draws a route/polyline between them
- FR12: Map updates in real time if the user's live location changes (using `navigator.geolocation.watchPosition`)
- FR13: Distance and estimated travel time is displayed
- FR14: When a hotel is booked, the destination marker/route updates to point to the **hotel's exact coordinates**

### 4.3 Hotel Listing & Booking Module
- FR15: Admin can add/edit/delete hotel listings (name, address, price/night, images, amenities, lat/lng, available rooms)
- FR16: User can browse/search hotels near the destination
- FR17: User can filter hotels (price range, rating, amenities)
- FR18: User can view hotel details page
- FR19: User selects check-in/check-out dates and number of rooms/guests
- FR20: System checks room availability before confirming
- FR21: Booking creates a pending order record before payment
- FR22: On successful payment, booking status changes to "Confirmed"
- FR23: User can view their booking history
- FR24: User can cancel a booking (per cancellation policy)

### 4.4 Payment Module
- FR25: Integrate a payment gateway (Razorpay/Stripe) for card, UPI, netbanking, wallet
- FR26: Generate an order on the backend before showing the payment popup (server-side amount validation — never trust client-side price)
- FR27: Verify payment signature/webhook server-side before confirming booking
- FR28: Generate invoice/receipt after successful payment
- FR29: Handle failed/cancelled payment gracefully (release held room, notify user)

### 4.5 Notifications (optional but recommended)
- FR30: Email confirmation on booking success
- FR31: Email/SMS on cancellation

---

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Map and route should load within 2–3 seconds |
| Scalability | System should support growth from single server to load-balanced setup |
| Availability | 99% uptime target |
| Usability | Mobile-responsive UI, minimum 3-click booking flow |
| Data Integrity | No double-booking of the same room for overlapping dates |
| Compliance | Payment data (card numbers) never touches our servers directly — use gateway's hosted checkout/tokenization |

---

## 6. User Roles

1. **Guest** – can browse hotels, view routes, cannot book
2. **Registered User** – full booking/payment access
3. **Admin** – manage hotels, view all bookings, manage users

---

## 7. Assumptions (please confirm/correct)

- Hotels are entered manually by an admin (not pulled from an external hotel API like Booking.com/Amadeus)
- Real-time "location" means: user's live browser GPS position tracked on a map, plus a route to a chosen destination/hotel — not live tracking of a moving vehicle/driver
- Single currency and single-region payments initially (can be extended)
- Map/geocoding provider: Google Maps Platform (can switch to Mapbox/OpenStreetMap)
- Payment gateway: Razorpay (can switch to Stripe/PayPal)

## 8. Open Questions for You

1. Which map provider do you prefer — **Google Maps** (paid after free tier, most accurate) or **OpenStreetMap + Leaflet** (free, open-source)?
2. Which payment gateway — **Razorpay**, **Stripe**, or **PayPal**?
3. Should hotels be **admin-added only**, or do you eventually want to pull live hotel data from a third-party API?
4. Do you need an **admin dashboard** as a separate interface?
5. Any specific target region/currency (e.g., India/INR, Global/USD)?

---

## 9. Out of Scope (v1)

- Flight booking
- Multi-language support
- Native mobile apps (this is web-only per your requirement)
- Real-time driver/vehicle tracking (this is user-location-to-destination tracking, not fleet tracking)
