from flask import Blueprint, jsonify, request
from app.models import Course, Material, Lesson, Problem

routes = Blueprint("routes", __name__)


@routes.route("/")
def home():
    return jsonify({"message": "Backend is running!"})

@routes.route("/health")
def health_check():
    return jsonify({"status": "OK"})

@routes.route("/courses", methods=["GET"])
def get_courses():
    courses = Course.query.all()
    return jsonify([{"id": course.id, "title": course.title} for course in courses])


@routes.route("/courses/<int:course_id>/materials", methods=["GET"])
def get_materials(course_id):
    materials = Material.query.filter_by(course_id=course_id).all()
    return jsonify([{"id": m.id, "title": m.title} for m in materials])


@routes.route("/materials/<int:material_id>/lessons", methods=["GET"])
def get_lessons(material_id):
    lessons = Lesson.query.filter_by(material_id=material_id).all()
    return jsonify([{"id": l.id, "title": l.title} for l in lessons])


@routes.route("/lessons/<int:lesson_id>", methods=["GET"])
def get_lesson_detail(lesson_id):
    lesson = Lesson.query.get_or_404(lesson_id)
    problems = Problem.query.filter_by(lesson_id=lesson_id).all()
    return jsonify(
        {
            "id": lesson.id,
            "title": lesson.title,
            "problems": [{"id": p.id, "text": p.problem_text} for p in problems],
        }
    )


@routes.route("/lessons/<int:lesson_id>/problems", methods=["GET"])
def get_problems(lesson_id):
    problems = Problem.query.filter_by(lesson_id=lesson_id).all()
    return jsonify([{"id": p.id, "text": p.problem_text} for p in problems])


@routes.route("/problems/<int:problem_id>/submit", methods=["POST"])
def submit_problem(problem_id):
    data = request.get_json()
    user_answer = data.get("answer")
    problem = Problem.query.get_or_404(problem_id)

    is_correct = problem.correct_answer == user_answer

    return jsonify({"problem_id": problem_id, "is_correct": is_correct})


@routes.route("/problems/<int:problem_id>/result", methods=["GET"])
def get_problem_result(problem_id):
    problem = Problem.query.get_or_404(problem_id)
    return jsonify({"id": problem.id, "correct_answer": problem.correct_answer})
