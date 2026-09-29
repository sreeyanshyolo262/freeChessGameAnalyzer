import chess
import chess.pgn
import io
from app.engine import ChessEngine


def classify(loss):
    if loss < 0.3:
        return "Excellent"
    elif loss < 0.7:
        return "Inaccuracy"
    elif loss < 1.5:
        return "Mistake"
    else:
        return "Blunder"


def analyze_game(pgn_text, depth=10):
    engine = ChessEngine()

    game = chess.pgn.read_game(io.StringIO(pgn_text))
    board = game.board()

    move_results = []
    move_number = 1

    # Analyze the starting position once, outside the loop.
    # This single call gives us BOTH the eval and the best-move
    # recommendation for whatever move is about to be played from here.
    current = engine.analyze(board.fen(), depth=depth)

    node = game
    while node.variations:
        next_node = node.variations[0]
        move = next_node.move
        player = "white" if board.turn == chess.WHITE else "black"

        eval_before = current["evaluation"]
        best_move = current["best_move_san"]

        played_san = board.san(move)
        board.push(move)

        if board.is_game_over():
            # Terminal position (checkmate, stalemate, insufficient material,
            # etc.) — there are no legal moves here, so chess-api.com can't
            # return a "best move" and errors out. Don't ask it to; fill in
            # a sensible eval ourselves instead.
            if board.is_checkmate():
                # the side who just moved delivered mate
                eval_after = 15 if player == "white" else -15
            else:
                eval_after = 0.0  # stalemate / draw
            current = {"evaluation": eval_after, "best_move_uci": None, "best_move_san": None}
        else:
            # One call per position, reused as "before" on the next loop —
            # same pattern as before, just now it also carries the best move.
            current = engine.analyze(board.fen(), depth=depth)
            eval_after = current["evaluation"]

        if player == "white":
            loss = eval_before - eval_after
        else:
            loss = eval_after - eval_before
        loss = max(0, loss)

        move_results.append({
            "move_number": move_number,
            "player": player,
            "played_move": played_san,
            "best_move": best_move,
            "eval_before": eval_before,
            "eval_after": eval_after,
            "loss": round(loss, 2),
            "classification": classify(loss)
        })

        if player == "black":
            move_number += 1

        node = next_node

    engine.close()
    return move_results


def summarize_game(move_results):
    summary = {
        "white": {"moves": 0, "total_loss": 0.0, "excellent": 0, "inaccuracy": 0, "mistake": 0, "blunder": 0},
        "black": {"moves": 0, "total_loss": 0.0, "excellent": 0, "inaccuracy": 0, "mistake": 0, "blunder": 0},
    }

    for move in move_results:
        side = summary[move["player"]]
        side["moves"] += 1
        side["total_loss"] += move["loss"]

        key = move["classification"].lower()
        side[key] += 1

    for side_name in ["white", "black"]:
        side = summary[side_name]
        avg_loss = side["total_loss"] / side["moves"] if side["moves"] > 0 else 0
        side["avg_loss"] = round(avg_loss, 3)
        side["accuracy"] = round(max(0, 100 - (avg_loss * 25)), 1)

    return summary