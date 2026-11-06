/* Apresentação em cartas: os registros, IDs e handlers originais são preservados. */
(() => {
 const selected = new Map();
 window.AgendaOrderDeck={
  refresh(container){
   container.querySelectorAll('.analyst-daily-body').forEach(body=>{
    const orders=Array.from(body.children).filter(el=>el.classList.contains('card-order-box'));
    if(orders.length<2)return;
    const analystCard=body.closest('.analyst-daily-card');
    const tools=Array.from(analystCard.querySelectorAll('.agenda-header-order-tools'));
    const key=App.selectedAgendaDate+':'+body.dataset.analystId;
    const deck=document.createElement('div');deck.className='agenda-order-deck';
    const nav=document.createElement('div');nav.className='agenda-deck-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Atendimentos do analista');
    const addButton=Array.from(body.children).find(el=>el.tagName==='BUTTON' && el.classList.contains('btn-secondary')); 
    const controls=document.createElement('div');controls.className='agenda-deck-controls';
    const stage=document.createElement('div');stage.className='agenda-deck-stage';
    orders[0].before(deck);deck.append(stage);
    body.append(controls);
    if(addButton){
     addButton.classList.add('agenda-deck-add');
     addButton.title='Adicionar outra O.S. para este analista na data selecionada';
     addButton.setAttribute('aria-label',addButton.title);
     addButton.innerHTML='<i class="fa-solid fa-plus" aria-hidden="true"></i> Adicionar O.S.';
     controls.append(addButton);
    }
    controls.append(nav);
    const tabs=orders.map((order,index)=>{
     const button=document.createElement('button');button.type='button';button.className='agenda-deck-tab';button.textContent=String(index+1);button.id='agenda-tab-'+order.id;button.setAttribute('role','tab');button.setAttribute('aria-controls',order.id);button.title='Exibir '+(index+1)+'º atendimento';
     order.setAttribute('role','tabpanel');order.setAttribute('aria-labelledby',button.id);
     button.onclick=()=>activate(index,true);button.onkeydown=event=>{
      let next=index;
      if(event.key==='ArrowRight')next=(index+1)%orders.length;
      else if(event.key==='ArrowLeft')next=(index-1+orders.length)%orders.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=orders.length-1;
      else return;
      event.preventDefault();activate(next,true);tabs[next].focus();
     };
     nav.append(button);stage.append(order);return button;
    });
    function activate(index,animate){
     selected.set(key,orders[index].id);
     orders.forEach((order,i)=>{
      const active=i===index;order.classList.toggle('is-deck-active',active);order.classList.remove('is-deck-turning');order.setAttribute('aria-hidden',String(!active));order.inert=!active;
      tabs[i].setAttribute('aria-selected',String(active));tabs[i].tabIndex=active?0:-1;
      if(tools[i])tools[i].hidden=!active;
     });
     if(animate){void orders[index].offsetWidth;orders[index].classList.add('is-deck-turning');}
    }
    const remembered=orders.findIndex(order=>order.id===selected.get(key));activate(remembered>=0?remembered:0,false);
   });
  }
 };
})();
