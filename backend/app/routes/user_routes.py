from flask import Blueprint, request, jsonify
from app.config.firebase_config import db
from app.services.face_service import generate_embedding
from app.services.storage_service import save_image
import datetime

user_bp = Blueprint("user", __name__)

@user_bp.route("/report-missing", methods=["POST"])
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

        case_ref.set({
            "basic_info": {
                "name": data.get("name"),
                "age": int(age_value) if age_value and age_value.isdigit() else None,
                "gender": data.get("gender"),
                "category": data.get("category"),
                "missing_date": data.get("missing_date"),
                "missing_time": data.get("missing_time"),
                "lost_address": data.get("lost_address"),
                "permanent_address": data.get("permanent_address"),
            },
            
            "physical_details":{
                "height": data.get("height"),
                "weight": data.get("weight"),
                "complexion": data.get("complexion"),
                "hair_color": data.get("hair_color"),
                "eye_color": data.get("eye_color"),
                "identifying_marks": data.get("identifying_marks")
            },
            "clothing_details": {
                "clothes": data.get("clothes"),
                "footwear": data.get("footwear"),
                "accessories": data.get("accessories")
            },
            
            "family_details": {
                "mother_name": data.get("mother_name"),
                "father_name": data.get("father_name"),
                "guardian_name": data.get("guardian_name"),
                "relation_with_complainant": data.get("relation_with_complainant")
            },

            "complainant_details": {
                "name": data.get("complainant_name"),
                "phone": data.get("complainant_phone"),
                "email": data.get("complainant_email"),
                "address": data.get("complainant_address")
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
                "matched_case_id": None
            },

            "system_data": {
                "reported_by_user_id": data.get("user_id"),  
                "status": "missing",
                "created_at": datetime.datetime.utcnow()
            }
        })

        return jsonify({"message": "Missing case reported successfully"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    
    
    
    
    
    
    
    



# POST /report-missing
# GET /my-cases
# GET /case/<case_id>