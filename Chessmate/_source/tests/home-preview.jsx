// Local-only UI exercise. Uses browser storage, never Supabase. Not part of the Vite build.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from '../src/App';
import {newProfile} from '../src/profile';
import '../src/styles.css';
const people={emma:{...newProfile('Emma','june'),id:'emma',homeRoom:'emma',room:'emma'},lily:{...newProfile('Lily','cleo'),id:'lily',homeRoom:'lily',room:'lily'}};
const user=new URLSearchParams(location.search).get('as')==='lily'?'lily':'emma',key='chessmate-local-ui-check';
const blank=()=>({visits:{},invites:{},friends:{emma:[],lily:[]},matches:[],events:{}});
const read=()=>JSON.parse(localStorage.getItem(key)||'null')||blank();
function write(fn){const data=read();fn(data);localStorage.setItem(key,JSON.stringify(data));}
function usePreviewAccount(){const [profile,setProfile]=useState(people[user]);return {profile,setProfile,user:{id:user},configured:true,error:'',loading:false,signOut:()=>{}};}
class PreviewChannel{
 constructor(match){this.match=match;this.matchId=match.id;this.peer=match.host===user?match.guest:match.host;this.listeners=new Map();this.open=true;this.cursor=0;this.timer=setInterval(()=>this.poll(),150);}
 on(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);}
 off(type,fn){this.listeners.get(type)?.delete(fn);}
 poll(){const events=read().events[this.match.id]||[];for(const event of events.slice(this.cursor)){this.cursor++;if(event.user!==user){if(event.type==='leave')this.close();else for(const fn of this.listeners.get('data')||[])fn(event);}}}
 send(data){write(state=>{(state.events[this.match.id]||=[]).push({...data,user});});}
 finish(){write(state=>{state.matches.find(item=>item.id===this.match.id).status='finished';});}
 async leave(){this.send({type:'leave'});this.finish();this.close();}
 close(){if(!this.open)return;this.open=false;clearInterval(this.timer);for(const fn of this.listeners.get('close')||[])fn();}
}
class PreviewRooms{
 constructor(options){Object.assign(this,options);this.state={home:user,homeStatus:'closed',guests:[],visit:null,invitations:[],error:'',inviting:'',starting:'',returning:false,sentInvites:[]};this.active=null;this.seen=new Set();this.timer=setInterval(()=>this.poll(),200);}
 update(patch){Object.assign(this.state,patch);this.onChange({...this.state});}
 open(){this.update({homeStatus:'open'});this.onHome(user);this.poll();return true;}
 poll(){const data=read();this.onFriends((data.friends[user]||[]).map(id=>people[id]));this.update({guests:Object.entries(data.visits).filter(([id,target])=>target===user).map(([id])=>({id,player:people[id]})),invitations:(data.invites[user]||[]).map(id=>({player:people[id]}))});const match=data.matches.find(item=>item.status==='active'&&[item.host,item.guest].includes(user));if(match&&!this.active&&!this.seen.has(match.id)){this.seen.add(match.id);this.active=new PreviewChannel(match);this.update({sentInvites:[],visit:null});this.onStart({connection:this.active,opponent:people[this.active.peer],isHost:match.host===user,managed:true,matchId:match.id,history:[]});}}
 join(name){const target=name.includes('?')?new URL(name).searchParams.get('room'):name.toLowerCase();if(!people[target]||target===user){this.update({error:'Choose the other preview player: Emma or Lily.'});return;}write(data=>{data.visits[user]=target;});this.visiting=people[target];this.update({visit:{room:target,player:people[target],status:'waiting'},error:''});}
 accept(id){write(data=>{delete data.visits[id];data.matches.push({id:crypto.randomUUID(),host:user,guest:id,status:'active'});data.friends[user]=[...new Set([...data.friends[user],id])];data.friends[id]=[...new Set([...data.friends[id],user])];});this.poll();}
 decline(id){write(data=>{delete data.visits[id];});this.poll();}
 async leaveVisit(){write(data=>{delete data.visits[user];});this.visiting=null;this.update({visit:null});}
 async endGame(){this.update({returning:true});await this.active?.leave();this.active=null;await this.leaveVisit();this.update({returning:false});this.poll();}
 async invite(friend){write(data=>{data.invites[friend.id]=[...new Set([...(data.invites[friend.id]||[]),user])];});this.update({sentInvites:[...new Set([...this.state.sentInvites,friend.id])]});return true;}
 dismissInvite(id){write(data=>{data.invites[user]=(data.invites[user]||[]).filter(person=>person!==id);});this.poll();}
 closeHome(){this.update({homeStatus:'closed'});}
 destroy(){clearInterval(this.timer);this.active?.close();}
}
function Preview(){return <><div style={{padding:'7px 16px',fontSize:12,background:'#eadfbd',textAlign:'center'}}>Local interaction preview · {people[user].name} · No online account created <button style={{marginLeft:18,textDecoration:'underline'}} onClick={()=>{localStorage.removeItem(key);location.reload();}}>Reset preview</button></div><App usePlayerAccount={usePreviewAccount} RoomSession={PreviewRooms}/></>;}
createRoot(document.getElementById('root')).render(<Preview/>);
