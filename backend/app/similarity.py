import faiss
import json
import chess
from app.vectorize import position_to_vector

INDEX_PATH = "data/positions.index"
META_PATH = "data/positions_meta.json"

_index = None
_metadata = None


def _load():
    global _index, _metadata
    if _index is None:
        _index = faiss.read_index(INDEX_PATH)
        with open(META_PATH, encoding="utf-8") as f:
            _metadata = json.load(f)
    return _index, _metadata


def find_similar(fen: str, k: int = 5):
    index, metadata = _load()
    board = chess.Board(fen)
    vec = position_to_vector(board).reshape(1, -1)
    distances, indices = index.search(vec, k)

    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx == -1:
            continue
        results.append({**metadata[idx], "distance": float(dist)})
    return results