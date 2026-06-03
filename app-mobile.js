
(function(){
const H=window.Hokatsu; const data=H.data;
function render(){
 const filtered=data.filter(n=>H.matches(n,'m-')); const list=document.getElementById('m-list'); const map=document.getElementById('m-map'); document.getElementById('m-count').textContent=`${filtered.length}件表示 / 全${data.length}件`; list.innerHTML=''; map.querySelectorAll('.m-pin').forEach(x=>x.remove());
 const lats=data.map(n=>n.lat), lngs=data.map(n=>n.lng), minLat=Math.min(...lats), maxLat=Math.max(...lats), minLng=Math.min(...lngs), maxLng=Math.max(...lngs);
 filtered.forEach(n=>{const x=7+(n.lng-minLng)/(maxLng-minLng)*86; const y=90-(n.lat-minLat)/(maxLat-minLat)*78; const pin=document.createElement('a'); pin.href='#card-'+slug(n.name); pin.className=`m-pin ${n.priority}`; pin.style.left=x+'%'; pin.style.top=y+'%'; pin.title=n.name; pin.innerHTML=`<span>${n.priority==='BCP'?'外':n.priority}</span>`; map.appendChild(pin);
  const card=document.createElement('div'); card.className='card'; card.id='card-'+slug(n.name); card.innerHTML=H.cardHtml(n); list.appendChild(card); });
}
function slug(s){return encodeURIComponent(s).replace(/%/g,'')}
['m-search','m-priority','m-type'].forEach(id=>document.getElementById(id).addEventListener('input',render));
window.addEventListener('load',render);
})();
