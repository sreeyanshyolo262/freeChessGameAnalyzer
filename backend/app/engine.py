import chess
import chess.engine
import os

# Path to your local Stockfish binary. Defaults to backend/engine/<name>,
# matching the folder you set up originally. Override by setting the
# STOCKFISH_PATH environment variable if it lives somewhere else.
DEFAULT_ENGINE_PATH = os.path.join(
    os.path.dirname(__file__), "..", "engine", "stockfish-windows-x86-64-avx2.exe"
)
ENGINE_PATH = os.environ.get("STOCKFISH_PATH", DEFAULT_ENGINE_PATH)


class ChessEngine:
    """Wraps a local Stockfish binary via python-chess's UCI interface.
    Exposes the same analyze() method (returning evaluation + best move
    together) as the API-based version did, so analyzer.py works unchanged
    no matter which engine.py is plugged in."""

    def __init__(self, engine_path=None):
        self.engine_path = engine_path or ENGINE_PATH
        self.engine = chess.engine.SimpleEngine.popen_uci(self.engine_path)

    def analyze(self, fen, depth=15):
        board = chess.Board(fen)

        if board.is_game_over():
            # No legal moves here — nothing to analyze. board.turn is the
            # side who is stuck with no moves, i.e. the side who just got
            # checkmated (if it's checkmate at all).
            if board.is_checkmate():
                value = -15 if board.turn == chess.WHITE else 15
            else:
                value = 0.0  # stalemate / draw
            return {"evaluation": value, "best_move_uci": None, "best_move_san": None}

        result = self.engine.analyse(board, chess.engine.Limit(depth=depth))

        score = result["score"].white()  # absolute score, White's perspective
        if score.is_mate():
            mate_in = score.mate()
            value = 15 if mate_in > 0 else -15
        else:
            value = score.score() / 100  # centipawns -> pawns

        value = max(-15, min(15, value))

        best_move = result["pv"][0]
        return {
            "evaluation": value,
            "best_move_uci": best_move.uci(),
            "best_move_san": board.san(best_move),
        }

    # Kept for compatibility if anything still calls the older interface.
    def raw_eval(self, fen, depth=15):
        return self.analyze(fen, depth)["evaluation"]

    def raw_best_move(self, fen, depth=15):
        return self.analyze(fen, depth)["best_move_san"]

    def close(self):
        self.engine.quit()