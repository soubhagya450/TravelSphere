from flask import Blueprint, request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app.extensions import db
from app.models.user import User
from app.services.chatbot_service import ChatbotService

chatbot_bp = Blueprint('chatbot', __name__, url_prefix='/api/chat')

def get_optional_current_user():
    """Extracts user information if JWT is present in request, otherwise returns None."""
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id:
            user = db.session.get(User, int(user_id))
            if user:
                return {'id': user.id, 'name': user.name, 'email': user.email}
    except Exception:
        pass
    return None

@chatbot_bp.route('', methods=['POST'])
def handle_chat():
    """
    POST /api/chat
    Payload: { "message": "...", "history": [...] }
    """
    data = request.get_json() or {}
    message = (data.get('message') or '').strip()

    if not message:
        return jsonify({'error': 'Message content cannot be empty'}), 400

    if len(message) > 1000:
        return jsonify({'error': 'Message exceeds maximum length of 1000 characters'}), 400

    history = data.get('history', [])
    user_info = get_optional_current_user()

    try:
        result = ChatbotService.chat(message=message, history=history, user_info=user_info)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({
            'error': 'Failed to process chat with AI service',
            'details': str(e)
        }), 500

@chatbot_bp.route('/suggestions', methods=['GET'])
def get_suggestions():
    """
    GET /api/chat/suggestions
    Returns predefined quick prompt chips.
    """
    suggestions = ChatbotService.get_suggestions()
    return jsonify({'suggestions': suggestions}), 200
