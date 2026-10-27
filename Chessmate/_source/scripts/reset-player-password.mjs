// Organizer-only utility. Never import this into the web app or publish a secret key.
import {createClient} from '@supabase/supabase-js';
import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {normalizeUsername,validUsername} from '../src/usernameAuth.js';
if(!process.stdin.isTTY){console.error('Run this utility in an interactive terminal. Passwords are entered privately.');process.exit(1);}
let muted=false;
const output=new Writable({write(chunk,encoding,done){if(!muted)process.stdout.write(chunk,encoding);done();}});
const prompt=createInterface({input:process.stdin,output,terminal:true});
async function hidden(label){process.stdout.write(label);muted=true;try{return await prompt.question('');}finally{muted=false;process.stdout.write('\n');}}
try{
 console.log('Organizer password reset. First confirm the player’s identity with their parent.');
 const username=normalizeUsername(await prompt.question('Player username: '));
 if(!validUsername(username))throw new Error('Invalid username.');
 const url=process.env.CHESSMATE_SUPABASE_URL||await prompt.question('Supabase project URL: ');
 const key=process.env.CHESSMATE_ADMIN_KEY||await hidden('Supabase secret/service-role key (hidden): ');
 const client=createClient(url.trim(),key.trim(),{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:player,error:lookup}=await client.from('cm_players').select('id,name,room_name').eq('room_name',username).single();
 if(lookup||!player)throw new Error('Could not find that player. Check the project and username.');
 const password=await hidden(`New password for @${username} (at least 8 characters): `);
 if(password.length<8)throw new Error('The password must have at least 8 characters.');
 if(await hidden('Repeat new password: ')!==password)throw new Error('The passwords did not match. Nothing was changed.');
 const {error}=await client.auth.admin.updateUserById(player.id,{password});
 if(error)throw new Error('The reset could not be completed. Check the project’s Auth settings.');
 console.log(`Password reset for @${username}. Share it privately with the parent. Their room and progress are unchanged.`);
}catch(error){console.error(error.message);process.exitCode=1;}finally{prompt.close();}
