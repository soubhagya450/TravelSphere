import json
from app.extensions import db, bcrypt
from app.models.user import User
from app.models.hotel import Hotel

SAMPLE_HOTELS = [
    {
        'name': 'The Taj Mahal Palace & Tower',
        'address': 'Apollo Bunder, Colaba',
        'city': 'Mumbai',
        'lat': 18.9217,
        'lng': 72.8332,
        'price_per_night': 14500.0,
        'total_rooms': 15,
        'rating': 4.9,
        'amenities': json.dumps(['Free WiFi', 'Swimming Pool', 'Spa & Wellness', 'Ocean View', 'Fine Dining', 'Airport Shuttle', 'Gym']),
        'image_url': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
        'description': 'Iconic landmark luxury hotel overlooking the Gateway of India and Arabian Sea with world-class hospitality.'
    },
    {
        'name': 'Grand Hyatt Mumbai Hotel & Residences',
        'address': 'Bandra Kurla Complex Vicinity, Santacruz East',
        'city': 'Mumbai',
        'lat': 19.0760,
        'lng': 72.8777,
        'price_per_night': 8500.0,
        'total_rooms': 20,
        'rating': 4.7,
        'amenities': json.dumps(['Free WiFi', 'Outdoor Pool', '24/7 Room Service', 'Fitness Center', 'Bar & Lounge', 'Conference Rooms']),
        'image_url': 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=80',
        'description': 'Contemporary multi-dimensional lifestyle complex in the heart of Mumbai featuring lavish rooms and multi-cuisine dining.'
    },
    {
        'name': 'Taj Fort Aguada Resort & Spa',
        'address': 'Sinquerim, Candolim',
        'city': 'Goa',
        'lat': 15.4989,
        'lng': 73.7689,
        'price_per_night': 11200.0,
        'total_rooms': 12,
        'rating': 4.8,
        'amenities': json.dumps(['Beachfront', 'Infinity Pool', 'Free Breakfast', 'Ayurvedic Spa', 'Water Sports', 'Sunset Bar']),
        'image_url': 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1000&q=80',
        'description': 'Romantic beachside resort set on the ramparts of a 16th-century Portuguese fortress overlooking the sea.'
    },
    {
        'name': 'W Goa Luxury Retreat',
        'address': 'Vagator Beach, Bardez',
        'city': 'Goa',
        'lat': 15.6028,
        'lng': 73.7336,
        'price_per_night': 13500.0,
        'total_rooms': 14,
        'rating': 4.7,
        'amenities': json.dumps(['Rock Pool', 'Direct Beach Access', 'Nightclub & DJ', 'Luxury Spa', 'Free High-speed WiFi', 'Pet Friendly']),
        'image_url': 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1000&q=80',
        'description': 'Trendy resort situated right on Vagator beach blending vibrant Goan lifestyle with modern luxury.'
    },
    {
        'name': 'The Leela Palace New Delhi',
        'address': 'Diplomatic Enclave, Chanakyapuri',
        'city': 'Delhi',
        'lat': 28.5804,
        'lng': 77.1895,
        'price_per_night': 12000.0,
        'total_rooms': 18,
        'rating': 4.9,
        'amenities': json.dumps(['Rooftop Temperature Pool', 'Michelin Chef Restaurant', 'ESPA Spa', 'Free Valet Parking', 'Luxury Chauffeur']),
        'image_url': 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=80',
        'description': 'Opulent modern palace in Delhi’s exclusive Diplomatic Enclave showcasing authentic Indian royal architecture.'
    },
    {
        'name': 'ITC Maurya Luxury Collection',
        'address': 'Sardar Patel Marg, Diplomatic Enclave',
        'city': 'Delhi',
        'lat': 28.5975,
        'lng': 77.1725,
        'price_per_night': 9800.0,
        'total_rooms': 25,
        'rating': 4.8,
        'amenities': json.dumps(['Bukhara Dining', 'Wellness Center', 'Outdoor Pool', 'Business Lounge', 'Eco-Luxury Rating']),
        'image_url': 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1000&q=80',
        'description': 'Premier 5-star hotel famed for the Bukhara restaurant and hosting global leaders and dignitaries.'
    },
    {
        'name': 'The Ritz-Carlton, Bangalore',
        'address': '99 Residency Road, Shanthala Nagar',
        'city': 'Bengaluru',
        'lat': 12.9669,
        'lng': 77.6074,
        'price_per_night': 10500.0,
        'total_rooms': 16,
        'rating': 4.8,
        'amenities': json.dumps(['Rooftop Bar Bang', 'Ritz-Carlton Spa', 'Heated Outdoor Pool', 'Executive Club Lounge', 'Central Location']),
        'image_url': 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1000&q=80',
        'description': 'Palatial sanctuary in central Bangalore with Jaali design elements, rooftop nightlife, and serene gardens.'
    },
    {
        'name': 'Rambagh Palace - Heritage Luxury',
        'address': 'Bhawani Singh Road',
        'city': 'Jaipur',
        'lat': 26.8979,
        'lng': 75.8080,
        'price_per_night': 18000.0,
        'total_rooms': 10,
        'rating': 5.0,
        'amenities': json.dumps(['Historic Royal Palace', 'Peacock Gardens', 'Indoor & Outdoor Pool', 'Jiva Spa', 'Heritage Walk', 'Polo Lounge']),
        'image_url': 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1000&q=80',
        'description': 'The former residence of the Maharaja of Jaipur, ranked among the finest heritage hotels in the world.'
    }
]

def seed_database():
    # 1. Seed Admin User
    admin = User.query.filter_by(email='admin@travel.com').first()
    if not admin:
        admin = User(
            name='System Administrator',
            email='admin@travel.com',
            password_hash=bcrypt.generate_password_hash('Admin@1234').decode('utf-8'),
            phone='+91 9876543210',
            role='admin'
        )
        db.session.add(admin)

    # 2. Seed Regular Users
    sample_users = [
        {'name': 'Soubhagya Traveler', 'email': 'user@travel.com', 'pw': 'User@1234', 'phone': '+91 9123456789', 'role': 'user'},
        {'name': 'Priya Sharma', 'email': 'priya.sharma@travel.com', 'pw': 'Priya@1234', 'phone': '+91 9811223344', 'role': 'user'},
        {'name': 'Alex Smith', 'email': 'alex.smith@travel.com', 'pw': 'Alex@1234', 'phone': '+1 5550192834', 'role': 'user'},
        {'name': 'John Doe Manager', 'email': 'john.doe@travel.com', 'pw': 'John@1234', 'phone': '+91 9988776655', 'role': 'admin'}
    ]

    for u_info in sample_users:
        u = User.query.filter_by(email=u_info['email']).first()
        if not u:
            u = User(
                name=u_info['name'],
                email=u_info['email'],
                password_hash=bcrypt.generate_password_hash(u_info['pw']).decode('utf-8'),
                phone=u_info['phone'],
                role=u_info['role']
            )
            db.session.add(u)

    db.session.commit()


    # 3. Seed Hotels
    if Hotel.query.count() == 0:
        for data in SAMPLE_HOTELS:
            hotel = Hotel(
                name=data['name'],
                address=data['address'],
                city=data['city'],
                lat=data['lat'],
                lng=data['lng'],
                price_per_night=data['price_per_night'],
                total_rooms=data['total_rooms'],
                rating=data['rating'],
                amenities=data['amenities'],
                image_url=data['image_url'],
                description=data['description'],
                created_by_admin_id=admin.id
            )
            db.session.add(hotel)
        db.session.commit()
