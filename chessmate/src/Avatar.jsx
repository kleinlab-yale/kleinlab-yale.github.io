import {BOTS,OUTFITS} from './data';
export default function Avatar({id='june',outfit='classic',size=48,className=''}) {
 const b=BOTS.find(b=>b.id===id)||BOTS[1],style=b.style;
 return <span className={`avatar ${className}`} style={{width:size,height:size,background:b.color}}>
 <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="60" fill={b.color}/>
 {(style===1||style===3)&&<path d="M28 66C12 9 98 4 96 65L101 103H20Z" fill={b.hair}/>}
 <path d="M13 125C13 84 38 83 60 83S107 85 108 125" fill={b.shirt}/><path d="M49 75v15c7 8 16 8 22 0V75" fill={b.skin}/><path d="M49 77v8c10 5 17 3 22-1V74" fill="#000" opacity=".08"/>
 <ellipse cx="35" cy="55" rx="6" ry="9" fill={b.skin}/><ellipse cx="85" cy="55" rx="6" ry="9" fill={b.skin}/><path d="M34 39C34 14 86 14 86 39V59C85 80 71 87 60 87S35 78 34 59Z" fill={b.skin}/>
 {style===0&&<path d="M30 47C25 34 34 22 38 23C38 8 66 13 70 19C90 14 96 37 86 48L80 35C64 42 52 24 41 38L38 49Z" fill={b.hair}/>}
 {style===1&&<path d="M30 46C25 15 71 10 86 30L90 56L79 37C58 53 40 37 37 46Z" fill={b.hair}/>}
 {style===2&&<path d="M31 48L31 28Q46 8 73 19Q90 20 89 43L82 48L78 31Q52 46 37 38L38 49Z" fill={b.hair}/>}
 {style===3&&<><path d="M30 56C16 11 79 6 90 38L91 63L80 40L74 28Q60 52 38 44L38 64Z" fill={b.hair}/><circle cx="37" cy="68" r="4" fill="#e8c481"/><circle cx="83" cy="68" r="4" fill="#e8c481"/></>}
 {style===4&&<path d="M31 48Q25 32 36 25L30 17L48 20L56 11L67 19L82 16L87 28Q95 36 85 48L78 34L40 39L37 50Z" fill={b.hair}/>}
 {style===5&&<path d="M31 56Q20 28 41 19Q73 4 88 31L90 59L80 47L81 31Q65 54 40 44L38 59Z" fill={b.hair}/>}
 <path d="M43 51l9-1m16 0l8 1" fill="none" stroke={b.hair} strokeWidth="2.3" strokeLinecap="round"/><ellipse cx="48" cy="58" rx="2.2" ry="3" fill="#302b30"/><ellipse cx="72" cy="58" rx="2.2" ry="3" fill="#302b30"/><path d="M59 59l-2 8h5" fill="none" stroke="#754b3c" opacity=".4" strokeWidth="1.5" strokeLinecap="round"/><path d="M52 74q8 6 16-1" stroke="#7e4a40" strokeWidth="2" fill="none" strokeLinecap="round"/>
 {style===2&&<g fill="none" stroke="#373743" strokeWidth="2"><rect x="38" y="51" width="20" height="15" rx="5"/><rect x="63" y="51" width="20" height="15" rx="5"/><path d="M58 56h5"/></g>}
 <path d="M43 89l17 14 17-14" fill="none" stroke="#fff" opacity=".25" strokeWidth="3"/>
 </svg>{outfit!=='classic'&&<span className="outfit-decoration">{OUTFITS.find(o=>o.id===outfit)?.icon}</span>}</span>;
}
