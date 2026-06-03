
const rankOrder = {S:0,A:1,B:2,BCP:3};
const state = {priority:'all', type:'all', status:'all', q:''};
function typeClass(n){ if(n.type.includes('区立')) return 'type-ward'; if(n.priority==='BCP'||n.type.includes('企業')) return 'type-bcp'; return 'type-private'; }
function markerColor(n){ if(n.priority==='S') return '#dc2626'; if(n.type.includes('区立')) return '#ca8a04'; if(n.priority==='BCP') return '#2563eb'; return '#059669'; }
function filtered(){
  return [...window.NURSERIES].filter(n=>{
    const typeGroup = n.type.includes('区立')?'ward':(n.priority==='BCP'||n.type.includes('企業')||n.type.includes('認可外')?'bcp':'private');
    const q = state.q.trim().toLowerCase();
    return (state.priority==='all'||n.priority===state.priority)
      && (state.type==='all'||typeGroup===state.type)
      && (state.status==='all'||(n.status||'未調査')===state.status)
      && (!q || (n.name+n.address+n.note+n.type).toLowerCase().includes(q));
  }).sort((a,b)=>(rankOrder[a.priority]??9)-(rankOrder[b.priority]??9)||a.walk_min-b.walk_min||a.name.localeCompare(b.name,'ja'));
}
function cardHtml(n){
  return `<div class="card" data-id="${n.id}">
    <h3><span class="badge p-${n.priority}">${n.priority}</span> ${n.name}</h3>
    <div class="meta"><span class="${typeClass(n)} badge">${n.type}</span> 徒歩目安 ${n.walk_min}分 / ${n.status||'未調査'}</div>
    <div class="meta">${n.address}</div>
    <div class="meta">0歳枠: ${n.age0||'要確認'} / TEL: ${n.phone||'-'}</div>
    <div class="meta">${n.note||''}</div>
    <div class="actions"><a class="btn primary" href="${n.web}" target="_blank" rel="noopener">公式WEB</a><a class="btn" href="${n.maps}" target="_blank" rel="noopener">Google Maps</a></div>
  </div>`;
}
function popupHtml(n){return `<div class="popup-title">${n.priority}: ${n.name}</div><div>${n.type}</div><div>徒歩目安 ${n.walk_min}分</div><div class="popup-actions"><a href="${n.web}" target="_blank">公式WEB</a><a href="${n.maps}" target="_blank">Google Maps</a></div>`}
function renderList(onClick){
  const list=document.getElementById('list'); const items=filtered();
  document.getElementById('count').textContent=items.length;
  list.innerHTML=items.map(cardHtml).join('') || '<div class="notice">該当する園がありません。</div>';
  list.querySelectorAll('.card').forEach(el=>el.addEventListener('click',e=>{ if(e.target.closest('a')) return; onClick(el.dataset.id); }));
}
function bindFilters(refresh){
  ['priority','type','status'].forEach(id=>document.getElementById(id).addEventListener('change',e=>{state[id]=e.target.value;refresh();}));
  document.getElementById('q').addEventListener('input',e=>{state.q=e.target.value;refresh();});
}
