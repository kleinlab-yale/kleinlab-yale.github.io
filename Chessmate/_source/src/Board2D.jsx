import Piece from './Piece';
const NAMES={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
export default function Board2D({game,selected,legal,onSquare,flipped,lastMove}) {
 const ranks=flipped?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1], files=flipped?'hgfedcba':'abcdefgh';
 return <div className="board-frame"><div className="board-surface"><svg className="board-colors" viewBox="0 0 800 800" preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true"><rect width="800" height="800" fill="#eee4d3"/>{Array.from({length:64},(_,i)=>(Math.floor(i/8)+i%8)%2?<rect key={i} x={(i%8)*100} y={Math.floor(i/8)*100} width="100" height="100" fill="#ad98b8"/>:null)}</svg><div className="board-grid" role="group" aria-label="Chessboard">{ranks.flatMap((rank,ri)=>[...files].map((file,fi)=>{
 const square=file+rank,piece=game.get(square),target=legal.includes(square),check=piece?.type==='k'&&piece.color===game.turn()&&game.isCheck();
 return <button key={square} className={`square ${(ri+fi)%2?'dark':'light'} ${selected===square?'selected':''} ${lastMove&&(lastMove.from===square||lastMove.to===square)?'last-move':''} ${check?'in-check':''}`} onKeyDown={e=>{const delta={ArrowUp:-8,ArrowDown:8,ArrowLeft:-1,ArrowRight:1}[e.key];if(delta!==undefined){e.preventDefault();const i=ri*8+fi,next=i+delta;if(next>=0&&next<64&&(Math.abs(delta)===8||Math.floor(next/8)===ri))e.currentTarget.parentElement.children[next]?.focus();}}} onClick={()=>onSquare(square)} aria-label={`${square}${piece?` ${piece.color==='w'?'white':'black'} ${NAMES[piece.type]}`:''}${target?' legal move':''}`}>
 {fi===0&&<span className="rank-label">{rank}</span>}{ri===7&&<span className="file-label">{file}</span>}{piece&&<Piece type={piece.type} color={piece.color}/>} {target&&<span className={piece?'capture-ring':'move-dot'}/>}</button>;
 }))}</div></div></div>;
}
