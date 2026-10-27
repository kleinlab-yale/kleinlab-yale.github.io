import {ArrowRight,Users,ChartNoAxesCombined,Shirt} from 'lucide-react';
import Avatar from './Avatar';
import Piece from './Piece';
export default function HomeScreen({profile,onComputer,onFriend,onProgress,onWardrobe}){
 return <section className="simple-home page-enter">
  <div className="simple-welcome"><Avatar id={profile.avatar} outfit={profile.outfit} size={72}/><h1>Hello, {profile.name}.</h1><p>Who would you like to play?</p></div>
  <div className="play-choices">
   <button className="play-choice computer-choice" onClick={onComputer}><span className="choice-picture" aria-hidden="true"><Piece type="n" color="b"/></span><h2>Play computer</h2><p>Choose an opponent and difficulty.</p><span className="choice-action">Choose a computer <ArrowRight size={23}/></span></button>
   <button className="play-choice friend-choice" onClick={onFriend}><span className="choice-picture" aria-hidden="true"><Users size={64} strokeWidth={1.4}/></span><h2>Play a friend</h2><p>Invite someone, or visit their room.</p><span className="choice-action">Play with a friend <ArrowRight size={23}/></span></button>
  </div>
  <div className="simple-extras"><button onClick={onProgress}><ChartNoAxesCombined size={18}/>Your progress</button><button onClick={onWardrobe}><Shirt size={18}/>Your avatar</button></div>
 </section>;
}
