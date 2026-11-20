// Keep the final frame in the DOM before releasing an animation. In particular,
// an outgoing question must stay invisible while its replacement is measured.
export class TransitionMotion {
  constructor(preference,readStyle=element=>getComputedStyle(element)) {
    this.preference=preference;this.readStyle=readStyle;this.running=new Set();
  }
  async run(element,keyframes,options={}) {
    const final=keyframes.at(-1);
    const styles=Object.fromEntries(Object.entries(final).filter(([key])=>!['offset','easing','composite'].includes(key)));
    if(this.preference.matches||!element.animate){Object.assign(element.style,styles);return;}
    const animation=element.animate(keyframes,{duration:560,easing:'cubic-bezier(.4,0,.2,1)',...options,fill:'both'});
    const entry={element,animation,properties:Object.keys(styles)};this.running.add(entry);
    try {
      await animation.finished;
      if(!entry.cancelled)Object.assign(element.style,styles);
    } catch { /* A newer transition continues from the captured current frame. */ }
    finally {this.running.delete(entry);animation.cancel();}
  }
  cancel() {
    for(const entry of this.running){
      const {element,animation,properties}=entry;entry.cancelled=true;
      const current=this.readStyle(element);
      const snapshot=Object.fromEntries(properties.map(key=>[key,current[key]]));
      Object.assign(element.style,snapshot);animation.cancel();
    }
    this.running.clear();
  }
}
