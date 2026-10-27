import {useEffect,useImperativeHandle,useRef,useState} from 'react';
import CloudRooms from './CloudRooms';
import {cloudConfigured} from './cloud';
import {ArrowRight,Copy,Check,Users,Loader2,House,Share2,MessageCircle,DoorOpen,X,UserPlus,Send,Link2} from 'lucide-react';
import Avatar from './Avatar';
import {roomName,suggestedRoom,validRoom} from './rooms';
import {invitation,shareInvitation,copyInvitation} from './invitations';
import useDialog from './useDialog';

const emptyRoom=()=>({home:'',homeStatus:'closed',guests:[],visit:null,invitations:[],error:'',inviting:''});

export default function RoomLobby({ref,profile,onStart,onNeedProfile,onHome,onFriends,notify,visible}) {
 const [homeName,setHomeName]=useState(profile?.homeRoom||suggestedRoom(profile?.name));
 const [joinName,setJoinName]=useState(new URLSearchParams(location.search).get('room')||sessionStorage.getItem('chessmate-return-room')||'');
 const [state,setState]=useState(emptyRoom);
 const [share,setShare]=useState(null),[copied,setCopied]=useState(false),[shareError,setShareError]=useState('');
 const session=useRef(),latest=useRef(); latest.current={profile,onStart,onHome,onFriends,notify};
 const edited=useRef(false),copyTimer=useRef(),pendingJoin=useRef('');
 const invitedRoom=roomName(new URLSearchParams(location.search).get('room')||sessionStorage.getItem('chessmate-return-room')||'');
 useDialog(share&&visible?'room-share':null,()=>setShare(null));
 useEffect(()=>{
  setState(emptyRoom());setShare(null);setShareError('');
  if(!profile||!cloudConfigured)return;
  const rooms=new CloudRooms({onFriends:friends=>latest.current.onFriends(friends),getProfile:()=>latest.current.profile,onChange:setState,onStart:room=>latest.current.onStart(room),onHome:name=>latest.current.onHome(name),onInvite:player=>latest.current.notify(`${player.name} invited you to @${player.room}. Open Play with friends to join.`)});
  session.current=rooms;rooms.open();
  const invited=roomName(pendingJoin.current||new URLSearchParams(location.search).get('room')||sessionStorage.getItem('chessmate-return-room')||'');pendingJoin.current='';sessionStorage.removeItem('chessmate-return-room');
  if(invited&&invited!==profile.homeRoom)rooms.join(invited);
  return()=>{rooms.destroy();session.current=null;clearTimeout(copyTimer.current);};
 },[profile?.id]);
 useEffect(()=>{if(!edited.current)setHomeName(profile?.homeRoom||suggestedRoom(profile?.name));},[profile?.homeRoom,profile?.name]);
 useImperativeHandle(ref,()=>({endGame:()=>session.current?.endGame(),goOffline:()=>session.current?.closeHome()}),[]);
 const open=state.homeStatus==='open',opening=state.homeStatus==='opening',friends=profile?.friends||[];
 function needPlayer(){if(profile&&cloudConfigured)return false;onNeedProfile();return true;}
 async function openHome(){if(!profile||!cloudConfigured){onNeedProfile(homeName);return;}await session.current.open(homeName);}
 function join(name=joinName){if(!profile||!cloudConfigured){pendingJoin.current=name;sessionStorage.setItem('chessmate-return-room',roomName(name));onNeedProfile();return;}session.current.join(name);}
 function shareData(){return invitation(state.home,profile.name,location.href);}
 async function shareRoom(){if(!open)return;setShareError('');const data=shareData();if(await shareInvitation(data)==='fallback')setShare({data});}
 async function copy(data=shareData()){
  try{await copyInvitation(data);setCopied(true);clearTimeout(copyTimer.current);copyTimer.current=setTimeout(()=>setCopied(false),2500);return true;}
  catch{setShare({data});setShareError('Select and copy the invitation below. Your browser couldn’t access the clipboard.');return false;}
 }
 async function messages(data){if(await copy(data)){notify('Invitation copied. Paste it in Messages, then choose your friend.');window.location.href='sms:';}}
 async function inviteFriend(friend){
  if(needPlayer())return;
  const sent=await session.current.invite(friend,homeName);
  if(sent)notify(`Invitation saved for ${friend.name}. They’ll see it when they’re signed in.`);
  else if(session.current?.state.homeStatus==='open'){setShareError('');setShare({data:invitation(session.current.state.home,profile.name,location.href),friend:friend.name});}
 }
 return <div hidden={!visible} className="friends-page-wrap"><div className="room-page friends-page page-enter">
  <div className="section-eyebrow">GOOD COMPANY. ONE SIMPLE NAME.</div><h1>{profile?`${profile.name}’s home room.`:'Your own home room.'}</h1><p className="page-subtitle">One account. One room name. Your friends are always welcome.</p>{!profile&&<div className="room-account-gate panel"><House size={28}/><div><h2>Make a room that stays yours.</h2><p>Sign in to reserve a name like Emma, keep your progress, and see your friends on any device.</p></div><button className="button primary" onClick={onNeedProfile}>Sign in / Create account <ArrowRight size={16}/></button></div>}
  {invitedRoom&&!profile&&<div className="room-invitation-link panel"><House size={23}/><div><strong>You’re invited to @{invitedRoom}.</strong><p>Sign in to join their waiting room. Your host chooses when to start.</p></div><button className="button primary" onClick={onNeedProfile}>Sign in to join <ArrowRight size={16}/></button></div>}
  {state.invitations.length>0&&<section className="room-invitations" aria-label="Game invitations">{state.invitations.map(({player})=><div className="room-invitation" key={player.id}><Avatar id={player.avatar} outfit={player.outfit} size={44}/><div><strong>{player.name} saved you a seat.</strong><span>Join @{player.room} when you’re ready.</span></div><button className="button primary" disabled={!!state.visit} onClick={()=>{setJoinName(player.room);join(player.room);session.current.dismissInvite(player.id);}}>Join room <ArrowRight size={15}/></button><button className="icon-button" aria-label={`Dismiss invitation from ${player.name}`} onClick={()=>session.current.dismissInvite(player.id)}><X size={16}/></button></div>)}</section>}
  {state.error&&<div className="error-banner room-error" role="alert"><span>{state.error}</span><button aria-label="Dismiss room message" onClick={()=>session.current.update({error:''})}><X size={16}/></button></div>}
  <div className="social-layout">
   <section className={`panel home-room ${open?'room-is-open':''}`} aria-label="My home room">
    <div className="room-card-heading"><span className="room-symbol"><House size={22}/></span><span className="tiny-label">MY HOME ROOM</span><span className={`room-status ${open?'online':''}`}>{opening?<Loader2 size={12} className="spin"/>:<span className="live-dot"/>}{open?'Online · welcoming guests':opening?'Connecting…':'Offline'}</span></div>
    {open?<>
     <div className="home-room-title"><h2>{profile.name}’s room<span>@{state.home}</span></h2><button className="text-button" onClick={()=>session.current.closeHome()}>Go offline</button></div>
     <div className="room-table-scene"><span className="table-ring"/><Avatar id={profile.avatar} outfit={profile.outfit} size={84}/><span className="table-center">♟</span><span className="empty-seat"><Users size={27}/></span><div><strong>You’re at home.</strong><p>Send an invitation, then choose a guest below.</p></div></div>
     <div className="room-share-actions"><button className="button primary" onClick={shareRoom}><Share2 size={16}/>Invite a friend</button><button className="button secondary" onClick={()=>copy()}>{copied?<Check size={16}/>:<Copy size={16}/>} {copied?'Copied':'Copy link'}</button></div>
     <p className="room-hint">Your friend can also type <strong>{state.home}</strong> into “Join a room.”</p>
     <div className="waiting-heading"><h3>At your door <span>{state.guests.length}</span></h3><span>You choose when to play.</span></div>
     <div className="waiting-list" aria-live="polite">{state.guests.length?state.guests.map(guest=><div className="waiting-player" key={guest.id}><Avatar id={guest.player.avatar} outfit={guest.player.outfit} size={45}/><div><strong>{guest.player.name}</strong><span>{guest.player.elo} Elo · Ready for a game</span></div><button className="button primary" disabled={!!state.visit||state.guests.some(g=>g.starting)} onClick={()=>session.current.accept(guest.id)}>{guest.starting?<Loader2 size={15} className="spin"/>:'Play'}<ArrowRight size={14}/></button><button className="icon-button" aria-label={`Decline ${guest.player.name}`} disabled={guest.starting} onClick={()=>session.current.decline(guest.id)}><X size={15}/></button></div>):<div className="waiting-empty"><DoorOpen size={23}/><div><strong>A seat is waiting.</strong><p>Friends appear here when they join. Your game starts only when you choose Play.</p></div></div>}</div>
    </>:<>
     <h2>A room that feels like you.</h2><p className="room-description">Your account keeps this room name reserved for you. Go online whenever you’re ready for company.</p>
     <form className="home-room-form" onSubmit={e=>{e.preventDefault();openHome();}}><label htmlFor="home-room-name">YOUR ROOM NAME</label><div className="named-room-input"><span>@</span><input id="home-room-name" placeholder="emma" value={homeName==='my-chess-room'&&!profile?'':homeName} maxLength={24} onChange={e=>{edited.current=true;setHomeName(roomName(e.target.value));}} disabled={opening||!!profile} autoComplete="off" autoCapitalize="none" spellCheck="false"/></div><p className="room-field-hint">Your room name belongs to your signed-in account.</p><button className="button primary" disabled={opening||!!profile&&!validRoom(homeName)}>{opening?<Loader2 className="spin" size={17}/>:<DoorOpen size={17}/>} {opening?'Connecting…':profile?'Go online':'Choose my room name'}<ArrowRight size={16}/></button></form>
     <div className="room-how-it-works"><span>01 <strong>Open your room</strong></span><span>02 <strong>Invite your people</strong></span><span>03 <strong>Choose who to play</strong></span></div>
    </>}
   </section>
   <div className="visit-column">
    <section className="panel visit-room" aria-label="Join a friend’s room"><span className="room-symbol green"><Link2 size={22}/></span><h2>Meet them at their place.</h2><p className="room-description">Just enter their room name. No codes to untangle.</p>
     {state.visit?<div className="visitor-lounge" aria-live="polite">{state.visit.status==='connecting'?<><Loader2 className="spin" size={28}/><h3>Finding @{state.visit.room}…</h3><p>{state.visit.retry?'The first connection took too long. Trying once more…':'We’re knocking on their door.'}</p></>:<><div className="visitor-avatars"><Avatar id={state.visit.player.avatar} outfit={state.visit.player.outfit} size={59}/><span>✧</span><Avatar id={profile?.avatar} outfit={profile?.outfit} size={45}/></div><span className="waiting-label"><span className="live-dot"/>You’re in @{state.visit.room}</span><h3>{state.visit.offline?`${state.visit.player.name} is offline.`:state.visit.busy?'A game is in progress.':`Waiting for ${state.visit.player.name}.`}</h3><p>{state.visit.offline?'This is still their room. Stay here and your host will see you waiting when they come online.':state.visit.busy?'Your host can see you waiting and can choose you for the next game.':'Your host can see your name and avatar. They’ll choose Play when they’re ready.'}</p></>}<button className="button secondary" onClick={()=>session.current.leaveVisit()}><ArrowRight size={15}/>Leave room</button></div>:<form onSubmit={e=>{e.preventDefault();join();}}><label htmlFor="friend-room-name">THEIR ROOM NAME</label><div className="named-room-input"><span>@</span><input id="friend-room-name" placeholder="e.g. emma" value={joinName} maxLength={400} onChange={e=>setJoinName(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck="false"/></div><button className="button secondary full" disabled={!joinName.trim()}>Join room <ArrowRight size={16}/></button><p className="room-field-hint">Invitation links work here, too. Your friend chooses when the game starts.</p></form>}
    </section>
    <div className="room-note"><MessageCircle size={20}/><div><strong>A little “want to play?” goes a long way.</strong><p>Invite a friend opens your device’s sharing options. Choose Messages, WhatsApp, or another available app.</p></div></div>
   </div>
  </div>
  <section className="friends-section" aria-label="Saved friends"><div className="section-heading"><div><h2>Familiar faces.</h2><p>Your past opponents, saved to your account.</p></div><span className="friend-count"><Users size={16}/>{friends.length} {friends.length===1?'friend':'friends'}</span></div>
   {friends.length?<div className="friends-grid">{friends.map(friend=><article className="friend-card panel" key={friend.id}><button className="friend-avatar-button" aria-label={`Invite ${friend.name}`} disabled={!!state.inviting||!friend.room} onClick={()=>inviteFriend(friend)}><Avatar id={friend.avatar} outfit={friend.outfit} size={62}/><span><UserPlus size={13}/></span></button><h3>{friend.name}</h3><p>{friend.room?`@${friend.room}`:'Room not shared'}</p><button className="button secondary" disabled={!!state.inviting||!friend.room} onClick={()=>inviteFriend(friend)}>{state.inviting===friend.id?<Loader2 className="spin" size={14}/>:<Send size={14}/>} {state.inviting===friend.id?'Inviting…':'Invite to play'}</button>{friend.room&&<button className="text-button" disabled={!!state.visit} onClick={()=>{setJoinName(friend.room);join(friend.room);}}>Visit their room <ArrowRight size={13}/></button>}</article>)}</div>:<div className="panel friends-empty"><div className="empty-friends-avatars"><Avatar id="june" size={52}/><Avatar id="milo" size={52}/><Avatar id="cleo" size={52}/></div><div><h3>The start of a friendly rivalry.</h3><p>Your past opponents will be a tap away. Invite them here, or drop by their room.</p></div></div>}
  </section>
  <p className="room-availability">Your account owns your room name, even when you’re offline. Sign in on any device to return home. Keep this page open to play live; invitations are saved for your next visit.</p>
  {share&&visible&&<div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setShare(null);}}><div className="modal invite-modal" role="dialog" aria-modal="true" aria-labelledby="share-title"><button className="modal-close" aria-label="Close invitation options" onClick={()=>setShare(null)}><X size={20}/></button><span className="room-symbol"><Share2 size={24}/></span><h2 id="share-title">{share.friend?`Send ${share.friend} a seat.`:'Good games start with hello.'}</h2><p>{share.friend?`${share.friend} isn’t reachable in Chessmate right now. Send your room invitation in a message.`:'Send your invitation in the app you already use with your friends.'}</p><label htmlFor="share-room-link">YOUR INVITATION</label><input id="share-room-link" readOnly value={share.data.url} onFocus={e=>e.target.select()}/><div className="share-options"><button className="button primary" onClick={()=>copy(share.data)}>{copied?<Check size={17}/>:<Copy size={17}/>} {copied?'Copied':'Copy invitation'}</button><button className="button secondary" onClick={()=>messages(share.data)}><MessageCircle size={17}/>Open Messages</button></div><p className="small muted">Messages opens on supported devices. Choose a recipient and paste the copied invitation. You decide when to send it.</p>{shareError&&<p className="error-banner" role="alert">{shareError}</p>}</div></div>}
 </div></div>;
}
