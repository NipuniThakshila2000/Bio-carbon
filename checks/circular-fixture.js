'use strict';
// Deterministic frame scheduling applies only to this isolated QA fixture.
if(new URLSearchParams(location.search).has('test')){
 window.requestAnimationFrame=callback=>setTimeout(()=>callback(performance.now()),16);
 window.cancelAnimationFrame=token=>clearTimeout(token);
}
const fixtureConfiguration={
 mode:'illustrative',
 stages:Array.from({length:6},(_,index)=>({
  heading:`QA ${index+1}`,
  explanation:`Synthetic state ${index+1}. Not BCF LANKA copy.`,
  images:[index===0?'../assets/process/waste-input.png':index===1?'../assets/process/sorting-preparation.png':index===2?'../assets/process/shredding.png':index===3?'../assets/process/thermal-conversion.png':index===4?'../assets/process/resource-recovery.png':'../assets/process/recovered-outputs.png']
 }))
};
window.fixture=new window.BCFCircularProcess(document.querySelector('#qa-process'),fixtureConfiguration);
window.fixtureReady=window.fixture.ready.then(()=>{document.body.dataset.fixture='ready';});
if(new URLSearchParams(location.search).has('test')){
 const report=document.createElement('pre');report.id='results';report.style.cssText='white-space:pre-wrap;padding:25px';document.body.append(report);
 const log=text=>{report.textContent+=`${text}\n`;};
 const assert=(value,message)=>{if(!value)throw new Error(message);};
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),frame=()=>pause(80);
 (async()=>{
  try{
   await window.fixtureReady;
   const control=window.fixture,root=control.root,marker=control.marker;
   assert(control.loaded,'Image decode/preload failed');
   assert(root.querySelectorAll('.process-viewer').length===1,'Exactly one central viewer');
   assert(root.querySelectorAll('.process-marker').length===1,'Exactly one marker');
   assert(!document.querySelector('input[type=range]'),'No horizontal slider');
   assert(root.querySelectorAll('.process-segment').length===80,'Full circular segmented track');
   assert(root.querySelectorAll('.process-image-layer').length===6,'Six stage images');
   log('PASS one viewer, one marker, full segmented ring, no horizontal slider');
   // Browser policy blocks pointer capture for synthetic untrusted events only.
   const nativeCapture=marker.setPointerCapture.bind(marker);
   marker.setPointerCapture=id=>{if(id!==91&&id!==92)nativeCapture(id);};
   const position=progress=>{
    const rect=control.orbit.getBoundingClientRect(),angle=(-90+progress*360)*Math.PI/180;
    return{x:rect.left+rect.width/2+rect.width*260/600*Math.cos(angle),y:rect.top+rect.height/2+rect.height*260/600*Math.sin(angle)};
   };
   const pointer=(type,progress,pointerType='mouse',pointerId=91)=>{
    const p=position(progress);
    marker.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId,pointerType,button:0,buttons:type==='pointerup'?0:1,clientX:p.x,clientY:p.y,isPrimary:true}));
   };
   const onTrack=()=>{
    const rect=control.orbit.getBoundingClientRect(),knob=marker.getBoundingClientRect();
    const distance=Math.hypot(knob.left+knob.width/2-rect.left-rect.width/2,knob.top+knob.height/2-rect.top-rect.height/2);
    assert(Math.abs(distance-rect.width*260/600)<1,'Marker is not on track');
   };
   pointer('pointerdown',0);
   for(let i=0;i<6;i++){
    pointer('pointermove',i/5);await frame();assert(control.stage===i,`Clockwise stage ${i+1}`);onTrack();
    assert(root.querySelector('.process-copy.is-active h3').textContent===fixtureConfiguration.stages[i].heading,'Heading equality');
    assert(root.querySelector('.process-copy.is-active p').textContent===fixtureConfiguration.stages[i].explanation,'Explanation equality');
   }
   pointer('pointerup',1);await pause(650);
   assert(control.progress===1,'Final endpoint retained');
   assert(root.querySelector('.process-image-layer.is-active').querySelectorAll('img').length===1,'One final recovered-outputs photograph');
   const duration=getComputedStyle(root.querySelector('.process-image-layer.is-active')).transitionDuration;
   assert(matchMedia('(prefers-reduced-motion: reduce)').matches?duration==='0s':duration.includes('0.55s'),'Crossfade timing');
   assert(root.querySelectorAll('.process-image-layer.is-active').length===1,'One visible image layer');
   log('PASS clockwise pointer drag through six states, track geometry, exact text updates, crossfade and single output image');
   pointer('pointerdown',1);
   for(let i=5;i>=0;i--){pointer('pointermove',i/5);await frame();assert(control.stage===i,`Reverse stage ${i+1}`);}
   pointer('pointerup',0);await pause(500);assert(control.progress===0,'Return to start');
   log('PASS reverse pointer drag and restored start');
   pointer('pointerdown',0);pointer('pointermove',.34);await frame();assert(Math.abs(control.progress-.34)<.001,'Continuous pointer movement');
   pointer('pointerup',.34);await pause(550);assert(Math.abs(control.progress-.4)<.001,'Nearest-stage snap');
   log('PASS continuous movement and nearest-stage snap');
   pointer('pointerdown',0,'touch',92);for(const p of [.15,.3,.45,.6,.75]){pointer('pointermove',p,'touch',92);await frame();}pointer('pointerup',.75,'touch',92);await pause(500);
   assert(control.stage===4&&Math.abs(control.progress-.8)<.001,'Touch PointerEvent state');
   assert(getComputedStyle(marker).touchAction==='none','Touch drag scrolling is not isolated');
   log('PASS synthetic touch PointerEvents and touch-action:none');
   const key=value=>marker.dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));
   key('Home');await pause(500);assert(control.progress===0,'Keyboard Home');
   key('ArrowRight');key('ArrowRight');await pause(550);assert(control.stage===2,'Repeated keyboard arrows');
   key('End');await pause(550);assert(control.progress===1,'Keyboard End');
   key('ArrowLeft');await pause(550);assert(control.stage===4,'Keyboard reverse');
   assert(marker.getAttribute('aria-valuenow')==='5'&&marker.getAttribute('aria-valuetext')==='Stage 05 of 6: QA 5','Accessible current stage state');
   log('PASS Home/End/arrows and accessible stage announcement');
   if(matchMedia('(prefers-reduced-motion: reduce)').matches){control.snap(0);assert(control.progress===0,'Reduced-motion snap');assert(getComputedStyle(root.querySelector('.process-image-layer')).transitionDuration==='0s','Reduced-motion crossfade disabled');log('PASS reduced motion');}
   assert(document.documentElement.scrollWidth<=innerWidth+1,'Horizontal viewport overflow');
   assert(marker.getBoundingClientRect().width>=44,'Touch target under 44px');
   log(`PASS responsive viewport ${innerWidth}px and touch target`);
   let rejected=false;try{new window.BCFCircularProcess(null,{mode:'illustrative',stages:fixtureConfiguration.stages.slice(0,1)});}catch{rejected=true;}
   assert(rejected,'Insufficient stage count accepted');
   const homepage=await(await fetch('../')).text();
   assert(homepage.includes('See How Waste Becomes Value')&&homepage.includes('OUR TRANSFORMATION PROCESS'),'Six-state interaction missing from homepage');
   assert(!homepage.includes('Synthetic state 1'),'Synthetic QA content leaked into homepage');
   log('PASS six-state homepage section and no synthetic QA copy leak');
   log('All circular mechanics checks passed.');
  }catch(error){log(`FAIL ${error.message}`);}
 })();
}
