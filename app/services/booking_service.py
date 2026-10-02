from sqlalchemy import and_, or_
from app.extensions import db
from app.models.hotel import Hotel
from app.models.booking import Booking

class BookingService:
    @staticmethod
    def get_booked_rooms_count(hotel_id, check_in, check_out, exclude_booking_id=None):
        query = Booking.query.filter(
            Booking.hotel_id == hotel_id,
            Booking.status.in_(['confirmed', 'pending']),
            Booking.check_in < check_out,
            Booking.check_out > check_in
        )
        if exclude_booking_id:
            query = query.filter(Booking.id != exclude_booking_id)

        overlapping_bookings = query.all()
        return sum(b.rooms_booked for b in overlapping_bookings)

    @staticmethod
    def check_availability(hotel_id, check_in, check_out, rooms_requested=1):
        hotel = db.session.get(Hotel, hotel_id)
        if not hotel:
            return False, "Hotel not found", 0

        booked_rooms = BookingService.get_booked_rooms_count(hotel_id, check_in, check_out)
        available_rooms = max(0, hotel.total_rooms - booked_rooms)

        if available_rooms < rooms_requested:
            return False, f"Only {available_rooms} room(s) available for the selected dates (requested {rooms_requested})", available_rooms

        return True, "Rooms available", available_rooms

    @staticmethod
    def calculate_total_amount(hotel_id, check_in, check_out, rooms=1):
        hotel = db.session.get(Hotel, hotel_id)
        if not hotel:
            return None, "Hotel not found"
        nights = max(1, (check_out - check_in).days)
        total = round(hotel.price_per_night * nights * rooms, 2)
        return total, None

    @staticmethod
    def create_pending_booking(user_id, hotel_id, trip_id, check_in, check_out, rooms_booked, guest_name=None, guest_email=None, guest_phone=None):
        is_avail, msg, _ = BookingService.check_availability(hotel_id, check_in, check_out, rooms_booked)
        if not is_avail:
            return None, msg

        total_amount, err = BookingService.calculate_total_amount(hotel_id, check_in, check_out, rooms_booked)
        if err:
            return None, err

        booking = Booking(
            user_id=user_id,
            hotel_id=hotel_id,
            trip_id=trip_id,
            check_in=check_in,
            check_out=check_out,
            rooms_booked=rooms_booked,
            total_amount=total_amount,
            status='pending',
            guest_name=guest_name,
            guest_email=guest_email,
            guest_phone=guest_phone
        )
        db.session.add(booking)
        db.session.commit()
        return booking, None
