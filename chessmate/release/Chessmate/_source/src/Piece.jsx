export default function Piece({type,color}) {
 const paths={
 p:<><circle cx="22.5" cy="12" r="6"/><path d="M17 18h11l-2 8 4 8H15l4-8z"/><path d="M12 35h21v5H12z"/></>,
 r:<><path d="M11 6h6v6h4V6h4v6h4V6h6v13l-5 4 1 11H14l1-11-4-4z"/><path d="M11 35h24v5H11zM15 20h15"/></>,
 n:<><path d="M12 35c0-9 6-12 14-17l-7-1-4 5-6-4 7-12 10-3 8 8c-1 8 5 16 0 24z"/><path d="M10 36h27v4H10z"/><circle cx="24" cy="10" r="1.4" fill={color==='w'?'#584665':'#fff7e9'} stroke="none"/></>,
 b:<><path d="M22.5 5c-4 5-11 9-8 16l8.5 5 8.5-5c3-7-4-11-8.5-16z"/><path d="M25 10l-5 9M19 25l-3 9h14l-4-9M12 35h22v5H12z"/></>,
 q:<><circle cx="8" cy="10" r="2.4"/><circle cx="22.5" cy="6" r="2.4"/><circle cx="37" cy="10" r="2.4"/><path d="M8 13l6 16h17l6-16-10 7-4.5-11L18 20zM16 29l-3 6h20l-3-6M10 36h26v4H10z"/></>,
 k:<><path d="M22.5 3v11M18 7h9"/><path d="M22.5 15C14 6 7 17 12 23l5 7h11l5-7c5-6-2-17-10.5-8zM17 30l-3 5h17l-3-5M11 36h23v4H11z"/></>
 };
 return <svg className={`chess-piece piece-${color}`} viewBox="0 0 45 45" aria-hidden="true"><g fill={color==='w'?'#fff8e9':'#51445c'} stroke={color==='w'?'#786887':'#30253a'} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">{paths[type]}</g></svg>;
}
