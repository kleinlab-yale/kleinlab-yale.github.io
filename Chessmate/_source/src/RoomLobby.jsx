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
 useEffect(()=>{if(!visible&&session.current?.visiting&&!session.current.active)session.current.leaveVisit();},[visible]);
 useImperativeHandle(ref,()=>({endGame:()=>session.current?.endGame(),goOffline:()=>session.current?.closeHome()}),[]);
 const open=state.homeStatus==='open',opening=state.homeStatus==='opening',friends=profile?.friends||[];
 function needPlayer(){if(profile&&cloudConfigured)return false;onNeedProfile();return true;}
 async function openHome(){if(!profile||!cloudConfigured){onNeedProfile(homeName);return;}await session.current.open(homeName);}
 function join(name=joinName){if(!profile||!cloudConfigured){pendingJoin.current=name;sessionStorage.setItem('chessmate-return-room',roomName(name));onNeedProfile();return;}session.current.join(name);}
 function shareData(){return invitation(profile.homeRoom,profile.name,location.href);}
 async function shareRoom(){if(!profile)return;setShareError('');const data=shareData();if(await shareInvitation(data)==='fallback')setShare({data});}
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
 return <div hidden={!visible} className="friends-page-wrap"><div className="simple-friends page-enter">
  <h1>Play a friend</h1><p className="page-subtitle">Send them your room link, or enter their name to visit them.</p>
  {state.invitations.length>0&&<section className="room-invitations" aria-label="Invitations">{state.invitations.map(({player})=><div className="room-invitation" key={player.id}><Avatar id={player.avatar} outfit={player.outfit} size={46}/><div><strong>{player.name} invited you to play.</strong></div><button className="button primary" onClick={()=>{setJoinName(player.room);join(player.room);session.current.dismissInvite(player.id);}}>Join {player.name}<ArrowRight size={18}/></button><button className="icon-button" aria-label={`Dismiss invitation from ${player.name}`} onClick={()=>session.current.dismissInvite(player.id)}><X size={20}/></button></div>)}</section>}
  {state.error&&<div className="error-banner room-error" role="alert"><span>{state.error}</span><button aria-label="Dismiss message" onClick={()=>session.current?.update({error:''})}><X size={18}/></button></div>}
  <div className="simple-room-options">
   <section className="panel simple-my-room" aria-label="Your room">
    <div className="simple-room-owner"><Avatar id={profile?.avatar} outfit={profile?.outfit} size={62}/><div><h2>{profile?.name}’s room</h2><p>{open?'Your room is ready.':opening?'Opening your room…':'Reconnecting to your room…'}</p></div></div>
    <p>Send this link to the person you want to play.</p>
    <button className="button primary full" onClick={shareRoom}><Share2 size={21}/>Send my room link</button>
    <div className="simple-room-link"><input aria-label="Your room link" readOnly value={profile?shareData().url:''} onFocus={event=>event.target.select()}/><button onClick={()=>copy()} aria-label="Copy my room link">{copied?<Check size={19}/>:<Copy size={19}/>} {copied?'Copied':'Copy'}</button></div>
    {!open&&!opening&&<button className="text-button" onClick={openHome}>Reconnect <ArrowRight size={17}/></button>}
    <div className="simple-waiting" aria-live="polite"><h3>{state.guests.length?'Ready to play':'Waiting for your friend'}</h3>{state.guests.length?state.guests.map(guest=><div className="waiting-player" key={guest.id}><Avatar id={guest.player.avatar} outfit={guest.player.outfit} size={48}/><strong>{guest.player.name}</strong><button className="button primary" disabled={!!state.visit||!!guest.starting} onClick={()=>session.current.accept(guest.id)}>Play <ArrowRight size={18}/></button><button className="icon-button" aria-label={`Decline ${guest.player.name}`} onClick={()=>session.current.decline(guest.id)}><X size={18}/></button></div>):<p>They’ll appear here when they open your link. Choose Play to start.</p>}</div>
   </section>
   <section className="panel simple-join-room" aria-label="Visit a friend">
    <span className="simple-friend-icon"><Users size={32}/></span><h2>Go to a friend’s room</h2>
    {state.visit?<div className="visitor-lounge" aria-live="polite">{state.visit.status==='connecting'?<><Loader2 className="spin" size={30}/><h3>Joining {state.visit.room}…</h3></>:<><Avatar id={state.visit.player.avatar} outfit={state.visit.player.outfit} size={64}/><h3>You’re in {state.visit.player.name}’s room.</h3><p>{state.visit.offline?`${state.visit.player.name} is offline. Keep this page open while you wait.`:state.visit.busy?'They’re finishing another game. They can see you waiting.':`Waiting for ${state.visit.player.name} to press Play.`}</p></>}<button className="button secondary" onClick={()=>session.current.leaveVisit()}>Leave this room</button></div>:<form onSubmit={event=>{event.preventDefault();join();}}><p>Enter their name or paste the room link they sent you.</p><label htmlFor="friend-room-name">Your friend’s name or link</label><input id="friend-room-name" placeholder="Emma" value={joinName} onChange={event=>setJoinName(event.target.value)} maxLength={400} autoComplete="off" autoCapitalize="none" spellCheck="false"/><button className="button primary full" disabled={!joinName.trim()}><ArrowRight size={21}/>Join my friend</button></form>}
   </section>
  </div>
  {friends.length>0&&<section className="simple-saved-friends" aria-label="Friends"><h2>People you’ve played</h2><div className="simple-friend-list">{friends.map(friend=><div className="simple-friend-row" key={friend.id}><button className="simple-friend-person" onClick={()=>inviteFriend(friend)} aria-label={`Invite ${friend.name}`}><Avatar id={friend.avatar} outfit={friend.outfit} size={50}/><strong>{friend.name}</strong></button><button className="button secondary" disabled={!!state.inviting} onClick={()=>inviteFriend(friend)}>Invite</button><button className="button secondary" disabled={!!state.visit} onClick={()=>{setJoinName(friend.room);join(friend.room);}}>Visit</button></div>)}</div></section>}
  {share&&visible&&<div className="modal-backdrop" onClick={event=>{if(event.target===event.currentTarget)setShare(null);}}><div className="modal invite-modal" role="dialog" aria-modal="true" aria-labelledby="share-title"><button className="modal-close" aria-label="Close sharing" onClick={()=>setShare(null)}><X size={22}/></button><h2 id="share-title">Send your room link</h2><p>Copy the link into a message to your friend.</p><input aria-label="Room link to share" readOnly value={share.data.url} onFocus={event=>event.target.select()}/><div className="share-options"><button className="button primary" onClick={()=>copy(share.data)}><Copy size={20}/>{copied?'Copied':'Copy link'}</button><button className="button secondary" onClick={()=>messages(share.data)}><MessageCircle size={20}/>Open Messages</button></div>{shareError&&<p className="error-banner" role="alert">{shareError}</p>}</div></div>}
 </div></div>;
}
