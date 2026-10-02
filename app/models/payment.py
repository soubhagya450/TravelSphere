from datetime import datetime, timezone
from app.extensions import db

class Payment(db.Model):
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id', ondelete='CASCADE'), nullable=False, unique=True)
    gateway_order_id = db.Column(db.String(100), nullable=False, unique=True)
    gateway_payment_id = db.Column(db.String(100), nullable=True)
    payment_method = db.Column(db.String(50), default='card')  # 'card', 'upi', 'netbanking'
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='INR')
    status = db.Column(db.String(20), default='created', nullable=False)  # 'created', 'success', 'failed', 'refunded'
    signature = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'booking_id': self.booking_id,
            'gateway_order_id': self.gateway_order_id,
            'gateway_payment_id': self.gateway_payment_id,
            'payment_method': self.payment_method,
            'amount': round(self.amount, 2),
            'currency': self.currency,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
