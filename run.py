import os
from app import create_app
from app.extensions import db
from app.utils.seed_data import seed_database

env = os.getenv('FLASK_ENV', 'development')
app = create_app(env)

if __name__ == '__main__':
    with app.app_context():
        # Ensure database tables exist and seed initial demo data
        # Wrapped in try/except so a transient DB connection error doesn't
        # crash startup — the app can still run and retry on first request.
        try:
            db.create_all()
            seed_database()
            db_status = "Tables checked and seeded"
        except Exception as db_err:
            db_status = f"Warning: DB init skipped ({db_err.__class__.__name__}: {str(db_err)[:80]})"
            print(f"\n[WARN] Database startup error: {db_err}")
            print("[WARN] The server will still start. Retry connecting once DB is reachable.\n")

        print("\n" + "=" * 60)
        print("  TRAVEL & HOTEL BOOKING PLATFORM")
        print("  Status   : Operational")
        print(f"  Database : {db_status}")
        print("  Demo Logins:")
        print("    Admin : admin@travel.com / Admin@1234")
        print("    User  : user@travel.com  / User@1234")
        print("  Server   : http://127.0.0.1:5000")
        print("=" * 60 + "\n")

    app.run(host='127.0.0.1', port=5000, debug=True)
