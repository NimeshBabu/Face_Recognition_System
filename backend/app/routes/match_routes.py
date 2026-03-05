from flask import Blueprint, request, jsonify
from app.services.face_service import generate_embedding
from app.services.storage_service import save_image
from app.services.match_service import find_top_k_matches
from app.config.firebase_config import db
import datetime

match_bp = Blueprint("match", __name__)

@match_bp.route("/match-found", methods=["POST"])
def match_found():

    try:
        image = request.files.get("photo")

        if not image:
            return jsonify({"error": "Image required"}), 400

        # Save found image
        image_path = save_image(image, "found_persons")

        # Generate embedding
        embedding = generate_embedding(image_path)

        # Find matches
        matches = find_top_k_matches(embedding)

        return jsonify({
            "matches": matches
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500



@match_bp.route("/confirm-match", methods=["POST"])
def confirm_match():
    try:
        data = request.json

        case_id = data.get("case_id")
        similarity_score = data.get("similarity_score")
        police_station_id = data.get("police_station_id")

        if not case_id:
            return jsonify({"error": "case_id required"}), 400

        case_ref = db.collection("missing_cases").document(case_id)

        case_ref.update({
            "system_data.status": "found",
            "ai_data.similarity_score": similarity_score,
            "ai_data.matched_case_id": case_id,
            "system_data.found_by_station": police_station_id,
            "system_data.found_at": datetime.datetime.utcnow()
        })

        return jsonify({
            "message": "Match confirmed and case updated"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    

@match_bp.route("/reject-match", methods=["POST"])
def reject_match():
    try:
        data = request.json

        case_id = data.get("case_id")

        case_ref = db.collection("missing_cases").document(case_id)

        case_ref.update({
            "system_data.status": "rejected"
        })

        return jsonify({"message": "Match rejected"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500