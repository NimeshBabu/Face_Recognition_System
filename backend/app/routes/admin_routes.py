from flask import Blueprint, request, jsonify
from app.config.firebase_config import db
from app.utils.decorators import jwt_required, role_required
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from backend.app.services.auth_service import generate_token

admin_bp = Blueprint("admin", __name__)




# SETUP ADMIN (For initial setup, can be removed later)

@admin_bp.route("/setup-admin", methods=["POST"])
def setup_admin():
    data = request.json
    email = data.get("email")
    password = data.get("password")


    admin_ref = db.collection("users").document()
    hashed_password = generate_password_hash(password)
    admin_ref.set({
        "email": email,
        "password_hash": hashed_password,
        "role": "admin",
        "created_at": datetime.datetime.utcnow()
    })

    return jsonify({"message": "Admin created", "admin_id": admin_ref.id})



# ADMIN LOGIN
@admin_bp.route("/admin/login", methods=["POST"])
def admin_login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    # Find admin by email
    admins = db.collection("users").where("email", "==", email).where("role", "==", "admin").stream()
    admin_doc = None
    for doc in admins:
        admin_doc = doc
        break

    if not admin_doc:
        return jsonify({"error": "Admin not found"}), 404

    admin_data = admin_doc.to_dict()
    if not check_password_hash(admin_data["password_hash"], password):
        return jsonify({"error": "Incorrect password"}), 401

    # Generate JWT token
    token = generate_token(admin_doc.id, "admin")

    return jsonify({
        "message": "Login successful",
        "token": token,
        "role": "admin",
        "admin_id": admin_doc.id
    })


# GET all cases
@admin_bp.route("/admin/all-cases", methods=["GET"])
@jwt_required
@role_required("admin")
def get_all_cases():
    try:
        cases_ref = db.collection("missing_cases").stream()
        cases = []
        for case in cases_ref:
            data = case.to_dict()

            cases.append(
                {
                    "case_id": case.id,
                    "name": data.get("basic_info", {}).get("name"),
                    "age": data.get("basic_info", {}).get("age"),
                    "status": data.get("system_data", {}).get("status"),
                    "police_station_id": data.get("case_details", {}).get(
                        "police_station_id"
                    ),
                }
            )
        return jsonify({"cases": cases})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# GET ALL USERS
@admin_bp.route("/admin/users", methods=["GET"])
@jwt_required
@role_required("admin")
def get_all_users():

    try:
        users_ref = db.collection("users").stream()

        users = []

        for user in users_ref:
            data = user.to_dict()

            users.append(
                {
                    "user_id": user.id,
                    "name": data.get("name"),
                    "email": data.get("email"),
                    "created_at": data.get("created_at"),
                }
            )

        return jsonify({"users": users})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# GET ALL POLICE STATIONS
@admin_bp.route("/admin/police", methods=["GET"])
@jwt_required
@role_required("admin")
def get_all_police():
    try:
        police_ref = db.collection("police_stations").stream()
        police_list = []
        for police in police_ref:
            data = police.to_dict()
            
            police_list.append({
                "station_id": police.id,
                "station_name": data.get("station_name"),
                "email": data.get("email"),
                "location": data.get("location"),
                "created_at": data.get("created_at"),
                })
        return jsonify({"police_stations": police_list})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

            
# CREATE POLICE STATION
@admin_bp.route("/admin/create-police", methods=["POST"])
@jwt_required
@role_required("admin")
def create_police():
    try:
        data = request.json
        station_name = data.get("station_name")
        email = data.get("email")
        password = data.get("password")
        location = data.get("location")
        
        
        if not station_name or not email or not password:
            return jsonify({"error": "Station name, email and password required"}), 400
        hashed_password = generate_password_hash(password)
        police_ref = db.collection("police_stations").document()
        police_ref.set({
            "station_name": station_name,
            "email": email,
            "password_hash": hashed_password,
            "location": location,
            "role": "police",
            "created_at": datetime.datetime.utcnow()
        })
        return jsonify({
            "message": "Police station created successfully",
            "station_id": police_ref.id,
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
        
        
        
        
# DELETE CASE
@admin_bp.route("/admin/case/<case_id>", methods=["DELETE"])
@jwt_required
@role_required("admin")
def delete_case(case_id):
    try:
        case_ref = db.collection("missing_cases").document(case_id)
        if not case_ref.get().exists:
            return jsonify({"error": "Case not found"}), 404
        case_ref.delete()
        
        return jsonify({
            "message": "Case deleted successfully",
            "case_id": case_id,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500