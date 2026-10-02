from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.booking import Booking
from app.services.payment_service import PaymentService
from app.utils.security import user_required

payment_bp = Blueprint('payments', __name__, url_prefix='/api/payments')

@payment_bp.route('/create-order', methods=['POST'])
@user_required()
def create_order(current_user):
    data = request.get_json() or {}
    booking_id = data.get('booking_id')
    if not booking_id:
        return jsonify({'error': 'booking_id is required'}), 400

    order_details, err = PaymentService.create_order(booking_id, current_user.id)
    if err:
        return jsonify({'error': err}), 400

    return jsonify({
        'message': 'Payment order created',
        'order': order_details
    }), 200

@payment_bp.route('/verify', methods=['POST'])
@user_required()
def verify_payment(current_user):
    data = request.get_json() or {}
    order_id = data.get('order_id')
    payment_id = data.get('payment_id')
    signature = data.get('signature')
    payment_method = data.get('payment_method', 'card')

    if not order_id or not payment_id or not signature:
        return jsonify({'error': 'order_id, payment_id, and signature are required'}), 400

    success, msg, booking = PaymentService.verify_payment(
        order_id=order_id,
        payment_id=payment_id,
        signature=signature,
        payment_method=payment_method
    )

    if not success:
        return jsonify({'error': msg}), 400

    return jsonify({
        'message': 'Payment verified and booking confirmed successfully',
        'booking': booking.to_dict()
    }), 200

@payment_bp.route('/receipt/<int:booking_id>', methods=['GET'])
@user_required()
def get_receipt(current_user, booking_id):
    booking = db.session.get(Booking, booking_id)
    if not booking:
        return jsonify({'error': 'Booking not found'}), 404
    if booking.user_id != current_user.id and current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    payment = booking.payment
    if not payment or payment.status != 'success':
        return jsonify({'error': 'No confirmed payment found for this booking'}), 400

    return jsonify({
        'receipt': {
            'invoice_number': f"INV-{booking.id:06d}",
            'booking_id': booking.id,
            'guest_name': booking.guest_name or current_user.name,
            'guest_email': booking.guest_email or current_user.email,
            'hotel_name': booking.hotel.name if booking.hotel else 'N/A',
            'hotel_address': booking.hotel.address if booking.hotel else 'N/A',
            'hotel_city': booking.hotel.city if booking.hotel else 'N/A',
            'check_in': booking.check_in.strftime('%Y-%m-%d'),
            'check_out': booking.check_out.strftime('%Y-%m-%d'),
            'rooms': booking.rooms_booked,
            'nights': (booking.check_out - booking.check_in).days,
            'rate_per_night': booking.hotel.price_per_night if booking.hotel else 0,
            'total_amount': booking.total_amount,
            'currency': payment.currency,
            'payment_id': payment.gateway_payment_id,
            'payment_method': payment.payment_method,
            'payment_date': payment.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'status': 'PAID'
        }
    }), 200

@payment_bp.route('/webhook', methods=['POST'])
def webhook():
    return jsonify({'status': 'received'}), 200
