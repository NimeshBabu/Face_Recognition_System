import os
import cv2
import numpy as np
from insightface.app import FaceAnalysis


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Move from services → app
APP_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))

# Models directory
MODEL_DIR = os.path.join(APP_DIR, "models")

# Ensure models directory exists
os.makedirs(MODEL_DIR, exist_ok=True)

MODEL_NAME = "buffalo_l"


# Function to load or download the model automatically
def load_model():
    """
    Loads the ArcFace model. Downloads it automatically if missing.
    CPU-compatible (ctx_id=-1).
    """
    try:
        print("[AI SERVICE] Loading face recognition model...")
        model = FaceAnalysis(
            name=MODEL_NAME, 
            root=MODEL_DIR
        )
        
        # CPU only: ctx_id=-1
        model.prepare(
            ctx_id=-1, 
            det_size=(640, 640)
        )
        
        print(f"[AI SERVICE] {MODEL_NAME} model loaded successfully (CPU)")
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
        
        # Check if image exists
        if not os.path.exists(image_path):
            raise Exception("Image file does not exist")
        
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