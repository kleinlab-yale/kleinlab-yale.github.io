import {rememberFriend,suggestedRoom} from './rooms.js';
export const STORAGE_KEY = 'chessmate.profile.v1';
export function newProfile(name = 'Player', avatar = 'june') {return {id: crypto.randomUUID(), name, avatar, homeRoom:suggestedRoom(name), friends:[], elo:800, xp:0, coins:0, games:[], outfits:['classic'], outfit:'classic', streak:0, lastPlayed:null, joined:new Date().toISOString()};}
export function readProfile() { try {const p=JSON.parse(localStorage.getItem(STORAGE_KEY)); return p&&typeof p.name==='string'&&Number.isFinite(p.elo)&&Number.isFinite(p.xp)&&Array.isArray(p.games)&&Array.isArray(p.outfits)?{...p,homeRoom:p.homeRoom||suggestedRoom(p.name),friends:Array.isArray(p.friends)?p.friends:[]}:null;}catch{return null;} }
export function localDay(date=new Date()) {return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function ratingDelta(rating, opponent, score) {return Math.round(32*(score-1/(1+10**((opponent-rating)/400))));}
export function completeGame(profile, result, date=new Date()) {
 if(profile.games.some(g=>g.id===result.id)) return profile;
 const day=localDay(date), yesterday=new Date(date); yesterday.setDate(yesterday.getDate()-1);
 const meaningful=result.plies>=6 || result.reason==='checkmate';
 const xp=meaningful?(result.assisted?15:result.score===1?80:result.score===.5?40:25):0;
 const delta=result.assisted?0:ratingDelta(profile.elo,result.opponentElo,result.score);
 const entry={...result, xp, delta, date:date.toISOString()};
 if(result.mode==='friend'&&result.friend)profile=rememberFriend(profile,result.friend,date);
 return {...profile, elo:Math.max(100,profile.elo+delta),xp:profile.xp+xp,coins:profile.coins+xp, streak:meaningful?(profile.lastPlayed===day?profile.streak:profile.lastPlayed===localDay(yesterday)?profile.streak+1:1):profile.streak,lastPlayed:meaningful?day:profile.lastPlayed,games:[entry,...profile.games].slice(0,300)};
}
export function buyOutfit(profile,outfit,season) {
 if(profile.outfits.includes(outfit.id)) return {...profile,outfit:outfit.id};
 if(profile.coins<outfit.cost || (outfit.season&&outfit.season!==season)) return profile;
 return {...profile,coins:profile.coins-outfit.cost,outfits:[...profile.outfits,outfit.id],outfit:outfit.id};
}
