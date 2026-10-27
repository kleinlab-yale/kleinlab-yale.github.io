import {useEffect,useRef} from 'react';
export default function useDialog(open,onClose){
 const closeRef=useRef(onClose);closeRef.current=onClose;
 useEffect(()=>{
  if(!open)return;const previous=document.activeElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  const dialog=document.querySelector('[role="dialog"]');
  const focusables=()=>[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')];
  const frame=requestAnimationFrame(()=>{const target=dialog.querySelector('input')||focusables()[0];target?.focus();});
  function keydown(e){if(e.key==='Escape'){e.preventDefault();closeRef.current?.();}if(e.key==='Tab'){const list=focusables();if(!list.length){e.preventDefault();return;}const first=list[0],last=list.at(-1);if(e.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){e.preventDefault();first.focus();}}}
  document.addEventListener('keydown',keydown);return()=>{cancelAnimationFrame(frame);document.removeEventListener('keydown',keydown);document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
 },[open]);
}
