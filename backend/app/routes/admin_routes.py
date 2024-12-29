from flask import Blueprint, request, jsonify
from app.models import db, User, Material, Lesson
import os
from werkzeug.utils import secure_filename

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/user', methods=['POST'])
def create_user():
    data = request.json
    user = User(name=data['name'], email=data['email'], password=data['password'], role=data['role'])
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "User created successfully", "user_id": user.id})

@admin_bp.route('/material', methods=['POST'])
def create_material():
    data = request.json
    material = Material(title=data['title'], description=data['description'])
    db.session.add(material)
    db.session.commit()
    return jsonify({"message": "Material created successfully", "material_id": material.id})

@admin_bp.route('/lesson', methods=['POST'])
def create_lesson():
    data = request.json
    lesson = Lesson(material_id=data['material_id'], title=data['title'], description=data['description'])
    db.session.add(lesson)
    db.session.commit()
    return jsonify({"message": "Lesson created successfully", "lesson_id": lesson.id})


UPLOAD_FOLDER = './uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

admin_bp = Blueprint('admin', __name__)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@admin_bp.route('/upload-image', methods=['POST'])
def upload_image():
    if 'file' not in request.files:
        return jsonify({"success": 0, "message": "No file provided"}), 400

    file = request.files['file']
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        return jsonify({"success": 1, "file": {"url": f"/uploads/{filename}"}})
    else:
        return jsonify({"success": 0, "message": "Invalid file type"}), 400
