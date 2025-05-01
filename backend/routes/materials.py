from flask import Blueprint, request, jsonify
from models import db, Material

materials_bp = Blueprint('materials', __name__)

# 教材一覧取得
@materials_bp.route('/materials', methods=['GET'])
def list_materials():
    materials = Material.query.all()
    return jsonify([{'id': m.id, 'title': m.title} for m in materials])

# 教材作成
@materials_bp.route('/materials', methods=['POST'])
def create_material():
    data = request.get_json()
    title = data.get('title')
    if not title:
        return jsonify({'error': 'Title required'}), 400
    material = Material(title=title)
    db.session.add(material)
    db.session.commit()
    return jsonify({'message': 'Created', 'material_id': material.id})
