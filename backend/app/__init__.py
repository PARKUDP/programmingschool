from flask import Flask, jsonify
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

    @app.route("/")
    def home():
        return jsonify({"message": "Backend is running!"})

    @app.route("/health")
    def health_check():
        return jsonify({"status": "OK"})
    return app