// Keep native editing visible when a software keyboard reduces the visual viewport.
export function keyboardVisible({baseline,height,editing,scale=1}){
 return editing&&scale<=1.05&&baseline-height>120;
}
export function focusScrollDelta({top,bottom,viewportTop=0,height,padding=18}){
 const available=height-padding*2;
 if(top<viewportTop+padding)return top-viewportTop-padding;
 if(bottom>viewportTop+height-padding)return bottom-top>available?top-viewportTop-padding:bottom-viewportTop-height+padding;
 return 0;
}
export function installMobileViewport(win=window,doc=document){
 const viewport=win.visualViewport;let baseline=Math.max(win.innerHeight,doc.documentElement.clientHeight),lastWidth=win.innerWidth,frame=0;
 const editable=el=>el?.matches?.('textarea,input:not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]),[contenteditable="true"]');
 function update(){
  frame=0;const field=doc.activeElement,editing=editable(field),height=viewport?.height||win.innerHeight;
  if(Math.abs(win.innerWidth-lastWidth)>80){baseline=Math.max(win.innerHeight,doc.documentElement.clientHeight,height);lastWidth=win.innerWidth;}
  else baseline=Math.max(baseline,win.innerHeight,doc.documentElement.clientHeight,height);
  const mobile=win.matchMedia('(max-width:820px)').matches;
  const open=mobile&&keyboardVisible({baseline,height,editing,scale:viewport?.scale||1});
  doc.body.dataset.keyboardOpen=String(open);doc.documentElement.style.setProperty('--visible-viewport-height',height+'px');
  if(open&&field.closest('.hero-flow-panel,interactive-typewriter')){
   const rect=field.getBoundingClientRect();const delta=focusScrollDelta({top:rect.top,bottom:rect.bottom,viewportTop:viewport?.offsetTop||0,height});
   if(Math.abs(delta)>2)win.scrollBy({top:delta,behavior:'instant'});
  }
 }
 const schedule=()=>{if(!frame)frame=win.requestAnimationFrame(update);};
 viewport?.addEventListener('resize',schedule);win.addEventListener('resize',schedule);doc.addEventListener('focusin',schedule);doc.addEventListener('focusout',schedule);
 update();return ()=>{viewport?.removeEventListener('resize',schedule);win.removeEventListener('resize',schedule);doc.removeEventListener('focusin',schedule);doc.removeEventListener('focusout',schedule);if(frame)win.cancelAnimationFrame(frame);};
}
if(typeof window!=='undefined'&&typeof document!=='undefined')installMobileViewport();
