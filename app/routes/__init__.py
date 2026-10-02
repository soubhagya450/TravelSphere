from app.routes.auth_routes import auth_bp
from app.routes.location_routes import location_bp
from app.routes.hotel_routes import hotel_bp
from app.routes.booking_routes import booking_bp
from app.routes.payment_routes import payment_bp
from app.routes.chatbot_routes import chatbot_bp

__all__ = ['auth_bp', 'location_bp', 'hotel_bp', 'booking_bp', 'payment_bp', 'chatbot_bp']

