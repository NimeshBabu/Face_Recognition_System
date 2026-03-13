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
    """
    Find the best matches for a query embedding.

    Parameters
    ----------
    query_embedding : list
        embedding generated from found person image

    stored_cases : list
        list of dictionaries:
        [
            {
                "case_id": "...",
                "embedding": [...]
            }
        ]
    """
    
    results = []
    
    for case in stored_embeddings:

        case_id = case["case_id"]
        embedding = case["embedding"]

        similarity = cosine_similarity(query_embedding, embedding)

        if similarity >= THRESHOLD:
            results.append({
                "case_id": case_id,
                "similarity": float(similarity)
            })

    results.sort(key=lambda x: x["similarity"], reverse=True)

    return results[:TOP_K]