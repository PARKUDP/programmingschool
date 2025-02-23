from app import db
from app.models import Course, Material, Lesson, Problem


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
    course = Course.query.first()
    material = Material(title="データ型と変数", course_id=course.id)
    db.session.add(material)
    db.session.commit()

    assert Material.query.count() == 1
    assert Material.query.first().course_id == course.id


def test_create_lesson(test_client):
    """Lesson テーブルにデータを追加し、リレーションが機能するか確認"""
    material = Material.query.first()
    lesson = Lesson(title="整数と浮動小数点", material_id=material.id)
    db.session.add(lesson)
    db.session.commit()

    assert Lesson.query.count() == 1
    assert Lesson.query.first().material_id == material.id


def test_create_problem(test_client):
    """Problem テーブルにデータを追加し、リレーションが機能するか確認"""
    lesson = Lesson.query.first()
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
