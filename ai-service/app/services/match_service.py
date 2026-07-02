import numpy as np 

THRESHOLD = 0.6
TOP_K = 3

def cosine_similarity(vec1, vec2):
    """
    Compute cosine similarity between two embeddings.
    """

    v1 = np.array(vec1)
    v2 = np.array(vec2)

    return float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)))


def find_top_k_matches(query_embedding, stored_embeddings):
    results = []
    all_scores = []  # TEMP DEBUG

    for case in stored_embeddings:
        case_id = case["case_id"]
        embedding = case["embedding"]
        similarity = cosine_similarity(query_embedding, embedding)
        all_scores.append((case_id, similarity))  # TEMP DEBUG

        if similarity >= THRESHOLD:
            results.append({
                "case_id": case_id,
                "similarity": float(similarity)
            })

    all_scores.sort(key=lambda x: x[1], reverse=True)
    print(f"[MATCH DEBUG] All scores: {all_scores}")  # TEMP DEBUG

    results.sort(key=lambda x: x["similarity"], reverse=True)
    print(f"[MATCH DEBUG] Passed threshold ({THRESHOLD}): {len(results)}")  # TEMP DEBUG

    return results[:TOP_K]