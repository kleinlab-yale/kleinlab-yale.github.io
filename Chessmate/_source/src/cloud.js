import {createClient} from '@supabase/supabase-js';
import {newProfile} from './profile';
const config=window.CHESSMATE_CONFIG||{};
let client=null;
try { if(config.supabaseUrl&&config.supabasePublishableKey)client=createClient(config.supabaseUrl,config.supabasePublishableKey); } catch { console.warn('Chessmate account configuration needs a valid project URL and public key.'); }
export const cloud=client;
export const cloudConfigured=!!cloud;
export function checked(result){if(result.error)throw result.error;return result.data;}
export function playerCard(row){return row?{id:row.id,name:row.name,avatar:row.avatar,outfit:row.outfit,elo:row.elo,room:row.room_name}:null;}
export async function loadPlayer(user){
 const card=checked(await cloud.from('cm_players').select('*').eq('id',user.id).maybeSingle());
 if(!card)return null;
 const saved=checked(await cloud.from('cm_progress').select('data,revision').eq('owner_id',user.id).maybeSingle());
 const contacts=checked(await cloud.from('cm_friends').select('friend:cm_players!friend_id(*)').eq('owner_id',user.id));
 const fresh=newProfile(card.name,card.avatar);
 return {profile:{...fresh,...saved?.data,id:user.id,name:card.name,avatar:card.avatar,homeRoom:card.room_name,friends:contacts.map(row=>playerCard(row.friend))},revision:saved?.revision||0};
}
