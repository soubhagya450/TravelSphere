from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.user import User
from app.services.auth_service import AuthService
from app.utils.security import user_required, admin_required
from app.utils.validators import validate_email, validate_password

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    phone = data.get('phone', '').strip()
    role = data.get('role', 'user')

    if not name:
        return jsonify({'error': 'Name is required'}), 400
    
    valid_email, err_email = validate_email(email)
    if not valid_email:
        return jsonify({'error': err_email}), 400

    valid_pw, err_pw = validate_password(password)
    if not valid_pw:
        return jsonify({'error': err_pw}), 400

    res, err = AuthService.register_user(name, email, password, phone, role)
    if err:
        return jsonify({'error': err}), 400

    return jsonify({
        'message': 'User registered successfully',
        'data': res
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    res, err = AuthService.login_user(email, password)
    if err:
        return jsonify({'error': err}), 401

    return jsonify({
        'message': 'Login successful',
        'data': res
    }), 200

@auth_bp.route('/me', methods=['GET'])
@user_required()
def me(current_user):
    return jsonify({
        'user': current_user.to_dict()
    }), 200

@auth_bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({'message': 'Logged out successfully'}), 200

# ----------------------------------------------------
# ADMIN USER MANAGEMENT ENDPOINTS
# ----------------------------------------------------

@auth_bp.route('/users', methods=['GET'])
@admin_required()
def get_all_users(current_user):
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({
        'count': len(users),
        'users': [u.to_dict() for u in users]
    }), 200

@auth_bp.route('/users', methods=['POST'])
@admin_required()
def admin_create_user(current_user):
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    phone = data.get('phone', '').strip()
    role = data.get('role', 'user').lower()

    if role not in ['user', 'admin']:
        return jsonify({'error': 'Invalid role specified. Must be user or admin'}), 400

    if not name:
        return jsonify({'error': 'Name is required'}), 400

    valid_email, err_email = validate_email(email)
    if not valid_email:
        return jsonify({'error': err_email}), 400

    valid_pw, err_pw = validate_password(password)
    if not valid_pw:
        return jsonify({'error': err_pw}), 400

    res, err = AuthService.register_user(name, email, password, phone, role)
    if err:
        return jsonify({'error': err}), 400

    return jsonify({
        'message': f'Account ({role}) created successfully by admin',
        'data': res
    }), 201

@auth_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@admin_required()
def update_user_role(current_user, user_id):
    target_user = db.session.get(User, user_id)
    if not target_user:
        return jsonify({'error': 'User not found'}), 404

    if target_user.id == current_user.id:
        return jsonify({'error': 'You cannot change your own admin role'}), 400

    data = request.get_json() or {}
    new_role = data.get('role', '').strip().lower()
    if new_role not in ['user', 'admin']:
        return jsonify({'error': 'Role must be user or admin'}), 400

    target_user.role = new_role
    db.session.commit()

    return jsonify({
        'message': f'User role updated to {new_role}',
        'user': target_user.to_dict()
    }), 200

@auth_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required()
def delete_user(current_user, user_id):
    target_user = db.session.get(User, user_id)
    if not target_user:
        return jsonify({'error': 'User not found'}), 404

    if target_user.id == current_user.id:
        return jsonify({'error': 'You cannot delete your own admin account'}), 400

    db.session.delete(target_user)
    db.session.commit()

    return jsonify({
        'message': 'User account deleted successfully'
    }), 200

