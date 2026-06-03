
(function(){
const H=window.Hokatsu; const data=H.data; let map=null, markerLayer=null, markers=new Map();
function markerIcon(p){return L.divIcon({className:'',html:`<div class="marker ${p}"><span>${p==='BCP'?'外':p}</span></div>`,iconSize:[30,30],iconAnchor:[15,30],popupAnchor:[0,-30]});}
function popupHtml(n){return `<div class="popup"><h2>${H.escapeHtml(n.name)}</h2><p><b>${H.priorityLabel(n.priority)}</b> / ${H.escapeHtml(n.type)}</p><p>${H.escapeHtml(n.address)}</p><p>電話：${H.escapeHtml(n.phone||'要確認')}</p><p>${H.escapeHtml(n.note||'')}</p><div class="actions"><a class="btn primary" href="${n.web}" target="_blank" rel="noopener">公式WEB</a><a class="btn" href="${H.googleMapsUrl(n)}" target="_blank" rel="noopener">Google Maps</a></div></div>`;}
function initMap(){
  try{
    if(!window.L) throw new Error('Leaflet not loaded');
    map=L.map('map',{zoomControl:true}).setView([35.6607,139.8600],14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
    markerLayer=L.layerGroup().addTo(map); render();
  }catch(e){document.body.classList.add('map-error'); renderFallback(); render();}
}
function renderFallback(){
  const box=document.getElementById('fallbackGrid'); if(!box) return; box.innerHTML='';
  const lats=data.map(n=>n.lat), lngs=data.map(n=>n.lng), minLat=Math.min(...lats), maxLat=Math.max(...lats), minLng=Math.min(...lngs), maxLng=Math.max(...lngs);
  data.forEach(n=>{const x=8+(n.lng-minLng)/(maxLng-minLng)*84; const y=92-(n.lat-minLat)/(maxLat-minLat)*84; const a=document.createElement('a'); a.href=n.web; a.target='_blank'; a.rel='noopener'; a.className=`fallback-pin ${n.priority}`; a.style.left=x+'%'; a.style.top=y+'%'; a.title=n.name; a.innerHTML=`<span>${n.priority==='BCP'?'外':n.priority}</span>`; box.appendChild(a);});
}
function render(){
  const filtered=data.filter(n=>H.matches(n,'')); const list=document.getElementById('list'); document.getElementById('count').textContent=`${filtered.length}件表示 / 全${data.length}件`; list.innerHTML='';
  const bounds=[]; if(markerLayer){markerLayer.clearLayers(); markers=new Map();}
  filtered.forEach(n=>{ if(markerLayer){const m=L.marker([n.lat,n.lng],{icon:markerIcon(n.priority)}).bindPopup(popupHtml(n),{maxWidth:340}).addTo(markerLayer); markers.set(n.name,m); bounds.push([n.lat,n.lng]);}
    const card=document.createElement('div'); card.className='card'; card.innerHTML=H.cardHtml(n); card.addEventListener('click',e=>{if(e.target.closest('a'))return; if(map&&markers.has(n.name)){map.setView([n.lat,n.lng],17); markers.get(n.name).openPopup();} else {window.open(n.web,'_blank','noopener');}}); list.appendChild(card); });
  if(map&&bounds.length){map.fitBounds(bounds,{padding:[40,40],maxZoom:15});}
}
['search','priority','type'].forEach(id=>document.getElementById(id).addEventListener('input',render));
window.addEventListener('load',()=>{initMap(); setTimeout(()=>{if(!map) document.body.classList.add('map-error')},2500);});
})();
