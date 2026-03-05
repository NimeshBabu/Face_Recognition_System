import os
import cv2
import numpy as np
from insightface.app import FaceAnalysis
from insightface.model_zoo import get_model

# Base directory for models (inside project)
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "..", "models", "buffalo_l")
os.makedirs(MODEL_DIR, exist_ok=True)

# Name of the model to use
MODEL_NAME = "buffalo_l"

# Function to load or download the model automatically
def load_model():
    """
    Loads the ArcFace model. Downloads it automatically if missing.
    CPU-compatible (ctx_id=-1).
    """
    try:
        model = FaceAnalysis(name=MODEL_NAME, root=MODEL_DIR)
        # CPU only: ctx_id=-1
        model.prepare(ctx_id=-1, det_size=(640, 640))
        print(f"[INFO] {MODEL_NAME} model loaded successfully (CPU)")
        return model
    except Exception as e:
        raise RuntimeError(f"Failed to load {MODEL_NAME} model: {e}")

# Load model once
model = load_model()


def generate_embedding(image_path):
    """
    Given a file path, generates the ArcFace embedding vector.
    Returns embedding as a list of floats.
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            raise Exception("Invalid image")

        faces = model.get(img)

        if len(faces) == 0:
            raise Exception("No face detected in the image")

        # Return first detected face's embedding as a list
        return faces[0].embedding.tolist()

    except Exception as e:
        raise Exception(f"Face embedding error: {str(e)}")