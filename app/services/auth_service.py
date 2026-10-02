from flask_jwt_extended import create_access_token
from app.extensions import bcrypt, db
from app.models.user import User

class AuthService:
    @staticmethod
    def register_user(name, email, password, phone='', role='user'):
        email = email.strip().lower()
        if User.query.filter_by(email=email).first():
            return None, "An account with this email already exists"

        hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
        user = User(
            name=name.strip(),
            email=email,
            password_hash=hashed_pw,
            phone=phone.strip() if phone else '',
            role=role if role in ['user', 'admin'] else 'user'
        )
        db.session.add(user)
        db.session.commit()
        
        token = create_access_token(identity=str(user.id))
        return {'user': user.to_dict(), 'access_token': token}, None

    @staticmethod
    def login_user(email, password):
        email = email.strip().lower()
        user = User.query.filter_by(email=email).first()
        if not user or not bcrypt.check_password_hash(user.password_hash, password):
            return None, "Invalid email or password"

        token = create_access_token(identity=str(user.id))
        return {'user': user.to_dict(), 'access_token': token}, None
