import requests

FALLBACK_COORDINATES = {
    'mumbai': {'lat': 18.9220, 'lng': 72.8347, 'display_name': 'Mumbai, Maharashtra, India'},
    'delhi': {'lat': 28.6139, 'lng': 77.2090, 'display_name': 'New Delhi, Delhi, India'},
    'new delhi': {'lat': 28.6139, 'lng': 77.2090, 'display_name': 'New Delhi, Delhi, India'},
    'goa': {'lat': 15.2993, 'lng': 74.1240, 'display_name': 'Goa, India'},
    'bengaluru': {'lat': 12.9716, 'lng': 77.5946, 'display_name': 'Bengaluru, Karnataka, India'},
    'bangalore': {'lat': 12.9716, 'lng': 77.5946, 'display_name': 'Bengaluru, Karnataka, India'},
    'jaipur': {'lat': 26.9124, 'lng': 75.7873, 'display_name': 'Jaipur, Rajasthan, India'},
    'paris': {'lat': 48.8566, 'lng': 2.3522, 'display_name': 'Paris, France'},
    'london': {'lat': 51.5074, 'lng': -0.1278, 'display_name': 'London, United Kingdom'},
    'new york': {'lat': 40.7128, 'lng': -74.0060, 'display_name': 'New York, USA'},
    'dubai': {'lat': 25.2048, 'lng': 55.2708, 'display_name': 'Dubai, UAE'},
    'tokyo': {'lat': 35.6762, 'lng': 139.6503, 'display_name': 'Tokyo, Japan'}
}

class GeocodingService:
    @staticmethod
    def geocode(address):
        if not address:
            return None, "Address is required"

        clean_addr = address.strip().lower()
        # Direct fallback match
        for city, coords in FALLBACK_COORDINATES.items():
            if city in clean_addr:
                return {
                    'lat': coords['lat'],
                    'lng': coords['lng'],
                    'display_name': coords['display_name']
                }, None

        # Call OpenStreetMap Nominatim
        try:
            url = f"https://nominatim.openstreetmap.org/search?q={requests.utils.quote(address)}&format=json&limit=1"
            headers = {'User-Agent': 'RealTimeTravelBookingApp/1.0'}
            resp = requests.get(url, headers=headers, timeout=4)
            if resp.status_code == 200:
                data = resp.json()
                if data and len(data) > 0:
                    return {
                        'lat': float(data[0]['lat']),
                        'lng': float(data[0]['lon']),
                        'display_name': data[0].get('display_name', address)
                    }, None
        except Exception:
            pass

        # Fallback to default coordinates if remote fails
        return {
            'lat': 18.9220,
            'lng': 72.8347,
            'display_name': f"{address} (approximate)"
        }, None

    @staticmethod
    def reverse_geocode(lat, lng):
        try:
            lat = float(lat)
            lng = float(lng)
        except (ValueError, TypeError):
            return None, "Invalid latitude or longitude coordinates"

        # Try Nominatim reverse geocoding
        try:
            url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json&addressdetails=1"
            headers = {'User-Agent': 'RealTimeTravelBookingApp/1.0'}
            resp = requests.get(url, headers=headers, timeout=4)
            if resp.status_code == 200:
                data = resp.json()
                if data:
                    addr = data.get('address', {})
                    road = addr.get('road') or addr.get('pedestrian') or addr.get('street') or ''
                    suburb = addr.get('suburb') or addr.get('neighbourhood') or addr.get('residential') or ''
                    city = addr.get('city') or addr.get('town') or addr.get('village') or addr.get('county') or ''
                    state = addr.get('state') or ''
                    country = addr.get('country') or ''
                    postcode = addr.get('postcode') or ''

                    details = {
                        'lat': lat,
                        'lng': lng,
                        'display_name': data.get('display_name', f"Location ({lat:.5f}, {lng:.5f})"),
                        'road': road,
                        'suburb': suburb,
                        'city': city,
                        'state': state,
                        'country': country,
                        'postcode': postcode,
                        'short_address': f"{road}, {suburb}, {city}".strip(', ') or city or f"Pinned Point ({lat:.4f}, {lng:.4f})"
                    }
                    return details, None
        except Exception as e:
            pass

        # Fallback formatted result
        return {
            'lat': lat,
            'lng': lng,
            'display_name': f"Pinned Position ({lat:.5f}, {lng:.5f})",
            'road': '',
            'suburb': '',
            'city': 'Selected Coordinates',
            'state': '',
            'country': '',
            'postcode': '',
            'short_address': f"Location Pin ({lat:.4f}, {lng:.4f})"
        }, None

