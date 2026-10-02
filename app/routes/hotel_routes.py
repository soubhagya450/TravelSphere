import json
import math
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.hotel import Hotel
from app.utils.security import admin_required

hotel_bp = Blueprint('hotels', __name__, url_prefix='/api/hotels')

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@hotel_bp.route('', methods=['GET'])
def list_hotels():
    query = Hotel.query

    city = request.args.get('city', '').strip()
    if city:
        query = query.filter(Hotel.city.ilike(f'%{city}%'))

    search = request.args.get('search', '').strip()
    if search:
        query = query.filter(
            db.or_(
                Hotel.name.ilike(f'%{search}%'),
                Hotel.city.ilike(f'%{search}%'),
                Hotel.address.ilike(f'%{search}%')
            )
        )

    min_price = request.args.get('min_price', type=float)
    if min_price is not None:
        query = query.filter(Hotel.price_per_night >= min_price)

    max_price = request.args.get('max_price', type=float)
    if max_price is not None:
        query = query.filter(Hotel.price_per_night <= max_price)

    min_rating = request.args.get('min_rating', type=float)
    if min_rating is not None:
        query = query.filter(Hotel.rating >= min_rating)

    amenity = request.args.get('amenity', '').strip()
    if amenity:
        query = query.filter(Hotel.amenities.ilike(f'%{amenity}%'))

    hotels = query.order_by(Hotel.rating.desc()).all()
    return jsonify({
        'count': len(hotels),
        'hotels': [h.to_dict() for h in hotels]
    }), 200

@hotel_bp.route('/nearby-route', methods=['POST'])
def get_hotels_nearby_route():
    data = request.get_json() or {}
    waypoints = data.get('waypoints', [])
    o_lat = data.get('origin_lat')
    o_lng = data.get('origin_lng')
    d_lat = data.get('dest_lat')
    d_lng = data.get('dest_lng')
    max_dist = float(data.get('max_dist_km', 250))

    if not waypoints and o_lat is not None and d_lat is not None:
        waypoints = [[float(o_lat), float(o_lng)], [float(d_lat), float(d_lng)]]

    all_hotels = Hotel.query.all()
    results = []

    for hotel in all_hotels:
        h_lat = hotel.lat
        h_lng = hotel.lng
        min_dist = float('inf')

        if waypoints:
            sample_step = max(1, len(waypoints) // 40)
            sampled = waypoints[::sample_step]
            if waypoints[-1] not in sampled:
                sampled.append(waypoints[-1])

            for pt in sampled:
                dist = haversine_distance(h_lat, h_lng, pt[0], pt[1])
                if dist < min_dist:
                    min_dist = dist
        else:
            min_dist = 0

        if min_dist <= max_dist:
            h_dict = hotel.to_dict()
            h_dict['distance_to_route_km'] = round(min_dist, 1)
            results.append(h_dict)

    results.sort(key=lambda x: x['distance_to_route_km'])
    return jsonify({
        'count': len(results),
        'hotels': results
    }), 200


@hotel_bp.route('/<int:hotel_id>', methods=['GET'])
def get_hotel(hotel_id):
    hotel = db.session.get(Hotel, hotel_id)
    if not hotel:
        return jsonify({'error': 'Hotel not found'}), 404
    return jsonify({'hotel': hotel.to_dict()}), 200

@hotel_bp.route('', methods=['POST'])
@admin_required()
def add_hotel(current_user):
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    address = data.get('address', '').strip()
    city = data.get('city', '').strip()
    lat = data.get('lat')
    lng = data.get('lng')
    price = data.get('price_per_night')
    total_rooms = data.get('total_rooms', 10)

    if not name or not address or not city or lat is None or lng is None or price is None:
        return jsonify({'error': 'Name, address, city, lat, lng, and price_per_night are required'}), 400

    amenities = data.get('amenities', [])
    if isinstance(amenities, list):
        amenities_str = json.dumps(amenities)
    else:
        amenities_str = str(amenities)

    hotel = Hotel(
        name=name,
        address=address,
        city=city,
        lat=float(lat),
        lng=float(lng),
        price_per_night=float(price),
        total_rooms=int(total_rooms),
        rating=float(data.get('rating', 4.5)),
        amenities=amenities_str,
        image_url=data.get('image_url', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80'),
        description=data.get('description', ''),
        created_by_admin_id=current_user.id
    )
    db.session.add(hotel)
    db.session.commit()

    return jsonify({
        'message': 'Hotel created successfully',
        'hotel': hotel.to_dict()
    }), 201

@hotel_bp.route('/<int:hotel_id>', methods=['PUT'])
@admin_required()
def update_hotel(current_user, hotel_id):
    hotel = db.session.get(Hotel, hotel_id)
    if not hotel:
        return jsonify({'error': 'Hotel not found'}), 404

    data = request.get_json() or {}
    if 'name' in data: hotel.name = data['name'].strip()
    if 'address' in data: hotel.address = data['address'].strip()
    if 'city' in data: hotel.city = data['city'].strip()
    if 'lat' in data: hotel.lat = float(data['lat'])
    if 'lng' in data: hotel.lng = float(data['lng'])
    if 'price_per_night' in data: hotel.price_per_night = float(data['price_per_night'])
    if 'total_rooms' in data: hotel.total_rooms = int(data['total_rooms'])
    if 'rating' in data: hotel.rating = float(data['rating'])
    if 'description' in data: hotel.description = data['description']
    if 'image_url' in data: hotel.image_url = data['image_url']
    if 'amenities' in data:
        hotel.amenities = json.dumps(data['amenities']) if isinstance(data['amenities'], list) else str(data['amenities'])

    db.session.commit()
    return jsonify({
        'message': 'Hotel updated successfully',
        'hotel': hotel.to_dict()
    }), 200

@hotel_bp.route('/<int:hotel_id>', methods=['DELETE'])
@admin_required()
def delete_hotel(current_user, hotel_id):
    hotel = db.session.get(Hotel, hotel_id)
    if not hotel:
        return jsonify({'error': 'Hotel not found'}), 404

    db.session.delete(hotel)
    db.session.commit()
    return jsonify({'message': 'Hotel deleted successfully'}), 200
