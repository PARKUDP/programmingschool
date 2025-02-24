import pytest
from app import db, create_app
from app.models import Course, Material, Lesson, Problem


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


def test_create_course(test_client):
    """Course テーブルにデータを追加するテスト"""
    with test_client.application.app_context():
        course = Course(title="Python入門")
        db.session.add(course)
        db.session.commit()

        assert Course.query.count() == 1
        assert Course.query.first().title == "Python入門"
