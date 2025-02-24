from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from app.config import Config

db = SQLAlchemy()
migrate = Migrate()


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)

    from app.models import Course, Material, Lesson, Problem
    from app.routes import routes

    app.register_blueprint(routes)

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
