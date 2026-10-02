import re
from datetime import datetime, date

def validate_email(email):
    if not email:
        return False, "Email is required"
    pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    if not re.match(pattern, email.strip()):
        return False, "Invalid email address format"
    return True, None

def validate_password(password):
    if not password:
        return False, "Password is required"
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not any(c.isupper() or c.isdigit() for c in password):
        return False, "Password must contain at least one number or uppercase letter"
    return True, None

def validate_booking_dates(check_in_str, check_out_str):
    try:
        if isinstance(check_in_str, str):
            check_in = datetime.strptime(check_in_str, '%Y-%m-%d').date()
        else:
            check_in = check_in_str
            
        if isinstance(check_out_str, str):
            check_out = datetime.strptime(check_out_str, '%Y-%m-%d').date()
        else:
            check_out = check_out_str
    except Exception:
        return False, "Invalid date format. Use YYYY-MM-DD", None, None

    today = date.today()
    if check_in < today:
        return False, "Check-in date cannot be in the past", None, None
    if check_out <= check_in:
        return False, "Check-out date must be after check-in date", None, None
        
    nights = (check_out - check_in).days
    return True, None, check_in, check_out
