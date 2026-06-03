
(function(){
const data = window.NURSERIES || [];
function priorityLabel(p){return p==='S'?'S 本命':p==='A'?'A 第二候補':p==='B'?'B 保険':'BCP 認可外'}
function googleMapsUrl(n){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(n.name+' '+n.address)}
function matches(n,prefix){
  const q=(document.getElementById(prefix+'search')?.value||'').trim().toLowerCase();
  const p=document.getElementById(prefix+'priority')?.value||'all';
  const t=document.getElementById(prefix+'type')?.value||'all';
  const hay=`${n.name} ${n.address} ${n.type} ${n.note}`.toLowerCase();
  return (p==='all'||n.priority===p)&&(t==='all'||n.type.includes(t))&&(!q||hay.includes(q));
}
function cardHtml(n){return `<div class="card-title"><span class="badge ${n.priority}">${n.priority}</span>${escapeHtml(n.name)}</div><div class="meta">${escapeHtml(n.type)}<br>${escapeHtml(n.address)}<br>${escapeHtml(n.note||'')}</div><div class="actions"><a class="btn primary" href="${n.web}" target="_blank" rel="noopener">公式WEB</a><a class="btn" href="${googleMapsUrl(n)}" target="_blank" rel="noopener">Google Maps</a></div>`}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
window.Hokatsu = {data, priorityLabel, googleMapsUrl, matches, cardHtml, escapeHtml};
})();
