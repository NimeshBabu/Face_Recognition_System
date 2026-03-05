import numpy as np
from app.config.firebase_config import db

THRESHOLD = 0.6
TOP_K = 3


def cosine_similarity(vec1, vec2):
    v1 = np.array(vec1)
    v2 = np.array(vec2)

    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))


def find_top_k_matches(query_embedding):

    cases = db.collection("missing_cases") \
            .where("system_data.status", "in", ["missing", "verified"]) \
            .stream()

    results = []

    for case in cases:
        data = case.to_dict()

        stored_embedding = data.get("ai_data", {}).get("embedding_vector")
        if stored_embedding is None:
            continue  # skip if no embeddingstored_embedding = data["ai_data"]["embedding_vector"]

        similarity = cosine_similarity(query_embedding, stored_embedding)

        if similarity >= THRESHOLD:
            results.append({
                "case_id": case.id,
                "similarity": float(similarity)
            })

    results = sorted(results, key=lambda x: x["similarity"], reverse=True)

    return results[:TOP_K]