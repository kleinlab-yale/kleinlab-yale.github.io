/**
 * Main Application Controller for Arcane Chess
 * Coordinates:
 * - Super Wizard Chess 3D View (with 360° Great Hall & Zoom-In Animated Capture Duels) <-> Standard 2D View (with 6 Color Swatches)
 * - Character Creator (Gender, Age, Skin, Hair, Eyes, Beard) & Sign-In
 * - Duolingo-Style Daily Streak, Victory Treasure Chests, Coins & Seasonal Costume Shop (Halloween, Christmas, Royal Hall)
 * - 6 AI Bot Personalities with reactive dialogue & chat replies
 * - Zero-config Room-Name Multiplayer with Live Communication Window & Room Scoreboard
 */

import { ChessGame } from './chess-rules.js';
import { selectBotMove } from './ai-engine.js';
import {
  BOT_PERSONALITIES,
  getBotById,
  getRecommendedBotForElo,
  pickBotLine
} from './bots.js';
import { StorageManager, getRankTitleForElo } from './storage.js';
import { SoundEffects } from './sound.js';
import { Board2DRenderer, PIECE_SVGS } from './board2d.js';
import { MultiplayerRoomManager } from './multiplayer.js';
import {
  CHARACTER_OPTIONS,
  SHOP_CATALOG,
  SHOP_STAGES,
  getCurrentSeasonInfo,
  renderAvatarSvg,
  checkItemUnlockRequirements,
  getPlayerShopStageStatus
} from './avatar-shop.js';

class ArcaneChessApp {
  constructor() {
    this.storage = new StorageManager();
    this.prefs = this.storage.prefs;
    this.sound = new SoundEffects(this.prefs.soundEnabled);
    this.game = new ChessGame();

    this.viewMode = this.prefs.viewMode || '3d';
    this.gameMode = 'bot';
    this.selectedBot = getBotById(this.prefs.selectedBotId || 'pip');

    this.playerColor = 'w';
    this.boardOrientation = 'w';
    this.selectedSquare = null;
    this.legalMovesForSelected = [];
    this.pendingPromotionMove = null;
    this.botThinking = false;
    this.botTimerId = null;
    this.matchEndedRecorded = false;
    this.lastMatchOpponentElo = 600;
    this.multiplayerGameStarted = false;

    // Shop filter state
    this.shopSeasonFilter = 'all';
    this.shopSlotFilter = 'all';

    // Default to Unrestricted Time (0 seconds = ∞ untimed) unless user switches
    this.timeControlSeconds = (this.prefs.timeControlMinutes ?? 0) * 60;
    this.clocks = { w: this.timeControlSeconds, b: this.timeControlSeconds };
    this.clockInterval = null;

    // Renderers
    this.board2D = null;
    this.board3D = null;

    // Default mobile tab
    document.body.dataset.mobileTab = 'setup';

    // Multiplayer
    this.multiplayer = new MultiplayerRoomManager({
      onStatusChange: status => this._onMultiplayerStatus(status),
      onRoomReady: info => this._onMultiplayerRoomReady(info),
      onMatchStart: info => this._onMultiplayerMatchStart(info),
      onRemoteMove: (move, clocks) => this._onMultiplayerRemoteMove(move, clocks),
      onChatMessage: msg => this._appendChatMessage(msg.sender, msg.text),
      onRemoteResign: color => this._onMultiplayerRemoteResign(color),
      onRemoteDrawOffer: fromName => this._onMultiplayerDrawOffer(fromName),
      onRemoteDrawAccept: () => this._onMultiplayerDrawAccept(),
      onRemoteRematch: newHostColor => this._onMultiplayerRemoteRematch(newHostColor),
      onOpponentDisconnected: () => {
        this._showToast('Opponent disconnected from room.');
        this._updateRoomJoinUI();
      }
    });

    this._initRenderers();
    this._bindUIEvents();
    this._refreshProfileUI();
    this._renderBotList();
    this._applyViewMode(this.viewMode, false);
    this._checkUrlRoomParam();

    if (this.gameMode === 'bot') {
      this.startNewBotGame();
    }

    // First-Time Sign-In Flow: Prompt new players to pick their Name & Avatar first!
    const activeProfile = this.storage.getActiveProfile();
    if (!activeProfile.hasSignedIn) {
      setTimeout(() => {
        this._openProfileModal(true);
      }, 120);
    }
  }

  async _initRenderers() {
    const container2D = document.getElementById('board2DContainer');
    const container3D = document.getElementById('board3DContainer');

    this.board2D = new Board2DRenderer(container2D, (sq, action) =>
      this._handleSquareInteraction(sq, action)
    );
    const saved2DTheme = this.prefs.boardTheme2D || 'classic';
    this.board2D.setTheme(saved2DTheme);
    this._highlightActive2DSwatch(saved2DTheme);

    try {
      const { Board3DRenderer } = await import('./board3d.js');
      this.board3D = new Board3DRenderer(
        container3D,
        (sq, action) => this._handleSquareInteraction(sq, action),
        {
          onCombatBanner: (text, visible) => {
            const banner = document.getElementById('combatClashBanner');
            const txtEl = document.getElementById('combatClashText');
            if (visible && text) {
              txtEl.textContent = text;
              banner.classList.remove('hidden');
            } else {
              banner.classList.add('hidden');
            }
          },
          onClashSound: () => this.sound.playSwordClash(),
          onShatterSound: () => this.sound.playCapture(true)
        }
      );
      this.board3D.battleCam = this.prefs.battleCam !== false;
      this.board3D.setLightingTheme(this.prefs.lightingTheme3D || 'great-hall');
      this._updateBattleCamButton();
      this._renderBoard();
    } catch (err) {
      console.warn('3D WebGL Renderer fallback to 2D:', err);
      this._applyViewMode('2d', false);
    }
  }

  _bindUIEvents() {
    // View Switcher (Wizard 3D vs Standard 2D)
    document.getElementById('btnView3D').addEventListener('click', () => {
      this._applyViewMode('3d');
    });
    document.getElementById('btnView2D').addEventListener('click', () => {
      this._applyViewMode('2d');
    });

    // Mobile Navigation Tab Bar
    document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.mobtab || 'setup';
        document.body.dataset.mobileTab = tab;
        document.querySelectorAll('.mobile-tab-btn').forEach(b => {
          b.classList.toggle('active', b === btn);
        });
      });
    });

    // Keyboard shortcut 'V' to toggle 3D / 2D view
    window.addEventListener('keydown', e => {
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT'
      ) {
        return;
      }
      if (e.key.toLowerCase() === 'v') {
        this._applyViewMode(this.viewMode === '3d' ? '2d' : '3d');
      }
    });

    // Game Mode Switcher (Bots vs Multiplayer)
    document.getElementById('btnModeBot').addEventListener('click', () => {
      this._switchGameMode('bot');
    });
    document.getElementById('btnModeMulti').addEventListener('click', () => {
      this._switchGameMode('multiplayer');
    });

    // Quick "Match My Elo" button
    document.getElementById('btnQuickEloMatch').addEventListener('click', () => {
      const profile = this.storage.getActiveProfile();
      const recBot = getRecommendedBotForElo(profile.elo);
      this.selectedBot = recBot;
      this.storage.savePrefs({ selectedBotId: recBot.id });
      this._switchGameMode('bot');
      this._renderBotList();
      this.startNewBotGame();
      this._showToast(`Matched with ${recBot.name} (${recBot.elo} Elo)!`);
    });

    // Sound Toggle
    document.getElementById('btnSoundToggle').addEventListener('click', () => {
      const next = !this.sound.enabled;
      this.sound.setEnabled(next);
      this.storage.savePrefs({ soundEnabled: next });
      document.getElementById('soundIcon').textContent = next ? '🔊' : '🔇';
    });
    document.getElementById('soundIcon').textContent = this.sound.enabled ? '🔊' : '🔇';

    // Start Bot Match CTA
    document.getElementById('btnStartBotMatch').addEventListener('click', () => {
      this.startNewBotGame();
      this._showToast(`Started new game vs. ${this.selectedBot.name}!`);
    });

    // 3D HUD Camera, Fight Zoom & World Theme Controls
    document.getElementById('camWhite').addEventListener('click', () => {
      this.board3D?.setCameraPreset('white');
    });
    document.getElementById('camBlack').addEventListener('click', () => {
      this.board3D?.setCameraPreset('black');
    });
    document.getElementById('camCinematic').addEventListener('click', () => {
      this.board3D?.setCameraPreset('cinematic');
    });
    document.getElementById('camTop').addEventListener('click', () => {
      this.board3D?.setCameraPreset('top');
    });
    document.getElementById('camBattleToggle').addEventListener('click', () => {
      if (!this.board3D) return;
      this.board3D.battleCam = !this.board3D.battleCam;
      this.storage.savePrefs({ battleCam: this.board3D.battleCam });
      this._updateBattleCamButton();
    });
    document.getElementById('camAutoRotate').addEventListener('click', e => {
      if (!this.board3D) return;
      this.board3D.autoRotate = !this.board3D.autoRotate;
      e.currentTarget.classList.toggle('active', this.board3D.autoRotate);
    });

    const select3DTheme = document.getElementById('select3DTheme');
    select3DTheme.value = this.prefs.lightingTheme3D || 'great-hall';
    select3DTheme.addEventListener('change', e => {
      const theme = e.target.value;
      this.board3D?.setLightingTheme(theme);
      this.storage.savePrefs({ lightingTheme3D: theme });
    });

    // 2D Color Swatch Buttons & Flip
    document.getElementById('btnFlip2DBoard').addEventListener('click', () => {
      this._flipBoardPerspective();
    });
    document.querySelectorAll('.color-swatch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        this.board2D?.setTheme(theme);
        this.storage.savePrefs({ boardTheme2D: theme });
        this._highlightActive2DSwatch(theme);
      });
    });

    // Right Sidebar Game Controls
    document.getElementById('btnNewGame').addEventListener('click', () => {
      if (this.gameMode === 'multiplayer') {
        this._handleExplicitStartMultiplayerGame();
      } else {
        this.startNewBotGame();
      }
    });

    document.getElementById('btnUndoMove').addEventListener('click', () => {
      if (this.gameMode !== 'bot' || this.botThinking) return;
      if (this.game.history.length === 0) return;
      this.game.undoMove();
      if (this.game.turn !== this.playerColor && this.game.history.length > 0) {
        this.game.undoMove();
      }
      this.selectedSquare = null;
      this.legalMovesForSelected = [];
      this._renderAll();
    });

    document.getElementById('btnFlipBoard').addEventListener('click', () => {
      this._flipBoardPerspective();
    });

    document.getElementById('btnOfferDraw').addEventListener('click', () => {
      if (this.gameMode === 'multiplayer' && this.multiplayer.isConnected()) {
        const profile = this.storage.getActiveProfile();
        this.multiplayer.sendPacket({
          type: 'draw_offer',
          fromName: profile.username
        });
        this._showToast('Draw offer sent to opponent.');
      }
    });

    document.getElementById('btnResign').addEventListener('click', () => {
      const status = this.game.getGameStatus();
      if (status.over) return;
      const winner = this.playerColor === 'w' ? 'b' : 'w';
      this.game.setCustomResult(winner, 'resignation');
      if (this.gameMode === 'multiplayer' && this.multiplayer.isConnected()) {
        this.multiplayer.sendPacket({
          type: 'resign',
          color: this.playerColor
        });
      }
      this._handleGameOver();
    });

    // PGN / FEN Copy
    document.getElementById('btnCopyPgn').addEventListener('click', () => {
      const pgn = this.game.toPgn(this._getPgnHeaders());
      navigator.clipboard?.writeText(pgn);
      this._showToast('PGN copied to clipboard!');
    });

    document.getElementById('btnCopyFen').addEventListener('click', () => {
      navigator.clipboard?.writeText(this.game.toFen());
      this._showToast('FEN copied to clipboard!');
    });

    // Multiplayer Room Controls (RED when out, GREEN when in + Explicit START GAME)
    document.getElementById('btnJoinRoom').addEventListener('click', () => {
      this._joinMultiplayerRoomFromUI();
    });
    document.getElementById('roomNameInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this._joinMultiplayerRoomFromUI();
      }
    });
    document.getElementById('btnStartMultiplayerGame').addEventListener('click', () => {
      this._handleExplicitStartMultiplayerGame();
    });
    document.getElementById('btnBoardOverlayStart').addEventListener('click', () => {
      this._handleExplicitStartMultiplayerGame();
    });
    document.getElementById('btnEditMultiAvatar').addEventListener('click', () => {
      this._openProfileModal(false);
    });
    document.getElementById('btnLeaveRoom').addEventListener('click', () => {
      this.multiplayer.leaveRoom(true);
      this.multiplayerGameStarted = false;
      this._updateRoomJoinUI();
    });
    document.getElementById('btnCopyInviteLink').addEventListener('click', () => {
      const roomVal = document.getElementById('roomNameInput').value.trim() || 'hogwarts-room';
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomVal);
      navigator.clipboard?.writeText(url.toString());
      this._showToast(`Invite link for room "${roomVal}" copied!`);
    });

    // Communication Window (Chat + Quick Reactions)
    document.getElementById('chatForm').addEventListener('submit', e => {
      e.preventDefault();
      const input = document.getElementById('chatInput');
      const text = input.value.trim();
      if (!text) return;
      this._sendPlayerCommunication(text);
      input.value = '';
    });

    document.querySelectorAll('.quick-chat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const msg = btn.dataset.msg;
        if (msg) this._sendPlayerCommunication(msg);
      });
    });

    // Character Creator & Sign-In Modal Triggers
    const openCharModal = () => this._openProfileModal(false);
    document.getElementById('btnOpenProfileModal').addEventListener('click', openCharModal);
    document.getElementById('btnCustomizeCharLeft').addEventListener('click', openCharModal);
    document.getElementById('cardAvatarFrame').addEventListener('click', openCharModal);
    document.getElementById('playerAvatar').addEventListener('click', openCharModal);

    document.getElementById('btnCloseProfileModal').addEventListener('click', () => {
      const profile = this.storage.getActiveProfile();
      if (!profile.hasSignedIn) {
        const entered = document.getElementById('inputProfileName').value.trim();
        if (!entered) {
          this._showToast('Please pick a Player Name & Avatar to sign in first!');
          document.getElementById('inputProfileName').focus();
          return;
        }
        this._saveCharacterFromModal(true);
        return;
      }
      document.getElementById('profileModal').classList.add('hidden');
    });

    // Live Character Creator Selectors
    const charSelectIds = [
      'selectCharGender',
      'selectCharAge',
      'selectCharSkin',
      'selectCharHairStyle',
      'selectCharHairColor',
      'selectCharEyeColor',
      'selectCharBeard'
    ];
    charSelectIds.forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        this._updateCreatorPreviewFromInputs();
      });
    });

    document.getElementById('btnRandomizeCharacter').addEventListener('click', () => {
      const pick = arr => arr[Math.floor(Math.random() * arr.length)].id;
      document.getElementById('selectCharGender').value = pick(CHARACTER_OPTIONS.genders);
      document.getElementById('selectCharAge').value = pick(CHARACTER_OPTIONS.ages);
      document.getElementById('selectCharSkin').value = pick(CHARACTER_OPTIONS.skinTones);
      document.getElementById('selectCharHairStyle').value = pick(CHARACTER_OPTIONS.hairStyles);
      document.getElementById('selectCharHairColor').value = pick(CHARACTER_OPTIONS.hairColors);
      document.getElementById('selectCharEyeColor').value = pick(CHARACTER_OPTIONS.eyeColors);
      document.getElementById('selectCharBeard').value =
        document.getElementById('selectCharGender').value === 'female'
          ? 'none'
          : pick(CHARACTER_OPTIONS.facialHairs);
      this._updateCreatorPreviewFromInputs();
    });

    document.getElementById('btnSwitchToShopFromProfile').addEventListener('click', () => {
      const nameVal = document.getElementById('inputProfileName').value.trim();
      if (nameVal) {
        this._saveCharacterFromModal(false);
      }
      document.getElementById('profileModal').classList.add('hidden');
      this._openShopModal();
    });

    // Save & Play vs. Computer
    document.getElementById('profileSignInForm').addEventListener('submit', e => {
      e.preventDefault();
      if (!this._saveCharacterFromModal(true)) return;
      this._switchGameMode('bot');
      this.startNewBotGame();
    });

    // Save & Join Multiplayer Room
    document.getElementById('btnSaveAndPlayMulti').addEventListener('click', () => {
      if (!this._saveCharacterFromModal(true)) return;
      this._switchGameMode('multiplayer');
      document.body.dataset.mobileTab = 'setup';
      setTimeout(() => {
        document.getElementById('roomNameInput')?.focus();
      }, 60);
    });

    document.getElementById('btnExportProfile').addEventListener('click', () => {
      const json = this.storage.exportProfileJson();
      navigator.clipboard?.writeText(json);
      this._showToast('Profile JSON copied to clipboard!');
    });
    document.getElementById('btnToggleImport').addEventListener('click', () => {
      document.getElementById('importProfileArea').classList.toggle('hidden');
    });
    document.getElementById('btnConfirmImport').addEventListener('click', () => {
      try {
        const raw = document.getElementById('inputImportJson').value.trim();
        const restored = this.storage.importProfileJson(raw);
        this._refreshProfileUI();
        this._renderBotList();
        document.getElementById('profileModal').classList.add('hidden');
        this._showToast(`Restored profile ${restored.username} (${restored.elo} Elo)!`);
      } catch (err) {
        this._showToast('Invalid profile JSON.');
      }
    });

    // Seasonal Costume Shop Modal Triggers
    document.getElementById('btnOpenShopModal').addEventListener('click', () => {
      this._openShopModal();
    });
    document.getElementById('btnOpenShopLeft').addEventListener('click', () => {
      this._openShopModal();
    });
    document.getElementById('btnCloseShopModal').addEventListener('click', () => {
      document.getElementById('shopModal').classList.add('hidden');
    });
    document.getElementById('btnOpenCharFromShop').addEventListener('click', () => {
      document.getElementById('shopModal').classList.add('hidden');
      this._openProfileModal(false);
    });

    document.querySelectorAll('.season-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.season-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.shopSeasonFilter = btn.dataset.season;
        this._renderShopGrid();
      });
    });

    document.querySelectorAll('.slot-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.slot-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.shopSlotFilter = btn.dataset.slot;
        this._renderShopGrid();
      });
    });

    // Victory Treasure Chest Opening inside Post-Game Modal
    document.getElementById('btnOpenVictoryChest').addEventListener('click', () => {
      this.sound.playChestOpen();
      const reward = this.storage.claimVictoryChestReward(this.lastMatchOpponentElo);
      document.getElementById('chestClosedView').classList.add('hidden');
      document.getElementById('chestOpenedView').classList.remove('hidden');
      document.getElementById('chestRewardHeadline').textContent = `+${reward.totalCoins} Arcane Coins Claimed!`;
      document.getElementById('chestRewardBreakdown').textContent = `Base +${reward.baseCoins} • Elo Bonus +${reward.eloBonus} • 🔥 Streak Bonus +${reward.streakBonus}`;
      this._refreshProfileUI();
    });

    document.getElementById('btnVisitShopFromChest').addEventListener('click', () => {
      document.getElementById('postGameModal').classList.add('hidden');
      this._openShopModal();
    });

    // Stats & Elo Modal
    document.getElementById('btnOpenStatsModal').addEventListener('click', () => {
      this._openStatsModal();
    });
    document.getElementById('eloSparklineContainer').addEventListener('click', () => {
      this._openStatsModal();
    });
    document.getElementById('btnCloseStatsModal').addEventListener('click', () => {
      document.getElementById('statsModal').classList.add('hidden');
    });
    document.getElementById('btnResetStats').addEventListener('click', () => {
      if (confirm('Reset wins, losses, and Elo history back to 500 Elo?')) {
        this.storage.resetActiveProfileStats(500);
        this._refreshProfileUI();
        this._renderBotList();
        this._openStatsModal();
        this._showToast('Profile stats reset to 500 Elo.');
      }
    });

    // Post-Game Modal buttons
    document.getElementById('btnClosePostGameModal').addEventListener('click', () => {
      document.getElementById('postGameModal').classList.add('hidden');
    });
    document.getElementById('btnPostGameRematch').addEventListener('click', () => {
      document.getElementById('postGameModal').classList.add('hidden');
      if (this.gameMode === 'multiplayer') {
        this._requestMultiplayerRematch();
      } else {
        this.startNewBotGame();
      }
    });
    document.getElementById('btnPostGameMatchElo').addEventListener('click', () => {
      document.getElementById('postGameModal').classList.add('hidden');
      const profile = this.storage.getActiveProfile();
      const recBot = getRecommendedBotForElo(profile.elo);
      this.selectedBot = recBot;
      this.storage.savePrefs({ selectedBotId: recBot.id });
      this._switchGameMode('bot');
      this._renderBotList();
      this.startNewBotGame();
    });
  }

  _updateBattleCamButton() {
    const btn = document.getElementById('camBattleToggle');
    if (!btn || !this.board3D) return;
    const on = this.board3D.battleCam;
    btn.textContent = on ? '⚔️ Fight Zoom: ON' : '⚔️ Fight Zoom: OFF';
    btn.classList.toggle('active', on);
  }

  _highlightActive2DSwatch(theme) {
    document.querySelectorAll('.color-swatch-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
  }

  _applyViewMode(mode, save = true) {
    this.viewMode = mode === '2d' ? '2d' : '3d';
    if (save) {
      this.storage.savePrefs({ viewMode: this.viewMode });
    }

    const is3D = this.viewMode === '3d';
    document.getElementById('btnView3D').classList.toggle('active', is3D);
    document.getElementById('btnView2D').classList.toggle('active', !is3D);

    document.getElementById('board3DContainer').classList.toggle('hidden', !is3D);
    document.getElementById('hud3DControls').classList.toggle('hidden', !is3D);

    document.getElementById('board2DContainer').classList.toggle('hidden', is3D);
    document.getElementById('hud2DControls').classList.toggle('hidden', is3D);

    if (is3D && this.board3D) {
      setTimeout(() => this.board3D.handleResize(), 20);
    }
    this._renderBoard();
  }

  _switchGameMode(mode) {
    this.gameMode = mode === 'multiplayer' ? 'multiplayer' : 'bot';
    const isBot = this.gameMode === 'bot';

    document.getElementById('btnModeBot').classList.toggle('active', isBot);
    document.getElementById('btnModeMulti').classList.toggle('active', !isBot);

    document.getElementById('botSelectorPanel').classList.toggle('hidden', !isBot);
    document.getElementById('multiplayerPanel').classList.toggle('hidden', isBot);

    document.getElementById('btnUndoMove').classList.toggle('hidden', !isBot);
    document.getElementById('btnOfferDraw').classList.toggle('hidden', isBot);
    document.getElementById('botDialogueBanner').classList.toggle('hidden', !isBot);

    const profile = this.storage.getActiveProfile();
    document.getElementById('multiPlayerNameInput').value = profile.username;
    this._updateMultiplayerScoreboard();
    this._updateRoomJoinUI();
  }

  _flipBoardPerspective() {
    this.boardOrientation = this.boardOrientation === 'w' ? 'b' : 'w';
    this.board2D?.setOrientation(this.boardOrientation);
    this.board3D?.setOrientation(this.boardOrientation);
    this._renderBoard();
  }

  startNewBotGame() {
    if (this.botTimerId) {
      clearTimeout(this.botTimerId);
      this.botTimerId = null;
    }
    this.botThinking = false;
    this.matchEndedRecorded = false;
    document.getElementById('boardStartOverlay')?.classList.add('hidden');

    const colorPref = document.getElementById('botColorPref').value;
    if (colorPref === 'random') {
      this.playerColor = Math.random() < 0.5 ? 'w' : 'b';
    } else {
      this.playerColor = colorPref === 'b' ? 'b' : 'w';
    }
    this.boardOrientation = this.playerColor;

    const mins = Number(document.getElementById('botTimeControl').value);
    this.storage.savePrefs({ timeControlMinutes: mins });
    this.timeControlSeconds = mins * 60;
    this.clocks = {
      w: this.timeControlSeconds,
      b: this.timeControlSeconds
    };

    this.game.reset();
    this.selectedSquare = null;
    this.legalMovesForSelected = [];

    this.board2D?.setOrientation(this.boardOrientation);
    this.board3D?.setOrientation(this.boardOrientation);

    document.getElementById('opponentAvatar').innerHTML = this.selectedBot.avatarSvg;
    document.getElementById('opponentName').textContent = this.selectedBot.name;
    document.getElementById('opponentEloBadge').textContent = `${this.selectedBot.elo} Elo`;
    document.getElementById('opponentTitle').textContent = `${this.selectedBot.title} • ${this.selectedBot.badge}`;

    this._setBotDialogue(pickBotLine(this.selectedBot, 'greeting'));

    this._startClockLoop();
    this._renderAll();

    if (this.playerColor === 'b') {
      this._scheduleBotMove();
    }
  }

  _handleSquareInteraction(sq, action) {
    const status = this.game.getGameStatus();
    if (status.over || this.botThinking) return;

    if (this.gameMode === 'bot' && this.game.turn !== this.playerColor) return;
    if (this.gameMode === 'multiplayer') {
      if (!this.multiplayer.isInRoom()) {
        this._showToast('🔴 You are not in a room yet! Enter a Room Name and tap Join.');
        return;
      }
      if (this.multiplayer.isConnected() && this.game.turn !== this.playerColor) {
        return;
      }
    }

    const clickedPiece = this.game.getPiece(sq);

    if (this.selectedSquare) {
      const matchingMoves = this.legalMovesForSelected.filter(m => m.to === sq);
      if (matchingMoves.length > 0) {
        if (matchingMoves.some(m => m.promotion)) {
          this._promptPawnPromotion(matchingMoves[0].from, sq, this.game.turn);
          return;
        }
        this._executeLocalMove({ from: this.selectedSquare, to: sq });
        return;
      }
    }

    if (clickedPiece && clickedPiece.color === this.game.turn) {
      if (this.selectedSquare === sq && action === 'click') {
        this.selectedSquare = null;
        this.legalMovesForSelected = [];
      } else {
        this.selectedSquare = sq;
        this.legalMovesForSelected = this.game.getLegalMoves(sq);
      }
      this._renderBoard();
    } else {
      this.selectedSquare = null;
      this.legalMovesForSelected = [];
      this._renderBoard();
    }
  }

  _promptPawnPromotion(from, to, color) {
    this.pendingPromotionMove = { from, to, color };
    const modal = document.getElementById('promotionModal');
    const choicesEl = document.getElementById('promotionChoices');
    choicesEl.innerHTML = '';

    for (const pieceType of ['q', 'r', 'b', 'n']) {
      const btn = document.createElement('button');
      btn.className = 'promo-choice-btn';
      btn.innerHTML = PIECE_SVGS[color][pieceType];
      btn.addEventListener('click', () => {
        modal.classList.add('hidden');
        const pending = this.pendingPromotionMove;
        this.pendingPromotionMove = null;
        if (pending) {
          this._executeLocalMove({
            from: pending.from,
            to: pending.to,
            promotion: pieceType
          });
        }
      });
      choicesEl.appendChild(btn);
    }

    modal.classList.remove('hidden');
  }

  _executeLocalMove(moveSpec) {
    const record = this.game.makeMove(moveSpec);
    if (!record) return;

    this.selectedSquare = null;
    this.legalMovesForSelected = [];

    this._onMovePlayed(record, true);

    if (this.gameMode === 'multiplayer' && this.multiplayer.isConnected()) {
      this.multiplayer.sendPacket({
        type: 'move',
        move: moveSpec,
        clocks: this.clocks
      });
    }

    const status = this.game.getGameStatus();
    if (status.over) {
      this._handleGameOver();
    } else if (this.gameMode === 'bot' && this.game.turn !== this.playerColor) {
      this._scheduleBotMove();
    }
  }

  _scheduleBotMove() {
    this.botThinking = true;
    this._updateStatusBanner();

    // If a 3D capture battle is playing, give it time to finish before bot moves!
    const combatExtra = this.board3D?.activeCombat ? 1550 : 0;
    const delay = 440 + Math.floor(Math.random() * 260) + combatExtra;

    this.botTimerId = setTimeout(() => {
      this.botTimerId = null;
      const status = this.game.getGameStatus();
      if (status.over) {
        this.botThinking = false;
        return;
      }

      const aiMove = selectBotMove(this.game, this.selectedBot);
      this.botThinking = false;
      if (!aiMove) return;

      const record = this.game.makeMove({
        from: aiMove.from,
        to: aiMove.to,
        promotion: aiMove.promotion || 'q'
      });

      if (record) {
        this._onMovePlayed(record, false);
        const afterStatus = this.game.getGameStatus();
        if (afterStatus.over) {
          this._handleGameOver();
        }
      }
    }, delay);
  }

  _onMovePlayed(record, isPlayerMove) {
    const is3D = this.viewMode === '3d';
    const usingBattleZoom = is3D && record.captured && this.board3D?.battleCam;

    if (record.givesCheck) {
      this.sound.playCheck();
    } else if (record.captured) {
      // If using 3D Battle Zoom, clash and shatter audio are triggered at impact moments by board3D
      if (!usingBattleZoom) {
        this.sound.playCapture(is3D);
      } else {
        this.sound.playMove(true);
      }
    } else {
      this.sound.playMove(is3D);
    }

    if (this.gameMode === 'bot') {
      if (record.givesCheck) {
        this._setBotDialogue(
          pickBotLine(this.selectedBot, isPlayerMove ? 'onChecked' : 'onCheck')
        );
      } else if (record.captured) {
        this._setBotDialogue(
          pickBotLine(
            this.selectedBot,
            isPlayerMove ? 'onPlayerCapture' : 'onBotCapture'
          )
        );
      }
    }

    const lastMove = { from: record.from, to: record.to };
    this.board2D?.render(this.game, null, [], lastMove);
    if (this.board3D) {
      this.board3D.animateMove(record, this.game);
    }

    this._updateMoveTable();
    this._updateCapturedPieces();
    this._updateStatusBanner();
  }

  _handleGameOver() {
    if (this.matchEndedRecorded) return;
    this.matchEndedRecorded = true;
    this._stopClockLoop();
    this._updateStatusBanner();

    const status = this.game.getGameStatus();
    const isPlayerVictory = status.winner === this.playerColor;

    const opponentName =
      this.gameMode === 'bot'
        ? this.selectedBot.name
        : this.multiplayer.opponentProfile?.username || 'Human Challenger';
    const opponentElo =
      this.gameMode === 'bot'
        ? this.selectedBot.elo
        : this.multiplayer.opponentProfile?.elo || 1200;

    this.lastMatchOpponentElo = opponentElo;

    const resultData = this.storage.recordMatchResult({
      mode: this.gameMode,
      botId: this.gameMode === 'bot' ? this.selectedBot.id : null,
      opponentName,
      opponentElo,
      playerColor: this.playerColor,
      winner: status.winner,
      reason: status.reason,
      movesCount: Math.ceil(this.game.history.length / 2),
      pgn: this.game.toPgn(this._getPgnHeaders())
    });

    this._refreshProfileUI();
    this._renderBotList();
    this._updateMultiplayerScoreboard();

    let closingQuote = '';
    if (this.gameMode === 'bot') {
      const cat =
        status.winner === 'draw'
          ? 'onDraw'
          : isPlayerVictory
          ? 'onLoss'
          : 'onWin';
      closingQuote = pickBotLine(this.selectedBot, cat);
      this._setBotDialogue(closingQuote);
    }

    // Delay Post-Game modal slightly if 3D capture battle animation is finishing
    const modalDelay = this.board3D?.activeCombat ? 1450 : 250;
    setTimeout(() => {
      this.sound.playGameEnd(isPlayerVictory);
      this._showPostGameModal({
        status,
        isPlayerVictory,
        opponentName,
        eloCalc: resultData.eloCalc,
        earnedChest: resultData.earnedChest,
        participationCoins: resultData.participationCoins,
        closingQuote,
        newElo: resultData.profile.elo
      });
    }, modalDelay);
  }

  _showPostGameModal({
    status,
    isPlayerVictory,
    opponentName,
    eloCalc,
    earnedChest,
    participationCoins,
    closingQuote,
    newElo
  }) {
    const titleEl = document.getElementById('postGameTitle');
    const subEl = document.getElementById('postGameSubtitle');
    const oldEl = document.getElementById('postGameOldElo');
    const newEl = document.getElementById('postGameNewElo');
    const deltaEl = document.getElementById('postGameDeltaBadge');
    const quoteEl = document.getElementById('postGameBotQuote');
    const recEl = document.getElementById('postGameRecommendation');
    const chestSection = document.getElementById('victoryChestSection');
    const partNote = document.getElementById('participationCoinNote');

    if (status.winner === 'draw') {
      titleEl.textContent = 'HONORABLE DRAW';
    } else if (isPlayerVictory) {
      titleEl.textContent = 'GLORIOUS VICTORY!';
    } else {
      titleEl.textContent = 'DEFEAT';
    }

    const reasonLabels = {
      checkmate: 'by Checkmate',
      stalemate: 'by Stalemate',
      threefold: 'by Threefold Repetition',
      'fifty-move': 'by 50-Move Rule',
      insufficient: 'by Insufficient Material',
      resignation: 'by Resignation',
      timeout: 'on Time',
      agreement: 'by Agreement'
    };

    subEl.textContent = `Match vs. ${opponentName} ended ${
      reasonLabels[status.reason] || ''
    }`;
    oldEl.textContent = eloCalc.oldElo;
    newEl.textContent = eloCalc.newElo;

    const sign = eloCalc.delta >= 0 ? '+' : '';
    deltaEl.textContent = `${sign}${eloCalc.delta}`;
    deltaEl.className = `elo-delta-pill ${
      eloCalc.delta >= 0 ? 'delta-pos' : 'delta-neg'
    }`;

    // Victory Chest vs Participation Coins
    if (earnedChest) {
      chestSection.classList.remove('hidden');
      document.getElementById('chestClosedView').classList.remove('hidden');
      document.getElementById('chestOpenedView').classList.add('hidden');
      partNote.classList.add('hidden');
    } else {
      chestSection.classList.add('hidden');
      if (participationCoins > 0) {
        partNote.textContent = `🪙 +${participationCoins} Daily Play Coins earned toward your next avatar costume!`;
        partNote.classList.remove('hidden');
      } else {
        partNote.classList.add('hidden');
      }
    }

    if (closingQuote) {
      quoteEl.textContent = `"${closingQuote}" — ${this.selectedBot.name}`;
      quoteEl.classList.remove('hidden');
    } else {
      quoteEl.classList.add('hidden');
    }

    const recBot = getRecommendedBotForElo(newElo);
    recEl.innerHTML = `Based on your new rating of <strong>${newElo} Elo</strong>, your ideal computer rival is <strong>${recBot.name} (${recBot.elo} Elo)</strong>.`;

    document.getElementById('postGameModal').classList.remove('hidden');
  }

  /* ==================== CLOCKS ==================== */
  _startClockLoop() {
    this._stopClockLoop();
    this._renderClocks();
    if (this.timeControlSeconds <= 0) return;

    this.clockInterval = setInterval(() => {
      const status = this.game.getGameStatus();
      if (status.over) {
        this._stopClockLoop();
        return;
      }
      if (this.gameMode === 'multiplayer' && !this.multiplayer.isConnected()) {
        return;
      }
      const activeTurn = this.game.turn;
      this.clocks[activeTurn] = Math.max(0, this.clocks[activeTurn] - 1);
      this._renderClocks();

      if (this.clocks[activeTurn] <= 0) {
        const winner = activeTurn === 'w' ? 'b' : 'w';
        this.game.setCustomResult(winner, 'timeout');
        this._handleGameOver();
      }
    }, 1000);
  }

  _stopClockLoop() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }

  _formatSeconds(sec) {
    if (this.timeControlSeconds <= 0) return '∞';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  _renderClocks() {
    const oppColor = this.playerColor === 'w' ? 'b' : 'w';
    const selfClockEl = document.getElementById('playerClock');
    const oppClockEl = document.getElementById('opponentClock');

    selfClockEl.textContent = this._formatSeconds(this.clocks[this.playerColor]);
    oppClockEl.textContent = this._formatSeconds(this.clocks[oppColor]);

    const status = this.game.getGameStatus();
    selfClockEl.classList.toggle(
      'active-clock',
      !status.over && this.game.turn === this.playerColor
    );
    oppClockEl.classList.toggle(
      'active-clock',
      !status.over && this.game.turn === oppColor
    );
  }

  /* ==================== MULTIPLAYER & COMMUNICATION ==================== */
  _checkUrlRoomParam() {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      this._switchGameMode('multiplayer');
      document.getElementById('roomNameInput').value = room;
    }
  }

  _updateRoomJoinUI(statusObj = null) {
    const inRoom = statusObj ? !!statusObj.inRoom : this.multiplayer.isInRoom();
    const isConnected = statusObj ? !!statusObj.connected : this.multiplayer.isConnected();
    const roomName = statusObj?.roomName || this.multiplayer.roomName || '';

    const joinBtn = document.getElementById('btnJoinRoom');
    const leaveBtn = document.getElementById('btnLeaveRoom');
    const roomPill = document.getElementById('roomBadgePill');
    const overlay = document.getElementById('boardStartOverlay');
    const overlayPill = document.getElementById('boardOverlayStatusPill');
    const overlayTitle = document.getElementById('boardOverlayTitle');
    const overlayDesc = document.getElementById('boardOverlayDesc');

    if (inRoom) {
      joinBtn.className = 'join-room-btn state-green';
      if (isConnected) {
        const oppName = this.multiplayer.opponentProfile?.username || 'Opponent';
        joinBtn.textContent = `🟢 In Room "${roomName}" with ${oppName}`;
      } else {
        joinBtn.textContent = `🟢 In Room "${roomName}" (Waiting for Friend...)`;
      }
      leaveBtn.classList.remove('hidden');

      if (roomPill) {
        roomPill.className = 'room-pill-indicator pill-green';
        roomPill.textContent = `🟢 IN ROOM: ${roomName}`;
      }
      if (overlayPill) {
        overlayPill.className = 'room-pill-indicator pill-green';
        overlayPill.textContent = `🟢 IN ROOM: ${roomName}`;
      }
      if (overlayTitle && overlayDesc) {
        if (isConnected) {
          const oppName = this.multiplayer.opponentProfile?.username || 'Opponent';
          overlayTitle.textContent = `Ready vs. ${oppName}!`;
          overlayDesc.innerHTML = `Both players are in room <strong>"${roomName}"</strong>! Press <strong>▶️ START GAME</strong> below to begin your match.`;
        } else {
          overlayTitle.textContent = `You're in Room "${roomName}"!`;
          overlayDesc.innerHTML = `Share room name <strong>"${roomName}"</strong> with your friend, or press <strong>▶️ START GAME</strong> to open the board right now!`;
        }
      }
    } else {
      joinBtn.className = 'join-room-btn state-red';
      joinBtn.textContent = '🔴 Not in Room — Tap to Join Room';
      leaveBtn.classList.add('hidden');

      if (roomPill) {
        roomPill.className = 'room-pill-indicator pill-red';
        roomPill.textContent = '🔴 NOT IN ROOM';
      }
      if (overlayPill) {
        overlayPill.className = 'room-pill-indicator pill-red';
        overlayPill.textContent = '🔴 NOT IN ROOM YET';
      }
      if (overlayTitle && overlayDesc) {
        overlayTitle.textContent = 'Join a Multiplayer Room';
        overlayDesc.innerHTML =
          'Enter the same Room Name as your friend, tap the red button so it turns <strong>🟢 GREEN</strong>, then press <strong>▶️ START GAME</strong>!';
      }
    }

    if (overlay) {
      if (this.gameMode === 'multiplayer' && !this.multiplayerGameStarted) {
        overlay.classList.remove('hidden');
      } else {
        overlay.classList.add('hidden');
      }
    }
  }

  _joinMultiplayerRoomFromUI() {
    const enteredName = document.getElementById('multiPlayerNameInput').value.trim();
    if (!enteredName) {
      this._showToast('Please enter your Player Name first!');
      document.getElementById('multiPlayerNameInput').focus();
      return false;
    }

    // Sign in or update active profile name
    const currentProfile = this.storage.getActiveProfile();
    if (enteredName !== currentProfile.username || !currentProfile.hasSignedIn) {
      this.storage.signIn(enteredName, currentProfile.elo, currentProfile.character);
      this._refreshProfileUI();
    }

    const roomName = document.getElementById('roomNameInput').value.trim();
    if (!roomName) {
      this._showToast('Please enter a Shared Room Name (e.g. hogwarts-room) to join.');
      document.getElementById('roomNameInput').focus();
      return false;
    }

    const colorPref = document.getElementById('roomColorPref').value;
    const mins = Number(document.getElementById('roomTimeControl').value);
    const profile = this.storage.getActiveProfile();

    const url = new URL(window.location.href);
    url.searchParams.set('room', roomName);
    window.history.replaceState({}, '', url);

    this.multiplayer.joinRoom(roomName, profile, colorPref, mins);
    this._updateRoomJoinUI();
    return true;
  }

  _handleExplicitStartMultiplayerGame() {
    // If not in room yet, try to join using the roomNameInput first
    if (!this.multiplayer.isInRoom()) {
      const roomVal = document.getElementById('roomNameInput').value.trim();
      if (!roomVal) {
        this._showToast('Enter a Shared Room Name first, then tap Join or Start Game!');
        document.getElementById('roomNameInput').focus();
        return;
      }
      const joined = this._joinMultiplayerRoomFromUI();
      if (!joined) return;
    }

    const colorPref = document.getElementById('roomColorPref').value;
    const mins = Number(document.getElementById('roomTimeControl').value);
    this.multiplayerGameStarted = true;
    document.getElementById('boardStartOverlay')?.classList.add('hidden');

    if (this.multiplayer.isConnected()) {
      this.multiplayer.triggerStartGame(colorPref, mins);
      this._showToast('▶️ Match started!');
    } else {
      // Allow starting the board immediately even while waiting for the 2nd player to arrive!
      this.matchEndedRecorded = false;
      this.playerColor = colorPref === 'b' ? 'b' : 'w';
      this.boardOrientation = this.playerColor;
      this.timeControlSeconds = mins * 60;
      this.clocks = {
        w: this.timeControlSeconds,
        b: this.timeControlSeconds
      };
      this.game.reset();
      this.selectedSquare = null;
      this.legalMovesForSelected = [];
      this.board2D?.setOrientation(this.boardOrientation);
      this.board3D?.setOrientation(this.boardOrientation);
      this._startClockLoop();
      this._renderAll();
      this._showToast(
        `🟢 Board ready in room "${this.multiplayer.roomName}"! As soon as your friend joins, they will sync automatically.`
      );
    }
  }

  _onMultiplayerStatus(status) {
    const banner = document.getElementById('roomStatusBanner');
    const textEl = document.getElementById('roomStatusText');
    banner.className = `room-status-banner status-${status.state}`;
    textEl.textContent = status.message;
    this._updateRoomJoinUI(status);
  }

  _onMultiplayerRoomReady({ myColor, opponentProfile, timeControlMinutes }) {
    this._updateMultiplayerScoreboard();
    this._updateRoomJoinUI();
    this._showToast(
      `🟢 Connected with ${opponentProfile.username}! Press "▶️ START GAME" to begin!`
    );
    // If either player already clicked Start Game while waiting, launch right away!
    if (this.multiplayerGameStarted) {
      const colorPref = document.getElementById('roomColorPref').value;
      const mins = Number(document.getElementById('roomTimeControl').value);
      this.multiplayer.triggerStartGame(colorPref, mins);
    }
  }

  _onMultiplayerMatchStart({ myColor, opponentProfile, timeControlMinutes }) {
    this.multiplayerGameStarted = true;
    this.matchEndedRecorded = false;
    this.playerColor = myColor;
    this.boardOrientation = myColor;
    this.timeControlSeconds = (timeControlMinutes ?? 0) * 60;
    this.clocks = {
      w: this.timeControlSeconds,
      b: this.timeControlSeconds
    };

    document.getElementById('boardStartOverlay')?.classList.add('hidden');

    this.game.reset();
    this.selectedSquare = null;
    this.legalMovesForSelected = [];

    this.board2D?.setOrientation(this.boardOrientation);
    this.board3D?.setOrientation(this.boardOrientation);

    // Render Opponent's Custom Character & Costume!
    const oppRank = getRankTitleForElo(opponentProfile.elo || 500);
    document.getElementById('opponentAvatar').innerHTML = renderAvatarSvg(
      opponentProfile.equipped,
      opponentProfile.character
    );
    document.getElementById('opponentName').textContent =
      opponentProfile.username || 'Challenger';
    document.getElementById('opponentEloBadge').textContent = `${
      opponentProfile.elo || 500
    } Elo`;
    document.getElementById('opponentTitle').textContent = `${oppRank.title} • Room "${this.multiplayer.roomName}"`;

    this._updateMultiplayerScoreboard();
    this._updateRoomJoinUI();
    this._startClockLoop();
    this._renderAll();
    this._appendChatMessage(
      'Arena',
      `Match started vs. ${opponentProfile.username}! You are playing ${
        myColor === 'w' ? 'White' : 'Black'
      }.`
    );
  }

  _updateMultiplayerScoreboard() {
    const profile = this.storage.getActiveProfile();
    document.getElementById('scoreSelfName').textContent = profile.username;

    const oppName = this.multiplayer.opponentProfile?.username;
    if (oppName) {
      document.getElementById('scoreOppName').textContent = oppName;
      const stats = profile.peerStats?.[oppName.toLowerCase()] || {
        wins: 0,
        losses: 0,
        draws: 0
      };
      document.getElementById('scoreSelfVal').textContent = stats.wins;
      document.getElementById('scoreOppVal').textContent = stats.losses;
      document.getElementById('scoreDrawsVal').textContent = `${stats.draws} Draws`;
    } else {
      document.getElementById('scoreOppName').textContent = 'Opponent';
      document.getElementById('scoreSelfVal').textContent = '0';
      document.getElementById('scoreOppVal').textContent = '0';
      document.getElementById('scoreDrawsVal').textContent = '0 Draws';
    }
  }

  _sendPlayerCommunication(text) {
    const profile = this.storage.getActiveProfile();
    this._appendChatMessage(profile.username, text);

    if (this.gameMode === 'multiplayer' && this.multiplayer.isConnected()) {
      this.multiplayer.sendPacket({
        type: 'chat',
        senderName: profile.username,
        text,
        timestamp: Date.now()
      });
    } else if (this.gameMode === 'bot') {
      // Bot replies in the Communication Window!
      setTimeout(() => {
        const reply = pickBotLine(this.selectedBot, 'greeting');
        this._appendChatMessage(this.selectedBot.name, reply);
      }, 550);
    }
  }

  _onMultiplayerRemoteMove(moveSpec, remoteClocks) {
    const record = this.game.makeMove(moveSpec);
    if (!record) return;
    if (remoteClocks) {
      this.clocks = { ...remoteClocks };
    }
    this._onMovePlayed(record, false);
    const status = this.game.getGameStatus();
    if (status.over) {
      this._handleGameOver();
    }
  }

  _onMultiplayerRemoteResign(resigningColor) {
    const winner = resigningColor === 'w' ? 'b' : 'w';
    this.game.setCustomResult(winner, 'resignation');
    this._handleGameOver();
  }

  _onMultiplayerDrawOffer(fromName) {
    if (confirm(`${fromName} offers a Draw. Accept draw?`)) {
      this.multiplayer.sendPacket({ type: 'draw_accept' });
      this.game.setCustomResult('draw', 'agreement');
      this._handleGameOver();
    }
  }

  _onMultiplayerDrawAccept() {
    this.game.setCustomResult('draw', 'agreement');
    this._handleGameOver();
  }

  _requestMultiplayerRematch() {
    if (!this.multiplayer.isConnected()) {
      this._handleExplicitStartMultiplayerGame();
      return;
    }
    const nextColor = this.playerColor === 'w' ? 'b' : 'w';
    this.multiplayer.sendPacket({
      type: 'rematch',
      newHostColor: nextColor
    });
    this._onMultiplayerMatchStart({
      myColor: nextColor,
      opponentProfile: this.multiplayer.opponentProfile,
      timeControlMinutes: this.timeControlSeconds / 60
    });
  }

  _onMultiplayerRemoteRematch(hostColor) {
    const myNewColor = hostColor === 'w' ? 'b' : 'w';
    this._onMultiplayerMatchStart({
      myColor: myNewColor,
      opponentProfile: this.multiplayer.opponentProfile,
      timeControlMinutes: this.timeControlSeconds / 60
    });
  }

  _appendChatMessage(sender, text) {
    const list = document.getElementById('chatMessagesList');
    const sys = list.querySelector('.chat-system-msg');
    if (sys) sys.remove();

    const div = document.createElement('div');
    div.className = 'chat-msg-item';
    div.innerHTML = `<strong></strong>: <span></span>`;
    div.querySelector('strong').textContent = sender;
    div.querySelector('span').textContent = text;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
  }

  /* ==================== CHARACTER CREATOR, SIGN-IN & 4-STAGE COSTUME SHOP ==================== */
  _openProfileModal(isFirstTime = false) {
    const profile = this.storage.getActiveProfile();
    const ch = profile.character;

    const nameInput = document.getElementById('inputProfileName');
    if (isFirstTime && (!profile.hasSignedIn || profile.username === 'Traveler')) {
      nameInput.value = '';
    } else {
      nameInput.value = profile.username;
    }

    const stepBadge = document.getElementById('welcomeStepBadge');
    if (stepBadge) {
      stepBadge.textContent =
        isFirstTime || !profile.hasSignedIn
          ? 'WELCOME! • PICK YOUR NAME & AVATAR FIRST'
          : 'CHALLENGER PROFILE & AVATAR';
    }

    document.getElementById('selectCharGender').value = ch.gender || 'male';
    document.getElementById('selectCharAge').value = ch.age || 'adult';
    document.getElementById('selectCharSkin').value = ch.skinTone || 'warm';
    document.getElementById('selectCharHairStyle').value = ch.hairStyle || 'wavy';
    document.getElementById('selectCharHairColor').value = ch.hairColor || 'brown';
    document.getElementById('selectCharEyeColor').value = ch.eyeColor || 'sapphire';
    document.getElementById('selectCharBeard').value = ch.facialHair || 'none';

    this._updateCreatorPreviewFromInputs();

    const listEl = document.getElementById('savedProfilesList');
    listEl.innerHTML = '';
    for (const p of this.storage.getAllProfiles()) {
      const item = document.createElement('div');
      item.className = `saved-profile-item ${
        p.id === profile.id ? 'active' : ''
      }`;
      item.innerHTML = `
        <span><strong>${p.username}</strong> • 🪙 ${p.coins} • 🔥 ${p.dailyStreak}d</span>
        <span>${p.elo} Elo (${p.wins}W-${p.losses}L)</span>
      `;
      item.addEventListener('click', () => {
        this.storage.signIn(p.username, p.elo, p.character);
        this._refreshProfileUI();
        this._renderBotList();
        document.getElementById('profileModal').classList.add('hidden');
        this._showToast(`Signed in as ${p.username} (${p.elo} Elo)`);
      });
      listEl.appendChild(item);
    }

    document.getElementById('profileModal').classList.remove('hidden');
    if (isFirstTime || !profile.hasSignedIn) {
      setTimeout(() => nameInput.focus(), 60);
    }
  }

  _getCreatorTraitsFromInputs() {
    return {
      gender: document.getElementById('selectCharGender').value,
      age: document.getElementById('selectCharAge').value,
      skinTone: document.getElementById('selectCharSkin').value,
      hairStyle: document.getElementById('selectCharHairStyle').value,
      hairColor: document.getElementById('selectCharHairColor').value,
      eyeColor: document.getElementById('selectCharEyeColor').value,
      facialHair: document.getElementById('selectCharBeard').value
    };
  }

  _updateCreatorPreviewFromInputs() {
    const profile = this.storage.getActiveProfile();
    const traits = this._getCreatorTraitsFromInputs();
    document.getElementById('creatorAvatarPreview').innerHTML = renderAvatarSvg(
      profile.equipped,
      traits
    );
  }

  _saveCharacterFromModal(closeModal = true) {
    const nameInput = document.getElementById('inputProfileName');
    const name = nameInput.value.trim();
    if (!name) {
      this._showToast('Please enter your Player Name first!');
      nameInput.focus();
      return false;
    }

    const traits = this._getCreatorTraitsFromInputs();
    const profile = this.storage.signIn(name, 500, traits);
    this._refreshProfileUI();
    this._renderBotList();
    if (closeModal) {
      document.getElementById('profileModal').classList.add('hidden');
      this._showToast(`Welcome, ${profile.username} (${profile.elo} Elo)!`);
    }
    return true;
  }

  _renderShopStageTracker(profile) {
    const status = getPlayerShopStageStatus(profile);
    const row = document.getElementById('shopStagePillsRow');
    const hint = document.getElementById('shopNextStageHint');
    if (!row || !hint) return;

    row.innerHTML = '';
    for (const s of SHOP_STAGES) {
      const isCurrent = s.stage === status.currentStage;
      const isUnlocked = s.stage <= status.currentStage;
      const pill = document.createElement('div');
      pill.className = `stage-step-pill ${
        isCurrent ? 'current' : isUnlocked ? 'unlocked' : 'locked'
      }`;
      pill.innerHTML = `
        <span class="stage-step-top">${isUnlocked ? '🔓' : '🔒'} Stage ${s.stage}: ${
        s.name.split(': ')[1] || s.name
      }</span>
        <span class="stage-step-sub">${
          s.stage === 1
            ? 'Starter Tier (500+ Elo)'
            : `Needs ${s.reqPaidItems} item${s.reqPaidItems > 1 ? 's' : ''} + ${s.reqElo} Elo (or ${s.reqWins}W)`
        }</span>
      `;
      row.appendChild(pill);
    }

    if (status.nextStageDef) {
      const nxt = status.nextStageDef;
      hint.innerHTML = `Your Progress: <strong>Stage ${status.currentStage}</strong> (${status.paidCount} shop items unlocked • <strong>${status.playerElo} Elo</strong> • <strong>${status.playerWins} Wins</strong>) — Next: <strong>${nxt.name}</strong> requires ${nxt.reqPaidItems} unlocked items &amp; ${nxt.reqElo} Elo (or ${nxt.reqWins} Wins).`;
    } else {
      hint.innerHTML = `🏆 <strong>Stage 4 Grandmaster Vault Unlocked!</strong> You have unlocked access to all Legendary rewards!`;
    }
  }

  _openShopModal() {
    const profile = this.storage.getActiveProfile();
    const seasonInfo = getCurrentSeasonInfo();

    document.getElementById('shopModalCoins').textContent = profile.coins;
    document.getElementById('shopModalStreak').textContent = profile.dailyStreak;
    document.getElementById('shopPlayerNameLabel').textContent = profile.username;

    document.getElementById('seasonalBadgeTag').textContent = seasonInfo.badge;
    document.getElementById('seasonalBannerTitle').textContent = seasonInfo.title;
    document.getElementById('seasonalBannerDesc').textContent = seasonInfo.subtitle;

    document.getElementById('shopAvatarPreview').innerHTML = renderAvatarSvg(
      profile.equipped,
      profile.character
    );

    this._renderShopStageTracker(profile);
    this._renderShopGrid();
    document.getElementById('shopModal').classList.remove('hidden');
  }

  _renderShopGrid() {
    const profile = this.storage.getActiveProfile();
    const grid = document.getElementById('shopItemsGrid');
    grid.innerHTML = '';

    const items = SHOP_CATALOG.filter(item => {
      if (this.shopSeasonFilter !== 'all' && item.season !== this.shopSeasonFilter) {
        return false;
      }
      if (this.shopSlotFilter !== 'all' && item.slot !== this.shopSlotFilter) {
        return false;
      }
      return true;
    }).sort((a, b) => (a.stage || 1) - (b.stage || 1) || a.price - b.price);

    for (const item of items) {
      const isOwned = profile.unlockedItems.includes(item.id);
      const isEquipped = profile.equipped[item.slot] === item.id;
      const reqCheck = checkItemUnlockRequirements(item, profile);

      // Preview the avatar wearing this item
      const previewEquipped = {
        ...profile.equipped,
        [item.slot]: item.id
      };

      const card = document.createElement('div');
      card.className = `shop-item-card ${isEquipped ? 'equipped' : ''} ${
        !isOwned && reqCheck.isLocked ? 'locked-stage' : ''
      }`;

      let btnLabel = `🪙 ${item.price} Coins`;
      let btnClass = 'shop-buy-btn';
      if (isEquipped) {
        btnLabel = '✓ Equipped';
        btnClass = 'shop-buy-btn equipped-btn';
      } else if (isOwned) {
        btnLabel = 'Wear Item';
        btnClass = 'shop-buy-btn owned';
      } else if (reqCheck.isLocked) {
        btnLabel = `🔒 Stage ${item.stage} (${item.price} 🪙)`;
        btnClass = 'shop-buy-btn locked-btn';
      }

      card.innerHTML = `
        <div class="shop-item-preview">${renderAvatarSvg(
          previewEquipped,
          profile.character
        )}</div>
        <div class="shop-item-title">${item.name}</div>
        <span class="shop-item-rarity">${item.rarity}</span>
        ${
          !isOwned && reqCheck.isLocked
            ? `<div class="shop-lock-reason">${reqCheck.lockReason}</div>`
            : ''
        }
        <button type="button" class="${btnClass}">${btnLabel}</button>
      `;

      card.querySelector('button').addEventListener('click', () => {
        if (isOwned) {
          this.storage.equipShopItem(item.id);
          this.sound.playCoinPurchase();
        } else {
          const res = this.storage.buyShopItem(item.id);
          if (!res.ok) {
            this._showToast(res.message);
            return;
          }
          this.sound.playCoinPurchase();
          this._showToast(res.message);
        }
        const updated = this.storage.getActiveProfile();
        document.getElementById('shopModalCoins').textContent = updated.coins;
        document.getElementById('shopAvatarPreview').innerHTML = renderAvatarSvg(
          updated.equipped,
          updated.character
        );
        this._refreshProfileUI();
        this._renderShopStageTracker(updated);
        this._renderShopGrid();
      });

      grid.appendChild(card);
    }
  }

  /* ==================== UI RENDERING ==================== */
  _renderAll() {
    this._renderBoard();
    this._updateMoveTable();
    this._updateCapturedPieces();
    this._updateStatusBanner();
    this._renderClocks();
  }

  _renderBoard() {
    const lastMove =
      this.game.history.length > 0
        ? this.game.history[this.game.history.length - 1]
        : null;

    this.board2D?.render(
      this.game,
      this.selectedSquare,
      this.legalMovesForSelected,
      lastMove
    );
    this.board3D?.render(
      this.game,
      this.selectedSquare,
      this.legalMovesForSelected,
      lastMove
    );
  }

  _updateStatusBanner() {
    const status = this.game.getGameStatus();
    const dotEl = document.getElementById('statusIndicatorDot');
    const textEl = document.getElementById('gameStatusText');
    const checkAlert = document.getElementById('checkAlertBadge');

    dotEl.className = `turn-dot ${
      this.game.turn === 'w' ? 'white-turn' : 'black-turn'
    }`;

    checkAlert.classList.toggle('hidden', !status.inCheck || status.over);

    if (status.over) {
      if (status.winner === 'draw') {
        textEl.textContent = `Draw (${status.reason})`;
      } else {
        const winSide = status.winner === 'w' ? 'White' : 'Black';
        textEl.textContent = `${winSide} wins (${status.reason})!`;
      }
      return;
    }

    if (this.botThinking) {
      textEl.textContent = `${this.selectedBot.name} is contemplating...`;
      return;
    }

    const sideName = this.game.turn === 'w' ? 'White' : 'Black';
    const isMyTurn = this.game.turn === this.playerColor;
    textEl.textContent = `${sideName} to move ${isMyTurn ? '(Your Turn)' : ''}`;
  }

  _updateMoveTable() {
    const tbody = document.getElementById('moveHistoryBody');
    const emptyHint = document.getElementById('emptyMovesHint');
    const countBadge = document.getElementById('moveCountBadge');
    const scrollWrap = document.getElementById('moveHistoryContainer');

    tbody.innerHTML = '';
    const hist = this.game.history;
    countBadge.textContent = `${Math.ceil(hist.length / 2)} moves`;

    if (hist.length === 0) {
      emptyHint.classList.remove('hidden');
      return;
    }
    emptyHint.classList.add('hidden');

    for (let i = 0; i < hist.length; i += 2) {
      const tr = document.createElement('tr');
      const moveNum = Math.floor(i / 2) + 1;
      const wSan = hist[i]?.san || '';
      const bSan = hist[i + 1]?.san || '';
      tr.innerHTML = `<td>${moveNum}.</td><td>${wSan}</td><td>${bSan}</td>`;
      tbody.appendChild(tr);
    }

    scrollWrap.scrollTop = scrollWrap.scrollHeight;
  }

  _updateCapturedPieces() {
    const summary = this.game.getMaterialSummary();
    const selfTray = document.getElementById('capturedByPlayer');
    const oppTray = document.getElementById('capturedByOpponent');

    const myCaptured =
      this.playerColor === 'w' ? summary.capturedByWhite : summary.capturedByBlack;
    const oppCaptured =
      this.playerColor === 'w' ? summary.capturedByBlack : summary.capturedByWhite;

    const myAdv =
      this.playerColor === 'w' ? summary.whiteAdvantage : summary.blackAdvantage;
    const oppAdv =
      this.playerColor === 'w' ? summary.blackAdvantage : summary.whiteAdvantage;

    const enemyOfSelf = this.playerColor === 'w' ? 'b' : 'w';
    const enemyOfOpp = this.playerColor;

    selfTray.innerHTML =
      myCaptured
        .map(t => `<span class="captured-mini-piece">${PIECE_SVGS[enemyOfSelf][t]}</span>`)
        .join('') +
      (myAdv > 0 ? `<span class="material-adv-badge">+${myAdv}</span>` : '');

    oppTray.innerHTML =
      oppCaptured
        .map(t => `<span class="captured-mini-piece">${PIECE_SVGS[enemyOfOpp][t]}</span>`)
        .join('') +
      (oppAdv > 0 ? `<span class="material-adv-badge">+${oppAdv}</span>` : '');
  }

  _setBotDialogue(text) {
    if (!text) return;
    const el = document.getElementById('botDialogueText');
    el.textContent = `"${text}"`;
  }

  _refreshProfileUI() {
    const profile = this.storage.getActiveProfile();
    const rank = getRankTitleForElo(profile.elo);
    const total = profile.wins + profile.losses + profile.draws;
    const winRate =
      total > 0 ? `${Math.round((profile.wins / total) * 100)}%` : '—';
    const avatarSvg = renderAvatarSvg(profile.equipped, profile.character);

    // Topbar
    document.getElementById('headerAvatarIcon').innerHTML = avatarSvg;
    document.getElementById('headerPlayerName').textContent = profile.username;
    document.getElementById('headerPlayerElo').textContent = `${profile.elo} Elo`;
    document.getElementById('headerStreakCount').textContent = profile.dailyStreak || 1;
    document.getElementById('headerCoinsCount').textContent = profile.coins ?? 120;

    // Left Memory Card
    document.getElementById('cardAvatarFrame').innerHTML = avatarSvg;
    document.getElementById('cardPlayerName').textContent = profile.username;
    document.getElementById('cardPlayerRankBadge').textContent = rank.title;
    document.getElementById('cardPlayerElo').textContent = profile.elo;
    document.getElementById('cardRecordWLD').textContent = `${profile.wins}W - ${profile.losses}L - ${profile.draws}D`;
    document.getElementById('cardWinRate').textContent = winRate;
    document.getElementById('cardPeakElo').textContent = profile.peakElo;

    // Multiplayer name field
    const multiInput = document.getElementById('multiPlayerNameInput');
    if (multiInput && !multiInput.value) {
      multiInput.value = profile.username;
    }

    // Self Player Bar
    document.getElementById('playerAvatar').innerHTML = avatarSvg;
    document.getElementById('playerNameBar').textContent = profile.username;
    document.getElementById('playerEloBar').textContent = `${profile.elo} Elo`;
    document.getElementById('playerRankBar').textContent = rank.title;

    this._renderEloChart(
      document.getElementById('eloSparklineContainer'),
      profile.eloHistory,
      280,
      34,
      false
    );
  }

  _renderBotList() {
    const listEl = document.getElementById('botListContainer');
    listEl.innerHTML = '';

    const profile = this.storage.getActiveProfile();
    const recommended = getRecommendedBotForElo(profile.elo);

    for (const bot of BOT_PERSONALITIES) {
      const isSelected = bot.id === this.selectedBot.id;
      const isRec = bot.id === recommended.id;
      const record = profile.botStats?.[bot.id] || { wins: 0, losses: 0, draws: 0 };

      const card = document.createElement('div');
      card.className = `bot-card ${isSelected ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="bot-card-avatar">${bot.avatarSvg}</div>
        <div class="bot-card-body">
          <div class="bot-card-top">
            <span class="bot-card-name">${bot.name}</span>
            <span class="bot-card-elo">${bot.elo} Elo</span>
          </div>
          <div class="bot-card-meta">
            <span>${bot.badge}</span>
            <span>${record.wins}W-${record.losses}L</span>
          </div>
          ${
            isRec
              ? `<span class="bot-rec-pill">★ Recommended for your ${profile.elo} Elo</span>`
              : ''
          }
        </div>
      `;

      card.addEventListener('click', () => {
        this.selectedBot = bot;
        this.storage.savePrefs({ selectedBotId: bot.id });
        this._renderBotList();
        this.startNewBotGame();
      });

      listEl.appendChild(card);
    }
  }

  _renderEloChart(container, history, width, height, showLabels = false) {
    if (!container) return;
    const pts = history && history.length > 0 ? history : [{ elo: 1200 }];
    const values = pts.map(p => p.elo);
    const minVal = Math.min(...values) - 25;
    const maxVal = Math.max(...values) + 25;
    const span = Math.max(50, maxVal - minVal);

    const coords = values.map((v, idx) => {
      const x =
        values.length === 1
          ? width / 2
          : (idx / (values.length - 1)) * (width - 16) + 8;
      const y = height - 6 - ((v - minVal) / span) * (height - 14);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const polyline = coords.join(' ');
    const lastPt = coords[coords.length - 1].split(',');

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%">
        <polyline
          fill="none"
          stroke="#f59e0b"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          points="${polyline}"
        />
        <circle cx="${lastPt[0]}" cy="${lastPt[1]}" r="3.5" fill="#fbbf24" />
        ${
          showLabels
            ? `<text x="8" y="14" fill="#94a3b8" font-size="10">Peak: ${Math.max(
                ...values
              )} Elo</text>`
            : ''
        }
      </svg>
    `;
  }

  _openStatsModal() {
    const profile = this.storage.getActiveProfile();

    document.getElementById('modalStatElo').textContent = profile.elo;
    document.getElementById('modalStatPeak').textContent = profile.peakElo;
    document.getElementById('modalStatDailyStreak').textContent = `🔥 ${profile.dailyStreak || 1}`;
    document.getElementById('modalStatChests').textContent = `🎁 ${profile.chestsOpened || 0}`;

    this._renderEloChart(
      document.getElementById('modalEloChartContainer'),
      profile.eloHistory,
      640,
      125,
      true
    );

    const botGrid = document.getElementById('modalBotRecordsGrid');
    botGrid.innerHTML = '';
    for (const bot of BOT_PERSONALITIES) {
      const rec = profile.botStats?.[bot.id] || { wins: 0, losses: 0, draws: 0 };
      const tile = document.createElement('div');
      tile.className = 'bot-stat-tile';
      tile.innerHTML = `
        <div><strong>${bot.name}</strong> (${bot.elo})</div>
        <div style="color: var(--text-muted); margin-top: 3px;">
          ${rec.wins}W • ${rec.losses}L • ${rec.draws}D
          ${rec.wins > 0 ? '🏆' : ''}
        </div>
      `;
      botGrid.appendChild(tile);
    }

    const histList = document.getElementById('modalMatchHistoryList');
    histList.innerHTML = '';
    if (!profile.matchHistory || profile.matchHistory.length === 0) {
      histList.innerHTML = `<div class="empty-moves-hint">No completed matches recorded yet. Finish a game to track your Elo progression!</div>`;
    } else {
      for (const m of profile.matchHistory) {
        const row = document.createElement('div');
        row.className = 'match-history-row';
        const sign = m.delta >= 0 ? '+' : '';
        const outcomeBadge =
          m.outcome === 'win'
            ? '🟢 WIN'
            : m.outcome === 'loss'
            ? '🔴 LOSS'
            : '⚪ DRAW';
        row.innerHTML = `
          <div>
            <strong>${outcomeBadge}</strong> vs. ${m.opponentName} (${m.opponentElo} Elo)
            <span style="color: var(--text-muted);">• ${m.reason} (${m.movesCount} moves)</span>
          </div>
          <div style="font-family: var(--font-mono); font-weight: 700;">
            ${m.eloAfter} Elo (${sign}${m.delta})
          </div>
        `;
        histList.appendChild(row);
      }
    }

    document.getElementById('statsModal').classList.remove('hidden');
  }

  _getPgnHeaders() {
    const profile = this.storage.getActiveProfile();
    const oppName =
      this.gameMode === 'bot'
        ? this.selectedBot.name
        : this.multiplayer.opponentProfile?.username || 'Opponent';
    return {
      White: this.playerColor === 'w' ? profile.username : oppName,
      Black: this.playerColor === 'b' ? profile.username : oppName
    };
  }

  _showToast(message) {
    const banner = document.getElementById('toastBanner');
    banner.textContent = message;
    banner.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      banner.classList.add('hidden');
    }, 3200);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.arcaneChessApp = new ArcaneChessApp();
});
