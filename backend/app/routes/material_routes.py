from flask import Blueprint, request, jsonify
from app.models import db, Material

material_bp = Blueprint("material", __name__)


@material_bp.route("/material", methods=["POST"])
def create_material():
    data = request.json
    material = Material(title=data.get("title"), description=data.get("content"))
    db.session.add(material)
    db.session.commit()
    return jsonify({"message": "教材が作成されました", "material_id": material.id})


@material_bp.route("/<int:material_id>", methods=["PUT"])
def update_material(material_id):
    data = request.json
    material = Material.query.get(material_id)
    if not material:
        return jsonify({"message": "Material not found"}), 404

    material.title = data["title"]
    material.description = data["description"]
    db.session.commit()
    return jsonify({"message": "Material updated successfully"})


@material_bp.route("/<int:material_id>", methods=["DELETE"])
def delete_material(material_id):
    material = Material.query.get(material_id)
    if not material:
        return jsonify({"message": "Material not found"}), 404

    db.session.delete(material)
    db.session.commit()
    return jsonify({"message": "Material deleted successfully"})
