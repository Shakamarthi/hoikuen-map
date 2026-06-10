const DRAFT_KEY = "hoiku_v1_input_draft";
const GRADE_POINTS = { S: 5, A: 4, B: 3, C: 2, D: 1 };
const WEIGHTS = {
  admission: 0.30,
  commute: 0.25,
  careQuality: 0.20,
  atmosphere: 0.15,
  parentBurden: 0.05,
  sickPolicy: 0.05
};
const CATEGORY_LABELS = {
  admission: "入園可能性",
  commute: "通園運用",
  parentBurden: "保護者負荷",
  sickPolicy: "病気対応",
  careQuality: "保育品質",
  atmosphere: "雰囲気"
};
const CATEGORY_ORDER = ["admission", "commute", "parentBurden", "sickPolicy", "careQuality", "atmosphere"];
const PRIORITY_ORDER = { S: 1, A: 2, B: 3, C: 4, "BCP-S": 5, "BCP-A": 6, "BCP-B": 7, "BCP-C": 8 };

const FIELD_SECTIONS = [
  {
    key: "admission",
    title: "入園可能性",
    fields: [
      ["zeroCapacityActual", "0歳定員"],
      ["lastApplicants", "昨年応募数"],
      ["lastMinIndex", "昨年最低指数"],
      ["samePointPeople", "同点人数"],
      ["carryOverPeople", "持ち上がり人数"],
      ["effectiveSlots", "実質募集枠"]
    ]
  },
  {
    key: "commute",
    title: "通園運用",
    fields: [
      ["commuteTime", "所要時間"],
      ["rainDay", "雨の日評価"],
      ["stroller", "ベビーカー"],
      ["bicycle", "自転車"],
      ["dropoffDeadline", "登園締切"],
      ["extendedCare", "延長保育"]
    ]
  },
  {
    key: "parentBurden",
    title: "保護者負荷",
    fields: [
      ["diaper", "おむつ"],
      ["futon", "布団"],
      ["sheets", "シーツ"],
      ["handmade", "手作り品"],
      ["parentsAssociation", "保護者会"],
      ["eventBurden", "行事負荷"]
    ]
  },
  {
    key: "sickPolicy",
    title: "病気対応",
    fields: [
      ["feverRule", "発熱基準"],
      ["afterFeverRule", "解熱後ルール"],
      ["vomitRule", "下痢嘔吐ルール"],
      ["medicine", "投薬対応"]
    ]
  },
  {
    key: "careQuality",
    title: "保育品質",
    fields: [
      ["zeroStaff", "0歳担当人数"],
      ["outsideFrequency", "外遊び頻度"],
      ["yard", "園庭"],
      ["walkDestination", "散歩先"],
      ["safety", "安全対策"]
    ]
  },
  {
    key: "atmosphere",
    title: "雰囲気",
    fields: [
      ["childrenFace", "子どもの表情"],
      ["teacherVoice", "保育士の声掛け"],
      ["teacherRelation", "保育士同士の関係"],
      ["principalImpression", "園長の印象"],
      ["cleanliness", "清潔感"]
    ]
  }
];

let state = JSON.parse(JSON.stringify(window.INITIAL_HOIKU_DATA));
let currentFileName = "初期データ";
let selectedId = state.nurseries[0]?.id || null;
let leafletMap = null;
let leafletMarkers = [];

const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function reviewOf(nursery) {
  nursery.review ||= {};
  nursery.wish ||= { rank: null, reason: "", concerns: "" };
  return nursery.review;
}

function gradePoint(grade) {
  return GRADE_POINTS[grade] || 0;
}

function totalScore(review) {
  const hasAny = CATEGORY_ORDER.some((key) => review[`${key}Grade`]);
  if (!hasAny) return null;
  const score = Object.entries(WEIGHTS).reduce((sum, [key, weight]) => {
    return sum + gradePoint(review[`${key}Grade`]) * weight;
  }, 0);
  return Math.round(score * 10) / 10;
}

function visitStatus(nursery) {
  const review = reviewOf(nursery);
  if (review.visitStatus) return review.visitStatus;
  if (Object.keys(review).length) return "評価済";
  return "未見学";
}

function statusClass(status) {
  if (status === "評価済") return "done";
  if (status === "見学済" || status === "見学予約済") return "doing";
  return "todo";
}

function filteredNurseries() {
  const kind = $("kindFilter").value;
  const priority = $("priorityFilter").value;
  const query = $("searchBox").value.trim().toLowerCase();
  return state.nurseries.filter((n) => {
    if (kind === "認可" && n.kind !== "認可") return false;
    if (kind === "認可外" && n.kind === "認可") return false;
    if (priority !== "all" && n.priority !== priority) return false;
    if (query && !`${n.name} ${n.area} ${n.address} ${n.priority}`.toLowerCase().includes(query)) return false;
    return true;
  });
}

function updateHeader() {
  $("currentFileName").textContent = currentFileName;
  $("lastUpdated").textContent = state.lastUpdated ? new Date(state.lastUpdated).toLocaleString("ja-JP") : "未保存";
  $("restoreDraft").hidden = !localStorage.getItem(DRAFT_KEY);
}

function renderSummary(items) {
  const reviewed = state.nurseries.filter((n) => totalScore(reviewOf(n)) !== null).length;
  const byStatus = ["未見学", "見学予約済", "見学済", "評価済"].map((label) => {
    return `${label}: ${state.nurseries.filter((n) => visitStatus(n) === label).length}`;
  }).join(" / ");
  $("summary").innerHTML = `
    <strong>表示中 ${items.length}件</strong> / 全${state.nurseries.length}件 / 評価済 ${reviewed}件<br>
    ${byStatus}
  `;
}

function renderList() {
  const items = filteredNurseries().sort((a, b) => (PRIORITY_ORDER[a.priority] || 99) - (PRIORITY_ORDER[b.priority] || 99));
  renderSummary(items);
  const list = $("nurseryList");
  list.innerHTML = items.map((n) => {
    const review = reviewOf(n);
    const score = totalScore(review);
    const status = visitStatus(n);
    return `
      <article class="nursery-card ${selectedId === n.id ? "selected" : ""}" data-id="${n.id}">
        <div class="card-top">
          <h3>${escapeHtml(n.name)}</h3>
          <span class="priority ${escapeHtml(n.priority)}">${escapeHtml(n.priority)}</span>
        </div>
        <div class="card-meta">
          <span>${escapeHtml(n.kind)}</span>
          <span>${escapeHtml(n.area)}</span>
          <span>距離: ${n.walk || "-"}分 / 自転車 ${n.bike || "-"}分</span>
        </div>
        <div class="card-status">
          <span class="status ${statusClass(status)}">${escapeHtml(status)}</span>
          <span class="status">総合 ${score ?? "-"}</span>
          <span class="status">志望 ${n.wish?.rank || "-"}</span>
        </div>
        <p>${escapeHtml(n.note || "")}</p>
        <div class="card-actions">
          <button type="button" data-action="detail">詳細</button>
          <button type="button" data-action="review">見学評価</button>
        </div>
      </article>
    `;
  }).join("");
  renderMap(items);
  renderDetail(state.nurseries.find((n) => n.id === selectedId) || items[0]);
}

function renderMap(items) {
  const map = $("offlineMap");
  if (window.L) {
    renderLeafletMap(items);
    return;
  }
  const plotted = items.filter((n) => Number.isFinite(n.lat) && Number.isFinite(n.lng));
  if (!plotted.length) {
    map.innerHTML = "<p class='empty'>位置情報がありません。</p>";
    return;
  }
  const lats = plotted.map((n) => n.lat);
  const lngs = plotted.map((n) => n.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  map.innerHTML = plotted.map((n) => {
    const x = ((n.lng - minLng) / Math.max(maxLng - minLng, 0.0001)) * 86 + 7;
    const y = (1 - (n.lat - minLat) / Math.max(maxLat - minLat, 0.0001)) * 82 + 9;
    return `<button class="map-dot priority-${escapeHtml(n.priority)} ${selectedId === n.id ? "active" : ""}" style="left:${x}%;top:${y}%" title="${escapeHtml(n.name)}" data-id="${n.id}" type="button"></button>`;
  }).join("");
}

function markerColor(priority) {
  return {
    S: "#059669",
    A: "#2563eb",
    B: "#c47f00",
    C: "#c2410c",
    "BCP-S": "#059669",
    "BCP-A": "#2563eb",
    "BCP-B": "#c47f00",
    "BCP-C": "#c2410c"
  }[priority] || "#64748b";
}

function leafletIcon(nursery) {
  const isBcp = nursery.kind !== "認可";
  return L.divIcon({
    className: "custom-marker",
    html: `<span style="display:block;width:20px;height:20px;background:${markerColor(nursery.priority)};border:3px solid #fff;border-radius:${isBcp ? "5px" : "50%"};box-shadow:0 2px 8px rgba(0,0,0,.35)"></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13]
  });
}

function popupHtml(n) {
  const score = totalScore(reviewOf(n));
  return `
    <div class="popup-title">${escapeHtml(n.name)}</div>
    <div>${escapeHtml(n.priority)} / ${escapeHtml(n.kind)} / ${escapeHtml(n.area)}</div>
    <div>総合スコア: ${score ?? "未評価"}</div>
    <div>${escapeHtml(n.address)}</div>
    <div class="popup-actions">
      <a href="${escapeHtml(n.web)}" target="_blank" rel="noreferrer">公式HP</a>
      <a href="${escapeHtml(n.map)}" target="_blank" rel="noreferrer">Google Maps</a>
    </div>
  `;
}

function renderLeafletMap(items) {
  const mapEl = $("offlineMap");
  mapEl.classList.add("leaflet-map");
  if (!leafletMap) {
    leafletMap = L.map(mapEl, { zoomControl: true }).setView([35.660, 139.860], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(leafletMap);
  }
  setTimeout(() => leafletMap.invalidateSize(), 0);
  leafletMarkers.forEach((marker) => marker.remove());
  leafletMarkers = [];
  const plotted = items.filter((n) => Number.isFinite(n.lat) && Number.isFinite(n.lng));
  plotted.forEach((n) => {
    const marker = L.marker([n.lat, n.lng], { icon: leafletIcon(n) })
      .addTo(leafletMap)
      .bindPopup(popupHtml(n));
    marker.on("click", () => {
      selectedId = n.id;
      renderDetail(n);
      renderList();
    });
    leafletMarkers.push(marker);
    if (n.id === selectedId) marker.openPopup();
  });
  if (plotted.length) {
    const selected = plotted.find((n) => n.id === selectedId);
    if (selected) {
      leafletMap.setView([selected.lat, selected.lng], Math.max(leafletMap.getZoom(), 15), { animate: false });
    } else if (plotted.length > 1) {
      leafletMap.fitBounds(plotted.map((n) => [n.lat, n.lng]), { padding: [28, 28] });
    }
  }
}

function renderDetail(n) {
  if (!n) return;
  selectedId = n.id;
  const review = reviewOf(n);
  const score = totalScore(review);
  $("detailPanel").innerHTML = `
    <div class="detail-head">
      <div>
        <h2>${escapeHtml(n.name)}</h2>
        <p>${escapeHtml(n.kind)} / ${escapeHtml(n.area)} / ${escapeHtml(n.priority)}</p>
      </div>
      <button class="button primary" data-detail-review="${n.id}" type="button">見学評価</button>
    </div>
    <dl class="detail-grid">
      <div><dt>住所</dt><dd>${escapeHtml(n.address)}</dd></div>
      <div><dt>0歳定員</dt><dd>${n.zeroCapacity || "要確認"}</dd></div>
      <div><dt>開始月齢</dt><dd>${escapeHtml(n.startAge || "要確認")}</dd></div>
      <div><dt>通園</dt><dd>${escapeHtml(n.route || "-")} / 徒歩 ${n.walk || "-"}分 / 自転車 ${n.bike || "-"}分</dd></div>
      <div><dt>見学方針</dt><dd>${escapeHtml(n.visitPolicy || "-")}</dd></div>
      <div><dt>総合スコア</dt><dd>${score ?? "未評価"}</dd></div>
    </dl>
    <div class="detail-links">
      <a href="${escapeHtml(n.web)}" target="_blank" rel="noreferrer">公式HP</a>
      <a href="${escapeHtml(n.map)}" target="_blank" rel="noreferrer">Google Maps</a>
    </div>
    <h3>見学結果・コメント</h3>
    <p>${escapeHtml(review.firstImpression || "未入力")}</p>
    <h3>要再確認事項</h3>
    <p>${escapeHtml(review.recheckItems || "未入力")}</p>
  `;
}

function buildFormSections() {
  $("sections").innerHTML = FIELD_SECTIONS.map((section) => `
    <section class="form-section">
      <div class="form-section-head">
        <h3>${section.title}</h3>
        <label>評価
          <select id="${section.key}Grade" name="${section.key}Grade" class="grade-select">
            <option value=""></option><option>S</option><option>A</option><option>B</option><option>C</option><option>D</option>
          </select>
        </label>
      </div>
      <div class="field-grid">
        ${section.fields.map(([key, label]) => `
          <label>${label}<input id="${key}" name="${key}" type="text"></label>
        `).join("")}
      </div>
    </section>
  `).join("");
}

function openReview(id) {
  const nursery = state.nurseries.find((n) => n.id === id);
  if (!nursery) return;
  const review = reviewOf(nursery);
  selectedId = id;
  $("nurseryId").value = id;
  $("formTitle").textContent = `見学評価: ${nursery.name}`;
  $("formSub").textContent = `${nursery.priority} / ${nursery.kind} / ${nursery.address}`;
  document.querySelectorAll("#reviewForm input, #reviewForm textarea, #reviewForm select").forEach((el) => {
    if (el.id === "nurseryId") return;
    el.value = review[el.name] ?? "";
  });
  $("wishRank").value = nursery.wish?.rank || review.wishRank || "";
  $("adoptionReason").value = nursery.wish?.reason || review.adoptionReason || "";
  $("concerns").value = nursery.wish?.concerns || review.concerns || "";
  $("reviewDialog").showModal();
}

function collectReviewForm() {
  const id = $("nurseryId").value;
  const nursery = state.nurseries.find((n) => n.id === id);
  if (!nursery) return null;
  const review = {};
  document.querySelectorAll("#reviewForm input, #reviewForm textarea, #reviewForm select").forEach((el) => {
    if (el.id !== "nurseryId" && el.name) review[el.name] = el.value;
  });
  review.updatedAt = new Date().toISOString();
  nursery.review = review;
  nursery.wish = {
    rank: review.wishRank ? Number(review.wishRank) : null,
    reason: review.adoptionReason || "",
    concerns: review.concerns || review.recheckItems || ""
  };
  state.lastUpdated = review.updatedAt;
  return nursery;
}

function saveDraft() {
  const id = $("nurseryId").value;
  if (!id || !$("reviewDialog").open) return;
  const values = {};
  document.querySelectorAll("#reviewForm input, #reviewForm textarea, #reviewForm select").forEach((el) => {
    if (el.name) values[el.name] = el.value;
  });
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ id, values, savedAt: new Date().toISOString() }));
  updateHeader();
}

function restoreDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
    if (!draft?.id) return;
    openReview(draft.id);
    Object.entries(draft.values || {}).forEach(([name, value]) => {
      const el = [...document.querySelectorAll("#reviewForm [name]")].find((field) => field.name === name);
      if (el) el.value = value;
    });
  } catch {
    alert("入力途中データを復元できませんでした。");
  }
}

function saveReview() {
  const nursery = collectReviewForm();
  if (!nursery) return;
  localStorage.removeItem(DRAFT_KEY);
  $("reviewDialog").close();
  renderAll();
}

function deleteReview() {
  const id = $("nurseryId").value;
  const nursery = state.nurseries.find((n) => n.id === id);
  if (!nursery || !confirm(`${nursery.name} の評価を削除しますか？`)) return;
  nursery.review = {};
  nursery.wish = { rank: null, reason: "", concerns: "" };
  state.lastUpdated = new Date().toISOString();
  localStorage.removeItem(DRAFT_KEY);
  $("reviewDialog").close();
  renderAll();
}

function normalizeLoadedData(data) {
  if (!data || !Array.isArray(data.nurseries)) throw new Error("invalid");
  return {
    version: data.version || "1.0",
    lastUpdated: data.lastUpdated || new Date().toISOString(),
    nurseries: data.nurseries.map((n, index) => ({
      id: n.id || `loaded-${index + 1}`,
      name: n.name || "",
      kind: n.kind || "",
      area: n.area || "",
      address: n.address || "",
      priority: n.priority || "",
      zeroCapacity: n.zeroCapacity ?? "",
      startAge: n.startAge || "",
      walk: n.walk ?? "",
      bike: n.bike ?? "",
      route: n.route || "",
      visitPolicy: n.visitPolicy || "",
      note: n.note || "",
      web: n.web || "",
      map: n.map || "",
      lat: Number(n.lat),
      lng: Number(n.lng),
      review: n.review || {},
      wish: n.wish || { rank: n.review?.wishRank ? Number(n.review.wishRank) : null, reason: "", concerns: "" }
    }))
  };
}

function loadJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = normalizeLoadedData(JSON.parse(reader.result));
      currentFileName = file.name;
      selectedId = state.nurseries[0]?.id || null;
      renderAll();
    } catch {
      alert("JSONを読み込めませんでした。形式を確認してください。");
    }
  };
  reader.readAsText(file);
}

function saveJson() {
  state.lastUpdated = new Date().toISOString();
  const yyyy = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const hhmm = new Date().toTimeString().slice(0, 5).replace(":", "");
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `保活データ_${yyyy}_${hhmm}.json`;
  link.click();
  URL.revokeObjectURL(url);
  currentFileName = link.download;
  renderAll();
}

function rankedNurseries() {
  return [...state.nurseries].sort((a, b) => {
    const ar = a.wish?.rank || 999;
    const br = b.wish?.rank || 999;
    if (ar !== br) return ar - br;
    return (totalScore(reviewOf(b)) ?? -1) - (totalScore(reviewOf(a)) ?? -1);
  });
}

function renderDashboard() {
  const counts = {
    unvisited: state.nurseries.filter((n) => visitStatus(n) === "未見学").length,
    visited: state.nurseries.filter((n) => visitStatus(n) === "見学済").length,
    reviewed: state.nurseries.filter((n) => totalScore(reviewOf(n)) !== null).length,
    recheck: state.nurseries.filter((n) => reviewOf(n).recheckItems?.trim()).length
  };
  $("progressCards").innerHTML = `
    <div><span>${counts.unvisited}</span>未見学</div>
    <div><span>${counts.visited}</span>見学済</div>
    <div><span>${counts.reviewed}</span>評価済</div>
    <div><span>${counts.recheck}</span>要確認</div>
  `;
  const ranked = rankedNurseries().filter((n) => totalScore(reviewOf(n)) !== null);
  $("rankingTable").innerHTML = `
    <table><thead><tr><th>順位</th><th>園名</th><th>優先度</th><th>総合</th><th>入園</th><th>通園</th><th>保育</th><th>雰囲気</th><th>負荷</th><th>病気</th></tr></thead>
    <tbody>${ranked.map((n, i) => {
      const r = reviewOf(n);
      return `<tr data-id="${n.id}"><td>${i + 1}</td><td>${escapeHtml(n.name)}</td><td>${escapeHtml(n.priority)}</td><td><strong>${totalScore(r)}</strong></td><td>${r.admissionGrade || "-"}</td><td>${r.commuteGrade || "-"}</td><td>${r.careQualityGrade || "-"}</td><td>${r.atmosphereGrade || "-"}</td><td>${r.parentBurdenGrade || "-"}</td><td>${r.sickPolicyGrade || "-"}</td></tr>`;
    }).join("")}</tbody></table>
  `;
  $("radarSelect").innerHTML = ranked.map((n) => `<option value="${n.id}">${escapeHtml(n.name)}</option>`).join("");
  drawRadar();
  $("coupleDiff").innerHTML = ranked.map((n) => {
    const r = reviewOf(n);
    if (!r.wifeComment && !r.husbandComment) return "";
    return `<article class="mini-card"><strong>${escapeHtml(n.name)}</strong><p>妻: ${escapeHtml(r.wifeComment || "-")}</p><p>夫: ${escapeHtml(r.husbandComment || "-")}</p></article>`;
  }).join("") || "<p class='empty'>妻夫コメントはまだありません。</p>";
  $("recheckList").innerHTML = state.nurseries.filter((n) => reviewOf(n).recheckItems?.trim()).map((n) => {
    return `<article class="mini-card"><strong>${escapeHtml(n.name)}</strong><p>${escapeHtml(reviewOf(n).recheckItems)}</p></article>`;
  }).join("") || "<p class='empty'>未解決事項はまだありません。</p>";
}

function drawRadar() {
  const canvas = $("radarCanvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const id = $("radarSelect").value;
  const nursery = state.nurseries.find((n) => n.id === id);
  const center = canvas.width / 2;
  const radius = 150;
  const labels = ["admission", "commute", "careQuality", "atmosphere", "parentBurden", "sickPolicy"];
  ctx.font = "14px sans-serif";
  ctx.textAlign = "center";
  for (let level = 1; level <= 5; level += 1) {
    ctx.beginPath();
    labels.forEach((key, i) => {
      const angle = -Math.PI / 2 + i * Math.PI * 2 / labels.length;
      const r = radius * level / 5;
      const x = center + Math.cos(angle) * r;
      const y = center + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = "#d8dee8";
    ctx.stroke();
  }
  labels.forEach((key, i) => {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / labels.length;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius);
    ctx.stroke();
    ctx.fillStyle = "#334155";
    ctx.fillText(CATEGORY_LABELS[key], center + Math.cos(angle) * (radius + 34), center + Math.sin(angle) * (radius + 28));
  });
  if (!nursery) return;
  const review = reviewOf(nursery);
  ctx.beginPath();
  labels.forEach((key, i) => {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / labels.length;
    const r = radius * gradePoint(review[`${key}Grade`]) / 5;
    const x = center + Math.cos(angle) * r;
    const y = center + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(37, 99, 235, .22)";
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 3;
  ctx.fill();
  ctx.stroke();
}

function renderRanks() {
  $("rankList").innerHTML = rankedNurseries().map((n, index) => {
    const score = totalScore(reviewOf(n));
    return `
      <article class="rank-item" draggable="true" data-id="${n.id}">
        <span class="rank-no">${n.wish?.rank || index + 1}</span>
        <div>
          <h3>${escapeHtml(n.name)}</h3>
          <p>総合 ${score ?? "-"} / 優先度 ${escapeHtml(n.priority)} / 懸念: ${escapeHtml(n.wish?.concerns || reviewOf(n).recheckItems || "-")}</p>
          <p>採用理由: ${escapeHtml(n.wish?.reason || "-")}</p>
        </div>
        <button class="button ghost" data-rank-review="${n.id}" type="button">編集</button>
      </article>
    `;
  }).join("");
}

function renumberRanks() {
  [...document.querySelectorAll(".rank-item")].forEach((item, index) => {
    const nursery = state.nurseries.find((n) => n.id === item.dataset.id);
    if (nursery) {
      nursery.wish ||= {};
      nursery.wish.rank = index + 1;
      nursery.review ||= {};
      nursery.review.wishRank = String(index + 1);
    }
  });
  state.lastUpdated = new Date().toISOString();
  renderAll();
}

function renderAll() {
  updateHeader();
  renderList();
  renderDashboard();
  renderRanks();
}

function initEvents() {
  document.querySelector(".tabs").addEventListener("click", (event) => {
    const button = event.target.closest(".tab");
    if (!button) return;
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
    document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === button.dataset.view));
    if (button.dataset.view === "dashboardView") drawRadar();
  });
  ["kindFilter", "priorityFilter", "searchBox"].forEach((id) => $(id).addEventListener("input", renderList));
  $("nurseryList").addEventListener("click", (event) => {
    const card = event.target.closest(".nursery-card");
    if (!card) return;
    selectedId = card.dataset.id;
    if (event.target.dataset.action === "review") openReview(selectedId);
    renderList();
  });
  $("offlineMap").addEventListener("click", (event) => {
    const dot = event.target.closest(".map-dot");
    if (!dot) return;
    selectedId = dot.dataset.id;
    renderList();
  });
  $("detailPanel").addEventListener("click", (event) => {
    const id = event.target.dataset.detailReview;
    if (id) openReview(id);
  });
  $("rankingTable").addEventListener("click", (event) => {
    const row = event.target.closest("tr[data-id]");
    if (row) openReview(row.dataset.id);
  });
  $("rankList").addEventListener("click", (event) => {
    const id = event.target.dataset.rankReview;
    if (id) openReview(id);
  });
  $("rankList").addEventListener("dragstart", (event) => {
    const item = event.target.closest(".rank-item");
    if (item) event.dataTransfer.setData("text/plain", item.dataset.id);
  });
  $("rankList").addEventListener("dragover", (event) => event.preventDefault());
  $("rankList").addEventListener("drop", (event) => {
    event.preventDefault();
    const fromId = event.dataTransfer.getData("text/plain");
    const target = event.target.closest(".rank-item");
    const from = [...document.querySelectorAll(".rank-item")].find((item) => item.dataset.id === fromId);
    if (from && target && from !== target) {
      $("rankList").insertBefore(from, target);
      renumberRanks();
    }
  });
  $("reviewForm").addEventListener("input", saveDraft);
  $("closeDialog").addEventListener("click", () => $("reviewDialog").close());
  $("cancelDialog").addEventListener("click", () => $("reviewDialog").close());
  $("saveReview").addEventListener("click", saveReview);
  $("deleteReview").addEventListener("click", deleteReview);
  $("jsonInput").addEventListener("change", (event) => {
    if (event.target.files[0]) loadJson(event.target.files[0]);
  });
  $("saveJson").addEventListener("click", saveJson);
  $("restoreDraft").addEventListener("click", restoreDraft);
  $("radarSelect").addEventListener("change", drawRadar);
  $("fitMap").addEventListener("click", () => {
    selectedId = state.nurseries[0]?.id || null;
    renderList();
  });
}

buildFormSections();
initEvents();
renderAll();
