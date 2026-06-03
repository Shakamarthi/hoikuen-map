
let map, markers={};
function initMap(){
  try{
    map=L.map('map').setView([35.660,139.859],14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
    setTimeout(()=>map.invalidateSize(),100);
    renderMarkers();
  }catch(e){showFallback(e)}
}
function icon(n){return L.divIcon({className:'',html:`<div style="width:22px;height:22px;border-radius:50%;background:${markerColor(n)};border:3px solid white;box-shadow:0 1px 5px #333"></div>`,iconSize:[22,22],iconAnchor:[11,11]});}
function renderMarkers(){ Object.values(markers).forEach(m=>m.remove()); markers={}; filtered().forEach(n=>{const m=L.marker([n.lat,n.lng],{icon:icon(n)}).addTo(map).bindPopup(popupHtml(n)); markers[n.id]=m;}); }
function focusNursery(id){const n=window.NURSERIES.find(x=>x.id===id); if(!n||!map) return; map.setView([n.lat,n.lng],16); markers[id]?.openPopup();}
function refresh(){renderList(focusNursery); renderMarkers();}
function showFallback(e){document.getElementById('map').innerHTML='<div class="fallback-map"><div><b>地図を読み込めませんでした</b><br>下部リストのGoogle Mapsボタンで確認してください。</div></div>'; console.error(e)}
document.addEventListener('DOMContentLoaded',()=>{bindFilters(refresh); renderList(focusNursery); initMap();});
