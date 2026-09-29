import chess
import chess.pgn
import faiss
import numpy as np
import json
import os
from app.vectorize import position_to_vector

PGN_PATH = "data/games.pgn"
INDEX_PATH = "data/positions.index"
META_PATH = "data/positions_meta.json"

MAX_GAMES = 5000          # cap so this finishes in a reasonable time
SAMPLE_EVERY_PLIES = 6    # only index every 6th half-move, not every single one
SKIP_OPENING_PLIES = 14   # skip the first ~7 moves per side (too generic/booky)


def build():
    vectors = []
    metadata = []

    with open(PGN_PATH, encoding="utf-8", errors="ignore") as f:
        game_count = 0
        while game_count < MAX_GAMES:
            game = chess.pgn.read_game(f)
            if game is None:
                break
            game_count += 1

            headers = game.headers
            white = headers.get("White", "?")
            black = headers.get("Black", "?")
            white_elo = headers.get("WhiteElo", "?")
            black_elo = headers.get("BlackElo", "?")
            result = headers.get("Result", "*")

            board = game.board()
            ply = 0
            node = game
            while node.variations:
                next_node = node.variations[0]
                move = next_node.move

                if ply >= SKIP_OPENING_PLIES and ply % SAMPLE_EVERY_PLIES == 0:
                    san = board.san(move)
                    vectors.append(position_to_vector(board))
                    metadata.append({
                        "fen": board.fen(),
                        "next_move": san,
                        "white": white,
                        "black": black,
                        "white_elo": white_elo,
                        "black_elo": black_elo,
                        "result": result,
                        "ply": ply,
                    })

                board.push(move)
                ply += 1
                node = next_node

            if game_count % 500 == 0:
                print(f"Processed {game_count} games, {len(vectors)} positions indexed so far")

    print(f"Total: {game_count} games, {len(vectors)} positions")

    matrix = np.vstack(vectors)
    dim = matrix.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(matrix)

    os.makedirs("data", exist_ok=True)
    faiss.write_index(index, INDEX_PATH)
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f)

    print(f"Saved index ({index.ntotal} vectors, dim={dim}) and metadata to data/")


if __name__ == "__main__":
    build()