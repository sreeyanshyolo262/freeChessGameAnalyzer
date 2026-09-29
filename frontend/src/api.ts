import axios from "axios";
import type { AnalyzeResponse, MoveResult, SimilarMatch, ChessComGame } from "./types";

const API_BASE = "http://127.0.0.1:8000";

export async function analyzeGame(pgn: string, depth: number = 12): Promise<AnalyzeResponse> {
  const response = await axios.post<AnalyzeResponse>(`${API_BASE}/analyze`, {
    pgn,
    depth,
  });
  return response.data;
}
export async function explainMove(move: MoveResult): Promise<string> {
  const response = await axios.post<{ explanation: string }>(`${API_BASE}/explain`, move);
  return response.data.explanation;
}

export async function findSimilar(fen: string, k: number = 5): Promise<SimilarMatch[]> {
  const response = await axios.post<{ matches: SimilarMatch[] }>(`${API_BASE}/similar`, { fen, k });
  return response.data.matches;
}

export async function fetchChessComGames(username: string, limit: number = 15): Promise<ChessComGame[]> {
  const response = await axios.get<{ games: ChessComGame[] }>(`${API_BASE}/chesscom/games`, {
    params: { username, limit },
  });
  return response.data.games;
}