from flask import Blueprint, request, jsonify
from models import db, User
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint("auth", __name__)

# ユーザー登録API
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "User already exists"}), 409

    user = User(
        username=username,
        password_hash=generate_password_hash(password, method="pbkdf2:sha256"),
        is_admin=False
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "User registered successfully"}), 201


# ログインAPI
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password_hash, password):
        login_user(user)
        return jsonify({
            "message": "Login successful",
            "user_id": user.id,
            "username": user.username,
            "is_admin": user.is_admin  
        })
    else:
        return jsonify({"error": "Invalid credentials"}), 401


# ログアウトAPI
@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logged out successfully"})


# 現在のログインユーザー確認（デバッグ用）
@auth_bp.route("/me", methods=["GET"])
@login_required
def me():
    return jsonify({"user_id": current_user.id, "username": current_user.username})
