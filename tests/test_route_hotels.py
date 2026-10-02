import pytest
from app import create_app
from app.extensions import db
from app.models.hotel import Hotel

@pytest.fixture
def client():
    app = create_app('testing')
    with app.app_context():
        db.create_all()

        # Seed test hotels
        h1 = Hotel(name='Taj Mumbai', address='Colaba', city='Mumbai', lat=18.9220, lng=72.8347, price_per_night=10000)
        h2 = Hotel(name='Taj Goa', address='Candolim', city='Goa', lat=15.4989, lng=73.7689, price_per_night=12000)
        h3 = Hotel(name='Rambagh Jaipur', address='Jaipur', city='Jaipur', lat=26.8979, lng=75.8080, price_per_night=15000)
        db.session.add_all([h1, h2, h3])
        db.session.commit()

        yield app.test_client()

        db.session.remove()
        db.drop_all()

def test_hotels_nearby_route(client):
    # Route from Mumbai to Goa
    payload = {
        'origin_lat': 18.9220,
        'origin_lng': 72.8347,
        'dest_lat': 15.4989,
        'dest_lng': 73.7689,
        'max_dist_km': 100
    }
    res = client.post('/api/hotels/nearby-route', json=payload)
    assert res.status_code == 200
    hotels = res.get_json()['hotels']
    assert len(hotels) >= 2
    # Ensure distance_to_route_km is included
    assert 'distance_to_route_km' in hotels[0]
