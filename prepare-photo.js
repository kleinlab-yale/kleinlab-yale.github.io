(() => {
  const $ = id => document.getElementById(id);
  const input = $('photo'), status = $('status'), error = $('error'), result = $('result');
  const canvas = $('crop-preview'), download = $('download');
  const controls = ['aspect','zoom','horizontal','vertical','filter'];
  let image, filename, fileSize, outputUrl, revision = 0, timer, frame, drag;
  const size = bytes => `${(bytes / 1000000).toFixed(2)} MB`;
  const settings = () => ({aspect:$('aspect').value,zoom:Number($('zoom').value),x:Number($('horizontal').value)/100,y:Number($('vertical').value)/100,filter:$('filter').value});
  const crop = () => {
    const s=settings(), iw=image.naturalWidth, ih=image.naturalHeight;
    const ratio=s.aspect==='original'?iw/ih:Number(s.aspect);
    let w=iw,h=w/ratio;if(h>ih){h=ih;w=h*ratio;}
    w/=s.zoom;h/=s.zoom;
    return {x:(iw-w)*s.x,y:(ih-h)*s.y,w,h};
  };
  const filters={original:[1,1,1,0,0],bright:[1.12,1.04,1.06,0,0],warm:[1.04,1.02,1.08,13,0],cool:[1.02,1.03,1,-12,0],mono:[1,1.1,0,0,0],vintage:[1.04,0.93,0.75,8,0.35]};
  const filterPixels = (target,name) => {
    if(name==='original')return;
    const [brightness,contrast,saturation,warm,sepia]=filters[name];
    const ctx=target.getContext('2d'),pixels=ctx.getImageData(0,0,target.width,target.height),d=pixels.data;
    for(let i=0;i<d.length;i+=4){
      let r=d[i],g=d[i+1],b=d[i+2];const gray=0.2126*r+0.7152*g+0.0722*b;
      r=gray+(r-gray)*saturation;g=gray+(g-gray)*saturation;b=gray+(b-gray)*saturation;
      if(sepia){const a=r,c=g,e=b;r=a*(1-sepia)+(a*.393+c*.769+e*.189)*sepia;g=c*(1-sepia)+(a*.349+c*.686+e*.168)*sepia;b=e*(1-sepia)+(a*.272+c*.534+e*.131)*sepia;}
      d[i]=((r*brightness-128)*contrast+128)+warm;
      d[i+1]=(g*brightness-128)*contrast+128;
      d[i+2]=((b*brightness-128)*contrast+128)-warm;
    }
    ctx.putImageData(pixels,0,0);
  };
  const draw = (target,maxEdge) => {
    const c=crop(),scale=Math.min(1,maxEdge/Math.max(c.w,c.h));
    target.width=Math.max(1,Math.round(c.w*scale));target.height=Math.max(1,Math.round(c.h*scale));
    const ctx=target.getContext('2d');if(!ctx)throw new Error('Image editing is unavailable in this browser. Try Safari or Chrome.');
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,target.width,target.height);
    ctx.drawImage(image,c.x,c.y,c.w,c.h,0,0,target.width,target.height);
    filterPixels(target,$('filter').value);
  };
  const encode = target => new Promise((resolve,reject)=>target.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not create the JPEG. Please try again.')),'image/jpeg',0.82));
  const showError = failure => {error.textContent=failure.message||'Please try another photo.';error.hidden=false;status.textContent='Photo preparation was not completed.';};
  const exportPhoto = async version => {
    try {
      const output=document.createElement('canvas');let edge=1800,blob;
      for(let attempt=0;attempt<8;attempt++){draw(output,edge);blob=await encode(output);if(version!==revision)return;if(blob.size<=1800000)break;edge*=.75;}
      if(blob.size>1800000)throw new Error('This photo could not be made small enough. Try another photo.');
      if(outputUrl)URL.revokeObjectURL(outputUrl);
      outputUrl=URL.createObjectURL(blob);download.href=outputUrl;
      download.download=`${filename.replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,60)||'lab-photo'}-web.jpg`;
      download.removeAttribute('aria-disabled');download.textContent='Save edited JPEG';
      $('sizes').textContent=`${size(fileSize)} → ${size(blob.size)} · ${output.width} × ${output.height} pixels`;
      result.hidden=false;status.textContent='Ready. Save the edited JPEG, then upload that copy in CMS.';
    }catch(failure){if(version===revision)showError(failure);}
  };
  const update = () => {
    if(!image)return;
    const version=++revision;clearTimeout(timer);cancelAnimationFrame(frame);
    download.removeAttribute('href');download.setAttribute('aria-disabled','true');download.textContent='Preparing JPEG…';
    error.hidden=true;status.textContent='Updating your photo…';
    frame=requestAnimationFrame(()=>{try{draw(canvas,640);}catch(failure){showError(failure);}});
    timer=setTimeout(()=>exportPhoto(version),250);
    $('zoom-value').textContent=`${Number($('zoom').value).toFixed(1)}×`;
  };
  const reset = () => {$('aspect').value='original';$('zoom').value='1';$('horizontal').value='50';$('vertical').value='50';$('filter').value='original';update();};
  input.addEventListener('change',async()=>{
    const version=++revision;clearTimeout(timer);cancelAnimationFrame(frame);image=null;result.hidden=true;$('editor').hidden=true;error.hidden=true;
    if(outputUrl){URL.revokeObjectURL(outputUrl);outputUrl=null;}
    const file=input.files[0];if(!file){status.textContent='Choose a photo to get started.';return;}
    status.textContent='Opening your photo…';const url=URL.createObjectURL(file);
    try{
      const next=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('This browser could not open the photo. Try a JPEG, PNG, or WebP copy.'));img.src=url;});
      if(version!==revision)return;
      image=next;filename=file.name;fileSize=file.size;$('editor').hidden=false;reset();
    }catch(failure){if(version===revision)showError(failure);}finally{URL.revokeObjectURL(url);}
  });
  controls.forEach(id=>$(id).addEventListener('input',update));
  $('reset').addEventListener('click',reset);
  canvas.addEventListener('pointerdown',event=>{if(!image)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,h:Number($('horizontal').value),v:Number($('vertical').value),c:crop(),rect:canvas.getBoundingClientRect()};canvas.setPointerCapture(event.pointerId);});
  canvas.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;const rangeX=image.naturalWidth-drag.c.w,rangeY=image.naturalHeight-drag.c.h;
    $('horizontal').value=rangeX?Math.max(0,Math.min(100,drag.h-dx/drag.rect.width*drag.c.w/rangeX*100)):50;
    $('vertical').value=rangeY?Math.max(0,Math.min(100,drag.v-dy/drag.rect.height*drag.c.h/rangeY*100)):50;update();});
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,()=>{drag=null;}));
})();
