// Reading stays vertical; the bottom overview follows the chapter being read.
for(const article of document.querySelectorAll('.case-study')){
 const nav=article.querySelector('.case-process'),phases=[...article.querySelectorAll('.case-phase')];if(!nav||!phases.length)continue;
 const links=[...nav.querySelectorAll('a')],header=document.querySelector('.site-header');let frame=0,current=-1,headerHeight=120;
 nav.dataset.floating='true';
 // Keep the fixed dock outside the page entrance animation’s transformed main.
 document.body.append(nav);
 function update(){
  frame=0;const dockHeight=nav.getBoundingClientRect().height;
  const visible=phases[0].getBoundingClientRect().top<innerHeight-dockHeight-32&&phases.at(-1).getBoundingClientRect().bottom>headerHeight+40;
  nav.dataset.visible=String(visible);nav.inert=!visible;nav.setAttribute('aria-hidden',String(!visible));
  let active=0;const offset=headerHeight+80;
  for(let i=0;i<phases.length;i++)if(phases[i].getBoundingClientRect().top<=offset)active=i;
  if(active===current)return;current=active;
  for(const [i,link]of links.entries()){if(i===active)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');}
  phases.forEach((phase,i)=>phase.dataset.active=String(i===active));
  if(nav.scrollWidth>nav.clientWidth){const link=links[active];nav.scrollTo({left:Math.max(0,link.parentElement.offsetLeft-nav.clientWidth/2+link.parentElement.clientWidth/2),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
 }
 function measure(){
  headerHeight=header?.getBoundingClientRect().height||0;const rect=article.getBoundingClientRect();
  article.style.setProperty('--case-header-height',headerHeight+'px');article.style.setProperty('--case-anchor-offset',(headerHeight+32)+'px');
  nav.style.setProperty('--case-nav-left',rect.left+'px');nav.style.setProperty('--case-nav-width',rect.width+'px');
  document.documentElement.style.setProperty('--case-dock-height',nav.getBoundingClientRect().height+'px');current=-1;update();
 }
 window.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(update);},{passive:true});window.addEventListener('resize',measure);window.addEventListener('pageshow',measure);
 const observer=new ResizeObserver(measure);if(header)observer.observe(header);observer.observe(nav);measure();
}
