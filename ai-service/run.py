from flask import Flask
from flask_cors import CORS
import os
from app.routes.face_routes import face_bp

app = Flask(__name__)
CORS(app)

# -------------------------------------------------
# Upload configuration
# -------------------------------------------------

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024


# -------------------------------------------------
# Register Routes
# -------------------------------------------------

app.register_blueprint(face_bp)

if __name__ == "__main__":
    print("🚀 AI Service running on http://localhost:5001")

    app.run(
        host="0.0.0.0",
        port=5001,
        debug=True
    )