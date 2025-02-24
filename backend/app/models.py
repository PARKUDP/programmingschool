from app.app import db


class Course(db.Model):
    __tablename__ = "courses"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(255), nullable=False)
    created_at = db.Column(
        db.TIMESTAMP, server_default=db.func.current_timestamp(), nullable=False
    )

    materials = db.relationship(
        "Material", backref="course", cascade="all, delete-orphan"
    )


class Material(db.Model):
    __tablename__ = "materials"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(255), nullable=False)
    course_id = db.Column(
        db.Integer, db.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    created_at = db.Column(
        db.TIMESTAMP, server_default=db.func.current_timestamp(), nullable=False
    )

    lessons = db.relationship(
        "Lesson", backref="material", cascade="all, delete-orphan"
    )


class Lesson(db.Model):
    __tablename__ = "lessons"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(255), nullable=False)
    material_id = db.Column(
        db.Integer, db.ForeignKey("materials.id", ondelete="CASCADE"), nullable=False
    )
    created_at = db.Column(
        db.TIMESTAMP, server_default=db.func.current_timestamp(), nullable=False
    )

    problems = db.relationship(
        "Problem", backref="lesson", cascade="all, delete-orphan"
    )


class Problem(db.Model):
    __tablename__ = "problems"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    lesson_id = db.Column(
        db.Integer, db.ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False
    )
    problem_text = db.Column(db.Text, nullable=False)
    problem_type = db.Column(db.String(20), nullable=False)
    correct_answer = db.Column(db.Text, nullable=False)
    created_at = db.Column(
        db.TIMESTAMP, server_default=db.func.current_timestamp(), nullable=False
    )

    __table_args__ = (
        db.CheckConstraint(
            "problem_type IN ('text', 'code', 'multiple_choice')",
            name="check_problem_type",
        ),
    )
