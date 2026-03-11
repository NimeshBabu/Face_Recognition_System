from flask import Blueprint, request, jsonify
from app.config.firebase_config import db
from app.services.auth_service import generate_token
from app.utils.decorators import jwt_required, role_required
from werkzeug.security import check_password_hash
import datetime


police_bp = Blueprint("police", __name__)


# Police Login Route
@police_bp.route("/police/login", methods=["POST"])
def police_login():
    try:
        data = request.json
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400
        
        police_query = db.collection("police_stations") \
            .where("email", "==", email) \
            .limit(1) \
            .stream()
            
        police = None
        for doc in police_query:
            police = doc.to_dict()
            police["station_id"] = doc.id
            
        if not police:
            return jsonify({"error": "Police Station not found"}),401
        
        if not check_password_hash(police["password_hash"], password):
            return jsonify({"error": "Incorrect password"}),401
        
        token = generate_token(police["station_id"], "police")
        return jsonify({
            "message": "Login successful",
            "token": token,
            "name": police["station_name"],
            "station_id": police["station_id"],
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    
    
#Get all cases for a police station
@police_bp.route("/police/cases", methods=["GET"])
@jwt_required
@role_required("police")
def get_cases():
    try:
        station_id = request.args.get("station_id")
        
        if not station_id:
            return jsonify({"error": "Station ID required"}), 400
        
        cases_ref = db.collection("missing_cases") \
            .where("case_details.police_station_id", "==", station_id) \
                .stream()
                
        cases = []
        for case in cases_ref:
            data = case.to_dict()
            cases.append({
                "case_id": case.id,
                "name": data.get("basic_info", {}).get("name"),
                "age": data.get("basic_info", {}).get("age"),
                "gender": data.get("basic_info", {}).get("gender"),
                "status": data.get("system_data", {}).get("status"),
                "missing_date": data.get("basic_info", {}).get("missing_date"),
            })
            
        
        return jsonify({
            "cases": cases
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    
#Get single case details
@police_bp.route("/police/case/<case_id>", methods=["GET"])
@jwt_required
@role_required("police")
def get_case_details(case_id):
    try:
        case_ref = db.collection("missing_cases").document(case_id)
        case_doc = case_ref.get()
        
        if not case_doc.exists:
            return jsonify({"error": "Case not found"}), 404
        
        case_data = case_doc.to_dict()
        
        return jsonify({
            "case_id": case_id,
            "case_data": case_data
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# Report found person
@police_bp.route("/police/report-found", methods=["POST"])
@jwt_required
@role_required("admin")
def report_found():

    try:
        data = request.json
        case_id = data.get("case_id")
        police_station_id = data.get("police_station_id")

        if not case_id:
            return jsonify({"error": "Case ID required"}), 400

        case_ref = db.collection("missing_cases").document(case_id)

        case_ref.update({
            "system_data.status": "match_pending",
            "system_data.updated_at": datetime.datetime.utcnow(),
            "system_data.updated_by_station": police_station_id
        })

        return jsonify({
            "message": "Case marked as found report. Run AI matching to find potential matches."
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500