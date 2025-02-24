from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from app.config import Config

db = SQLAlchemy()
migrate = Migrate()


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # DBの初期化
    db.init_app(app)
    migrate.init_app(app, db)

    # モデルのインポート
    from app.models import Course, Material, Lesson, Problem

    # ルートの登録
    from app.routes import routes

    app.register_blueprint(routes)

    return app
