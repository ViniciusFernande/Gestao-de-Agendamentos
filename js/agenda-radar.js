/* Painel da agenda: coordenadas reaproveitadas do Radar; sem escrita no banco. */
(() => {
  const schools = window.AGENDA_RADAR_SCHOOLS || [];
  const URE_ADDRESS = 'Rua Manoel Gomes dos Santos Neto, 45 - Jardim Pagliato, Sorocaba - SP, 18046-154';
  const normalizeLocation = name => String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const isUre = order => ['ure sorocaba', 'unidade regional de ensino sorocaba', 'unidade regional de ensino de sorocaba', 'diretoria de ensino sorocaba', 'diretoria de ensino de sorocaba', 'diretoria de ensino regiao de sorocaba'].includes(normalizeLocation(order.schoolName));

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
        const panel=document.createElement('aside');panel.id='agenda-radar-panel';panel.className='agenda-radar-panel';panel.hidden=true;panel.setAttribute('aria-label','Mapa de atendimentos');
        panel.innerHTML='<div class="agenda-radar-heading"><h3><i class="fa-solid fa-map-location-dot"></i> Mapa de atendimentos</h3><button type="button" id="agenda-radar-clear" title="Fechar mapa" aria-label="Fechar mapa">×</button></div><div id="agenda-radar-selection" aria-live="polite">Selecione um atendimento para explorar as escolas próximas.</div><div id="agenda-radar-map" role="region" aria-label="Mini mapa das escolas"></div><p id="agenda-radar-map-status">O mapa será carregado ao selecionar uma escola.</p><h4>5 escolas mais próximas</h4><ol id="agenda-radar-list"></ol><p class="agenda-radar-note">Distâncias aproximadas em linha reta, a partir da escola selecionada. Escola prevista na agenda; sem localização em tempo real.</p>';
        layout.before(panel); document.getElementById('agenda-radar-clear').onclick=()=>api.close();
        document.addEventListener('keydown',event=>{if(event.key==='Escape' && !panel.hidden){event.preventDefault();api.close();}});
        document.addEventListener('click',event=>{if(panel.hidden || panel.contains(event.target) || event.target.closest?.('.agenda-radar-open'))return;api.close(false);},true);
      }
      container.querySelectorAll('.card-order-box').forEach(box=>{
        const id=box.id.slice('order-box-'.length);box.classList.toggle('radar-selected',id===selectedId);

      });
      container.querySelectorAll('.agenda-radar-open').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.scheduleId===selectedId)));
      const order=selectedId && store.getSchedules().find(s=>String(s.id)===selectedId && s.date===App.selectedAgendaDate);
      document.getElementById('agenda-radar-panel').hidden=!order;
      if(!order){container.querySelectorAll('.agenda-radar-open').forEach(button=>button.setAttribute('aria-pressed','false'));selectedId=null;selectionKey='';currentSchool=null;currentNearby=[];document.getElementById('agenda-radar-selection').textContent='Selecione um atendimento para explorar as escolas próximas.';document.getElementById('agenda-radar-list').replaceChildren();pins.forEach(p=>p.setMap(null));pins=[];if(map){map.setCenter({lat:-23.50,lng:-47.45});map.setZoom(11);}document.getElementById('agenda-radar-map-status').textContent='Selecione um atendimento para visualizar o mapa.';container.querySelectorAll('.radar-selected').forEach(el=>el.classList.remove('radar-selected'));return;}
      const school=schools.find(s=>String(s.cie)===String(order.schoolCie));const analyst=store.getAnalystById(order.analystId);
      const key=JSON.stringify([order.id,order.schoolCie,order.schoolName,order.date,analyst?.name]);if(key===selectionKey)return;selectionKey=key;
      document.getElementById('agenda-radar-selection').innerHTML='<span class="agenda-radar-analyst">'+esc(analyst?.name || 'Analista')+' · '+esc(order.date.split('-').reverse().join('/'))+'</span><strong>'+esc(order.schoolName)+'</strong><small>CIE: '+esc(order.schoolCie)+'</small>';
      pins.forEach(p=>p.setMap(null));pins=[];
      // Endereço fixo da URE, independente do cadastro geográfico do Radar.
      let fixedMap = document.getElementById('agenda-radar-fixed-map');
      if (fixedMap) fixedMap.hidden = true;
      if (isUre(order) && !located(school)) {
        currentSchool=null;currentNearby=[];
        document.getElementById('agenda-radar-map').hidden=true;
        if(!fixedMap){
          fixedMap=document.createElement('iframe');
          fixedMap.id='agenda-radar-fixed-map';
          fixedMap.title='Localização da URE Sorocaba';
          fixedMap.loading='lazy';
          fixedMap.referrerPolicy='no-referrer-when-downgrade';
          fixedMap.allowFullscreen=true;
          fixedMap.src='https://www.google.com/maps?q='+encodeURIComponent(URE_ADDRESS)+'&output=embed';
          document.getElementById('agenda-radar-map').after(fixedMap);
        }
        fixedMap.hidden=false;
        const link='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(URE_ADDRESS);
        document.getElementById('agenda-radar-selection').innerHTML += '<div class="agenda-ure-address">'+esc(URE_ADDRESS)+' · <a href="'+link+'" target="_blank" rel="noopener noreferrer">Abrir URE no Google Maps</a></div>';
        document.getElementById('agenda-radar-list').innerHTML='<li class="agenda-ure-location-note">URE cadastrada como local fixo por endereço. Para calcular as cinco escolas próximas, é necessário confirmar as coordenadas do prédio.</li>';
        document.getElementById('agenda-radar-map-status').textContent='URE Sorocaba — localização pesquisada pelo endereço informado.';
        return;
      }
      if(!located(school)){currentSchool=null;currentNearby=[];document.getElementById('agenda-radar-list').replaceChildren();document.getElementById('agenda-radar-map-status').textContent='Esta unidade não possui coordenadas vinculadas no Radar. Não é possível calcular a proximidade.';document.getElementById('agenda-radar-map').hidden=true;return;}
      document.getElementById('agenda-radar-map').hidden=false;currentSchool=school;currentNearby=nearest(school);
      document.getElementById('agenda-radar-list').innerHTML=currentNearby.map((s,i)=>'<li><span class="agenda-radar-number">'+(i+1)+'</span><div><a href="'+mapLink(s)+'" target="_blank" rel="noopener noreferrer">'+esc(s.name)+' <i class="fa-solid fa-arrow-up-right-from-square"></i></a><small>'+esc(s.area)+' · CIE '+esc(s.cie)+'</small></div><b>'+s.km.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+' km</b></li>').join('');
      loadMap().then(drawMap).catch(()=>{document.getElementById('agenda-radar-map-status').textContent='Mapa indisponível. A lista de distâncias continua disponível. Verifique a autorização do endereço da Gestão na chave do Google Maps.';});
    },
    select(id){selectedId=String(id);selectionKey='';api.refresh();},
    close(restoreFocus=true){const previous=selectedId;selectedId=null;selectionKey='';api.refresh();if(restoreFocus && previous)Array.from(document.querySelectorAll('#analyst-cards-container .agenda-radar-open')).find(button=>button.dataset.scheduleId===previous)?.focus({preventScroll:true});}
  };
  function loadMap(){
    if(window.google?.maps?.Map)return Promise.resolve();if(loading)return loading;
    document.getElementById('agenda-radar-map-status').textContent='Carregando mapa…';
    loading=new Promise((resolve,reject)=>{const script=document.createElement('script');const timer=setTimeout(()=>reject(Error('timeout')),20000);window.initAgendaRadarMap=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);reject(Error('load'));};window.gm_authFailure=()=>{clearTimeout(timer);reject(Error('auth'));document.getElementById('agenda-radar-map-status').textContent='Google Maps não autorizado para este endereço. A lista de proximidade permanece disponível.';};script.src='https://maps.googleapis.com/maps/api/js?key=AIzaSyCjAYawv7MVBeJmzcEs-v1YFnH4FT8xXbY&callback=initAgendaRadarMap&loading=async';script.async=true;document.head.append(script);});return loading;
  }
  function drawMap(){if(!currentSchool)return;const origin=currentSchool;const nearby=currentNearby;if(!map)map=new google.maps.Map(document.getElementById('agenda-radar-map'),{center:origin,zoom:13,disableDefaultUI:true,zoomControl:true,gestureHandling:'cooperative'});pins.forEach(p=>p.setMap(null));pins=[];const bounds=new google.maps.LatLngBounds();[origin,...nearby].forEach((s,i)=>{const marker=new google.maps.Marker({map,position:{lat:s.lat,lng:s.lng},title:s.name,label:{text:i===0?'★':String(i),color:'#ffffff'},icon:{path:google.maps.SymbolPath.CIRCLE,scale:i===0?13:11,fillColor:i===0?'#2584ef':'#16a568',fillOpacity:1,strokeWeight:2,strokeColor:'#ffffff'}});const info=new google.maps.InfoWindow({content:'<div style="color:#172b45"><strong>'+esc(s.name)+'</strong><br>CIE: '+esc(s.cie)+'<br><a target="_blank" rel="noopener noreferrer" href="'+mapLink(s)+'">Abrir no Google Maps</a></div>'});marker.addListener('click',()=>info.open({map,anchor:marker}));pins.push(marker);bounds.extend({lat:s.lat,lng:s.lng});});map.fitBounds(bounds,28);document.getElementById('agenda-radar-map-status').textContent='Azul: escola selecionada · Verde: escolas próximas';}
})();
