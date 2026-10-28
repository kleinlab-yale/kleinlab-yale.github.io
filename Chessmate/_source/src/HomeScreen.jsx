import {ArrowRight,Share2,House,Loader2} from 'lucide-react';
import Avatar from './Avatar';
import Piece from './Piece';

export default function HomeScreen({profile,status,onComputer,onInvite,onReconnect,children}){
 const ready=status==='open';
 return <section className="chess-home page-enter">
  <header className="chess-home-heading">
   <Avatar id={profile.avatar} outfit={profile.outfit} size={78}/>
   <div><span className="home-eyebrow"><House size={15}/> MAKE YOURSELF AT HOME</span><h1>{profile.name}’s chess home<span>.</span></h1><p>Your friends. Your games. Your place at the board.</p></div>
   <div className={`home-presence ${ready?'ready':''}`} role="status">{ready?<><span/>Home is open</>:status==='opening'?<><Loader2 size={16} className="spin"/>Connecting…</>:<button onClick={onReconnect}>Reconnect home <ArrowRight size={15}/></button>}</div>
  </header>
  {children}
  <div className="home-play-options">
   <section className="home-play-card home-social-card"><div className="home-choice-icon"><Share2 size={27}/></div><div><h2>Play a friend</h2><p>Send an invite. When they arrive, choose Play.</p></div><button className="button primary" onClick={onInvite}><Share2 size={19}/>Send invite</button><small>Choose a person in your messaging app.</small></section>
   <section className="home-play-card home-computer-card"><div className="home-choice-icon"><Piece type="n" color="b"/></div><div><h2>Play computer</h2><p>A friendly practice game, whenever you like.</p></div><button className="button secondary" onClick={onComputer}>Choose a computer <ArrowRight size={19}/></button><small>Six personalities. A level for everyone.</small></section>
  </div>
 </section>;
}
