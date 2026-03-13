import os
import uuid
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename

from app.services.face_service import generate_embedding
from app.services.match_service import find_top_k_matches


face_bp = Blueprint("face", __name__)

# -------------------------------------------------
# Upload Folder
# -------------------------------------------------

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# Allowed image extensions
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ---------------------------------------------
# Generate Face Embedding
# ---------------------------------------------
@face_bp.route("/generate-embedding", methods=["POST"])
def generate_face_embedding():
    file_path = None
    try:

        if "image" not in request.files:
            return jsonify({"error": "Image file is required"}), 400

        file = request.files["image"]

        if file.filename == "":
            return jsonify({"error": "Empty filename"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": "Invalid file type"}), 400
        
        
        # Prevent duplicate filenames using UUID
        filename = str(uuid.uuid4()) + "_" + secure_filename(file.filename)
        
        file_path = os.path.join(UPLOAD_FOLDER, filename)

        file.save(file_path)

        # Generate embedding
        embedding = generate_embedding(file_path)

        return jsonify({
            "embedding": embedding
        })

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500
        
    finally:
        # Auto cleanup uploaded image
        if file_path and os.path.exists(file_path):
            os.remove(file_path)


# ---------------------------------------------
# Match Face
# ---------------------------------------------
@face_bp.route("/match-face", methods=["POST"])
def match_face():
    try:

        data = request.json

        query_embedding = data.get("query_embedding")
        stored_embeddings = data.get("stored_embeddings")

        if not query_embedding:
            return jsonify({
                "error": "query_embedding required"
            }), 400
        if not stored_embeddings:
            return jsonify({"error": "stored_embeddings required"})
        
        matches = find_top_k_matches(query_embedding, stored_embeddings)

        return jsonify({
            "matches": matches
        })

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500