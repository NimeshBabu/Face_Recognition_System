from functools import wraps
from flask import request, jsonify
from app.services.auth_service import verify_token


def jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):

        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return jsonify({"error": "Token missing"}), 401

        token = auth_header.split(" ")[1]

        decoded = verify_token(token)

        if not decoded:
            return jsonify({"error": "Invalid or expired token"}), 401

        request.user = decoded

        return f(*args, **kwargs)

    return decorated


def role_required(role):
    def decorator(f):

        @wraps(f)
        def decorated(*args, **kwargs):

            if request.user["role"] != role:
                return jsonify({"error": "Unauthorized"}), 403

            return f(*args, **kwargs)

        return decorated

    return decorator