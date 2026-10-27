import {chooseMove} from './engine.js';
self.onmessage=({data})=>{try{self.postMessage({id:data.id,move:chooseMove(data.fen,data.bot)});}catch(error){self.postMessage({id:data.id,error:error.message});}};
