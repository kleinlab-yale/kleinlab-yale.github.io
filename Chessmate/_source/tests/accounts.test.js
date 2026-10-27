import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text unique,raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid'; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
await db.exec(await readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8'));
const emma='00000000-0000-4000-8000-000000000001',lily='00000000-0000-4000-8000-000000000002',sam='00000000-0000-4000-8000-000000000003';
await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3),($4,$5,$6),($7,$8,$9)',[emma,'emma@players.chessmate.invalid',{name:'Emma'},lily,'lily@players.chessmate.invalid',{name:'Lily'},sam,'sam@players.chessmate.invalid',{name:'Sam'}]);
async function as(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec(id?'set role authenticated':'set role anon');}
async function action(name,target=null){return (await db.query('select public.cm_room_action($1,$2) as value',[name,target])).rows[0].value;}
after(()=>db.close());
let match;
test('signup reserves username and room atomically; players cannot impersonate or rename another account',async()=>{
 await as(emma);assert.equal((await db.query('select room_name from cm_players where id=$1',[emma])).rows[0].room_name,'emma');
 await assert.rejects(db.query('insert into cm_players(id,name,room_name) values($1,$2,$3)',[lily,'Imposter','fake']),/permission denied/);
 await as(lily);await assert.rejects(db.query("update cm_players set room_name='stolen' where id=$1",[emma]),/permission denied/);
 await db.exec('reset role');
 await assert.rejects(db.query('insert into auth.users(id,email) values(gen_random_uuid(),$1)',['emma@players.chessmate.invalid']),/unique constraint/);
 await assert.rejects(db.query('insert into auth.users(id,email) values(gen_random_uuid(),$1)',['child@example.com']),/Chessmate username/);
 await assert.rejects(db.query("update auth.users set email='renamed@players.chessmate.invalid' where id=$1",[emma]),/cannot be changed/);
 assert.equal((await db.query('select count(*)::integer as total from auth.users')).rows[0].total,3);
});
test('progress persists for its account and concurrent stale saves are rejected',async()=>{
 await as(emma);const result=await db.query('select cm_save_progress(0,$1::jsonb) as revision',[JSON.stringify({xp:120,coins:80,elo:816})]);assert.equal(result.rows[0].revision,1);
 await as(lily);assert.equal((await db.query('select * from cm_progress where owner_id=$1',[emma])).rows.length,0);
 await as(emma);assert.equal((await db.query('select data from cm_progress')).rows[0].data.xp,120);await assert.rejects(db.query("select cm_save_progress(0,'{}')"),/another device/);
 await assert.rejects(db.query("update cm_progress set data='{}'"),/permission denied/);
});
test('offline rooms remain addressable and guests wait until the authenticated owner accepts',async()=>{
 await as(emma);await action('online');await action('offline');
 await as(null);assert.equal((await db.query("select room_name from cm_players where room_name='emma'")).rows[0].room_name,'emma');await assert.rejects(db.query("select cm_room_action('online')"),/permission denied/);
 await as(lily);await action('join',emma);assert.equal((await db.query('select status from cm_visits')).rows[0].status,'waiting');assert.equal((await db.query('select * from cm_matches')).rows.length,0);
 await as(sam);await assert.rejects(action('accept',lily),/no longer waiting/);
 await as(emma);await action('online');match=await action('accept',lily);assert.ok(match);assert.equal((await db.query('select friend_id from cm_friends')).rows[0].friend_id,lily);
 await assert.rejects(action('accept',lily),/already in a game/);
});
test('only match members can read chat or submit events, and move order is enforced',async()=>{
 await as(sam);assert.equal((await db.query('select * from cm_matches')).rows.length,0);await assert.rejects(db.query('select cm_send_event($1,$2)',[match,{type:'resign'}]),/not in this match/);
 await as(lily);await assert.rejects(db.query('select cm_send_event($1,$2)',[match,{type:'move',before:'bad',after:'bad',ply:1,move:{from:'e7',to:'e5'}}]),/out of turn/);
 await as(emma);await assert.rejects(db.query('select cm_send_event($1,$2)',[match,{type:'move',move:{from:'e2',to:'e4'},after:'invalid missing state'}]),/out of turn/);await assert.rejects(db.query('select cm_send_event($1,$2)',[match,{type:'chat'}]),/Invalid message/);const before='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',after='rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
 await db.query('select cm_send_event($1,$2)',[match,{type:'move',before,after,ply:1,move:{from:'e2',to:'e4'}}]);await db.query('select cm_send_event($1,$2)',[match,{type:'chat',text:'Hello Lily'}]);
 await as(lily);assert.equal((await db.query('select * from cm_events')).rows.length,2);
 await as(sam);assert.equal((await db.query('select * from cm_events')).rows.length,0);await assert.rejects(db.query('insert into cm_events(match_id,sender_id,data) values($1,$2,$3)',[match,emma,{type:'resign'}]),/permission denied/);
});
test('saved friends receive persistent invitations, and a completed match releases the table',async()=>{
 await as(lily);await db.query('select cm_send_event($1,$2)',[match,{type:'resign'}]);await action('leave');
 await as(emma);await action('invite',lily);assert.equal((await db.query('select status from cm_matches where id=$1',[match])).rows[0].status,'finished');
 await as(lily);assert.equal((await db.query('select sender_id from cm_invites')).rows[0].sender_id,emma);await action('dismiss',emma);assert.equal((await db.query('select * from cm_invites')).rows.length,0);
 await as(sam);await assert.rejects(action('invite',emma),/Play together/);
});
