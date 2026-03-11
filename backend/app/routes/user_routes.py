from flask import Blueprint, request, jsonify
from app.config.firebase_config import db
from app.services.face_service import generate_embedding
from app.services.storage_service import save_image
from app.utils.decorators import jwt_required, role_required
from app.services.auth_service import generate_token
from werkzeug.security import generate_password_hash
from werkzeug.security import check_password_hash
import datetime

user_bp = Blueprint("user", __name__)


# USER REGISTRATION
@user_bp.route("/register", methods=["POST"])
def register():
    try:
        data = request.json
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")

        if not name or not email or not password:
            return jsonify({"error": "Name, email, and password are required"}), 400
        
        hashed_password = generate_password_hash(password)
        user_ref = db.collection("users").document()

        user_ref.set(
            {
                "name": name,
                "email": email,
                "password_hash": hashed_password,
                "role": "user",
                "created_at": datetime.datetime.utcnow(),
            }
        )

        return jsonify(
            {"message": "User registered successfully", "user_id": user_ref.id}
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# USER LOGIN
@user_bp.route("/login", methods=["POST"])
def login():

    try:
        data = request.json

        email = data.get("email")
        password = data.get("password")

        users = db.collection("users").where("email", "==", email).where("role", "==", "user").stream()

        user = None
        for doc in users:
            user = doc.to_dict()
            user["user_id"] = doc.id
            
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        if not check_password_hash(user["password_hash"], password):
            return jsonify({"error": "Invalid credentials"}), 401

        token = generate_token(user["user_id"], "user")

        return jsonify({
            "message": "Login successful", 
            "token": token,
            "name": user["name"],
            "user_id": user["user_id"]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# REPORT MISSING PERSON
@user_bp.route("/report-missing", methods=["POST"])
@jwt_required
@role_required("user")
def report_missing():

    try:
        # 1️⃣ Get form data
        data = request.form
        image = request.files.get("photo")
        age_value = data.get("age")
        suspected_value = data.get("suspected_kidnap")
        if suspected_value is None:
            suspected_kidnap = None
        else:
            suspected_kidnap = suspected_value.lower() == "true"

        if not image:
            return jsonify({"error": "Image is required"}), 400

        # 2️⃣ Save image locally
        image_path = save_image(image, "missing_persons")

        # 3️⃣ Generate embedding from saved image
        embedding = generate_embedding(image_path)

        # 4️⃣ Store in Firestore
        case_ref = db.collection("missing_cases").document()

        case_ref.set(
            {
                "basic_info": {
                    "name": data.get("name"),
                    "age": (
                        int(age_value) if age_value and age_value.isdigit() else None
                    ),
                    "gender": data.get("gender"),
                    "category": data.get("category"),
                    "missing_date": data.get("missing_date"),
                    "missing_time": data.get("missing_time"),
                    "lost_address": data.get("lost_address"),
                    "permanent_address": data.get("permanent_address"),
                },
                "physical_details": {
                    "height": data.get("height"),
                    "weight": data.get("weight"),
                    "complexion": data.get("complexion"),
                    "hair_color": data.get("hair_color"),
                    "eye_color": data.get("eye_color"),
                    "identifying_marks": data.get("identifying_marks"),
                },
                "clothing_details": {
                    "clothes": data.get("clothes"),
                    "footwear": data.get("footwear"),
                    "accessories": data.get("accessories"),
                },
                "family_details": {
                    "mother_name": data.get("mother_name"),
                    "father_name": data.get("father_name"),
                    "guardian_name": data.get("guardian_name"),
                    "relation_with_complainant": data.get("relation_with_complainant"),
                },
                "complainant_details": {
                    "name": data.get("complainant_name"),
                    "phone": data.get("complainant_phone"),
                    "email": data.get("complainant_email"),
                    "address": data.get("complainant_address"),
                },
                "case_details": {
                    "last_seen_location": data.get("last_seen_location"),
                    "suspected_kidnap": suspected_kidnap,
                    "emergency_level": data.get("emergency_level"),
                    "police_station_id": data.get("police_station_id"),
                },
                "ai_data": {
                    "image_url": image_path,
                    "embedding_vector": embedding,
                    "similarity_score": None,
                    "matched_case_id": None,
                },
                "system_data": {
                    "reported_by_user_id": data.get("user_id"),
                    "status": "missing",
                    "created_at": datetime.datetime.utcnow(),
                },
            }
        )

        return jsonify({"message": "Missing case reported successfully"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500



# GET USER CASES
@user_bp.route("/my-cases", methods=["GET"])
@jwt_required
@role_required("user")
def my_cases():

    try:
        user_id = request.user["user_id"]

        cases_ref = db.collection("missing_cases") \
            .where("system_data.reported_by_user_id", "==", user_id) \
            .stream()

        cases = []

        for case in cases_ref:
            data = case.to_dict()

            cases.append({
                "case_id": case.id,
                "name": data.get("basic_info", {}).get("name"),
                "status": data.get("system_data", {}).get("status"),
                "missing_date": data.get("basic_info", {}).get("missing_date")
            })

        return jsonify({"cases": cases})

    except Exception as e:
        return jsonify({"error": str(e)}), 500




# GET /case/<case_id>
@user_bp.route("/case/<case_id>", methods=["GET"])
@jwt_required
@role_required("user")
def get_case(case_id):

    try:
        case_ref = db.collection("missing_cases").document(case_id)
        case_doc = case_ref.get()

        if not case_doc.exists:
            return jsonify({"error":"Case not found"}), 404

        return jsonify(case_doc.to_dict())

    except Exception as e:
        return jsonify({"error": str(e)}), 500
