/**
 * Standard 2D Tournament Chess Board Renderer
 * Crisp vector Staunton SVG pieces, click-to-move + drag-and-drop,
 * coordinate labels, legal move indicators, last-move & check highlights,
 * and multiple board color themes.
 */

import { coordsToSquare, squareToCoords } from './chess-rules.js';

export const PIECE_SVGS = {
  w: {
    p: `<svg viewBox="0 0 45 45" class="chess-piece-svg"><path d="M 22.5,9 C 19.5,9 17,11.5 17,14.5 C 17,16.8 18.4,18.7 20.4,19.5 C 17.5,21 15.5,24 15.5,28.5 C 15.5,30.5 19,31 19,31 L 14,34.5 L 14,38 L 31,38 L 31,34.5 L 26,31 C 26,31 29.5,30.5 29.5,28.5 C 29.5,24 27.5,21 24.6,19.5 C 26.6,18.7 28,16.8 28,14.5 C 28,11.5 25.5,9 22.5,9 z" fill="#f8fafc" stroke="#1e293b" stroke-width="2" stroke-linecap="round"/></svg>`,
    r: `<svg viewBox="0 0 45 45" class="chess-piece-svg"><g fill="#f8fafc" stroke="#1e293b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 z"/><path d="M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 z"/><path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14"/><path d="M 34,14 L 31,17 L 14,17 L 11,14"/><path d="M 31,17 L 31,29.5 L 14,29.5 L 14,17"/><path d="M 14,29.5 L 12,32 L 33,32 L 31,29.5"/></g></svg>`,
    n: `<svg viewBox="0 0 45 45" class="chess-piece-svg"><g fill="#f8fafc" stroke="#1e293b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18"/><path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10"/><circle cx="15.5" cy="14.5" r="1.2" fill="#1e293b"/></g></svg>`,
    b: `<svg viewBox="0 0 45 45" class="chess-piece-svg"><g fill="#f8fafc" stroke="#1e293b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.646,38.99 6.677,38.97 6,38 C 7.354,36.06 9,36 9,36 z"/><path d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 22.5,10.5 C 11.5,14.5 12,24.5 17.5,26 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 z"/><circle cx="22.5" cy="8" r="2.2"/><path d="M 17.5,26 L 27.5,26 M 15,30 L 30,30 M 22.5,15.5 L 22.5,20.5 M 20,18 L 25,18"/></g></svg>`,
    q: `<svg viewBox="0 0 45 45" class="chess-piece-svg"><g fill="#f8fafc" stroke="#1e293b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 L 9,26 z"/><path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 27.5,24.5 17.5,24.5 9,26 z"/><circle cx="6" cy="12" r="1.8"/><circle cx="14" cy="9" r="1.8"/><circle cx="22.5" cy="8" r="1.8"/><circle cx="31" cy="9" r="1.8"/><circle cx="39" cy="12" r="1.8"/></g></svg>`,
    k: `<svg viewBox="0 0 45 45" class="chess-piece-svg"><g fill="#f8fafc" stroke="#1e293b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M 22.5,11.63 L 22.5,6"/><path d="M 20,8 L 25,8"/><path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 25.5,14.5 24.5,12 22.5,12 C 20.5,12 19.5,14.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25"/><path d="M 11.5,37 C 17,40.5 27,40.5 32.5,37 L 32.5,30 C 32.5,30 41.5,25.5 38.5,19.5 C 34.5,13 25,16 22.5,23.5 L 22.5,27 L 22.5,23.5 C 19,16 9.5,13 6.5,19.5 C 3.5,25.5 11.5,29.5 11.5,29.5 L 11.5,37 z"/><path d="M 11.5,30 C 17,27 27,27 32.5,30"/><path d="M 11.5,33.5 C 17,30.5 27,30.5 32.5,33.5"/><path d="M 11.5,37 C 17,34 27,34 32.5,37"/></g></svg>`
  },
  b: {
    p: `<svg viewBox="0 0 45 45" class="chess-piece-svg"><path d="M 22.5,9 C 19.5,9 17,11.5 17,14.5 C 17,16.8 18.4,18.7 20.4,19.5 C 17.5,21 15.5,24 15.5,28.5 C 15.5,30.5 19,31 19,31 L 14,34.5 L 14,38 L 31,38 L 31,34.5 L 26,31 C 26,31 29.5,30.5 29.5,28.5 C 29.5,24 27.5,21 24.6,19.5 C 26.6,18.7 28,16.8 28,14.5 C 28,11.5 25.5,9 22.5,9 z" fill="#1e293b" stroke="#f8fafc" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    r: `<svg viewBox="0 0 45 45" class="chess-piece-svg"><g fill="#1e293b" stroke="#f8fafc" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 z"/><path d="M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 z"/><path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14"/><path d="M 34,14 L 31,17 L 14,17 L 11,14"/><path d="M 31,17 L 31,29.5 L 14,29.5 L 14,17"/><path d="M 14,29.5 L 12,32 L 33,32 L 31,29.5"/></g></svg>`,
    n: `<svg viewBox="0 0 45 45" class="chess-piece-svg"><g fill="#1e293b" stroke="#f8fafc" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18"/><path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10"/><circle cx="15.5" cy="14.5" r="1.2" fill="#f8fafc"/></g></svg>`,
    b: `<svg viewBox="0 0 45 45" class="chess-piece-svg"><g fill="#1e293b" stroke="#f8fafc" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.646,38.99 6.677,38.97 6,38 C 7.354,36.06 9,36 9,36 z"/><path d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 22.5,10.5 C 11.5,14.5 12,24.5 17.5,26 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 z"/><circle cx="22.5" cy="8" r="2.2"/><path d="M 17.5,26 L 27.5,26 M 15,30 L 30,30 M 22.5,15.5 L 22.5,20.5 M 20,18 L 25,18"/></g></svg>`,
    q: `<svg viewBox="0 0 45 45" class="chess-piece-svg"><g fill="#1e293b" stroke="#f8fafc" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 L 9,26 z"/><path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 27.5,24.5 17.5,24.5 9,26 z"/><circle cx="6" cy="12" r="1.8"/><circle cx="14" cy="9" r="1.8"/><circle cx="22.5" cy="8" r="1.8"/><circle cx="31" cy="9" r="1.8"/><circle cx="39" cy="12" r="1.8"/></g></svg>`,
    k: `<svg viewBox="0 0 45 45" class="chess-piece-svg"><g fill="#1e293b" stroke="#f8fafc" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M 22.5,11.63 L 22.5,6"/><path d="M 20,8 L 25,8"/><path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 25.5,14.5 24.5,12 22.5,12 C 20.5,12 19.5,14.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25"/><path d="M 11.5,37 C 17,40.5 27,40.5 32.5,37 L 32.5,30 C 32.5,30 41.5,25.5 38.5,19.5 C 34.5,13 25,16 22.5,23.5 L 22.5,27 L 22.5,23.5 C 19,16 9.5,13 6.5,19.5 C 3.5,25.5 11.5,29.5 11.5,29.5 L 11.5,37 z"/><path d="M 11.5,30 C 17,27 27,27 32.5,30"/><path d="M 11.5,33.5 C 17,30.5 27,30.5 32.5,33.5"/><path d="M 11.5,37 C 17,34 27,34 32.5,37"/></g></svg>`
  }
};

export class Board2DRenderer {
  constructor(containerEl, onSquareSelect) {
    this.container = containerEl;
    this.onSquareSelect = onSquareSelect;
    this.orientation = 'w';
    this.selectedSquare = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.theme = 'classic';
    this.dragSourceSq = null;

    this._initDOM();
  }

  _initDOM() {
    this.container.innerHTML = '';
    this.gridEl = document.createElement('div');
    this.gridEl.className = `board-2d-grid theme-${this.theme}`;
    this.container.appendChild(this.gridEl);
  }

  setTheme(theme) {
    this.theme = theme;
    if (this.gridEl) {
      this.gridEl.className = `board-2d-grid theme-${this.theme}`;
    }
  }

  setOrientation(color) {
    this.orientation = color === 'b' ? 'b' : 'w';
  }

  render(game, selectedSquare = null, legalMoves = [], lastMove = null) {
    this.selectedSquare = selectedSquare;
    this.legalMoves = legalMoves || [];
    this.lastMove = lastMove;

    this.gridEl.innerHTML = '';
    const isFlipped = this.orientation === 'b';
    const inCheckColor = game.inCheck(game.turn) ? game.turn : null;
    const kingInCheckPos = inCheckColor ? game.findKing(inCheckColor) : null;
    const kingInCheckSq = kingInCheckPos
      ? coordsToSquare(kingInCheckPos.r, kingInCheckPos.c)
      : null;

    const legalMap = new Map();
    for (const m of this.legalMoves) {
      legalMap.set(m.to, m);
    }

    for (let visualR = 0; visualR < 8; visualR++) {
      for (let visualC = 0; visualC < 8; visualC++) {
        const r = isFlipped ? 7 - visualR : visualR;
        const c = isFlipped ? 7 - visualC : visualC;
        const sq = coordsToSquare(r, c);
        const isLight = (r + c) % 2 === 0;
        const piece = game.board[r][c];

        const cell = document.createElement('div');
        cell.className = `board-2d-square ${isLight ? 'sq-light' : 'sq-dark'}`;
        cell.dataset.square = sq;

        if (this.selectedSquare === sq) {
          cell.classList.add('sq-selected');
        }
        if (this.lastMove && (this.lastMove.from === sq || this.lastMove.to === sq)) {
          cell.classList.add('sq-last-move');
        }
        if (kingInCheckSq === sq) {
          cell.classList.add('sq-in-check');
        }

        // Coordinate labels along bottom rank and left file
        if (visualC === 0) {
          const rankLabel = document.createElement('span');
          rankLabel.className = 'coord-label coord-rank';
          rankLabel.textContent = sq[1];
          cell.appendChild(rankLabel);
        }
        if (visualR === 7) {
          const fileLabel = document.createElement('span');
          fileLabel.className = 'coord-label coord-file';
          fileLabel.textContent = sq[0];
          cell.appendChild(fileLabel);
        }

        // Legal move dot / capture ring
        const legalMove = legalMap.get(sq);
        if (legalMove) {
          const marker = document.createElement('div');
          marker.className =
            piece || legalMove.ep ? 'legal-capture-ring' : 'legal-move-dot';
          cell.appendChild(marker);
        }

        // Piece SVG
        if (piece) {
          const pieceWrap = document.createElement('div');
          pieceWrap.className = `piece-2d piece-${piece.color}`;
          pieceWrap.draggable = true;
          pieceWrap.innerHTML = PIECE_SVGS[piece.color][piece.type];

          pieceWrap.addEventListener('dragstart', e => {
            this.dragSourceSq = sq;
            e.dataTransfer.setData('text/plain', sq);
            this.onSquareSelect(sq, 'dragstart');
          });

          cell.appendChild(pieceWrap);
        }

        cell.addEventListener('click', () => {
          this.onSquareSelect(sq, 'click');
        });

        cell.addEventListener('dragover', e => {
          e.preventDefault();
        });

        cell.addEventListener('drop', e => {
          e.preventDefault();
          if (this.dragSourceSq && this.dragSourceSq !== sq) {
            this.onSquareSelect(sq, 'drop');
          }
          this.dragSourceSq = null;
        });

        this.gridEl.appendChild(cell);
      }
    }
  }
}
