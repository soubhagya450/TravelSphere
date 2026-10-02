from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.trip import Trip
from app.models.hotel import Hotel
from app.services.geocoding_service import GeocodingService
from app.utils.security import user_required

location_bp = Blueprint('location', __name__, url_prefix='/api/location')

@location_bp.route('/geocode', methods=['POST'])
def geocode():
    data = request.get_json() or {}
    address = data.get('address', '').strip()
    if not address:
        return jsonify({'error': 'Address is required'}), 400

    coords, err = GeocodingService.geocode(address)
    if err:
        return jsonify({'error': err}), 400

    return jsonify({'data': coords}), 200

@location_bp.route('/reverse', methods=['POST'])
def reverse_geocode():
    data = request.get_json() or {}
    lat = data.get('lat')
    lng = data.get('lng')

    if lat is None or lng is None:
        return jsonify({'error': 'lat and lng coordinates are required'}), 400

    details, err = GeocodingService.reverse_geocode(lat, lng)
    if err:
        return jsonify({'error': err}), 400

    return jsonify({'data': details}), 200


@location_bp.route('/trip', methods=['POST'])
@user_required()
def create_trip(current_user):
    data = request.get_json() or {}
    origin_address = data.get('origin_address', '').strip()
    origin_lat = data.get('origin_lat')
    origin_lng = data.get('origin_lng')
    dest_address = data.get('destination_address', '').strip()
    dest_lat = data.get('destination_lat')
    dest_lng = data.get('destination_lng')

    if not origin_address or not dest_address:
        return jsonify({'error': 'Origin and destination addresses are required'}), 400
    if origin_lat is None or origin_lng is None or dest_lat is None or dest_lng is None:
        return jsonify({'error': 'Coordinates are required for origin and destination'}), 400

    trip = Trip(
        user_id=current_user.id,
        origin_address=origin_address,
        origin_lat=float(origin_lat),
        origin_lng=float(origin_lng),
        destination_address=dest_address,
        destination_lat=float(dest_lat),
        destination_lng=float(dest_lng)
    )
    db.session.add(trip)
    db.session.commit()

    return jsonify({
        'message': 'Trip saved successfully',
        'trip': trip.to_dict()
    }), 201

@location_bp.route('/trip/<int:trip_id>', methods=['GET'])
@user_required()
def get_trip(current_user, trip_id):
    trip = db.session.get(Trip, trip_id)
    if not trip:
        return jsonify({'error': 'Trip not found'}), 404
    if trip.user_id != current_user.id and current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized to view this trip'}), 403

    return jsonify({'trip': trip.to_dict()}), 200

@location_bp.route('/trip/<int:trip_id>/link-hotel', methods=['PUT'])
@user_required()
def link_hotel_to_trip(current_user, trip_id):
    trip = db.session.get(Trip, trip_id)
    if not trip:
        return jsonify({'error': 'Trip not found'}), 404
    if trip.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized to modify this trip'}), 403

    data = request.get_json() or {}
    hotel_id = data.get('hotel_id')
    hotel = db.session.get(Hotel, hotel_id)
    if not hotel:
        return jsonify({'error': 'Hotel not found'}), 404

    trip.linked_hotel_id = hotel.id
    trip.destination_address = f"{hotel.name}, {hotel.address}, {hotel.city}"
    trip.destination_lat = hotel.lat
    trip.destination_lng = hotel.lng

    db.session.commit()
    return jsonify({
        'message': 'Trip destination updated to hotel coordinates',
        'trip': trip.to_dict()
    }), 200
