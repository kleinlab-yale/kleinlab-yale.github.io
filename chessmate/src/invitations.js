import {inviteLink} from './rooms.js';
export function invitation(room,name,base) {return {title:'A game of chess?',text:`Come play chess with ${name} in @${room}. Open the invitation, then tap Join room.`,url:inviteLink(room,base)};}
export async function shareInvitation(data,nav=navigator) {if(!nav.share)return 'fallback';try{await nav.share(data);return 'shared';}catch(error){return error.name==='AbortError'?'cancelled':'fallback';}}
export async function copyInvitation(data,nav=navigator) {await nav.clipboard.writeText(`${data.text}\n${data.url}`);}
