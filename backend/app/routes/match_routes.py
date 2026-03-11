from flask import Blueprint, request, jsonify
from app.services.face_service import generate_embedding
from app.services.storage_service import save_image
from app.services.match_service import find_top_k_matches
from app.config.firebase_config import db
from app.utils.decorators import jwt_required, role_required
import datetime

match_bp = Blueprint("match", __name__)

@match_bp.route("/match-found", methods=["POST"])
@jwt_required
@role_required("police")
def match_found():

    try:
        image = request.files.get("photo")
        police_station_id = request.form.get("police_station_id")
        
        if not image:
            return jsonify({"error": "Image required"}), 400

        # Save found image
        image_path = save_image(image, "found_persons")

        # Generate embedding
        embedding = generate_embedding(image_path)
        
        # Save found report
        found_ref = db.collection("found_reports").document()
        found_ref.set({
            "image_path": image_path,
            "embedding": embedding,
            "police_station_id": police_station_id,
            "timestamp": datetime.datetime.utcnow()
        })
        
        found_case_id = found_ref.id
        
        # Find matches
        matches = find_top_k_matches(embedding)
        
        saved_matches = []
        
        for match in matches:
            log_ref = db.collection("match_logs").document()
            log_ref.set({
                "missing_case_id": match["case_id"],
                "found_case_id": found_case_id,
                "similarity_score": match["similarity_score"],
                "matched_by_police_id": police_station_id,
                "status": "pending",
                "created_at": datetime.datetime.utcnow()
            })
            
            saved_matches.append({
                "log_id": log_ref.id,
                "case_id": match["case_id"],
                "similarity_score": match["similarity_score"]
            })
        return jsonify({
            "found_case_id": found_case_id,
            "matches": saved_matches
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500



@match_bp.route("/confirm-match", methods=["POST"])
@jwt_required
@role_required("police")
def confirm_match():
    try:
        data = request.json
        log_id = data.get("log_id")
        log_ref = db.collection("match_logs").document(log_id)
        log_data = log_ref.get().to_dict()
        case_id = log_data["missing_case_id"]
        log_ref.update({
            "status" : "confirmed"
        })

        if not case_id:
            return jsonify({"error": "case_id required"}), 400

        case_ref = db.collection("missing_cases").document(case_id)

        case_ref.update({
            "system_data.status": "found",
            "ai_data.similarity_score": log_data["similarity_score"],
            "ai_data.matched_case_id": case_id,
            "system_data.found_by_station": log_data["matched_by_police_id"],
            "system_data.found_at": datetime.datetime.utcnow()
        })

        return jsonify({
            "message": "Match confirmed"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    

@match_bp.route("/reject-match", methods=["POST"])
@jwt_required
@role_required("police")
def reject_match():
    try:
        data = request.json
        log_id = data.get("log_id")
        log_ref = db.collection("match_logs").document(log_id)
        log_ref.update({
            "status" : "rejected"
        })
        return jsonify({"message": "Match rejected"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500