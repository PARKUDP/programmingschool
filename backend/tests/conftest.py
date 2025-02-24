import pytest
from app import create_app, db


@pytest.fixture(scope="module")
def test_client():
    """Flask test client setup"""
    app = create_app()

    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    with app.app_context():
        db.create_all()

    with app.test_client() as testing_client:
        yield testing_client

    with app.app_context():
        db.session.remove()
        db.drop_all()
