from functools import wraps
from flask import request, jsonify
from app.services.auth_service import verify_token


def jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):

        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return jsonify({"error": "Token missing"}), 401

        try:
            token = auth_header.split(" ")[1]
        except:
            return jsonify({"error": "Invalid token format"}), 401

        decoded = verify_token(token)

        if not decoded:
            return jsonify({"error": "Invalid or expired token"}), 401

        request.user = decoded

        return f(*args, **kwargs)

    return decorated


def role_required(role):

    def wrapper(f):
        @wraps(f)
        def decorated(*args, **kwargs):

            user = getattr(request, "user", None)

            if not user or user.get("role") != role:
                return jsonify({"error": "Unauthorized"}), 403

            return f(*args, **kwargs)

        return decorated

    return wrapper