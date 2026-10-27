import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

function pieceModel(type,color) {
 const group=new THREE.Group(),material=new THREE.MeshStandardMaterial({color:color==='w'?0xf5e9d4:0x655271,roughness:.32,metalness:.08});
 const mesh=(geometry,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
 const height={p:.72,r:.95,n:1.12,b:1.15,q:1.32,k:1.42}[type];
 const points=[[.01,0],[.29,0],[.32,.05],[.32,.12],[.26,.17],[.23,.22],[.17,height*.33],[.12,height*.6],[.20,height*.66],[.20,height*.72],[.13,height*.76]].map(([x,y])=>new THREE.Vector2(x,y));
 mesh(new THREE.LatheGeometry(points,28));
 if(type==='p')mesh(new THREE.SphereGeometry(.20,24,16),0,height*.85);
 if(type==='b'){const top=mesh(new THREE.SphereGeometry(.18,24,16),0,height*.87);top.scale.y=1.45;mesh(new THREE.SphereGeometry(.055,12,8),0,height*1.12);}
 if(type==='r'){mesh(new THREE.CylinderGeometry(.26,.22,.22,24),0,height*.85);for(let i=0;i<6;i++){const a=i*Math.PI/3;const m=mesh(new THREE.BoxGeometry(.13,.16,.13),Math.cos(a)*.2,height*1.03,Math.sin(a)*.2);m.rotation.y=-a;}}
 if(type==='q'){mesh(new THREE.CylinderGeometry(.26,.13,.2,24),0,height*.85);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;mesh(new THREE.SphereGeometry(.052,12,8),Math.cos(a)*.21,height*.96,Math.sin(a)*.21);}mesh(new THREE.SphereGeometry(.09,16,10),0,height);}
 if(type==='k'){mesh(new THREE.SphereGeometry(.17,24,16),0,height*.84);mesh(new THREE.BoxGeometry(.09,.32,.09),0,height*1.03);mesh(new THREE.BoxGeometry(.26,.09,.09),0,height*1.06);}
 if(type==='n'){
 const shape=new THREE.Shape();shape.moveTo(-.2,0);shape.lineTo(.22,0);shape.quadraticCurveTo(.26,.45,.04,.7);shape.lineTo(-.07,.76);shape.lineTo(-.06,.59);shape.lineTo(-.3,.42);shape.lineTo(-.28,.28);shape.lineTo(-.05,.34);shape.quadraticCurveTo(.07,.25,-.2,0);
 const head=mesh(new THREE.ExtrudeGeometry(shape,{depth:.2,bevelEnabled:true,bevelThickness:.045,bevelSize:.04,bevelSegments:3,steps:1}),0,height*.51,-.1);head.rotation.y=color==='w'?Math.PI/2:-Math.PI/2;
 }
 return group;
}
export default function Board3D({game,selected,legal,onSquare,flipped,lastMove,onFallback}) {
 const mount=useRef(), sceneRef=useRef(), callback=useRef(onSquare),[failed,setFailed]=useState(false);callback.current=onSquare;
 useEffect(()=>{
  const container=mount.current;let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{setFailed(true);return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.setClearColor(0xede9e6,1);container.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(39,1,.1,100);camera.position.set(0,10,11.7);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,0);controls.enableDamping=true;controls.minDistance=9;controls.maxDistance=20;controls.maxPolarAngle=Math.PI*.43;controls.minPolarAngle=.18;controls.enablePan=false;
  scene.add(new THREE.HemisphereLight(0xfff6e7,0x706281,1.8));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-5,12,5);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-7,right:7,top:7,bottom:-7});light.shadow.bias=-.001;scene.add(light);
  const board=new THREE.Group(),pieces=new THREE.Group(),squares=[];scene.add(board,pieces);
  const base=new THREE.Mesh(new THREE.BoxGeometry(8.4,.28,8.4),new THREE.MeshStandardMaterial({color:0x45364f,roughness:.5}));base.position.y=-.2;base.receiveShadow=true;scene.add(base);
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){const square=String.fromCharCode(97+x)+(8-y);const material=new THREE.MeshStandardMaterial({color:(x+y)%2?0xa593b4:0xf2e7d8,roughness:.65});const tile=new THREE.Mesh(new THREE.BoxGeometry(1,.08,1),material);tile.position.set(x-3.5,-.02,y-3.5);tile.userData={square,original:material.color.getHex()};tile.receiveShadow=true;board.add(tile);squares.push(tile);}
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down;
  const pointerdown=e=>{down={x:e.clientX,y:e.clientY};};const pointerup=e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects([...squares,...pieces.children],true);if(hits.length){let o=hits[0].object;while(o&&!o.userData.square)o=o.parent;if(o)callback.current(o.userData.square);}};
  renderer.domElement.addEventListener('pointerdown',pointerdown);renderer.domElement.addEventListener('pointerup',pointerup);
  const resize=new ResizeObserver(()=>{const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});resize.observe(container);
  let frame;function animate(){frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}animate();
  sceneRef.current={scene,camera,controls,pieces,squares};
  return()=>{cancelAnimationFrame(frame);resize.disconnect();controls.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material) o.material.dispose();});renderer.dispose();renderer.domElement.removeEventListener('pointerdown',pointerdown);renderer.domElement.removeEventListener('pointerup',pointerup);renderer.domElement.remove();sceneRef.current=null;};
 },[]);
 const fen=game.fen();
 useEffect(()=>{const ctx=sceneRef.current;if(!ctx)return;while(ctx.pieces.children.length){const old=ctx.pieces.children[0];old.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});ctx.pieces.remove(old);}for(const row of game.board())for(const p of row)if(p){const model=pieceModel(p.type,p.color);model.position.set(p.square.charCodeAt(0)-97-3.5,.03,8-Number(p.square[1])-3.5);model.userData.square=p.square;ctx.pieces.add(model);}for(const tile of ctx.squares){const s=tile.userData.square;tile.material.color.setHex(selected===s?0xc7a65a:legal.includes(s)?0xa9be92:lastMove&&(s===lastMove.from||s===lastMove.to)?0xc0b27c:tile.userData.original);}},[fen,selected,legal.join(','),lastMove]);
 useEffect(()=>{const ctx=sceneRef.current;if(ctx){ctx.camera.position.set(0,10,flipped?-11.7:11.7);ctx.controls.update();}},[flipped]);
 return <div className="board-three-wrap"><div className="board-three" ref={mount} role="img" aria-label="Interactive 3D chessboard. Drag to orbit, scroll to zoom, click pieces to move."/>{failed?<div className="three-error">Your browser could not start 3D rendering.<button className="button primary" onClick={onFallback}>Use the 2D board</button></div>:<span className="orbit-hint">Drag to orbit · Scroll to zoom · Click to move</span>}</div>;
}
