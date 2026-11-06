/* Ajuste visual dos cinco cards à largura disponível, sem alterar ações/dados. */
(() => {
 let observer;
 let frame;
 function fit(container) {
   if (!container.clientWidth) return;
   const base = Number(container.dataset.cardBaseWidth) || 340;
   container.querySelectorAll(':scope > .agenda-card-cell').forEach(cell => {
     const card=cell.firstElementChild;
     const width=cell.clientWidth;
     if(!card || !width)return;
     const naturalWidth=Math.max(base,width);
     const scale=width/naturalWidth;
     const cardWidth=naturalWidth+'px';
     if(card.style.width!==cardWidth)card.style.width=cardWidth;
     const transform='scale('+scale+')';
     if(card.style.transform!==transform)card.style.transform=transform;
     const height=Math.ceil(card.offsetHeight*scale)+'px';
     if(cell.style.height!==height)cell.style.height=height;
   });
 }
 window.AgendaCardLayout={
   refresh(container){
     if(observer)observer.disconnect();
     if(frame)cancelAnimationFrame(frame);
     Array.from(container.children).filter(card=>card.classList.contains('analyst-daily-card')).forEach(card=>{
       const cell=document.createElement('div');
       cell.className='agenda-card-cell';
       card.before(cell);cell.append(card);
     });
     fit(container);
     if(window.ResizeObserver){
       observer=new ResizeObserver(()=>{
         if(frame)cancelAnimationFrame(frame);
         frame=requestAnimationFrame(()=>fit(container));
       });
       observer.observe(container);
       container.querySelectorAll('.analyst-daily-card').forEach(card=>observer.observe(card));
     }
   }
 };
 window.addEventListener('resize',()=>{const container=document.getElementById('analyst-cards-container');if(container)fit(container);});
})();
