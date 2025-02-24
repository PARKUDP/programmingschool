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

    with app.test_client() as testing_client:
        with app.app_context():
            db.create_all()  # データベースを初期化
            yield testing_client
            db.session.remove()
            db.drop_all()  # テスト終了後にデータベースを削除


def test_create_course(test_client):
    """Course テーブルにデータを追加するテスト"""
    with test_client.application.app_context():
        course = Course(title="Python入門")
        db.session.add(course)
        db.session.commit()

        assert Course.query.count() == 1
        assert Course.query.first().title == "Python入門"


def test_create_material(test_client):
    """Material テーブルにデータを追加し、リレーションが機能するか確認"""
    with test_client.application.app_context():
        course = Course.query.first()
        assert course is not None, "コースが存在しない"

        material = Material(title="データ型と変数", course_id=course.id)
        db.session.add(material)
        db.session.commit()

        assert Material.query.count() == 1
        assert Material.query.first().course_id == course.id


def test_create_lesson(test_client):
    """Lesson テーブルにデータを追加し、リレーションが機能するか確認"""
    with test_client.application.app_context():
        material = Material.query.first()
        assert material is not None, "教材が存在しない"

        lesson = Lesson(title="整数と浮動小数点", material_id=material.id)
        db.session.add(lesson)
        db.session.commit()

        assert Lesson.query.count() == 1
        assert Lesson.query.first().material_id == material.id


def test_create_problem(test_client):
    """Problem テーブルにデータを追加し、リレーションが機能するか確認"""
    with test_client.application.app_context():
        lesson = Lesson.query.first()
        assert lesson is not None, "レッスンが存在しない"

        problem = Problem(
            lesson_id=lesson.id,
            problem_text="次のコードの出力は？",
            problem_type="code",
            correct_answer="42",
        )
        db.session.add(problem)
        db.session.commit()

        assert Problem.query.count() == 1
        assert Problem.query.first().correct_answer == "42"


def test_home_route(test_client):
    """ホーム画面のレスポンスをテスト"""
    response = test_client.get("/")
    assert response.status_code == 200
    assert b"Backend is running!" in response.data


def test_health_route(test_client):
    """ヘルスチェックのレスポンスをテスト"""
    response = test_client.get("/health")
    assert response.status_code == 200
    assert response.json == {"status": "OK"}
