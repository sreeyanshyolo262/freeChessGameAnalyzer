export interface MoveResult {
  move_number: number;
  player: "white" | "black";
  played_move: string;
  best_move: string;
  eval_before: number;
  eval_after: number;
  loss: number;
  classification: "Excellent" | "Inaccuracy" | "Mistake" | "Blunder";
}

export interface SideSummary {
  moves: number;
  total_loss: number;
  excellent: number;
  inaccuracy: number;
  mistake: number;
  blunder: number;
  avg_loss: number;
  accuracy: number;
}

export interface AnalyzeResponse {
  moves: MoveResult[];
  summary: {
    white: SideSummary;
    black: SideSummary;
  };
}

export interface SimilarMatch {
  fen: string;
  next_move: string;
  white: string;
  black: string;
  white_elo: string;
  black_elo: string;
  result: string;
  ply: number;
  distance: number;
}

export interface ChessComGame {
  url: string;
  pgn: string;
  white: string;
  black: string;
  white_result: string;
  black_result: string;
  time_class: string;
  end_time: number;
}