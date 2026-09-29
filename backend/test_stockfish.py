import chess
import chess.engine

ENGINE_PATH = "engine/stockfish-windows-x86-64-avx2.exe"

engine = chess.engine.SimpleEngine.popen_uci(ENGINE_PATH)

board = chess.Board()

result = engine.analyse(
    board,
    chess.engine.Limit(depth=15)
)

print("Evaluation:", result["score"])
print("Best move:", result["pv"][0])

engine.quit()
