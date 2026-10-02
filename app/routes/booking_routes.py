from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.booking import Booking
from app.models.hotel import Hotel
from app.services.booking_service import BookingService
from app.utils.security import user_required, admin_required
from app.utils.validators import validate_booking_dates

booking_bp = Blueprint('bookings', __name__, url_prefix='/api/bookings')

@booking_bp.route('/check-availability', methods=['POST'])
def check_availability():
    data = request.get_json() or {}
    hotel_id = data.get('hotel_id')
    check_in_str = data.get('check_in')
    check_out_str = data.get('check_out')
    rooms = data.get('rooms', 1)

    if not hotel_id or not check_in_str or not check_out_str:
        return jsonify({'error': 'hotel_id, check_in, and check_out are required'}), 400

    valid, err, check_in, check_out = validate_booking_dates(check_in_str, check_out_str)
    if not valid:
        return jsonify({'error': err}), 400

    is_avail, msg, avail_rooms = BookingService.check_availability(hotel_id, check_in, check_out, rooms)
    total_amount, _ = BookingService.calculate_total_amount(hotel_id, check_in, check_out, rooms)

    return jsonify({
        'available': is_avail,
        'message': msg,
        'available_rooms': avail_rooms,
        'estimated_total': total_amount
    }), 200

@booking_bp.route('', methods=['POST'])
@user_required()
def create_booking(current_user):
    data = request.get_json() or {}
    hotel_id = data.get('hotel_id')
    trip_id = data.get('trip_id')
    check_in_str = data.get('check_in')
    check_out_str = data.get('check_out')
    rooms_booked = int(data.get('rooms', 1))
    guest_name = data.get('guest_name', current_user.name)
    guest_email = data.get('guest_email', current_user.email)
    guest_phone = data.get('guest_phone', current_user.phone)

    if not hotel_id or not check_in_str or not check_out_str:
        return jsonify({'error': 'hotel_id, check_in, and check_out are required'}), 400

    valid, err, check_in, check_out = validate_booking_dates(check_in_str, check_out_str)
    if not valid:
        return jsonify({'error': err}), 400

    booking, err = BookingService.create_pending_booking(
        user_id=current_user.id,
        hotel_id=hotel_id,
        trip_id=trip_id,
        check_in=check_in,
        check_out=check_out,
        rooms_booked=rooms_booked,
        guest_name=guest_name,
        guest_email=guest_email,
        guest_phone=guest_phone
    )

    if err:
        return jsonify({'error': err}), 400

    return jsonify({
        'message': 'Pending booking created successfully',
        'booking': booking.to_dict()
    }), 201

@booking_bp.route('/my', methods=['GET'])
@user_required()
def my_bookings(current_user):
    bookings = Booking.query.filter_by(user_id=current_user.id).order_by(Booking.created_at.desc()).all()
    return jsonify({
        'count': len(bookings),
        'bookings': [b.to_dict() for b in bookings]
    }), 200

@booking_bp.route('/<int:booking_id>', methods=['GET'])
@user_required()
def get_booking(current_user, booking_id):
    booking = db.session.get(Booking, booking_id)
    if not booking:
        return jsonify({'error': 'Booking not found'}), 404
    if booking.user_id != current_user.id and current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized to view this booking'}), 403

    return jsonify({'booking': booking.to_dict()}), 200

@booking_bp.route('/all', methods=['GET'])
@admin_required()
def all_bookings(current_user):
    bookings = Booking.query.order_by(Booking.created_at.desc()).all()
    return jsonify({
        'count': len(bookings),
        'bookings': [b.to_dict() for b in bookings]
    }), 200

@booking_bp.route('/<int:booking_id>/cancel', methods=['PUT'])
@user_required()
def cancel_booking(current_user, booking_id):
    booking = db.session.get(Booking, booking_id)
    if not booking:
        return jsonify({'error': 'Booking not found'}), 404
    if booking.user_id != current_user.id and current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized to cancel this booking'}), 403

    if booking.status == 'cancelled':
        return jsonify({'error': 'Booking is already cancelled'}), 400

    booking.status = 'cancelled'
    if booking.payment and booking.payment.status == 'success':
        booking.payment.status = 'refunded'

    db.session.commit()
    return jsonify({
        'message': 'Booking cancelled successfully',
        'booking': booking.to_dict()
    }), 200
