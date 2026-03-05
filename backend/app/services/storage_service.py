import os
import uuid
from werkzeug.utils import secure_filename
from flask import current_app

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def save_image(file, category):
    if not allowed_file(file.filename):
        raise Exception("Invalid file type")

    filename = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4()}_{filename}"

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    category_path = os.path.join(upload_folder, category)

    os.makedirs(category_path, exist_ok=True)

    file_path = os.path.join(category_path, unique_name)
    file.save(file_path)

    return file_path
