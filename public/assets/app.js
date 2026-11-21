const menu=document.querySelector('.menu-toggle');
const navigation=document.querySelector('#navigation');
function closeMenu(){menu?.setAttribute('aria-expanded','false');navigation?.classList.remove('open');}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));navigation.classList.toggle('open',open);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
document.addEventListener('click',event=>{if(!event.target.closest('.site-header'))closeMenu();});
navigation?.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
const siteHeader=document.querySelector('.site-header');
const workSection=document.querySelector('#work');
const workNavigation=navigation?.querySelector('a[href="#work"]');
let headerFrame=0;
function updateHeader(){
 headerFrame=0;
 siteHeader?.setAttribute('data-scrolled',String(window.scrollY>24));
 if(workSection&&workNavigation){const rect=workSection.getBoundingClientRect();if(rect.top<180&&rect.bottom>120)workNavigation.setAttribute('aria-current','location');else workNavigation.removeAttribute('aria-current');}
}
window.addEventListener('scroll',()=>{if(!headerFrame)headerFrame=requestAnimationFrame(updateHeader);},{passive:true});
window.addEventListener('pageshow',updateHeader);
updateHeader();
// Only the nearest button moves, by at most 5px. The native pointer is untouched.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const fine=matchMedia('(hover: hover) and (pointer: fine)');
const magnetic=[...document.querySelectorAll('[data-magnetic]')];
let active=null,frame=0,pointer=null;
const resetMagnet=()=>{if(active){active.style.removeProperty('--mx');active.style.removeProperty('--my');active=null;}};
function updateMagnet(){frame=0;if(!pointer||reduced.matches||!fine.matches)return resetMagnet();let nearest=null,distance=Infinity;
 for(const el of magnetic){if(el.hidden||el.matches(':focus-visible')||!el.getClientRects().length)continue;const r=el.getBoundingClientRect();const x=r.left+r.width/2-(parseFloat(el.style.getPropertyValue('--mx'))||0),y=r.top+r.height/2-(parseFloat(el.style.getPropertyValue('--my'))||0);const dx=pointer.x-x,dy=pointer.y-y;const edge=Math.hypot(Math.max(Math.abs(dx)-r.width/2,0),Math.max(Math.abs(dy)-r.height/2,0));if(edge<65&&edge<distance){distance=edge;nearest={el,dx,dy};}}
 if(active!==nearest?.el)resetMagnet();if(nearest){active=nearest.el;const strength=(1-distance/65)*.065;active.style.setProperty('--mx',`${Math.max(-5,Math.min(5,nearest.dx*strength))}px`);active.style.setProperty('--my',`${Math.max(-5,Math.min(5,nearest.dy*strength))}px`);}}
document.addEventListener('pointermove',event=>{if(event.pointerType!=='mouse')return;pointer={x:event.clientX,y:event.clientY};if(!frame)frame=requestAnimationFrame(updateMagnet);},{passive:true});
document.addEventListener('pointerleave',()=>{pointer=null;resetMagnet();});
window.addEventListener('scroll',()=>{pointer=null;resetMagnet();},{passive:true});
document.addEventListener('focusin',resetMagnet);reduced.addEventListener('change',resetMagnet);fine.addEventListener('change',resetMagnet);
for(const filter of document.querySelectorAll('[data-filter]'))filter.addEventListener('click',()=>{for(const f of document.querySelectorAll('[data-filter]')){const on=f===filter;f.setAttribute('aria-pressed',String(on));f.classList.toggle('active',on);}let count=0;for(const p of document.querySelectorAll('[data-category]')){p.hidden=filter.dataset.filter!=='all'&&p.dataset.category!==filter.dataset.filter;if(!p.hidden)count++;}document.querySelector('#filter-status').textContent=`Showing ${count} ${count===1?'project':'projects'}.`;});
const palettes={moss:['#dfe9d6','#546643','#b9c79e','#f1f3d9'],lilac:['#e6deed','#695879','#bba4ca','#f1e9dc'],ink:['#dadfe3','#283b4a','#869fae','#edf0e5']};
for(const b of document.querySelectorAll('[data-palette]'))b.addEventListener('click',()=>{const colors=palettes[b.dataset.palette],stage=document.querySelector('#palette-stage');['--pbg','--p1','--p2','--p3'].forEach((p,i)=>stage.style.setProperty(p,colors[i]));document.querySelectorAll('[data-palette]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
document.querySelector('#tracking')?.addEventListener('input',event=>{const value=(Number(event.target.value)/100).toFixed(2)+'em';document.querySelector('#type-sample').style.letterSpacing=value;document.querySelector('#tracking-value').textContent=value;});
document.querySelector('#magnet-demo')?.addEventListener('click',()=>{document.querySelector('#magnet-status').textContent='A small movement. The cursor stays yours.';});
const backToTop=document.querySelector('.floating-top');
if(backToTop){
 backToTop.hidden=false;
 const updateTop=()=>{const visible=window.scrollY>480;backToTop.dataset.visible=String(visible);backToTop.setAttribute('aria-hidden',String(!visible));backToTop.tabIndex=visible?0:-1;};
 window.addEventListener('scroll',updateTop,{passive:true});document.addEventListener('scroll',updateTop,{capture:true,passive:true});window.addEventListener('pageshow',updateTop);
 backToTop.addEventListener('click',()=>{const behavior=matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';window.scrollTo({top:0,behavior});document.querySelector('#main')?.focus({preventScroll:true});});updateTop();
}
