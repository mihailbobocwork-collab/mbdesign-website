import test from 'node:test';
import assert from 'node:assert/strict';
import {TransitionMotion} from '../public/assets/components/transition-motion.js';

function animatedElement(){
  const element={style:{opacity:'1'},frames:[]};
  element.animate=(keyframes,options)=>{
    let resolve,reject;
    const animation={finished:new Promise((yes,no)=>{resolve=yes;reject=no;}),finish:()=>resolve(),cancel:()=>reject(Error('cancelled'))};
    element.frames.push({keyframes,options,animation});return animation;
  };
  return element;
}

test('An outgoing question stays invisible between its fade and replacement',async()=>{
  const element=animatedElement(),motion=new TransitionMotion({matches:false});
  const outgoing=motion.run(element,[{opacity:1},{opacity:0}]);
  assert.equal(element.frames[0].options.fill,'both');
  element.frames[0].animation.finish();await outgoing;
  assert.equal(element.style.opacity,0,'No flash of the outgoing question after its animation ends');
  const incoming=motion.run(element,[{opacity:0},{opacity:1}]);
  assert.equal(element.style.opacity,0,'Replacement remains hidden until its entrance starts');
  element.frames[1].animation.finish();await incoming;
  assert.equal(element.style.opacity,1);assert.equal(motion.running.size,0);
});

test('Interrupted transitions preserve the current pose and cannot commit a stale end frame',async()=>{
  const element=animatedElement(),motion=new TransitionMotion({matches:false},()=>({opacity:'0.42',filter:'blur(2px)',transform:'matrix(1, 0, 0, 1, 0, 2)'}));
  const pending=motion.run(element,[{}, {opacity:0,filter:'blur(0px)',transform:'translateY(-4px)'}]);
  element.frames[0].animation.finish(); // Completion and Escape can happen in the same task.
  motion.cancel();await pending;
  assert.equal(element.style.opacity,'0.42');assert.equal(element.style.filter,'blur(2px)');
  assert.equal(element.style.transform,'matrix(1, 0, 0, 1, 0, 2)');
  assert.equal(motion.running.size,0);
});

test('Reduced motion and missing animation support reach the same usable final state',async()=>{
  for(const reduced of [false,true]){
    const element={style:{}};
    await new TransitionMotion({matches:reduced}).run(element,[{opacity:0},{opacity:1,height:'220px'}],{delay:200});
    assert.deepEqual(element.style,{opacity:1,height:'220px'});
  }
});
