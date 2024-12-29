from flask import Blueprint, request, jsonify
from app.models import db, Problem, Submission

problem_bp = Blueprint('problem', __name__)

@problem_bp.route('/<int:problem_id>/submit', methods=['POST'])
def submit_solution(problem_id):
    data = request.json
    code = data['code']
    problem = Problem.query.get(problem_id)

    if code.strip() == problem.expected_output.strip():
        submission = Submission(
            problem_id=problem_id,
            user_id=data['user_id'],
            code=code,
            result='correct',
            output=problem.expected_output
        )
    else:
        submission = Submission(
            problem_id=problem_id,
            user_id=data['user_id'],
            code=code,
            result='incorrect',
            output='Incorrect Output'
        )

    db.session.add(submission)
    db.session.commit()

    return jsonify({"result": submission.result, "output": submission.output})
