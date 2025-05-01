from flask import Blueprint, request, jsonify
from models import db, TestCase

testcases_bp = Blueprint('testcases', __name__)

# テストケース作成 API
@testcases_bp.route('/testcases', methods=['POST'])
def create_testcase():
    data = request.get_json()
    problem_id = data.get('problem_id')
    input_data = data.get('input')
    expected_output = data.get('expected_output')

    if not problem_id or input_data is None or expected_output is None:
        return jsonify({'error': 'Missing required fields'}), 400

    testcase = TestCase(
        problem_id=problem_id,
        input=input_data,
        expected_output=expected_output
    )
    db.session.add(testcase)
    db.session.commit()

    return jsonify({'message': 'Test case created', 'testcase_id': testcase.id}), 201
