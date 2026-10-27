import {Chess} from 'chess.js';
const VALUES={p:100,n:320,b:335,r:500,q:900,k:0};
function evaluate(game) {
 let score=0;
 for(const row of game.board()) for(const p of row) if(p) {
  const x=p.square.charCodeAt(0)-97,y=Number(p.square[1])-1;
  const advance=p.color==='w'?y:7-y,center=3.5-Math.max(Math.abs(x-3.5),Math.abs(y-3.5));
  const positional=p.type==='p'?advance*8+center*3:p.type==='n'||p.type==='b'?center*15:p.type==='k'?-center*8:center*3;
  score+=(VALUES[p.type]+positional)*(p.color==='w'?1:-1);
 }
 return score*(game.turn()==='w'?1:-1);
}
function order(moves) {return moves.sort((a,b)=>((VALUES[b.captured]||0)*10-(VALUES[b.piece]||0)+(b.promotion?800:0))-((VALUES[a.captured]||0)*10-(VALUES[a.piece]||0)+(a.promotion?800:0)));}
export function chooseMove(fen, bot, random=Math.random) {
 const game=new Chess(fen),moves=order(game.moves({verbose:true})); if(!moves.length)return null;
 if(random()<bot.blunder)return moves[Math.floor(random()*moves.length)].san;
 const deadline=Date.now()+1800;
 function search(depth,alpha,beta,ply){
  if(game.isCheckmate())return -100000+ply;
  if(game.isDraw())return 0;
  if(depth===0||Date.now()>deadline)return evaluate(game);
  let best=-Infinity;
  for(const move of order(game.moves({verbose:true}))){game.move(move);const score=-search(depth-1,-beta,-alpha,ply+1);game.undo();best=Math.max(best,score);alpha=Math.max(alpha,score);if(alpha>=beta)break;}
  return best;
 }
 let selected=moves[0].san,best=-Infinity;
 for(const move of moves){game.move(move);const score=-search(bot.depth-1,-Infinity,Infinity,1)+(random()-.5)*bot.noise;game.undo();if(score>best){best=score;selected=move.san;} }
 return selected;
}
