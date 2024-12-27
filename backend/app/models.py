from . import db

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)

class Lesson(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(80), nullable=False)
    description = db.Column(db.Text)

class Problem(db.Model):
    __tablename__ = 'problem'
    __table_args__ = {'extend_existing': True}  # テーブル再定義を許可
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(80), nullable=False)
    description = db.Column(db.Text, nullable=False)
    input_data = db.Column(db.Text, nullable=False)
    expected_output = db.Column(db.Text, nullable=False)

