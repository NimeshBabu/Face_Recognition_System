from flask import Flask
from flask_cors import CORS
from app.routes.user_routes import user_bp
from app.routes.match_routes import match_bp
from app.routes.police_routes import police_bp
from app.routes.admin_routes import admin_bp
import os

app = Flask(__name__)
CORS(app)

# Add upload config
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config["UPLOAD_FOLDER"] = os.path.join(BASE_DIR, "uploads")
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024

app.register_blueprint(user_bp)
app.register_blueprint(match_bp)
app.register_blueprint(police_bp)
app.register_blueprint(admin_bp)

if __name__ == "__main__":
    app.run(debug=True)