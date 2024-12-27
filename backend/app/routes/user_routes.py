from flask import Blueprint, jsonify

user_bp = Blueprint('user', __name__)

@user_bp.route('/progress', methods=['GET'])
def get_progress():
    return jsonify({"progress": "User progress data"})
