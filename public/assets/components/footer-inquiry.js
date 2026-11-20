import {hasMessage,saveDraft,inquiryURL} from './hero-typewriter.js';
export const FOOTER_HANDOFF='mihail:footer-inquiry:v1';
export function handoffInquiry(message,{storage,dispatch,navigate}){
 if(!hasMessage(message)||Array.from(message).length>3000)return false;
 if(!dispatch(message))return true;
 try{storage.setItem(FOOTER_HANDOFF,message);saveDraft(storage,message);navigate('/');}
 catch{navigate(inquiryURL(message));}
 return true;
}
export function initializeFooters(){for(const form of document.querySelectorAll('[data-footer-inquiry]')){
 if(form.dataset.ready==='true')continue;form.dataset.ready='true';form.querySelector('button[type=submit]').disabled=false;
 const wrapper=form.closest('.footer-editor'),field=form.querySelector('textarea');let hovered=false,hoverFocus=false,timer;
 const reveal=()=>{clearTimeout(timer);wrapper.dataset.editing='true';};
 wrapper.addEventListener('pointerenter',event=>{if(event.pointerType!=='mouse')return;hovered=true;reveal();if(!document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')){hoverFocus=true;field.focus({preventScroll:true});}});
 const restore=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(hovered||field.value.trim())return;if(hoverFocus&&document.activeElement===field)field.blur();if(document.activeElement!==field)wrapper.dataset.editing='false';},800);};
 wrapper.addEventListener('pointerleave',()=>{hovered=false;restore();});field.addEventListener('pointerdown',()=>{hoverFocus=false;reveal();});field.addEventListener('focus',reveal);field.addEventListener('blur',restore);field.addEventListener('input',()=>{field.style.height='auto';field.style.height=Math.max(140,Math.min(260,field.scrollHeight))+'px';});
 form.addEventListener('submit',event=>{event.preventDefault();let storage;try{storage=sessionStorage;}catch{}handoffInquiry(field.value,{storage,dispatch:message=>document.dispatchEvent(new CustomEvent('portfolio-inquiry',{cancelable:true,detail:{message}})),navigate:url=>window.location.assign(url)});});
 field.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();form.requestSubmit();}});
}

}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializeFooters,{once:true});else initializeFooters();}
