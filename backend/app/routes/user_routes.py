from flask import Blueprint, jsonify, request
from app.models import User, Progress

user_bp = Blueprint('user', __name__)

@user_bp.route('/progress', methods=['GET'])
def get_progress():
    user_id = request.args.get('user_id')
    progress = Progress.query.filter_by(user_id=user_id).all()
    progress_data = [{"lesson_id": p.lesson_id, "status": p.status} for p in progress]
    return jsonify({"progress": progress_data})

@user_bp.route('/auth', methods=['POST'])
def user_auth():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    if user and user.password == data['password']:
        return jsonify({"message": "Authenticated", "role": user.role})
    return jsonify({"message": "Unauthorized"}), 401
