from datetime import datetime, timezone
from app.extensions import db

class Booking(db.Model):
    __tablename__ = 'bookings'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    hotel_id = db.Column(db.Integer, db.ForeignKey('hotels.id', ondelete='CASCADE'), nullable=False)
    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id', ondelete='SET NULL'), nullable=True)
    check_in = db.Column(db.Date, nullable=False)
    check_out = db.Column(db.Date, nullable=False)
    rooms_booked = db.Column(db.Integer, nullable=False, default=1)
    total_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pending', nullable=False)  # 'pending', 'confirmed', 'cancelled'
    guest_name = db.Column(db.String(100), nullable=True)
    guest_email = db.Column(db.String(150), nullable=True)
    guest_phone = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    payment = db.relationship('Payment', backref='booking', uselist=False, cascade='all, delete-orphan')

    def to_dict(self):
        nights = (self.check_out - self.check_in).days if self.check_out and self.check_in else 1
        return {
            'id': self.id,
            'user_id': self.user_id,
            'hotel_id': self.hotel_id,
            'trip_id': self.trip_id,
            'check_in': self.check_in.strftime('%Y-%m-%d') if self.check_in else None,
            'check_out': self.check_out.strftime('%Y-%m-%d') if self.check_out else None,
            'nights': nights,
            'rooms_booked': self.rooms_booked,
            'total_amount': round(self.total_amount, 2),
            'status': self.status,
            'guest_name': self.guest_name,
            'guest_email': self.guest_email,
            'guest_phone': self.guest_phone,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'hotel': self.hotel.to_dict() if self.hotel else None,
            'payment': self.payment.to_dict() if self.payment else None
        }
