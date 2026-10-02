import pytest
from app import create_app
from app.extensions import db

@pytest.fixture
def client():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()

def test_geocode_and_reverse_geocode(client):
    # 1. Forward Geocoding test
    geo_res = client.post('/api/location/geocode', json={'address': 'Mumbai'})
    assert geo_res.status_code == 200
    geo_data = geo_res.get_json()['data']
    assert 'lat' in geo_data
    assert 'lng' in geo_data
    assert geo_data['lat'] == 18.9220

    # 2. Reverse Geocoding test
    rev_res = client.post('/api/location/reverse', json={'lat': 18.9220, 'lng': 72.8347})
    assert rev_res.status_code == 200
    rev_data = rev_res.get_json()['data']
    assert rev_data['lat'] == 18.9220
    assert rev_data['lng'] == 72.8347
    assert 'short_address' in rev_data
    assert 'display_name' in rev_data

def test_reverse_geocode_missing_params(client):
    res = client.post('/api/location/reverse', json={})
    assert res.status_code == 400
    assert 'required' in res.get_json()['error']
