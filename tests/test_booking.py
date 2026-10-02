import pytest
from datetime import date, timedelta
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.hotel import Hotel
from app.models.booking import Booking
from app.services.booking_service import BookingService

@pytest.fixture
def client():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        # Create hotel with 2 rooms
        hotel = Hotel(
            name='Boutique Villa',
            address='Beach Road',
            city='Goa',
            lat=15.4989,
            lng=73.7689,
            price_per_night=5000.0,
            total_rooms=2,
            rating=4.8
        )
        # Create user
        user = User(
            name='John Doe',
            email='john@test.com',
            password_hash='dummyhash',
            role='user'
        )
        db.session.add(hotel)
        db.session.add(user)
        db.session.commit()

        yield app.test_client()
        db.session.remove()
        db.drop_all()

def test_room_availability_and_double_booking_prevention(client):
    today = date.today()
    check_in = today + timedelta(days=2)
    check_out = today + timedelta(days=5)

    hotel = Hotel.query.first()
    user = User.query.first()

    # Initially 2 rooms available
    avail, msg, count = BookingService.check_availability(hotel.id, check_in, check_out, rooms_requested=2)
    assert avail is True
    assert count == 2

    # Book 2 rooms
    booking, err = BookingService.create_pending_booking(
        user_id=user.id,
        hotel_id=hotel.id,
        trip_id=None,
        check_in=check_in,
        check_out=check_out,
        rooms_booked=2
    )
    assert err is None
    assert booking is not None
    assert booking.total_amount == 5000.0 * 3 * 2  # 3 nights * 2 rooms * 5000 = 30000

    # Try booking 1 more room for overlapping dates -> must fail!
    avail2, msg2, count2 = BookingService.check_availability(hotel.id, check_in + timedelta(days=1), check_out, rooms_requested=1)
    assert avail2 is False
    assert count2 == 0

    # Non-overlapping future dates -> must succeed!
    future_in = check_out + timedelta(days=2)
    future_out = future_in + timedelta(days=3)
    avail3, msg3, count3 = BookingService.check_availability(hotel.id, future_in, future_out, rooms_requested=2)
    assert avail3 is True
    assert count3 == 2
