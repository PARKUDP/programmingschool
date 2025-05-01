from flask import Blueprint, request, jsonify
from models import db, Submission, Problem, TestCase
from datetime import datetime
import subprocess
import tempfile

submissions_bp = Blueprint("submissions", __name__)

@submissions_bp.route("/submit", methods=["POST"])
def submit_code():
    data = request.get_json()
    user_id = data.get("user_id")
    problem_id = data.get("problem_id")
    code = data.get("code")

    if not user_id or not problem_id or not code:
        return jsonify({"error": "Missing fields"}), 400

    # 問題とテストケースの取得
    test_cases = TestCase.query.filter_by(problem_id=problem_id).all()
    if not test_cases:
        return jsonify({"error": "No test cases found for this problem"}), 404

    all_passed = True
    final_output = ""

    for case in test_cases:
        with tempfile.NamedTemporaryFile(mode='w+', suffix=".py", delete=False) as temp_code:
            temp_code.write(code)
            temp_code.flush()

            try:
                result = subprocess.run(
                    ["python3", temp_code.name],
                    input=case.input,
                    capture_output=True,
                    text=True,
                    timeout=2
                )
                output = result.stdout.strip()
                expected = case.expected_output.strip()

                if output != expected:
                    all_passed = False
                    final_output += f"Failed case:\nInput:\n{case.input}\nExpected:\n{expected}\nGot:\n{output}\n\n"

            except subprocess.TimeoutExpired:
                all_passed = False
                final_output += "Timeout Error\n"
                break
            except Exception as e:
                all_passed = False
                final_output += f"Execution Error: {str(e)}\n"
                break

    # 結果をDBに保存
    submission = Submission(
        user_id=user_id,
        problem_id=problem_id,
        code=code,
        result="AC" if all_passed else "WA",
        output=final_output if not all_passed else "All test cases passed.",
        submitted_at=datetime.utcnow()
    )
    db.session.add(submission)
    db.session.commit()

    return jsonify({
        "message": "Submission processed.",
        "result": submission.result,
        "output": submission.output
    })

@submissions_bp.route("/submissions/<int:user_id>", methods=["GET"])
def get_user_submissions(user_id):
    submissions = Submission.query.filter_by(user_id=user_id).order_by(Submission.submitted_at.desc()).all()
    result = []
    for s in submissions:
        result.append({
            "id": s.id,
            "problem_id": s.problem_id,
            "result": s.result,
            "output": s.output,
            "submitted_at": s.submitted_at.isoformat()
        })
    return jsonify(result)

