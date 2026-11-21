// Register before the first rendering opportunity, without intercepting links.
(() => {
  let incoming=false;
  addEventListener('pagereveal',event=>{
    if(document.documentElement.dataset.brandBoot==='pending'&&event.viewTransition){
      event.viewTransition.ready.catch(()=>{});
      event.viewTransition.skipTransition();
    }
    incoming=Boolean(event.viewTransition)&&document.documentElement.dataset.brandBoot!=='pending';
    document.documentElement.dataset.pageReveal=incoming?'transition':'entrance';
  });
  addEventListener('pageshow',event=>{
    if(event.persisted&&!incoming)document.documentElement.dataset.pageReveal='return';
  });
})();
