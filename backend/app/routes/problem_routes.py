from flask import Blueprint, request, jsonify
from app.models import db, Problem, Submission
import subprocess

problem_bp = Blueprint('problem', __name__)

@problem_bp.route('/<int:problem_id>/submit', methods=['POST'])
def submit_solution(problem_id):
    data = request.json
    code = data['code']
    problem = Problem.query.get(problem_id)

    if not problem:
        return jsonify({"error": "Problem not found"}), 404

    try:
        result = subprocess.run(
            ['python3', '-c', code],
            input=problem.input,
            capture_output=True,
            text=True,
            timeout=5
        )
        is_correct = result.stdout.strip() == problem.expected_output.strip()
        submission = Submission(
            problem_id=problem_id,
            user_id=data['user_id'],
            code=code,
            result='correct' if is_correct else 'incorrect',
            output=result.stdout
        )
        db.session.add(submission)
        db.session.commit()
        return jsonify({"result": submission.result, "output": submission.output})
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Execution timed out"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400
