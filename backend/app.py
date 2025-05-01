from flask import Flask
from flask_cors import CORS
from models import db
from routes.auth import auth_bp
from routes.problems import problems_bp
from routes.materials import materials_bp
from routes.lessons import lessons_bp
from routes.testcases import testcases_bp
from flask_login import LoginManager
from models import User
from routes.submissions import submissions_bp
import os
from dotenv import load_dotenv

# 環境変数の読み込み
load_dotenv()


def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.environ['SECRET_KEY']
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite3'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    login_manager = LoginManager()
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    db.init_app(app)
    CORS(app)

    # ルーティング登録
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(problems_bp, url_prefix='/api')
    app.register_blueprint(submissions_bp, url_prefix='/api')
    app.register_blueprint(materials_bp, url_prefix='/api')
    app.register_blueprint(lessons_bp, url_prefix='/api')
    app.register_blueprint(testcases_bp, url_prefix='/api')
    

    return app

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5001)

