What Each Folder / File Does

1️⃣ routes/ (API Endpoints)
    Routes handle HTTP requests from frontend / Postman.

a) user_routes.py
    Handles citizen/user actions.

    Our implemented route(Until now):
    POST /report-missing

    Flow:
        User uploads image
        ↓
        Image saved locally
        ↓
        Embedding generated
        ↓
        Data stored in Firestore

b) match_routes.py
    Handles AI matching and police confirmation.

    Routes we implemented(Until now):
    POST /confirm-match
    POST /reject-match

    Flow:
        Police uploads found photo
        ↓
        Embedding generated
        ↓
        Compare with missing embeddings
        ↓
        Return top matches

        Then police:

        Confirm → case status = found
        Reject → case status = rejected



c) police_routes.py
    Handles police station dashboard operations.

    Example routes you should add:
        GET /police/cases
        GET /police/case/<case_id>
        POST /police/login
        POST /police/report-found

d) admin_routes.py
    Handles super admin operations.




2️⃣ Services Layer (Business Logic)
    Services contain core logic used by routes.

a) face_service.py
    Handles AI face recognition.

    What it does:
        load ArcFace model
        detect faces
        generate embeddings

    Our function:
        generate_embedding(image_path)

    Output:
        [0.0123, -0.421, 0.998, ...]
        This vector is used for similarity matching.

b) match_service.py
    Handles face similarity search.

    Main function:
        find_top_k_matches()

    Steps:
        1. Get all missing cases from Firestore
        2. Read stored embeddings
        3. Calculate cosine similarity
        4. Filter by threshold
        5. Return top 3 matches

    We implemented:
        THRESHOLD = 0.6
        TOP_K = 3

c) storage_service.py
    Handles image upload and saving.

    Steps:
        check extension
        generate unique filename
        create folder if needed
        save image
        return path

    Example result:
        uploads/missing_persons/ab2e8f2_person.jpg


d) firebase_service.py (recommended)
    You don't have logic here yet.
    This should handle Firestore operations.

    Example:
        create_case()
        get_case()
        update_case()
        delete_case()

e) auth_service.py
    Handles login + JWT authentication. create and verify JWT tokens

    Functions:
        generate_token(user_id, role)
        verify_token(token)







3️⃣ Routes You Still Need

Your backend should finally contain:

User
    POST /register
    POST /login
    POST /report-missing
    GET /my-cases
    GET /case/<case_id>

Police
    POST /police/login
    POST /match-found
    GET /police/cases
    GET /police/case/<case_id>
    POST /police/report-found


Admin
    GET /admin/all-cases
    GET /admin/users
    GET /admin/police
    POST /admin/create-police
    DELETE /admin/case/<id>


4️⃣ Firestore Collections

a) users 
    Created in:
        POST /register
    user_id
        name
        email
        password_hash
        role = "user"
        created_at

b) police_stations
    Created by admin
        station_id
            station_name
            location
            email
            password_hash
            role = "police"
            created_at

c) cases

    case_id
        basic_info
        physical_details
        clothing_details
        family_details
        complainant_details
        case_details
        ai_data
        system_data


d) match_logs
    Created when:
        POST /match-found
    log_id
        missing_case_id
        found_case_id
        similarity_score
        matched_by_police_id
        status = pending | confirmed | rejected
        created_at


