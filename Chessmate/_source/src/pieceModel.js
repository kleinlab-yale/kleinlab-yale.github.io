import * as THREE from 'three';

function addKnight(group, material, color) {
 const sculpture = new THREE.Group();
 // The sculpted profile points along local +X. White advances toward -Z;
 // black advances toward +Z. Rotate the whole sculpture, including its details.
 sculpture.rotation.y = color === 'w' ? Math.PI / 2 : -Math.PI / 2;
 group.add(sculpture);
 const detail = material.clone();
 detail.color.multiplyScalar(.48);
 detail.roughness = .55;
 const maneMaterial = material.clone();
 maneMaterial.color.multiplyScalar(.86);
 function solid(shape, depth, bevel, name, surface = material, z = 0) {
  const geometry = new THREE.ExtrudeGeometry(shape, {depth, steps:1, curveSegments:18,
   bevelEnabled:true, bevelThickness:bevel, bevelSize:bevel, bevelSegments:5});
  geometry.translate(0, 0, -depth / 2);
  const mesh = new THREE.Mesh(geometry, surface);
  mesh.name = name;mesh.position.z = z;mesh.castShadow = true;mesh.receiveShadow = true;
  sculpture.add(mesh);return mesh;
 }
 // One continuous shoulder, curved neck, jaw, forehead, and muzzle.
 // It meets the low collar directly: there is no pawn stem under the head.
 const horse = new THREE.Shape();
 horse.moveTo(-.25,.25);
 horse.quadraticCurveTo(-.04,.22,.21,.25);
 horse.bezierCurveTo(.21,.39,.10,.45,.045,.55);
 horse.bezierCurveTo(-.025,.65,-.015,.72,.055,.79);
 horse.quadraticCurveTo(.12,.82,.21,.79);
 horse.quadraticCurveTo(.29,.75,.37,.79);
 horse.quadraticCurveTo(.425,.815,.408,.89);
 horse.quadraticCurveTo(.40,.93,.34,.945);
 horse.bezierCurveTo(.25,.96,.22,1.035,.135,1.09);
 horse.quadraticCurveTo(.045,1.18,-.075,1.18);
 horse.quadraticCurveTo(-.19,1.18,-.245,1.085);
 horse.bezierCurveTo(-.33,.98,-.34,.84,-.30,.70);
 horse.bezierCurveTo(-.255,.54,-.25,.39,-.25,.25);
 solid(horse,.225,.055,'continuous-horse-neck-and-head');

 // A sculpted mane follows the back of the neck, rather than a separate cap.
 const mane = new THREE.Shape();
 mane.moveTo(-.235,.34);
 mane.bezierCurveTo(-.27,.57,-.40,.82,-.305,1.04);
 mane.quadraticCurveTo(-.25,1.18,-.13,1.195);
 mane.lineTo(-.10,1.155);
 mane.quadraticCurveTo(-.22,1.12,-.258,1.015);
 mane.bezierCurveTo(-.31,.83,-.24,.55,-.205,.36);
 mane.closePath();
 solid(mane,.09,.018,'carved-mane',maneMaterial);

 // Two distinct, forward-leaning ears with small recessed inner faces.
 for (const side of [-1,1]) {
  const ear = new THREE.Shape();
  ear.moveTo(-.19,1.145);
  ear.quadraticCurveTo(-.185,1.25,-.13,1.355);
  ear.quadraticCurveTo(-.112,1.38,-.095,1.345);
  ear.lineTo(-.048,1.16);ear.closePath();
  solid(ear,.042,.018,'horse-ear',material,side*.105);
  const inner = new THREE.Shape();
  inner.moveTo(-.155,1.185);inner.lineTo(-.126,1.315);inner.lineTo(-.09,1.185);inner.closePath();
  solid(inner,.006,.003,'inner-ear',maneMaterial,side*.146);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(.021,16,10),detail);
  eye.name = 'carved-eye';eye.scale.z = .34;eye.position.set(.105,1.063,side*.166);sculpture.add(eye);
  const nostril = new THREE.Mesh(new THREE.SphereGeometry(.016,12,8),detail);
  nostril.name = 'nostril';nostril.scale.set(1,.7,.32);nostril.position.set(.356,.878,side*.165);sculpture.add(nostril);
  const mouth = new THREE.CatmullRomCurve3([new THREE.Vector3(.23,.818,side*.168),new THREE.Vector3(.31,.812,side*.169),new THREE.Vector3(.375,.835,side*.16)]);
  const lip = new THREE.Mesh(new THREE.TubeGeometry(mouth,16,.004,6,false),maneMaterial);
  lip.name = 'muzzle-line';sculpture.add(lip);
 }
}

export default function pieceModel(type,color) {
 const group=new THREE.Group(),material=new THREE.MeshStandardMaterial({color:color==='w'?0xf5e9d4:0x655271,roughness:.32,metalness:.08});
 const mesh=(geometry,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
 if(type==='n') {
  const base=[[.01,0],[.29,0],[.33,.035],[.34,.095],[.32,.145],[.27,.19],[.25,.23],[.25,.275],[.02,.275]].map(([x,y])=>new THREE.Vector2(x,y));
  mesh(new THREE.LatheGeometry(base,40));
  addKnight(group,material,color);
  return group;
 }
 const height={p:.72,r:.95,b:1.15,q:1.32,k:1.42}[type];
 const points=[[.01,0],[.29,0],[.32,.05],[.32,.12],[.26,.17],[.23,.22],[.17,height*.33],[.12,height*.6],[.20,height*.66],[.20,height*.72],[.13,height*.76]].map(([x,y])=>new THREE.Vector2(x,y));
 mesh(new THREE.LatheGeometry(points,28));
 if(type==='p')mesh(new THREE.SphereGeometry(.20,24,16),0,height*.85);
 if(type==='b'){const top=mesh(new THREE.SphereGeometry(.18,24,16),0,height*.87);top.scale.y=1.45;mesh(new THREE.SphereGeometry(.055,12,8),0,height*1.12);}
 if(type==='r'){mesh(new THREE.CylinderGeometry(.26,.22,.22,24),0,height*.85);for(let i=0;i<6;i++){const a=i*Math.PI/3;const m=mesh(new THREE.BoxGeometry(.13,.16,.13),Math.cos(a)*.2,height*1.03,Math.sin(a)*.2);m.rotation.y=-a;}}
 if(type==='q'){mesh(new THREE.CylinderGeometry(.26,.13,.2,24),0,height*.85);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;mesh(new THREE.SphereGeometry(.052,12,8),Math.cos(a)*.21,height*.96,Math.sin(a)*.21);}mesh(new THREE.SphereGeometry(.09,16,10),0,height);}
 if(type==='k'){mesh(new THREE.SphereGeometry(.17,24,16),0,height*.84);mesh(new THREE.BoxGeometry(.09,.32,.09),0,height*1.03);mesh(new THREE.BoxGeometry(.26,.09,.09),0,height*1.06);}
 return group;
}
