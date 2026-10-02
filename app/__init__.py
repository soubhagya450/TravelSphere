import os
from flask import Flask, send_from_directory, redirect
from app.config import config_by_name
from app.extensions import db, jwt, bcrypt, cors
from app.routes import auth_bp, location_bp, hotel_bp, booking_bp, payment_bp, chatbot_bp

def create_app(config_name='development'):
    app = Flask(
        __name__,
        static_folder='static',
        static_url_path=''
    )
    
    app.config.from_object(config_by_name.get(config_name, 'development'))

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(location_bp)
    app.register_blueprint(hotel_bp)
    app.register_blueprint(booking_bp)
    app.register_blueprint(payment_bp)
    app.register_blueprint(chatbot_bp)

    # Route for serving static frontend pages
    @app.route('/')
    def index():
        return send_from_directory(app.static_folder, 'index.html')

    @app.route('/<path:filename>')
    def serve_static_page(filename):
        # Serve requested file if it exists in static folder
        filepath = os.path.join(app.static_folder, filename)
        if os.path.isfile(filepath):
            return send_from_directory(app.static_folder, filename)
        # Check if .html can be added
        if os.path.isfile(filepath + '.html'):
            return send_from_directory(app.static_folder, filename + '.html')
        return send_from_directory(app.static_folder, 'index.html')

    return app
