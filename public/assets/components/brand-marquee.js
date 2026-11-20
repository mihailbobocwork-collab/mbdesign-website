const BaseElement=globalThis.HTMLElement||class {};
export class BrandMarquee extends BaseElement {
  connectedCallback(){
    if(this.events)return;
    this.events=new AbortController();this.motion=matchMedia('(prefers-reduced-motion: reduce)');
    this.button=this.querySelector('button');this.userPaused=false;this.visible=true;
    const on=(target,event,fn)=>target.addEventListener(event,fn,{signal:this.events.signal});
    on(this.button,'click',()=>{this.userPaused=!this.userPaused;this.update();});
    on(this.motion,'change',()=>this.update());
    on(document,'visibilitychange',()=>this.update());
    if('IntersectionObserver' in window){
      this.observer=new IntersectionObserver(([entry])=>{this.visible=entry.isIntersecting;this.update();});
      this.observer.observe(this);
    }
    this.dataset.marqueeReady='true';this.update();
  }
  update(){
    this.dataset.playing=String(!this.userPaused&&!this.motion.matches&&!document.hidden&&this.visible);
    this.button.hidden=this.motion.matches;
    this.button.setAttribute('aria-pressed',String(this.userPaused));
    this.button.setAttribute('aria-label',this.userPaused?'Resume brand logos':'Pause brand logos');
  }
  disconnectedCallback(){this.events?.abort();this.observer?.disconnect();this.events=null;}
}
if(globalThis.customElements&&!customElements.get('brand-marquee'))customElements.define('brand-marquee',BrandMarquee);
