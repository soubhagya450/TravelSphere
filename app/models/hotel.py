import json
from app.extensions import db

class Hotel(db.Model):
    __tablename__ = 'hotels'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(150), nullable=False, index=True)
    address = db.Column(db.String(255), nullable=False)
    city = db.Column(db.String(100), nullable=False, index=True)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    price_per_night = db.Column(db.Float, nullable=False)
    total_rooms = db.Column(db.Integer, nullable=False, default=10)
    rating = db.Column(db.Float, default=4.5)
    amenities = db.Column(db.Text, default='[]')  # JSON array string
    image_url = db.Column(db.String(500), nullable=True)
    description = db.Column(db.Text, nullable=True)
    created_by_admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    # Relationships
    bookings = db.relationship('Booking', backref='hotel', lazy=True, cascade='all, delete-orphan')

    def get_amenities_list(self):
        try:
            return json.loads(self.amenities) if self.amenities else []
        except Exception:
            return [a.strip() for a in self.amenities.split(',')] if self.amenities else []

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'city': self.city,
            'lat': self.lat,
            'lng': self.lng,
            'price_per_night': self.price_per_night,
            'total_rooms': self.total_rooms,
            'rating': self.rating,
            'amenities': self.get_amenities_list(),
            'image_url': self.image_url,
            'description': self.description,
            'created_by_admin_id': self.created_by_admin_id
        }
