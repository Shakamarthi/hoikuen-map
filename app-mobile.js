(function(){
const H=window.Hokatsu; const data=H.data;
let map=null; let layer=null; let fallback=false;
const statusEl=()=>document.getElementById('map-status');
const color={S:'#dc2626',A:'#2563eb',B:'#16a34a',BCP:'#7c3aed'};

function initMap(){
  const el=document.getElementById('m-map');
  if(!window.L){ fallback=true; renderFallbackBase(el); statusEl().textContent='実地図を読み込めなかったため、簡易マップで表示しています。'; return; }
  map=L.map('m-map',{zoomControl:false,attributionControl:true}).setView([35.660,139.859],14);
  L.control.zoom({position:'bottomright'}).addTo(map);
  layer=L.layerGroup().addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
  statusEl().textContent='実地図表示：OK';
  setTimeout(()=>map.invalidateSize(),300);
}

function markerHtml(n){
 const txt=n.priority==='BCP'?'外':n.priority;
 return `<div class="real-pin ${n.priority}">${txt}</div>`;
}
function popupHtml(n){
 return `<div class="popup"><b>${escapeHtml(n.name)}</b><br>${escapeHtml(n.type)}<br>${escapeHtml(n.address)}<div class="popup-actions"><a href="${n.web}" target="_blank" rel="noopener">公式WEB</a><a href="${H.gmap(n)}" target="_blank" rel="noopener">Google Maps</a></div></div>`;
}
function renderReal(filtered){
 layer.clearLayers();
 const bounds=[];
 filtered.forEach(n=>{
   const icon=L.divIcon({html:markerHtml(n),className:'real-pin-wrap',iconSize:[34,34],iconAnchor:[17,17]});
   const m=L.marker([n.lat,n.lng],{icon}).addTo(layer).bindPopup(popupHtml(n));
   bounds.push([n.lat,n.lng]);
 });
 if(bounds.length){ map.fitBounds(bounds,{padding:[28,28],maxZoom:15}); }
 setTimeout(()=>map.invalidateSize(),100);
}

function renderFallbackBase(el){
 el.classList.remove('real-map'); el.classList.add('fallback-map');
 el.innerHTML='<div class="map-label label-seishin">清新町</div><div class="map-label label-nishikasai">西葛西</div><div class="map-label label-kasai">葛西方面</div><div class="map-label label-station">西葛西駅</div><div class="road road-main"></div><div class="road road-sub"></div><div class="river"></div>';
}
function renderFallback(filtered){
 const mapEl=document.getElementById('m-map');
 mapEl.querySelectorAll('.m-pin').forEach(x=>x.remove());
 const lats=data.map(n=>n.lat), lngs=data.map(n=>n.lng), minLat=Math.min(...lats), maxLat=Math.max(...lats), minLng=Math.min(...lngs), maxLng=Math.max(...lngs);
 filtered.forEach(n=>{const x=7+(n.lng-minLng)/(maxLng-minLng)*86; const y=90-(n.lat-minLat)/(maxLat-minLat)*78; const pin=document.createElement('a'); pin.href=n.web; pin.target='_blank'; pin.rel='noopener'; pin.className=`m-pin ${n.priority}`; pin.style.left=x+'%'; pin.style.top=y+'%'; pin.title=n.name; pin.innerHTML=`<span>${n.priority==='BCP'?'外':n.priority}</span>`; mapEl.appendChild(pin);});
}

function render(){
 const filtered=data.filter(n=>H.matches(n,'m-'));
 const list=document.getElementById('m-list');
 document.getElementById('m-count').textContent=`${filtered.length}件表示 / 全${data.length}件`;
 list.innerHTML='';
 filtered.forEach(n=>{const card=document.createElement('div'); card.className='card'; card.id='card-'+slug(n.name); card.innerHTML=H.cardHtml(n); card.addEventListener('click',e=>{if(e.target.closest('a')) return; focusNursery(n);}); list.appendChild(card);});
 if(fallback) renderFallback(filtered); else renderReal(filtered);
}
function focusNursery(n){
 if(map && !fallback){ map.setView([n.lat,n.lng],16); layer.eachLayer(m=>{const ll=m.getLatLng(); if(Math.abs(ll.lat-n.lat)<0.00001 && Math.abs(ll.lng-n.lng)<0.00001) m.openPopup();}); }
 else { location.hash='card-'+slug(n.name); }
}
function slug(s){return encodeURIComponent(s).replace(/%/g,'')}
function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

['m-search','m-priority','m-type'].forEach(id=>document.getElementById(id).addEventListener('input',render));
window.addEventListener('load',()=>{initMap(); render();});
window.addEventListener('orientationchange',()=>setTimeout(()=>map && map.invalidateSize(),500));
})();
