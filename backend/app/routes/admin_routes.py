from flask import Blueprint, request, jsonify
from app.models import db, User, Material, Lesson, Progress
import os
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/lessons/<int:material_id>", methods=["GET"])
def get_lessons(material_id):
    try:
        lessons = Lesson.query.filter_by(material_id=material_id).all()
        lesson_list = [
            {"id": lesson.id, "title": lesson.title, "description": lesson.description}
            for lesson in lessons
        ]
        return jsonify(lesson_list)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/lesson/<int:lesson_id>", methods=["GET"])
def get_lesson(lesson_id):
    try:
        lesson = Lesson.query.get(lesson_id)
        if not lesson:
            return jsonify({"error": "Lesson not found"}), 404

        return jsonify(
            {"id": lesson.id, "title": lesson.title, "description": lesson.description}
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/lesson/<int:lesson_id>", methods=["PUT"])
def update_lesson(lesson_id):
    try:
        data = request.json
        lesson = Lesson.query.get(lesson_id)
        if not lesson:
            return jsonify({"error": "Lesson not found"}), 404

        lesson.title = data.get("title", lesson.title)
        lesson.description = data.get("description", lesson.description)
        db.session.commit()

        return jsonify({"message": "Lesson updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/lesson/<int:lesson_id>", methods=["DELETE"])
def delete_lesson(lesson_id):
    try:
        lesson = Lesson.query.get(lesson_id)
        if not lesson:
            return jsonify({"error": "Lesson not found"}), 404

        db.session.delete(lesson)
        db.session.commit()
        return jsonify({"message": "Lesson deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/user", methods=["GET"])
def get_users():
    try:
        users = User.query.all()
        user_list = [
            {"id": user.id, "name": user.name, "email": user.email, "role": user.role}
            for user in users
        ]
        return jsonify(user_list)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/material", methods=["GET"])
def get_materials():
    try:
        materials = Material.query.all()
        material_list = [
            {
                "id": material.id,
                "title": material.title,
                "description": material.description,
            }
            for material in materials
        ]
        return jsonify(material_list)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/user", methods=["POST"])
def create_user():
    data = request.json
    try:
        hashed_password = generate_password_hash(data["password"], method="sha256")
        user = User(
            name=data["name"],
            email=data["email"],
            password=hashed_password,
            role=data["role"],
        )
        db.session.add(user)
        db.session.commit()
        return jsonify({"message": "User created successfully", "user_id": user.id})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@admin_bp.route("/material", methods=["POST"])
def create_material():
    data = request.json
    material = Material(title=data["title"], description=data["description"])
    db.session.add(material)
    db.session.commit()
    return jsonify(
        {"message": "Material created successfully", "material_id": material.id}
    )


@admin_bp.route("/lesson", methods=["POST"])
def create_lesson():
    data = request.json
    lesson = Lesson(
        material_id=data["material_id"],
        title=data["title"],
        description=data["description"],
    )
    db.session.add(lesson)
    db.session.commit()
    return jsonify({"message": "Lesson created successfully", "lesson_id": lesson.id})


@admin_bp.route("/user/assign_material", methods=["POST"])
def assign_material():
    data = request.json
    user = User.query.get(data["user_id"])
    material = Material.query.get(data["material_id"])
    if not user or not material:
        return jsonify({"message": "User or Material not found"}), 404

    for lesson in material.lessons:
        progress = Progress(user_id=user.id, lesson_id=lesson.id, status="not_started")
        db.session.add(progress)
    db.session.commit()
    return jsonify({"message": "Material assigned successfully"})
