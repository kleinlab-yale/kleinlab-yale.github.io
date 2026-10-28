/**
 * 1971 Milton Bradley "Voice of the Mummy" — Main Application Controller
 * Integrates the 3D Three.js View, 2D Orthographic View, Authoritative Game Engine,
 * 40 Original MP3 Audio Tracks, and P2P Multiplayer (PeerJS + BroadcastChannel).
 */

import {
  PLAYERS_CONFIG,
  SPACES_BY_ID,
  SIDE_A_TRACKS,
  SIDE_B_TRACKS,
} from './board_data.js?v=3';
import { VoiceOfTheMummyEngine, TOP_LEVEL_JEWEL_IDS } from './game_engine.js?v=3';
import { Mummy3DView } from './view_3d.js?v=3';
import { Mummy2DView } from './view_2d.js?v=3';
import { MultiplayerManager } from './multiplayer.js?v=3';

class VoiceOfTheMummyApp {
  constructor() {
    this.viewMode = 'split'; // '3d' | '2d' | 'split'
    this.audioMuted = false;
    this.currentAudio = null;
    this.audioCtx = null;
    this.botTimer = null;

    this.engine = new VoiceOfTheMummyEngine(
      (state) => this._onAuthoritativeStateChange(state),
      (event) => this._onAuthoritativeEvent(event)
    );

    this.mp = new MultiplayerManager({
      onLobbyUpdate: (lobby) => this._renderLobbySeats(lobby),
      onGameState: (state) => this._onClientReceiveState(state),
      onGameEvent: (ev) => this._onClientReceiveEvent(ev),
      onPlayerAction: (action, payload, peerId) => this._handleIncomingPlayerAction(action, payload, peerId),
      onStatusChange: (statusText) => this._updateMultiplayerStatusBanner(statusText),
      onGuestJoined: (peerId, name, assignedSeatId) => {
        if (this.engine.state && assignedSeatId) {
          const p = this.engine.state.players.find((pl) => pl.id === assignedSeatId);
          if (p) {
            p.control = 'human';
            p.peerId = peerId;
            p.name = name || p.name;
          }
          // Also ensure Host player has Host's peerId
          const hostP = this.engine.state.players[0];
          if (hostP && hostP.peerId === 'local') {
            hostP.peerId = this.mp.myPeerId;
          }
          this._applyStateToUI(this.engine.state);
          this.mp.broadcastGameState(this.engine.state);
        }
      },
    });

    this.activeState = null;

    this._initViews();
    this._bindUIControls();
    this._buildSoundboardAndRulesModal();
    this._checkUrlRoomParam();
  }

  _initViews() {
    const container3D = document.getElementById('viewport-3d');
    const container2D = document.getElementById('viewport-2d');

    this.view3D = new Mummy3DView(container3D, {
      onSpaceClick: (spaceId, mode) => this._handleBoardSpaceClick(spaceId, mode),
      onLeverClick: () => this.triggerAction('pull_lever'),
      onDieClick: () => this.triggerAction('roll'),
      onModelLoaded: () => {
        const loadingEl = document.getElementById('loading-overlay-3d');
        if (loadingEl) loadingEl.classList.add('hidden');
      },
    });

    this.view2D = new Mummy2DView(container2D, {
      onSpaceClick: (spaceId, mode) => this._handleBoardSpaceClick(spaceId, mode),
      onLeverClick: () => this.triggerAction('pull_lever'),
    });

    this.setViewMode('split');
  }

  _bindUIControls() {
    // View Mode Switcher ('3d', '2d', 'split')
    document.querySelectorAll('[data-view-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.setViewMode(btn.dataset.viewMode);
      });
    });

    // 3D Camera Presets
    document.querySelectorAll('[data-cam-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.view3D.setCameraPreset(btn.dataset.camPreset);
      });
    });

    // Audio Mute Toggle
    const muteBtn = document.getElementById('btn-toggle-mute');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        this.audioMuted = !this.audioMuted;
        if (this.currentAudio) {
          this.currentAudio.muted = this.audioMuted;
        }
        muteBtn.textContent = this.audioMuted ? '🔇 Audio Muted' : '🔊 Audio On';
      });
    }

    // Lobby Modal Open / Close
    document.getElementById('btn-open-lobby')?.addEventListener('click', () => {
      document.getElementById('modal-lobby')?.classList.remove('hidden');
    });
    document.getElementById('btn-close-lobby')?.addEventListener('click', () => {
      if (this.activeState) {
        document.getElementById('modal-lobby')?.classList.add('hidden');
      }
    });

    // Rules & Soundboard Modal Open / Close
    document.getElementById('btn-open-rules')?.addEventListener('click', () => {
      document.getElementById('modal-rules')?.classList.remove('hidden');
    });
    document.getElementById('btn-close-rules')?.addEventListener('click', () => {
      document.getElementById('modal-rules')?.classList.add('hidden');
    });

    // Multiplayer Host / Join Controls in Lobby
    document.getElementById('btn-host-room')?.addEventListener('click', async () => {
      const hostName = document.getElementById('input-player-name')?.value?.trim() || 'Host Explorer';
      const code = await this.mp.hostRoom(hostName);
      this._showRoomShareBox(code);
    });

    document.getElementById('btn-join-room')?.addEventListener('click', async () => {
      const codeInput = document.getElementById('input-room-code')?.value?.trim();
      const guestName = document.getElementById('input-player-name')?.value?.trim() || 'Guest Explorer';
      if (!codeInput) return;
      await this.mp.joinRoom(codeInput, guestName);
      this._showRoomShareBox(this.mp.roomCode);
    });

    document.getElementById('btn-copy-invite')?.addEventListener('click', () => {
      const url = this.mp.getShareableInviteUrl();
      navigator.clipboard?.writeText(url);
      const btn = document.getElementById('btn-copy-invite');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = '✅ Link Copied!';
        setTimeout(() => {
          btn.textContent = orig;
        }, 2000);
      }
    });

    // Start Game Button in Lobby
    document.getElementById('btn-start-game')?.addEventListener('click', () => {
      this._startNewGameFromLobby();
    });

    // Quick-Start Preset Buttons in Lobby
    document.getElementById('btn-preset-solo')?.addEventListener('click', () => {
      this._applySeatPreset('solo_3ai');
    });
    document.getElementById('btn-preset-2p')?.addEventListener('click', () => {
      this._applySeatPreset('pass_2p');
    });
    document.getElementById('btn-preset-4p')?.addEventListener('click', () => {
      this._applySeatPreset('pass_4p');
    });

    // Victory Modal Play Again Button
    document.getElementById('btn-play-again')?.addEventListener('click', () => {
      document.getElementById('modal-gameover')?.classList.add('hidden');
      document.getElementById('modal-lobby')?.classList.remove('hidden');
    });

    // Render initial Lobby seats
    this._renderLobbySeats(this.mp.lobbyState);
  }

  _checkUrlRoomParam() {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      document.getElementById('modal-lobby')?.classList.remove('hidden');
      const codeInput = document.getElementById('input-room-code');
      if (codeInput) codeInput.value = roomParam;
      const guestName = `Explorer-${Math.floor(10 + Math.random() * 89)}`;
      const nameInput = document.getElementById('input-player-name');
      if (nameInput) nameInput.value = guestName;
      this.mp.joinRoom(roomParam, guestName);
      this._showRoomShareBox(roomParam.toUpperCase().startsWith('TOMB-') ? roomParam.toUpperCase() : `TOMB-${roomParam.toUpperCase()}`);
    } else {
      // Start a default 4-explorer showcase game right away in the background so the 3D & 2D boards are immediately alive,
      // while keeping the Lobby accessible or starting immediately!
      this.engine.initGame(this.mp.lobbyState.seats);
    }
  }

  _showRoomShareBox(code) {
    const box = document.getElementById('room-share-box');
    const codeSpan = document.getElementById('active-room-code-display');
    const urlInput = document.getElementById('share-invite-url');
    const topRoomBadge = document.getElementById('top-room-badge');

    if (box) box.classList.remove('hidden');
    if (codeSpan) codeSpan.textContent = code;
    if (urlInput) urlInput.value = this.mp.getShareableInviteUrl();
    if (topRoomBadge) {
      topRoomBadge.textContent = `🌐 Room: ${code}`;
      topRoomBadge.classList.remove('hidden');
    }
  }

  _updateMultiplayerStatusBanner(text) {
    const el = document.getElementById('mp-status-banner');
    if (el) el.textContent = text;
  }

  _applySeatPreset(preset) {
    const seats = this.mp.lobbyState.seats;
    if (preset === 'solo_3ai') {
      seats[0].control = 'human';
      seats[1].control = 'ai';
      seats[2].control = 'ai';
      seats[3].control = 'ai';
    } else if (preset === 'pass_2p') {
      seats[0].control = 'human';
      seats[1].control = 'human';
      seats[2].control = 'none';
      seats[3].control = 'none';
    } else if (preset === 'pass_4p') {
      seats[0].control = 'human';
      seats[1].control = 'human';
      seats[2].control = 'human';
      seats[3].control = 'human';
    }
    this._renderLobbySeats(this.mp.lobbyState);
  }

  _renderLobbySeats(lobbyState) {
    const container = document.getElementById('lobby-seats-grid');
    if (!container) return;

    container.innerHTML = lobbyState.seats
      .map((seat) => {
        const cfg = PLAYERS_CONFIG.find((c) => c.id === seat.id);
        const isMe = seat.peerId === this.mp.myPeerId;
        return `
          <div class="lobby-seat-card" style="border-color: ${cfg.colorHex}">
            <div class="seat-card-header" style="background: ${cfg.colorHex}22">
              <img src="${cfg.portraitImg}" alt="${cfg.name}" class="seat-portrait" />
              <div>
                <div class="seat-deity-title" style="color: ${cfg.accentHex}">${cfg.deityTitle}</div>
                <input type="text" class="seat-name-input" data-seat-id="${seat.id}" value="${seat.name}" />
              </div>
            </div>
            <div class="seat-controls-row">
              <label>Player Type:</label>
              <select class="seat-control-select" data-seat-id="${seat.id}">
                <option value="human" ${seat.control === 'human' ? 'selected' : ''}>🧑 Human Explorer ${isMe && this.mp.mode !== 'local' ? '(You)' : ''}</option>
                <option value="ai" ${seat.control === 'ai' ? 'selected' : ''}>🤖 AI Tomb Bot</option>
                <option value="none" ${seat.control === 'none' ? 'selected' : ''}>🚫 Empty Seat</option>
              </select>
            </div>
            <div class="seat-Join-btn-row">
              ${
                this.mp.mode !== 'local'
                  ? `<button class="btn-claim-seat ${isMe ? 'claimed' : ''}" data-claim-seat="${seat.id}">
                      ${isMe ? '✓ Your Explorer Seat' : 'Claim This Explorer'}
                    </button>`
                  : ''
              }
            </div>
          </div>
        `;
      })
      .join('');

    container.querySelectorAll('.seat-name-input').forEach((inp) => {
      inp.addEventListener('change', () => {
        this.mp.updateSeat(inp.dataset.seatId, { name: inp.value.trim() || 'Explorer' });
      });
    });

    container.querySelectorAll('.seat-control-select').forEach((sel) => {
      sel.addEventListener('change', () => {
        this.mp.updateSeat(sel.dataset.seatId, {
          control: sel.value,
          peerId: sel.value === 'human' ? this.mp.myPeerId : null,
        });
      });
    });

    container.querySelectorAll('[data-claim-seat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const myName = document.getElementById('input-player-name')?.value?.trim() || 'Explorer';
        this.mp.updateSeat(btn.dataset.claimSeat, {
          control: 'human',
          peerId: this.mp.myPeerId,
          name: myName,
        });
      });
    });
  }

  _startNewGameFromLobby() {
    if (this.mp.mode === 'guest') {
      this._updateMultiplayerStatusBanner('Waiting for the Host to start the game...');
      return;
    }
    const activeCount = this.mp.lobbyState.seats.filter((s) => s.control !== 'none').length;
    if (activeCount < 2) {
      alert('Please enable at least 2 Explorers (Human or AI Bot) to start a game.');
      return;
    }
    document.getElementById('modal-lobby')?.classList.add('hidden');
    document.getElementById('modal-gameover')?.classList.add('hidden');
    this.engine.initGame(this.mp.lobbyState.seats);
  }

  setViewMode(mode) {
    this.viewMode = mode;
    const stageGrid = document.getElementById('main-stage-grid');
    if (stageGrid) {
      stageGrid.dataset.viewMode = mode;
    }
    document.querySelectorAll('[data-view-mode]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.viewMode === mode);
    });
    setTimeout(() => {
      this.view3D.resize();
    }, 50);
  }

  /**
   * Handles clicks on highlighted spaces in either 3D or 2D view!
   */
  _handleBoardSpaceClick(spaceId, highlightMode) {
    if (!this.activeState) return;
    if (!this.mp.isPlayerLocalTurn(this.activeState)) return;

    if (highlightMode === 'move_cw') {
      this.triggerAction('move', { dir: 'cw' });
    } else if (highlightMode === 'move_ccw') {
      this.triggerAction('move', { dir: 'ccw' });
    } else if (highlightMode === 'step_up' || highlightMode === 'step_down') {
      this.triggerAction('step', { targetSpaceId: spaceId });
    }
  }

  /**
   * Dispatches a local player action (either directly to the engine if Local/Host, or to Host if Guest).
   */
  triggerAction(action, payload = {}) {
    if (!this.activeState) return;
    if (this.mp.mode === 'guest') {
      this.mp.sendPlayerAction(action, payload);
    } else {
      this._executeEngineAction(action, payload);
    }
  }

  _handleIncomingPlayerAction(action, payload, peerId) {
    if (this.mp.mode !== 'host' && this.mp.mode !== 'local') return;
    this._executeEngineAction(action, payload);
  }

  _executeEngineAction(action, payload = {}) {
    switch (action) {
      case 'roll':
        this.engine.rollDie(payload.forcedValue || null);
        break;
      case 'move':
        this.engine.selectMoveDirection(payload.dir || 'cw');
        break;
      case 'pull_lever':
        this.engine.pullSarcophagusLever(payload.forcedTrackId || null);
        break;
      case 'finish_audio':
        this.engine.finishMummyAudio();
        break;
      case 'choice':
        this.engine.resolveMummyChoice(payload.optionId);
        break;
      case 'step':
        this.engine.chooseEndTurnLevelStep(payload.targetSpaceId || null);
        break;
      default:
        break;
    }
  }

  _onAuthoritativeStateChange(state) {
    this.mp.broadcastGameState(state);
    this._applyStateToUI(state);
    this._scheduleBotTurnIfNeeded(state);
  }

  _onAuthoritativeEvent(event) {
    this.mp.broadcastGameEvent(event);
    this._playVisualAndAudioEvent(event);
  }

  _onClientReceiveState(state) {
    document.getElementById('modal-lobby')?.classList.add('hidden');
    this._applyStateToUI(state);
  }

  _onClientReceiveEvent(event) {
    this._playVisualAndAudioEvent(event);
  }

  _playVisualAndAudioEvent(event) {
    switch (event.type) {
      case 'die_rolled':
        this._playSfx('dice');
        this.view3D.animateDieRoll(event.roll);
        break;

      case 'player_moved':
        this._playSfx('step');
        this.view3D.animateExplorerPath(event.playerId, event.path);
        break;

      case 'jewel_collected':
        this._playSfx('jewel');
        if (event.jewelMesh) {
          this.view3D.animateJewelCollection(event.jewelMesh, event.playerId);
        }
        break;

      case 'mummy_track_started':
        this.view3D.animateSarcophagusLeverPull();
        this._playMummyTrackAudio(event.track);
        break;

      case 'part2_started':
        this._playSfx('gong');
        this._showPart2RecordFlipBanner();
        break;

      case 'game_over':
        this._playSfx('victory');
        this._showGameOverModal(event.scores);
        break;

      default:
        break;
    }
  }

  _playMummyTrackAudio(track) {
    if (!track) return;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

    const audio = new Audio(track.url);
    audio.muted = this.audioMuted;
    this.currentAudio = audio;

    // Show live Mummy Voice Banner
    const voiceBanner = document.getElementById('mummy-voice-banner');
    const voiceTitle = document.getElementById('mummy-voice-title');
    const voiceQuote = document.getElementById('mummy-voice-quote');
    if (voiceBanner && voiceTitle && voiceQuote) {
      voiceTitle.textContent = `🎙️ Record ${track.side === 'SideA' ? 'Side 1 (Part I)' : 'Side 2 (Part II)'} — "${track.title}"`;
      voiceQuote.textContent = `"${track.transcript}"`;
      voiceBanner.classList.remove('hidden');
    }

    const onEndedOrSkipped = () => {
      if (this.currentAudio === audio) {
        this.currentAudio = null;
      }
      if (this.mp.mode !== 'guest' && this.engine.state?.phase === 'MUMMY_SPEAKING') {
        this.engine.finishMummyAudio();
      }
    };

    audio.addEventListener('ended', onEndedOrSkipped);
    audio.addEventListener('error', () => {
      setTimeout(onEndedOrSkipped, 2500);
    });

    audio.play().catch(() => {
      // If browser blocks autoplay, allow clicking "Obey the Mummy" button or auto-advance after reading transcript
      setTimeout(onEndedOrSkipped, 3600);
    });
  }

  _applyStateToUI(state) {
    this.activeState = state;
    this.view3D.syncWithState(state);
    this.view2D.syncWithState(state);

    // 1. Update Top Header Status (Part I / Part II, Record Side, Remaining Level 3 Jewels)
    const partBadge = document.getElementById('badge-game-part');
    if (partBadge) {
      partBadge.textContent =
        state.part === 1
          ? '💿 PART I: Side 1 — Hunt for the Jewels (Move Clockwise)'
          : '💿 PART II: Side 2 — Escape to Your Temple (Move CW or CCW)';
      partBadge.className = `part-pill ${state.part === 2 ? 'part-two' : 'part-one'}`;
    }

    const topJewelsCount = TOP_LEVEL_JEWEL_IDS.filter((id) => state.boardJewels[id]).length;
    const totalBoardJewels = Object.values(state.boardJewels).filter(Boolean).length;
    const jewelStatusEl = document.getElementById('badge-jewels-remaining');
    if (jewelStatusEl) {
      if (state.part === 1) {
        jewelStatusEl.textContent = state.greatJewelUnlocked
          ? `👑 Great Jewel UNLOCKED! (${totalBoardJewels} Scarabs left on board)`
          : `💎 Top-Level Scarabs left: ${topJewelsCount}/6 (Total on board: ${totalBoardJewels}/26)`;
      } else {
        jewelStatusEl.textContent = `🏃 Race Home by Exact Count without the Cobra! (${totalBoardJewels} Scarabs left)`;
      }
    }

    // 2. Render Player Temple Cards in Sidebar
    this._renderPlayerTempleCards(state);

    // 3. Render Active Turn Action Deck
    this._renderTurnActionDeck(state);

    // 4. Render Mummy Speaking / Choice Banner
    const voiceBanner = document.getElementById('mummy-voice-banner');
    if (voiceBanner && state.phase !== 'MUMMY_SPEAKING' && state.phase !== 'MUMMY_CHOICE') {
      voiceBanner.classList.add('hidden');
    }

    // 5. Render Tomb Log
    this._renderTombLog(state.logs);
  }

  _renderPlayerTempleCards(state) {
    const container = document.getElementById('players-sidebar-list');
    if (!container) return;

    const curPlayer = state.players[state.turnIndex];

    container.innerHTML = state.players
      .map((p) => {
        const cfg = PLAYERS_CONFIG.find((c) => c.id === p.id);
        const isTurn = curPlayer?.id === p.id;
        const sp = SPACES_BY_ID[p.spaceId];
        const hasGreatJewel = state.greatJewelOwner === p.id;
        const hasCobra = state.cobraOwner === p.id;
        const totalScore =
          p.jewels + (hasGreatJewel ? 5 : 0) + (hasCobra ? -5 : 0);

        return `
          <div class="temple-player-card ${isTurn ? 'active-turn' : ''}" style="--player-color: ${p.colorHex}; --player-accent: ${p.accentHex}">
            <div class="temple-card-top">
              <img src="${cfg.templeImg}" alt="${p.deity}" class="temple-deity-thumb" />
              <div class="temple-player-info">
                <div class="temple-player-name-row">
                  <span class="player-dot" style="background: ${p.colorHex}"></span>
                  <strong>${p.name}</strong>
                  <span class="player-badge-role">${p.control === 'ai' ? '🤖 Bot' : '🧑'}</span>
                </div>
                <div class="temple-deity-sub">${p.deityTitle} • Level ${p.level}</div>
                <div class="temple-space-sub">${sp ? sp.label : ''}</div>
              </div>
              <div class="temple-score-box" title="Total Jewel Value">
                <div class="score-num">${totalScore}</div>
                <div class="score-lbl">PTS</div>
              </div>
            </div>
            <div class="temple-inventory-row">
              <span class="inv-pill emerald" title="Precious Scarab Jewels (+1 pt each)">
                💎 ${p.jewels} Scarab${p.jewels === 1 ? '' : 's'}
              </span>
              ${
                hasGreatJewel
                  ? `<span class="inv-pill gold" title="The Great Mummy Jewel (+5 pts)">👑 Great Jewel (+5)</span>`
                  : ''
              }
              ${
                hasCobra
                  ? `<span class="inv-pill ruby-curse" title="Evil Cobra Spell (-5 pts & cannot end game)">🐍 Cobra Spell (-5)</span>`
                  : ''
              }
            </div>
          </div>
        `;
      })
      .join('');
  }

  _renderTurnActionDeck(state) {
    const deckEl = document.getElementById('turn-action-deck');
    if (!deckEl) return;

    const player = state.players[state.turnIndex];
    if (!player) return;

    const isMyTurn = this.mp.isPlayerLocalTurn(state);
    const dieFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const dieChar = state.lastRoll ? dieFaces[state.lastRoll - 1] : '🎲';

    let controlsHtml = '';

    if (!isMyTurn) {
      controlsHtml = `
        <div class="waiting-turn-notice">
          ⏳ Waiting for <strong>${player.name}</strong> (${player.control === 'ai' ? 'AI Bot' : 'Remote Player'})...
        </div>
      `;
    } else if (state.phase === 'ROLL_DIE') {
      controlsHtml = `
        <button class="btn-primary-action pulse-gold" id="btn-action-roll">
          🎲 Roll the Die
        </button>
      `;
    } else if (state.phase === 'CHOOSE_DIRECTION') {
      const cwSp = SPACES_BY_ID[state.moveOptions?.cw?.targetId];
      const ccwSp = SPACES_BY_ID[state.moveOptions?.ccw?.targetId];
      controlsHtml = `
        <div class="rolled-banner">Rolled <strong>${state.lastRoll}</strong> ${dieChar} — Choose Move:</div>
        <div class="action-buttons-stack">
          <button class="btn-move-dir cw" id="btn-move-cw">
            ⟳ Move Clockwise (${cwSp?.label || ''})
          </button>
          ${
            ccwSp
              ? `<button class="btn-move-dir ccw" id="btn-move-ccw">
                  ⟲ Move Counter-Clockwise (${ccwSp.label})
                </button>`
              : ''
          }
        </div>
      `;
    } else if (state.phase === 'PULL_LEVER') {
      controlsHtml = `
        <button class="btn-primary-action pulse-emerald" id="btn-action-lever">
          🔊 Pull Sarcophagus Lever!
        </button>
      `;
    } else if (state.phase === 'MUMMY_SPEAKING') {
      controlsHtml = `
        <div class="mummy-speaking-status">
          🎙️ Listening to the Voice of the Mummy...
        </div>
        <button class="btn-secondary-action" id="btn-skip-audio">
          Obey Command Now ➔
        </button>
      `;
    } else if (state.phase === 'MUMMY_CHOICE' && state.pendingChoice) {
      controlsHtml = `
        <div class="choice-prompt-title">${state.pendingChoice.prompt}</div>
        <div class="action-buttons-stack">
          ${state.pendingChoice.options
            .map(
              (opt) => `
              <button class="btn-choice-opt" data-choice-opt="${opt.id}">
                ${opt.label}
              </button>
            `
            )
            .join('')}
        </div>
      `;
    } else if (state.phase === 'CHOOSE_LEVEL_STEP' && state.levelStepOptions) {
      const { upSpaceId, downSpaceId } = state.levelStepOptions;
      const upSp = upSpaceId ? SPACES_BY_ID[upSpaceId] : null;
      const downSp = downSpaceId ? SPACES_BY_ID[downSpaceId] : null;
      controlsHtml = `
        <div class="choice-prompt-title">🪜 End of Turn — Climb Steps to Change Level?</div>
        <div class="action-buttons-stack">
          ${
            upSp
              ? `<button class="btn-step-opt up" data-step-target="${upSp.id}">
                  ▲ Climb UP to Level ${upSp.level} (${upSp.label})
                </button>`
              : ''
          }
          ${
            downSp
              ? `<button class="btn-step-opt down" data-step-target="${downSp.id}">
                  ▼ Climb DOWN to Level ${downSp.level} (${downSp.label})
                </button>`
              : ''
          }
          <button class="btn-secondary-action" data-step-target="">
            Stay on Level ${player.level} & End Turn
          </button>
        </div>
      `;
    }

    deckEl.innerHTML = `
      <div class="turn-header-strip" style="border-left: 5px solid ${player.colorHex}">
        <div class="turn-who">
          <span class="turn-tag">TURN #${state.turnNumber}</span>
          <strong>${player.name} (${player.deity})</strong>
        </div>
        <div class="turn-die-badge" title="Last Die Roll">${dieChar} ${state.lastRoll || '-'}</div>
      </div>
      <div class="turn-controls-body">
        ${controlsHtml}
      </div>
    `;

    deckEl.querySelector('#btn-action-roll')?.addEventListener('click', () => {
      this.triggerAction('roll');
    });
    deckEl.querySelector('#btn-move-cw')?.addEventListener('click', () => {
      this.triggerAction('move', { dir: 'cw' });
    });
    deckEl.querySelector('#btn-move-ccw')?.addEventListener('click', () => {
      this.triggerAction('move', { dir: 'ccw' });
    });
    deckEl.querySelector('#btn-action-lever')?.addEventListener('click', () => {
      this.triggerAction('pull_lever');
    });
    deckEl.querySelector('#btn-skip-audio')?.addEventListener('click', () => {
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio = null;
      }
      this.triggerAction('finish_audio');
    });
    deckEl.querySelectorAll('[data-choice-opt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.triggerAction('choice', { optionId: btn.dataset.choiceOpt });
      });
    });
    deckEl.querySelectorAll('[data-step-target]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.triggerAction('step', { targetSpaceId: btn.dataset.stepTarget || null });
      });
    });
  }

  _renderTombLog(logs) {
    const logEl = document.getElementById('tomb-event-log');
    if (!logEl || !logs) return;
    logEl.innerHTML = logs
      .slice(0, 25)
      .map((item) => `<div class="log-entry log-${item.type}">${item.text}</div>`)
      .join('');
  }

  _scheduleBotTurnIfNeeded(state) {
    if (this.botTimer) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }
    if (this.mp.mode === 'guest') return;
    if (!state || state.phase === 'GAME_OVER' || state.phase === 'MUMMY_SPEAKING') return;

    const curPlayer = state.players[state.turnIndex];
    if (!curPlayer || curPlayer.control !== 'ai') return;

    const delay = state.phase === 'ROLL_DIE' ? 950 : 1050;
    this.botTimer = setTimeout(() => {
      const botDecision = this.engine.computeBotAction();
      if (!botDecision) return;
      this._executeEngineAction(botDecision.action, botDecision);
    }, delay);
  }

  _showPart2RecordFlipBanner() {
    const toast = document.getElementById('part2-flip-toast');
    if (!toast) return;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 6500);
  }

  _showGameOverModal(scores) {
    const modal = document.getElementById('modal-gameover');
    const body = document.getElementById('gameover-scores-body');
    if (!modal || !body || !scores) return;

    const winner = scores[0];
    body.innerHTML = `
      <div class="winner-crown-banner" style="border-color: ${winner.colorHex}">
        <div class="winner-trophy">🏆</div>
        <div>
          <h2>${winner.name} (${winner.deity}) Wins!</h2>
          <p>Final Tomb Treasure Value: <strong>${winner.totalScore} Points</strong></p>
        </div>
      </div>
      <table class="scores-breakdown-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Explorer</th>
            <th>Precious Jewels (+1)</th>
            <th>Great Jewel (+5)</th>
            <th>Cobra Spell (-5)</th>
            <th>Total Value</th>
          </tr>
        </thead>
        <tbody>
          ${scores
            .map(
              (s, i) => `
              <tr class="${i === 0 ? 'winner-row' : ''}">
                <td>#${i + 1}</td>
                <td><span class="player-dot" style="background:${s.colorHex}"></span> ${s.name} (${s.deity}) ${s.finishedFirst ? '🏛️' : ''}</td>
                <td>💎 ${s.preciousJewels}</td>
                <td>${s.hasGreatJewel ? '👑 +5' : '—'}</td>
                <td>${s.hasCobra ? '🐍 -5' : '—'}</td>
                <td><strong>${s.totalScore} pts</strong></td>
              </tr>
            `
            )
            .join('')}
        </tbody>
      </table>
    `;
    modal.classList.remove('hidden');
  }

  _buildSoundboardAndRulesModal() {
    const sideAList = document.getElementById('soundboard-side-a');
    const sideBList = document.getElementById('soundboard-side-b');

    const renderTrackList = (tracks) =>
      tracks
        .map(
          (t) => `
          <div class="soundboard-track-item">
            <button class="btn-play-sample" data-sample-url="${t.url}" data-sample-title="${t.title}" data-sample-quote="${t.transcript.replace(/"/g, '&quot;')}">
              ▶️
            </button>
            <div class="track-meta">
              <div class="track-title"><strong>${t.title}</strong></div>
              <div class="track-quote">"${t.transcript}"</div>
            </div>
          </div>
        `
        )
        .join('');

    if (sideAList) sideAList.innerHTML = renderTrackList(SIDE_A_TRACKS);
    if (sideBList) sideBList.innerHTML = renderTrackList(SIDE_B_TRACKS);

    document.querySelectorAll('[data-sample-url]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.currentAudio) {
          this.currentAudio.pause();
        }
        const a = new Audio(btn.dataset.sampleUrl);
        this.currentAudio = a;
        a.play();
      });
    });
  }

  /**
   * Procedural WebAudio synthesizer for crisp tactile tabletop sound effects (dice, steps, jewels).
   */
  _playSfx(type) {
    if (this.audioMuted) return;
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
      }
      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;

      if (type === 'dice') {
        for (let i = 0; i < 4; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(180 + i * 65, now + i * 0.07);
          gain.gain.setValueAtTime(0.12, now + i * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.05);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.07);
          osc.stop(now + i * 0.07 + 0.055);
        }
      } else if (type === 'step') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.09);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'jewel') {
        [587.33, 880, 1174.66].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0.14, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.28);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.3);
        });
      } else if (type === 'gong' || type === 'victory') {
        [220, 277.18, 329.63, 440].forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + 1.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 1.25);
        });
      }
    } catch (e) {
      // Ignore WebAudio errors
    }
  }
}

function bootMummyApp() {
  if (!window.mummyApp) {
    window.mummyApp = new VoiceOfTheMummyApp();
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootMummyApp);
} else {
  bootMummyApp();
}
