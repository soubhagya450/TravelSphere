import pytest
from datetime import date, timedelta
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.hotel import Hotel
from app.models.trip import Trip
from app.models.booking import Booking
from app.models.payment import Payment
from app.services.payment_service import PaymentService

@pytest.fixture
def client_and_app():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        # Seed test data
        hotel = Hotel(
            name='The Grand Palace',
            address='Colaba',
            city='Mumbai',
            lat=18.9217,
            lng=72.8332,
            price_per_night=10000.0,
            total_rooms=10,
            rating=4.9
        )
        user = User(
            name='Test User',
            email='paytest@test.com',
            password_hash='dummyhash',
            role='user'
        )
        db.session.add(hotel)
        db.session.add(user)
        db.session.commit()

        trip = Trip(
            user_id=user.id,
            origin_address='Pune, Maharashtra',
            origin_lat=18.5204,
            origin_lng=73.8567,
            destination_address='Mumbai Generic Destination',
            destination_lat=19.0760,
            destination_lng=72.8777
        )
        db.session.add(trip)
        db.session.commit()

        booking = Booking(
            user_id=user.id,
            hotel_id=hotel.id,
            trip_id=trip.id,
            check_in=date.today() + timedelta(days=2),
            check_out=date.today() + timedelta(days=4),
            rooms_booked=1,
            total_amount=20000.0,
            status='pending'
        )
        db.session.add(booking)
        db.session.commit()

        yield app.test_client(), app
        db.session.remove()
        db.drop_all()

def test_payment_flow_and_post_booking_tracking_update(client_and_app):
    client, app = client_and_app
    with app.app_context():
        booking = Booking.query.first()
        user = User.query.first()
        trip = Trip.query.first()
        hotel = Hotel.query.first()

        # 1. Create order
        order_data, err = PaymentService.create_order(booking.id, user.id)
        assert err is None
        assert order_data['amount'] == 20000.0
        assert order_data['order_id'].startswith('order_')

        # 2. Verify payment with valid HMAC signature
        payment_id = 'pay_test12345'
        secret = app.config.get('RAZORPAY_KEY_SECRET')
        signature = PaymentService.generate_expected_signature(order_data['order_id'], payment_id, secret)

        success, msg, confirmed_booking = PaymentService.verify_payment(
            order_id=order_data['order_id'],
            payment_id=payment_id,
            signature=signature,
            payment_method='card'
        )

        assert success is True
        assert confirmed_booking.status == 'confirmed'

        # 3. Verify that post-booking route destination coordinates were updated to hotel coordinates
        refreshed_trip = db.session.get(Trip, trip.id)
        assert refreshed_trip.linked_hotel_id == hotel.id
        assert refreshed_trip.destination_lat == hotel.lat
        assert refreshed_trip.destination_lng == hotel.lng
        assert hotel.name in refreshed_trip.destination_address
