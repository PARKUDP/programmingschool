from flask import Blueprint, request, jsonify
from app.models import db, Material

material_bp = Blueprint('material', __name__)

@material_bp.route('/material', methods=['POST'])
def create_material():
    data = request.json
    material = Material(title=data.get('title'), description=data.get('content'))
    db.session.add(material)
    db.session.commit()
    return jsonify({'message': '教材が作成されました', 'material_id': material.id})
