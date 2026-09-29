from app.engine import ChessEngine

engine = ChessEngine("engine/stockfish-windows-x86-64-avx2.exe")
fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
result = engine.analyze(fen)
print(result)
engine.close()