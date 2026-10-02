from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app.extensions import db
from app.models.user import User

def user_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            try:
                verify_jwt_in_request()
                user_id = get_jwt_identity()
                user = db.session.get(User, int(user_id))
                if not user:
                    return jsonify({'error': 'User not found or session invalid'}), 401
                return fn(*args, current_user=user, **kwargs)
            except Exception as e:
                return jsonify({'error': 'Authentication required', 'message': str(e)}), 401
        return decorator
    return wrapper

def admin_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            try:
                verify_jwt_in_request()
                user_id = get_jwt_identity()
                user = db.session.get(User, int(user_id))
                if not user or user.role != 'admin':
                    return jsonify({'error': 'Admin privileges required'}), 403
                return fn(*args, current_user=user, **kwargs)
            except Exception as e:
                return jsonify({'error': 'Authentication required', 'message': str(e)}), 401
        return decorator
    return wrapper
