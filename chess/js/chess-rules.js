/**
 * Complete FIDE-Compliant Chess Rules Engine
 * Supports full legal move generation, castling, en passant, promotion,
 * check/checkmate/stalemate, threefold repetition, 50-move rule,
 * insufficient material, SAN notation, FEN, PGN, and fast AI search helpers.
 */

export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

export const MATERIAL_POINTS = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export function coordsToSquare(r, c) {
  if (r < 0 || r > 7 || c < 0 || c > 7) return null;
  return FILES[c] + RANKS[r];
}

export function squareToCoords(sq) {
  if (!sq || sq.length < 2) return null;
  const c = FILES.indexOf(sq[0]);
  const r = RANKS.indexOf(sq[1]);
  if (c === -1 || r === -1) return null;
  return { r, c };
}

export class ChessGame {
  constructor(fen = INITIAL_FEN) {
    this.reset(fen);
  }

  reset(fen = INITIAL_FEN) {
    this.board = Array.from({ length: 8 }, () => Array(8).fill(null));
    this.turn = 'w';
    this.castling = { wK: true, wQ: true, bK: true, bQ: true };
    this.epSquare = null; // { r, c } or null
    this.halfMoves = 0;
    this.fullMoves = 1;
    this.history = [];
    this.positionCounts = new Map();
    this.customResult = null; // For resignation, timeout, draw agreement
    this.loadFen(fen);
  }

  clone() {
    const copy = new ChessGame(this.toFen());
    copy.history = this.history.map(h => ({ ...h }));
    copy.positionCounts = new Map(this.positionCounts);
    copy.customResult = this.customResult ? { ...this.customResult } : null;
    return copy;
  }

  loadFen(fen) {
    const parts = fen.trim().split(/\s+/);
    if (parts.length < 4) {
      throw new Error('Invalid FEN string: ' + fen);
    }

    const [placement, turn, castlingStr, epStr, halfStr, fullStr] = parts;
    const rows = placement.split('/');
    if (rows.length !== 8) {
      throw new Error('Invalid FEN board rows: ' + fen);
    }

    this.board = Array.from({ length: 8 }, () => Array(8).fill(null));
    for (let r = 0; r < 8; r++) {
      let c = 0;
      for (const ch of rows[r]) {
        if (ch >= '1' && ch <= '8') {
          c += parseInt(ch, 10);
        } else {
          const color = ch === ch.toUpperCase() ? 'w' : 'b';
          const type = ch.toLowerCase();
          this.board[r][c] = { type, color };
          c++;
        }
      }
    }

    this.turn = turn === 'b' ? 'b' : 'w';
    this.castling = {
      wK: castlingStr.includes('K'),
      wQ: castlingStr.includes('Q'),
      bK: castlingStr.includes('k'),
      bQ: castlingStr.includes('q')
    };

    this.epSquare = epStr && epStr !== '-' ? squareToCoords(epStr) : null;
    this.halfMoves = halfStr ? parseInt(halfStr, 10) || 0 : 0;
    this.fullMoves = fullStr ? parseInt(fullStr, 10) || 1 : 1;
    this.history = [];
    this.positionCounts = new Map();
    this.customResult = null;
    this._recordPosition();
  }

  getPositionKey() {
    let key = '';
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (!p) {
          empty++;
        } else {
          if (empty > 0) {
            key += empty;
            empty = 0;
          }
          key += p.color === 'w' ? p.type.toUpperCase() : p.type;
        }
      }
      if (empty > 0) key += empty;
      if (r < 7) key += '/';
    }
    let castlingStr = '';
    if (this.castling.wK) castlingStr += 'K';
    if (this.castling.wQ) castlingStr += 'Q';
    if (this.castling.bK) castlingStr += 'k';
    if (this.castling.bQ) castlingStr += 'q';
    if (!castlingStr) castlingStr = '-';

    const epStr = this.epSquare ? coordsToSquare(this.epSquare.r, this.epSquare.c) : '-';
    return `${key} ${this.turn} ${castlingStr} ${epStr}`;
  }

  toFen() {
    return `${this.getPositionKey()} ${this.halfMoves} ${this.fullMoves}`;
  }

  _recordPosition() {
    const key = this.getPositionKey();
    this.positionCounts.set(key, (this.positionCounts.get(key) || 0) + 1);
  }

  _unrecordPosition() {
    const key = this.getPositionKey();
    const count = this.positionCounts.get(key) || 0;
    if (count <= 1) {
      this.positionCounts.delete(key);
    } else {
      this.positionCounts.set(key, count - 1);
    }
  }

  getPiece(square) {
    const coords = typeof square === 'string' ? squareToCoords(square) : square;
    if (!coords) return null;
    return this.board[coords.r]?.[coords.c] || null;
  }

  findKing(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.color === color && p.type === 'k') {
          return { r, c };
        }
      }
    }
    return null;
  }

  /**
   * Returns true if square (r, c) is attacked by `attackerColor`.
   */
  isSquareAttacked(r, c, attackerColor) {
    // 1. Pawn attacks
    const pawnRow = attackerColor === 'w' ? r + 1 : r - 1;
    if (pawnRow >= 0 && pawnRow < 8) {
      if (c - 1 >= 0) {
        const p = this.board[pawnRow][c - 1];
        if (p && p.color === attackerColor && p.type === 'p') return true;
      }
      if (c + 1 < 8) {
        const p = this.board[pawnRow][c + 1];
        if (p && p.color === attackerColor && p.type === 'p') return true;
      }
    }

    // 2. Knight attacks
    const knightOffsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, dc] of knightOffsets) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const p = this.board[nr][nc];
        if (p && p.color === attackerColor && p.type === 'n') return true;
      }
    }

    // 3. King attacks
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const p = this.board[nr][nc];
          if (p && p.color === attackerColor && p.type === 'k') return true;
        }
      }
    }

    // 4. Orthogonal rays (Rook / Queen)
    const orthoDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of orthoDirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const p = this.board[nr][nc];
        if (p) {
          if (p.color === attackerColor && (p.type === 'r' || p.type === 'q')) {
            return true;
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }

    // 5. Diagonal rays (Bishop / Queen)
    const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of diagDirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const p = this.board[nr][nc];
        if (p) {
          if (p.color === attackerColor && (p.type === 'b' || p.type === 'q')) {
            return true;
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }

    return false;
  }

  inCheck(color = this.turn) {
    const king = this.findKing(color);
    if (!king) return false;
    const enemy = color === 'w' ? 'b' : 'w';
    return this.isSquareAttacked(king.r, king.c, enemy);
  }

  /**
   * Generates pseudo-legal moves for the piece at (r, c).
   */
  _generatePseudoMovesForSquare(r, c) {
    const piece = this.board[r][c];
    if (!piece) return [];
    const { type, color } = piece;
    const enemy = color === 'w' ? 'b' : 'w';
    const moves = [];
    const fromSq = coordsToSquare(r, c);

    const addMove = (tr, tc, flags = {}) => {
      const toSq = coordsToSquare(tr, tc);
      const target = this.board[tr][tc];
      moves.push({
        from: fromSq,
        to: toSq,
        fromR: r,
        fromC: c,
        toR: tr,
        toC: tc,
        piece: type,
        color,
        captured: flags.ep ? 'p' : (target ? target.type : null),
        promotion: flags.promotion || null,
        ep: !!flags.ep,
        castling: flags.castling || null
      });
    };

    if (type === 'p') {
      const dir = color === 'w' ? -1 : 1;
      const startRank = color === 'w' ? 6 : 1;
      const promoRank = color === 'w' ? 0 : 7;
      const nextR = r + dir;

      if (nextR >= 0 && nextR < 8) {
        // Forward 1
        if (!this.board[nextR][c]) {
          if (nextR === promoRank) {
            for (const promo of ['q', 'r', 'b', 'n']) {
              addMove(nextR, c, { promotion: promo });
            }
          } else {
            addMove(nextR, c);
            // Forward 2 from starting rank
            const doubleR = r + dir * 2;
            if (r === startRank && !this.board[doubleR][c]) {
              addMove(doubleR, c);
            }
          }
        }

        // Captures (left & right)
        for (const dc of [-1, 1]) {
          const nc = c + dc;
          if (nc < 0 || nc >= 8) continue;
          const target = this.board[nextR][nc];
          if (target && target.color === enemy) {
            if (nextR === promoRank) {
              for (const promo of ['q', 'r', 'b', 'n']) {
                addMove(nextR, nc, { promotion: promo });
              }
            } else {
              addMove(nextR, nc);
            }
          } else if (
            this.epSquare &&
            this.epSquare.r === nextR &&
            this.epSquare.c === nc
          ) {
            addMove(nextR, nc, { ep: true });
          }
        }
      }
    } else if (type === 'n') {
      const offsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      for (const [dr, dc] of offsets) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const target = this.board[nr][nc];
          if (!target || target.color === enemy) {
            addMove(nr, nc);
          }
        }
      }
    } else if (type === 'b' || type === 'r' || type === 'q') {
      const dirs = [];
      if (type === 'b' || type === 'q') {
        dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
      }
      if (type === 'r' || type === 'q') {
        dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
      }
      for (const [dr, dc] of dirs) {
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const target = this.board[nr][nc];
          if (!target) {
            addMove(nr, nc);
          } else {
            if (target.color === enemy) {
              addMove(nr, nc);
            }
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
    } else if (type === 'k') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const target = this.board[nr][nc];
            if (!target || target.color === enemy) {
              addMove(nr, nc);
            }
          }
        }
      }

      // Castling
      const homeRow = color === 'w' ? 7 : 0;
      if (r === homeRow && c === 4 && !this.isSquareAttacked(homeRow, 4, enemy)) {
        const canK = color === 'w' ? this.castling.wK : this.castling.bK;
        const canQ = color === 'w' ? this.castling.wQ : this.castling.bQ;

        // Kingside
        if (
          canK &&
          !this.board[homeRow][5] &&
          !this.board[homeRow][6] &&
          this.board[homeRow][7]?.type === 'r' &&
          this.board[homeRow][7]?.color === color &&
          !this.isSquareAttacked(homeRow, 5, enemy) &&
          !this.isSquareAttacked(homeRow, 6, enemy)
        ) {
          addMove(homeRow, 6, { castling: 'k' });
        }

        // Queenside
        if (
          canQ &&
          !this.board[homeRow][3] &&
          !this.board[homeRow][2] &&
          !this.board[homeRow][1] &&
          this.board[homeRow][0]?.type === 'r' &&
          this.board[homeRow][0]?.color === color &&
          !this.isSquareAttacked(homeRow, 3, enemy) &&
          !this.isSquareAttacked(homeRow, 2, enemy)
        ) {
          addMove(homeRow, 2, { castling: 'q' });
        }
      }
    }

    return moves;
  }

  /**
   * Fast low-level state mutation for legality testing & AI search.
   */
  makeMoveFast(move) {
    const prev = {
      turn: this.turn,
      castling: { ...this.castling },
      epSquare: this.epSquare ? { ...this.epSquare } : null,
      halfMoves: this.halfMoves,
      fullMoves: this.fullMoves,
      capturedPiece: this.board[move.toR][move.toC],
      epCapturedPiece: null,
      epCapturedPos: null
    };

    const movingPiece = this.board[move.fromR][move.fromC];
    this.board[move.fromR][move.fromC] = null;

    if (move.ep) {
      const capR = move.fromR;
      const capC = move.toC;
      prev.epCapturedPiece = this.board[capR][capC];
      prev.epCapturedPos = { r: capR, c: capC };
      this.board[capR][capC] = null;
    }

    if (move.castling === 'k') {
      const row = move.fromR;
      this.board[row][5] = this.board[row][7];
      this.board[row][7] = null;
    } else if (move.castling === 'q') {
      const row = move.fromR;
      this.board[row][3] = this.board[row][0];
      this.board[row][0] = null;
    }

    this.board[move.toR][move.toC] = move.promotion
      ? { type: move.promotion, color: movingPiece.color }
      : movingPiece;

    // Update castling rights
    if (movingPiece.type === 'k') {
      if (movingPiece.color === 'w') {
        this.castling.wK = false;
        this.castling.wQ = false;
      } else {
        this.castling.bK = false;
        this.castling.bQ = false;
      }
    }
    if (move.fromR === 7 && move.fromC === 0) this.castling.wQ = false;
    if (move.fromR === 7 && move.fromC === 7) this.castling.wK = false;
    if (move.fromR === 0 && move.fromC === 0) this.castling.bQ = false;
    if (move.fromR === 0 && move.fromC === 7) this.castling.bK = false;

    if (move.toR === 7 && move.toC === 0) this.castling.wQ = false;
    if (move.toR === 7 && move.toC === 7) this.castling.wK = false;
    if (move.toR === 0 && move.toC === 0) this.castling.bQ = false;
    if (move.toR === 0 && move.toC === 7) this.castling.bK = false;

    // Update en-passant target square
    if (movingPiece.type === 'p' && Math.abs(move.toR - move.fromR) === 2) {
      this.epSquare = {
        r: (move.fromR + move.toR) >> 1,
        c: move.fromC
      };
    } else {
      this.epSquare = null;
    }

    // Halfmove clock & fullmove counter
    if (movingPiece.type === 'p' || move.captured) {
      this.halfMoves = 0;
    } else {
      this.halfMoves++;
    }

    if (this.turn === 'b') {
      this.fullMoves++;
    }
    this.turn = this.turn === 'w' ? 'b' : 'w';

    return prev;
  }

  undoMoveFast(move, prev) {
    this.turn = prev.turn;
    this.castling = prev.castling;
    this.epSquare = prev.epSquare;
    this.halfMoves = prev.halfMoves;
    this.fullMoves = prev.fullMoves;

    const movedPiece = { type: move.piece, color: move.color };
    this.board[move.fromR][move.fromC] = movedPiece;
    this.board[move.toR][move.toC] = prev.capturedPiece;

    if (move.ep && prev.epCapturedPos) {
      this.board[prev.epCapturedPos.r][prev.epCapturedPos.c] = prev.epCapturedPiece;
    }

    if (move.castling === 'k') {
      const row = move.fromR;
      this.board[row][7] = this.board[row][5];
      this.board[row][5] = null;
    } else if (move.castling === 'q') {
      const row = move.fromR;
      this.board[row][0] = this.board[row][3];
      this.board[row][3] = null;
    }
  }

  _isMoveLegal(move) {
    const prev = this.makeMoveFast(move);
    const legal = !this.inCheck(move.color);
    this.undoMoveFast(move, prev);
    return legal;
  }

  getLegalMoves(fromSquare = null) {
    if (this.customResult) return [];

    if (fromSquare) {
      const coords = typeof fromSquare === 'string' ? squareToCoords(fromSquare) : fromSquare;
      if (!coords) return [];
      const p = this.board[coords.r]?.[coords.c];
      if (!p || p.color !== this.turn) return [];
      const pseudo = this._generatePseudoMovesForSquare(coords.r, coords.c);
      return pseudo.filter(m => this._isMoveLegal(m));
    }

    return this.getAllLegalMoves(this.turn);
  }

  getAllLegalMoves(color = this.turn) {
    const savedTurn = this.turn;
    this.turn = color;
    const legalMoves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.color === color) {
          const pseudo = this._generatePseudoMovesForSquare(r, c);
          for (const m of pseudo) {
            if (this._isMoveLegal(m)) {
              legalMoves.push(m);
            }
          }
        }
      }
    }
    this.turn = savedTurn;
    return legalMoves;
  }

  /**
   * Formats a legal move into Standard Algebraic Notation (SAN) before it is played.
   */
  _toSan(move, allLegalMoves) {
    if (move.castling === 'k') return 'O-O';
    if (move.castling === 'q') return 'O-O-O';

    let san = '';
    if (move.piece !== 'p') {
      san += move.piece.toUpperCase();
      // Check for ambiguity among other pieces of the same type and color moving to the same square
      const ambiguous = allLegalMoves.filter(
        m =>
          m.piece === move.piece &&
          m.to === move.to &&
          m.from !== move.from &&
          (!m.promotion || m.promotion === move.promotion)
      );
      if (ambiguous.length > 0) {
        const sameFile = ambiguous.some(m => m.from[0] === move.from[0]);
        const sameRank = ambiguous.some(m => m.from[1] === move.from[1]);
        if (!sameFile) {
          san += move.from[0];
        } else if (!sameRank) {
          san += move.from[1];
        } else {
          san += move.from;
        }
      }
    } else if (move.captured) {
      san += move.from[0];
    }

    if (move.captured) {
      san += 'x';
    }

    san += move.to;

    if (move.promotion) {
      san += '=' + move.promotion.toUpperCase();
    }

    return san;
  }

  /**
   * Executes a move by { from, to, promotion } or SAN string.
   * Returns rich move record or null if illegal.
   */
  makeMove(moveInput) {
    if (this.customResult) return null;

    const allLegal = this.getAllLegalMoves(this.turn);
    let chosen = null;

    if (typeof moveInput === 'string') {
      // Match SAN or UCI string
      const clean = moveInput.replace(/[+#!?]+$/g, '').trim();
      for (const m of allLegal) {
        const san = this._toSan(m, allLegal);
        const uci = m.from + m.to + (m.promotion || '');
        if (san === clean || moveInput === san || clean === uci) {
          chosen = m;
          break;
        }
      }
    } else if (moveInput && moveInput.from && moveInput.to) {
      const matching = allLegal.filter(
        m => m.from === moveInput.from && m.to === moveInput.to
      );
      if (matching.length === 1) {
        chosen = matching[0];
      } else if (matching.length > 1) {
        const wantPromo = (moveInput.promotion || 'q').toLowerCase();
        chosen = matching.find(m => m.promotion === wantPromo) || matching[0];
      }
    }

    if (!chosen) return null;

    let san = this._toSan(chosen, allLegal);
    const fenBefore = this.toFen();
    const prev = this.makeMoveFast(chosen);
    this._recordPosition();

    // Check if opponent is now in check or checkmated
    const givesCheck = this.inCheck(this.turn);
    const nextMoves = this.getAllLegalMoves(this.turn);
    if (givesCheck) {
      san += nextMoves.length === 0 ? '#' : '+';
    }

    const record = {
      ...chosen,
      san,
      fenBefore,
      fenAfter: this.toFen(),
      givesCheck,
      prev,
      moveNumber: prev.fullMoves
    };

    this.history.push(record);
    return record;
  }

  undoMove() {
    if (this.history.length === 0) return null;
    this.customResult = null;
    this._unrecordPosition();
    const last = this.history.pop();
    this.undoMoveFast(last, last.prev);
    return last;
  }

  isInsufficientMaterial() {
    const pieces = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.type !== 'k') {
          pieces.push({ ...p, r, c, sqColor: (r + c) % 2 });
        }
      }
    }
    // K vs K
    if (pieces.length === 0) return true;
    // K+N vs K or K+B vs K
    if (pieces.length === 1 && (pieces[0].type === 'n' || pieces[0].type === 'b')) {
      return true;
    }
    // K+B vs K+B with bishops on same color squares
    if (
      pieces.length === 2 &&
      pieces[0].type === 'b' &&
      pieces[1].type === 'b' &&
      pieces[0].sqColor === pieces[1].sqColor
    ) {
      return true;
    }
    return false;
  }

  isThreefoldRepetition() {
    const key = this.getPositionKey();
    return (this.positionCounts.get(key) || 0) >= 3;
  }

  setCustomResult(winner, reason) {
    const result =
      winner === 'w' ? '1-0' : winner === 'b' ? '0-1' : '1/2-1/2';
    this.customResult = {
      over: true,
      result,
      winner,
      reason
    };
  }

  getGameStatus() {
    if (this.customResult) {
      return { ...this.customResult };
    }

    const legalMoves = this.getAllLegalMoves(this.turn);
    const inCheckNow = this.inCheck(this.turn);

    if (legalMoves.length === 0) {
      if (inCheckNow) {
        const winner = this.turn === 'w' ? 'b' : 'w';
        return {
          over: true,
          result: winner === 'w' ? '1-0' : '0-1',
          winner,
          reason: 'checkmate'
        };
      }
      return {
        over: true,
        result: '1/2-1/2',
        winner: 'draw',
        reason: 'stalemate'
      };
    }

    if (this.halfMoves >= 100) {
      return {
        over: true,
        result: '1/2-1/2',
        winner: 'draw',
        reason: 'fifty-move'
      };
    }

    if (this.isThreefoldRepetition()) {
      return {
        over: true,
        result: '1/2-1/2',
        winner: 'draw',
        reason: 'threefold'
      };
    }

    if (this.isInsufficientMaterial()) {
      return {
        over: true,
        result: '1/2-1/2',
        winner: 'draw',
        reason: 'insufficient'
      };
    }

    return {
      over: false,
      result: '*',
      winner: null,
      reason: null,
      inCheck: inCheckNow
    };
  }

  /**
   * Computes captured pieces and material advantage for both sides.
   */
  getMaterialSummary() {
    const capturedByWhite = []; // Black pieces captured by White
    const capturedByBlack = []; // White pieces captured by Black

    for (const move of this.history) {
      if (move.captured) {
        if (move.color === 'w') {
          capturedByWhite.push(move.captured);
        } else {
          capturedByBlack.push(move.captured);
        }
      }
    }

    const order = { q: 1, r: 2, b: 3, n: 4, p: 5 };
    capturedByWhite.sort((a, b) => order[a] - order[b]);
    capturedByBlack.sort((a, b) => order[a] - order[b]);

    let whiteScore = 0;
    let blackScore = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p) {
          if (p.color === 'w') whiteScore += MATERIAL_POINTS[p.type];
          else blackScore += MATERIAL_POINTS[p.type];
        }
      }
    }

    return {
      capturedByWhite,
      capturedByBlack,
      whiteAdvantage: Math.max(0, whiteScore - blackScore),
      blackAdvantage: Math.max(0, blackScore - whiteScore)
    };
  }

  toPgn(headers = {}) {
    const status = this.getGameStatus();
    const defaultHeaders = {
      Event: 'Arcane Chess Match',
      Site: 'GitHub Pages',
      Date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
      White: headers.White || 'White',
      Black: headers.Black || 'Black',
      Result: status.result,
      ...headers
    };

    let pgn = '';
    for (const [k, v] of Object.entries(defaultHeaders)) {
      pgn += `[${k} "${v}"]\n`;
    }
    pgn += '\n';

    const pairs = [];
    for (let i = 0; i < this.history.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const wSan = this.history[i].san;
      const bSan = this.history[i + 1] ? ' ' + this.history[i + 1].san : '';
      pairs.push(`${moveNum}. ${wSan}${bSan}`);
    }
    pgn += pairs.join(' ');
    if (status.result !== '*') {
      pgn += (pgn.endsWith('\n') ? '' : ' ') + status.result;
    }
    return pgn.trim();
  }
}
