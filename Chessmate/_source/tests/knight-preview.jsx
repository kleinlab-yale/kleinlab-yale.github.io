import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Chess} from 'chess.js';
import pieceModel from '../src/pieceModel';
import Board3D from '../src/Board3D';
import '../src/styles.css';
function Study(){const mount=useRef();useEffect(()=>{
 const host=mount.current,renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xeeeae6);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;host.appendChild(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,30);camera.position.set(4.2,2.1,1.1);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.66,0);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=3;controls.maxDistance=7;controls.maxPolarAngle=Math.PI*.47;
 scene.add(new THREE.HemisphereLight(0xfff6e7,0x706281,2));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,7,4);light.castShadow=true;light.shadow.mapSize.set(2048,2048);light.shadow.camera.left=-4;light.shadow.camera.right=4;light.shadow.camera.top=4;light.shadow.camera.bottom=-4;light.shadow.bias=-.0003;scene.add(light);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:0xeeeae6,roughness:.9}));floor.rotation.x=-Math.PI/2;floor.position.y=-.005;floor.receiveShadow=true;scene.add(floor);
 for(const [color,z] of [['w',.82],['b',-.82]]){const model=pieceModel('n',color);model.position.z=z;scene.add(model);}
 const resize=new ResizeObserver(()=>{renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();});resize.observe(host);
 let frame;function animate(){frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}animate();
 return()=>{cancelAnimationFrame(frame);resize.disconnect();controls.dispose();scene.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});renderer.dispose();renderer.domElement.remove();};
},[]);return <div ref={mount} style={{height:'min(64vw,570px)',minHeight:310,borderRadius:18,overflow:'hidden'}} role="img" aria-label="White and black sculpted 3D knights, facing each other. Drag to view from another angle."/>;}
function Preview(){const [mode,setMode]=useState('knights'),[flipped,setFlipped]=useState(false),[selected,setSelected]=useState(null),[version,setVersion]=useState(0),game=useRef(new Chess()).current;const legal=selected?game.moves({square:selected,verbose:true}).map(move=>move.to):[];
 function choose(square){if(legal.includes(square)){game.move({from:selected,to:square});setSelected(null);setVersion(version+1);}else setSelected(game.get(square)?.color===game.turn()?square:null);}
 return <main style={{maxWidth:1000,margin:'0 auto',padding:'32px 25px'}}><span className="section-eyebrow">CHESSMATE · 3D PIECE STUDY</span><h1 style={{fontSize:34,margin:'10px 0'}}>A proper knight.</h1><p style={{fontSize:16,color:'#817389',marginBottom:22}}>A sculpted horse, from the base to the ears. Both sides face their opponent.</p><div style={{display:'flex',gap:10,marginBottom:22}}><button className={`button ${mode==='knights'?'primary':'secondary'}`} onClick={()=>setMode('knights')}>Knights close up</button><button className={`button ${mode==='board'?'primary':'secondary'}`} onClick={()=>setMode('board')}>Full board</button>{mode==='board'&&<button className="button secondary" onClick={()=>setFlipped(!flipped)}>Flip board</button>}</div>{mode==='knights'?<Study/>:<div style={{maxWidth:700,margin:'auto'}}><Board3D game={game} selected={selected} legal={legal} onSquare={choose} flipped={flipped} onFallback={()=>{}}/><p style={{fontSize:15,marginTop:15}}>{selected?`Selected ${selected}. Legal moves: ${legal.join(', ')}.`:'Click a piece to check its moves. Drag to orbit.'}</p></div>}<p style={{fontSize:13,color:'#8a7b91',marginTop:18}}>Rendered from the actual game models. Drag to rotate · Scroll to zoom.</p></main>;
}
createRoot(document.getElementById('root')).render(<Preview/>);
