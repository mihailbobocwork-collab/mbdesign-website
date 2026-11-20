// A small, local mesh aligns the original, listening, and writing photographs.
const LOOK_X = [0,.22,.35,.465,.525,.595,.69,.8,1];
const WRITE_X = [0,.22,.355,.473,.537,.602,.69,.8,1];
const LOOK_Y = [0,.06,.15,.236,.266,.337,.397,.485,.565,.72,.83,1];
const WRITE_Y = [0,.06,.17,.321,.35,.409,.466,.53,.565,.72,.83,1];
const WEIGHT = [0,0,.2,1,1,1,.2,0,0];
const IDLE_X = [0,.18,.3,.435,.515,.59,.715,.86,1];
const IDLE_Y = [0,.10,.23,.321,.359,.444,.52,.65,.735,.8,.87,1];
export const GAZE_SEQUENCE = {frames:61,columns:8,tileSize:256};

// Keep adjacent optical-flow frames continuous, including during direction changes.
export function gazeFrame(position) {
  const frame=Math.max(0,Math.min(1,position-1))*(GAZE_SEQUENCE.frames-1);
  const from=Math.floor(frame),to=Math.min(GAZE_SEQUENCE.frames-1,from+1);
  return {from,to,mix:frame-from};
}

export function idlePortraitMesh() {
  return IDLE_Y.flatMap((y,row)=>IDLE_X.map((x,col)=>[x,y+(row>=2&&row<=7?(col-4)*.0015*WEIGHT[col]:0)]));
}

export function portraitMesh(writing = false) {
  return LOOK_Y.flatMap((y, row) => LOOK_X.map((x, col) => {
    const tilt = row >= 2 && row <= 7 ? (col - 4) * .007 * WEIGHT[col] : 0;
    return [writing ? WRITE_X[col] : x, y + (writing ? (WRITE_Y[row] - y) * WEIGHT[col] : 0) + tilt];
  }));
}
export const PORTRAIT_TRIANGLES = LOOK_Y.slice(1).flatMap((_, row) => LOOK_X.slice(1).flatMap((__, col) => {
  const a = row * LOOK_X.length + col, b = a + 1, c = a + LOOK_X.length, d = c + 1;
  return [[a,b,d],[a,d,c]];
}));

// Exact critically damped response: changes of direction retain current velocity.
export function stepPortrait(position, velocity, target, seconds) {
  const dt = Math.min(.064, Math.max(0, seconds)), omega = 7.4;
  const offset = position - target, carry = velocity + omega * offset, decay = Math.exp(-omega * dt);
  const next = target + (offset + carry * dt) * decay;
  return {position: Math.min(2,Math.max(0,next)), velocity: next < 0 || next > 2 ? 0 : (velocity - omega * carry * dt) * decay};
}

export function triangleTransform(source, destination) {
  const [[x0,y0],[x1,y1],[x2,y2]] = source;
  const det = x0*(y1-y2) + x1*(y2-y0) + x2*(y0-y1);
  if (Math.abs(det) < 1e-10) return null;
  const map = values => [
    (values[0]*(y1-y2)+values[1]*(y2-y0)+values[2]*(y0-y1))/det,
    (values[0]*(x2-x1)+values[1]*(x0-x2)+values[2]*(x1-x0))/det,
    (values[0]*(x1*y2-x2*y1)+values[1]*(x2*y0-x0*y2)+values[2]*(x0*y1-x1*y0))/det
  ];
  const [a,c,e] = map(destination.map(p=>p[0])), [b,d,f] = map(destination.map(p=>p[1]));
  return [a,b,c,d,e,f];
}

export class PortraitMotion {
  constructor(root, motion) {
    this.root = root; this.motion = motion; this.events = new AbortController();
    this.images = [root.querySelector('.hero-portrait-default'),root.querySelector('.hero-portrait-listening'),root.querySelector('.hero-portrait-notes')];
    this.size = 384; this.position = 0; this.velocity = 0; this.target = 0;
    this.requested = root.dataset.engaged === 'true' ? (root.dataset.writing === 'true' ? 2 : 1) : 0;
    this.canvas = document.createElement('canvas'); this.canvas.className = 'hero-portrait-motion';
    this.canvas.width = this.size; this.canvas.height = this.size; this.canvas.setAttribute('aria-hidden','true');
    this.context = this.canvas.getContext('2d');
    if (!this.context || this.images.some(image=>!image)) return;
    root.append(this.canvas);
    this.meshes = [idlePortraitMesh(),portraitMesh(),portraitMesh(true)].map(mesh=>mesh.map(p=>p.map(n=>n*this.size)));
    this.layers = [0,1].map(()=>{const canvas=document.createElement('canvas');canvas.width=this.size;canvas.height=this.size;return canvas;});
    this.layerContexts = this.layers.map(canvas=>canvas.getContext('2d'));
    const on = (target,event,fn)=>target.addEventListener(event,fn,{signal:this.events.signal});
    this.images.forEach(image=>on(image,'load',()=>this.initialize()));
    this.gaze = new Image();this.gaze.decoding='async';
    on(this.gaze,'load',()=>{
      this.gazeReady=this.gaze.naturalWidth===2048&&this.gaze.naturalHeight===2048;
      this.gazeFailed=!this.gazeReady;this.initialize();
    });
    on(this.gaze,'error',()=>{this.gazeFailed=true;this.initialize();});
    this.gaze.src='/assets/hero/mihail-gaze-sequence.webp';
    on(motion,'change',()=>{if(motion.matches)this.snap(this.requested);});
    on(document,'visibilitychange',()=>{if(document.hidden)this.snap(this.requested);});
    this.initialize();
  }
  initialize() {
    if (this.ready || !this.context || (!this.gazeReady&&!this.gazeFailed) || this.images.some(image=>!image.complete||!image.naturalWidth)) return;
    this.textures = this.images.map((image,index)=>{
      const canvas=document.createElement('canvas');canvas.width=this.size;canvas.height=this.size;
      const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';
      // Match the original portrait's existing CSS crop before moving between poses.
      if(index===0)ctx.drawImage(image,-.34873*this.size,-.20993*this.size,1.62637*this.size,2.08043*this.size);
      else ctx.drawImage(image,0,0,this.size,this.size);
      return canvas;
    });
    this.ready = true; this.root.dataset.motionReady = 'true';
    this.snap(this.requested);
  }
  setIntent(engaged, writing) {
    const next = engaged ? (writing ? 2 : 1) : 0;
    if (next === this.requested) return;
    this.requested = next; clearTimeout(this.intentTimer);
    if (!this.ready) return;
    if (this.motion.matches || document.hidden) { this.snap(next); return; }
    // A tiny reaction pause prevents flashes during very quick typing/deleting.
    this.intentTimer = setTimeout(()=>{this.target=next;this.start();},next>this.position?65:120);
  }
  snap(target) {
    clearTimeout(this.intentTimer); cancelAnimationFrame(this.frame);
    this.position=target;this.target=target;this.velocity=0;this.lastTime=0;this.frame=0;
    if(this.ready)this.render();
  }
  start() {
    if(this.frame)return;
    this.lastTime=0;
    this.frame=requestAnimationFrame(time=>this.tick(time));
  }
  tick(time) {
    this.frame=0;
    const next=stepPortrait(this.position,this.velocity,this.target,this.lastTime?(time-this.lastTime)/1000:1/60);
    this.lastTime=time;this.position=next.position;this.velocity=next.velocity;this.render();
    if(Math.abs(this.target-this.position)>.0007||Math.abs(this.velocity)>.003)this.frame=requestAnimationFrame(t=>this.tick(t));
    else this.snap(this.target);
  }
  warp(layer, index, destination) {
    const ctx=this.layerContexts[layer],source=this.meshes[index],texture=this.textures[index];
    ctx.clearRect(0,0,this.size,this.size);
    for(const indices of PORTRAIT_TRIANGLES){
      const from=indices.map(i=>source[i]),to=indices.map(i=>destination[i]),transform=triangleTransform(from,to);
      if(!transform)continue;
      const center=[(to[0][0]+to[1][0]+to[2][0])/3,(to[0][1]+to[1][1]+to[2][1])/3];
      const clip=to.map(p=>{const dx=p[0]-center[0],dy=p[1]-center[1],length=Math.hypot(dx,dy)||1;return [p[0]+dx/length*.55,p[1]+dy/length*.55];});
      ctx.save();ctx.beginPath();ctx.moveTo(...clip[0]);ctx.lineTo(...clip[1]);ctx.lineTo(...clip[2]);ctx.closePath();ctx.clip();
      ctx.setTransform(...transform);ctx.drawImage(texture,0,0);ctx.restore();
    }
  }
  render() {
    const ctx=this.context,p=this.position;
    ctx.clearRect(0,0,this.size,this.size);
    if(p>=1&&this.gazeReady){
      const {from,to,mix}=gazeFrame(p),{columns,tileSize}=GAZE_SEQUENCE;
      const draw=frame=>ctx.drawImage(this.gaze,(frame%columns)*tileSize,Math.floor(frame/columns)*tileSize,tileSize,tileSize,0,0,this.size,this.size);
      draw(from);
      if(mix>0){ctx.globalAlpha=mix;draw(to);ctx.globalAlpha=1;}
    }
    else if(Number.isInteger(p))ctx.drawImage(this.textures[p],0,0);
    else{
      const from=Math.floor(p),to=from+1,mix=p-from;
      const destination=this.meshes[from].map((point,i)=>point.map((n,j)=>n+(this.meshes[to][i][j]-n)*mix));
      this.warp(0,from,destination);this.warp(1,to,destination);
      ctx.drawImage(this.layers[0],0,0);ctx.globalAlpha=mix;ctx.drawImage(this.layers[1],0,0);ctx.globalAlpha=1;
    }
    this.canvas.dataset.progress=p.toFixed(4);
    this.canvas.dataset.renderer=p>=1&&this.gazeReady?'optical-flow':'mesh';
  }
  destroy() {
    clearTimeout(this.intentTimer);cancelAnimationFrame(this.frame);this.events.abort();
    this.canvas.remove();delete this.root.dataset.motionReady;
  }
}
