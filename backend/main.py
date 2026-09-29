from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.analyzer import analyze_game, summarize_game
from app.explainer import explain_move
from app.similarity import find_similar
from app.chesscom import get_recent_games

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#ENGINE_PATH = "engine/stockfish-windows-x86-64-avx2.exe"


class PGNRequest(BaseModel):
    pgn: str
    depth: int = 10


class ExplainRequest(BaseModel):
    move_number: int
    player: str
    played_move: str
    best_move: str
    eval_before: float
    eval_after: float
    loss: float
    classification: str

class SimilarRequest(BaseModel):
    fen: str
    k: int = 5
@app.post("/analyze")
def analyze(request: PGNRequest):
    results = analyze_game(request.pgn, depth=request.depth)
    summary = summarize_game(results)
    return {"moves": results, "summary": summary}

@app.post("/explain")
def explain(request: ExplainRequest):
    explanation = explain_move(request.model_dump())
    return {"explanation": explanation}

@app.post("/similar")
def similar(request: SimilarRequest):
    results = find_similar(request.fen, request.k)
    return {"matches": results}

@app.get("/chesscom/games")
def chesscom_games(username: str, limit: int = 20):
    games = get_recent_games(username, limit)
    return {"games": games}