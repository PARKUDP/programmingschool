from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    CORS(app)

    db.init_app(app)

    from app.routes import admin_routes, execute_routes, problem_routes, user_routes
    app.register_blueprint(admin_routes.admin_bp, url_prefix='/api/admin')
    app.register_blueprint(execute_routes.execute_bp, url_prefix='/api/execute')
    app.register_blueprint(problem_routes.problem_bp, url_prefix='/api/problem')
    app.register_blueprint(user_routes.user_bp, url_prefix='/api/user')

    return app
