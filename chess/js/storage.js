/**
 * Persistent Player Memory, Sign-In Profiles, Elo Rating System,
 * Character Traits (Gender, Age, Hair, Skin), Daily Streak, Victory Chests & Shop
 */

import {
  DEFAULT_CHARACTER,
  DEFAULT_EQUIPPED,
  STARTER_UNLOCKED,
  getShopItemById
} from './avatar-shop.js';

const PROFILES_KEY = 'arcane_chess_profiles_v1';
const ACTIVE_PROFILE_KEY = 'arcane_chess_active_profile_v1';
const PREFS_KEY = 'arcane_chess_prefs_v1';

export function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getRankTitleForElo(elo) {
  if (elo < 800) return { title: 'Novice Apprentice', badgeColor: '#38bdf8' };
  if (elo < 1100) return { title: 'Vanguard Squire', badgeColor: '#f97316' };
  if (elo < 1400) return { title: 'Sanctuary Tactician', badgeColor: '#10b981' };
  if (elo < 1700) return { title: 'Shadow Court Duelist', badgeColor: '#a855f7' };
  if (elo < 2000) return { title: 'High Archmage', badgeColor: '#f59e0b' };
  return { title: 'Astral Grandmaster', badgeColor: '#ec4899' };
}

export function calculateEloChange(playerElo, opponentElo, score, gamesPlayed = 0) {
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  let kFactor = 24;
  if (gamesPlayed < 8) {
    kFactor = 40;
  } else if (playerElo >= 2000) {
    kFactor = 16;
  }
  const delta = Math.round(kFactor * (score - expected));
  const newElo = Math.max(400, playerElo + delta);
  return {
    oldElo: playerElo,
    newElo,
    delta: newElo - playerElo,
    expectedWinPct: Math.round(expected * 100),
    kFactor
  };
}

function createDefaultProfile(
  username = 'Traveler',
  startingElo = 1200,
  character = DEFAULT_CHARACTER
) {
  const cleanName = (username || 'Traveler').trim().slice(0, 24) || 'Traveler';
  const now = new Date().toISOString();
  const today = getLocalDateString();
  return {
    id: cleanName.toLowerCase(),
    username: cleanName,
    hasSignedIn: cleanName.toLowerCase() !== 'traveler',
    elo: startingElo,
    peakElo: startingElo,
    wins: 0,
    losses: 0,
    draws: 0,
    streak: 0,
    bestStreak: 0,
    coins: 120, // Starter coins so players can immediately buy an item or save up
    dailyStreak: 1,
    bestDailyStreak: 1,
    lastPlayedDate: today,
    chestsOpened: 0,
    character: { ...DEFAULT_CHARACTER, ...(character || {}) },
    equipped: { ...DEFAULT_EQUIPPED },
    unlockedItems: [...STARTER_UNLOCKED],
    createdAt: now,
    updatedAt: now,
    eloHistory: [
      {
        date: now,
        elo: startingElo,
        delta: 0,
        label: 'Initial Rating'
      }
    ],
    botStats: {},
    peerStats: {}, // Head-to-head score vs human opponents by username
    matchHistory: []
  };
}

function ensureProfileFields(profile) {
  if (!profile) return profile;
  if (typeof profile.coins !== 'number') profile.coins = 120;
  if (typeof profile.dailyStreak !== 'number' || profile.dailyStreak < 1) {
    profile.dailyStreak = 1;
  }
  if (typeof profile.bestDailyStreak !== 'number') {
    profile.bestDailyStreak = profile.dailyStreak;
  }
  if (!profile.lastPlayedDate) {
    profile.lastPlayedDate = getLocalDateString();
  }
  if (typeof profile.chestsOpened !== 'number') {
    profile.chestsOpened = 0;
  }
  if (!profile.character || typeof profile.character !== 'object') {
    profile.character = { ...DEFAULT_CHARACTER };
  } else {
    profile.character = { ...DEFAULT_CHARACTER, ...profile.character };
  }
  if (!profile.equipped || typeof profile.equipped !== 'object') {
    profile.equipped = { ...DEFAULT_EQUIPPED };
  } else {
    profile.equipped = { ...DEFAULT_EQUIPPED, ...profile.equipped };
  }
  if (!Array.isArray(profile.unlockedItems)) {
    profile.unlockedItems = [...STARTER_UNLOCKED];
  } else {
    for (const st of STARTER_UNLOCKED) {
      if (!profile.unlockedItems.includes(st)) {
        profile.unlockedItems.push(st);
      }
    }
  }
  if (!profile.peerStats || typeof profile.peerStats !== 'object') {
    profile.peerStats = {};
  }
  return profile;
}

export class StorageManager {
  constructor() {
    this.profiles = this._loadProfiles();
    for (const k of Object.keys(this.profiles)) {
      this.profiles[k] = ensureProfileFields(this.profiles[k]);
    }

    this.activeId = localStorage.getItem(ACTIVE_PROFILE_KEY) || '';
    if (!this.activeId || !this.profiles[this.activeId]) {
      const existingIds = Object.keys(this.profiles);
      if (existingIds.length > 0) {
        this.activeId = existingIds[0];
      } else {
        const def = createDefaultProfile('Traveler', 1200);
        this.profiles[def.id] = def;
        this.activeId = def.id;
      }
      localStorage.setItem(ACTIVE_PROFILE_KEY, this.activeId);
    }
    this._saveProfiles();
    this.prefs = this._loadPrefs();
  }

  _loadProfiles() {
    try {
      const raw = localStorage.getItem(PROFILES_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  _saveProfiles() {
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(this.profiles));
    } catch (e) {
      console.warn('Could not save profiles to localStorage:', e);
    }
  }

  _loadPrefs() {
    const defaults = {
      viewMode: '3d',
      boardTheme2D: 'classic',
      lightingTheme3D: 'great-hall',
      soundEnabled: true,
      autoRotateCam: false,
      battleCam: true, // Zoom-in animated fight on 3D capture
      selectedBotId: 'celeste',
      timeControlMinutes: 10
    };
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return defaults;
      return { ...defaults, ...JSON.parse(raw) };
    } catch {
      return defaults;
    }
  }

  savePrefs(partial) {
    this.prefs = { ...this.prefs, ...partial };
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs));
    } catch (e) {
      console.warn('Could not save preferences:', e);
    }
    return this.prefs;
  }

  getActiveProfile() {
    return ensureProfileFields(this.profiles[this.activeId]);
  }

  getAllProfiles() {
    return Object.values(this.profiles)
      .map(p => ensureProfileFields(p))
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }

  /**
   * Signs in to an existing username profile or creates a new one,
   * saving character appearance (gender, age, hair, skin, eyes, beard).
   */
  signIn(username, startingElo = 1200, characterTraits = null) {
    const cleanName = (username || '').trim().slice(0, 24);
    if (!cleanName) return this.getActiveProfile();

    const key = cleanName.toLowerCase();
    if (!this.profiles[key]) {
      this.profiles[key] = createDefaultProfile(
        cleanName,
        Number(startingElo) || 1200,
        characterTraits || DEFAULT_CHARACTER
      );
      this.profiles[key].hasSignedIn = true;
    } else {
      this.profiles[key] = ensureProfileFields(this.profiles[key]);
      this.profiles[key].username = cleanName;
      this.profiles[key].hasSignedIn = true;
      if (characterTraits) {
        this.profiles[key].character = {
          ...this.profiles[key].character,
          ...characterTraits
        };
      }
      this.profiles[key].updatedAt = new Date().toISOString();
    }

    this.activeId = key;
    localStorage.setItem(ACTIVE_PROFILE_KEY, key);
    this._saveProfiles();
    return this.profiles[key];
  }

  updateCharacterTraits(partialTraits) {
    const profile = this.getActiveProfile();
    profile.character = { ...profile.character, ...partialTraits };
    profile.updatedAt = new Date().toISOString();
    this._saveProfiles();
    return profile;
  }

  _updateDailyPlayStreak(profile) {
    const todayStr = getLocalDateString();
    if (profile.lastPlayedDate === todayStr) {
      return { streakIncremented: false, dailyStreak: profile.dailyStreak };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    if (profile.lastPlayedDate === yesterdayStr) {
      profile.dailyStreak = (profile.dailyStreak || 1) + 1;
    } else {
      profile.dailyStreak = 1;
    }

    if (profile.dailyStreak > (profile.bestDailyStreak || 1)) {
      profile.bestDailyStreak = profile.dailyStreak;
    }
    profile.lastPlayedDate = todayStr;
    return { streakIncremented: true, dailyStreak: profile.dailyStreak };
  }

  recordMatchResult({
    mode,
    botId = null,
    opponentName,
    opponentElo,
    playerColor,
    winner,
    reason,
    movesCount,
    pgn
  }) {
    const profile = this.getActiveProfile();
    const totalGamesBefore = profile.wins + profile.losses + profile.draws;
    const streakInfo = this._updateDailyPlayStreak(profile);

    let score = 0.5;
    let outcomeLabel = 'draw';
    if (winner === 'draw') {
      score = 0.5;
      outcomeLabel = 'draw';
      profile.draws++;
      profile.streak = 0;
    } else if (winner === playerColor) {
      score = 1.0;
      outcomeLabel = 'win';
      profile.wins++;
      profile.streak = profile.streak > 0 ? profile.streak + 1 : 1;
      if (profile.streak > profile.bestStreak) {
        profile.bestStreak = profile.streak;
      }
    } else {
      score = 0.0;
      outcomeLabel = 'loss';
      profile.losses++;
      profile.streak = profile.streak < 0 ? profile.streak - 1 : -1;
    }

    const eloCalc = calculateEloChange(
      profile.elo,
      opponentElo,
      score,
      totalGamesBefore
    );

    profile.elo = eloCalc.newElo;
    if (profile.elo > profile.peakElo) {
      profile.peakElo = profile.elo;
    }

    // Participation coins on draw/loss so daily play always progresses toward outfits
    let participationCoins = 0;
    if (outcomeLabel !== 'win') {
      participationCoins = outcomeLabel === 'draw' ? 25 : 15;
      if (streakInfo.streakIncremented) participationCoins += 20;
      profile.coins += participationCoins;
    }

    const now = new Date().toISOString();
    profile.updatedAt = now;

    profile.eloHistory.push({
      date: now,
      elo: eloCalc.newElo,
      delta: eloCalc.delta,
      opponentName,
      opponentElo,
      outcome: outcomeLabel
    });
    if (profile.eloHistory.length > 60) {
      profile.eloHistory = profile.eloHistory.slice(-60);
    }

    if (mode === 'bot' && botId) {
      if (!profile.botStats[botId]) {
        profile.botStats[botId] = { wins: 0, losses: 0, draws: 0 };
      }
      if (outcomeLabel === 'win') profile.botStats[botId].wins++;
      else if (outcomeLabel === 'loss') profile.botStats[botId].losses++;
      else profile.botStats[botId].draws++;
    } else if (mode === 'multiplayer' && opponentName) {
      const peerKey = opponentName.toLowerCase();
      if (!profile.peerStats[peerKey]) {
        profile.peerStats[peerKey] = { name: opponentName, wins: 0, losses: 0, draws: 0 };
      }
      if (outcomeLabel === 'win') profile.peerStats[peerKey].wins++;
      else if (outcomeLabel === 'loss') profile.peerStats[peerKey].losses++;
      else profile.peerStats[peerKey].draws++;
    }

    const matchEntry = {
      id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      date: now,
      mode,
      botId,
      opponentName,
      opponentElo,
      playerColor,
      outcome: outcomeLabel,
      reason,
      eloBefore: eloCalc.oldElo,
      eloAfter: eloCalc.newElo,
      delta: eloCalc.delta,
      expectedWinPct: eloCalc.expectedWinPct,
      movesCount,
      pgn
    };

    profile.matchHistory.unshift(matchEntry);
    if (profile.matchHistory.length > 50) {
      profile.matchHistory = profile.matchHistory.slice(0, 50);
    }

    // Pop out shop milestone after wins or streak increases
    const isShopMilestone =
      outcomeLabel === 'win' || streakInfo.streakIncremented;

    this._saveProfiles();
    return {
      profile,
      matchEntry,
      eloCalc,
      earnedChest: outcomeLabel === 'win',
      participationCoins,
      isShopMilestone,
      streakInfo
    };
  }

  claimVictoryChestReward(opponentElo = 1200) {
    const profile = this.getActiveProfile();
    const baseCoins = 55 + Math.floor(Math.random() * 31); // 55..85
    const eloBonus = Math.max(0, Math.round((opponentElo - 600) / 25));
    const streakBonus = Math.min(60, (profile.dailyStreak || 1) * 12);
    const totalCoins = baseCoins + eloBonus + streakBonus;

    profile.coins += totalCoins;
    profile.chestsOpened = (profile.chestsOpened || 0) + 1;
    this._saveProfiles();

    return {
      totalCoins,
      baseCoins,
      eloBonus,
      streakBonus,
      newBalance: profile.coins,
      chestsOpened: profile.chestsOpened
    };
  }

  buyShopItem(itemId) {
    const profile = this.getActiveProfile();
    const item = getShopItemById(itemId);
    if (!item) {
      return { ok: false, message: 'Item not found.' };
    }
    if (profile.unlockedItems.includes(itemId)) {
      this.equipShopItem(itemId);
      return { ok: true, message: `Equipped ${item.name}!`, profile };
    }
    if (profile.coins < item.price) {
      return {
        ok: false,
        message: `Need ${item.price - profile.coins} more coins! Win games & open Victory Chests to earn coins.`
      };
    }

    profile.coins -= item.price;
    profile.unlockedItems.push(itemId);
    profile.equipped[item.slot] = itemId;
    profile.updatedAt = new Date().toISOString();
    this._saveProfiles();

    return {
      ok: true,
      message: `Unlocked & equipped ${item.name}!`,
      profile,
      item
    };
  }

  equipShopItem(itemId) {
    const profile = this.getActiveProfile();
    const item = getShopItemById(itemId);
    if (!item || !profile.unlockedItems.includes(itemId)) {
      return { ok: false };
    }
    profile.equipped[item.slot] = itemId;
    profile.updatedAt = new Date().toISOString();
    this._saveProfiles();
    return { ok: true, profile, item };
  }

  resetActiveProfileStats(newStartingElo = 1200) {
    const cur = this.getActiveProfile();
    const fresh = createDefaultProfile(cur.username, newStartingElo, cur.character);
    fresh.coins = cur.coins;
    fresh.equipped = { ...cur.equipped };
    fresh.unlockedItems = [...cur.unlockedItems];
    this.profiles[this.activeId] = fresh;
    this._saveProfiles();
    return fresh;
  }

  exportProfileJson() {
    const profile = this.getActiveProfile();
    return JSON.stringify(profile, null, 2);
  }

  importProfileJson(jsonStr) {
    const data = JSON.parse(jsonStr);
    if (!data || !data.username || typeof data.elo !== 'number') {
      throw new Error('Invalid profile JSON format.');
    }
    const key = data.username.trim().toLowerCase();
    data.id = key;
    this.profiles[key] = ensureProfileFields(data);
    this.activeId = key;
    localStorage.setItem(ACTIVE_PROFILE_KEY, key);
    this._saveProfiles();
    return this.profiles[key];
  }
}
