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
} from './board_data.js?v=12';
import { VoiceOfTheMummyEngine, TOP_LEVEL_JEWEL_IDS } from './game_engine.js?v=12';
import { Mummy3DView } from './view_3d.js?v=12';
import { Mummy2DView } from './view_2d.js?v=12';
import { MultiplayerManager } from './multiplayer.js?v=12';

class VoiceOfTheMummyApp {
  constructor() {
    this.viewMode = '3d'; // '3d' (default) | '2d' | 'split'
    this.audioMuted = false;
    this.currentAudio = null;
    this.mummyAudioEl = new Audio();
    this.mummyAudioEl.preload = 'auto';
    this.mummyAudioUnlocked = false;
    this.audioCtx = null;
    this.mummyGainNode = null;
    this.currentBufferSource = null;
    this.mummyBufferCache = new Map();
    this.mummyTrackPlaybackId = 0;
    this.botTimer = null;
    this.bigPopupTimer = null;
    this.lastBigPopupTime = 0;

    // Step 1 Multiplayer Wizard state
    this.selectedHostSeatId = 'blue';
    this.selectedHumanCount = 2;

    this.engine = new VoiceOfTheMummyEngine(
      (state) => this._onAuthoritativeStateChange(state),
      (event) => this._onAuthoritativeEvent(event)
    );

    this.mp = new MultiplayerManager({
      onLobbyUpdate: (lobby) => {
        this._renderLobbySeats(lobby);
        this._updateWaitingStatusUI();
      },
      onGameState: (state) => this._onClientReceiveState(state),
      onGameEvent: (ev) => this._onClientReceiveEvent(ev),
      onPlayerAction: (action, payload, peerId) => this._handleIncomingPlayerAction(action, payload, peerId),
      onStatusChange: (statusText) => this._updateMultiplayerStatusBanner(statusText),
      onGuestJoined: (peerId, name, assignedSeatId) => {
        const seatCfg = PLAYERS_CONFIG.find((c) => c.id === assignedSeatId);
        this._showBigEventPopup({
          theme: 'emerald',
          icon: '🎉',
          title: `${(name || 'FRIEND').toUpperCase()} JOINED THE GAME!`,
          subtitle: `Playing as ${seatCfg ? seatCfg.name : 'Explorer'} (${seatCfg ? seatCfg.deity : ''})`,
        });
        if (this.engine.state && assignedSeatId) {
          // Ensure no other player in active game holds this same peerId
          for (const pl of this.engine.state.players) {
            if (pl.id !== assignedSeatId && pl.peerId === peerId) {
              pl.peerId = null;
            }
          }
          const p = this.engine.state.players.find((pl) => pl.id === assignedSeatId);
          if (p) {
            p.control = 'human';
            p.peerId = peerId;
            p.name = name || p.name;
          }
          this._applyStateToUI(this.engine.state);
          this.mp.broadcastGameState(this.engine.state);
        }
        this._updateWaitingStatusUI();
      },
    });

    this.activeState = null;

    this._initViews();
    this._initAudioUnlocker();
    this._bindUIControls();
    this._buildSoundboardAndRulesModal();
    this._checkUrlRoomParam();
  }

  /**
   * Unlocks WebAudio (AudioContext) and persistent HTML5 Audio on the very first user tap/click
   * so that Mummy voice tracks ALWAYS play on iPhone/iPad/Android even when AI Bots pull the lever inside setTimeout.
   */
  _initAudioUnlocker() {
    const unlock = () => {
      const ctx = this._ensureAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        try {
          const buf = ctx.createBuffer(1, 1, 22050);
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(ctx.destination);
          src.start(0);
        } catch (e) {
          // Ignore
        }
      }
      if (!this.mummyAudioUnlocked && this.mummyAudioEl) {
        this.mummyAudioUnlocked = true;
        try {
          this.mummyAudioEl.src =
            'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
          this.mummyAudioEl.volume = 0.01;
          const p = this.mummyAudioEl.play();
          if (p && typeof p.then === 'function') {
            p.then(() => {
              this.mummyAudioEl.pause();
              this.mummyAudioEl.volume = 1.0;
            }).catch(() => {
              this.mummyAudioEl.volume = 1.0;
            });
          }
        } catch (e) {
          // Ignore
        }
      }
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchend', unlock, { passive: true });
    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  _ensureAudioContext() {
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return null;
        this.audioCtx = new AudioContext();
        this.mummyGainNode = this.audioCtx.createGain();
        this.mummyGainNode.gain.value = this.audioMuted ? 0 : 1.0;
        this.mummyGainNode.connect(this.audioCtx.destination);
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      if (this.mummyGainNode) {
        this.mummyGainNode.gain.value = this.audioMuted ? 0 : 1.0;
      }
      return this.audioCtx;
    } catch (e) {
      return null;
    }
  }

  _stopCurrentMummyAudio() {
    this.mummyTrackPlaybackId++;
    if (this.currentBufferSource) {
      try {
        this.currentBufferSource.onended = null;
        this.currentBufferSource.stop();
        this.currentBufferSource.disconnect();
      } catch (e) {
        // Ignore
      }
      this.currentBufferSource = null;
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
        this.currentAudio.pause();
      } catch (e) {
        // Ignore
      }
      this.currentAudio = null;
    }
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

    // Default to 3D Pyramid view on all screens
    this.setViewMode('3d');

    window.addEventListener('resize', () => {
      if (window.innerWidth <= 768 && this.viewMode === 'split') {
        this.setViewMode('3d');
      }
    });
  }

  _resetViewForNewGame() {
    this.setViewMode('3d');
    this.view3D.resetForNewGame(this.mp.myPeerId, this.mp.mode !== 'local');
    document.querySelectorAll('[data-cam-preset]').forEach((b) => {
      b.classList.toggle('active', b.dataset.camPreset === 'follow');
    });
    document.querySelectorAll('[data-bg-mode]').forEach((b) => {
      b.classList.toggle('active', b.dataset.bgMode === 'tomb');
    });
  }

  _bindUIControls() {
    // View Mode Switcher ('3d', '2d', 'split')
    document.querySelectorAll('[data-view-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.setViewMode(btn.dataset.viewMode);
      });
    });

    // Mobile Sidebar Sub-Tabs (Temples vs Tomb Chronicle)
    document.querySelectorAll('[data-mobile-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.mobileTab;
        const sidebar = document.getElementById('sidebar-panel');
        if (sidebar) {
          sidebar.dataset.mobilePanel = tab;
        }
        document.querySelectorAll('[data-mobile-tab]').forEach((b) => {
          b.classList.toggle('active', b.dataset.mobileTab === tab);
        });
      });
    });

    // 3D Camera Presets
    document.querySelectorAll('[data-cam-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.camPreset;
        this.view3D.setCameraPreset(preset);
        document.querySelectorAll('[data-cam-preset]').forEach((b) => {
          b.classList.toggle('active', b.dataset.camPreset === preset);
        });
      });
    });

    // 3D Background Mode Toggle ('tomb' vs 'black')
    document.querySelectorAll('[data-bg-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.bgMode;
        this.view3D.setBackgroundMode(mode);
        document.querySelectorAll('[data-bg-mode]').forEach((b) => {
          b.classList.toggle('active', b.dataset.bgMode === mode);
        });
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
        if (this.mummyAudioEl) {
          this.mummyAudioEl.muted = this.audioMuted;
        }
        if (this.mummyGainNode) {
          this.mummyGainNode.gain.value = this.audioMuted ? 0 : 1.0;
        }
        muteBtn.innerHTML = this.audioMuted
          ? '🔇 <span class="nav-btn-label">Audio Muted</span>'
          : '🔊 <span class="nav-btn-label">Audio On</span>';
      });
    }

    // Intro Landing Card ("Single Player" vs "Multiplayer")
    document.getElementById('btn-landing-single')?.addEventListener('click', () => {
      document.getElementById('modal-intro-landing')?.classList.add('hidden');
      this._applySeatPreset('solo_3ai');
      this._resetViewForNewGame();
      this.engine.initGame(this.mp.lobbyState.seats);
    });

    document.getElementById('btn-landing-multi')?.addEventListener('click', () => {
      document.getElementById('modal-intro-landing')?.classList.add('hidden');
      this._openMultiplayerModal();
    });

    document.getElementById('btn-landing-rules')?.addEventListener('click', () => {
      document.getElementById('modal-rules')?.classList.remove('hidden');
    });

    // Lobby Modal Open / Close
    document.getElementById('btn-open-lobby')?.addEventListener('click', () => {
      document.getElementById('modal-intro-landing')?.classList.add('hidden');
      this._openMultiplayerModal();
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

    // Step 1 Multiplayer Wizard Controls (Player Count Pills)
    document.querySelectorAll('[data-mp-count]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedHumanCount = Number(btn.dataset.mpCount) || 2;
        document.querySelectorAll('[data-mp-count]').forEach((b) => {
          b.classList.toggle('active', Number(b.dataset.mpCount) === this.selectedHumanCount);
        });
      });
    });

    // Step 1 -> Step 2: Host Online Game & Get Invite Link
    document.getElementById('btn-host-room')?.addEventListener('click', async () => {
      const hostName = document.getElementById('input-player-name')?.value?.trim() || 'Explorer 1';
      const fillWithAi = document.getElementById('chk-fill-ai')?.checked ?? true;
      const code = await this.mp.hostRoom(hostName, {
        preferredSeatId: this.selectedHostSeatId,
        humanCount: this.selectedHumanCount,
        fillWithAi,
      });
      this._setMultiplayerWizardStep(2);
      this._showRoomShareBox(code);
      this._updateWaitingStatusUI();
    });

    // Step 1 Alternative: Local Pass & Play on This Device
    document.getElementById('btn-start-pass-play')?.addEventListener('click', () => {
      const hostName = document.getElementById('input-player-name')?.value?.trim() || 'Player 1';
      const fillWithAi = document.getElementById('chk-fill-ai')?.checked ?? true;
      this.mp.disconnect();
      let humansRemaining = this.selectedHumanCount - 1;
      for (const s of this.mp.lobbyState.seats) {
        const cfg = PLAYERS_CONFIG.find((c) => c.id === s.id);
        if (s.id === this.selectedHostSeatId) {
          s.control = 'human';
          s.peerId = 'local';
          s.name = hostName;
        } else if (humansRemaining > 0) {
          s.control = 'human';
          s.peerId = 'local';
          s.name = `${cfg.name} (Human)`;
          humansRemaining--;
        } else {
          s.control = fillWithAi ? 'ai' : 'none';
          s.peerId = null;
          s.name = fillWithAi ? `${cfg.name} (Bot)` : cfg.name;
        }
      }
      document.getElementById('modal-lobby')?.classList.add('hidden');
      this._resetViewForNewGame();
      this.engine.initGame(this.mp.lobbyState.seats);
    });

    // Step 2 -> Back to Step 1
    document.getElementById('btn-mp-back-step1')?.addEventListener('click', () => {
      this._setMultiplayerWizardStep(1);
    });

    // Guest Name Update Button (for friends who clicked the Invite Link)
    document.getElementById('btn-save-guest-name')?.addEventListener('click', () => {
      const guestName = document.getElementById('input-guest-name')?.value?.trim() || 'Explorer';
      const mySeat = this.mp.lobbyState.seats.find((s) => s.peerId === this.mp.myPeerId);
      if (mySeat) {
        this.mp.claimExplorerSeat(mySeat.id, guestName);
      }
    });

    // Copy Invite Link Buttons (in Modal Step 2, Top Navbar, and Main Screen Waiting Banner)
    document.getElementById('btn-copy-invite')?.addEventListener('click', () => {
      this._copyInviteLinkWithFeedback('btn-copy-invite', '✅ Invite Link Copied!');
    });
    document.getElementById('btn-top-copy-invite')?.addEventListener('click', () => {
      this._copyInviteLinkWithFeedback('top-invite-btn-text', 'Copied!');
    });
    document.getElementById('btn-main-banner-copy')?.addEventListener('click', () => {
      this._copyInviteLinkWithFeedback('btn-main-banner-copy', '✅ Copied!');
    });

    // Send Invite Link via Messaging App (SMS / iMessage) Buttons
    document.getElementById('btn-sms-invite')?.addEventListener('click', () => {
      this._sendInviteViaMessagesApp();
    });
    document.getElementById('btn-top-sms-invite')?.addEventListener('click', () => {
      this._sendInviteViaMessagesApp();
    });
    document.getElementById('btn-main-banner-sms')?.addEventListener('click', () => {
      this._sendInviteViaMessagesApp();
    });

    // Native Share Button (iPhone / macOS share sheet)
    document.getElementById('btn-share-invite')?.addEventListener('click', async () => {
      const url = this.mp.getShareableInviteUrl();
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Join My Voice of the Mummy (1971) Game!',
            text: 'Click to join my Egyptian Tomb Expedition in Voice of the Mummy:',
            url,
          });
          return;
        } catch (e) {
          // Fallback to clipboard copy
        }
      }
      this._copyInviteLinkWithFeedback('btn-copy-invite', '✅ Invite Link Copied!');
    });

    // Host "Play with Current Players" Buttons (Empty Slots = Nothing OR Empty Slots = Computer)
    document.getElementById('btn-play-current-empty')?.addEventListener('click', () => {
      this._startWithCurrentPlayers('none');
    });
    document.getElementById('btn-play-current-ai')?.addEventListener('click', () => {
      this._startWithCurrentPlayers('ai');
    });
    document.getElementById('btn-main-banner-play-current')?.addEventListener('click', () => {
      const { connectedHumans } = this.mp.getWaitingStats();
      this._startWithCurrentPlayers(connectedHumans >= 2 ? 'none' : 'ai');
    });

    // Start Game Button in Step 2 Waiting Room
    document.getElementById('btn-start-game')?.addEventListener('click', () => {
      this._startNewGameFromLobby();
    });

    // Victory Modal Buttons ("Play Another Expedition" & "View 3D Finale Board")
    document.getElementById('btn-play-again')?.addEventListener('click', () => {
      document.getElementById('modal-gameover')?.classList.add('hidden');
      this._openMultiplayerModal();
    });
    document.getElementById('btn-close-gameover')?.addEventListener('click', () => {
      document.getElementById('modal-gameover')?.classList.add('hidden');
    });
    document.getElementById('btn-view-gameover-board')?.addEventListener('click', () => {
      document.getElementById('modal-gameover')?.classList.add('hidden');
    });

    // Render Step 1 Character Picker & initial Lobby seats
    this._renderStep1HostCharacterPicker();
    this._renderLobbySeats(this.mp.lobbyState);
  }

  _openMultiplayerModal() {
    document.getElementById('modal-lobby')?.classList.remove('hidden');
    if (this.mp.mode === 'host' || this.mp.mode === 'guest') {
      this._setMultiplayerWizardStep(2);
      this._updateWaitingStatusUI();
    } else {
      this._setMultiplayerWizardStep(1);
      this._renderStep1HostCharacterPicker();
    }
  }

  _setMultiplayerWizardStep(stepNum) {
    const step1 = document.getElementById('mp-wizard-step1');
    const step2 = document.getElementById('mp-wizard-step2');
    const heading = document.getElementById('mp-modal-heading');
    const guestBox = document.getElementById('guest-welcome-box');
    const backBtn = document.getElementById('btn-mp-back-step1');
    const startBtn = document.getElementById('btn-start-game');
    const guestWaitNotice = document.getElementById('guest-waiting-host-notice');

    if (stepNum === 1) {
      step1?.classList.remove('hidden');
      step2?.classList.add('hidden');
      if (heading) heading.textContent = '🌐 Step 1: Create Your Multiplayer Game';
    } else {
      step1?.classList.add('hidden');
      step2?.classList.remove('hidden');
      const isGuest = this.mp.mode === 'guest';
      if (heading) {
        heading.textContent = isGuest
          ? `🔗 Joined Room ${this.mp.roomCode || ''} — Pick Your Explorer`
          : `👑 Step 2: Send Invite Link & Waiting Room (${this.mp.roomCode || ''})`;
      }
      guestBox?.classList.toggle('hidden', !isGuest);
      backBtn?.classList.toggle('hidden', isGuest);
      startBtn?.classList.toggle('hidden', isGuest);
      guestWaitNotice?.classList.toggle('hidden', !isGuest);
    }
  }

  _renderStep1HostCharacterPicker() {
    const container = document.getElementById('host-character-picker');
    if (!container) return;

    container.innerHTML = PLAYERS_CONFIG.map((cfg) => {
      const isSelected = cfg.id === this.selectedHostSeatId;
      return `
        <button type="button" class="mp-char-pick-card ${isSelected ? 'selected' : ''}" data-pick-host-seat="${cfg.id}" style="--char-color: ${cfg.colorHex}">
          <div class="mp-char-visuals">
            <img src="${cfg.portraitImg}" alt="${cfg.name}" class="mp-char-fig" />
            <img src="${cfg.templeImg}" alt="${cfg.deity}" class="mp-char-temple" />
          </div>
          <div class="mp-char-name">${cfg.name}</div>
          <div class="mp-char-deity">${cfg.deityTitle}</div>
          <div class="mp-char-badge" style="background: ${cfg.colorHex}">
            ${isSelected ? '✓ YOUR CHARACTER' : 'Tap to Pick'}
          </div>
        </button>
      `;
    }).join('');

    container.querySelectorAll('[data-pick-host-seat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedHostSeatId = btn.dataset.pickHostSeat;
        this._renderStep1HostCharacterPicker();
      });
    });
  }

  _copyInviteLinkWithFeedback(elementId, copiedLabel = '✅ Copied!') {
    const url = this.mp.getShareableInviteUrl();
    navigator.clipboard?.writeText(url);
    const el = document.getElementById(elementId);
    if (el) {
      const orig = el.textContent;
      el.textContent = copiedLabel;
      setTimeout(() => {
        el.textContent = orig;
      }, 2200);
    }
  }

  /**
   * Opens the user's native Messaging app (iMessage / Messages on Mac & iPhone, SMS on Android)
   * with the Multiplayer Invite Link pre-filled in the message body so they can immediately text it to friends!
   */
  _sendInviteViaMessagesApp() {
    const url = this.mp.getShareableInviteUrl();
    const bodyText = `Join my 1971 Voice of the Mummy game! Tap this link to enter the Tomb: ${url}`;
    const smsHref = `sms:?&body=${encodeURIComponent(bodyText)}`;
    const link = document.createElement('a');
    link.href = smsHref;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      link.remove();
    }, 200);
  }

  _updateWaitingStatusUI() {
    const isOnline = this.mp.mode === 'host' || this.mp.mode === 'guest';
    const topCopyBtn = document.getElementById('btn-top-copy-invite');
    const topSmsBtn = document.getElementById('btn-top-sms-invite');
    const mainWaitingBanner = document.getElementById('mp-main-waiting-banner');
    const mainWaitingText = document.getElementById('mp-main-waiting-text');
    const mainPlayCurrentBtn = document.getElementById('btn-main-banner-play-current');
    const playCurrentBox = document.getElementById('mp-play-current-box');
    const statusBox = document.getElementById('mp-waiting-status-box');
    const headlineEl = document.getElementById('mp-waiting-headline');
    const startBtn = document.getElementById('btn-start-game');

    if (topCopyBtn) {
      topCopyBtn.classList.toggle('hidden', !isOnline);
    }
    if (topSmsBtn) {
      topSmsBtn.classList.toggle('hidden', !isOnline);
    }

    if (!isOnline) {
      mainWaitingBanner?.classList.add('hidden');
      playCurrentBox?.classList.add('hidden');
      return;
    }

    const { totalHumanSeats, connectedHumans, waitingCount } = this.mp.getWaitingStats();
    const isHost = this.mp.mode === 'host';

    if (waitingCount > 0) {
      statusBox?.classList.add('waiting');
      statusBox?.classList.remove('ready');
      playCurrentBox?.classList.toggle('hidden', !isHost);
      if (mainPlayCurrentBtn) {
        mainPlayCurrentBtn.classList.toggle('hidden', !isHost);
      }
      if (headlineEl) {
        headlineEl.textContent = `⏳ Waiting for ${waitingCount} more friend${waitingCount === 1 ? '' : 's'} to click your Invite Link... (${connectedHumans} of ${totalHumanSeats} Players Connected)`;
      }
      if (startBtn && isHost) {
        startBtn.textContent = `🏺 Start Tomb Expedition (${connectedHumans}/${totalHumanSeats} Joined)`;
      }
      if (mainWaitingBanner && mainWaitingText) {
        mainWaitingText.textContent = `⏳ Waiting for ${waitingCount} friend${waitingCount === 1 ? '' : 's'} (${connectedHumans}/${totalHumanSeats} joined)...`;
        mainWaitingBanner.classList.remove('hidden');
      }
    } else {
      statusBox?.classList.remove('waiting');
      statusBox?.classList.add('ready');
      playCurrentBox?.classList.add('hidden');
      if (headlineEl) {
        headlineEl.textContent = `✅ All ${totalHumanSeats} Players Connected! Ready to Start the Tomb Expedition!`;
      }
      if (startBtn && isHost) {
        startBtn.textContent = `🏺 Start Tomb Expedition (${connectedHumans}/${totalHumanSeats} Ready!)`;
      }
      mainWaitingBanner?.classList.add('hidden');
    }
  }

  _checkUrlRoomParam() {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      document.getElementById('modal-intro-landing')?.classList.add('hidden');
      document.getElementById('modal-lobby')?.classList.remove('hidden');
      const guestName = `Explorer ${Math.floor(2 + Math.random() * 8)}`;
      const guestInput = document.getElementById('input-guest-name');
      if (guestInput) guestInput.value = guestName;
      this.mp.joinRoom(roomParam, guestName);
      const cleanCode = roomParam.toUpperCase().startsWith('TOMB-')
        ? roomParam.toUpperCase()
        : `TOMB-${roomParam.toUpperCase()}`;
      this._setMultiplayerWizardStep(2);
      this._showRoomShareBox(cleanCode);
      this._updateWaitingStatusUI();
    } else {
      // Start a default 4-explorer showcase game right away in the background so the 3D & 2D boards are immediately alive,
      // while the Intro Landing Card welcomes the player!
      this.engine.initGame(this.mp.lobbyState.seats);
    }
  }

  _showRoomShareBox(code) {
    const box = document.getElementById('room-share-box');
    const codeSpan = document.getElementById('active-room-code-display');
    const urlInput = document.getElementById('share-invite-url');
    const topCopyBtn = document.getElementById('btn-top-copy-invite');
    const topSmsBtn = document.getElementById('btn-top-sms-invite');

    if (box) box.classList.remove('hidden');
    if (codeSpan) codeSpan.textContent = code;
    if (urlInput) urlInput.value = this.mp.getShareableInviteUrl();
    if (topCopyBtn) topCopyBtn.classList.remove('hidden');
    if (topSmsBtn) topSmsBtn.classList.remove('hidden');
  }

  _updateMultiplayerStatusBanner(text) {
    const el = document.getElementById('mp-status-banner');
    if (el) el.textContent = text;
    this._updateWaitingStatusUI();
  }

  _applySeatPreset(preset) {
    const seats = this.mp.lobbyState.seats;
    if (preset === 'solo_3ai') {
      seats[0].control = 'human';
      seats[0].peerId = 'local';
      seats[0].name = 'Blue Explorer';
      seats[1].control = 'ai';
      seats[1].peerId = null;
      seats[1].name = 'Red Explorer (Bot)';
      seats[2].control = 'ai';
      seats[2].peerId = null;
      seats[2].name = 'Yellow Explorer (Bot)';
      seats[3].control = 'ai';
      seats[3].peerId = null;
      seats[3].name = 'Green Explorer (Bot)';
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
        const isMe = Boolean(seat.peerId && seat.peerId === this.mp.myPeerId);
        const isTakenByOtherHuman = Boolean(seat.control === 'human' && seat.peerId && seat.peerId !== this.mp.myPeerId);
        const isWaitingForFriend = seat.control === 'human' && !seat.peerId;

        let statusBadgeHtml = '';
        if (isMe) {
          statusBadgeHtml = `<div class="seat-live-status status-me">✅ YOUR CHARACTER (${seat.name})</div>`;
        } else if (isTakenByOtherHuman) {
          statusBadgeHtml = `<div class="seat-live-status status-joined">✅ ${seat.name} Joined!</div>`;
        } else if (isWaitingForFriend) {
          statusBadgeHtml = `<div class="seat-live-status status-waiting">⏳ Waiting for Friend to Join...</div>`;
        } else if (seat.control === 'ai') {
          statusBadgeHtml = `<div class="seat-live-status status-ai">🤖 AI Tomb Bot</div>`;
        } else {
          statusBadgeHtml = `<div class="seat-live-status status-empty">🚫 Seat Closed</div>`;
        }

        const canPickThisSeat = !isMe && !isTakenByOtherHuman;

        return `
          <div class="lobby-seat-card ${isMe ? 'seat-is-me' : ''} ${isWaitingForFriend ? 'seat-is-waiting' : ''}" style="--seat-color: ${cfg.colorHex}; border-color: ${cfg.colorHex}">
            <div class="seat-card-header" style="background: ${cfg.colorHex}26">
              <div class="seat-dual-thumbs">
                <img src="${cfg.portraitImg}" alt="${cfg.name}" class="seat-portrait" />
                <img src="${cfg.templeImg}" alt="${cfg.deity}" class="seat-temple-thumb" />
              </div>
              <div class="seat-header-info">
                <span class="seat-color-tag" style="background: ${cfg.colorHex}">${cfg.id.toUpperCase()} PAWN</span>
                <div class="seat-deity-title" style="color: ${cfg.accentHex}">${cfg.deityTitle}</div>
                <input type="text" class="seat-name-input" data-seat-id="${seat.id}" value="${seat.name}" ${this.mp.mode === 'guest' && !isMe ? ' disabled' : ''} />
              </div>
            </div>

            ${statusBadgeHtml}

            ${
              this.mp.mode !== 'guest'
                ? `<div class="seat-controls-row">
                    <select class="seat-control-select" data-seat-id="${seat.id}">
                      <option value="human" ${seat.control === 'human' ? 'selected' : ''}>🧑 Human Player ${isMe ? '(You)' : '(Friend via Link)'}</option>
                      <option value="ai" ${seat.control === 'ai' ? 'selected' : ''}>🤖 AI Tomb Bot</option>
                      <option value="none" ${seat.control === 'none' ? 'selected' : ''}>🚫 Closed Seat</option>
                    </select>
                  </div>`
                : ''
            }

            <div class="seat-Join-btn-row">
              ${
                isMe
                  ? `<button type="button" class="btn-claim-seat claimed" disabled>✓ Playing as ${cfg.name}</button>`
                  : canPickThisSeat
                  ? `<button type="button" class="btn-claim-seat" data-claim-seat="${seat.id}">👆 Switch to ${cfg.name}</button>`
                  : `<button type="button" class="btn-claim-seat" disabled>🔒 Taken by ${seat.name}</button>`
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
        const seatId = sel.dataset.seatId;
        const cfg = PLAYERS_CONFIG.find((c) => c.id === seatId);
        const newControl = sel.value;
        this.mp.updateSeat(seatId, {
          control: newControl,
          peerId: null,
          name:
            newControl === 'human'
              ? 'Waiting for Friend...'
              : newControl === 'ai'
              ? `${cfg?.name || 'Explorer'} (Bot)`
              : cfg?.name || 'Explorer',
        });
      });
    });

    container.querySelectorAll('[data-claim-seat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nameInputId = this.mp.mode === 'guest' ? 'input-guest-name' : 'input-player-name';
        const myName = document.getElementById(nameInputId)?.value?.trim() || 'Explorer';
        this.mp.claimExplorerSeat(btn.dataset.claimSeat, myName);
      });
    });
  }

  /**
   * Starts the online game immediately with the players who have currently joined,
   * converting any unjoined human slots (`control === 'human' && !peerId`) to either
   * `'none'` (Empty / Closed) or `'ai'` (Computer Bot) so the Host never needs a new link!
   */
  _startWithCurrentPlayers(emptySlotMode = 'none') {
    if (this.mp.mode === 'guest') return;
    const seats = this.mp.lobbyState.seats;

    for (const s of seats) {
      if (s.control === 'human' && !s.peerId) {
        const cfg = PLAYERS_CONFIG.find((c) => c.id === s.id);
        if (emptySlotMode === 'ai') {
          s.control = 'ai';
          s.name = `${cfg?.name || 'Explorer'} (Bot)`;
        } else {
          s.control = 'none';
          s.name = cfg?.name || 'Explorer';
        }
      }
    }

    // Ensure at least 2 total active players (if only the Host is in the room and chose 'none', add 1 AI Bot so they can play)
    const activeCount = seats.filter((s) => s.control !== 'none').length;
    if (activeCount < 2) {
      const fallbackSeat = seats.find((s) => s.control === 'none');
      if (fallbackSeat) {
        const cfg = PLAYERS_CONFIG.find((c) => c.id === fallbackSeat.id);
        fallbackSeat.control = 'ai';
        fallbackSeat.name = `${cfg?.name || 'Explorer'} (Bot)`;
      }
    }

    this.mp._broadcastLobby();
    this._updateWaitingStatusUI();
    document.getElementById('modal-lobby')?.classList.add('hidden');
    document.getElementById('modal-gameover')?.classList.add('hidden');
    this._resetViewForNewGame();
    this.engine.initGame(this.mp.lobbyState.seats);
  }

  _startNewGameFromLobby() {
    if (this.mp.mode === 'guest') {
      this._updateMultiplayerStatusBanner('Waiting for the Host to start the game...');
      return;
    }
    // If hosting an online room and some invited human slots haven't joined yet,
    // automatically convert those unjoined slots so the game never gets stuck waiting on an empty seat!
    if (this.mp.mode === 'host') {
      const { connectedHumans, waitingCount } = this.mp.getWaitingStats();
      if (waitingCount > 0) {
        const fillAiChecked = document.getElementById('chk-fill-ai')?.checked ?? false;
        this._startWithCurrentPlayers(fillAiChecked || connectedHumans < 2 ? 'ai' : 'none');
        return;
      }
    }
    const activeCount = this.mp.lobbyState.seats.filter((s) => s.control !== 'none').length;
    if (activeCount < 2) {
      alert('Please enable at least 2 Explorers (Human or AI Bot) to start a game.');
      return;
    }
    document.getElementById('modal-lobby')?.classList.add('hidden');
    document.getElementById('modal-gameover')?.classList.add('hidden');
    this._resetViewForNewGame();
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
    const isInitialTurn = !this.activeState || (state.turnNumber === 1 && state.turnIndex === 0 && state.phase === 'ROLL_DIE');
    document.getElementById('modal-intro-landing')?.classList.add('hidden');
    document.getElementById('modal-lobby')?.classList.add('hidden');
    if (isInitialTurn) {
      this._resetViewForNewGame();
    }
    this._applyStateToUI(state);
  }

  _onClientReceiveEvent(event) {
    this._playVisualAndAudioEvent(event);
  }

  _getPlayerDisplayName(playerId) {
    const p = this.activeState?.players?.find((x) => x.id === playerId) ||
      this.engine?.state?.players?.find((x) => x.id === playerId) ||
      PLAYERS_CONFIG.find((x) => x.id === playerId);
    return p ? p.name : 'Explorer';
  }

  _showBigEventPopup({ theme = 'gold', icon = '🏺', title = '', subtitle = '' }) {
    const popupEl = document.getElementById('big-event-popup');
    if (!popupEl || !title) return;

    const now = performance.now();
    const itemHtml = `
      <div class="big-event-card theme-${theme}">
        <div class="big-event-icon">${icon}</div>
        <div class="big-event-texts">
          <div class="big-event-title">${title}</div>
          ${subtitle ? `<div class="big-event-sub">${subtitle}</div>` : ''}
        </div>
      </div>
    `;

    // If two major events happen simultaneously on the same landing (e.g. stealing a gem AND passing the Cobra curse), stack them!
    if (!popupEl.classList.contains('hidden') && now - this.lastBigPopupTime < 900) {
      popupEl.insertAdjacentHTML('beforeend', itemHtml);
    } else {
      popupEl.innerHTML = itemHtml;
      popupEl.classList.remove('hidden');
    }

    this.lastBigPopupTime = now;
    if (this.bigPopupTimer) {
      clearTimeout(this.bigPopupTimer);
    }
    this.bigPopupTimer = setTimeout(() => {
      popupEl.classList.add('hidden');
    }, 3600);
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

      case 'jewel_transferred': {
        this._playSfx('jewel');
        const fromName = this._getPlayerDisplayName(event.fromPlayerId);
        const toName = this._getPlayerDisplayName(event.toPlayerId);
        this._showBigEventPopup({
          theme: 'emerald',
          icon: '💎',
          title: `${toName.toUpperCase()} STOLE A GEM!`,
          subtitle: `Took 1 Precious Scarab Gem from ${fromName}`,
        });
        break;
      }

      case 'cobra_transferred': {
        this._playSfx('gong');
        const toName = this._getPlayerDisplayName(event.toPlayerId);
        const fromName = event.fromPlayerId ? this._getPlayerDisplayName(event.fromPlayerId) : null;
        this._showBigEventPopup({
          theme: 'curse',
          icon: '🐍',
          title: `${toName.toUpperCase()} GOT THE COBRA CURSE!`,
          subtitle: fromName
            ? `Passed from ${fromName} (-5 Gems Evil Spell)`
            : `Cursed by the Evil Ruby Cobra (-5 Gems)`,
        });
        break;
      }

      case 'great_jewel_transferred': {
        this._playSfx('victory');
        const toName = this._getPlayerDisplayName(event.toPlayerId);
        const fromName = this._getPlayerDisplayName(event.fromPlayerId);
        this._showBigEventPopup({
          theme: 'gold',
          icon: '👑',
          title: `${toName.toUpperCase()} STOLE THE GREAT JEWEL!`,
          subtitle: `Snatched the +5 Great Mummy Jewel from ${fromName}!`,
        });
        break;
      }

      case 'great_jewel_unlocked': {
        this._playSfx('gong');
        this._showBigEventPopup({
          theme: 'gold',
          icon: '🔓',
          title: 'GREAT MUMMY JEWEL UNLOCKED!',
          subtitle: 'All 6 Top-Level Gems collected — Land on Level 3 Great Jewel Space!',
        });
        break;
      }

      case 'major_announcement': {
        this._showBigEventPopup({
          theme: event.theme || 'gold',
          icon: event.icon || '🏺',
          title: event.title,
          subtitle: event.subtitle || '',
        });
        break;
      }

      case 'mummy_track_started':
        this.view3D.animateSarcophagusLeverPull();
        this._playMummyTrackAudio(event.track);
        break;

      case 'part2_started': {
        this._playSfx('gong');
        const claimer = this._getPlayerDisplayName(event.playerId);
        this._showBigEventPopup({
          theme: 'curse',
          icon: '👑🐍',
          title: `${claimer.toUpperCase()} CLAIMED THE GREAT JEWEL & COBRA CURSE!`,
          subtitle: 'PART II BEGINS — Race back to your Home Temple without the Cobra!',
        });
        this._showPart2RecordFlipBanner();
        break;
      }

      case 'game_over': {
        const winner = event.scores?.[0];
        const didLocalWin = this._didLocalHumanWin(event.scores);
        this._playSfx(didLocalWin ? 'victory_fanfare' : 'defeat_curse');
        if (winner) {
          this.view3D.triggerGameOverCelebration(winner.playerId);
          this._showBigEventPopup({
            theme: didLocalWin ? 'gold' : 'curse',
            icon: didLocalWin ? '👑🏆' : '⚰️🐍',
            title: didLocalWin
              ? `VICTORY! ${winner.name.toUpperCase()} WINS WITH ${winner.totalScore} GEMS!`
              : `TOMB SEALED! ${winner.name.toUpperCase()} WINS (${winner.totalScore} GEMS)!`,
            subtitle: didLocalWin
              ? 'You escaped the Pharaoh’s Tomb with the richest treasure!'
              : 'The Mummy seals the tomb doors on the vanquished explorers!',
          });
        }
        setTimeout(() => {
          this._showGameOverModal(event.scores);
        }, 2100);
        break;
      }

      default:
        break;
    }
  }

  async _playMummyTrackAudio(track) {
    if (!track) return;
    this._stopCurrentMummyAudio();
    const myPlaybackId = this.mummyTrackPlaybackId;

    // Show live Mummy Voice Banner
    const voiceBanner = document.getElementById('mummy-voice-banner');
    const voiceTitle = document.getElementById('mummy-voice-title');
    const voiceQuote = document.getElementById('mummy-voice-quote');
    if (voiceBanner && voiceTitle && voiceQuote) {
      voiceTitle.textContent = `🎙️ Record ${track.side === 'SideA' ? 'Side 1 (Part I)' : 'Side 2 (Part II)'} — "${track.title}"`;
      voiceQuote.textContent = `"${track.transcript}"`;
      voiceBanner.classList.remove('hidden');
    }

    let finished = false;
    const onEndedOrSkipped = () => {
      if (finished || this.mummyTrackPlaybackId !== myPlaybackId) return;
      finished = true;
      this.currentBufferSource = null;
      this.currentAudio = null;
      if (this.mp.mode !== 'guest' && this.engine.state?.phase === 'MUMMY_SPEAKING') {
        this.engine.finishMummyAudio();
      }
    };

    // 1. Primary path: Play via unlocked WebAudio AudioContext (works 100% of the time on iPhone/iPad/Android even inside bot setTimeout!)
    const ctx = this._ensureAudioContext();
    if (ctx && typeof window.fetch === 'function') {
      try {
        let audioBuffer = this.mummyBufferCache.get(track.url);
        if (!audioBuffer) {
          const resp = await fetch(track.url);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const arrBuf = await resp.arrayBuffer();
          audioBuffer = await ctx.decodeAudioData(arrBuf);
          this.mummyBufferCache.set(track.url, audioBuffer);
        }
        if (this.mummyTrackPlaybackId !== myPlaybackId) return;
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
        }
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.mummyGainNode || ctx.destination);
        this.currentBufferSource = source;
        source.onended = () => {
          onEndedOrSkipped();
        };
        source.start(0);
        return;
      } catch (err) {
        // Fall through to persistent HTMLAudioElement fallback below
      }
    }

    // 2. Fallback path: Reuse persistent user-unlocked HTMLAudioElement
    if (this.mummyTrackPlaybackId !== myPlaybackId) return;
    const audio = this.mummyAudioEl || new Audio();
    audio.muted = this.audioMuted;
    audio.volume = 1.0;
    audio.src = track.url;
    this.currentAudio = audio;

    audio.onended = onEndedOrSkipped;
    audio.onerror = () => {
      setTimeout(onEndedOrSkipped, 2500);
    };

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        setTimeout(onEndedOrSkipped, 3600);
      });
    }
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
    const colorNames = {
      blue: 'BLUE PAWN',
      red: 'RED PAWN',
      yellow: 'YELLOW PAWN',
      green: 'GREEN PAWN',
    };

    container.innerHTML = state.players
      .map((p) => {
        const cfg = PLAYERS_CONFIG.find((c) => c.id === p.id);
        const isTurn = curPlayer?.id === p.id;
        const sp = SPACES_BY_ID[p.spaceId];
        const hasGreatJewel = state.greatJewelOwner === p.id;
        const hasCobra = state.cobraOwner === p.id;
        const totalScore =
          p.jewels + (hasGreatJewel ? 5 : 0) + (hasCobra ? -5 : 0);
        const pawnLabel = colorNames[p.id] || p.id.toUpperCase();

        return `
          <div class="temple-player-card ${isTurn ? 'active-turn' : ''}" style="--player-color: ${p.colorHex}; --player-accent: ${p.accentHex}">
            ${
              isTurn
                ? `<div class="active-turn-ribbon">▶ ACTIVE TURN — NOW PLAYING</div>`
                : ''
            }
            <div class="temple-card-top">
              <div class="temple-card-visuals">
                <div class="explorer-figure-box" style="border-color: ${p.colorHex}; background: ${p.colorHex}28" title="${p.name} Character Figure">
                  <img src="${cfg.portraitImg}" alt="${p.name} Figure" class="explorer-figure-thumb" />
                  <span class="explorer-pawn-tag" style="background: ${p.colorHex}">${p.id.toUpperCase()}</span>
                </div>
                <img src="${cfg.templeImg}" alt="${p.deity} Temple" class="temple-deity-thumb" title="${p.deityTitle} Gem Holder" />
              </div>
              <div class="temple-player-info">
                <div class="temple-player-name-row">
                  <span class="pawn-color-pill" style="background: ${p.colorHex}">${pawnLabel}</span>
                  <span class="player-badge-role">${p.control === 'ai' ? '🤖 Bot' : '🧑 You/Human'}</span>
                </div>
                <div class="temple-player-title-strong">${p.name}</div>
                <div class="temple-deity-sub">${p.deityTitle} • Level ${p.level}</div>
                <div class="temple-space-sub">📍 ${sp ? sp.label : ''}</div>
              </div>
              <div class="temple-score-box" title="Total Gems Value (${p.jewels} Scarab Gems${hasGreatJewel ? ' + 5 Great Jewel' : ''}${hasCobra ? ' - 5 Cobra Curse' : ''})">
                <div class="score-num">${totalScore}</div>
                <svg class="score-gem-icon" viewBox="0 0 28 22" aria-label="Gems">
                  <polygon points="8,1 20,1 27,7 27,15 20,21 8,21 1,15 1,7" fill="#00a838" stroke="#85ffba" stroke-width="1.5" />
                  <polygon points="9,5 19,5 22,8 22,14 19,17 9,17 6,14 6,8" fill="#00e054" stroke="#baffd8" stroke-width="0.9" />
                  <line x1="8" y1="1" x2="9" y2="5" stroke="#baffd8" stroke-width="0.9" />
                  <line x1="20" y1="1" x2="19" y2="5" stroke="#baffd8" stroke-width="0.9" />
                  <line x1="27" y1="7" x2="22" y2="8" stroke="#baffd8" stroke-width="0.9" />
                  <line x1="27" y1="15" x2="22" y2="14" stroke="#006622" stroke-width="0.9" />
                  <line x1="20" y1="21" x2="19" y2="17" stroke="#006622" stroke-width="0.9" />
                  <line x1="8" y1="21" x2="9" y2="17" stroke="#006622" stroke-width="0.9" />
                  <line x1="1" y1="15" x2="6" y2="14" stroke="#006622" stroke-width="0.9" />
                  <line x1="1" y1="7" x2="6" y2="8" stroke="#baffd8" stroke-width="0.9" />
                  <polygon points="10,6.5 17,6.5 14,10" fill="#ffffff" fill-opacity="0.55" />
                </svg>
              </div>
            </div>
            ${
              hasGreatJewel || hasCobra
                ? `<div class="temple-inventory-row">
                    ${
                      hasGreatJewel
                        ? `<span class="inv-pill gold" title="The Great Mummy Jewel (+5)">👑 <span class="inv-lbl-desk">Great Jewel </span>(+5)</span>`
                        : ''
                    }
                    ${
                      hasCobra
                        ? `<span class="inv-pill ruby-curse" title="Evil Cobra Spell (-5 & cannot end game)">🐍 <span class="inv-lbl-desk">Cobra Curse </span>(-5)</span>`
                        : ''
                    }
                  </div>`
                : ''
            }
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

    const cfg = PLAYERS_CONFIG.find((c) => c.id === player.id);
    const isMyTurn = this.mp.isPlayerLocalTurn(state);
    const dieFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const dieChar = state.lastRoll ? dieFaces[state.lastRoll - 1] : '🎲';

    let controlsHtml = '';

    if (state.phase === 'MUMMY_SPEAKING') {
      const canSkip = isMyTurn || (player.control === 'ai' && this.mp.mode !== 'guest');
      controlsHtml = `
        <div class="mummy-speaking-status">
          🎙️ Listening to the Voice of the Mummy...
        </div>
        ${
          canSkip
            ? `<button class="btn-secondary-action" id="btn-skip-audio">
                Obey Command Now ➔
              </button>`
            : ''
        }
      `;
    } else if (!isMyTurn) {
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
      <div class="turn-header-strip" style="border-left: 6px solid ${player.colorHex}">
        <div class="turn-who-row">
          <div class="turn-explorer-avatar" style="background: ${player.colorHex}33; border-color: ${player.colorHex}">
            <img src="${cfg?.portraitImg || ''}" alt="${player.name}" />
          </div>
          <div class="turn-who">
            <span class="turn-tag">TURN #${state.turnNumber} • <span class="turn-color-chip" style="background:${player.colorHex}">${player.id.toUpperCase()} PAWN</span></span>
            <strong>${player.name} (${player.deity})</strong>
          </div>
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
      this._stopCurrentMummyAudio();
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

  _didLocalHumanWin(scores) {
    if (!scores || scores.length === 0) return true;
    const winnerId = scores[0].playerId;
    const players = this.activeState?.players || this.engine?.state?.players || [];
    const humans = players.filter((p) => p.control === 'human');
    if (humans.length === 0) return true;
    if (this.mp.mode !== 'local') {
      const myHuman = humans.find((p) => p.peerId === this.mp.myPeerId);
      if (myHuman) return myHuman.id === winnerId;
    }
    if (humans.length === 1) {
      return humans[0].id === winnerId;
    }
    // In local Pass & Play with multiple humans, if any human won, celebrate victory!
    return humans.some((h) => h.id === winnerId);
  }

  _getLocalHumanPlayer() {
    const players = this.activeState?.players || this.engine?.state?.players || [];
    const humans = players.filter((p) => p.control === 'human');
    if (this.mp.mode !== 'local') {
      return humans.find((p) => p.peerId === this.mp.myPeerId) || humans[0] || null;
    }
    return humans.length === 1 ? humans[0] : null;
  }

  _showGameOverModal(scores) {
    const modal = document.getElementById('modal-gameover');
    const modalCard = document.getElementById('gameover-modal-card');
    const modalTitle = document.getElementById('gameover-modal-title');
    const particlesEl = document.getElementById('gameover-particles');
    const body = document.getElementById('gameover-scores-body');
    if (!modal || !body || !scores || scores.length === 0) return;

    const winner = scores[0];
    const winnerCfg = PLAYERS_CONFIG.find((c) => c.id === winner.playerId);
    const losers = scores.slice(1);
    const didLocalWin = this._didLocalHumanWin(scores);
    const myHuman = this._getLocalHumanPlayer();
    const myScoreEntry = myHuman ? scores.find((s) => s.playerId === myHuman.id) : null;

    if (modalCard) {
      modalCard.classList.toggle('is-victory', didLocalWin);
      modalCard.classList.toggle('is-defeat', !didLocalWin);
    }
    if (modalTitle) {
      modalTitle.innerHTML = didLocalWin
        ? '👑 Grand Pharaoh’s Triumph — Expedition Complete!'
        : '⚰️ The Tomb Doors Seal — Expedition Complete!';
    }

    // Spawn falling celebration gems/crowns (on Victory) or cursed cobras/skulls (on Defeat)
    if (particlesEl) {
      const icons = didLocalWin
        ? ['💎', '👑', '✨', '🏺', '🪙', '💎']
        : ['🐍', '⚰️', '💀', '🕸️', '🐍', '💎'];
      particlesEl.innerHTML = Array.from({ length: 28 })
        .map((_, idx) => {
          const left = ((idx * 37) % 96) + 2;
          const delay = ((idx * 0.23) % 3.2).toFixed(2);
          const dur = (3.0 + (idx % 5) * 0.55).toFixed(2);
          const size = 18 + (idx % 4) * 5;
          const icon = icons[idx % icons.length];
          return `<span class="gameover-particle" style="left:${left}%; animation-delay:${delay}s; animation-duration:${dur}s; font-size:${size}px;">${icon}</span>`;
        })
        .join('');
    }

    const gemIconSvg = `
      <svg class="score-gem-icon" viewBox="0 0 28 22" aria-label="Gems">
        <polygon points="8,1 20,1 27,7 27,15 20,21 8,21 1,15 1,7" fill="#00a838" stroke="#85ffba" stroke-width="1.5" />
        <polygon points="9,5 19,5 22,8 22,14 19,17 9,17 6,14 6,8" fill="#00e054" stroke="#baffd8" stroke-width="0.9" />
        <polygon points="10,6.5 17,6.5 14,10" fill="#ffffff" fill-opacity="0.55" />
      </svg>
    `;

    let personalBannerHtml = '';
    if (didLocalWin) {
      personalBannerHtml = `
        <div class="gameover-outcome-banner outcome-victory">
          <div class="outcome-badge-icon">🏆</div>
          <div class="outcome-banner-texts">
            <div class="outcome-kicker">PHARAOH’S BLESSING • GRAND VICTORY!</div>
            <div class="outcome-headline">${winner.name} Escaped the Tomb in Triumph!</div>
            <div class="outcome-sub">The golden treasures of the Stepped Pyramid belong to ${winner.deityTitle}!</div>
          </div>
        </div>
      `;
    } else {
      const myFateReason = myScoreEntry?.hasCobra
        ? `You were left holding the Cursed Ruby Cobra (-5 Gems) when the tomb sealed!`
        : myScoreEntry?.finishedFirst
        ? `You escaped to your temple first, but ${winner.name} outscored you in total Gems!`
        : `You were trapped inside the pyramid while ${winner.name} claimed the richest treasure!`;
      personalBannerHtml = `
        <div class="gameover-outcome-banner outcome-defeat">
          <div class="outcome-badge-icon">⚰️</div>
          <div class="outcome-banner-texts">
            <div class="outcome-kicker">THE MUMMY’S CURSE • DEFEAT!</div>
            <div class="outcome-headline">${winner.name} Conquered the Tomb!</div>
            <div class="outcome-sub">${myFateReason}</div>
          </div>
        </div>
      `;
    }

    body.innerHTML = `
      ${personalBannerHtml}

      <!-- 1ST PLACE WINNER SHOWCASE -->
      <div class="gameover-winner-showcase" style="--winner-color: ${winner.colorHex}">
        <div class="winner-showcase-left">
          <div class="winner-Visuals-pair">
            <div class="winner-figure-frame" style="border-color: ${winner.colorHex}; background: ${winner.colorHex}30">
              <span class="winner-crown-float">👑</span>
              <img src="${winnerCfg?.portraitImg || ''}" alt="${winner.name}" class="winner-figure-img" />
              <span class="winner-pawn-pill" style="background: ${winner.colorHex}">#1 WINNER</span>
            </div>
            <img src="${winnerCfg?.templeImg || ''}" alt="${winner.deity}" class="winner-temple-img" />
          </div>
          <div class="winner-info-col">
            <div class="winner-rank-tag">🥇 1ST PLACE • TOMB CHAMPION</div>
            <h3 class="winner-name-big">${winner.name} (${winner.deity})</h3>
            <div class="winner-breakdown-pills">
              <span class="win-pill emerald">💎 ${winner.preciousJewels} Scarab Gems</span>
              ${winner.hasGreatJewel ? `<span class="win-pill gold">👑 Great Jewel (+5)</span>` : ''}
              ${winner.finishedFirst ? `<span class="win-pill temple">🏛️ Escaped Tomb First!</span>` : ''}
              ${winner.hasCobra ? `<span class="win-pill curse">🐍 Cobra Curse (-5)</span>` : ''}
            </div>
          </div>
        </div>
        <div class="winner-score-pedestal">
          <div class="winner-score-num">${winner.totalScore}</div>
          ${gemIconSvg}
        </div>
      </div>

      <!-- VANQUISHED EXPLORERS (LOSERS FATE GRID) -->
      <div class="gameover-losers-header">⚰️ FATE OF THE VANQUISHED EXPLORERS</div>
      <div class="gameover-losers-grid">
        ${losers
          .map((s, idx) => {
            const cfg = PLAYERS_CONFIG.find((c) => c.id === s.playerId);
            const rankNum = idx + 2;
            const fateTitle = s.hasCobra
              ? '🐍 Cursed by the Ruby Cobra (-5)!'
              : s.finishedFirst
              ? '🏃 Escaped First, Outscored in Gems!'
              : '🕸️ Trapped Inside the Pyramid!';
            const fateClass = s.hasCobra ? 'fate-cursed' : 'fate-trapped';
            return `
              <div class="loser-fate-card ${fateClass}" style="--loser-color: ${s.colorHex}">
                <div class="loser-card-top">
                  <div class="loser-figure-wrap" style="border-color: ${s.colorHex}">
                    <img src="${cfg?.portraitImg || ''}" alt="${s.name}" class="loser-figure-img" />
                    <span class="loser-rank-tag" style="background: ${s.colorHex}">#${rankNum}</span>
                  </div>
                  <div class="loser-meta">
                    <div class="loser-name">${s.name}</div>
                    <div class="loser-deity">${s.deity} • ${s.preciousJewels} Scarabs${s.hasGreatJewel ? ' • 👑 +5' : ''}${s.hasCobra ? ' • 🐍 -5' : ''}</div>
                    <div class="loser-fate-badge ${fateClass}">${fateTitle}</div>
                  </div>
                  <div class="temple-score-box loser-score-box">
                    <div class="score-num">${s.totalScore}</div>
                    ${gemIconSvg}
                  </div>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
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
        this._stopCurrentMummyAudio();
        const a = this.mummyAudioEl || new Audio();
        a.muted = this.audioMuted;
        a.src = btn.dataset.sampleUrl;
        this.currentAudio = a;
        a.play().catch(() => {});
      });
    });
  }

  /**
   * Procedural WebAudio synthesizer for crisp tactile tabletop sound effects (dice, steps, jewels).
   */
  _playSfx(type) {
    if (this.audioMuted) return;
    try {
      const ctx = this._ensureAudioContext();
      if (!ctx) return;
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
      } else if (type === 'victory_fanfare') {
        // Triumphant Royal Pharaoh Trumpet & Harp Fanfare
        const notes = [
          { f: 261.63, t: 0.0, d: 0.18 },
          { f: 329.63, t: 0.16, d: 0.18 },
          { f: 392.0, t: 0.32, d: 0.18 },
          { f: 523.25, t: 0.48, d: 0.35 },
          { f: 392.0, t: 0.82, d: 0.18 },
          { f: 523.25, t: 1.0, d: 0.85 },
          { f: 659.25, t: 1.0, d: 0.85 },
          { f: 783.99, t: 1.0, d: 0.85 },
        ];
        notes.forEach((n) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(n.f, now + n.t);
          gain.gain.setValueAtTime(0.16, now + n.t);
          gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + n.t);
          osc.stop(now + n.t + n.d + 0.02);
        });
      } else if (type === 'defeat_curse') {
        // Dramatic Descending Mummy's Tomb Seal Chord
        const notes = [
          { f: 293.66, t: 0.0, d: 0.32 },
          { f: 277.18, t: 0.3, d: 0.32 },
          { f: 246.94, t: 0.6, d: 0.35 },
          { f: 196.0, t: 0.92, d: 1.1 },
          { f: 146.83, t: 0.92, d: 1.1 },
          { f: 116.54, t: 0.92, d: 1.1 },
        ];
        notes.forEach((n) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(n.f, now + n.t);
          gain.gain.setValueAtTime(0.09, now + n.t);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + n.t + n.d);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + n.t);
          osc.stop(now + n.t + n.d + 0.02);
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
