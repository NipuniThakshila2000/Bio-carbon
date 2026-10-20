'use strict';
(() => {
 const NS='http://www.w3.org/2000/svg';
 const START=-90, SWEEP=360, RADIUS=260, CENTER_X=300, CENTER_Y=300;
 const SEGMENTS=80;
 const clamp=value=>Math.max(0,Math.min(1,value));
 const GREEN_STOPS=[[0,[150,184,160]],[.34,[86,143,107]],[.68,[23,99,79]],[1,[0,63,52]]];
 const greenTone=progress=>{
  const upper=GREEN_STOPS.findIndex(([position])=>position>=progress);
  const right=GREEN_STOPS[Math.max(1,upper)],left=GREEN_STOPS[Math.max(0,upper-1)];
  const mix=(progress-left[0])/(right[0]-left[0]);
  return `#${left[1].map((value,index)=>Math.round(value+(right[1][index]-value)*mix).toString(16).padStart(2,'0')).join('')}`;
 };
 const point=(progress,radius=RADIUS)=>{
  const angle=(START+clamp(progress)*SWEEP)*Math.PI/180;
  return {x:CENTER_X+radius*Math.cos(angle),y:CENTER_Y+radius*Math.sin(angle)};
 };
 const svgElement=(tag,attributes)=>{
  const node=document.createElementNS(NS,tag);
  Object.entries(attributes).forEach(([name,value])=>node.setAttribute(name,value));
  return node;
 };
 class CircularProcess {
  constructor(root,configuration){
   if(!['illustrative','verified'].includes(configuration.mode)||!Array.isArray(configuration.stages)||configuration.stages.length<2) throw new Error('The circular interaction requires at least two configured stages.');
   if(configuration.stages.some(stage=>!stage.heading||!stage.explanation||!Array.isArray(stage.images)||!stage.images.length)) throw new Error('Each circular process state needs copy and a local photograph.');
   this.root=root; this.stages=configuration.stages; this.progress=0; this.stage=-1;
   this.pointerId=null; this.frame=0; this.snapFrame=0; this.loaded=false;
   this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
   this.orbit=root.querySelector('.process-orbit'); this.text=root.querySelector('.process-text-stack');
   this.render(); this.bind(); this.update(0); this.ready=this.preload();
  }
  render(){
   const svg=svgElement('svg',{viewBox:'0 0 600 600','aria-hidden':'true',focusable:'false'});
   this.segments=[];
   for(let index=0;index<SEGMENTS;index++){
    const progress=index/SEGMENTS,position=point(progress),angle=START+progress*SWEEP;
    const group=svgElement('g',{class:'process-segment','data-index':String(index),transform:`translate(${position.x} ${position.y}) rotate(${angle+90})`});
    group.dataset.activeFill=greenTone(progress);
    group.append(svgElement('rect',{x:'-6',y:'-14',width:'12',height:'28',rx:'6'}));
    svg.append(group); this.segments.push(group);
   }
   this.orbit.append(svg);
   this.viewer=document.createElement('div'); this.viewer.className='process-viewer';
   this.viewer.setAttribute('aria-hidden','true'); this.layers=[]; this.copies=[];
   this.stages.forEach((stage,index)=>{
    const layer=document.createElement('div'); layer.className='process-image-layer'; layer.dataset.stage=String(index+1);
    stage.images.forEach(source=>{
     const img=new Image(); img.alt=''; img.decoding='async'; img.loading='eager'; img.src=source; layer.append(img);
    });
    this.viewer.append(layer); this.layers.push(layer);
    const copy=document.createElement('div'); copy.className='process-copy'; copy.setAttribute('aria-hidden','true');
    const number=document.createElement('span'); number.className='stage-number'; number.textContent=String(index+1).padStart(2,'0'); number.setAttribute('aria-hidden','true');
    const heading=document.createElement('h3'); heading.textContent=stage.heading;
    const explanation=document.createElement('p'); explanation.textContent=stage.explanation;
    copy.append(number,heading,explanation); this.text.append(copy); this.copies.push(copy);
   });
   this.orbit.append(this.viewer);
   this.marker=document.createElement('button'); this.marker.type='button'; this.marker.className='process-marker';
   this.marker.setAttribute('role','slider'); this.marker.setAttribute('aria-label','Process stage');
   this.marker.setAttribute('aria-valuemin','1'); this.marker.setAttribute('aria-valuemax',String(this.stages.length)); this.marker.disabled=true;
   this.marker.append(svgElement('svg',{viewBox:'0 0 24 24','aria-hidden':'true',focusable:'false'}));
   this.orbit.append(this.marker);
  }
  async preload(){
   try{
    await Promise.all([...this.viewer.querySelectorAll('img')].map(img=>img.decode()));
    this.loaded=true; this.marker.disabled=false; this.root.dataset.state='ready';
   }catch(error){
    this.root.dataset.state='image-unavailable';
    this.root.dispatchEvent(new CustomEvent('processerror',{detail:error}));
   }
  }
  update(progress){
   this.progress=clamp(progress);
   const pos=point(this.progress); this.marker.style.left=`${pos.x/6}%`; this.marker.style.top=`${pos.y/6}%`;
   const lit=this.progress*SEGMENTS;
   this.segments.forEach((segment,index)=>{const active=index<lit;segment.classList.toggle('is-active',active);segment.querySelector('rect').style.fill=active?segment.dataset.activeFill:'#e8edeb';});
   this.root.dataset.progress=String(this.progress);
   const index=Math.round(this.progress*(this.stages.length-1)); if(index===this.stage)return;
   this.stage=index;
   this.layers.forEach((layer,i)=>layer.classList.toggle('is-active',i===index));
   this.copies.forEach((copy,i)=>{copy.classList.toggle('is-active',i===index);copy.setAttribute('aria-hidden',String(i!==index));});
   const stage=this.stages[index]; this.marker.setAttribute('aria-valuenow',String(index+1));
   this.marker.setAttribute('aria-valuetext',`Stage ${String(index+1).padStart(2,'0')} of ${this.stages.length}: ${stage.heading}`);
   this.root.dataset.stage=String(index+1);
   this.root.dispatchEvent(new CustomEvent('processchange',{detail:{index}}));
  }
  pointerAngle(event){
   const rect=this.orbit.getBoundingClientRect();
   const x=event.clientX-rect.left-rect.width/2,y=event.clientY-rect.top-rect.height/2;
   return (Math.atan2(y,x)*180/Math.PI+360)%360;
  }
  snap(index){
   cancelAnimationFrame(this.snapFrame);
   this.targetIndex=Math.max(0,Math.min(this.stages.length-1,index));
   const from=this.progress,target=this.targetIndex/(this.stages.length-1);
   if(this.reducedMotion.matches||Math.abs(target-from)<.0001){this.update(target);this.targetIndex=null;return;}
   const start=performance.now(),duration=500;
   const step=now=>{const t=Math.min(1,(now-start)/duration),ease=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;this.update(from+(target-from)*ease);if(t<1)this.snapFrame=requestAnimationFrame(step);else{this.snapFrame=0;this.targetIndex=null;}};
   this.snapFrame=requestAnimationFrame(step);
  }
  bind(){
   this.onDown=event=>{
    if(!this.loaded||this.pointerId!==null||(event.pointerType==='mouse'&&event.button!==0))return;
    event.preventDefault();cancelAnimationFrame(this.snapFrame);this.snapFrame=0;this.targetIndex=null;
    this.pointerId=event.pointerId;this.pointerLastAngle=this.pointerAngle(event);this.pointerStartProgress=this.progress;this.pointerTravel=0;
    this.orbit.classList.add('is-dragging');this.marker.focus({preventScroll:true});this.marker.setPointerCapture(event.pointerId);
   };
   this.onMove=event=>{
    if(event.pointerId!==this.pointerId)return;event.preventDefault();
    const coalesced=typeof event.getCoalescedEvents==='function'?event.getCoalescedEvents():null;
    const events=coalesced?.length?coalesced:[event];
    for(const sample of events){const angle=this.pointerAngle(sample);let delta=angle-this.pointerLastAngle;if(delta>180)delta-=360;else if(delta< -180)delta+=360;this.pointerTravel+=delta;this.pointerLastAngle=angle;}
    this.pendingProgress=clamp(this.pointerStartProgress+this.pointerTravel/360);
    if(!this.frame)this.frame=requestAnimationFrame(()=>{this.frame=0;this.update(this.pendingProgress);});
   };
   this.onEnd=event=>{
    if(event.pointerId!==this.pointerId)return;
    if(this.frame){cancelAnimationFrame(this.frame);this.frame=0;this.update(this.pendingProgress);}
    const pointerId=this.pointerId;this.pointerId=null;this.orbit.classList.remove('is-dragging');
    if(this.marker.hasPointerCapture(pointerId))this.marker.releasePointerCapture(pointerId);
    this.snap(Math.round(this.progress*(this.stages.length-1)));
   };
   this.onKey=event=>{
    if(!this.loaded||this.pointerId!==null)return;
    const keys={ArrowRight:1,ArrowUp:1,PageUp:1,ArrowLeft:-1,ArrowDown:-1,PageDown:-1};
    if(!(event.key in keys)&&event.key!=='Home'&&event.key!=='End')return;
    event.preventDefault();const target=event.key==='Home'?0:event.key==='End'?this.stages.length-1:(this.targetIndex??this.stage)+keys[event.key];this.snap(target);
   };
   this.onMotion=event=>{if(event.matches){cancelAnimationFrame(this.snapFrame);this.snapFrame=0;this.targetIndex=null;this.update(Math.round(this.progress*(this.stages.length-1))/(this.stages.length-1));}};
   this.marker.addEventListener('pointerdown',this.onDown);this.marker.addEventListener('pointermove',this.onMove);
   ['pointerup','pointercancel','lostpointercapture'].forEach(type=>this.marker.addEventListener(type,this.onEnd));
   this.marker.addEventListener('keydown',this.onKey);this.reducedMotion.addEventListener('change',this.onMotion);
  }
  destroy(){
   cancelAnimationFrame(this.frame);cancelAnimationFrame(this.snapFrame);
   this.marker.removeEventListener('pointerdown',this.onDown);this.marker.removeEventListener('pointermove',this.onMove);
   ['pointerup','pointercancel','lostpointercapture'].forEach(type=>this.marker.removeEventListener(type,this.onEnd));
   this.marker.removeEventListener('keydown',this.onKey);this.reducedMotion.removeEventListener('change',this.onMotion);
  }
 }
 window.BCFCircularProcess=CircularProcess;
 document.querySelectorAll('.circular-process-data').forEach(element=>{
  const configuration=JSON.parse(element.textContent),root=element.closest('.circular-process');
  root.circularProcess=new CircularProcess(root,configuration);
 });
})();
