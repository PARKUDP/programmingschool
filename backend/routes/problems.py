from flask import Blueprint, request, jsonify
from models import db, Problem
from datetime import datetime

problems_bp = Blueprint('problems', __name__)

# 問題一覧取得API
@problems_bp.route('/problems', methods=['GET'])
def get_problems():
    problems = Problem.query.all()
    problem_list = [
        {
            'id': p.id,
            'lesson_id': p.lesson_id,
            'title': p.title,
            'markdown': p.markdown,
            'created_at': p.created_at.isoformat()
        }
        for p in problems
    ]
    return jsonify(problem_list)

# 問題作成API（Markdown形式）
@problems_bp.route('/problems', methods=['POST'])
def create_problem():
    data = request.get_json()
    title = data.get('title')
    markdown = data.get('markdown')
    lesson_id = data.get('lesson_id')

    if not title or not markdown or not lesson_id:
        return jsonify({'error': 'Missing fields'}), 400

    problem = Problem(
        title=title,
        markdown=markdown,
        lesson_id=lesson_id,
        created_at=datetime.utcnow()
    )
    db.session.add(problem)
    db.session.commit()

    return jsonify({'message': '問題を登録しました。', 'problem_id': problem.id}), 201
