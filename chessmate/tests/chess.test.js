import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {chooseMove} from '../src/engine.js';
import {newProfile,completeGame,buyOutfit,ratingDelta} from '../src/profile.js';
import {BOTS,OUTFITS,seasonAt} from '../src/data.js';

test('illegal moves are rejected and the starting board has 20 moves',()=>{const game=new Chess();assert.equal(game.moves().length,20);assert.throws(()=>game.move({from:'e2',to:'e5'}));assert.equal(game.turn(),'w');});
test('castling, en passant, and all promotion choices are legal',()=>{
 const castle=new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');castle.move('O-O');assert.equal(castle.get('g1').type,'k');assert.equal(castle.get('f1').type,'r');
 const enPassant=new Chess();['e4','a6','e5','d5','exd6'].forEach(m=>enPassant.move(m));assert.equal(enPassant.get('d5'),undefined);assert.equal(enPassant.get('d6').color,'w');
 for(const promotion of ['q','r','b','n']){const game=new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1');game.move({from:'a7',to:'a8',promotion});assert.equal(game.get('a8').type,promotion);}
});
test('checkmate and threefold repetition are recognized',()=>{const mate=new Chess();['f3','e5','g4','Qh4#'].forEach(m=>mate.move(m));assert.equal(mate.isCheckmate(),true);const repeated=new Chess();['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1','Ng8'].forEach(m=>repeated.move(m));assert.equal(repeated.isThreefoldRepetition(),true);});
test('every personality selects legal moves without mutating the board',()=>{for(const bot of BOTS){const game=new Chess();game.move('e4');const fen=game.fen();const move=chooseMove(fen,bot,()=>.6);assert.ok(game.moves().includes(move),bot.name);assert.equal(game.fen(),fen);}});
test('strongest bot finds immediate mate',()=>{const game=new Chess();['f3','e5','g4'].forEach(m=>game.move(m));const move=chooseMove(game.fen(),BOTS.at(-1),()=>.5);game.move(move);assert.equal(game.isCheckmate(),true);});
test('no moves are returned for a finished game',()=>{const game=new Chess('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1');assert.equal(chooseMove(game.fen(),BOTS[0]),null);});
test('ratings respond to opponent strength and game results',()=>{assert.equal(ratingDelta(800,800,1),16);assert.equal(ratingDelta(800,800,0),-16);assert.equal(ratingDelta(800,800,.5),0);assert.ok(ratingDelta(800,1300,1)>16);});
test('completed games award points once and spending preserves lifetime XP',()=>{const profile=newProfile('Test');const result={id:'one',score:1,opponentElo:800,plies:12,reason:'resignation'};const won=completeGame(profile,result);assert.equal(won.xp,80);assert.equal(won.coins,80);assert.equal(won.elo,816);assert.equal(completeGame(won,result),won);const funded={...won,coins:200};const purchased=buyOutfit(funded,OUTFITS[1],'autumn');assert.equal(purchased.coins,80);assert.equal(purchased.xp,80);assert.ok(purchased.outfits.includes('scholar'));assert.equal(buyOutfit(purchased,OUTFITS[1],'autumn').coins,80);});
test('short resignations award no XP; short checkmates still count',()=>{const profile=newProfile();assert.equal(completeGame(profile,{id:'a',score:0,opponentElo:800,plies:0,reason:'resignation'}).xp,0);assert.equal(completeGame(profile,{id:'b',score:1,opponentElo:800,plies:4,reason:'checkmate'}).xp,80);});
test('practice games preserve rating; unavailable or unaffordable outfits cannot be purchased',()=>{const profile=newProfile();const practice=completeGame(profile,{id:'a',score:1,opponentElo:800,plies:12,reason:'checkmate',assisted:true});assert.equal(practice.elo,800);assert.equal(practice.xp,15);assert.equal(buyOutfit(profile,OUTFITS[1],'autumn'),profile);const funded={...profile,coins:1000};assert.equal(buyOutfit(funded,OUTFITS.find(o=>o.id==='wizard'),'spring'),funded);});
test('streaks count distinct consecutive local days',()=>{let profile=newProfile();const result={score:1,opponentElo:800,plies:10,reason:'checkmate'};profile=completeGame(profile,{...result,id:'one'},new Date(2026,9,25,12));assert.equal(profile.streak,1);profile=completeGame(profile,{...result,id:'two'},new Date(2026,9,25,18));assert.equal(profile.streak,1);profile=completeGame(profile,{...result,id:'three'},new Date(2026,9,26,12));assert.equal(profile.streak,2);profile=completeGame(profile,{...result,id:'four'},new Date(2026,9,28,12));assert.equal(profile.streak,1);});
test('seasonal collection follows the calendar',()=>{assert.equal(seasonAt(new Date(2026,9,26)),'autumn');assert.equal(seasonAt(new Date(2026,11,26)),'winter');assert.equal(seasonAt(new Date(2026,2,26)),'spring');assert.equal(seasonAt(new Date(2026,5,26)),'summer');});
