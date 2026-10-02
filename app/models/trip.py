from datetime import datetime, timezone
from app.extensions import db

class Trip(db.Model):
    __tablename__ = 'trips'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    origin_address = db.Column(db.String(255), nullable=False)
    origin_lat = db.Column(db.Float, nullable=False)
    origin_lng = db.Column(db.Float, nullable=False)
    destination_address = db.Column(db.String(255), nullable=False)
    destination_lat = db.Column(db.Float, nullable=False)
    destination_lng = db.Column(db.Float, nullable=False)
    linked_hotel_id = db.Column(db.Integer, db.ForeignKey('hotels.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    linked_hotel = db.relationship('Hotel', backref='linked_trips', foreign_keys=[linked_hotel_id])
    bookings = db.relationship('Booking', backref='trip', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'origin_address': self.origin_address,
            'origin_lat': self.origin_lat,
            'origin_lng': self.origin_lng,
            'destination_address': self.destination_address,
            'destination_lat': self.destination_lat,
            'destination_lng': self.destination_lng,
            'linked_hotel_id': self.linked_hotel_id,
            'linked_hotel': self.linked_hotel.to_dict() if self.linked_hotel else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
