from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///mvp.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})
    db.init_app(app)

    from app.routes.admin_routes import admin_bp
    from app.routes.user_routes import user_bp
    from app.routes.problem_routes import problem_bp
    from app.routes.execute_routes import execute_bp

    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(user_bp, url_prefix='/api/user')
    app.register_blueprint(problem_bp, url_prefix='/api/problem')
    app.register_blueprint(execute_bp, url_prefix='/api')

    return app
