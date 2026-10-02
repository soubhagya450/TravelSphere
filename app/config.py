import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    SECRET_KEY = os.getenv('SECRET_KEY', 'default-dev-secret-travel-2026')
    
    # Database
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        db_path = os.path.join(BASE_DIR, 'travel_booking.db')
        db_url = f'sqlite:///{db_path}'
    
    SQLALCHEMY_DATABASE_URI = db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Connection pool settings — fixes Neon PostgreSQL 'server closed connection unexpectedly'
    # pool_pre_ping validates connections before checkout (drops stale sockets)
    # pool_recycle refreshes connections older than 5 minutes to beat Neon's idle timeout
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'pool_size': 5,
        'max_overflow': 2,
        'connect_args': {
            'keepalives': 1,
            'keepalives_idle': 30,
            'keepalives_interval': 10,
            'keepalives_count': 5,
            'connect_timeout': 10,
        } if (os.getenv('DATABASE_URL') or '').startswith('postgresql') else {}
    }
    
    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default-jwt-secret-travel-2026')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_MINUTES', 180)))
    
    # Payment settings
    PAYMENT_GATEWAY = os.getenv('PAYMENT_GATEWAY', 'razorpay')
    RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID', 'rzp_test_demo1234')
    RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', 'demosecret12345678')
    
    # Map
    MAP_PROVIDER = os.getenv('MAP_PROVIDER', 'leaflet')
    GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', '')

    # Groq AI Chatbot
    GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
    GROQ_MODEL = os.getenv('GROQ_MODEL', 'openai/gpt-oss-120b')
    GROQ_FALLBACK_MODEL = os.getenv('GROQ_FALLBACK_MODEL', 'qwen/qwen3.8-27b')

class DevelopmentConfig(Config):
    DEBUG = True

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False

class ProductionConfig(Config):
    DEBUG = False

config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig
}
