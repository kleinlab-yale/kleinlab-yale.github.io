import {useState} from 'react';
import {ArrowRight,Loader2,KeyRound,Eye,EyeOff,ArrowLeft} from 'lucide-react';
import {cloud} from './cloud';
import {validUsername,signInPlayer,signUpPlayer,authMessage} from './usernameAuth';
export default function AccountForm({account,onDone,initialRoom=''}){
 const [mode,setMode]=useState('signup'),[name,setName]=useState(initialRoom),[password,setPassword]=useState(''),[showPassword,setShowPassword]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const signup=mode==='signup',help=mode==='help';
 function changeMode(next){setMode(next);setPassword('');setShowPassword(false);setError('');}
 async function submit(event){event.preventDefault();setError('');if(!account.configured)return;setBusy(true);try{
  if(signup)await signUpPlayer(cloud,{name,password});else await signInPlayer(cloud,name,password);
  setPassword('');onDone();
 }catch(error){setError(authMessage(error));}finally{setBusy(false);}}
 if(help)return <div className="account-form simple-account-form"><KeyRound className="modal-icon"/><h2 id="modal-title">Forgot your password?</h2><p>Your parent or the person who set up Chessmate can help you reset it. Your room and progress will stay saved.</p><button className="button secondary full" onClick={()=>changeMode('signin')}><ArrowLeft size={19}/>Back to sign in</button></div>;
 return <form className="account-form simple-account-form" onSubmit={submit}>
  <h2 id="modal-title">{signup?'Let’s play chess.':'Welcome back.'}</h2>
  <div className="account-mode" aria-label="Account options"><button type="button" aria-pressed={signup} className={signup?'active':''} onClick={()=>changeMode('signup')}>Create account</button><button type="button" aria-pressed={!signup} className={!signup?'active':''} onClick={()=>changeMode('signin')}>Sign in</button></div>
  <label htmlFor="account-name">Your name</label><input id="account-name" value={name} onChange={event=>setName(event.target.value)} maxLength={24} required autoComplete="username" autoCapitalize="words" spellCheck="false" placeholder="Emma" aria-describedby="one-name-help"/>
  <p id="one-name-help" className="one-name-help">{name&&!validUsername(name)?'Use 2–24 letters, numbers, or spaces.':signup?'This will also be your room name.':'Use the name you chose for your room.'}</p>
  <label htmlFor="account-password">{signup?'Create a password':'Your password'}</label><div className="password-field"><input id="account-password" type={showPassword?'text':'password'} value={password} onChange={event=>setPassword(event.target.value)} minLength={8} required autoComplete={signup?'new-password':'current-password'} placeholder={signup?'At least 8 characters':undefined}/><button type="button" aria-label={showPassword?'Hide password':'Show password'} aria-pressed={showPassword} onClick={()=>setShowPassword(show=>!show)}>{showPassword?<EyeOff size={21}/>:<Eye size={21}/>}</button></div>
  {error&&<p className="error-banner" role="alert">{error}</p>}{!account.configured&&<p className="account-setup-notice">Accounts are being connected. Please try again shortly.</p>}
  <button className="button primary full account-submit" disabled={busy||account.loading||!account.configured||!validUsername(name)}>{busy||account.loading?<Loader2 className="spin" size={21}/>:null}{signup?'Start playing':'Sign in'}<ArrowRight size={21}/></button>
  {!signup&&<button type="button" className="forgot-password" onClick={()=>changeMode('help')}>Forgot password?</button>}
 </form>;
}
