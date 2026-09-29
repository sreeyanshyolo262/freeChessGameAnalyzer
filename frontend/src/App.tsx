import { useState, useMemo, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { analyzeGame, explainMove, findSimilar, fetchChessComGames } from "./api";
import type { AnalyzeResponse, MoveResult, SimilarMatch, ChessComGame } from "./types";
import "./App.css";

function classificationColor(c: string) {
  switch (c) {
    case "Blunder":
      return "#e74c3c";
    case "Mistake":
      return "#e67e22";
    case "Inaccuracy":
      return "#f1c40f";
    default:
      return "#2ecc71";
  }
}

function getSquaresForSan(fen: string, san: string): { from: string; to: string } | null {
  try {
    const chess = new Chess(fen);
    const move = chess.move(san);
    if (!move) return null;
    return { from: move.from, to: move.to };
  } catch {
    return null;
  }
}

function App() {
  const [pgnInput, setPgnInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [explorationFen, setExplorationFen] = useState<string | null>(null);
  const [showBestMoveArrow, setShowBestMoveArrow] = useState(true);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [similarMatches, setSimilarMatches] = useState<SimilarMatch[] | null>(null);
  const [findingSimilar, setFindingSimilar] = useState(false);
  const [chessComUsername, setChessComUsername] = useState("");
  const [chessComGames, setChessComGames] = useState<ChessComGame[] | null>(null);
  const [fetchingGames, setFetchingGames] = useState(false);
  const [chessComError, setChessComError] = useState<string | null>(null);

  const fens = useMemo(() => {
    const chess = new Chess();
    const list = [chess.fen()];
    if (!analysis) return list;
    for (const m of analysis.moves) {
      try {
        chess.move(m.played_move);
      } catch {
        // ignore
      }
      list.push(chess.fen());
    }
    return list;
  }, [analysis]);

  const fenBeforeCurrent = fens[currentMoveIndex] ?? fens[0];
  const replayFen = fens[currentMoveIndex + 1] ?? fens[0];
  const boardFen = explorationFen ?? replayFen;
  const isExploring = explorationFen !== null;

  const currentMove: MoveResult | null =
    analysis && currentMoveIndex >= 0 ? analysis.moves[currentMoveIndex] : null;

  const squareStyles = useMemo(() => {
    if (isExploring || !currentMove) return {};
    const styles: Record<string, React.CSSProperties> = {};
    const played = getSquaresForSan(fenBeforeCurrent, currentMove.played_move);
    if (played) {
      styles[played.from] = { backgroundColor: "rgba(74, 125, 255, 0.4)" };
      styles[played.to] = { backgroundColor: "rgba(74, 125, 255, 0.4)" };
    }
    return styles;
  }, [isExploring, currentMove, fenBeforeCurrent]);

  const arrows = useMemo(() => {
    if (isExploring || !currentMove || !showBestMoveArrow) return [];
    if (currentMove.played_move === currentMove.best_move) return [];
    const best = getSquaresForSan(fenBeforeCurrent, currentMove.best_move);
    if (!best) return [];
    return [{ startSquare: best.from, endSquare: best.to, color: "rgb(46, 204, 113)" }];
  }, [isExploring, currentMove, fenBeforeCurrent, showBestMoveArrow]);

  const moveBadge = useMemo(() => {
    if (isExploring || !currentMove) return null;
    const isBest = currentMove.played_move === currentMove.best_move;
    if (isBest) return { symbol: "★", color: "#5c9e3f", label: "Best Move" };
    switch (currentMove.classification) {
      case "Blunder":
        return { symbol: "??", color: "#e74c3c", label: "Blunder" };
      case "Mistake":
        return { symbol: "?", color: "#f39c12", label: "Mistake" };
      case "Inaccuracy":
        return { symbol: "?!", color: "#3498db", label: "Inaccuracy" };
      default:
        return null;
    }
  }, [isExploring, currentMove]);

  const badgeSquare = useMemo(() => {
    if (isExploring || !currentMove) return null;
    const squares = getSquaresForSan(fenBeforeCurrent, currentMove.played_move);
    return squares?.to ?? null;
  }, [isExploring, currentMove, fenBeforeCurrent]);

  const squareRenderer = useMemo(() => {
    return function Renderer({
      square,
      children,
    }: {
      square: string;
      piece: unknown;
      children?: React.ReactNode;
    }) {
      const showBadge = moveBadge && badgeSquare === square;
      return (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          {children}
          {showBadge && (
            <div className="move-badge" style={{ backgroundColor: moveBadge!.color }} title={moveBadge!.label}>
              {moveBadge!.symbol}
            </div>
          )}
        </div>
      );
    };
  }, [moveBadge, badgeSquare]);

  async function runAnalysis(pgn: string) {
    if (!pgn.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeGame(pgn, 12);
      setAnalysis(result);
      setCurrentMoveIndex(-1);
      setExplorationFen(null);
      setExplanation(null);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze game. Check that the backend is running and the PGN is valid.");
    } finally {
      setLoading(false);
    }
  }

  function handleAnalyze() {
    runAnalysis(pgnInput);
  }

  function handleSelectGame(pgn: string) {
    runAnalysis(pgn);
  }

  async function handleFetchGames() {
    if (!chessComUsername.trim()) return;
    setFetchingGames(true);
    setChessComError(null);
    setChessComGames(null);
    try {
      const games = await fetchChessComGames(chessComUsername.trim(), 15);
      if (games.length === 0) {
        setChessComError("No games found for this username.");
      } else {
        setChessComGames(games);
      }
    } catch (err) {
      console.error(err);
      setChessComError("Couldn't fetch games. Check the username and try again.");
    } finally {
      setFetchingGames(false);
    }
  }

  function handleNewAnalysis() {
    setAnalysis(null);
    setPgnInput("");
    setError(null);
    setExplanation(null);
    setCurrentMoveIndex(-1);
    setExplorationFen(null);
    setChessComGames(null);
    setChessComUsername("");
    setChessComError(null);
  }

  async function handleExplain() {
    if (!currentMove) return;
    setExplaining(true);
    setExplanation(null);
    try {
      const result = await explainMove(currentMove);
      setExplanation(result);
    } catch (err) {
      console.error(err);
      setExplanation("Couldn't generate an explanation — check that the backend and OpenRouter key are working.");
    } finally {
      setExplaining(false);
    }
  }

  async function handleFindSimilar() {
    setFindingSimilar(true);
    setSimilarMatches(null);
    try {
      const results = await findSimilar(fenBeforeCurrent, 5);
      setSimilarMatches(results);
    } catch (err) {
      console.error(err);
      setSimilarMatches([]);
    } finally {
      setFindingSimilar(false);
    }
  }

  function goToMove(index: number) {
    if (!analysis) return;
    setExplorationFen(null);
    const clamped = Math.max(-1, Math.min(index, analysis.moves.length - 1));
    setCurrentMoveIndex(clamped);
    setExplanation(null);
    setSimilarMatches(null);
  }

  function handlePieceDrop({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string | null;
  }): boolean {
    if (!targetSquare) return false;
    const baseFen = explorationFen ?? replayFen;
    const chess = new Chess(baseFen);
    try {
      const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
      if (!move) return false;
      setExplorationFen(chess.fen());
      return true;
    } catch {
      return false;
    }
  }

  function toggleExplore() {
    if (isExploring) {
      setExplorationFen(null);
    } else {
      setExplorationFen(replayFen);
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!analysis) return;
      if (e.key === "ArrowLeft") goToMove(currentMoveIndex - 1);
      else if (e.key === "ArrowRight") goToMove(currentMoveIndex + 1);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const currentEval = currentMove ? currentMove.eval_after : 0.2;

  // ── View 1: no analysis yet — Chess.com picker + manual PGN input ──
  if (!analysis) {
    return (
      <div className="app intro-screen">
        <h1>Chess Game Analyzer</h1>

        <div className="chesscom-section">
          <h3>Load from Chess.com</h3>
          <div className="chesscom-input-row">
            <input
              type="text"
              placeholder="chess.com username"
              value={chessComUsername}
              onChange={(e) => setChessComUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFetchGames()}
            />
            <button onClick={handleFetchGames} disabled={fetchingGames}>
              {fetchingGames ? "Fetching..." : "Fetch Games"}
            </button>
          </div>
          {chessComError && <p className="error">{chessComError}</p>}

          {chessComGames && (
            <div className="chesscom-games">
              {chessComGames.map((g, i) => {
                const result =
                  g.white_result === "win" ? "1-0" : g.black_result === "win" ? "0-1" : "½-½";
                const date = new Date(g.end_time * 1000).toLocaleDateString();
                return (
                  <div key={i} className="game-card" onClick={() => handleSelectGame(g.pgn)}>
                    <div className="game-card-players">
                      <span>{g.white}</span>
                      <span className="vs">vs</span>
                      <span>{g.black}</span>
                    </div>
                    <div className="game-card-meta">
                      <span>{g.time_class}</span>
                      <span>{date}</span>
                      <span className="game-result">{result}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="divider">or paste a PGN manually</div>

        <div className="pgn-input-section">
          <textarea
            placeholder="Paste PGN here..."
            value={pgnInput}
            onChange={(e) => setPgnInput(e.target.value)}
            rows={8}
          />
          <button onClick={handleAnalyze} disabled={loading}>
            {loading ? "Analyzing... (this can take 30-60s)" : "Analyze Game"}
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    );
  }

  // ── View 2: analysis loaded — board-centric review layout ──
  return (
    <div className="review-app">
      <div className="review-topbar">
        <button className="home-btn" onClick={handleNewAnalysis}>
          ← New Analysis
        </button>
        <h2>Game Review</h2>
        <div className="topbar-spacer" />
      </div>

      <div className="review-layout">
        <div className="board-area">
          <div className="board-with-bar">
            <EvalBar evaluation={currentEval} />
            <div className="board-wrapper-large">
              <Chessboard
                options={{
                  position: boardFen,
                  allowDragging: isExploring,
                  onPieceDrop: handlePieceDrop,
                  boardOrientation: boardOrientation,
                  squareStyles: squareStyles,
                  arrows: arrows,
                  squareRenderer: squareRenderer,
                }}
              />
            </div>
          </div>

          <div className="board-toolbar">
            <button onClick={() => setBoardOrientation((o) => (o === "white" ? "black" : "white"))}>
              Flip Board
            </button>
            <button onClick={toggleExplore} className={isExploring ? "active-toggle" : ""}>
              {isExploring ? "Exit Explore Mode" : "Explore Variations"}
            </button>
            <button
              onClick={() => setShowBestMoveArrow((s) => !s)}
              className={showBestMoveArrow ? "active-toggle" : ""}
            >
              {showBestMoveArrow ? "Hide Best Move" : "Show Best Move"}
            </button>
          </div>

          {isExploring && (
            <p className="explore-hint">
              Free exploration mode — drag pieces to try variations. Navigating snaps back to the analyzed game.
            </p>
          )}

          <div className="nav-controls">
            <button onClick={() => goToMove(-1)}>⏮</button>
            <button onClick={() => goToMove(currentMoveIndex - 1)}>◀</button>
            <button onClick={() => goToMove(currentMoveIndex + 1)}>▶</button>
            <button onClick={() => goToMove(analysis.moves.length - 1)}>⏭</button>
          </div>
        </div>

        <div className="side-panel">
          <SummaryPanel summary={analysis.summary} />

          <div className="explain-section">
            <button onClick={handleExplain} disabled={!currentMove || explaining} className="explain-btn">
              {explaining ? "Thinking..." : "🧠 Explain this move"}
            </button>
            {currentMove && (
              <div className="current-move-tag">
                {currentMove.player === "white" ? `${currentMove.move_number}.` : `${currentMove.move_number}...`}{" "}
                {currentMove.played_move}
                <span
                  className="badge inline-badge"
                  style={{ backgroundColor: classificationColor(currentMove.classification) }}
                >
                  {currentMove.classification}
                </span>
              </div>
            )}
            {explanation && <div className="explanation-box">{explanation}</div>}
            <button onClick={handleFindSimilar} disabled={findingSimilar} className="similar-btn">
              {findingSimilar ? "Searching..." : "🔍 Find Similar Positions"}
            </button>
            {similarMatches && (
              <div className="similar-matches">
                {similarMatches.length === 0 ? (
                  <p className="no-matches">No similar positions found.</p>
                ) : (
                  similarMatches.map((m, i) => (
                    <div key={i} className="match-card">
                      <div className="match-header">
                        <span>{m.white} ({m.white_elo})</span>
                        <span className="vs">vs</span>
                        <span>{m.black} ({m.black_elo})</span>
                      </div>
                      <div className="match-body">
                        <span className="match-move">Played: {m.next_move}</span>
                        <span className="match-result">{m.result}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <MoveList moves={analysis.moves} currentIndex={currentMoveIndex} onSelect={goToMove} />
        </div>
      </div>
    </div>
  );
}

function EvalBar({ evaluation }: { evaluation: number }) {
  const clamped = Math.max(-5, Math.min(5, evaluation));
  const whitePercent = 50 + clamped * 10;

  return (
    <div className="eval-bar">
      <div className="eval-bar-black" style={{ height: `${100 - whitePercent}%` }} />
      <div className="eval-bar-white" style={{ height: `${whitePercent}%` }} />
      <span className="eval-label">
        {evaluation > 0 ? "+" : ""}
        {evaluation.toFixed(1)}
      </span>
    </div>
  );
}

function MoveList({
  moves,
  currentIndex,
  onSelect,
}: {
  moves: MoveResult[];
  currentIndex: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="move-list">
      <h3>Moves</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Move</th>
            <th>Best</th>
            <th>Loss</th>
            <th>Class</th>
          </tr>
        </thead>
        <tbody>
          {moves.map((m, i) => (
            <tr key={i} className={i === currentIndex ? "active-row" : ""} onClick={() => onSelect(i)}>
              <td>{m.player === "white" ? `${m.move_number}.` : `${m.move_number}...`}</td>
              <td>{m.played_move}</td>
              <td>{m.played_move !== m.best_move ? m.best_move : "—"}</td>
              <td>{m.loss.toFixed(2)}</td>
              <td>
                <span className="badge" style={{ backgroundColor: classificationColor(m.classification) }}>
                  {m.classification}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryPanel({ summary }: { summary: AnalyzeResponse["summary"] }) {
  return (
    <div className="summary-panel">
      <h3>Summary</h3>
      <div className="summary-grid">
        <div>
          <strong>White</strong>
          <p>Accuracy: {summary.white.accuracy}%</p>
          <p>
            Blunders: {summary.white.blunder} | Mistakes: {summary.white.mistake} | Inacc: {summary.white.inaccuracy}
          </p>
        </div>
        <div>
          <strong>Black</strong>
          <p>Accuracy: {summary.black.accuracy}%</p>
          <p>
            Blunders: {summary.black.blunder} | Mistakes: {summary.black.mistake} | Inacc: {summary.black.inaccuracy}
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;