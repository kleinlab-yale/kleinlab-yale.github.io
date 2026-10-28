import {inviteLink} from './rooms.js';
export function invitation(room,name,base) {return {title:`Play chess with ${name}`,text:`Come to ${name}’s chess home for a game. Open this link to join my waiting room.`,url:inviteLink(room,base)};}
export function invitationText(data) {return `${data.text}\n${data.url}`;}
export function messageLinks(data,nav={}) {
 const body=encodeURIComponent(invitationText(data));
 const ios=/iPhone|iPad|iPod/.test(nav.userAgent||'')||(/Mac/.test(nav.platform||'')&&nav.maxTouchPoints>1);
 return {sms:`sms:${ios?'&':'?'}body=${body}`,whatsapp:`https://wa.me/?text=${body}`,email:`mailto:?subject=${encodeURIComponent(data.title)}&body=${body}`};
}
export async function shareInvitation(data,nav=navigator) {if(!nav.share)return 'fallback';try{await nav.share(data);return 'shared';}catch(error){return error.name==='AbortError'?'cancelled':'fallback';}}
export async function copyInvitation(data,nav=navigator) {await nav.clipboard.writeText(invitationText(data));}
