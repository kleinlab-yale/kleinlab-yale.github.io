import {useState} from 'react';
import {ArrowRight,Loader2,LogIn,House,KeyRound,Eye,EyeOff} from 'lucide-react';
import {cloud} from './cloud';
import {normalizeUsername,validUsername,signInPlayer,signUpPlayer,authMessage} from './usernameAuth';

export default function AccountForm({account,onDone,onGuest,initialRoom=''}){
 const [mode,setMode]=useState('signin'),[username,setUsername]=useState(normalizeUsername(initialRoom)),[nickname,setNickname]=useState(''),[password,setPassword]=useState(''),[showPassword,setShowPassword]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const signup=mode==='signup',help=mode==='help';
 async function submit(e){
  e.preventDefault();setError('');
  if(!account.configured){setError('The club organizer is connecting accounts. You can play the computer as a guest for now.');return;}
  setBusy(true);
  try{
   if(signup)await signUpPlayer(cloud,{username,nickname,password});
   else await signInPlayer(cloud,username,password);
   setPassword('');onDone();
  }catch(err){setError(authMessage(err));}finally{setBusy(false);}
 }
 function switchMode(next){setMode(next);setPassword('');setShowPassword(false);setError('');}
 return <form className="account-form" onSubmit={submit}>
  {help?<KeyRound className="modal-icon"/>:<LogIn className="modal-icon"/>}
  <h2 id="modal-title">{help?'A little help getting home.':signup?'Make yourself at home.':'Welcome back, player.'}</h2>
  <p>{help?'Ask your parent or club organizer to help you get back into your account.':signup?'Pick a nickname, choose your room name, and make a password. That’s your very own place to play.':'Your username and password bring you back to your room, friends, and progress.'}</p>
  {!help&&<>
   <div className="username-benefits"><House size={15}/><span>Your username is your home room.</span></div>
   {signup&&<><label htmlFor="account-nickname">YOUR NICKNAME</label><input id="account-nickname" value={nickname} maxLength={24} required placeholder="What should we call you?" autoComplete="nickname" onChange={e=>setNickname(e.target.value)}/><small>A nickname is perfect. You don’t need your full name.</small></>}
   <label htmlFor="account-username">{signup?'CHOOSE YOUR USERNAME':'USERNAME'}</label>
   <div className="named-room-input"><span>@</span><input id="account-username" value={username} onChange={e=>setUsername(normalizeUsername(e.target.value))} maxLength={24} pattern="[a-z0-9][a-z0-9-]{1,23}" title="2–24 letters, numbers, or hyphens" required autoComplete="username" autoCapitalize="none" spellCheck="false" placeholder="emma"/></div>
   {signup&&<small className="username-room-preview">Your friends will visit <strong>@{username||'emma'}</strong>. Choose once; this name stays yours.</small>}
   <label htmlFor="account-password">{signup?'MAKE A PASSWORD':'PASSWORD'}</label>
   <div className="password-field"><input id="account-password" type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required autoComplete={signup?'new-password':'current-password'} aria-describedby={signup?'password-help':undefined}/><button type="button" aria-label={showPassword?'Hide password':'Show password'} aria-pressed={showPassword} onClick={()=>setShowPassword(show=>!show)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
   {signup&&<small id="password-help">Use at least 8 characters. Ask a grown-up to help you keep it somewhere safe.</small>}
   {!account.configured&&<p className="account-setup-notice" role="status">Preview · Accounts aren’t connected yet. Computer games are ready to play.</p>}
   {error&&<p className="error-banner" role="alert">{error}</p>}
   <button className="button primary full" disabled={busy||account.loading||!account.configured||!validUsername(username)}>{busy||account.loading?<Loader2 className="spin" size={16}/>:<ArrowRight size={16}/>} {signup?'Create my room':'Sign in'}</button>
   <div className="account-links"><button type="button" onClick={()=>switchMode(signup?'signin':'signup')}>{signup?'Already have a room? Sign in':'New here? Create your room'}</button><button type="button" onClick={()=>switchMode('help')}>Forgot password?</button></div>
  </>}
  {help&&<><div className="account-help-note"><KeyRound size={21}/><div><strong>Your room and progress stay yours.</strong><p>The club organizer can reset your password after checking with your parent. There’s no email account to check.</p></div></div><button type="button" className="button secondary full" onClick={()=>switchMode('signin')}>Back to sign in <ArrowRight size={16}/></button></>}
  {onGuest&&<button type="button" className="text-button guest-play" onClick={onGuest}>Play the computer as a guest</button>}
  <p className="profile-note"><KeyRound size={13}/>Just a Chessmate account. No email or other account needed.</p>
 </form>;
}
