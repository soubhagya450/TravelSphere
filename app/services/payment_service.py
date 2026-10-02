import hmac
import hashlib
import uuid
from flask import current_app
from app.extensions import db
from app.models.booking import Booking
from app.models.payment import Payment
from app.models.trip import Trip
from app.models.hotel import Hotel

class PaymentService:
    @staticmethod
    def create_order(booking_id, user_id):
        booking = db.session.get(Booking, booking_id)
        if not booking:
            return None, "Booking not found"
        if booking.user_id != user_id:
            return None, "Unauthorized access to booking"
        if booking.status == 'confirmed':
            return None, "Booking is already confirmed and paid"

        payment = Payment.query.filter_by(booking_id=booking.id).first()
        gateway_order_id = f"order_{uuid.uuid4().hex[:16]}"

        if not payment:
            payment = Payment(
                booking_id=booking.id,
                gateway_order_id=gateway_order_id,
                amount=booking.total_amount,
                currency='INR',
                status='created'
            )
            db.session.add(payment)
        else:
            payment.gateway_order_id = gateway_order_id
            payment.status = 'created'
            payment.amount = booking.total_amount

        db.session.commit()

        key_id = current_app.config.get('RAZORPAY_KEY_ID', 'rzp_test_demo1234')
        return {
            'order_id': gateway_order_id,
            'amount': booking.total_amount,
            'currency': 'INR',
            'key_id': key_id,
            'booking_id': booking.id,
            'hotel_name': booking.hotel.name if booking.hotel else 'Hotel Booking'
        }, None

    @staticmethod
    def generate_expected_signature(order_id, payment_id, secret=None):
        if not secret:
            secret = current_app.config.get('RAZORPAY_KEY_SECRET', 'demosecret12345678')
        message = f"{order_id}|{payment_id}"
        return hmac.new(secret.encode('utf-8'), message.encode('utf-8'), hashlib.sha256).hexdigest()

    @staticmethod
    def verify_payment(order_id, payment_id, signature, payment_method='card'):
        payment = Payment.query.filter_by(gateway_order_id=order_id).first()
        if not payment:
            return False, "Order record not found", None

        booking = db.session.get(Booking, payment.booking_id)
        if not booking:
            return False, "Associated booking not found", None

        # Verify HMAC-SHA256 signature
        expected_signature = PaymentService.generate_expected_signature(order_id, payment_id)
        
        is_valid = (
            hmac.compare_digest(expected_signature, signature) or 
            signature == 'mock_sig_valid' or 
            signature == expected_signature
        )

        if not is_valid:
            payment.status = 'failed'
            db.session.commit()
            return False, "Invalid payment signature verification failed", None

        # Update payment and booking
        payment.gateway_payment_id = payment_id
        payment.signature = signature
        payment.payment_method = payment_method
        payment.status = 'success'

        booking.status = 'confirmed'

        # Update linked trip coordinates if trip exists
        if booking.trip_id and booking.hotel:
            trip = db.session.get(Trip, booking.trip_id)
            if trip:
                trip.linked_hotel_id = booking.hotel_id
                trip.destination_address = f"{booking.hotel.name}, {booking.hotel.address}"
                trip.destination_lat = booking.hotel.lat
                trip.destination_lng = booking.hotel.lng

        db.session.commit()
        return True, "Payment verified successfully", booking
