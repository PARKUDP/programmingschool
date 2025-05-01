from app import create_app
from models import db, User
from werkzeug.security import generate_password_hash

app = create_app()

with app.app_context():
    db.create_all()

    existing_admin = User.query.filter_by(username="admin").first()
    if existing_admin:
        print("Admin user already exists. Updating password.")
        existing_admin.password_hash = generate_password_hash("admin", method="pbkdf2:sha256")
        existing_admin.is_admin = True
    else:
        print("Creating new admin user.")
        admin = User(
            username="admin",
            password_hash=generate_password_hash("admin", method="pbkdf2:sha256"),
            is_admin=True
        )
        db.session.add(admin)

    db.session.commit()
    print("Admin user setup complete.")
