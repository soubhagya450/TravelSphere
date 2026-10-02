import pytest
from app import create_app
from app.extensions import db
from app.models.user import User

@pytest.fixture
def client():
    app = create_app('testing')
    with app.app_context():
        db.create_all()

        # Create Admin
        admin = User(name='Admin User', email='admin@test.com', password_hash='hash', role='admin')
        # Create Normal User
        user = User(name='Normal User', email='user@test.com', password_hash='hash', role='user')
        db.session.add_all([admin, user])
        db.session.commit()

        yield app.test_client()

        db.session.remove()
        db.drop_all()

def get_admin_token(client):
    res = client.post('/api/auth/login', json={'email': 'admin@test.com', 'password': 'hash'})
    # In testing environment we can bypass or use direct token generation if needed, or register properly
    pass

def test_admin_user_management(client):
    # Register Admin & User through auth route for real JWT
    client.post('/api/auth/register', json={
        'name': 'Real Admin', 'email': 'realadmin@test.com', 'password': 'AdminPassword@123', 'role': 'admin'
    })
    client.post('/api/auth/register', json={
        'name': 'Real Traveler', 'email': 'realtraveler@test.com', 'password': 'UserPassword@123', 'role': 'user'
    })

    # Login Admin
    admin_login = client.post('/api/auth/login', json={
        'email': 'realadmin@test.com', 'password': 'AdminPassword@123'
    })
    admin_token = admin_login.get_json()['data']['access_token']
    admin_headers = {'Authorization': f'Bearer {admin_token}'}

    # Login User
    user_login = client.post('/api/auth/login', json={
        'email': 'realtraveler@test.com', 'password': 'UserPassword@123'
    })
    user_token = user_login.get_json()['data']['access_token']
    user_headers = {'Authorization': f'Bearer {user_token}'}

    # 1. Admin gets all users
    res_list = client.get('/api/auth/users', headers=admin_headers)
    assert res_list.status_code == 200
    assert len(res_list.get_json()['users']) >= 2

    # 2. Non-admin gets rejected
    res_unauth = client.get('/api/auth/users', headers=user_headers)
    assert res_unauth.status_code == 403

    # 3. Admin creates new user
    res_create = client.post('/api/auth/users', headers=admin_headers, json={
        'name': 'New Staff', 'email': 'staff@test.com', 'password': 'StaffPassword@123', 'role': 'admin'
    })
    assert res_create.status_code == 201
    created_id = res_create.get_json()['data']['user']['id']

    # 4. Admin updates user role
    res_role = client.put(f'/api/auth/users/{created_id}/role', headers=admin_headers, json={'role': 'user'})
    assert res_role.status_code == 200
    assert res_role.get_json()['user']['role'] == 'user'

    # 5. Admin deletes user
    res_del = client.delete(f'/api/auth/users/{created_id}', headers=admin_headers)
    assert res_del.status_code == 200
