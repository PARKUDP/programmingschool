from flask import Blueprint, request, jsonify
from models import db, Lesson

lessons_bp = Blueprint('lessons', __name__)

@lessons_bp.route('/lessons', methods=['POST'])
def create_lesson():
    data = request.get_json()
    material_id = data.get('material_id')
    title = data.get('title')
    description = data.get('description')

    if not material_id or not title:
        return jsonify({'error': 'material_idとtitleは必須です'}), 400

    lesson = Lesson(
        material_id=material_id,
        title=title,
        description=description
    )
    db.session.add(lesson)
    db.session.commit()

    return jsonify({'message': 'Lesson created.', 'lesson_id': lesson.id}), 201

@lessons_bp.route('/lessons/by_material', methods=['GET'])
def get_lessons_by_material():
    material_id = request.args.get('material_id')
    if not material_id:
        return jsonify({'error': 'material_id is required'}), 400

    lessons = Lesson.query.filter_by(material_id=material_id).all()
    return jsonify([
        {'id': l.id, 'title': l.title, 'description': l.description}
        for l in lessons
    ])

@lessons_bp.route('/lessons', methods=['GET'])
def list_all_lessons():
    lessons = Lesson.query.all()
    return jsonify([{'id': l.id, 'title': l.title} for l in lessons])
