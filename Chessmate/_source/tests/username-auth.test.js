import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loginAddress,normalizeUsername,validUsername,signInPlayer,signUpPlayer,authMessage} from '../src/usernameAuth.js';

test('username login is case-insensitive and cannot accept an email or another credential namespace',()=>{
 assert.equal(normalizeUsername(' @Emma '),'emma');
 assert.equal(loginAddress('EMMA'),'emma@players.chessmate.invalid');
 for(const value of ['a','someone@example.com','emma/else','emma space','éclair','x'.repeat(25)]){
  assert.equal(validUsername(value),false);assert.throws(()=>loginAddress(value));
 }
});
test('signup submits a nickname and a password without an OAuth, OTP, or email-delivery flow',async()=>{
 let request;
 const client={auth:{signUp:async args=>{request=args;return {data:{session:{access_token:'test-session'}},error:null};}}};
 await signUpPlayer(client,{username:'Emma',nickname:'Em',password:'test-only-password'});
 assert.equal(request.email,'emma@players.chessmate.invalid');assert.deepEqual(request.options,{data:{name:'Em'}});
 assert.equal(request.password,'test-only-password');
});
test('sign-in uses the same username mapping, and wrong credentials remain an error',async()=>{
 let request;const denial={code:'invalid_credentials'};
 const client={auth:{signInWithPassword:async args=>{request=args;return {data:null,error:denial};}}};
 await assert.rejects(signInPlayer(client,'Emma','wrong-password'),err=>err===denial);
 assert.equal(request.email,loginAddress('emma'));assert.match(authMessage(denial),/doesn’t match/);
});
test('misconfigured confirmation never reports a successful signup or exposes an internal alias',async()=>{
 const client={auth:{signUp:async()=>({data:{user:{id:'test-user'},session:null},error:null})}};
 await assert.rejects(signUpPlayer(client,{username:'emma',nickname:'Em',password:'test-only-password'}),error=>error.code==='email_not_confirmed');
 assert.match(authMessage({code:'email_not_confirmed'}),/club organizer/);
 assert.doesNotMatch(authMessage({message:'bad emma@players.chessmate.invalid'}),/@|invalid/);
});
