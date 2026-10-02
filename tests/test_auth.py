import pytest
from app import create_app
from app.extensions import db
from app.models.user import User

@pytest.fixture
def client():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()

def test_user_registration_and_login(client):
    # 1. Register a new traveler
    reg_payload = {
        'name': 'Test Traveler',
        'email': 'traveler@test.com',
        'password': 'Password@123',
        'phone': '9876543210',
        'role': 'user'
    }
    res = client.post('/api/auth/register', json=reg_payload)
    assert res.status_code == 201
    data = res.get_json()
    assert 'access_token' in data['data']
    assert data['data']['user']['email'] == 'traveler@test.com'

    # 2. Login with valid credentials
    login_payload = {
        'email': 'traveler@test.com',
        'password': 'Password@123'
    }
    res_login = client.post('/api/auth/login', json=login_payload)
    assert res_login.status_code == 200
    token = res_login.get_json()['data']['access_token']

    # 3. Access protected /me endpoint with JWT
    res_me = client.get('/api/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert res_me.status_code == 200
    assert res_me.get_json()['user']['name'] == 'Test Traveler'

def test_login_invalid_password(client):
    reg_payload = {
        'name': 'User Test',
        'email': 'wrong@test.com',
        'password': 'Password@123'
    }
    client.post('/api/auth/register', json=reg_payload)

    res = client.post('/api/auth/login', json={
        'email': 'wrong@test.com',
        'password': 'WrongPassword99'
    })
    assert res.status_code == 401
    assert 'Invalid' in res.get_json()['error']
