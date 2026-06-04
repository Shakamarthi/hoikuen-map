
const COLORS = {
  "S": "#22c55e",
  "A": "#3b82f6",
  "B": "#f59e0b",
  "C": "#ef4444",
  "BCP-S": "#16a34a",
  "BCP-A": "#0ea5e9",
  "BCP-B": "#eab308",
  "BCP-C": "#dc2626"
};

let map, markers = [];

function isBCP(item) {
  return item.kind !== "認可";
}
function markerIcon(item) {
  const color = COLORS[item.priority] || "#64748b";
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="width:18px;height:18px;background:${color};border:3px solid white;border-radius:${isBCP(item) ? "4px" : "50%"};box-shadow:0 1px 5px rgba(0,0,0,.45)"></div>`,
    iconSize: [24,24],
    iconAnchor: [12,12]
  });
}
function filteredData() {
  const kind = document.getElementById("kindFilter").value;
  const pri = document.getElementById("priorityFilter").value;
  const q = document.getElementById("searchBox").value.trim().toLowerCase();
  return window.NURSERIES.filter(n => {
    if (kind === "認可" && n.kind !== "認可") return false;
    if (kind === "bcp" && n.kind === "認可") return false;
    if (pri !== "all") {
      if (pri === "C" && n.priority !== "C") return false;
      else if (pri !== "C" && n.priority !== pri) return false;
    }
    if (q && !(`${n.name} ${n.area} ${n.address} ${n.kind}`.toLowerCase().includes(q))) return false;
    return true;
  });
}
function renderList(items) {
  const list = document.getElementById("list");
  list.innerHTML = "";
  items.forEach(n => {
    const card = document.createElement("div");
    card.className = `card priority-${n.priority}`;
    card.innerHTML = `
      <h3>${n.name}</h3>
      <div class="badges">
        <span class="badge">${n.priority}</span>
        <span class="badge">${n.kind}</span>
        <span class="badge">${n.area}</span>
        <span class="badge">0歳:${n.zero}</span>
      </div>
      <p>${n.address}</p>
      <p>0歳定員/地域枠: ${n.zeroCapacity ?? "要確認"} / 開始: ${n.startAge ?? "要確認"}</p>
      <p>導線: ${n.route} / 徒歩${n.walk ?? "-"}分・自転車${n.bike ?? "-"}分目安</p>
      <p>${n.note || ""}</p>
      <div class="btns">
        <a href="${n.web}" target="_blank" onclick="event.stopPropagation()">公式WEB</a>
        <a class="mapbtn" href="${n.map}" target="_blank" onclick="event.stopPropagation()">Google Maps</a>
      </div>`;
    card.addEventListener("click", () => focusMarker(n));
    list.appendChild(card);
  });
  const auth = items.filter(n => n.kind === "認可").length;
  const bcp = items.filter(n => n.kind !== "認可").length;
  document.getElementById("summary").innerHTML = `表示中：${items.length}件（認可 ${auth} / BCP ${bcp}）<br>丸ピン=認可、四角ピン=認可外BCP。赤系は優先度低め・遠方保険。`;
}
function popupHtml(n) {
  return `<div class="popup-title">${n.name}</div>
  <div>${n.priority} / ${n.kind} / ${n.area}</div>
  <div>0歳: ${n.zero} ${n.zeroCapacity ? " / " + n.zeroCapacity : ""}</div>
  <div>${n.address}</div>
  <div class="popup-actions"><a href="${n.web}" target="_blank">公式WEB</a><a href="${n.map}" target="_blank">Google Maps</a></div>`;
}
function renderMarkers(items) {
  if (!map) return;
  markers.forEach(m => map.removeLayer(m.marker));
  markers = [];
  items.forEach(n => {
    if (!n.lat || !n.lng) return;
    const marker = L.marker([n.lat, n.lng], {icon: markerIcon(n)}).addTo(map).bindPopup(popupHtml(n));
    markers.push({name:n.name, marker});
  });
}
function focusMarker(n) {
  if (!map || !n.lat || !n.lng) return;
  map.setView([n.lat, n.lng], 15);
  const found = markers.find(m => m.name === n.name);
  if (found) found.marker.openPopup();
}
function update() {
  const items = filteredData();
  renderList(items);
  renderMarkers(items);
}
function init() {
  renderList(window.NURSERIES);
  try {
    map = L.map("map").setView([35.660, 139.860], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    renderMarkers(window.NURSERIES);
  } catch (e) {
    document.getElementById("fallback").hidden = false;
    console.error(e);
  }
  ["kindFilter","priorityFilter","searchBox"].forEach(id => {
    document.getElementById(id).addEventListener("input", update);
  });
}
document.addEventListener("DOMContentLoaded", init);
