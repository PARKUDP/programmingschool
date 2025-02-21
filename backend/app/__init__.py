from flask import Flask, jsonify


def create_app():
    app = Flask(__name__)

    @app.route("/")
    def home():
        return jsonify({"message": "Backend is running!"}), 200

    @app.route("/health", methods=["GET"])
    def health_check():
        return {"status": "OK"}, 200

    return app
