/**
 * 1971 Milton Bradley "Voice of the Mummy" — Authoritative Game Rules Engine
 * Implements Part I (Side A) and Part II (Side B) rules from the original 1971 rulebook.
 */

import {
  BOARD_SPACES,
  SPACES_BY_ID,
  PLAYERS_CONFIG,
  SIDE_A_TRACKS,
  SIDE_B_TRACKS,
  TOP_LEVEL_JEWEL_IDS,
} from './board_data.js?v=15';

export { TOP_LEVEL_JEWEL_IDS };

export class VoiceOfTheMummyEngine {
  constructor(onStateChange, onEvent) {
    this.onStateChange = onStateChange || (() => {});
    this.onEvent = onEvent || (() => {});
    this.state = null;
    this.sideADeck = [];
    this.sideBDeck = [];
  }

  /**
   * Initializes a new game with the given player seat configurations.
   * @param {Array} seatConfigs Array of { id, name, control: 'human'|'ai'|'none', ageEven: boolean, rightHanded: boolean }
   */
  initGame(seatConfigs) {
    const activeSeats = seatConfigs.filter((s) => s.control !== 'none');
    if (activeSeats.length < 2) {
      throw new Error('At least 2 explorers are required to play Voice of the Mummy.');
    }

    const boardJewels = {};
    for (const sp of BOARD_SPACES) {
      if (sp.type === 'jewel') {
        boardJewels[sp.id] = true;
      }
    }

    const players = activeSeats.map((seat) => {
      const cfg = PLAYERS_CONFIG.find((c) => c.id === seat.id);
      return {
        id: cfg.id,
        name: seat.name || cfg.name,
        deity: cfg.deity,
        deityTitle: cfg.deityTitle,
        colorHex: cfg.colorHex,
        accentHex: cfg.accentHex,
        control: seat.control, // 'human' or 'ai'
        peerId: seat.peerId || null,
        spaceId: cfg.homeSpaceId,
        homeSpaceId: cfg.homeSpaceId,
        level: 1,
        jewels: 0,
        collectedMeshes: [],
        ageEven: seat.ageEven !== undefined ? seat.ageEven : true,
        rightHanded: seat.rightHanded !== undefined ? seat.rightHanded : true,
        tastedBlood: false,
      };
    });

    this.sideADeck = this._shuffleTracks(SIDE_A_TRACKS);
    this.sideBDeck = this._shuffleTracks(SIDE_B_TRACKS);

    const firstHumanIdx = players.findIndex((p) => p.control === 'human');

    this.state = {
      part: 1, // 1 = Side A (Hunt for Jewels), 2 = Side B (Escape to Temple)
      recordSide: 'SideA',
      turnIndex: firstHumanIdx >= 0 ? firstHumanIdx : 0,
      turnNumber: 1,
      phase: 'ROLL_DIE', // ROLL_DIE | CHOOSE_DIRECTION | MOVING | PULL_LEVER | MUMMY_SPEAKING | MUMMY_CHOICE | CHOOSE_LEVEL_STEP | GAME_OVER
      lastRoll: null,
      moveOptions: null, // In Part II: { cw: { targetId, path }, ccw: { targetId, path } }
      activeTrack: null,
      pendingChoice: null,
      levelStepOptions: null, // { upSpaceId, downSpaceId }
      turnChangedLevel: false,
      extraTurnGranted: false,
      boardJewels,
      greatJewelUnlocked: false,
      greatJewelOwner: null, // null = on Sarcophagus, or player.id
      cobraOwner: null, // null = on Sarcophagus, or player.id
      winnerId: null,
      finalScores: null,
      players,
      logs: [
        {
          id: Date.now(),
          text: 'Welcome to the 1971 Voice of the Mummy Tomb! Part I begins with Record Side 1 (Side A) loaded inside the Sarcophagus.',
          type: 'system',
        },
      ],
    };

    this._emitState();
    return this.state;
  }

  _shuffleTracks(tracks) {
    const arr = [...tracks];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  _drawTrack() {
    if (this.state.part === 1) {
      if (this.sideADeck.length === 0) {
        this.sideADeck = this._shuffleTracks(SIDE_A_TRACKS);
      }
      return this.sideADeck.pop();
    } else {
      if (this.sideBDeck.length === 0) {
        this.sideBDeck = this._shuffleTracks(SIDE_B_TRACKS);
      }
      return this.sideBDeck.pop();
    }
  }

  get currentPlayer() {
    if (!this.state) return null;
    return this.state.players[this.state.turnIndex];
  }

  _log(text, type = 'info') {
    this.state.logs.unshift({
      id: Date.now() + Math.random(),
      text,
      type,
    });
    if (this.state.logs.length > 60) {
      this.state.logs.length = 60;
    }
  }

  _emitState() {
    this.onStateChange(this.state);
  }

  _emitEvent(type, payload = {}) {
    this.onEvent({ type, ...payload });
  }

  _checkTopLevelJewelsUnlocked() {
    const allTopCollected = TOP_LEVEL_JEWEL_IDS.every((id) => !this.state.boardJewels[id]);
    if (allTopCollected && !this.state.greatJewelUnlocked && this.state.part === 1) {
      this.state.greatJewelUnlocked = true;
      this._log(
        'All 6 Top-Level Precious Jewels have been collected! The Great Jewel at the foot of the Mummy is now UNLOCKED — land by exact count on either Great Jewel Space on Level 3 to claim it!',
        'highlight'
      );
      this._emitEvent('great_jewel_unlocked');
    }
  }

  /**
   * Traces a path of `steps` spaces along the current level in `'cw'` or `'ccw'` direction.
   */
  tracePath(startSpaceId, steps, dir = 'cw') {
    const path = [];
    let cur = SPACES_BY_ID[startSpaceId];
    for (let i = 0; i < steps; i++) {
      const nextId = dir === 'cw' ? cur.nextSpaceId : cur.prevSpaceId;
      cur = SPACES_BY_ID[nextId];
      path.push(cur.id);
    }
    return {
      targetId: path[path.length - 1],
      path,
    };
  }

  /**
   * Generates a uniform random integer in [1, 6] using Web Crypto when available.
   */
  _randomDie1to6() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return (buf[0] % 6) + 1;
    }
    return Math.floor(Math.random() * 6) + 1;
  }

  /**
   * Step 1 of a turn: Roll the 6-sided numbered die.
   */
  rollDie(forcedValue = null) {
    if (!this.state || this.state.phase !== 'ROLL_DIE') return;
    const player = this.currentPlayer;
    const roll = forcedValue || this._randomDie1to6();
    this.state.lastRoll = roll;
    this.state.turnChangedLevel = false;

    const cwTrace = this.tracePath(player.spaceId, roll, 'cw');

    this._log(`${player.name} (${player.deity}) rolled a ${roll}!`, 'roll');
    this._emitEvent('die_rolled', { playerId: player.id, roll });

    if (this.state.part === 1) {
      // In Part I, movement is strictly CLOCKWISE
      this.state.moveOptions = { cw: cwTrace };
      this.state.phase = 'CHOOSE_DIRECTION';
      this._emitState();
    } else {
      // In Part II, player may move CLOCKWISE or COUNTER-CLOCKWISE
      const ccwTrace = this.tracePath(player.spaceId, roll, 'ccw');
      this.state.moveOptions = { cw: cwTrace, ccw: ccwTrace };
      this.state.phase = 'CHOOSE_DIRECTION';
      this._emitState();
    }
  }

  /**
   * Step 2 of a turn: Execute movement in chosen direction ('cw' or 'ccw').
   */
  selectMoveDirection(dir = 'cw') {
    if (!this.state || this.state.phase !== 'CHOOSE_DIRECTION') return;
    const trace = this.state.moveOptions?.[dir] || this.state.moveOptions?.cw;
    if (!trace) return;

    const player = this.currentPlayer;
    const fromSpaceId = player.spaceId;
    player.spaceId = trace.targetId;
    const targetSpace = SPACES_BY_ID[trace.targetId];
    player.level = targetSpace.level;
    this.state.moveOptions = null;

    this._emitEvent('player_moved', {
      playerId: player.id,
      fromSpaceId,
      toSpaceId: trace.targetId,
      path: trace.path,
    });

    this._resolveSpaceLanding(player, targetSpace, true);
  }

  /**
   * Resolves landing on a space after a dice move (isExactDiceLanding = true) or after a Mummy command.
   */
  _resolveSpaceLanding(player, space, isExactDiceLanding = false) {
    // 1. Check Part II Victory Condition (Rule II.6):
    // First Explorer WITHOUT the Cobra returning to their Home Lotus Corner space by EXACT COUNT ends the game!
    if (
      this.state.part === 2 &&
      isExactDiceLanding &&
      space.id === player.homeSpaceId
    ) {
      if (this.state.cobraOwner !== player.id) {
        this._triggerGameOver(player);
        return;
      } else {
        this._log(
          `${player.name} reached ${space.label}, but possesses the Evil Cobra Spell and cannot end the game until passing the Cobra to an opponent!`,
          'warning'
        );
      }
    }

    // 2. Check if space contains an uncollected Precious Jewel (Rule I.4)
    if (space.type === 'jewel' && this.state.boardJewels[space.id]) {
      this._collectBoardJewel(player, space.id);
    }

    // 3. Check if other opponent Explorers are occupying this exact space (Rule I.5, II.2, II.3, II.4)
    if (isExactDiceLanding) {
      const occupants = this.state.players.filter(
        (p) => p.id !== player.id && p.spaceId === space.id
      );
      if (occupants.length > 0) {
        for (const opp of occupants) {
          // Rule II.3 & II.4: In Part II, landing by exact count on an opponent with the Great Jewel
          // steals the Great Jewel (but NOT the Cobra, and no additional Precious Jewel from that opponent).
          if (this.state.part === 2 && this.state.greatJewelOwner === opp.id) {
            this.state.greatJewelOwner = player.id;
            this._log(
              `${player.name} landed on ${opp.name} by exact count and stole the GREAT JEWEL (+5 pts)!`,
              'highlight'
            );
            this._emitEvent('great_jewel_transferred', {
              fromPlayerId: opp.id,
              toPlayerId: player.id,
            });
          } else {
            // Rule I.5: Collect 1 Precious Jewel from the opponent if they have any
            if (opp.jewels > 0) {
              this._transferJewelBetweenPlayers(opp, player);
              this._log(
                `${player.name} landed on ${opp.name} and took 1 Precious Jewel!`,
                'jewel'
              );
            } else {
              this._log(
                `${player.name} landed on ${opp.name}, who had no Precious Jewels to give.`,
                'info'
              );
            }
          }

          // Rule II.2: In Part II, an Explorer WITH the Cobra landing by exact count on an opponent
          // gives that opponent the Cobra and its Evil Spell!
          if (this.state.part === 2 && this.state.cobraOwner === player.id) {
            this.state.cobraOwner = opp.id;
            this._log(
              `${player.name} passed the cursed RUBY COBRA (-5 pts Evil Spell) to ${opp.name}!`,
              'warning'
            );
            this._emitEvent('cobra_transferred', {
              fromPlayerId: player.id,
              toPlayerId: opp.id,
            });
          }
        }
      }
    }

    // 4. Check Part I Great Jewel Space (Rule I.8 & I.9):
    // Landing by exact count on one of the two Level 3 Great Jewel Spaces after all 6 top-level jewels are collected
    if (
      this.state.part === 1 &&
      isExactDiceLanding &&
      space.type === 'great_jewel'
    ) {
      if (this.state.greatJewelUnlocked) {
        this._claimGreatJewelAndStartPart2(player);
        return;
      } else {
        const remainingTop = TOP_LEVEL_JEWEL_IDS.filter((id) => this.state.boardJewels[id]).length;
        this._log(
          `${player.name} landed on the Great Jewel Space, but ${remainingTop} Top-Level Jewel(s) remain on Level 3 before the Great Jewel can be claimed!`,
          'info'
        );
      }
    }

    // 5. Check Mummy's Head Space (Rule I.6):
    // Only trigger when landing by dice roll (prevent infinite loops if a Mummy command moves onto another Mummy's Head)
    if (isExactDiceLanding && space.type === 'mummy_head') {
      this.state.phase = 'PULL_LEVER';
      this._log(
        `${player.name} landed on the Mummy's Head! Pull the Sarcophagus Lever to hear the Voice of the Mummy!`,
        'mummy'
      );
      this._emitEvent('prompt_lever', { playerId: player.id });
      this._emitState();
      return;
    }

    // 6. Otherwise proceed to end-of-turn step check (Rule I.7)
    this._checkEndTurnLevelChange();
  }

  _collectBoardJewel(player, spaceId) {
    if (!this.state.boardJewels[spaceId]) return false;
    const sp = SPACES_BY_ID[spaceId];
    this.state.boardJewels[spaceId] = false;
    player.jewels += 1;
    if (sp.jewelMesh) {
      player.collectedMeshes.push(sp.jewelMesh);
    }
    this._log(
      `${player.name} collected a Precious Jewel from ${sp.label} (Level ${sp.level})!`,
      'jewel'
    );
    this._emitEvent('jewel_collected', {
      playerId: player.id,
      spaceId,
      jewelMesh: sp.jewelMesh,
    });
    this._checkTopLevelJewelsUnlocked();
    return true;
  }

  _takeAnyBoardJewels(player, count) {
    let taken = 0;
    // Prefer taking from player's current level first, then Level 1, Level 2, Level 3
    const availableSpaces = BOARD_SPACES.filter(
      (s) => s.type === 'jewel' && this.state.boardJewels[s.id]
    ).sort((a, b) => {
      const aSame = a.level === player.level ? 0 : 1;
      const bSame = b.level === player.level ? 0 : 1;
      if (aSame !== bSame) return aSame - bSame;
      return a.level - b.level;
    });

    for (let i = 0; i < count; i++) {
      if (i < availableSpaces.length) {
        this._collectBoardJewel(player, availableSpaces[i].id);
        taken++;
      } else {
        // Fallback if all 26 board jewels are already collected: award from the 2 extra sprue jewels
        player.jewels += 1;
        taken++;
      }
    }
    return taken;
  }

  _transferJewelBetweenPlayers(fromPlayer, toPlayer) {
    if (fromPlayer.jewels <= 0) return false;
    fromPlayer.jewels -= 1;
    toPlayer.jewels += 1;
    const meshName = fromPlayer.collectedMeshes.pop();
    if (meshName) {
      toPlayer.collectedMeshes.push(meshName);
    }
    this._emitEvent('jewel_transferred', {
      fromPlayerId: fromPlayer.id,
      toPlayerId: toPlayer.id,
      jewelMesh: meshName || null,
    });
    return true;
  }

  /**
   * Step 3 (when on a Mummy's Head space): Pull the Sarcophagus Reset Lever!
   */
  pullSarcophagusLever(forcedTrackId = null) {
    if (!this.state || this.state.phase !== 'PULL_LEVER') return;
    const player = this.currentPlayer;
    let track;
    if (forcedTrackId) {
      const allTracks = [...SIDE_A_TRACKS, ...SIDE_B_TRACKS];
      track = allTracks.find((t) => t.id === forcedTrackId) || this._drawTrack();
    } else {
      track = this._drawTrack();
    }

    this.state.activeTrack = track;
    this.state.phase = 'MUMMY_SPEAKING';
    this._log(`THE MUMMY SPEAKS: "${track.transcript}"`, 'mummy');
    this._emitEvent('mummy_track_started', {
      playerId: player.id,
      track,
    });
    this._emitState();
  }

  /**
   * Called when the 10-second Mummy audio finishes playing (or user clicks "Obey the Mummy").
   */
  finishMummyAudio() {
    if (!this.state || this.state.phase !== 'MUMMY_SPEAKING') return;
    const player = this.currentPlayer;
    const track = this.state.activeTrack;
    if (!track) {
      this._checkEndTurnLevelChange();
      return;
    }

    const eff = track.effect;
    const opponents = this.state.players.filter((p) => p.id !== player.id);

    switch (eff.action) {
      case 'move_level': {
        this._executeMummyLevelMove(player, eff.delta);
        break;
      }

      case 'take_jewels': {
        const n = this._takeAnyBoardJewels(player, eff.count);
        this._log(`${player.name} obeyed the Mummy and took ${n} Precious Jewel(s)!`, 'jewel');
        if (n >= 2) {
          this._emitEvent('major_announcement', {
            theme: 'emerald',
            icon: '💎',
            title: `${player.name.toUpperCase()} GOT ${n} GEMS!`,
            subtitle: `Blessed by the Voice of the Mummy (+${n})`,
          });
        }
        this.state.activeTrack = null;
        this._checkEndTurnLevelChange();
        break;
      }

      case 'take_jewels_conditional': {
        this._promptChoice({
          type: 'conditional_yes_no',
          condition: eff.condition,
          prompt: eff.promptText,
          options: [
            { id: 'yes', label: `Yes — Take ${eff.count} Jewels!` },
            { id: 'no', label: 'No — Take Nothing' },
          ],
          count: eff.count,
        });
        break;
      }

      case 'take_from_each_opponent': {
        let total = 0;
        for (const opp of opponents) {
          if (this._transferJewelBetweenPlayers(opp, player)) {
            total++;
          }
        }
        this._log(
          total > 0
            ? `${player.name} took 1 Precious Jewel from each opponent (${total} total)!`
            : `${player.name} tried to take a jewel from each opponent, but none had any!`,
          'jewel'
        );
        this.state.activeTrack = null;
        this._checkEndTurnLevelChange();
        break;
      }

      case 'give_to_one_opponent': {
        if (player.jewels <= 0) {
          this._log(
            `Special Rule 1: ${player.name} has no Jewels, so the Mummy cannot make them give one up!`,
            'info'
          );
          this.state.activeTrack = null;
          this._checkEndTurnLevelChange();
        } else if (opponents.length === 1) {
          this._transferJewelBetweenPlayers(player, opponents[0]);
          this._log(`${player.name} gave 1 Precious Jewel to ${opponents[0].name}.`, 'jewel');
          this.state.activeTrack = null;
          this._checkEndTurnLevelChange();
        } else {
          this._promptChoice({
            type: 'choose_opponent_give_jewel',
            prompt: 'Choose an opponent to give 1 Precious Jewel to:',
            options: opponents.map((o) => ({
              id: o.id,
              label: `Give 1 Jewel to ${o.name} (${o.deity})`,
            })),
          });
        }
        break;
      }

      case 'give_to_one_opponent_conditional': {
        if (player.jewels <= 0) {
          this._log(
            `Special Rule 1: ${player.name} has no Jewels, so the Mummy cannot make them give one up!`,
            'info'
          );
          this.state.activeTrack = null;
          this._checkEndTurnLevelChange();
        } else {
          this._promptChoice({
            type: 'tasted_blood_check',
            prompt: eff.promptText,
            options: [
              { id: 'no', label: 'No, I have NOT tasted blood (Give 1 Jewel)' },
              { id: 'yes', label: 'Yes, I have tasted blood (Keep Jewels)' },
            ],
          });
        }
        break;
      }

      case 'take_from_one_opponent': {
        const richOpponents = opponents.filter((o) => o.jewels > 0);
        if (richOpponents.length === 0) {
          this._log('No opponent has any Precious Jewels to take!', 'info');
          this.state.activeTrack = null;
          this._checkEndTurnLevelChange();
        } else if (richOpponents.length === 1) {
          this._transferJewelBetweenPlayers(richOpponents[0], player);
          this._log(
            `${player.name} took 1 Precious Jewel from ${richOpponents[0].name}!`,
            'jewel'
          );
          this.state.activeTrack = null;
          this._checkEndTurnLevelChange();
        } else {
          this._promptChoice({
            type: 'choose_opponent_take_jewel',
            prompt: 'Choose an opponent to take 1 Precious Jewel from:',
            options: richOpponents.map((o) => ({
              id: o.id,
              label: `Take 1 Jewel from ${o.name} (${o.jewels} Jewels)`,
            })),
          });
        }
        break;
      }

      case 'choice_jewel_or_level': {
        const levelOpts = this._getDirectLevelMoveOptions(player);
        const options = [{ id: 'take_jewel', label: 'Take 1 Precious Jewel' }];
        for (const lo of levelOpts) {
          options.push({ id: `level_${lo.delta}`, label: lo.label });
        }
        this._promptChoice({
          type: 'jewel_or_level',
          prompt: 'Obey the Mummy — Choose your action:',
          options,
        });
        break;
      }

      case 'return_to_temple': {
        const fromSpaceId = player.spaceId;
        player.spaceId = player.homeSpaceId;
        player.level = 1;
        this.state.turnChangedLevel = true;
        this._log(
          `${player.name} obeyed the Mummy and returned immediately to their Starting Corner Space (${SPACES_BY_ID[player.homeSpaceId].label})!`,
          'warning'
        );
        this._emitEvent('major_announcement', {
          theme: 'curse',
          icon: '🏺',
          title: `${player.name.toUpperCase()} SENT BACK TO START!`,
          subtitle: `The Mummy banished them back to ${SPACES_BY_ID[player.homeSpaceId].label}!`,
        });
        this._emitEvent('player_moved', {
          playerId: player.id,
          fromSpaceId,
          toSpaceId: player.homeSpaceId,
          path: [player.homeSpaceId],
        });
        this.state.activeTrack = null;
        this._checkEndTurnLevelChange();
        break;
      }

      case 'receive_spell': {
        const prevOwner = this.state.cobraOwner;
        this.state.cobraOwner = player.id;
        this._log(
          prevOwner === player.id
            ? `Rule II.5: ${player.name} already holds the Ruby Cobra Spell and must keep it!`
            : `${player.name} received the Evil Spell and now possesses the cursed RUBY COBRA (-5 pts)!`,
          'warning'
        );
        this._emitEvent('cobra_transferred', {
          fromPlayerId: prevOwner,
          toPlayerId: player.id,
        });
        this.state.activeTrack = null;
        this._checkEndTurnLevelChange();
        break;
      }

      case 'choice_give_spell_or_level': {
        this._promptGiveSpellOrLevelChoice(player, opponents);
        break;
      }

      case 'choice_give_spell_or_level_conditional': {
        this._promptChoice({
          type: 'handedness_check',
          condition: eff.condition,
          prompt: eff.promptText,
          options: [
            { id: 'yes', label: 'Yes — Give the Spell or Change a Level!' },
            { id: 'no', label: 'No — Command Does Not Apply' },
          ],
        });
        break;
      }

      case 'take_from_opponents_on_level': {
        const sameLvlOpps = opponents.filter((o) => o.level === player.level && o.jewels > 0);
        let count = 0;
        for (const opp of sameLvlOpps) {
          if (this._transferJewelBetweenPlayers(opp, player)) count++;
        }
        this._log(
          count > 0
            ? `${player.name} took 1 Precious Jewel from each opponent on Level ${player.level} (${count} total)!`
            : `No opponents with Jewels were on Level ${player.level}.`,
          'jewel'
        );
        this.state.activeTrack = null;
        this._checkEndTurnLevelChange();
        break;
      }

      case 'give_to_opponents_on_level': {
        const sameLvlOpps = opponents.filter((o) => o.level === player.level);
        let count = 0;
        for (const opp of sameLvlOpps) {
          if (player.jewels > 0 && this._transferJewelBetweenPlayers(player, opp)) {
            count++;
          }
        }
        this._log(
          count > 0
            ? `${player.name} gave 1 Precious Jewel to ${count} opponent(s) on Level ${player.level}.`
            : `${player.name} gave no Jewels (either no Jewels held or no opponents on Level ${player.level}).`,
          'info'
        );
        this.state.activeTrack = null;
        this._checkEndTurnLevelChange();
        break;
      }

      case 'choice_extra_turn_or_level': {
        const levelOpts = this._getDirectLevelMoveOptions(player);
        const options = [{ id: 'extra_turn', label: 'Take Another Turn!' }];
        for (const lo of levelOpts) {
          options.push({ id: `level_${lo.delta}`, label: lo.label });
        }
        this._promptChoice({
          type: 'extra_turn_or_level',
          prompt: 'Obey the Mummy — Take another turn, or change a level:',
          options,
        });
        break;
      }

      default:
        this.state.activeTrack = null;
        this._checkEndTurnLevelChange();
        break;
    }
  }

  _getDirectLevelMoveOptions(player) {
    const sp = SPACES_BY_ID[player.spaceId];
    const opts = [];
    if (sp.directUpSpaceId && player.level < 3) {
      opts.push({
        delta: 1,
        targetId: sp.directUpSpaceId,
        label: `Move UP to Level ${player.level + 1}`,
      });
    }
    if (sp.directDownSpaceId && player.level > 1) {
      opts.push({
        delta: -1,
        targetId: sp.directDownSpaceId,
        label: `Move DOWN to Level ${player.level - 1}`,
      });
    }
    return opts;
  }

  _promptGiveSpellOrLevelChoice(player, opponents) {
    const options = [];
    if (this.state.cobraOwner === player.id) {
      for (const opp of opponents) {
        options.push({
          id: `give_spell_${opp.id}`,
          label: `Give the Cobra Spell to ${opp.name} (${opp.deity})`,
        });
      }
    }
    const levelOpts = this._getDirectLevelMoveOptions(player);
    for (const lo of levelOpts) {
      options.push({ id: `level_${lo.delta}`, label: lo.label });
    }
    if (options.length === 0) {
      this._log(`${player.name} does not hold the Spell and cannot change levels here.`, 'info');
      this.state.activeTrack = null;
      this._checkEndTurnLevelChange();
      return;
    }
    this._promptChoice({
      type: 'give_spell_or_level',
      prompt: 'Obey the Mummy — Get rid of the Cobra Spell or change a level:',
      options,
    });
  }

  _promptChoice(choiceObj) {
    this.state.pendingChoice = choiceObj;
    this.state.phase = 'MUMMY_CHOICE';
    this._emitState();
  }

  /**
   * Resolves a player's choice from a Mummy command modal.
   */
  resolveMummyChoice(optionId) {
    if (!this.state || this.state.phase !== 'MUMMY_CHOICE' || !this.state.pendingChoice) return;
    const player = this.currentPlayer;
    const choice = this.state.pendingChoice;
    const opponents = this.state.players.filter((p) => p.id !== player.id);

    this.state.pendingChoice = null;

    if (choice.type === 'conditional_yes_no') {
      const condLabel =
        choice.condition === 'even_age'
          ? 'Even Number'
          : choice.condition === 'odd_age'
          ? 'Odd Number'
          : 'matching trait';
      if (optionId === 'yes') {
        const n = this._takeAnyBoardJewels(player, choice.count || 3);
        this._log(`${player.name} (${condLabel}) answered YES and took ${n} Precious Jewels!`, 'jewel');
        this._emitEvent('major_announcement', {
          theme: 'emerald',
          icon: '💎',
          title: `${player.name.toUpperCase()} GOT ${n} GEMS!`,
          subtitle: `${condLabel} Match — Obeyed the Voice of the Mummy (+${n})`,
        });
      } else {
        this._log(
          `${player.name} is NOT ${condLabel} — answered NO and takes 0 Jewels.`,
          'info'
        );
      }
      this.state.activeTrack = null;
      this._checkEndTurnLevelChange();
      return;
    }

    if (choice.type === 'tasted_blood_check') {
      if (optionId === 'no') {
        if (opponents.length === 1) {
          this._transferJewelBetweenPlayers(player, opponents[0]);
          this._log(`${player.name} gave 1 Precious Jewel to ${opponents[0].name}.`, 'jewel');
          this.state.activeTrack = null;
          this._checkEndTurnLevelChange();
        } else {
          this._promptChoice({
            type: 'choose_opponent_give_jewel',
            prompt: 'Choose an opponent to give 1 Precious Jewel to:',
            options: opponents.map((o) => ({
              id: o.id,
              label: `Give 1 Jewel to ${o.name} (${o.deity})`,
            })),
          });
        }
      } else {
        this._log(`${player.name} has tasted blood and keeps their Jewels!`, 'info');
        this.state.activeTrack = null;
        this._checkEndTurnLevelChange();
      }
      return;
    }

    if (choice.type === 'handedness_check') {
      const handLabel =
        choice.condition === 'right_handed'
          ? 'Right-Handed'
          : choice.condition === 'left_handed'
          ? 'Left-Handed'
          : 'matching handedness';
      if (optionId === 'yes') {
        this._log(`${player.name} is ${handLabel} — command applies!`, 'info');
        this._promptGiveSpellOrLevelChoice(player, opponents);
      } else {
        this._log(
          `${player.name} is NOT ${handLabel} — unaffected by the Mummy's handedness command.`,
          'info'
        );
        this.state.activeTrack = null;
        this._checkEndTurnLevelChange();
      }
      return;
    }

    if (choice.type === 'choose_opponent_give_jewel') {
      const opp = opponents.find((o) => o.id === optionId) || opponents[0];
      if (opp && this._transferJewelBetweenPlayers(player, opp)) {
        this._log(`${player.name} gave 1 Precious Jewel to ${opp.name}.`, 'jewel');
      }
      this.state.activeTrack = null;
      this._checkEndTurnLevelChange();
      return;
    }

    if (choice.type === 'choose_opponent_take_jewel') {
      const opp = opponents.find((o) => o.id === optionId) || opponents[0];
      if (opp && this._transferJewelBetweenPlayers(opp, player)) {
        this._log(`${player.name} took 1 Precious Jewel from ${opp.name}!`, 'jewel');
      }
      this.state.activeTrack = null;
      this._checkEndTurnLevelChange();
      return;
    }

    if (
      choice.type === 'jewel_or_level' ||
      choice.type === 'give_spell_or_level' ||
      choice.type === 'extra_turn_or_level'
    ) {
      if (optionId === 'take_jewel') {
        this._takeAnyBoardJewels(player, 1);
        this._log(`${player.name} chose to take 1 Precious Jewel!`, 'jewel');
        this.state.activeTrack = null;
        this._checkEndTurnLevelChange();
        return;
      }
      if (optionId === 'extra_turn') {
        this.state.extraTurnGranted = true;
        this._log(`${player.name} chose to take ANOTHER TURN!`, 'highlight');
        this.state.activeTrack = null;
        this._checkEndTurnLevelChange();
        return;
      }
      if (optionId.startsWith('give_spell_')) {
        const oppId = optionId.replace('give_spell_', '');
        const opp = opponents.find((o) => o.id === oppId) || opponents[0];
        if (opp) {
          this.state.cobraOwner = opp.id;
          this._log(
            `${player.name} obeyed the Mummy and passed the cursed RUBY COBRA (-5 pts) to ${opp.name}!`,
            'warning'
          );
          this._emitEvent('cobra_transferred', {
            fromPlayerId: player.id,
            toPlayerId: opp.id,
          });
        }
        this.state.activeTrack = null;
        this._checkEndTurnLevelChange();
        return;
      }
      if (optionId === 'level_1') {
        this._executeMummyLevelMove(player, 1);
        return;
      }
      if (optionId === 'level_-1') {
        this._executeMummyLevelMove(player, -1);
        return;
      }
    }

    this.state.activeTrack = null;
    this._checkEndTurnLevelChange();
  }

  _executeMummyLevelMove(player, delta) {
    const sp = SPACES_BY_ID[player.spaceId];
    if (delta > 0 && player.level >= 3) {
      // Special Rule 3: If an Explorer is on the top level, the Mummy cannot make him go up a level.
      this._log(
        `Special Rule 3: ${player.name} is already on the Top Level (Level 3) and cannot be moved up a level.`,
        'info'
      );
      this.state.activeTrack = null;
      this._checkEndTurnLevelChange();
      return;
    }
    if (delta < 0 && player.level <= 1) {
      // Special Rule 2: If an Explorer is on the bottom level, the Mummy cannot make him go down a level.
      this._log(
        `Special Rule 2: ${player.name} is already on the Bottom Level (Level 1) and cannot be moved down a level.`,
        'info'
      );
      this.state.activeTrack = null;
      this._checkEndTurnLevelChange();
      return;
    }

    const targetId = delta > 0 ? sp.directUpSpaceId : sp.directDownSpaceId;
    if (targetId && SPACES_BY_ID[targetId]) {
      const fromSpaceId = player.spaceId;
      const targetSp = SPACES_BY_ID[targetId];
      player.spaceId = targetSp.id;
      player.level = targetSp.level;
      this.state.turnChangedLevel = true;

      this._log(
        `${player.name} obeyed the Mummy and moved ${delta > 0 ? 'UP' : 'DOWN'} to Level ${targetSp.level} (${targetSp.label})!`,
        'mummy'
      );
      this._emitEvent('player_moved', {
        playerId: player.id,
        fromSpaceId,
        toSpaceId: targetSp.id,
        path: [targetSp.id],
      });

      // Special Rule 4: He may collect a Jewel on the new space if it is a Jewel space and one is available there.
      if (targetSp.type === 'jewel' && this.state.boardJewels[targetSp.id]) {
        this._collectBoardJewel(player, targetSp.id);
      }
    }

    this.state.activeTrack = null;
    this._checkEndTurnLevelChange();
  }

  /**
   * Rule 7: If an Explorer ends his turn on a corner space, or any of the spaces with protruding steps,
   * he may move up or down these steps to change his level on which to travel next turn.
   */
  _checkEndTurnLevelChange() {
    const player = this.currentPlayer;
    const sp = SPACES_BY_ID[player.spaceId];

    if (
      !this.state.turnChangedLevel &&
      (sp.upSpaceId || sp.downSpaceId)
    ) {
      this.state.levelStepOptions = {
        upSpaceId: sp.upSpaceId,
        downSpaceId: sp.downSpaceId,
      };
      this.state.phase = 'CHOOSE_LEVEL_STEP';
      this._emitState();
      return;
    }

    this.endTurn();
  }

  /**
   * Resolves the end-of-turn choice to climb UP/DOWN steps or stay on the current level.
   */
  chooseEndTurnLevelStep(targetSpaceId = null) {
    if (!this.state || this.state.phase !== 'CHOOSE_LEVEL_STEP') return;
    const player = this.currentPlayer;

    if (targetSpaceId && SPACES_BY_ID[targetSpaceId]) {
      const fromSpaceId = player.spaceId;
      const targetSp = SPACES_BY_ID[targetSpaceId];
      player.spaceId = targetSp.id;
      player.level = targetSp.level;
      this.state.turnChangedLevel = true;
      this._log(
        `${player.name} climbed the steps to Level ${targetSp.level} (${targetSp.label}) for their next turn!`,
        'info'
      );
      this._emitEvent('player_moved', {
        playerId: player.id,
        fromSpaceId,
        toSpaceId: targetSp.id,
        path: [targetSp.id],
      });
    }

    this.state.levelStepOptions = null;
    this.endTurn();
  }

  /**
   * Rule 8 & 9: Claims the Great Jewel and the cursed Ruby Cobra, ending Part I and starting Part II (Side B)!
   */
  _claimGreatJewelAndStartPart2(player) {
    this.state.greatJewelOwner = player.id;
    this.state.cobraOwner = player.id;
    this.state.part = 2;
    this.state.recordSide = 'SideB';
    this.state.activeTrack = null;
    this.state.pendingChoice = null;
    this.state.levelStepOptions = null;

    this._log(
      `PART I COMPLETE! ${player.name} landed by exact count on the Great Jewel Space and claimed the GREAT MUMMY JEWEL (+5 pts) — along with the cursed RUBY COBRA (-5 pts Evil Spell)!`,
      'highlight'
    );
    this._log(
      `PART II BEGINS! The Sarcophagus record is flipped to Side #2 (Side B). Explorers may now move CLOCKWISE or COUNTER-CLOCKWISE to pass the Cobra, steal the Great Jewel, or race back to their Home Temple Corner by exact count!`,
      'system'
    );

    this._emitEvent('part2_started', {
      playerId: player.id,
    });

    this.endTurn();
  }

  /**
   * Advances to the next player's turn (or grants an extra turn if earned).
   */
  endTurn() {
    if (!this.state || this.state.phase === 'GAME_OVER') return;
    this.state.activeTrack = null;
    this.state.pendingChoice = null;
    this.state.levelStepOptions = null;
    this.state.moveOptions = null;

    if (this.state.extraTurnGranted) {
      this.state.extraTurnGranted = false;
      this.state.phase = 'ROLL_DIE';
      this._log(`${this.currentPlayer.name} takes their EXTRA TURN!`, 'highlight');
      this._emitState();
      return;
    }

    this.state.turnIndex = (this.state.turnIndex + 1) % this.state.players.length;
    if (this.state.turnIndex === 0) {
      this.state.turnNumber += 1;
    }
    this.state.phase = 'ROLL_DIE';
    this._emitState();
  }

  /**
   * Rule II.6, II.7, II.8, II.9: Final Homecoming Bonus and Score Calculation!
   */
  _triggerGameOver(finishingPlayer) {
    this._log(
      `${finishingPlayer.name} returned to their Home Temple (${SPACES_BY_ID[finishingPlayer.homeSpaceId].label}) by exact count without the Cobra and ENDED THE GAME!`,
      'highlight'
    );

    // Rule II.7: Homecoming Bonus — Receives 1 Jewel from each opponent Explorer.
    // If an opponent Explorer has ONLY the Great Jewel, he must give it as a bonus to the Explorer ending the game!
    for (const opp of this.state.players) {
      if (opp.id === finishingPlayer.id) continue;
      if (opp.jewels > 0) {
        this._transferJewelBetweenPlayers(opp, finishingPlayer);
        this._log(
          `Homecoming Bonus (Rule II.7): ${finishingPlayer.name} received 1 bonus Precious Jewel from ${opp.name}!`,
          'jewel'
        );
      } else if (this.state.greatJewelOwner === opp.id) {
        this.state.greatJewelOwner = finishingPlayer.id;
        this._log(
          `Homecoming Bonus (Rule II.7): ${opp.name} had only the Great Jewel and had to give the GREAT JEWEL (+5 pts) to ${finishingPlayer.name}!`,
          'highlight'
        );
      }
    }

    // Rule II.8 & II.9: Compute final scores (1 pt per Precious Jewel, +5 pts Great Jewel, -5 pts Cobra)
    const scores = this.state.players.map((p) => {
      const preciousPts = p.jewels * 1;
      const greatJewelPts = this.state.greatJewelOwner === p.id ? 5 : 0;
      const cobraPenalty = this.state.cobraOwner === p.id ? -5 : 0;
      const total = preciousPts + greatJewelPts + cobraPenalty;
      return {
        playerId: p.id,
        name: p.name,
        deity: p.deity,
        colorHex: p.colorHex,
        preciousJewels: p.jewels,
        hasGreatJewel: this.state.greatJewelOwner === p.id,
        hasCobra: this.state.cobraOwner === p.id,
        totalScore: total,
        finishedFirst: p.id === finishingPlayer.id,
      };
    });

    scores.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return (b.finishedFirst ? 1 : 0) - (a.finishedFirst ? 1 : 0);
    });

    this.state.finalScores = scores;
    this.state.winnerId = scores[0].playerId;
    this.state.phase = 'GAME_OVER';

    this._log(
      `VICTORY! ${scores[0].name} (${scores[0].deity}) wins Voice of the Mummy with ${scores[0].totalScore} Points!`,
      'highlight'
    );
    this._emitEvent('game_over', {
      winnerId: this.state.winnerId,
      scores,
    });
    this._emitState();
  }

  /**
   * Computes live score for a player at any moment.
   */
  getPlayerScore(playerId) {
    if (!this.state) return 0;
    const p = this.state.players.find((x) => x.id === playerId);
    if (!p) return 0;
    return (
      p.jewels +
      (this.state.greatJewelOwner === p.id ? 5 : 0) +
      (this.state.cobraOwner === p.id ? -5 : 0)
    );
  }

  /**
   * AI Bot Decision Maker for automated Explorer turns.
   */
  computeBotAction() {
    if (!this.state || this.state.phase === 'GAME_OVER') return null;
    const player = this.currentPlayer;
    if (!player || player.control !== 'ai') return null;

    switch (this.state.phase) {
      case 'ROLL_DIE':
        return { action: 'roll' };

      case 'CHOOSE_DIRECTION': {
        if (this.state.part === 1 || !this.state.moveOptions?.ccw) {
          return { action: 'move', dir: 'cw' };
        }
        // In Part II, evaluate 'cw' vs 'ccw'
        const cwScore = this._scoreBotTarget(player, this.state.moveOptions.cw.targetId);
        const ccwScore = this._scoreBotTarget(player, this.state.moveOptions.ccw.targetId);
        return { action: 'move', dir: ccwScore > cwScore ? 'ccw' : 'cw' };
      }

      case 'PULL_LEVER':
        return { action: 'pull_lever' };

      case 'MUMMY_CHOICE': {
        const choice = this.state.pendingChoice;
        const opts = choice?.options || [];
        if (opts.length === 0) return null;

        // Honest trait checks for AI Bots based on their pre-game Handedness & Birthday/Age Even/Odd settings!
        if (choice.type === 'conditional_yes_no') {
          if (choice.condition === 'even_age') {
            return { action: 'choice', optionId: player.ageEven ? 'yes' : 'no' };
          }
          if (choice.condition === 'odd_age') {
            return { action: 'choice', optionId: !player.ageEven ? 'yes' : 'no' };
          }
        }
        if (choice.type === 'handedness_check') {
          if (choice.condition === 'right_handed') {
            return { action: 'choice', optionId: player.rightHanded ? 'yes' : 'no' };
          }
          if (choice.condition === 'left_handed') {
            return { action: 'choice', optionId: !player.rightHanded ? 'yes' : 'no' };
          }
        }
        if (choice.type === 'tasted_blood_check') {
          return { action: 'choice', optionId: player.tastedBlood ? 'yes' : 'no' };
        }

        // Prefer giving spell, taking extra turn, or taking jewels
        const giveSpell = opts.find((o) => o.id.startsWith('give_spell_'));
        if (giveSpell) return { action: 'choice', optionId: giveSpell.id };
        const extraTurn = opts.find((o) => o.id === 'extra_turn');
        if (extraTurn) return { action: 'choice', optionId: extraTurn.id };
        const takeJewel = opts.find((o) => o.id === 'take_jewel' || o.id === 'yes');
        if (takeJewel) return { action: 'choice', optionId: takeJewel.id };
        return { action: 'choice', optionId: opts[0].id };
      }

      case 'CHOOSE_LEVEL_STEP': {
        const opts = this.state.levelStepOptions;
        if (!opts) return { action: 'step', targetSpaceId: null };
        if (this.state.part === 1) {
          // In Part I, bots want to climb UP toward Level 3 to collect the 6 top-level jewels and Great Jewel!
          if (opts.upSpaceId && player.level < 3) {
            return { action: 'step', targetSpaceId: opts.upSpaceId };
          }
          return { action: 'step', targetSpaceId: null };
        } else {
          // In Part II, bots without the Cobra want to climb DOWN to Level 1 to reach their Home Temple!
          if (this.state.cobraOwner !== player.id && opts.downSpaceId && player.level > 1) {
            return { action: 'step', targetSpaceId: opts.downSpaceId };
          }
          return { action: 'step', targetSpaceId: null };
        }
      }

      default:
        return null;
    }
  }

  _scoreBotTarget(player, targetSpaceId) {
    const sp = SPACES_BY_ID[targetSpaceId];
    let score = 0;
    const hasCobra = this.state.cobraOwner === player.id;

    if (!hasCobra && targetSpaceId === player.homeSpaceId) {
      return 1000; // Instant win!
    }
    const occupants = this.state.players.filter(
      (p) => p.id !== player.id && p.spaceId === targetSpaceId
    );
    if (hasCobra && occupants.length > 0) {
      score += 500; // Pass the Cobra!
    }
    if (occupants.some((o) => this.state.greatJewelOwner === o.id)) {
      score += 400; // Steal the Great Jewel!
    }
    if (this.state.boardJewels[targetSpaceId]) {
      score += 60;
    }
    if (!hasCobra && player.level > 1 && sp.downSpaceId) {
      score += 80; // Head down toward Level 1
    }
    if (!hasCobra && player.level === 1) {
      // Prefer moving closer to homeSpaceId along Level 1
      const homeSp = SPACES_BY_ID[player.homeSpaceId];
      const dist = Math.min(
        Math.abs(sp.indexOnLevel - homeSp.indexOnLevel),
        30 - Math.abs(sp.indexOnLevel - homeSp.indexOnLevel)
      );
      score += 40 - dist;
    }
    return score;
  }
}
