from app.analyzer import analyze_game

pgn = """
[Event "Casual Game"]
[White "Player1"]
[Black "Player2"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7
"""

results = analyze_game(pgn, "engine/stockfish-windows-x86-64-avx2.exe", depth=10)

for r in results:
    print(r)