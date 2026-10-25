/**
 * Personality-Driven Chess AI Engine
 * Uses Alpha-Beta Pruning, Quiescence Search, MVV-LVA Move Ordering,
 * Piece-Square Tables (Middlegame/Endgame), and Bot Personality Modifiers.
 */

import { PIECE_VALUES } from './chess-rules.js';

// Piece-Square Tables from White's perspective (row 0 = rank 8, row 7 = rank 1)
const PST_PAWN = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 22, 22,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];

const PST_KNIGHT = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];

const PST_BISHOP = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  8, 12, 12,  8,  0,-10],
  [-10,  6,  6, 12, 12,  6,  6,-10],
  [-10,  0, 12, 12, 12, 12,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  6,  0,  0,  0,  0,  6,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20]
];

const PST_ROOK = [
  [ 0,  0,  0,  0,  0,  0,  0,  0],
  [ 8, 15, 15, 15, 15, 15, 15,  8],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [ 0,  0,  0,  8,  8,  0,  0,  0]
];

const PST_QUEEN = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [ -5,  0,  5,  5,  5,  5,  0, -5],
  [  0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20]
];

const PST_KING_MID = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [ 20, 20,  0,  0,  0,  0, 20, 20],
  [ 20, 35, 15,  0,  0, 15, 35, 20]
];

const PST_KING_END = [
  [-50,-40,-30,-20,-20,-30,-40,-50],
  [-30,-20,-10,  0,  0,-10,-20,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-30,  0,  0,  0,  0,-30,-30],
  [-50,-30,-30,-30,-30,-30,-30,-50]
];

const PST_MAP = {
  p: PST_PAWN,
  n: PST_KNIGHT,
  b: PST_BISHOP,
  r: PST_ROOK,
  q: PST_QUEEN
};

function scoreMoveOrder(move) {
  let score = 0;
  if (move.captured) {
    score += 10 * PIECE_VALUES[move.captured] - (PIECE_VALUES[move.piece] || 100) / 10;
  }
  if (move.promotion) {
    score += PIECE_VALUES[move.promotion];
  }
  if (move.castling) {
    score += 120;
  }
  return score;
}

/**
 * Evaluates board from `rootColor` perspective using personality weights.
 */
export function evaluatePosition(game, rootColor, config) {
  let whiteScore = 0;
  let blackScore = 0;
  let nonPawnMaterial = 0;
  let whiteBishops = 0;
  let blackBishops = 0;

  const wKing = game.findKing('w') || { r: 7, c: 4 };
  const bKing = game.findKing('b') || { r: 0, c: 4 };

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = game.board[r][c];
      if (!p) continue;
      if (p.type !== 'p' && p.type !== 'k') {
        nonPawnMaterial += PIECE_VALUES[p.type];
      }
      if (p.type === 'b') {
        if (p.color === 'w') whiteBishops++;
        else blackBishops++;
      }
    }
  }

  const isEndgame = nonPawnMaterial <= 2600;
  const posWeight = config.positional ?? 1.0;
  const aggrWeight = config.aggression ?? 1.0;
  const safetyWeight = config.kingSafety ?? 1.0;
  const knightMult = config.knightBias ?? 1.0;
  const bishopMult = config.bishopBias ?? 1.0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = game.board[r][c];
      if (!p) continue;

      let baseVal = PIECE_VALUES[p.type];
      if (p.type === 'n') baseVal *= knightMult;
      if (p.type === 'b') baseVal *= bishopMult;

      const tableRow = p.color === 'w' ? r : 7 - r;
      let pstBonus = 0;
      if (p.type === 'k') {
        const kTable = isEndgame ? PST_KING_END : PST_KING_MID;
        pstBonus = kTable[tableRow][c] * (isEndgame ? posWeight : safetyWeight);
      } else {
        pstBonus = (PST_MAP[p.type]?.[tableRow]?.[c] || 0) * posWeight;
      }

      // Aggression bonus: proximity of non-king pieces to enemy King
      let tropismBonus = 0;
      if (p.type !== 'k') {
        const targetKing = p.color === 'w' ? bKing : wKing;
        const dist = Math.abs(r - targetKing.r) + Math.abs(c - targetKing.c);
        tropismBonus = Math.max(0, 10 - dist) * 2.5 * aggrWeight;
      }

      if (p.color === 'w') {
        whiteScore += baseVal + pstBonus + tropismBonus;
      } else {
        blackScore += baseVal + pstBonus + tropismBonus;
      }
    }
  }

  // Bishop pair bonus
  if (whiteBishops >= 2) whiteScore += 35 * posWeight;
  if (blackBishops >= 2) blackScore += 35 * posWeight;

  // King pawn shield in middlegame
  if (!isEndgame) {
    if (wKing.r >= 6) {
      for (let dc = -1; dc <= 1; dc++) {
        const nc = wKing.c + dc;
        if (nc >= 0 && nc < 8 && game.board[wKing.r - 1]?.[nc]?.type === 'p' && game.board[wKing.r - 1]?.[nc]?.color === 'w') {
          whiteScore += 14 * safetyWeight;
        }
      }
    }
    if (bKing.r <= 1) {
      for (let dc = -1; dc <= 1; dc++) {
        const nc = bKing.c + dc;
        if (nc >= 0 && nc < 8 && game.board[bKing.r + 1]?.[nc]?.type === 'p' && game.board[bKing.r + 1]?.[nc]?.color === 'b') {
          blackScore += 14 * safetyWeight;
        }
      }
    }
  }

  const diff = whiteScore - blackScore;
  return rootColor === 'w' ? diff : -diff;
}

function quiescence(game, alpha, beta, maximizing, rootColor, config, qDepth, deadline) {
  const standPat = evaluatePosition(game, rootColor, config);

  if (qDepth <= 0 || Date.now() > deadline) {
    return standPat;
  }

  if (maximizing) {
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
  } else {
    if (standPat <= alpha) return alpha;
    if (standPat < beta) beta = standPat;
  }

  const allMoves = game.getAllLegalMoves(game.turn);
  const tacticalMoves = allMoves.filter(m => m.captured || m.promotion);
  if (tacticalMoves.length === 0) return standPat;

  tacticalMoves.sort((a, b) => scoreMoveOrder(b) - scoreMoveOrder(a));

  if (maximizing) {
    let best = standPat;
    for (const m of tacticalMoves) {
      const prev = game.makeMoveFast(m);
      const val = quiescence(game, alpha, beta, false, rootColor, config, qDepth - 1, deadline);
      game.undoMoveFast(m, prev);
      if (val > best) best = val;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = standPat;
    for (const m of tacticalMoves) {
      const prev = game.makeMoveFast(m);
      const val = quiescence(game, alpha, beta, true, rootColor, config, qDepth - 1, deadline);
      game.undoMoveFast(m, prev);
      if (val < best) best = val;
      if (best < beta) beta = best;
      if (alpha >= beta) break;
    }
    return best;
  }
}

function alphaBeta(game, depth, alpha, beta, maximizing, rootColor, config, deadline) {
  if (game.isThreefoldRepetition() || game.halfMoves >= 100 || game.isInsufficientMaterial()) {
    return 0;
  }

  const legalMoves = game.getAllLegalMoves(game.turn);
  if (legalMoves.length === 0) {
    if (game.inCheck(game.turn)) {
      // Checkmate: prefer faster mates
      const mateScore = 95000 + depth * 500;
      return maximizing ? -mateScore : mateScore;
    }
    return 0; // Stalemate
  }

  if (depth <= 0 || Date.now() > deadline) {
    if (config.useQuiescence) {
      return quiescence(game, alpha, beta, maximizing, rootColor, config, 3, deadline);
    }
    return evaluatePosition(game, rootColor, config);
  }

  legalMoves.sort((a, b) => scoreMoveOrder(b) - scoreMoveOrder(a));

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of legalMoves) {
      const prev = game.makeMoveFast(move);
      game._recordPosition();
      const ev = alphaBeta(game, depth - 1, alpha, beta, false, rootColor, config, deadline);
      game._unrecordPosition();
      game.undoMoveFast(move, prev);
      if (ev > maxEval) maxEval = ev;
      if (ev > alpha) alpha = ev;
      if (alpha >= beta) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of legalMoves) {
      const prev = game.makeMoveFast(move);
      game._recordPosition();
      const ev = alphaBeta(game, depth - 1, alpha, beta, true, rootColor, config, deadline);
      game._unrecordPosition();
      game.undoMoveFast(move, prev);
      if (ev < minEval) minEval = ev;
      if (ev < beta) beta = ev;
      if (alpha >= beta) break;
    }
    return minEval;
  }
}

/**
 * Selects the best move for the given bot personality.
 */
export function selectBotMove(game, bot) {
  const workingGame = game.clone();
  const rootColor = workingGame.turn;
  const legalMoves = workingGame.getAllLegalMoves(rootColor);
  if (legalMoves.length === 0) return null;
  if (legalMoves.length === 1) return legalMoves[0];

  const config = bot.aiConfig || {
    depth: 3,
    useQuiescence: true,
    noise: 20,
    blunderChance: 0,
    aggression: 1.0,
    kingSafety: 1.0,
    positional: 1.0,
    captureBias: 1.0
  };

  // 1. Check opening book in first 4 full moves if not in check
  const plyCount = workingGame.history.length;
  const moveIndexForSide = Math.floor(plyCount / 2);
  if (moveIndexForSide < 4 && !workingGame.inCheck(rootColor)) {
    const sideBook = bot.openings?.[rootColor];
    if (sideBook && sideBook.length > 0) {
      const lineIdx = (plyCount + workingGame.fullMoves) % sideBook.length;
      const preferredUci = sideBook[lineIdx]?.[moveIndexForSide];
      if (preferredUci) {
        const bookMove = legalMoves.find(m => m.from + m.to === preferredUci);
        if (bookMove) {
          // Verify book move doesn't immediately hang a piece to a trivial capture
          const prev = workingGame.makeMoveFast(bookMove);
          const oppCaptures = workingGame
            .getAllLegalMoves(workingGame.turn)
            .filter(m => m.to === bookMove.to && PIECE_VALUES[bookMove.piece] > 150);
          workingGame.undoMoveFast(bookMove, prev);
          if (oppCaptures.length === 0 || Math.random() < 0.35) {
            return bookMove;
          }
        }
      }
    }
  }

  // 2. Occasional low-Elo deliberate oversight for Pip / Barnaby
  if (config.blunderChance > 0 && Math.random() < config.blunderChance) {
    const nonMateMoves = legalMoves;
    return nonMateMoves[Math.floor(Math.random() * nonMateMoves.length)];
  }

  // 3. Determine search depth & time budget
  let searchDepth = config.depth || 3;
  // Boost depth in simplified endgames for stronger bots
  let pieceCount = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (workingGame.board[r][c]) pieceCount++;
    }
  }
  if (pieceCount <= 10 && config.endgameDepth) {
    searchDepth = config.endgameDepth;
  }

  const deadline = Date.now() + 650;
  legalMoves.sort((a, b) => scoreMoveOrder(b) - scoreMoveOrder(a));

  let bestMove = legalMoves[0];
  let bestScore = -Infinity;

  for (const move of legalMoves) {
    const prev = workingGame.makeMoveFast(move);
    workingGame._recordPosition();
    let score = alphaBeta(
      workingGame,
      searchDepth - 1,
      -Infinity,
      Infinity,
      false,
      rootColor,
      config,
      deadline
    );
    workingGame._unrecordPosition();
    workingGame.undoMoveFast(move, prev);

    // Apply personality capture bias at root
    if (move.captured && config.captureBias) {
      score += (config.captureBias - 1.0) * 45;
    }

    // Apply personality noise (simulates imperfect calculation at lower Elos)
    if (config.noise > 0) {
      score += (Math.random() - 0.5) * 2 * config.noise;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
