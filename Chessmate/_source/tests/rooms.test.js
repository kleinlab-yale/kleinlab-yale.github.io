import test from 'node:test';
import assert from 'node:assert/strict';
import {roomName,validRoom,roomPeerId,inviteLink,rememberFriend} from '../src/rooms.js';
import {newProfile,completeGame} from '../src/profile.js';
import {invitation,shareInvitation,copyInvitation} from '../src/invitations.js';
test('room names accept names and links, are case-insensitive, and reject invalid addresses',()=>{
 assert.equal(roomName(' @Emma '),'emma');assert.equal(roomName('Emma Smith'),'emma-smith');assert.equal(roomName('https://example.com/Chessmate/?room=EMMA'),'emma');assert.equal(roomPeerId('EMMA'),roomPeerId('emma'));
 assert.ok(validRoom('emma-24'));for(const name of ['', 'a','../../emma','a'.repeat(25),'emma?x','emma💜'])assert.equal(validRoom(name),false);
 assert.equal(inviteLink('emma','https://example.com/Chessmate/?old=x#game'),'https://example.com/Chessmate/room.html?room=emma');
});
test('completed friend games remember a person once, with updated room and avatar',()=>{
 const p=newProfile('Emma'),friend={...newProfile('Lily'),room:'lily'};
 const result={id:'first',mode:'friend',friend,score:1,opponentElo:800,plies:8,reason:'resignation'};
 const updated=completeGame(p,result);assert.equal(updated.friends[0].name,'Lily');assert.equal(updated.friends[0].room,'lily');
 const again=rememberFriend(updated,{...friend,name:'Lily Rose',room:'lily-rose',avatar:'cleo'});assert.equal(again.friends.length,1);assert.equal(again.friends[0].room,'lily-rose');assert.equal(again.friends[0].avatar,'cleo');assert.equal(rememberFriend(p,{...p,room:'emma'}),p);
});
test('sharing respects cancellation and provides copy fallback without sending messages',async()=>{
 const data=invitation('emma','Emma','https://example.com/Chessmate/');assert.match(data.text,/@emma/);let shared,copied;
 assert.equal(await shareInvitation(data,{share:async d=>{shared=d;}}),'shared');assert.deepEqual(shared,data);
 assert.equal(await shareInvitation(data,{}),'fallback');assert.equal(await shareInvitation(data,{share:async()=>{throw Object.assign(new Error(),{name:'AbortError'});}}),'cancelled');
 assert.equal(await shareInvitation(data,{share:async()=>{throw new Error();}}),'fallback');await copyInvitation(data,{clipboard:{writeText:async text=>{copied=text;}}});assert.ok(copied.includes(data.url));
});
