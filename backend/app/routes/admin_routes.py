from flask import Blueprint, request, jsonify
from app.models import db, User

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/user', methods=['POST'])
def create_user():
    data = request.json
    user = User(name=data['name'], email=data['email'], password=data['password'])
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "User created successfully", "user_id": user.id})
