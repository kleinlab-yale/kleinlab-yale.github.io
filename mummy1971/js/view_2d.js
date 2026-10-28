/**
 * 1971 Milton Bradley "Voice of the Mummy" — Interactive 2D Orthographic Board View
 * Renders the perspective-rectified `textures/board_top_ortho.png` with an interactive SVG overlay
 * for all 82 spaces, 26 Emerald Scarab Jewels, Ruby Cobra, Great Jewel, Sarcophagus Lever, and 4 Explorers.
 */

import {
  BOARD_W,
  BOARD_H,
  BOARD_SPACES,
  SPACES_BY_ID,
  PLAYERS_CONFIG,
} from './board_data.js?v=2';

export class Mummy2DView {
  constructor(containerEl, callbacks = {}) {
    this.container = containerEl;
    this.callbacks = callbacks; // { onSpaceClick, onLeverClick }
    this.state = null;
    this.svgEl = null;
    this.spacesLayer = null;
    this.pathsLayer = null;
    this.jewelsLayer = null;
    this.sarcLayer = null;
    this.tokensLayer = null;
    this.tooltipEl = null;

    this._initDOM();
  }

  _initDOM() {
    this.container.innerHTML = `
      <div class="board2d-wrapper">
        <div class="board2d-stage">
          <img src="textures/board_top_ortho.png" alt="1971 Voice of the Mummy Orthographic Board" class="board2d-img" draggable="false" />
          <svg class="board2d-svg" viewBox="0 0 ${BOARD_W} ${BOARD_H}" preserveAspectRatio="xMidYMid meet">
            <defs>
              <radialGradient id="emeraldGemGrad" cx="35%" cy="30%" r="65%">
                <stop offset="0%" stop-color="#c2ffdb" />
                <stop offset="35%" stop-color="#22ff78" />
                <stop offset="80%" stop-color="#0bc452" />
                <stop offset="100%" stop-color="#045923" />
              </radialGradient>
              <radialGradient id="rubyGemGrad" cx="35%" cy="30%" r="65%">
                <stop offset="0%" stop-color="#ffb8c0" />
                <stop offset="35%" stop-color="#ff2442" />
                <stop offset="80%" stop-color="#bf0820" />
                <stop offset="100%" stop-color="#5c020d" />
              </radialGradient>
              <filter id="tokenShadow" x="-35%" y="-35%" width="170%" height="170%">
                <feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-color="#000" flood-opacity="0.8" />
              </filter>
              <filter id="emeraldGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="3.2" flood-color="#26ff7a" flood-opacity="0.95" />
              </filter>
              <filter id="rubyGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="4.0" flood-color="#ff2946" flood-opacity="0.95" />
              </filter>
            </defs>
            <g class="layer-spaces"></g>
            <g class="layer-paths"></g>
            <g class="layer-jewels"></g>
            <g class="layer-sarcophagus"></g>
            <g class="layer-tokens"></g>
          </svg>
          <div class="board2d-tooltip hidden"></div>
        </div>
      </div>
    `;

    this.svgEl = this.container.querySelector('.board2d-svg');
    this.spacesLayer = this.svgEl.querySelector('.layer-spaces');
    this.pathsLayer = this.svgEl.querySelector('.layer-paths');
    this.jewelsLayer = this.svgEl.querySelector('.layer-jewels');
    this.sarcLayer = this.svgEl.querySelector('.layer-sarcophagus');
    this.tokensLayer = this.svgEl.querySelector('.layer-tokens');
    this.tooltipEl = this.container.querySelector('.board2d-tooltip');

    this._buildStaticSpaceRects();
  }

  _buildStaticSpaceRects() {
    this.spaceEls = {};
    for (const sp of BOARD_SPACES) {
      const [x0, y0, x1, y1] = sp.rect;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'space-cell');
      g.dataset.spaceId = sp.id;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x0);
      rect.setAttribute('y', y0);
      rect.setAttribute('width', x1 - x0);
      rect.setAttribute('height', y1 - y0);
      rect.setAttribute('rx', 2);
      rect.setAttribute('class', 'space-hit-rect');
      g.appendChild(rect);

      // Subtle staircase indicator on spaces with up/down protruding steps
      if (sp.type === 'stairs') {
        const badge = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        badge.setAttribute('cx', sp.px);
        badge.setAttribute('cy', sp.py);
        badge.setAttribute('r', 5);
        badge.setAttribute('class', 'stairs-dot-indicator');
        g.appendChild(badge);
      }

      g.addEventListener('mouseenter', (e) => {
        this._showTooltip(sp, e);
      });
      g.addEventListener('mousemove', (e) => {
        this._moveTooltip(e);
      });
      g.addEventListener('mouseleave', () => {
        this.tooltipEl.classList.add('hidden');
      });
      g.addEventListener('click', () => {
        const mode = g.dataset.highlightMode;
        if (mode && this.callbacks.onSpaceClick) {
          this.callbacks.onSpaceClick(sp.id, mode);
        }
      });

      this.spacesLayer.appendChild(g);
      this.spaceEls[sp.id] = g;
    }
  }

  _showTooltip(sp, e) {
    let extra = '';
    if (this.state?.boardJewels?.[sp.id]) {
      extra = ' • 💎 Emerald Scarab Available';
    } else if (sp.type === 'mummy_head') {
      extra = ' • 🗣️ Pull Sarcophagus Lever';
    } else if (sp.type === 'great_jewel') {
      extra = this.state?.greatJewelUnlocked
        ? ' • 👑 GREAT JEWEL UNLOCKED!'
        : ' • 🔒 Collect all 6 Level 3 Jewels first';
    } else if (sp.upSpaceId || sp.downSpaceId) {
      extra = ' • 🪜 Level Change Steps';
    }
    this.tooltipEl.textContent = `Level ${sp.level}: ${sp.label}${extra}`;
    this.tooltipEl.classList.remove('hidden');
    this._moveTooltip(e);
  }

  _moveTooltip(e) {
    const stageRect = this.container.querySelector('.board2d-stage').getBoundingClientRect();
    const x = e.clientX - stageRect.left;
    const y = e.clientY - stageRect.top;
    this.tooltipEl.style.left = `${Math.min(stageRect.width - 180, Math.max(12, x + 14))}px`;
    this.tooltipEl.style.top = `${Math.max(12, y - 34)}px`;
  }

  syncWithState(state) {
    this.state = state;
    if (!state) return;

    this._renderSpaceHighlights(state);
    this._renderJewels(state);
    this._renderSarcophagusOverlay(state);
    this._renderExplorers(state);
  }

  _renderSpaceHighlights(state) {
    this.pathsLayer.innerHTML = '';
    for (const g of Object.values(this.spaceEls)) {
      g.dataset.highlightMode = '';
      g.setAttribute('class', 'space-cell');
    }

    // Highlight Great Jewel spaces when unlocked in Part I
    if (state.part === 1 && state.greatJewelUnlocked) {
      for (const gjId of ['L3_12', 'L3_25']) {
        const g = this.spaceEls[gjId];
        if (g) {
          g.classList.add('highlight-great-jewel');
          g.dataset.highlightMode = 'great_jewel_ready';
        }
      }
    }

    // Highlight legal move destinations (Clockwise & Counter-Clockwise)
    if (state.phase === 'CHOOSE_DIRECTION' && state.moveOptions) {
      const curPlayer = state.players[state.turnIndex];
      const cw = state.moveOptions.cw;
      if (cw && this.spaceEls[cw.targetId]) {
        const g = this.spaceEls[cw.targetId];
        g.classList.add('highlight-move-cw');
        g.dataset.highlightMode = 'move_cw';
        this._drawMovePathLine(curPlayer.spaceId, cw.path, '#2ee675', 'CW');
      }
      const ccw = state.moveOptions.ccw;
      if (ccw && this.spaceEls[ccw.targetId] && ccw.targetId !== cw?.targetId) {
        const g = this.spaceEls[ccw.targetId];
        g.classList.add('highlight-move-ccw');
        g.dataset.highlightMode = 'move_ccw';
        this._drawMovePathLine(curPlayer.spaceId, ccw.path, '#38a8ff', 'CCW');
      }
    }

    // Highlight end-of-turn Staircase / Corner Level Step options
    if (state.phase === 'CHOOSE_LEVEL_STEP' && state.levelStepOptions) {
      const { upSpaceId, downSpaceId } = state.levelStepOptions;
      if (upSpaceId && this.spaceEls[upSpaceId]) {
        const g = this.spaceEls[upSpaceId];
        g.classList.add('highlight-step-up');
        g.dataset.highlightMode = 'step_up';
        this._drawStepBadge(upSpaceId, '▲ UP', '#ffc83b');
      }
      if (downSpaceId && this.spaceEls[downSpaceId]) {
        const g = this.spaceEls[downSpaceId];
        g.classList.add('highlight-step-down');
        g.dataset.highlightMode = 'step_down';
        this._drawStepBadge(downSpaceId, '▼ DOWN', '#ff7b2e');
      }
    }
  }

  _drawMovePathLine(startSpaceId, pathIds, colorHex, labelText) {
    if (!pathIds || pathIds.length === 0) return;
    const pts = [SPACES_BY_ID[startSpaceId], ...pathIds.map((id) => SPACES_BY_ID[id])].filter(Boolean);
    const d = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.px} ${p.py}`).join(' ');

    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', d);
    pathEl.setAttribute('fill', 'none');
    pathEl.setAttribute('stroke', colorHex);
    pathEl.setAttribute('stroke-width', '3.5');
    pathEl.setAttribute('stroke-dasharray', '6 4');
    pathEl.setAttribute('stroke-linecap', 'round');
    this.pathsLayer.appendChild(pathEl);

    const endSp = pts[pts.length - 1];
    this._drawStepBadge(endSp.id, labelText === 'CW' ? '⟳ CLICK MOVE' : '⟲ CCW MOVE', colorHex);
  }

  _drawStepBadge(spaceId, text, colorHex) {
    const sp = SPACES_BY_ID[spaceId];
    if (!sp) return;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'svg-target-badge');
    g.style.cursor = 'pointer';

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', sp.px - 28);
    rect.setAttribute('y', sp.py - 9);
    rect.setAttribute('width', 56);
    rect.setAttribute('height', 18);
    rect.setAttribute('rx', 9);
    rect.setAttribute('fill', colorHex);
    rect.setAttribute('stroke', '#120d08');
    rect.setAttribute('stroke-width', '1.5');
    g.appendChild(rect);

    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', sp.px);
    txt.setAttribute('y', sp.py + 3.5);
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('fill', '#120d08');
    txt.setAttribute('font-size', '7.5');
    txt.setAttribute('font-weight', '800');
    txt.textContent = text;
    g.appendChild(txt);

    g.addEventListener('click', () => {
      const mode = this.spaceEls[spaceId]?.dataset?.highlightMode;
      if (mode && this.callbacks.onSpaceClick) {
        this.callbacks.onSpaceClick(spaceId, mode);
      }
    });
    this.pathsLayer.appendChild(g);
  }

  _renderJewels(state) {
    this.jewelsLayer.innerHTML = '';
    for (const sp of BOARD_SPACES) {
      if (sp.type === 'jewel' && state.boardJewels[sp.id]) {
        const isHorizontalTile = sp.px < 125 || sp.px > 344;
        const rx = isHorizontalTile ? 8.5 : 5.8;
        const ry = isHorizontalTile ? 5.8 : 8.5;

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('filter', 'url(#emeraldGlow)');
        g.style.pointerEvents = 'none';

        const el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        el.setAttribute('cx', sp.px);
        el.setAttribute('cy', sp.py);
        el.setAttribute('rx', rx * 1.12);
        el.setAttribute('ry', ry * 1.12);
        el.setAttribute('fill', 'url(#emeraldGemGrad)');
        el.setAttribute('stroke', '#e0ffeb');
        el.setAttribute('stroke-width', '1.4');
        g.appendChild(el);

        this.jewelsLayer.appendChild(g);
      }
    }
  }

  _renderSarcophagusOverlay(state) {
    this.sarcLayer.innerHTML = '';

    // 1. Ruby Cobra on Sarcophagus forehead if unowned
    if (!state.cobraOwner) {
      const cobraG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      cobraG.setAttribute('filter', 'url(#rubyGlow)');
      cobraG.innerHTML = `
        <circle cx="234.5" cy="182" r="12.5" fill="url(#rubyGemGrad)" stroke="#ffb8c0" stroke-width="1.8" />
        <text x="234.5" y="186" text-anchor="middle" font-size="11.5" fill="#fff">🐍</text>
      `;
      this.sarcLayer.appendChild(cobraG);
    }

    // 2. Great Mummy Jewel at the Mummy's feet if unowned
    if (!state.greatJewelOwner) {
      const gjG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      gjG.setAttribute('filter', 'url(#rubyGlow)');
      const haloClass = state.greatJewelUnlocked ? 'sarc-gem-unlocked' : '';
      gjG.innerHTML = `
        <circle cx="234.5" cy="456" r="16" fill="url(#rubyGemGrad)" stroke="#ffe055" stroke-width="2.2" class="${haloClass}" />
        <text x="234.5" y="460" text-anchor="middle" font-size="12.5" fill="#fff">💎</text>
      `;
      this.sarcLayer.appendChild(gjG);
    }

    // 3. Interactive Sarcophagus Lever when phase === 'PULL_LEVER'
    if (state.phase === 'PULL_LEVER') {
      const leverG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      leverG.setAttribute('class', 'sarc-lever-cta');
      leverG.style.cursor = 'pointer';
      leverG.innerHTML = `
        <rect x="148" y="285" width="173" height="58" rx="14" fill="rgba(20, 14, 8, 0.92)" stroke="#38ff7a" stroke-width="3" />
        <text x="234.5" y="311" text-anchor="middle" fill="#38ff7a" font-size="13" font-weight="800">🔊 PULL MUMMY LEVER</text>
        <text x="234.5" y="329" text-anchor="middle" fill="#f5e1a4" font-size="9.5" font-weight="600">Click to hear the Voice of the Mummy!</text>
      `;
      leverG.addEventListener('click', () => {
        if (this.callbacks.onLeverClick) {
          this.callbacks.onLeverClick();
        }
      });
      this.sarcLayer.appendChild(leverG);
    }
  }

  _renderExplorers(state) {
    this.tokensLayer.innerHTML = '';
    const activeTurnPlayer = state.players[state.turnIndex];

    const bySpace = {};
    for (const p of state.players) {
      if (!bySpace[p.spaceId]) bySpace[p.spaceId] = [];
      bySpace[p.spaceId].push(p);
    }

    for (const p of state.players) {
      const sp = SPACES_BY_ID[p.spaceId];
      if (!sp) continue;
      const cfg = PLAYERS_CONFIG.find((c) => c.id === p.id);
      const occ = bySpace[p.spaceId];

      let cx = sp.px;
      let cy = sp.py;
      if (sp.id === cfg.homeSpaceId && occ.length === 1) {
        cx = cfg.startStandPx.px;
        cy = cfg.startStandPx.py;
      } else if (occ.length > 1) {
        const idx = occ.findIndex((o) => o.id === p.id);
        const ang = (idx / occ.length) * Math.PI * 2;
        cx += Math.cos(ang) * 11;
        cy += Math.sin(ang) * 11;
      }

      const isCurrent = activeTurnPlayer?.id === p.id;
      const hasCobra = state.cobraOwner === p.id;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `explorer-token-2d ${isCurrent ? 'active-turn-token' : ''} ${hasCobra ? 'cursed-cobra-token' : ''}`);
      g.setAttribute('filter', hasCobra ? 'url(#rubyGlow)' : 'url(#tokenShadow)');
      g.style.pointerEvents = 'none';

      // Fiery red glowing Cobra Curse ring on the 2D board when holding the Cobra
      if (hasCobra) {
        const curseHalo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        curseHalo.setAttribute('cx', cx);
        curseHalo.setAttribute('cy', cy);
        curseHalo.setAttribute('r', 21);
        curseHalo.setAttribute('fill', 'rgba(255, 23, 51, 0.36)');
        curseHalo.setAttribute('stroke', '#ff1733');
        curseHalo.setAttribute('stroke-width', '3');
        curseHalo.setAttribute('class', 'cobra-curse-halo-2d');
        g.appendChild(curseHalo);
      }

      if (isCurrent) {
        const pulseRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        pulseRing.setAttribute('cx', cx);
        pulseRing.setAttribute('cy', cy);
        pulseRing.setAttribute('r', 17.5);
        pulseRing.setAttribute('fill', 'none');
        pulseRing.setAttribute('stroke', '#ffd700');
        pulseRing.setAttribute('stroke-width', '2.5');
        pulseRing.setAttribute('stroke-dasharray', '4 3');
        g.appendChild(pulseRing);
      }

      const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bgCircle.setAttribute('cx', cx);
      bgCircle.setAttribute('cy', cy);
      bgCircle.setAttribute('r', 13.5);
      bgCircle.setAttribute('fill', p.colorHex);
      bgCircle.setAttribute('stroke', isCurrent ? '#ffd700' : '#ffffff');
      bgCircle.setAttribute('stroke-width', isCurrent ? '2.8' : '1.8');
      g.appendChild(bgCircle);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', cx);
      label.setAttribute('y', cy + 4);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', '#ffffff');
      label.setAttribute('font-size', '10');
      label.setAttribute('font-weight', '800');
      label.textContent = p.deity.slice(0, 2).toUpperCase();
      g.appendChild(label);

      // Show tiny Cobra or Great Jewel badge on the explorer token if held
      if (state.cobraOwner === p.id) {
        const cBadge = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        cBadge.setAttribute('x', cx + 11);
        cBadge.setAttribute('y', cy - 8);
        cBadge.setAttribute('font-size', '10');
        cBadge.textContent = '🐍';
        g.appendChild(cBadge);
      }
      if (state.greatJewelOwner === p.id) {
        const gjBadge = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        gjBadge.setAttribute('x', cx - 14);
        gjBadge.setAttribute('y', cy - 8);
        gjBadge.setAttribute('font-size', '10');
        gjBadge.textContent = '👑';
        g.appendChild(gjBadge);
      }

      this.tokensLayer.appendChild(g);
    }
  }
}
