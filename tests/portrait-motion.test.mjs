import test from 'node:test';
import assert from 'node:assert/strict';
import {portraitMesh,idlePortraitMesh,PORTRAIT_TRIANGLES,stepPortrait,triangleTransform,gazeFrame,GAZE_SEQUENCE} from '../public/assets/components/portrait-motion.js';

test('Detailed gaze frames cover both exact endpoints and interpolate only adjacent poses',()=>{
  assert.deepEqual(gazeFrame(1),{from:0,to:1,mix:0});
  assert.deepEqual(gazeFrame(2),{from:60,to:60,mix:0});
  assert.deepEqual(gazeFrame(0),gazeFrame(1));
  assert.deepEqual(gazeFrame(3),gazeFrame(2));
  let previous=-1;
  for(let i=0;i<=1000;i++){
    const {from,to,mix}=gazeFrame(1+i/1000);
    assert.ok(from>=previous&&to-from<=1&&mix>=0&&mix<1);
    assert.ok(from>=0&&to<GAZE_SEQUENCE.frames);previous=from;
  }
});

test('Gaze reversal continues through existing frames without a jump to either endpoint',()=>{
  let position=1,velocity=0;
  for(let i=0;i<18;i++)({position,velocity}=stepPortrait(position,velocity,2,1/60));
  const before=gazeFrame(position);
  const reversed=stepPortrait(position,velocity,1,1/60);
  const after=gazeFrame(reversed.position);
  assert.ok(Math.abs(after.from-before.from)<=3);
  assert.ok(reversed.position>1&&reversed.position<2);
});

test('Portrait geometry retains a valid shared mesh through both poses',()=>{
  for(const [a,b] of [[idlePortraitMesh(),portraitMesh()],[portraitMesh(),portraitMesh(true)]]){
  assert.equal(a.length,b.length);assert.ok(PORTRAIT_TRIANGLES.length>100);
  for(const p of [...a,...b])assert.ok(p.every(n=>n>=0&&n<=1));
  for(const progress of [0,.25,.5,.75,1]){
    const mesh=a.map((p,i)=>p.map((n,j)=>n+(b[i][j]-n)*progress));
    for(const [i,j,k] of PORTRAIT_TRIANGLES){
      const [u,v,w]=[mesh[i],mesh[j],mesh[k]];
      assert.ok((v[0]-u[0])*(w[1]-u[1])-(v[1]-u[1])*(w[0]-u[0])>0,'No inverted triangles');
    }
  }}
});

test('Portrait movement eases to its destination without overshoot or repeated restarts',()=>{
  let position=0,velocity=0,last=0;
  for(let i=0;i<120;i++){
    ({position,velocity}=stepPortrait(position,velocity,1,1/60));
    assert.ok(position>=last&&position<=1);last=position;
  }
  assert.ok(position>.999);
  const reversed=stepPortrait(.6,1.4,0,1/60);
  assert.ok(Math.abs(reversed.position-.6)<.04,'A reversal starts from the current pose');
  for(let i=0;i<120;i++)({position,velocity}=stepPortrait(position,velocity,0,1/60));
  assert.ok(position<.001);
});

test('Triangle transforms align corresponding features and reject degenerate geometry',()=>{
  const source=[[0,0],[1,0],[0,1]],destination=[[2,3],[4,3],[2,6]];
  const [a,b,c,d,e,f]=triangleTransform(source,destination);
  source.forEach(([x,y],i)=>assert.deepEqual([a*x+c*y+e,b*x+d*y+f],destination[i]));
  assert.equal(triangleTransform([[0,0],[1,0],[2,0]],destination),null);
});

test('The full portrait response covers idle, listening and writing without overshoot',()=>{
  let position=0,velocity=0;
  for(let i=0;i<150;i++){({position,velocity}=stepPortrait(position,velocity,2,1/60));assert.ok(position>=0&&position<=2);}
  assert.ok(position>1.999);
  for(let i=0;i<150;i++)({position,velocity}=stepPortrait(position,velocity,1,1/60));
  assert.ok(Math.abs(position-1)<.001);
});
