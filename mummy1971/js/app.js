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
  FAMOUS_ADVENTURER_NAMES,
  pickAdventurerNames,
} from './board_data.js?v=39';
import { VoiceOfTheMummyEngine, TOP_LEVEL_JEWEL_IDS } from './game_engine.js?v=39';
import { Mummy3DView } from './view_3d.js?v=39';
import { Mummy2DView } from './view_2d.js?v=39';
import { MultiplayerManager } from './multiplayer.js?v=39';

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

    // Single Player & Step 1 Multiplayer Wizard state
    this.selectedSingleSeatId = 'blue';
    this.selectedSingleBotIds = new Set(['red', 'yellow', 'green']);
    this.botTraits = {
      blue: { rightHanded: false, ageEven: true },
      red: { rightHanded: true, ageEven: true },
      yellow: { rightHanded: false, ageEven: false },
      green: { rightHanded: true, ageEven: false },
    };
    const initBotPool = pickAdventurerNames(4);
    this.botAdventurerNames = {
      blue: initBotPool[0],
      red: initBotPool[1],
      yellow: initBotPool[2],
      green: initBotPool[3],
    };
    this.selectedHostSeatId = 'blue';
    this.selectedGuestSeatId = 'red';
    this.selectedHumanCount = 2;
    this.mpGameStarted = false;

    this.engine = new VoiceOfTheMummyEngine(
      (state) => this._onAuthoritativeStateChange(state),
      (event) => this._onAuthoritativeEvent(event)
    );

    this.mp = new MultiplayerManager({
      onLobbyUpdate: (lobby) => {
        const myAssignedSeat = lobby?.seats?.find((s) => s.peerId === this.mp.myPeerId);
        if (myAssignedSeat) {
          this.selectedGuestSeatId = myAssignedSeat.id;
        }
        const urlInput = document.getElementById('share-invite-url');
        if (urlInput && this.mp.roomCode) {
          urlInput.value = this.mp.getShareableInviteUrl();
        }
        this._renderLobbySeats(lobby);
        this._renderGuestInviteCharPicker();
        this._renderGuestWaitingCaveUI();
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
        if (this.mpGameStarted && this.engine.state && assignedSeatId) {
          // Late joiner into an already-started multiplayer game
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
   * Unlocks and auto-recovers WebAudio (AudioContext) and persistent HTML5 Audio on user taps/clicks
   * AND whenever the player switches back from another app (e.g. Messages / lock screen on iPhone/iPad/Android)
   * so Mummy voice tracks and sound effects NEVER go silent after leaving and returning to the browser!
   */
  _initAudioUnlocker() {
    this.pendingBlockedTrack = null;
    this.lastPlayedTrackId = null;
    this.lastPlayedTrackTime = 0;
    this.lastPlayedTrackTurnKey = null;

    const configureAudioSession = () => {
      if (typeof navigator !== 'undefined' && navigator.audioSession) {
        try {
          navigator.audioSession.type = 'playback';
        } catch (e) {
          // Ignore
        }
      }
    };
    configureAudioSession();

    const unlock = (isUserGesture = true) => {
      configureAudioSession();
      const ctx = this._ensureAudioContext(isUserGesture);
      if (ctx) {
        if (ctx.state !== 'running') {
          ctx.resume().catch(() => {});
        }
        if (isUserGesture) {
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
      }

      // If a Mummy track was waiting for a tap after returning from background, play it immediately!
      if (isUserGesture && this.pendingBlockedTrack) {
        const pending = this.pendingBlockedTrack;
        this.pendingBlockedTrack = null;
        if (this.activeState?.phase === 'MUMMY_SPEAKING' && pending.track) {
          this._playMummyTrackAudio(pending.track);
          return;
        }
      }

      // Only prime the persistent HTMLAudioElement if no real Mummy track is currently playing!
      const isPlayingRealTrack = Boolean(this.currentBufferSource || this.currentAudio);
      if (isUserGesture && !this.mummyAudioUnlocked && this.mummyAudioEl && !isPlayingRealTrack) {
        try {
          this.mummyAudioEl.src =
            'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
          this.mummyAudioEl.volume = 0.01;
          const p = this.mummyAudioEl.play();
          if (p && typeof p.then === 'function') {
            p.then(() => {
              this.mummyAudioUnlocked = true;
              if (!this.currentAudio) {
                this.mummyAudioEl.pause();
                this.mummyAudioEl.volume = 1.0;
              }
            }).catch(() => {
              this.mummyAudioUnlocked = false;
              this.mummyAudioEl.volume = 1.0;
            });
          }
        } catch (e) {
          this.mummyAudioUnlocked = false;
        }
      }
    };

    window.addEventListener('pointerdown', () => unlock(true), { passive: true });
    window.addEventListener('touchend', () => unlock(true), { passive: true });
    window.addEventListener('click', () => unlock(true), { passive: true });
    window.addEventListener('keydown', () => unlock(true), { passive: true });

    // When a player leaves the game (switches to Messages, locks phone, etc.) and comes back,
    // iOS Safari puts AudioContext into 'interrupted' state and invalidates HTMLAudioElement locks.
    // Mark mummyAudioUnlocked = false on hide/blur and immediately wake AudioContext on return!
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.mummyAudioUnlocked = false;
      } else if (document.visibilityState === 'visible') {
        unlock(false);
      }
    });
    window.addEventListener('pagehide', () => {
      this.mummyAudioUnlocked = false;
    });
    window.addEventListener('blur', () => {
      this.mummyAudioUnlocked = false;
    });
    window.addEventListener('pageshow', () => unlock(false));
    window.addEventListener('focus', () => unlock(false));
  }

  _ensureAudioContext(fromUserGesture = false) {
    try {
      if (typeof navigator !== 'undefined' && navigator.audioSession) {
        try {
          navigator.audioSession.type = 'playback';
        } catch (e) {
          // Ignore
        }
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;

      // If iOS closed the old context after background suspension, recreate it
      if (this.audioCtx && this.audioCtx.state === 'closed') {
        this.audioCtx = null;
        this.mummyGainNode = null;
      }

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
        this.mummyGainNode = this.audioCtx.createGain();
        this.mummyGainNode.gain.value = this.audioMuted ? 0 : 1.0;
        this.mummyGainNode.connect(this.audioCtx.destination);
        this.audioCtx.onstatechange = () => {
          if (
            this.audioCtx &&
            this.audioCtx.state !== 'running' &&
            this.audioCtx.state !== 'closed' &&
            document.visibilityState === 'visible'
          ) {
            this.audioCtx.resume().catch(() => {});
          }
        };
      }

      // Catch BOTH 'suspended' AND iOS Safari's 'interrupted' state after leaving the app!
      if (this.audioCtx.state !== 'running') {
        this.audioCtx.resume().catch(() => {
          if (fromUserGesture) {
            try {
              this.audioCtx.close().catch(() => {});
            } catch (e) {
              // Ignore
            }
            this.audioCtx = new AudioContextClass();
            this.mummyGainNode = this.audioCtx.createGain();
            this.mummyGainNode.gain.value = this.audioMuted ? 0 : 1.0;
            this.mummyGainNode.connect(this.audioCtx.destination);
            this.audioCtx.resume().catch(() => {});
          }
        });
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
    this.pendingBlockedTrack = null;
    if (this.mummyFallbackTimer) {
      clearTimeout(this.mummyFallbackTimer);
      this.mummyFallbackTimer = null;
    }
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
    this.gameStartedAt = performance.now();
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
    // Guarantee "💎 Gem Box" and "🏠 Main Menu" buttons exist even if the browser cached an older index.html
    const vintagePill = document.querySelector('.intro-vintage-pill');
    if (vintagePill) {
      vintagePill.textContent = '1971 MILTON BRADLEY • 3D & 2D DIGITAL EDITION • v39';
    }
    const toolbar = document.querySelector('.pane-floating-toolbar');
    if (toolbar && !toolbar.querySelector('[data-cam-preset="gembox"]')) {
      const gemBtn = document.createElement('button');
      gemBtn.className = 'cam-pill-btn';
      gemBtn.dataset.camPreset = 'gembox';
      gemBtn.title = 'Center Over Your Temple Gem Collection Box';
      gemBtn.textContent = '💎 Gem Box';
      const sarcBtn = toolbar.querySelector('[data-cam-preset="sarcophagus"]');
      if (sarcBtn && sarcBtn.nextSibling) {
        toolbar.insertBefore(gemBtn, sarcBtn.nextSibling);
      } else {
        toolbar.appendChild(gemBtn);
      }
    }
    const navGroup = document.querySelector('.nav-actions-group');
    if (navGroup && !document.getElementById('btn-open-home')) {
      const homeBtn = document.createElement('button');
      homeBtn.className = 'nav-btn';
      homeBtn.id = 'btn-open-home';
      homeBtn.title = 'Return to Main Front Page (Single Player or Multiplayer)';
      homeBtn.innerHTML = '🏠 <span class="nav-btn-label">Main Menu</span>';
      const lobbyBtn = document.getElementById('btn-open-lobby');
      if (lobbyBtn) {
        navGroup.insertBefore(homeBtn, lobbyBtn);
      } else {
        navGroup.appendChild(homeBtn);
      }
    }

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

    // Intro Landing Card ("Single Player" vs "Multiplayer") & Global "Return to Main Front Page" Buttons
    document.getElementById('btn-landing-single')?.addEventListener('click', () => {
      this._leaveMultiplayerAndOpenSinglePlayer();
    });

    document.getElementById('btn-open-home')?.addEventListener('click', () => {
      this._returnToMainFrontPage();
    });
    document.getElementById('brand-home-link')?.addEventListener('click', () => {
      this._returnToMainFrontPage();
    });
    document.getElementById('btn-lobby-home')?.addEventListener('click', () => {
      this._returnToMainFrontPage();
    });
    document.getElementById('btn-invite-home')?.addEventListener('click', () => {
      this._returnToMainFrontPage();
    });
    document.getElementById('btn-waiting-home')?.addEventListener('click', () => {
      this._returnToMainFrontPage();
    });

    document.getElementById('btn-close-single-setup')?.addEventListener('click', () => {
      document.getElementById('modal-single-setup')?.classList.add('hidden');
      document.getElementById('modal-intro-landing')?.classList.remove('hidden');
    });

    document.getElementById('btn-start-single-game')?.addEventListener('click', () => {
      this._startSinglePlayerGame();
    });

    document.getElementById('input-single-name')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this._startSinglePlayerGame();
      }
    });

    // Toggle Collapsible "Advanced Bot Settings" Tab in Single Player Setup
    document.getElementById('btn-toggle-single-advanced')?.addEventListener('click', () => {
      const panel = document.getElementById('single-advanced-panel');
      const btn = document.getElementById('btn-toggle-single-advanced');
      const chev = document.getElementById('single-advanced-chevron');
      if (!panel) return;
      const isNowOpen = panel.classList.toggle('hidden') === false;
      if (btn) {
        btn.classList.toggle('open', isNowOpen);
        btn.setAttribute('aria-expanded', String(isNowOpen));
      }
      if (chev) {
        chev.textContent = isNowOpen ? '▴' : '▾';
      }
    });

    // Single Player Bot Count Pills (1 Bot, 2 Bots, 3 Bots)
    document.querySelectorAll('[data-single-bot-count]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetCount = Math.max(1, Math.min(3, Number(btn.dataset.singleBotCount) || 3));
        const availableIds = PLAYERS_CONFIG.map((c) => c.id).filter((id) => id !== this.selectedSingleSeatId);
        const kept = availableIds.filter((id) => this.selectedSingleBotIds.has(id)).slice(0, targetCount);
        for (const id of availableIds) {
          if (kept.length >= targetCount) break;
          if (!kept.includes(id)) kept.push(id);
        }
        this.selectedSingleBotIds = new Set(kept);
        this._renderSingleBotPicker();
      });
    });

    document.getElementById('btn-landing-multi')?.addEventListener('click', () => {
      document.getElementById('modal-intro-landing')?.classList.add('hidden');
      document.getElementById('modal-single-setup')?.classList.add('hidden');
      this._openMultiplayerModal();
    });

    document.getElementById('btn-landing-rules')?.addEventListener('click', () => {
      document.getElementById('modal-rules')?.classList.remove('hidden');
    });

    // Lobby Modal Open / Close
    document.getElementById('btn-open-lobby')?.addEventListener('click', () => {
      document.getElementById('modal-intro-landing')?.classList.add('hidden');
      document.getElementById('modal-single-setup')?.classList.add('hidden');
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
      this.mpGameStarted = false;
      clearTimeout(this.botTimer);
      const rawHostName = document.getElementById('input-player-name')?.value?.trim() || '';
      const hostName = rawHostName || pickAdventurerNames(1)[0];
      const hostInput = document.getElementById('input-player-name');
      if (hostInput && !rawHostName) hostInput.value = hostName;
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
      const rawHostName = document.getElementById('input-player-name')?.value?.trim() || '';
      const hostName = rawHostName || pickAdventurerNames(1)[0];
      const usedNames = [hostName];
      const fillWithAi = document.getElementById('chk-fill-ai')?.checked ?? true;
      this.mp.disconnect();
      let humansRemaining = this.selectedHumanCount - 1;
      for (const s of this.mp.lobbyState.seats) {
        if (s.id === this.selectedHostSeatId) {
          s.control = 'human';
          s.peerId = 'local';
          s.name = hostName;
        } else if (humansRemaining > 0) {
          const nextAdv = pickAdventurerNames(1, usedNames)[0];
          usedNames.push(nextAdv);
          s.control = 'human';
          s.peerId = 'local';
          s.name = nextAdv;
          humansRemaining--;
        } else {
          const nextAdv = pickAdventurerNames(1, usedNames)[0];
          usedNames.push(nextAdv);
          s.control = fillWithAi ? 'ai' : 'none';
          s.peerId = null;
          s.name = nextAdv;
        }
      }
      document.getElementById('modal-lobby')?.classList.add('hidden');
      this._resetViewForNewGame();
      this.engine.initGame(this.mp.lobbyState.seats);
    });

    // Step 2 -> Back to Step 1
    document.getElementById('btn-mp-back-step1')?.addEventListener('click', () => {
      this.mpGameStarted = false;
      this.mp.disconnect(true);
      this._setMultiplayerWizardStep(1);
    });

    // Refresh Room Status Buttons (Host & Guest)
    document.getElementById('btn-host-refresh-sync')?.addEventListener('click', () => {
      this.mp.refreshRoomSync();
      const btn = document.getElementById('btn-host-refresh-sync');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = '✅ Room Synced!';
        setTimeout(() => {
          btn.textContent = orig;
        }, 1600);
      }
    });
    document.getElementById('btn-guest-refresh-sync')?.addEventListener('click', () => {
      this.mp.refreshRoomSync();
      this._renderGuestWaitingCaveUI();
      const btn = document.getElementById('btn-guest-refresh-sync');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = '✅ Room Status Refreshed!';
        setTimeout(() => {
          btn.textContent = orig;
        }, 1600);
      }
    });

    // Guest Invite Accept Modal ("Pick Your Piece & Enter Your Name" -> "Pyramid Cave Waiting Screen")
    document.getElementById('btn-accept-invite-join')?.addEventListener('click', () => {
      this._acceptInviteAndJoinRoom();
    });
    document.getElementById('input-invite-guest-name')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this._acceptInviteAndJoinRoom();
      }
    });
    document.getElementById('btn-guest-edit-choice')?.addEventListener('click', () => {
      document.getElementById('guest-invite-step-waiting')?.classList.add('hidden');
      document.getElementById('guest-invite-step-setup')?.classList.remove('hidden');
      this._renderGuestInviteCharPicker();
    });

    // Guest Name Update Button (for friends who clicked the Invite Link)
    const saveGuestName = () => {
      const guestName = document.getElementById('input-guest-name')?.value?.trim() || 'Explorer';
      const mySeat = this.mp.lobbyState.seats.find((s) => s.peerId === this.mp.myPeerId);
      if (mySeat) {
        this.mp.claimExplorerSeat(mySeat.id, guestName);
      }
      const btn = document.getElementById('btn-save-guest-name');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = '✅ Name Saved!';
        setTimeout(() => {
          btn.textContent = orig;
        }, 1800);
      }
    };
    document.getElementById('btn-save-guest-name')?.addEventListener('click', saveGuestName);
    document.getElementById('input-guest-name')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveGuestName();
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
    // Pass ONLY { url } (no extra text prefix) so Apple iMessage renders the full Rich Image Preview Card!
    document.getElementById('btn-share-invite')?.addEventListener('click', async () => {
      const url = this.mp.getShareableInviteUrl();
      if (navigator.share) {
        try {
          await navigator.share({
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

    // Victory Modal Buttons ("Main Front Page", "New Single Player", "Play Again", & "View 3D Board")
    document.getElementById('btn-gameover-home')?.addEventListener('click', () => {
      this._returnToMainFrontPage();
    });
    document.getElementById('btn-gameover-single')?.addEventListener('click', () => {
      this._leaveMultiplayerAndOpenSinglePlayer();
    });
    document.getElementById('btn-play-again')?.addEventListener('click', () => {
      document.getElementById('modal-gameover')?.classList.add('hidden');
      const humans = (this.activeState?.players || []).filter((p) => p.control === 'human');
      if (this.mp.mode === 'local' && humans.length === 1) {
        this._openSingleSetupModal();
      } else {
        this._openMultiplayerModal();
      }
    });
    document.getElementById('btn-close-gameover')?.addEventListener('click', () => {
      document.getElementById('modal-gameover')?.classList.add('hidden');
    });
    document.getElementById('btn-view-gameover-board')?.addEventListener('click', () => {
      document.getElementById('modal-gameover')?.classList.add('hidden');
    });

    // Render Single Player & Step 1 Multiplayer Character Pickers & initial Lobby seats
    this._renderSingleCharacterPicker();
    this._renderSingleBotPicker();
    this._renderStep1HostCharacterPicker();
    this._renderLobbySeats(this.mp.lobbyState);
  }

  /**
   * Cleanly leaves any active or finished Multiplayer room and returns to the Main Front Page
   * so the player can choose Single Player or Multiplayer at any time.
   */
  _returnToMainFrontPage() {
    clearTimeout(this.botTimer);
    this.botTimer = null;
    this._stopCurrentMummyAudio();
    this.mpGameStarted = false;
    this.pendingInviteRoomCode = null;
    this.mp.disconnect(true);
    document.getElementById('top-room-badge')?.classList.add('hidden');
    document.getElementById('btn-top-copy-invite')?.classList.add('hidden');
    document.getElementById('btn-top-sms-invite')?.classList.add('hidden');
    document.getElementById('mp-main-waiting-banner')?.classList.add('hidden');
    document.getElementById('modal-gameover')?.classList.add('hidden');
    document.getElementById('modal-lobby')?.classList.add('hidden');
    document.getElementById('modal-single-setup')?.classList.add('hidden');
    document.getElementById('modal-guest-invite')?.classList.add('hidden');
    document.getElementById('modal-rules')?.classList.add('hidden');
    document.getElementById('modal-intro-landing')?.classList.remove('hidden');
  }

  /**
   * Cleanly leaves any Multiplayer room and opens the Single Player Setup modal directly.
   */
  _leaveMultiplayerAndOpenSinglePlayer() {
    clearTimeout(this.botTimer);
    this.botTimer = null;
    this._stopCurrentMummyAudio();
    this.mpGameStarted = false;
    this.pendingInviteRoomCode = null;
    this.mp.disconnect(true);
    document.getElementById('top-room-badge')?.classList.add('hidden');
    document.getElementById('btn-top-copy-invite')?.classList.add('hidden');
    document.getElementById('btn-top-sms-invite')?.classList.add('hidden');
    document.getElementById('mp-main-waiting-banner')?.classList.add('hidden');
    document.getElementById('modal-gameover')?.classList.add('hidden');
    document.getElementById('modal-lobby')?.classList.add('hidden');
    document.getElementById('modal-guest-invite')?.classList.add('hidden');
    document.getElementById('modal-intro-landing')?.classList.add('hidden');
    this._openSingleSetupModal();
  }

  _openSingleSetupModal() {
    const freshPool = pickAdventurerNames(4);
    this.botAdventurerNames = {
      blue: freshPool[0],
      red: freshPool[1],
      yellow: freshPool[2],
      green: freshPool[3],
    };
    this._renderSingleCharacterPicker();
    this._renderSingleBotPicker();
    // Always start with the Advanced Bot Settings tab collapsed for a clean, instant "Pick Piece -> Enter Name -> Start Playing" flow
    document.getElementById('single-advanced-panel')?.classList.add('hidden');
    const advBtn = document.getElementById('btn-toggle-single-advanced');
    if (advBtn) {
      advBtn.classList.remove('open');
      advBtn.setAttribute('aria-expanded', 'false');
    }
    const chev = document.getElementById('single-advanced-chevron');
    if (chev) chev.textContent = '▾';
    document.getElementById('modal-single-setup')?.classList.remove('hidden');
  }

  _renderSingleCharacterPicker() {
    const container = document.getElementById('single-character-picker');
    if (!container) return;

    container.innerHTML = PLAYERS_CONFIG.map((cfg) => {
      const isSelected = cfg.id === this.selectedSingleSeatId;
      return `
        <button type="button" class="mp-char-pick-card ${isSelected ? 'selected' : ''}" data-pick-single-seat="${cfg.id}" style="--char-color: ${cfg.colorHex}">
          <div class="mp-char-visuals">
            <img src="${cfg.portraitImg}" alt="${cfg.name}" class="mp-char-fig" />
            <img src="${cfg.templeImg}" alt="${cfg.deity}" class="mp-char-temple" />
          </div>
          <div class="mp-char-name">${cfg.name}</div>
          <div class="mp-char-deity">${cfg.deityTitle}</div>
          <div class="mp-char-badge" style="background: ${cfg.colorHex}">
            ${isSelected ? '✓ YOUR PIECE' : 'Tap to Pick'}
          </div>
        </button>
      `;
    }).join('');

    container.querySelectorAll('[data-pick-single-seat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const prevSeatId = this.selectedSingleSeatId;
        const nextSeatId = btn.dataset.pickSingleSeat;
        if (nextSeatId === prevSeatId) return;
        this.selectedSingleSeatId = nextSeatId;
        // If the newly picked human Explorer color was previously an active AI Bot, swap the old human seat into the active bots
        if (this.selectedSingleBotIds.has(nextSeatId)) {
          this.selectedSingleBotIds.delete(nextSeatId);
          this.selectedSingleBotIds.add(prevSeatId);
        }
        this._renderSingleCharacterPicker();
        this._renderSingleBotPicker();
      });
    });
  }

  _renderSingleBotPicker() {
    const container = document.getElementById('single-bot-picker');
    if (!container) return;

    const availableConfigs = PLAYERS_CONFIG.filter((cfg) => cfg.id !== this.selectedSingleSeatId);
    // Ensure selectedSingleBotIds only contains non-human IDs and has at least 1 bot
    for (const id of Array.from(this.selectedSingleBotIds)) {
      if (id === this.selectedSingleSeatId) {
        this.selectedSingleBotIds.delete(id);
      }
    }
    if (this.selectedSingleBotIds.size === 0 && availableConfigs.length > 0) {
      this.selectedSingleBotIds.add(availableConfigs[0].id);
    }

    const activeBotCount = this.selectedSingleBotIds.size;
    document.querySelectorAll('[data-single-bot-count]').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.singleBotCount) === activeBotCount);
    });
    const summaryEl = document.getElementById('single-advanced-summary');
    if (summaryEl) {
      summaryEl.textContent = `(${activeBotCount} Bot${activeBotCount === 1 ? '' : 's'} • Right/Left & Even/Odd)`;
    }

    container.innerHTML = availableConfigs
      .map((cfg) => {
        const isActiveBot = this.selectedSingleBotIds.has(cfg.id);
        const traits = this.botTraits[cfg.id] || { rightHanded: true, ageEven: true };
        const botAdvName = this.botAdventurerNames?.[cfg.id] || cfg.name;
        return `
          <div class="single-bot-card ${isActiveBot ? 'bot-active' : 'bot-off'}" style="--bot-color: ${cfg.colorHex}">
            <button type="button" class="single-bot-toggle-head" data-toggle-single-bot="${cfg.id}" title="Tap to turn ${botAdvName} (${cfg.name}) Bot On or Off">
              <div class="single-bot-visuals">
                <img src="${cfg.portraitImg}" alt="${cfg.name}" class="single-bot-fig" />
                <img src="${cfg.templeImg}" alt="${cfg.deity}" class="single-bot-temple" />
              </div>
              <div class="single-bot-title-wrap">
                <div class="single-bot-name">🤖 ${botAdvName}</div>
                <div class="single-bot-deity">${cfg.name} • ${cfg.deityTitle}</div>
              </div>
              <div class="single-bot-status-pill" style="${isActiveBot ? `background: ${cfg.colorHex}; color: #fff;` : ''}">
                ${isActiveBot ? '✓ 🤖 AI BOT PLAYING' : '🚫 NOT PLAYING (TAP TO ADD)'}
              </div>
            </button>

            <div class="single-bot-traits-box ${isActiveBot ? '' : 'traits-disabled'}">
              <div class="bot-trait-group">
                <span class="bot-trait-label">Handedness (Side B Spell):</span>
                <div class="bot-trait-Switch">
                  <button type="button" class="btn-bot-trait ${traits.rightHanded ? 'active' : ''}" data-bot-hand="${cfg.id}" data-hand-val="right" ${isActiveBot ? '' : 'disabled'}>
                    ✋ Right-Handed
                  </button>
                  <button type="button" class="btn-bot-trait ${!traits.rightHanded ? 'active' : ''}" data-bot-hand="${cfg.id}" data-hand-val="left" ${isActiveBot ? '' : 'disabled'}>
                    🤚 Left-Handed
                  </button>
                </div>
              </div>

              <div class="bot-trait-group">
                <span class="bot-trait-label">Birthday / Age Number (3 Gems):</span>
                <div class="bot-trait-Switch">
                  <button type="button" class="btn-bot-trait ${traits.ageEven ? 'active' : ''}" data-bot-age="${cfg.id}" data-age-val="even" ${isActiveBot ? '' : 'disabled'}>
                    🎂 Even Number
                  </button>
                  <button type="button" class="btn-bot-trait ${!traits.ageEven ? 'active' : ''}" data-bot-age="${cfg.id}" data-age-val="odd" ${isActiveBot ? '' : 'disabled'}>
                    🎂 Odd Number
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    container.querySelectorAll('[data-toggle-single-bot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const botId = btn.dataset.toggleSingleBot;
        if (this.selectedSingleBotIds.has(botId)) {
          if (this.selectedSingleBotIds.size > 1) {
            this.selectedSingleBotIds.delete(botId);
          } else {
            // Always keep at least 1 bot active so there is an opponent
            const other = availableConfigs.find((c) => c.id !== botId);
            if (other) {
              this.selectedSingleBotIds.delete(botId);
              this.selectedSingleBotIds.add(other.id);
            }
          }
        } else {
          this.selectedSingleBotIds.add(botId);
        }
        this._renderSingleBotPicker();
      });
    });

    container.querySelectorAll('[data-bot-hand]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const botId = btn.dataset.botHand;
        const isRight = btn.dataset.handVal === 'right';
        if (!this.botTraits[botId]) {
          this.botTraits[botId] = { rightHanded: true, ageEven: true };
        }
        this.botTraits[botId].rightHanded = isRight;
        this._renderSingleBotPicker();
      });
    });

    container.querySelectorAll('[data-bot-age]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const botId = btn.dataset.botAge;
        const isEven = btn.dataset.ageVal === 'even';
        if (!this.botTraits[botId]) {
          this.botTraits[botId] = { rightHanded: true, ageEven: true };
        }
        this.botTraits[botId].ageEven = isEven;
        this._renderSingleBotPicker();
      });
    });
  }

  _startSinglePlayerGame() {
    const rawName = document.getElementById('input-single-name')?.value?.trim() || '';
    this.mpGameStarted = false;
    this.pendingInviteRoomCode = null;
    this.mp.disconnect(true);
    document.getElementById('top-room-badge')?.classList.add('hidden');
    document.getElementById('btn-top-copy-invite')?.classList.add('hidden');
    document.getElementById('btn-top-sms-invite')?.classList.add('hidden');
    document.getElementById('mp-main-waiting-banner')?.classList.add('hidden');
    document.getElementById('modal-gameover')?.classList.add('hidden');
    document.getElementById('modal-lobby')?.classList.add('hidden');
    document.getElementById('modal-guest-invite')?.classList.add('hidden');

    const activeBotNames = Array.from(this.selectedSingleBotIds).map(
      (id) => this.botAdventurerNames?.[id]
    ).filter(Boolean);

    const humanName = rawName || pickAdventurerNames(1, activeBotNames)[0];
    const usedNames = [humanName];

    for (const s of this.mp.lobbyState.seats) {
      const cfg = PLAYERS_CONFIG.find((c) => c.id === s.id);
      const traits = this.botTraits[s.id] || { rightHanded: true, ageEven: true };
      if (s.id === this.selectedSingleSeatId) {
        s.control = 'human';
        s.peerId = 'local';
        s.name = humanName;
      } else if (this.selectedSingleBotIds.has(s.id)) {
        let botName = this.botAdventurerNames?.[s.id];
        if (!botName || usedNames.some((n) => n.toLowerCase() === botName.toLowerCase())) {
          botName = pickAdventurerNames(1, usedNames)[0];
        }
        usedNames.push(botName);
        s.control = 'ai';
        s.peerId = null;
        s.name = botName;
        s.rightHanded = Boolean(traits.rightHanded);
        s.ageEven = Boolean(traits.ageEven);
      } else {
        s.control = 'none';
        s.peerId = null;
        s.name = cfg.name;
      }
    }

    document.getElementById('modal-single-setup')?.classList.add('hidden');
    document.getElementById('modal-intro-landing')?.classList.add('hidden');
    this._resetViewForNewGame();
    this.engine.initGame(this.mp.lobbyState.seats);
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
   * with ONLY the Invite URL in the message body so Apple iMessage automatically displays the
   * Rich Link Preview Card with the Tomb Hero Picture (Apple suppresses link preview images if extra text precedes the URL).
   */
  _sendInviteViaMessagesApp() {
    const url = this.mp.getShareableInviteUrl();
    const smsHref = `sms:?&body=${encodeURIComponent(url)}`;
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
    const isHostParam = params.get('host') === '1';

    if (roomParam) {
      const cleanCode = roomParam.trim().toUpperCase().startsWith('TOMB-')
        ? roomParam.trim().toUpperCase()
        : `TOMB-${roomParam.trim().toUpperCase()}`;

      // 1. Check if this user is the HOST of this room (e.g. Host clicked Browser Refresh!)
      const savedHost = this.mp.getSavedHostSession(cleanCode);
      if (savedHost && (isHostParam || savedHost.hostPeerId === this.mp.myPeerId)) {
        document.getElementById('modal-intro-landing')?.classList.add('hidden');
        document.getElementById('modal-guest-invite')?.classList.add('hidden');
        this.mpGameStarted = Boolean(savedHost.mpGameStarted);
        this.mp.resumeHostRoom(savedHost);
        this._showRoomShareBox(cleanCode);
        if (this.mpGameStarted && savedHost.gameState) {
          document.getElementById('modal-lobby')?.classList.add('hidden');
          this.engine.state = savedHost.gameState;
          this._applyStateToUI(savedHost.gameState);
          this._scheduleBotTurnIfNeeded(savedHost.gameState);
        } else {
          this.engine.initGame(this.mp.lobbyState.seats);
          clearTimeout(this.botTimer);
          document.getElementById('modal-lobby')?.classList.remove('hidden');
          this._setMultiplayerWizardStep(2);
          this._renderLobbySeats(this.mp.lobbyState);
          this._updateWaitingStatusUI();
        }
        return;
      }

      // 2. Otherwise, this user is a GUEST opening or refreshing the Invite Link
      this.pendingInviteRoomCode = cleanCode;
      this.mpGameStarted = false;
      document.getElementById('modal-intro-landing')?.classList.add('hidden');
      const codeEl = document.getElementById('invite-prompt-room-code');
      if (codeEl) codeEl.textContent = cleanCode;
      const pillEl = document.getElementById('guest-waiting-room-pill');
      if (pillEl) pillEl.textContent = `🏺 PYRAMID TOMB EXPEDITION • ROOM ${cleanCode}`;

      // Seed Host's chosen color & name at 0ms from URL query parameters (?hs=red&hn=Daryl&hc=2&ai=1)
      // so the Host's piece is immediately locked (🔒 Taken) before the network packet even arrives!
      const hsParam = params.get('hs');
      const hnParam = params.get('hn');
      const hcParam = params.get('hc');
      const aiParam = params.get('ai');
      if (hsParam) {
        this.mp.seedLobbyFromUrlParams({
          roomCode: cleanCode,
          hostSeatId: hsParam,
          hostName: hnParam,
          humanCount: hcParam,
          fillWithAi: aiParam !== '0',
        });
      }

      // Check if Guest already picked their piece & name before refreshing the tab
      const savedGuest = this.mp.getSavedGuestSession(cleanCode);
      this.engine.initGame(this.mp.lobbyState.seats);
      clearTimeout(this.botTimer);

      if (savedGuest && savedGuest.hasJoined) {
        this.selectedGuestSeatId = savedGuest.preferredSeatId || 'red';
        const nameInput = document.getElementById('input-invite-guest-name');
        if (nameInput && savedGuest.playerName) nameInput.value = savedGuest.playerName;
        const guestInput = document.getElementById('input-guest-name');
        if (guestInput && savedGuest.playerName) guestInput.value = savedGuest.playerName;
        document.getElementById('guest-invite-step-setup')?.classList.add('hidden');
        document.getElementById('guest-invite-step-waiting')?.classList.remove('hidden');
        document.getElementById('modal-guest-invite')?.classList.remove('hidden');
        this.mp.joinRoom(cleanCode, savedGuest.playerName, this.selectedGuestSeatId);
        this._renderGuestWaitingCaveUI(savedGuest.playerName);
        this._showRoomShareBox(cleanCode);
        this._updateWaitingStatusUI();
      } else {
        document.getElementById('guest-invite-step-setup')?.classList.remove('hidden');
        document.getElementById('guest-invite-step-waiting')?.classList.add('hidden');
        document.getElementById('modal-guest-invite')?.classList.remove('hidden');
        // Immediately connect to the Host room in preview mode so we receive live LOBBY_STATE (which colors are taken vs open)
        this.mp.connectRoomPreview(cleanCode);
        this._renderGuestInviteCharPicker();
        // After 550ms (once retained MQTT/PeerJS claims have arrived), reserve our selected open color in real time
        // so subsequent Guests opening the link immediately see our color as Taken even while we are typing our name!
        setTimeout(() => {
          const setupStep = document.getElementById('guest-invite-step-setup');
          if (setupStep && !setupStep.classList.contains('hidden') && this.mp.mode === 'guest') {
            this._renderGuestInviteCharPicker();
            const curName = document.getElementById('input-invite-guest-name')?.value?.trim() || '';
            this.mp.reservePreviewSeat(this.selectedGuestSeatId, curName);
          }
        }, 550);
        setTimeout(() => {
          document.getElementById('input-invite-guest-name')?.focus();
        }, 80);
      }
    } else {
      // Start a default 4-explorer showcase game right away in the background so the 3D & 2D boards are immediately alive,
      // while the Intro Landing Card welcomes the player!
      this.engine.initGame(this.mp.lobbyState.seats);
    }
  }

  _renderGuestInviteCharPicker() {
    const container = document.getElementById('guest-invite-char-picker');
    if (!container) return;

    const seats = this.mp.lobbyState?.seats || [];
    const isSeatTakenByOther = (seatId) => {
      const s = seats.find((x) => x.id === seatId);
      return Boolean(s && s.control === 'human' && s.peerId && s.peerId !== 'local' && s.peerId !== this.mp.myPeerId);
    };

    // If current selectedGuestSeatId is taken by the Host or another friend, auto-select the first open seat
    if (!this.selectedGuestSeatId || isSeatTakenByOther(this.selectedGuestSeatId)) {
      const openSeat =
        seats.find((s) => s.control === 'human' && !s.peerId) ||
        seats.find((s) => !isSeatTakenByOther(s.id));
      if (openSeat) {
        this.selectedGuestSeatId = openSeat.id;
      }
    }

    container.innerHTML = PLAYERS_CONFIG.map((cfg) => {
      const seat = seats.find((s) => s.id === cfg.id);
      const takenByOther = isSeatTakenByOther(cfg.id);
      const isSelected = !takenByOther && cfg.id === this.selectedGuestSeatId;
      const badgeLabel = takenByOther
        ? `🔒 Taken (${seat?.name || 'Host'})`
        : isSelected
        ? '✓ YOUR PIECE'
        : 'Tap to Pick';

      return `
        <button type="button" class="mp-char-pick-card ${isSelected ? 'selected' : ''} ${takenByOther ? 'taken-disabled' : ''}" data-pick-guest-seat="${cfg.id}" style="--char-color: ${cfg.colorHex}" ${takenByOther ? 'disabled' : ''}>
          <div class="mp-char-visuals">
            <img src="${cfg.portraitImg}" alt="${cfg.name}" class="mp-char-fig" />
            <img src="${cfg.templeImg}" alt="${cfg.deity}" class="mp-char-temple" />
          </div>
          <div class="mp-char-name">${cfg.name}</div>
          <div class="mp-char-deity">${cfg.deityTitle}</div>
          <div class="mp-char-badge" style="background: ${takenByOther ? '#5a3e28' : cfg.colorHex}">
            ${badgeLabel}
          </div>
        </button>
      `;
    }).join('');

    container.querySelectorAll('[data-pick-guest-seat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        this.selectedGuestSeatId = btn.dataset.pickGuestSeat;
        const curName = document.getElementById('input-invite-guest-name')?.value?.trim() || '';
        this.mp.reservePreviewSeat(this.selectedGuestSeatId, curName);
        this._renderGuestInviteCharPicker();
      });
    });
  }

  _acceptInviteAndJoinRoom() {
    const cleanCode = this.pendingInviteRoomCode;
    if (!cleanCode) return;

    // Verify our selected seat wasn't just claimed by another player a split-second before we tapped Join
    const seats = this.mp.lobbyState?.seats || [];
    const isSeatTakenByOther = (seatId) => {
      const s = seats.find((x) => x.id === seatId);
      return Boolean(s && s.control === 'human' && s.peerId && s.peerId !== 'local' && s.peerId !== this.mp.myPeerId);
    };
    if (!this.selectedGuestSeatId || isSeatTakenByOther(this.selectedGuestSeatId)) {
      const openSeat =
        seats.find((s) => s.control === 'human' && !s.peerId) ||
        seats.find((s) => !isSeatTakenByOther(s.id));
      if (openSeat) {
        this.selectedGuestSeatId = openSeat.id;
      }
    }

    const rawName = document.getElementById('input-invite-guest-name')?.value?.trim() || '';
    const takenNames = (this.mp.lobbyState?.seats || [])
      .filter((s) => s.peerId !== this.mp.myPeerId)
      .map((s) => s.name);
    const guestName = rawName || pickAdventurerNames(1, takenNames)[0];

    const nameInput = document.getElementById('input-invite-guest-name');
    if (nameInput) nameInput.value = guestName;
    const guestInput = document.getElementById('input-guest-name');
    if (guestInput) guestInput.value = guestName;

    // Transition inside #modal-guest-invite from Step A (Pick Piece & Name) to Step B (Explorer Entering Pyramid Cave Waiting Screen)
    document.getElementById('guest-invite-step-setup')?.classList.add('hidden');
    document.getElementById('guest-invite-step-waiting')?.classList.remove('hidden');

    this.mp.joinRoom(cleanCode, guestName, this.selectedGuestSeatId);
    this._renderGuestWaitingCaveUI(guestName);
    this._showRoomShareBox(cleanCode);
    this._updateWaitingStatusUI();
  }

  _renderGuestWaitingCaveUI(fallbackMyName = '') {
    const seats = this.mp.lobbyState?.seats || [];
    const { totalHumanSeats, connectedHumans, waitingCount } = this.mp.getWaitingStats();
    const mySeat =
      seats.find((s) => s.peerId === this.mp.myPeerId) ||
      seats.find((s) => s.id === this.selectedGuestSeatId);
    const myCfg = PLAYERS_CONFIG.find((c) => c.id === (mySeat?.id || this.selectedGuestSeatId));
    const myName =
      mySeat?.peerId === this.mp.myPeerId
        ? mySeat.name
        : fallbackMyName || document.getElementById('input-invite-guest-name')?.value?.trim() || 'Explorer';

    const countBadge = document.getElementById('guest-waiting-count-badge');
    const statusLine = document.getElementById('guest-waiting-status-line');
    const counterBox = document.getElementById('guest-waiting-counter-box');
    const caveTitle = document.getElementById('guest-waiting-cave-title');
    const rosterGrid = document.getElementById('guest-waiting-roster-grid');

    const shownConnected = Math.max(1, connectedHumans);
    const shownTotal = Math.max(shownConnected, totalHumanSeats || 2);

    if (countBadge) {
      countBadge.textContent = `👥 ${shownConnected} of ${shownTotal} Explorers Joined`;
    }

    if (waitingCount > 0) {
      counterBox?.classList.add('waiting');
      counterBox?.classList.remove('ready');
      if (caveTitle) {
        caveTitle.textContent = `⏳ Waiting on ${waitingCount} More Explorer${waitingCount === 1 ? '' : 's'} to Join...`;
      }
      if (statusLine) {
        statusLine.textContent = `✅ You are ready as ${myName} (${myCfg ? myCfg.name : 'Explorer'}) — Waiting for ${waitingCount} more friend${waitingCount === 1 ? '' : 's'} & Host to start!`;
      }
    } else {
      counterBox?.classList.remove('waiting');
      counterBox?.classList.add('ready');
      if (caveTitle) {
        caveTitle.textContent = `✅ All ${shownTotal} Explorers Have Joined!`;
      }
      if (statusLine) {
        statusLine.textContent = `🏺 You are ${myName} (${myCfg ? myCfg.name : 'Explorer'}) — Waiting for the Host to click "Start Tomb Expedition"!`;
      }
    }

    if (rosterGrid) {
      rosterGrid.innerHTML = seats
        .filter((s) => s.control !== 'none')
        .map((seat) => {
          const cfg = PLAYERS_CONFIG.find((c) => c.id === seat.id);
          const isMe =
            seat.peerId === this.mp.myPeerId ||
            (!seats.some((x) => x.peerId === this.mp.myPeerId) && seat.id === this.selectedGuestSeatId);
          const isConnectedHuman = Boolean(seat.control === 'human' && (seat.peerId || isMe));
          const isWaitingHuman = seat.control === 'human' && !seat.peerId && !isMe;
          const displayName = isMe ? myName : seat.name;

          let statusPill = '';
          if (isMe) {
            statusPill = `<span class="guest-roster-pill pill-me">🟢 YOU • Joined</span>`;
          } else if (isConnectedHuman) {
            statusPill = `<span class="guest-roster-pill pill-joined">🟢 Joined</span>`;
          } else if (isWaitingHuman) {
            statusPill = `<span class="guest-roster-pill pill-waiting">⏳ Waiting to Join...</span>`;
          } else if (seat.control === 'ai') {
            statusPill = `<span class="guest-roster-pill pill-bot">🤖 AI Tomb Bot</span>`;
          }

          return `
            <div class="guest-roster-card ${isMe ? 'roster-is-me' : ''} ${isWaitingHuman ? 'roster-is-waiting' : ''}" style="--roster-color: ${cfg.colorHex}">
              <img src="${cfg.portraitImg}" alt="${cfg.name}" class="guest-roster-fig" />
              <div class="guest-roster-info">
                <div class="guest-roster-name">${isWaitingHuman ? 'Open Friend Slot' : displayName}</div>
                <div class="guest-roster-sub" style="color: ${cfg.accentHex}">${cfg.name} • ${cfg.deity}</div>
              </div>
              ${statusPill}
            </div>
          `;
        })
        .join('');
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
    const advPool = pickAdventurerNames(4);
    if (preset === 'solo_3ai') {
      seats[0].control = 'human';
      seats[0].peerId = 'local';
      seats[0].name = advPool[0];
      seats[1].control = 'ai';
      seats[1].peerId = null;
      seats[1].name = advPool[1];
      seats[2].control = 'ai';
      seats[2].peerId = null;
      seats[2].name = advPool[2];
      seats[3].control = 'ai';
      seats[3].peerId = null;
      seats[3].name = advPool[3];
    } else if (preset === 'pass_2p') {
      seats[0].control = 'human';
      seats[0].name = advPool[0];
      seats[1].control = 'human';
      seats[1].name = advPool[1];
      seats[2].control = 'none';
      seats[3].control = 'none';
    } else if (preset === 'pass_4p') {
      seats[0].control = 'human';
      seats[0].name = advPool[0];
      seats[1].control = 'human';
      seats[1].name = advPool[1];
      seats[2].control = 'human';
      seats[2].name = advPool[2];
      seats[3].control = 'human';
      seats[3].name = advPool[3];
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

            ${
              seat.control === 'ai' && this.mp.mode !== 'guest'
                ? `<div class="lobby-bot-traits-row">
                    <button type="button" class="btn-lobby-trait" data-lobby-bot-hand="${seat.id}" title="Click to toggle Right-Handed vs Left-Handed for this AI Bot">
                      ${seat.rightHanded !== false ? '✋ Right-Handed' : '🤚 Left-Handed'}
                    </button>
                    <button type="button" class="btn-lobby-trait" data-lobby-bot-age="${seat.id}" title="Click to toggle Even vs Odd Birthday/Age for this AI Bot">
                      ${seat.ageEven !== false ? '🎂 Even B-Day/Age' : '🎂 Odd B-Day/Age'}
                    </button>
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
        const otherNames = lobbyState.seats
          .filter((s) => s.id !== inp.dataset.seatId)
          .map((s) => s.name);
        this.mp.updateSeat(inp.dataset.seatId, {
          name: inp.value.trim() || pickAdventurerNames(1, otherNames)[0],
        });
      });
    });

    container.querySelectorAll('.seat-control-select').forEach((sel) => {
      sel.addEventListener('change', () => {
        const seatId = sel.dataset.seatId;
        const cfg = PLAYERS_CONFIG.find((c) => c.id === seatId);
        const newControl = sel.value;
        const traits = this.botTraits[seatId] || { rightHanded: true, ageEven: true };
        const otherNames = lobbyState.seats
          .filter((s) => s.id !== seatId)
          .map((s) => s.name);
        const nextAdvName = pickAdventurerNames(1, otherNames)[0];
        this.mp.updateSeat(seatId, {
          control: newControl,
          peerId: null,
          rightHanded: traits.rightHanded,
          ageEven: traits.ageEven,
          name:
            newControl === 'human'
              ? 'Waiting for Friend...'
              : newControl === 'ai'
              ? nextAdvName
              : cfg?.name || 'Explorer',
        });
      });
    });

    container.querySelectorAll('[data-lobby-bot-hand]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const seatId = btn.dataset.lobbyBotHand;
        const seat = lobbyState.seats.find((s) => s.id === seatId);
        if (!seat) return;
        const nextVal = !(seat.rightHanded !== false);
        if (this.botTraits[seatId]) this.botTraits[seatId].rightHanded = nextVal;
        this.mp.updateSeat(seatId, { rightHanded: nextVal });
      });
    });

    container.querySelectorAll('[data-lobby-bot-age]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const seatId = btn.dataset.lobbyBotAge;
        const seat = lobbyState.seats.find((s) => s.id === seatId);
        if (!seat) return;
        const nextVal = !(seat.ageEven !== false);
        if (this.botTraits[seatId]) this.botTraits[seatId].ageEven = nextVal;
        this.mp.updateSeat(seatId, { ageEven: nextVal });
      });
    });

    container.querySelectorAll('[data-claim-seat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nameInputId = this.mp.mode === 'guest' ? 'input-guest-name' : 'input-player-name';
        const rawInput = document.getElementById(nameInputId)?.value?.trim() || '';
        const otherNames = lobbyState.seats
          .filter((s) => s.id !== btn.dataset.claimSeat)
          .map((s) => s.name);
        const myName = rawInput || pickAdventurerNames(1, otherNames)[0];
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
    const usedNames = seats
      .filter((s) => !(s.control === 'human' && !s.peerId))
      .map((s) => s.name);

    for (const s of seats) {
      if (s.control === 'human' && !s.peerId) {
        const cfg = PLAYERS_CONFIG.find((c) => c.id === s.id);
        if (emptySlotMode === 'ai') {
          const botAdv = pickAdventurerNames(1, usedNames)[0];
          usedNames.push(botAdv);
          s.control = 'ai';
          s.name = botAdv;
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
        const botAdv = pickAdventurerNames(1, usedNames)[0];
        usedNames.push(botAdv);
        fallbackSeat.control = 'ai';
        fallbackSeat.name = botAdv;
      }
    }

    // If any connected Guest was still on Step A ("Explorer Joining...") when the Host clicked Start, give them a famous Adventurer name!
    for (const s of seats) {
      if (s.control === 'human' && s.peerId && (!s.name || s.name === 'Explorer Joining...')) {
        const guestAdv = pickAdventurerNames(1, usedNames)[0];
        usedNames.push(guestAdv);
        s.name = guestAdv;
      }
    }

    this.mp._broadcastLobby();
    this._updateWaitingStatusUI();
    document.getElementById('modal-guest-invite')?.classList.add('hidden');
    document.getElementById('modal-lobby')?.classList.add('hidden');
    document.getElementById('modal-gameover')?.classList.add('hidden');
    this.mpGameStarted = true;
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
    const takenNames = this.mp.lobbyState.seats.map((s) => s.name);
    for (const s of this.mp.lobbyState.seats) {
      if (s.control === 'human' && s.peerId && (!s.name || s.name === 'Explorer Joining...')) {
        const guestAdv = pickAdventurerNames(1, takenNames)[0];
        takenNames.push(guestAdv);
        s.name = guestAdv;
      }
    }
    document.getElementById('modal-guest-invite')?.classList.add('hidden');
    document.getElementById('modal-lobby')?.classList.add('hidden');
    document.getElementById('modal-gameover')?.classList.add('hidden');
    this.mpGameStarted = true;
    this._resetViewForNewGame();
    this.engine.initGame(this.mp.lobbyState.seats);
    this.mp._broadcastLobby();
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
    if (this.mp.mode !== 'host' || this.mpGameStarted) {
      this.mp.broadcastGameState(state);
    }
    this._applyStateToUI(state);
    if (this.mp.mode === 'local' || this.mpGameStarted) {
      this._scheduleBotTurnIfNeeded(state);
    }
  }

  _onAuthoritativeEvent(event) {
    if (this.mp.mode !== 'host' || this.mpGameStarted) {
      this.mp.broadcastGameEvent(event);
    }
    this._playVisualAndAudioEvent(event);
  }

  _onClientReceiveState(state) {
    const isEnteringOrRestartingGame =
      !this.mpGameStarted ||
      !this.activeState ||
      (state.turnNumber === 1 &&
        state.turnIndex === 0 &&
        state.phase === 'ROLL_DIE' &&
        (this.activeState.turnNumber > 1 ||
          this.activeState.turnIndex > 0 ||
          this.activeState.phase !== 'ROLL_DIE'));

    // If this Guest was still on Step A of the Invite screen when the Host clicked Start Game,
    // automatically lock in their chosen piece & typed name as they enter the Tomb!
    if (!this.mpGameStarted && this.mp.mode === 'guest') {
      const stepSetup = document.getElementById('guest-invite-step-setup');
      const typedName = document.getElementById('input-invite-guest-name')?.value?.trim() || '';
      if (stepSetup && !stepSetup.classList.contains('hidden') && typedName) {
        const mySeat =
          (state.players || []).find((p) => p.peerId === this.mp.myPeerId) ||
          { id: this.selectedGuestSeatId || 'red' };
        this.mp.claimExplorerSeat(mySeat.id, typedName);
      }
    }

    this.mpGameStarted = true;
    document.getElementById('modal-intro-landing')?.classList.add('hidden');
    document.getElementById('modal-guest-invite')?.classList.add('hidden');
    document.getElementById('modal-lobby')?.classList.add('hidden');
    if (isEnteringOrRestartingGame) {
      this._resetViewForNewGame();
    }
    this._applyStateToUI(state);
  }

  _onClientReceiveEvent(event) {
    if (event.type === 'player_moved' && this.activeState?.players) {
      const movedPlayer = this.activeState.players.find((pl) => pl.id === event.playerId);
      const targetSp = event.toSpaceId ? SPACES_BY_ID[event.toSpaceId] : null;
      if (movedPlayer && targetSp) {
        movedPlayer.spaceId = targetSp.id;
        movedPlayer.level = targetSp.level;
        this.activeState.moveOptions = null;
        this.view2D.syncWithState(this.activeState);
      }
    }
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
    if (!this.recentBigPopupMap) {
      this.recentBigPopupMap = new Map();
    }

    // Deduplicate: never show or stack the exact same popup title multiple times if received across multiple network transports
    const prevShownAt = this.recentBigPopupMap.get(title) || -99999;
    if (now - prevShownAt < 2500) {
      return;
    }
    if (!popupEl.classList.contains('hidden')) {
      const existingTitles = Array.from(popupEl.querySelectorAll('.big-event-title')).map((el) => el.textContent);
      if (existingTitles.includes(title)) {
        return;
      }
    }
    this.recentBigPopupMap.set(title, now);
    if (this.recentBigPopupMap.size > 60) {
      const oldestKey = this.recentBigPopupMap.keys().next().value;
      this.recentBigPopupMap.delete(oldestKey);
    }

    const itemHtml = `
      <div class="big-event-card theme-${theme}">
        <div class="big-event-icon">${icon}</div>
        <div class="big-event-texts">
          <div class="big-event-title">${title}</div>
          ${subtitle ? `<div class="big-event-sub">${subtitle}</div>` : ''}
        </div>
      </div>
    `;

    // If two distinct major events happen simultaneously on the same landing (e.g. stealing a gem AND passing the Cobra curse), stack them!
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
        this.view3D.animateExplorerPath(event.playerId, event.path, event.fromSpaceId);
        break;

      case 'jewel_collected':
        this._playSfx('jewel');
        if (event.jewelMesh) {
          this.view3D.animateJewelCollection(event.jewelMesh, event.playerId, event.slotIndex);
        }
        break;

      case 'jewel_transferred': {
        this._playSfx('jewel');
        if (event.jewelMesh) {
          this.view3D.animateJewelCollection(event.jewelMesh, event.toPlayerId, event.slotIndex);
        }
        const fromName = this._getPlayerDisplayName(event.fromPlayerId);
        const toName = this._getPlayerDisplayName(event.toPlayerId);
        if (event.reason === 'robot_no_blood') {
          this._showBigEventPopup({
            theme: 'emerald',
            icon: '🤖💎',
            title: `ROBOT NEVER TASTED BLOOD — GAVE 1 GEM!`,
            subtitle: `${fromName} gave 1 Precious Scarab Gem to ${toName}!`,
          });
        } else if (event.reason === 'gave') {
          this._showBigEventPopup({
            theme: 'emerald',
            icon: '💎',
            title: `${fromName.toUpperCase()} GAVE 1 GEM TO ${toName.toUpperCase()}!`,
            subtitle: `Obeyed the Voice of the Mummy (1 Precious Scarab Gem)`,
          });
        } else {
          this._showBigEventPopup({
            theme: 'emerald',
            icon: '💎',
            title: `${toName.toUpperCase()} STOLE A GEM!`,
            subtitle: `Took 1 Precious Scarab Gem from ${fromName}`,
          });
        }
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
    // Prevent duplicate restart if the exact same track was triggered via both GAME_EVENT and GAME_STATE within 1.5s
    const nowMs = performance.now();
    if (
      this.lastPlayedTrackId === track.id &&
      nowMs - (this.lastPlayedTrackTime || 0) < 1500 &&
      (this.currentBufferSource || this.currentAudio)
    ) {
      return;
    }
    this.lastPlayedTrackId = track.id;
    this.lastPlayedTrackTime = nowMs;

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
      this.pendingBlockedTrack = null;
      if (this.mummyFallbackTimer) {
        clearTimeout(this.mummyFallbackTimer);
        this.mummyFallbackTimer = null;
      }
      this.currentBufferSource = null;
      this.currentAudio = null;
      if (this.mp.mode !== 'guest' && this.engine.state?.phase === 'MUMMY_SPEAKING') {
        this.engine.finishMummyAudio();
      }
    };

    // 1. Primary path: Play via unlocked WebAudio AudioContext
    const ctx = this._ensureAudioContext(false);
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
        if (ctx.state !== 'running') {
          await ctx.resume().catch(() => {});
        }
        // IMPORTANT: Only start WebAudio source if ctx.state is actually 'running'!
        // If iOS Safari left ctx.state in 'interrupted' or 'suspended' after app-switching,
        // fall through to HTMLAudioElement below instead of playing into a silent suspended context!
        if (ctx.state === 'running') {
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(this.mummyGainNode || ctx.destination);
          this.currentBufferSource = source;
          source.onended = () => {
            onEndedOrSkipped();
          };
          source.start(0);
          // Safety watchdog in case iOS interrupts AudioContext mid-playback when switching apps
          const maxDurationMs = Math.ceil((audioBuffer.duration || 8) * 1000) + 1200;
          this.mummyFallbackTimer = setTimeout(onEndedOrSkipped, maxDurationMs);
          return;
        }
      } catch (err) {
        // Fall through to persistent HTMLAudioElement fallback below
      }
    }

    // 2. Fallback path: Reuse persistent HTMLAudioElement
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
        // Browser blocked playback because user just returned from another app without tapping the screen yet:
        // Queue track so the very next tap anywhere on screen immediately plays the Mummy's voice!
        this.pendingBlockedTrack = { track, playbackId: myPlaybackId };
        if (voiceTitle) {
          voiceTitle.textContent = `🔊 Tap Anywhere to Hear the Mummy — "${track.title}"`;
        }
        this.mummyFallbackTimer = setTimeout(onEndedOrSkipped, 4200);
      });
    }
  }

  _applyStateToUI(state) {
    this.activeState = state;
    this.view3D.syncWithState(state);
    this.view2D.syncWithState(state);

    // Ensure Guest devices ALWAYS play the Mummy's voice track when entering MUMMY_SPEAKING phase,
    // even if a volatile GAME_EVENT packet was dropped or arrived while switching apps!
    if (state.phase === 'MUMMY_SPEAKING' && state.currentTrack) {
      const trackTurnKey = `${state.turnNumber}-${state.turnIndex}-${state.currentTrack.id}`;
      if (this.lastPlayedTrackTurnKey !== trackTurnKey) {
        this.lastPlayedTrackTurnKey = trackTurnKey;
        this.view3D.animateSarcophagusLeverPull();
        this._playMummyTrackAudio(state.currentTrack);
      }
    }

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

    container.style.setProperty('--player-count', String(Math.max(1, state.players.length)));

    const curPlayer = state.players[state.turnIndex];
    const humanPlayers = state.players.filter((pl) => pl.control === 'human');
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

        const isLocalYou =
          p.control === 'human' &&
          (humanPlayers.length === 1 ||
            (this.mp.mode !== 'local' && p.peerId === this.mp.myPeerId));

        const cleanName = (p.name || cfg.name || 'Explorer')
          .replace(/\s*\(Bot\)\s*$/i, '')
          .trim();
        const cardTitle = cleanName;
        const pawnRoleTag =
          p.control === 'ai'
            ? `${p.id.toUpperCase()} • BOT`
            : isLocalYou
            ? `${p.id.toUpperCase()} • YOU`
            : p.id.toUpperCase();

        const botTraitBadge =
          p.control === 'ai'
            ? `🤖 Bot • ${p.rightHanded !== false ? '✋Right' : '🤚Left'} • ${p.ageEven !== false ? '🎂Even' : '🎂Odd'}`
            : isLocalYou
            ? '🧑 You'
            : '🧑 Human';

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
                  <span class="explorer-pawn-tag" style="background: ${p.colorHex}">${pawnRoleTag}</span>
                </div>
                <img src="${cfg.templeImg}" alt="${p.deity} Temple" class="temple-deity-thumb" data-focus-gembox="${p.id}" style="cursor: pointer;" title="Tap to view ${p.name}'s 3D Gem Box" />
              </div>
              <div class="temple-player-info">
                <div class="temple-player-name-row">
                  <span class="pawn-color-pill" style="background: ${p.colorHex}">${pawnLabel}</span>
                  <span class="player-badge-role">${botTraitBadge}</span>
                </div>
                <div class="temple-player-title-strong">${cardTitle}</div>
                <div class="temple-deity-sub">${p.deityTitle} • Level ${p.level}</div>
                <div class="temple-space-sub">📍 ${sp ? sp.label : ''}</div>
              </div>
              <div class="temple-score-box" data-focus-gembox="${p.id}" style="cursor: pointer;" title="Tap to view ${p.name}'s 3D Gem Box (${p.jewels} Scarab Gems${hasGreatJewel ? ' + 5 Great Jewel' : ''}${hasCobra ? ' - 5 Cobra Curse' : ''})">
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

    container.querySelectorAll('[data-focus-gembox]').forEach((el) => {
      el.addEventListener('click', () => {
        const pid = el.dataset.focusGembox;
        if (pid) {
          this.view3D.focusPlayerGemBox(pid);
        }
      });
    });
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

    if (state.phase === 'GAME_OVER') {
      controlsHtml = `
        <div class="rolled-banner">🏆 Expedition Complete!</div>
        <div class="action-buttons-stack">
          <button class="btn-primary-action pulse-gold" id="btn-deck-home">
            🏠 Main Front Page
          </button>
          <button class="btn-secondary-action" id="btn-deck-single">
            🏺 New Single Player Game
          </button>
          <button class="btn-secondary-action" id="btn-deck-scores">
            🏆 View Final Gem Tally
          </button>
        </div>
      `;
    } else if (state.phase === 'MUMMY_SPEAKING') {
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

    deckEl.querySelector('#btn-deck-home')?.addEventListener('click', () => {
      this._returnToMainFrontPage();
    });
    deckEl.querySelector('#btn-deck-single')?.addEventListener('click', () => {
      this._leaveMultiplayerAndOpenSinglePlayer();
    });
    deckEl.querySelector('#btn-deck-scores')?.addEventListener('click', () => {
      document.getElementById('modal-gameover')?.classList.remove('hidden');
    });
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

    let delay = state.phase === 'ROLL_DIE' ? 950 : 1050;
    if (state.turnNumber === 1 && state.turnIndex === 0 && state.phase === 'ROLL_DIE' && this.gameStartedAt) {
      const elapsed = performance.now() - this.gameStartedAt;
      if (elapsed < 4050) {
        delay = Math.max(delay, 4050 - elapsed);
      }
    }
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
        ? ['💎', '👑', '✨', '🏺', '🏆', '💎']
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
