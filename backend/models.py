from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from flask_login import UserMixin


db = SQLAlchemy()

class User(db.Model, UserMixin):
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    submissions = db.relationship('Submission', backref='user', lazy=True)


class Material(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    lessons = db.relationship('Lesson', backref='material', lazy=True)

class Lesson(db.Model):
    __tablename__ = 'lesson'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)


    material_id = db.Column(db.Integer, db.ForeignKey('material.id'), nullable=False)
    problems = db.relationship('Problem', backref='lesson', lazy=True)

class Problem(db.Model):
    __tablename__ = 'problem'

    id = db.Column(db.Integer, primary_key=True)
    lesson_id = db.Column(db.Integer, db.ForeignKey('lesson.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    markdown = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    test_cases = db.relationship('TestCase', backref='problem', lazy=True)
    submissions = db.relationship('Submission', backref='problem', lazy=True)

class TestCase(db.Model):
    __tablename__ = 'test_case'

    id = db.Column(db.Integer, primary_key=True)
    problem_id = db.Column(db.Integer, db.ForeignKey('problem.id'), nullable=False)
    input = db.Column(db.Text)
    expected_output = db.Column(db.Text)

class Submission(db.Model):
    __tablename__ = 'submission'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    problem_id = db.Column(db.Integer, db.ForeignKey('problem.id'), nullable=False)
    code = db.Column(db.Text)
    result = db.Column(db.String(10))  # "AC", "WA", "RE"など
    output = db.Column(db.Text)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
