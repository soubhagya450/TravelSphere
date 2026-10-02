import requests

base = 'http://127.0.0.1:5000'

def test_full_system():
    # 1. Test index page
    r = requests.get(f'{base}/')
    assert r.status_code == 200, f'Index failed: {r.status_code}'
    assert 'TravelSphere' in r.text
    print('1. GET / returned 200 with landing page HTML')

    # 2. Test static pages
    pages = [
        'dashboard.html', 'hotels.html', 'hotel-detail.html',
        'payment.html', 'my-bookings.html', 'admin.html',
        'login.html', 'register.html', 'css/style.css',
        'js/api.js', 'js/map.js'
    ]
    for page in pages:
        r = requests.get(f'{base}/{page}')
        assert r.status_code == 200, f'Page {page} returned {r.status_code}'
    print('2. All 11 static HTML/CSS/JS pages returned 200 OK')

    # 3. Test hotels listing API
    r = requests.get(f'{base}/api/hotels')
    assert r.status_code == 200
    data = r.json()
    count = data['count']
    assert count >= 8
    print(f'3. GET /api/hotels returned {count} seeded hotels')

    # 4. Test geocoding API
    r = requests.post(f'{base}/api/location/geocode', json={'address': 'Mumbai'})
    assert r.status_code == 200
    g = r.json()['data']
    print(f'4. POST /api/location/geocode returned: {g["lat"]}, {g["lng"]}')

    # 5. Test login API
    r = requests.post(f'{base}/api/auth/login', json={'email': 'user@travel.com', 'password': 'User@1234'})
    assert r.status_code == 200
    token = r.json()['data']['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    print('5. POST /api/auth/login successful, JWT token acquired')

    # 6. Test booking availability check
    r = requests.post(f'{base}/api/bookings/check-availability', json={
        'hotel_id': 1,
        'check_in': '2026-10-01',
        'check_out': '2026-10-04',
        'rooms': 1
    })
    assert r.status_code == 200
    b_avail = r.json()
    assert b_avail['available'] is True
    print(f'6. POST /api/bookings/check-availability: available={b_avail["available"]}, total={b_avail["estimated_total"]}')

    # 7. Test create booking
    r = requests.post(f'{base}/api/bookings', headers=headers, json={
        'hotel_id': 1,
        'check_in': '2026-10-01',
        'check_out': '2026-10-04',
        'rooms': 1,
        'guest_name': 'Live Verification Guest',
        'guest_email': 'user@travel.com',
        'guest_phone': '9876543210'
    })
    assert r.status_code == 201
    booking = r.json()['booking']
    booking_id = booking['id']
    print(f'7. POST /api/bookings created booking #{booking_id}')

    # 8. Test payment create-order and verify
    r = requests.post(f'{base}/api/payments/create-order', headers=headers, json={'booking_id': booking_id})
    assert r.status_code == 200
    order = r.json()['order']
    print(f'8. POST /api/payments/create-order created order: {order["order_id"]}')

    r = requests.post(f'{base}/api/payments/verify', headers=headers, json={
        'order_id': order['order_id'],
        'payment_id': 'pay_live_test_123',
        'signature': 'mock_sig_valid',
        'payment_method': 'card'
    })
    assert r.status_code == 200
    confirmed = r.json()['booking']
    assert confirmed['status'] == 'confirmed'
    print('9. POST /api/payments/verify verified payment and confirmed booking')

    # 9. Test invoice receipt
    r = requests.get(f'{base}/api/payments/receipt/{booking_id}', headers=headers)
    assert r.status_code == 200
    receipt = r.json()['receipt']
    print(f'10. GET /api/payments/receipt/{booking_id} returned invoice: {receipt["invoice_number"]}')

    # 10. Test admin endpoint
    r_admin_login = requests.post(f'{base}/api/auth/login', json={'email': 'admin@travel.com', 'password': 'Admin@1234'})
    admin_token = r_admin_login.json()['data']['access_token']
    admin_headers = {'Authorization': f'Bearer {admin_token}'}
    r_admin_bookings = requests.get(f'{base}/api/bookings/all', headers=admin_headers)
    assert r_admin_bookings.status_code == 200
    print(f'11. Admin GET /api/bookings/all returned {r_admin_bookings.json()["count"]} bookings')

    print('\n========================================')
    print('ALL 11 END-TO-END SYSTEM TESTS PASSED!')
    print('========================================')

if __name__ == '__main__':
    test_full_system()
