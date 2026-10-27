import {cloud,checked,playerCard} from './cloud';
import {roomName} from './rooms';
const fresh=stamp=>!!stamp&&Date.now()-new Date(stamp).getTime()<45000;
export class CloudMatchChannel {
 constructor(match,user,events){this.peer=match.host_id===user.id?match.guest_id:match.host_id;this.matchId=match.id;this.user=user;this.listeners=new Map();this.pending=[];this.open=true;this.cursor=events.at(-1)?.id||0;this.sending=Promise.resolve();this.polling=false;
  this.subscription=cloud.channel(`match-${match.id}-${crypto.randomUUID()}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'cm_events',filter:`match_id=eq.${match.id}`},()=>this.poll()).subscribe();
  this.timer=setInterval(()=>this.poll(),2000);this.poll();
 }
 on(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);if(type==='data')for(const data of this.pending.splice(0))fn(data);if(type==='close'&&!this.open)fn();}
 off(type,fn){this.listeners.get(type)?.delete(fn);}
 emit(type,value){for(const fn of this.listeners.get(type)||[])fn(value);}
 async poll(){if(this.polling||!this.open)return;this.polling=true;try{
  const rows=checked(await cloud.from('cm_events').select('*').eq('match_id',this.matchId).gt('id',this.cursor).order('id'));
  for(const row of rows){this.cursor=row.id;if(row.sender_id===this.user.id)continue;if(row.data.type==='leave'){this.close();break;}if(this.listeners.get('data')?.size)this.emit('data',row.data);else this.pending.push(row.data);}
 }catch(error){this.emit('error',error);}finally{this.polling=false;}}
 send(data){if(!this.open)return;this.sending=this.sending.then(async()=>checked(await cloud.rpc('cm_send_event',{p_match:this.matchId,p_data:data}))).catch(error=>{this.emit('error',error);this.close();});}
 finish(){this.sending=this.sending.then(()=>cloud.rpc('cm_finish_match',{p_match:this.matchId})).then(checked).catch(error=>this.emit('error',error));}
 async leave(){await this.sending;const result=await cloud.rpc('cm_send_event',{p_match:this.matchId,p_data:{type:'leave'}});if(result.error&&!result.error.message.includes('ended'))this.emit('error',result.error);this.close();}
 close(){if(!this.open)return;this.open=false;clearInterval(this.timer);cloud.removeChannel(this.subscription);this.emit('close');}
}
export default class CloudRooms {
 constructor({getProfile,onChange,onStart,onHome,onInvite,onFriends}){
  Object.assign(this,{getProfile,onChange,onStart,onHome,onInvite,onFriends});this.state={home:'',homeStatus:'closed',guests:[],visit:null,invitations:[],error:'',inviting:''};this.disposed=false;this.active=null;this.seenMatches=new Set();this.notified=new Set();this.polling=false;this.online=false;this.visiting=null;this.sequence=0;
  this.timer=setInterval(()=>this.poll(),2500);this.heartbeat=setInterval(()=>this.beat(),15000);
  const uid=getProfile().id;
  this.subscription=cloud.channel(`lounge-${uid}-${crypto.randomUUID()}`).on('postgres_changes',{event:'*',schema:'public',table:'cm_visits'},()=>this.poll()).on('postgres_changes',{event:'*',schema:'public',table:'cm_invites',filter:`target_id=eq.${uid}`},()=>this.poll()).subscribe();
  this.wake=()=>{if(document.visibilityState==='visible'){this.beat();this.poll();}};document.addEventListener('visibilitychange',this.wake);
 }
 update(patch={}){if(this.disposed)return;Object.assign(this.state,patch);this.onChange({...this.state});}
 async action(action,target=null){return checked(await cloud.rpc('cm_room_action',{p_action:action,p_target:target}));}
 async open(){this.update({homeStatus:'opening',error:''});try{await this.action('online');this.online=true;const name=this.getProfile().homeRoom;this.update({home:name,homeStatus:'open'});this.onHome(name);this.poll();return true;}catch(e){this.update({homeStatus:'closed',error:e.message});return false;}}
 async beat(){try{if(this.online)await this.action('online');if(this.visiting&&!this.active)await this.action('waiting');}catch(e){this.update({error:'Your connection paused. Keep this page open; we’ll reconnect when you’re back online.'});}}
 async poll(){if(this.polling||this.disposed)return;this.polling=true;const uid=this.getProfile().id;try{
  const [guestRows,invites,contacts,matches]=await Promise.all([
   cloud.from('cm_visits').select('*,player:cm_players!guest_id(*)').eq('host_id',uid).eq('status','waiting').gt('seen_at',new Date(Date.now()-60000).toISOString()),
   cloud.from('cm_invites').select('*,player:cm_players!sender_id(*)').eq('target_id',uid).gt('created_at',new Date(Date.now()-86400000).toISOString()),
   cloud.from('cm_friends').select('friend:cm_players!friend_id(*)').eq('owner_id',uid),
   cloud.from('cm_matches').select('*').eq('status','active').or(`host_id.eq.${uid},guest_id.eq.${uid}`).order('created_at',{ascending:false}).limit(1)
  ]);
  const guests=checked(guestRows).map(row=>({id:row.guest_id,player:playerCard(row.player)}));const invitations=checked(invites).map(row=>({player:playerCard(row.player),created:row.created_at}));
  this.onFriends(checked(contacts).map(row=>playerCard(row.friend)));
  for(const invite of invitations){const key=invite.player.id+invite.created;if(!this.notified.has(key)){this.notified.add(key);this.onInvite(invite.player);}}
  this.update({guests,invitations});
  const match=checked(matches)[0];if(match&&!this.active&&!this.seenMatches.has(match.id))await this.start(match);
  if(this.visiting&&!this.active){const target=this.visiting,seq=this.sequence;
   const [presence,visit]=await Promise.all([cloud.from('cm_rooms').select('*').eq('owner_id',target.id).maybeSingle(),cloud.from('cm_visits').select('*').eq('guest_id',uid).maybeSingle()]);
   if(seq!==this.sequence||this.disposed)return;
   const row=checked(visit),status=checked(presence);
   if(row?.status==='declined'){await this.leaveVisit();this.update({error:`${target.name} isn’t ready to play. You can visit again later.`});}
   else this.update({visit:{room:target.room,player:target,status:'waiting',offline:!status?.online||!fresh(status.seen_at),busy:!!status?.busy}});
  }
 }catch(e){this.update({error:e.message});}finally{this.polling=false;}}
 async join(name){const seq=++this.sequence;this.update({visit:{room:roomName(name),status:'connecting'},error:''});try{
  const row=checked(await cloud.from('cm_players').select('*').eq('room_name',roomName(name)).maybeSingle());
  if(seq!==this.sequence)return;if(!row)throw new Error('No room has that name yet. Check the spelling with your friend.');
  if(row.id===this.getProfile().id){this.update({visit:null,error:'This is your home room. Guests appear in your waiting list.'});return;}
  await this.action('join',row.id);if(seq!==this.sequence||this.disposed){if(!this.visiting)await this.action('leave');return;}this.visiting=playerCard(row);this.update({visit:{room:row.room_name,player:this.visiting,status:'waiting'}});this.poll();
 }catch(e){if(seq===this.sequence)this.update({visit:null,error:e.message});}}
 async accept(id){try{this.update({error:''});const matchId=await this.action('accept',id);const match=checked(await cloud.from('cm_matches').select('*').eq('id',matchId).single());await this.start(match);}catch(e){this.update({error:e.message});}}
 async start(match){if(this.active||this.disposed||this.seenMatches.has(match.id))return;this.seenMatches.add(match.id);try{
  const isHost=match.host_id===this.getProfile().id;
  const [opponent,events]=await Promise.all([cloud.from('cm_players').select('*').eq('id',isHost?match.guest_id:match.host_id).single(),cloud.from('cm_events').select('*').eq('match_id',match.id).order('id')]);
  if(this.disposed)return;
  const history=checked(events),channel=new CloudMatchChannel(match,this.getProfile(),history);this.active=channel;
  this.onStart({connection:channel,opponent:playerCard(checked(opponent)),isHost,managed:true,matchId:match.id,history:history.filter(e=>e.data.type==='move').map(e=>e.data.move)});
 }catch(e){this.seenMatches.delete(match.id);this.update({error:e.message});}}
 async decline(id){try{await this.action('decline',id);this.poll();}catch(e){this.update({error:e.message});}}
 async leaveVisit(){this.sequence++;this.visiting=null;this.update({visit:null});try{await this.action('leave');}catch(e){this.update({error:e.message});}}
 async endGame(){const match=this.active;this.active=null;await match?.leave();await this.leaveVisit();this.poll();}
 async invite(friend){this.update({inviting:friend.id,error:''});try{if(!this.online&&!await this.open())return false;await this.action('invite',friend.id);return true;}catch(e){this.update({error:e.message});return false;}finally{this.update({inviting:''});}}
 async dismissInvite(id){try{await this.action('dismiss',id);this.update({invitations:this.state.invitations.filter(i=>i.player.id!==id)});}catch(e){this.update({error:e.message});}}
 async closeHome(){this.online=false;this.update({homeStatus:'closed'});try{await this.action('offline');}catch(e){this.update({error:e.message});}}
 destroy(){this.disposed=true;clearInterval(this.timer);clearInterval(this.heartbeat);document.removeEventListener('visibilitychange',this.wake);cloud.removeChannel(this.subscription);this.active?.close();if(this.online)this.action('offline').catch(()=>{});if(this.visiting)this.action('leave').catch(()=>{});}
}
