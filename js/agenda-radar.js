/* Painel da agenda: coordenadas reaproveitadas do Radar; sem escrita no banco. */
(() => {
  const schools = window.AGENDA_RADAR_SCHOOLS || [];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const located = s => s && Number.isFinite(s.lat) && Number.isFinite(s.lng);
  const km = (a,b) => { const r = Math.PI/180, dlat=(b.lat-a.lat)*r, dlng=(b.lng-a.lng)*r; const h=Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlng/2)**2; return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h))); };
  const nearest = origin => schools.filter(s => located(s) && String(s.cie)!==String(origin.cie)).map(s => ({...s,km:km(origin,s)})).sort((a,b)=>a.km-b.km || a.name.localeCompare(b.name)).slice(0,5);
  let selectedId=null, map=null, pins=[], loading=null, currentSchool=null, currentNearby=[], selectionKey='';
  const mapLink=s=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(s.lat+','+s.lng);
  const api = window.AgendaRadar = {
    km, nearest,
    refresh() {
      const container=document.getElementById('analyst-cards-container'); if(!container)return;
      if(!document.getElementById('agenda-radar-panel')) {
        const layout=document.createElement('div');layout.className='agenda-radar-layout';container.before(layout);layout.append(container);
        const panel=document.createElement('aside');panel.id='agenda-radar-panel';panel.className='agenda-radar-panel';panel.setAttribute('aria-label','Mapa de atendimentos');
        panel.innerHTML='<div class="agenda-radar-heading"><h3><i class="fa-solid fa-map-location-dot"></i> Mapa de atendimentos</h3><button type="button" id="agenda-radar-clear" title="Limpar seleção" aria-label="Limpar seleção">×</button></div><div id="agenda-radar-selection" aria-live="polite">Selecione um atendimento para explorar as escolas próximas.</div><div id="agenda-radar-map" role="region" aria-label="Mini mapa das escolas"></div><p id="agenda-radar-map-status">O mapa será carregado ao selecionar uma escola.</p><h4>5 escolas mais próximas</h4><ol id="agenda-radar-list"></ol><p class="agenda-radar-note">Distâncias aproximadas em linha reta, a partir da escola selecionada. Escola prevista na agenda; sem localização em tempo real.</p>';
        layout.append(panel); document.getElementById('agenda-radar-clear').onclick=()=>{selectedId=null;selectionKey='';api.refresh();};
        container.addEventListener('click',event=>{if(event.target.closest('button,input,select,textarea,a,label'))return;const box=event.target.closest('.card-order-box');if(box)api.select(box.id.slice('order-box-'.length));});
      }
      container.querySelectorAll('.card-order-box').forEach(box=>{
        const id=box.id.slice('order-box-'.length);box.classList.toggle('radar-selected',id===selectedId);
        let button=box.querySelector('.agenda-radar-open');if(!button){button=document.createElement('button');button.type='button';button.className='agenda-radar-open';button.innerHTML='<i class="fa-solid fa-location-dot"></i> Ver proximidade';button.onclick=()=>api.select(id);box.append(button);}button.setAttribute('aria-pressed',String(id===selectedId));
      });
      const order=selectedId && store.getSchedules().find(s=>String(s.id)===selectedId && s.date===App.selectedAgendaDate);
      if(!order){selectedId=null;selectionKey='';currentSchool=null;currentNearby=[];document.getElementById('agenda-radar-selection').textContent='Selecione um atendimento para explorar as escolas próximas.';document.getElementById('agenda-radar-list').replaceChildren();pins.forEach(p=>p.setMap(null));pins=[];if(map){map.setCenter({lat:-23.50,lng:-47.45});map.setZoom(11);}document.getElementById('agenda-radar-map-status').textContent='Selecione um atendimento para visualizar o mapa.';container.querySelectorAll('.radar-selected').forEach(el=>el.classList.remove('radar-selected'));return;}
      const school=schools.find(s=>String(s.cie)===String(order.schoolCie));const analyst=store.getAnalystById(order.analystId);
      const key=JSON.stringify([order.id,order.schoolCie,order.schoolName,order.date,analyst?.name]);if(key===selectionKey)return;selectionKey=key;
      document.getElementById('agenda-radar-selection').innerHTML='<span class="agenda-radar-analyst">'+esc(analyst?.name || 'Analista')+' · '+esc(order.date.split('-').reverse().join('/'))+'</span><strong>'+esc(order.schoolName)+'</strong><small>CIE: '+esc(order.schoolCie)+'</small>';
      pins.forEach(p=>p.setMap(null));pins=[];
      if(!located(school)){currentSchool=null;currentNearby=[];document.getElementById('agenda-radar-list').replaceChildren();document.getElementById('agenda-radar-map-status').textContent='Esta unidade não possui coordenadas vinculadas no Radar. Não é possível calcular a proximidade.';document.getElementById('agenda-radar-map').hidden=true;return;}
      document.getElementById('agenda-radar-map').hidden=false;currentSchool=school;currentNearby=nearest(school);
      document.getElementById('agenda-radar-list').innerHTML=currentNearby.map((s,i)=>'<li><span class="agenda-radar-number">'+(i+1)+'</span><div><a href="'+mapLink(s)+'" target="_blank" rel="noopener noreferrer">'+esc(s.name)+' <i class="fa-solid fa-arrow-up-right-from-square"></i></a><small>'+esc(s.area)+' · CIE '+esc(s.cie)+'</small></div><b>'+s.km.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+' km</b></li>').join('');
      loadMap().then(drawMap).catch(()=>{document.getElementById('agenda-radar-map-status').textContent='Mapa indisponível. A lista de distâncias continua disponível. Verifique a autorização do endereço da Gestão na chave do Google Maps.';});
    },
    select(id){selectedId=String(id);selectionKey='';api.refresh();}
  };
  function loadMap(){
    if(window.google?.maps?.Map)return Promise.resolve();if(loading)return loading;
    document.getElementById('agenda-radar-map-status').textContent='Carregando mapa…';
    loading=new Promise((resolve,reject)=>{const script=document.createElement('script');const timer=setTimeout(()=>reject(Error('timeout')),20000);window.initAgendaRadarMap=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);reject(Error('load'));};window.gm_authFailure=()=>{clearTimeout(timer);reject(Error('auth'));document.getElementById('agenda-radar-map-status').textContent='Google Maps não autorizado para este endereço. A lista de proximidade permanece disponível.';};script.src='https://maps.googleapis.com/maps/api/js?key=AIzaSyCjAYawv7MVBeJmzcEs-v1YFnH4FT8xXbY&callback=initAgendaRadarMap&loading=async';script.async=true;document.head.append(script);});return loading;
  }
  function drawMap(){if(!currentSchool)return;const origin=currentSchool;const nearby=currentNearby;if(!map)map=new google.maps.Map(document.getElementById('agenda-radar-map'),{center:origin,zoom:13,disableDefaultUI:true,zoomControl:true,gestureHandling:'cooperative'});pins.forEach(p=>p.setMap(null));pins=[];const bounds=new google.maps.LatLngBounds();[origin,...nearby].forEach((s,i)=>{const marker=new google.maps.Marker({map,position:{lat:s.lat,lng:s.lng},title:s.name,label:{text:i===0?'★':String(i),color:'#ffffff'},icon:{path:google.maps.SymbolPath.CIRCLE,scale:i===0?13:11,fillColor:i===0?'#2584ef':'#16a568',fillOpacity:1,strokeWeight:2,strokeColor:'#ffffff'}});const info=new google.maps.InfoWindow({content:'<div style="color:#172b45"><strong>'+esc(s.name)+'</strong><br>CIE: '+esc(s.cie)+'<br><a target="_blank" rel="noopener noreferrer" href="'+mapLink(s)+'">Abrir no Google Maps</a></div>'});marker.addListener('click',()=>info.open({map,anchor:marker}));pins.push(marker);bounds.extend({lat:s.lat,lng:s.lng});});map.fitBounds(bounds,28);document.getElementById('agenda-radar-map-status').textContent='Azul: escola selecionada · Verde: escolas próximas';}
})();
