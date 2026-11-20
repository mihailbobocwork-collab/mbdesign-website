import test from 'node:test';
import assert from 'node:assert/strict';
import {keyboardVisible,focusScrollDelta} from '../public/assets/components/mobile-viewport.js';
test('Keyboard detection ignores browser chrome, pinch zoom, and non-editing viewport changes',()=>{
 assert.equal(keyboardVisible({baseline:844,height:410,editing:true}),true);
 for(const options of [{baseline:844,height:790,editing:true},{baseline:844,height:410,editing:false},{baseline:844,height:410,editing:true,scale:2}])assert.equal(keyboardVisible(options),false);
});
test('Focus visibility moves only obscured fields and handles Safari viewport panning',()=>{
 assert.equal(focusScrollDelta({top:100,bottom:150,height:400}),0);
 assert.equal(focusScrollDelta({top:390,bottom:440,height:400}),58);
 assert.equal(focusScrollDelta({top:30,bottom:90,viewportTop:50,height:400}),-38);
 assert.equal(focusScrollDelta({top:180,bottom:900,height:400}),162);
});
