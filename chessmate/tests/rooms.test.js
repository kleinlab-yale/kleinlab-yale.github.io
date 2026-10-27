import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {RoomSession,MatchChannel,roomName,validRoom,roomPeerId,inviteLink,rememberFriend} from '../src/rooms.js';
import {newProfile,completeGame} from '../src/profile.js';
import {invitation,shareInvitation,copyInvitation} from '../src/invitations.js';

const settle=()=>new Promise(resolve=>setTimeout(resolve,15));
class Link extends EventEmitter {
 constructor(peer){super();this.peer=peer;this.open=false;}
 send(data){if(this.open)queueMicrotask(()=>{if(this.other.open)this.other.emit('data',structuredClone(data));});}
 close(){if(!this.open)return;this.open=false;this.emit('close');if(this.other.open){this.other.open=false;this.other.emit('close');}}
}
function network(){
 const peers=new Map();let next=0;
 class FakePeer extends EventEmitter{
  constructor(id=`visitor-${++next}`){super();this.id=id;this.links=[];this.destroyed=false;queueMicrotask(()=>{if(this.destroyed)return;if(peers.has(id))this.emit('error',{type:'unavailable-id'});else{peers.set(id,this);this.emit('open',id);}});}
  connect(id){const a=new Link(id),b=new Link(this.id);a.other=b;b.other=a;this.links.push(a);queueMicrotask(()=>{const target=peers.get(id);if(!target){this.emit('error',{type:'peer-unavailable'});return;}target.links.push(b);target.emit('connection',b);a.open=b.open=true;b.emit('open');a.emit('open');});return a;}
  destroy(){if(this.destroyed)return;this.destroyed=true;for(const link of this.links)link.close();if(peers.get(this.id)===this)peers.delete(this.id);this.emit('close');}
 }
 function player(name){const profile=newProfile(name),matches=[];let state;const session=new RoomSession({createPeer:id=>new FakePeer(id),getProfile:()=>profile,onChange:s=>state=s,onHome:r=>profile.homeRoom=r,onStart:r=>matches.push(r),onInvite:()=>{},timeout:150});return{profile,session,matches,get state(){return state;}};}
 return{player,peers};
}

test('room names accept names and links, are case-insensitive, and reject invalid addresses',()=>{
 assert.equal(roomName(' @Emma '),'emma');assert.equal(roomName('Emma Smith'),'emma-smith');assert.equal(roomName('https://example.com/Chessmate/?room=EMMA'),'emma');assert.equal(roomPeerId('EMMA'),roomPeerId('emma'));
 assert.ok(validRoom('emma-24'));for(const name of ['', 'a','../../emma','a'.repeat(25),'emma?x','emma💜'])assert.equal(validRoom(name),false);
 assert.equal(inviteLink('emma','https://example.com/Chessmate/?old=x#game'),'https://example.com/Chessmate/?room=emma');
});
test('guests enter a waiting list; only the selected guest starts, and other guests keep waiting',async t=>{
 const n=network(),host=n.player('Emma'),one=n.player('Lily'),two=n.player('Sam');t.after(()=>[host,one,two].forEach(p=>p.session.destroy()));
 assert.equal(await host.session.open('emma'),true);one.session.join('EMMA');two.session.join('emma');await settle();
 assert.equal(host.state.guests.length,2);assert.equal(one.state.visit.status,'waiting');assert.equal(host.matches.length,0);assert.equal(one.matches.length,0);
 host.session.accept(host.state.guests.find(g=>g.player.name==='Lily').id);await settle();
 assert.equal(host.matches.length,1);assert.equal(one.matches.length,1);assert.equal(two.matches.length,0);assert.equal(two.state.visit.busy,true);
 // Early moves are buffered until the game view attaches its receiver.
 host.matches[0].connection.send({type:'move',move:'e4'});await settle();let received;one.matches[0].connection.on('data',data=>received=data);assert.equal(received.move,'e4');
 host.session.endGame();await settle();assert.equal(host.state.homeStatus,'open');assert.equal(host.state.guests.length,1);assert.equal(two.state.visit.busy,false);
 host.session.accept(host.state.guests[0].id);await settle();assert.equal(host.matches.length,2);assert.equal(two.matches.length,1);
});
test('declining and leaving remove waiting guests without launching a game',async t=>{
 const n=network(),host=n.player('Emma'),guest=n.player('Lily');t.after(()=>[host,guest].forEach(p=>p.session.destroy()));await host.session.open('emma');guest.session.join('emma');await settle();
 host.session.decline(host.state.guests[0].id);await settle();assert.equal(guest.state.visit,null);assert.match(guest.state.error,/isn’t ready/);assert.equal(host.matches.length,0);
 await new Promise(r=>setTimeout(r,270));assert.equal(host.state.guests.length,0);
 guest.session.join('emma');await settle();guest.session.leaveVisit();await new Promise(r=>setTimeout(r,270));assert.equal(host.state.guests.length,0);
});
test('room collisions and offline rooms recover with useful messages',async t=>{
 const n=network(),host=n.player('Emma'),guest=n.player('Lily');t.after(()=>[host,guest].forEach(p=>p.session.destroy()));await host.session.open('emma');assert.equal(await guest.session.open('emma'),false);assert.match(guest.state.error,/already open/);
 guest.session.join('missing');await settle();assert.equal(guest.state.visit,null);assert.match(guest.state.error,/offline/);assert.equal(await guest.session.open('lily'),true);
});
test('in-app invitations require the recipient to choose to join; offline invites return a fallback',async t=>{
 const n=network(),host=n.player('Emma'),guest=n.player('Lily');t.after(()=>[host,guest].forEach(p=>p.session.destroy()));await host.session.open('emma');await guest.session.open('lily');
 assert.equal(await host.session.invite({...guest.profile,room:'lily'},'emma'),true);assert.equal(guest.state.invitations.length,1);assert.equal(guest.state.visit,null);assert.equal(guest.matches.length,0);
 guest.session.join(guest.state.invitations[0].player.room);await settle();assert.equal(host.state.guests.filter(g=>g.player).length,1);assert.equal(guest.state.visit.status,'waiting');
 assert.equal(await host.session.invite({...guest.profile,room:'offline'},'emma'),false);assert.equal(host.state.inviting,'');
});
test('disconnects close the match channel but preserve the host room',async t=>{
 const n=network(),host=n.player('Emma'),guest=n.player('Lily');t.after(()=>[host,guest].forEach(p=>p.session.destroy()));await host.session.open('emma');guest.session.join('emma');await settle();host.session.accept(host.state.guests[0].id);await settle();
 let closed=false;host.matches[0].connection.on('close',()=>closed=true);guest.session.destroy();await settle();assert.equal(closed,true);assert.equal(host.state.homeStatus,'open');assert.equal(host.state.guests.length,0);
});
test('match messages are scoped to one game and closing prevents further sends',()=>{
 const sent=[],raw={open:true,peer:'lily',send:d=>sent.push(d)},channel=new MatchChannel(raw,'match-one');channel.send({type:'chat',text:'hello'});assert.equal(sent[0].matchId,'match-one');channel.close();channel.send({type:'move'});assert.equal(sent.length,1);
});
test('a slow join retries once, while cancelling prevents a later retry',async t=>{
 let created=0;const peers=[];
 const session=new RoomSession({createPeer:()=>{created++;const p=new EventEmitter();p.destroy=()=>p.emit('close');peers.push(p);return p;},getProfile:()=>newProfile('Lily'),onChange:()=>{},onStart:()=>{},onHome:()=>{},onInvite:()=>{},timeout:20});
 t.after(()=>session.destroy());session.join('emma');await new Promise(r=>setTimeout(r,60));assert.equal(created,2);assert.equal(session.state.visit,null);assert.match(session.state.error,/isn’t responding/);
 session.join('emma');session.leaveVisit();await new Promise(r=>setTimeout(r,60));assert.equal(created,3);assert.equal(session.state.visit,null);
});
test('leaving and immediately rejoining does not leave a duplicate guest behind',async t=>{
 const n=network(),host=n.player('Emma'),guest=n.player('Lily');t.after(()=>[host,guest].forEach(p=>p.session.destroy()));await host.session.open('emma');guest.session.join('emma');await settle();guest.session.leaveVisit();guest.session.join('emma');await settle();assert.equal(host.state.guests.length,1);assert.equal(guest.state.visit.status,'waiting');assert.equal(guest.state.error,'');
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
