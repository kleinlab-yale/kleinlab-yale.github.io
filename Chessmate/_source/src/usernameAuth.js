// Supabase manages passwords. This adapter gives players a username-only interface.
// .invalid is a reserved, non-deliverable namespace, never a child's email address.
const AUTH_DOMAIN='players.chessmate.invalid';
export const normalizeUsername=value=>String(value||'').trim().replace(/^@/,'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').toLowerCase().replace(/\s+/g,'-');
export const validUsername=value=>/^[a-z0-9][a-z0-9-]{1,23}$/.test(normalizeUsername(value));
export function loginAddress(value){
 const username=normalizeUsername(value);
 if(!validUsername(username))throw new Error('Please use a name with 2–24 letters or numbers. Spaces and hyphens are welcome.');
 return `${username}@${AUTH_DOMAIN}`;
}
export function authMessage(error){
 if(error?.code==='invalid_credentials')return 'That name or password doesn’t match. Try again.';
 if(['user_already_exists','email_exists','23505'].includes(error?.code))return 'That name is already taken. Try adding a last initial, like Emma K.';
 if(['email_not_confirmed','email_address_invalid','email_address_not_authorized','over_email_send_rate_limit'].includes(error?.code))return 'Sign-in needs to be connected by the person who set up Chessmate. Please try again later.';
 if(error?.status===429)return 'A few too many attempts. Wait a little, then try again.';
 if(error?.code==='weak_password')return 'Choose a longer password with at least 8 characters.';
 // Never surface an internal auth address, provider error, or server response to a child.
 return 'We couldn’t connect to your account. Please try again in a moment.';
}
export async function signInPlayer(client,username,password){
 const {data,error}=await client.auth.signInWithPassword({email:loginAddress(username),password});
 if(error)throw error;
 return data;
}
export async function signUpPlayer(client,{name,password}){
 const playerName=String(name||'').trim().replace(/\s+/g,' ').slice(0,24);
 if(password.length<8)throw {code:'weak_password'};
 const {data,error}=await client.auth.signUp({email:loginAddress(playerName),password,options:{data:{name:playerName}}});
 if(error)throw error;
 if(!data.session)throw {code:'email_not_confirmed'};
 return data;
}
