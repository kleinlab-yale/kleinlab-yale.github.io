import {useEffect,useRef,useState} from 'react';
import {cloud,cloudConfigured,checked,loadPlayer} from './cloud';
export default function useAccount(){
 const [user,setUser]=useState(null),[profile,setProfile]=useState(null),[loading,setLoading]=useState(cloudConfigured),[error,setError]=useState(''),[sync,setSync]=useState('');
 const loaded=useRef(false),revision=useRef(0),queue=useRef(Promise.resolve()),currentUser=useRef(null),lastLoaded=useRef(null),failed=useRef(false),lastQueued=useRef('');
 useEffect(()=>{
  if(!cloud)return;
  const {data:{subscription}}=cloud.auth.onAuthStateChange((event,session)=>{setUser(session?.user||null);});
  cloud.auth.getSession().then(({data,error})=>{if(error)setError(error.message);setUser(data.session?.user||null);if(!data.session)setLoading(false);});
  return()=>subscription.unsubscribe();
 },[]);
 useEffect(()=>{
  currentUser.current=user?.id;lastQueued.current='';loaded.current=false;failed.current=false;setProfile(null);setError('');setSync('');
  if(!user){setLoading(false);return;}
  let cancelled=false;setLoading(true);
  loadPlayer(user).then(result=>{if(cancelled)return;if(!result)throw new Error('Your room could not be loaded. Ask the club organizer to check account setup.');revision.current=result?.revision||0;lastLoaded.current=result?.profile||null;setProfile(result?.profile||null);loaded.current=true;setLoading(false);}).catch(err=>{if(!cancelled){setError(err.message);setLoading(false);}});
  return()=>{cancelled=true;};
 },[user?.id]);
 useEffect(()=>{
  if(!cloud||!user||!profile||!loaded.current||profile===lastLoaded.current)return;
  if(failed.current)return;
  const owner=user.id,data={...profile};delete data.friends;const serialized=JSON.stringify(data);if(serialized===lastQueued.current)return;lastQueued.current=serialized;setSync('Saving…');
  queue.current=queue.current.catch(()=>{}).then(async()=>{
   if(currentUser.current!==owner||failed.current)return;
   const next=checked(await cloud.rpc('cm_save_progress',{p_revision:revision.current,p_data:data}));revision.current=next;
   checked(await cloud.from('cm_players').update({name:profile.name,avatar:profile.avatar,outfit:profile.outfit,elo:profile.elo}).eq('id',owner));
   if(currentUser.current===owner)setSync('Saved to your account');
  }).catch(err=>{if(currentUser.current===owner){failed.current=true;setError(err.message);setSync('Not saved — keep this page open');}});
 },[profile,user?.id]);
 async function signOut(){await queue.current;checked(await cloud.auth.signOut());setProfile(null);setUser(null);}
 return {user,profile,setProfile,loading,error,sync,signOut,configured:cloudConfigured};
}
