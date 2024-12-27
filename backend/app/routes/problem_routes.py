from flask import Blueprint, request, jsonify
from app.models import Problem

problem_bp = Blueprint('problem', __name__)

@problem_bp.route('/<int:problem_id>/submit', methods=['POST'])
def submit_solution(problem_id):
    data = request.json
    code = data['code']
    problem = Problem.query.get(problem_id)
    if code == problem.expected_output:
        return jsonify({"result": "correct"})
    return jsonify({"result": "incorrect"})
