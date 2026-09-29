import chess
import numpy as np


def position_to_vector(board: chess.Board) -> np.ndarray:
    """Convert a chess position into a fixed-length, roughly-normalized feature vector."""
    vec = []

    # Piece counts per color (Pawn, Knight, Bishop, Rook, Queen) — normalized by a safe max of 8
    for color in [chess.WHITE, chess.BLACK]:
        for pt in [chess.PAWN, chess.KNIGHT, chess.BISHOP, chess.ROOK, chess.QUEEN]:
            vec.append(len(board.pieces(pt, color)) / 8.0)

    # Pawns per file, both colors — captures pawn structure shape
    for color in [chess.WHITE, chess.BLACK]:
        file_counts = [0] * 8
        for sq in board.pieces(chess.PAWN, color):
            file_counts[chess.square_file(sq)] += 1
        vec.extend([c / 2.0 for c in file_counts])

    # King location (file only, 0-7) — captures kingside/queenside/center castling patterns
    wk = board.king(chess.WHITE)
    bk = board.king(chess.BLACK)
    vec.append((chess.square_file(wk) if wk is not None else 4) / 7.0)
    vec.append((chess.square_file(bk) if bk is not None else 4) / 7.0)

    # Material balance
    values = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9}
    material = sum(
        values[pt] * (len(board.pieces(pt, chess.WHITE)) - len(board.pieces(pt, chess.BLACK)))
        for pt in values
    )
    vec.append(material / 39.0)

    # Side to move, mobility, game phase
    vec.append(1.0 if board.turn == chess.WHITE else 0.0)
    vec.append(min(board.legal_moves.count(), 40) / 40.0)
    vec.append(min(board.fullmove_number, 60) / 60.0)

    return np.array(vec, dtype=np.float32)