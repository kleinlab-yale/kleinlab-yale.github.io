import {useEffect,useRef,useState} from 'react';
import {Peer} from 'peerjs';
import {ArrowRight,Copy,Check,Link2,Users,Loader2,ShieldCheck} from 'lucide-react';
export default function RoomLobby({profile,onStart,onNeedProfile,notify}) {
 const [code,setCode]=useState(new URLSearchParams(location.search).get('room')||''),[room,setRoom]=useState(''),[status,setStatus]=useState('idle'),[error,setError]=useState(''),[copied,setCopied]=useState(false);
 const peerRef=useRef(),handedOff=useRef(false),timer=useRef(),busy=useRef(false);
 useEffect(()=>()=>{clearTimeout(timer.current);if(!handedOff.current)peerRef.current?.destroy();},[]);
 function connect(host){
  if(!profile){onNeedProfile();return;} if(!host&&!/^[a-zA-Z0-9-]{4,64}$/.test(code.trim())){setError('Enter the room code from your friend’s invitation.');return;}
  peerRef.current?.destroy();clearTimeout(timer.current);busy.current=false;setError('');setStatus('connecting');
  const id=host?`chessmate-${crypto.randomUUID()}`:undefined;
  const peer=host?new Peer(id):new Peer();peerRef.current=peer;
  timer.current=setTimeout(()=>{if(!handedOff.current){setError('Connection timed out. Please try again or check your network.');setStatus('idle');peer.destroy();}},20000);
  function attach(connection){
   if(busy.current){connection.on('open',()=>{connection.send({type:'full'});setTimeout(()=>connection.close(),150);});return;}
   busy.current=true;
   connection.on('open',()=>{connection.send({type:'hello',profile:{name:profile.name,avatar:profile.avatar,elo:profile.elo,outfit:profile.outfit}});});
   connection.on('data',data=>{
    if(data?.type==='full'){setError('This room already has two players. Create a new room.');setStatus('idle');peer.destroy();}
    if(data?.type==='hello'&&typeof data.profile?.name==='string'&&Number.isFinite(data.profile?.elo)&&!handedOff.current){clearTimeout(timer.current);handedOff.current=true;onStart({peer,connection,isHost:host,opponent:{...data.profile,name:data.profile.name.slice(0,24),elo:Math.max(100,Math.min(3000,data.profile.elo))}});}
   });
   connection.on('error',()=>{setError('The connection was interrupted. Please try again.');setStatus('idle');busy.current=false;});
   connection.on('close',()=>{if(!handedOff.current){busy.current=false;setError('Your friend disconnected. Please try a new invitation.');setStatus('idle');}});
  }
  peer.on('open',()=>{if(host){clearTimeout(timer.current);setRoom(id.replace('chessmate-',''));setStatus('waiting');}else attach(peer.connect('chessmate-'+code.trim(),{reliable:true}));});
  peer.on('connection',attach);
  peer.on('error',err=>{if(!handedOff.current){clearTimeout(timer.current);setError(err.type==='peer-unavailable'?'That room is not available. Ask your friend to keep their room open.':'Could not connect to the room service. Check your connection and try again.');setStatus('idle');}});
 }
 const invite=room?`${location.origin}${location.pathname}?room=${room}`:'';
 async function copy(){try{await navigator.clipboard.writeText(invite);setCopied(true);setTimeout(()=>setCopied(false),2500);}catch{notify('Copy the invitation from the field below.');}}
 return <div className="room-page page-enter"><div className="section-eyebrow">BETTER WITH COMPANY</div><h1>A friendly rivalry.</h1><p className="page-subtitle">A private table. Your favorite opponent. Let the good games begin.</p><div className="room-layout"><div className="panel room-card"><span className="large-icon"><Users size={30}/></span><h2>Make room for a friend.</h2><p>Create a private room and send the invitation. You’ll play white, your friend will play black.</p>{status==='waiting'?<div className="invite-box"><span className="waiting-label"><span className="live-dot"/>Your table is ready</span><label htmlFor="invite-link">Share this invitation</label><div className="input-with-button"><input id="invite-link" readOnly value={invite} onFocus={e=>e.target.select()}/><button aria-label="Copy invitation" onClick={copy}>{copied?<Check size={18}/>:<Copy size={18}/>}</button></div><small>Keep this page open while your friend joins.</small><button className="text-button" onClick={()=>{peerRef.current?.destroy();setStatus('idle');setRoom('');}}>Close room</button></div>:<button className="button primary" disabled={status==='connecting'} onClick={()=>connect(true)}>{status==='connecting'?<Loader2 className="spin" size={18}/>:<Link2 size={18}/>} Create a private room <ArrowRight size={17}/></button>}</div><div className="panel room-card"><span className="large-icon green"><Link2 size={28}/></span><h2>Got an invitation?</h2><p>Enter your friend’s room code and meet them at the board.</p><form onSubmit={e=>{e.preventDefault();connect(false);}}><label htmlFor="room-code">ROOM CODE</label><input id="room-code" placeholder="Paste a room code or invite link" value={code} onChange={e=>{const value=e.target.value;try{setCode(new URL(value).searchParams.get('room')||value);}catch{setCode(value);}}}/><button className="button secondary" disabled={status==='connecting'||status==='waiting'} type="submit">Join their room <ArrowRight size={17}/></button></form></div></div>{error&&<p className="error-banner" role="alert">{error}</p>}<div className="room-footnote"><ShieldCheck size={18}/><span>Invite-only play · Live chat · No time pressure</span></div><p className="muted center small">Direct peer-to-peer play. Both players need to stay online. Some restricted networks may prevent a connection.</p></div>;
}
