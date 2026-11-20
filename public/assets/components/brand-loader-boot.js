// Runs before first paint. A failed module must never leave the website hidden.
(() => {
  let seen=false;
  try{seen=sessionStorage.getItem('mihail:brand-entrance:v1')==='seen';}catch{}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const historyNavigation=performance.getEntriesByType('navigation')[0]?.type==='back_forward';
  if(seen||reduced||historyNavigation)return;
  const root=document.documentElement;
  root.dataset.brandBoot='pending';root.dataset.brandSequence='active';
  setTimeout(()=>{
    if(root.dataset.brandBoot!=='pending')return;
    delete root.dataset.brandBoot;root.dataset.brandSequence='done';
    dispatchEvent(new Event('brand-loader-skip'));
  },4200);
})();
