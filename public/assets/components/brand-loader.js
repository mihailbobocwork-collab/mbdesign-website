import {TransitionMotion} from './transition-motion.js';
export const BRAND_SEEN_KEY='mihail:brand-entrance:v1';

export class BrandEntrance {
  constructor(root){
    this.root=root;if(!root)return;
    this.mark=root.querySelector('.brand-loader-mark');this.backdrop=root.querySelector('.brand-loader-backdrop');
    this.complete=root.querySelector('.brand-loader-complete');this.strokes=[...root.querySelectorAll('[data-ink-stroke]')];
    this.preference=matchMedia('(prefers-reduced-motion: reduce)');
    this.motion=new TransitionMotion(this.preference);
    const skip=()=>{if(this.running){this.skipped=true;this.motion.cancel();}};
    addEventListener('brand-loader-skip',skip);
    addEventListener('pagehide',skip);
    addEventListener('resize',skip);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)skip();});
    this.preference.addEventListener('change',()=>{if(this.preference.matches)skip();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&this.running){event.preventDefault();skip();}});
    root.addEventListener('pointerdown',skip);
    if(document.documentElement.dataset.brandBoot==='pending')void this.play();
  }
  play(options={}){
    if(this.promise)return this.promise;
    this.promise=this.perform(options).finally(()=>{this.promise=null;});return this.promise;
  }
  async perform({restore}={}){
    const html=document.documentElement;
    if(!this.root||this.preference.matches||document.hidden){
      await restore?.();delete html.dataset.brandBoot;html.dataset.brandSequence='done';
      document.dispatchEvent(new Event('brand-entrance-reveal'));return;
    }
    this.running=true;this.skipped=false;
    const initial=html.dataset.brandBoot==='pending';
    const elements=[...document.querySelectorAll('body>.site-header,body>main,body>main+.wrap,body>.skip-link')];
    const states=elements.map(element=>({element,inert:element.inert,opacity:element.style.opacity,filter:element.style.filter}));
    const headerMark=document.querySelector('.hero-mark img');
    this.root.hidden=false;this.root.dataset.open='true';this.root.dataset.phase='drawing';
    this.root.style.opacity='1';this.backdrop.style.opacity='1';
    this.mark.style.opacity='1';this.mark.style.filter='blur(0px)';this.complete.style.opacity='0';
    this.strokes.forEach(stroke=>stroke.style.strokeDashoffset='100');
    html.dataset.brandSequence='active';
    for(const {element} of states)element.inert=true;
    const box=this.mark.getBoundingClientRect();
    this.mark.style.left=(innerWidth-box.width)/2+'px';this.mark.style.top=(innerHeight-box.height)/2+'px';
    // Cover the previous screen before restoring the homepage behind the logo.
    let restoration;
    const ensureRestored=()=>{
      if(!restoration){restoration=Promise.resolve().then(()=>restore?.());restoration.catch(()=>{});}
      return restoration;
    };
    const watchdog=setTimeout(()=>{this.skipped=true;this.motion.cancel();},4000);
    try{
      if(!initial)await this.motion.run(this.root,[{opacity:0},{opacity:1}],{duration:160});
      ensureRestored();
      if(!this.skipped){
        await Promise.race([headerMark?.decode?.().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,650))]);
        if(!this.skipped)await Promise.all(this.strokes.map((stroke,index)=>this.motion.run(stroke,[{strokeDashoffset:'100'},{strokeDashoffset:'0'}],{duration:index?520:740,delay:index?650:60,easing:'cubic-bezier(.35,0,.35,1)'})));
        if(!this.skipped)await this.motion.run(this.complete,[{opacity:0},{opacity:1}],{duration:100});
      }
      await ensureRestored();
      if(this.skipped)return;
      for(const {element} of states)element.style.opacity='0';
      delete html.dataset.brandBoot;
      this.root.dataset.phase='morphing';document.dispatchEvent(new Event('brand-entrance-reveal'));
      await Promise.all([
        this.motion.run(this.mark,[{opacity:1,filter:'blur(0px)'},{opacity:0,filter:'blur(9px)'}],{duration:1000}),
        this.motion.run(this.backdrop,[{opacity:1},{opacity:0}],{duration:1140}),
        ...states.map(({element})=>this.motion.run(element,[{opacity:0,filter:'blur(6px)'},{opacity:1,filter:'blur(0px)'}],{duration:980,delay:160}))
      ]);
    }catch{/* The actual website remains usable if a decorative animation fails. */}
    finally{
      await ensureRestored().catch(()=>{});clearTimeout(watchdog);this.motion.cancel();
      for(const state of states){
        const {element}=state;element.style.opacity=state.opacity;element.style.filter=state.filter;
        // A controller may intentionally release an old inert state during restore.
        if(element.inert)element.inert=state.inert;
      }
      this.root.hidden=true;delete this.root.dataset.open;this.root.dataset.phase='done';
      delete html.dataset.brandBoot;html.dataset.brandSequence='done';this.running=false;
      try{sessionStorage.setItem(BRAND_SEEN_KEY,'seen');}catch{}
      document.dispatchEvent(new Event('brand-entrance-reveal'));
    }
  }
}
export const brandEntrance=globalThis.document?.querySelector('#brand-loader')?new BrandEntrance(document.querySelector('#brand-loader')):null;
