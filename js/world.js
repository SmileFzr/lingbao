"use strict";

/* ============================================================
   大世界：区域切换 / 地图 / 自动寻路 / 传送
   - 中央草原 + 四方位区域（森林/沙漠/海洋/废墟）
   - 小地图常驻右下，点击展开大地图
   - 大地图可标记任意位置，然后选择「走过去」或「传送过去」
   ============================================================ */

const TOWN_SAFE_R = 520;      // 青石村占位半径（草原中央）

/* ---------- 区域 ---------- */
function currentRegionId() {
  if (G.currentMap === 'town') return 'grassland';
  if (G.currentMap === 'cave') return G.cave ? SITES[G.cave.siteId].region : G.region;
  return regionAt(G.px, G.py);
}
function currentRegion() { return REGIONS[currentRegionId()] || REGIONS.grassland; }

/* 切换区域时刷新背景 / 音乐 / 顶部文字 / 探索记录 */
function refreshRegion(force) {
  const id = currentRegionId();
  const changed = force || id !== G.region;
  G.region = id;
  if (G.currentMap === 'field' && !G.seenRegions[id]) {
    G.seenRegions[id] = true;
    if (!force) toast('发现新区域：' + REGIONS[id].name);
  }
  const bg = $('worldBg');
  if (bg) {
    for (const k in REGIONS) bg.classList.remove(REGIONS[k].bg);
    bg.classList.remove('bg-town', 'bg-cave');
    if (G.currentMap === 'town') bg.classList.add('bg-town');
    else if (G.currentMap === 'cave') bg.classList.add('bg-cave');
    else bg.classList.add(REGIONS[id].bg);
  }
  const body = document.body;
  if (body) {
    for (const k in REGIONS) body.classList.remove('theme-' + k);
    body.classList.add('theme-' + id);
  }
  if (changed) {
    playMusic(G.currentMap === 'town' ? 'town'
      : G.currentMap === 'cave' ? 'ruins'
      : (REGIONS[id].music || 'field'));
  }
  updateRegionLabel();
  if (typeof updateExploreUI === 'function') updateExploreUI();
}

function updateRegionLabel() {
  const loc = $('locName'), sub = $('locSub');
  if (!loc || !sub) return;
  if (G.currentMap === 'town') { loc.textContent = '青石村'; sub.textContent = '安全区 · 大世界中心'; return; }
  if (G.currentMap === 'cave') {
    const s = SITES[G.cave.siteId];
    loc.textContent = s.name + ' · 深处';
    sub.textContent = '越往里越危险';
    return;
  }
  const rg = currentRegion();
  loc.textContent = rg.name;
  sub.textContent = '危险度：' + rg.danger;
}

/* ---------- 坐标换算（世界 ↔ 地图画布） ---------- */
function mapScale(size) { return (size / 2 - 8) / WORLD_R; }
function worldToMap(wx, wy, size) {
  const k = mapScale(size);
  return { x: size / 2 + wx * k, y: size / 2 + wy * k };
}
function mapToWorld(mx, my, size) {
  const k = mapScale(size);
  return { x: (mx - size / 2) / k, y: (my - size / 2) / k };
}

/* ---------- 地图绘制 ---------- */
function drawMap(canvas, opts) {
  if (!canvas) return;
  const o = opts || {};
  const size = o.size || 320;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2, cy = size / 2;
  const R = size / 2 - 8;

  /* 海底 / 底图 */
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
  ctx.fillStyle = '#0f1620';
  ctx.fillRect(0, 0, size, size);

  /* 4 个外圈区域：整块扇形(草原会在上面盖住中间) */
  const wedges = [
    { id:'forest', a0:-Math.PI * 0.75, a1:-Math.PI * 0.25 },
    { id:'desert', a0:-Math.PI * 0.25, a1: Math.PI * 0.25 },
    { id:'ocean',  a0: Math.PI * 0.25, a1: Math.PI * 0.75 },
    { id:'ruins',  a0: Math.PI * 0.75, a1: Math.PI * 1.25 },
  ];
  for (const w of wedges) {
    const rg = REGIONS[w.id];
    const seen = !!G.seenRegions[w.id];
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, w.a0, w.a1);
    ctx.closePath();
    ctx.fillStyle = seen ? hexA(rg.color, 0.55) : 'rgba(90,100,115,0.28)';
    ctx.fill();
    if (seen) {
      ctx.strokeStyle = hexA(rg.color, 0.85); ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  /* 中央草原 */
  const gk = mapScale(size);
  const gR = GRASSLAND_R * gk;
  ctx.beginPath(); ctx.arc(cx, cy, gR, 0, TAU);
  ctx.fillStyle = G.seenRegions.grassland ? hexA(REGIONS.grassland.color, 0.62) : 'rgba(90,100,115,0.28)';
  ctx.fill();
  ctx.strokeStyle = hexA(REGIONS.grassland.color, 0.9); ctx.lineWidth = 1; ctx.stroke();

  /* 网格 */
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
  for (let i = -3; i <= 3; i++) {
    const t = i / 3;
    ctx.beginPath(); ctx.moveTo(cx + t * R, cy - R); ctx.lineTo(cx + t * R, cy + R); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - R, cy + t * R); ctx.lineTo(cx + R, cy + t * R); ctx.stroke();
  }
  ctx.restore();

  /* 外框 */
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.5; ctx.stroke();

  const showText = size >= 200;

  /* 区域名 */
  if (showText) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const id of REGION_ORDER) {
      const rg = REGIONS[id];
      const p = id === 'grassland'
        ? { x: cx, y: cy + gR * 0.62 }
        : worldToMap(rg.center.x * 0.72, rg.center.y * 0.72, size);
      const seen = !!G.seenRegions[id];
      ctx.font = 'bold ' + (size >= 300 ? 11 : 9) + 'px system-ui,sans-serif';
      ctx.fillStyle = seen ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.35)';
      ctx.fillText(seen ? rg.name : '未探索', p.x, p.y);
    }
  }

  /* 青石村 */
  {
    const p = worldToMap(0, 0, size);
    ctx.font = (size >= 200 ? 13 : 9) + 'px system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🏠', p.x, p.y - (showText ? 2 : 0));
    if (showText) {
      ctx.font = '9px system-ui,sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText('青石村', p.x, p.y + 11);
    }
  }

  /* 区域 NPC */
  for (const k in REGION_NPCS) {
    const n = REGION_NPCS[k];
    if (!G.seenRegions[n.region]) continue;
    const p = worldToMap(n.x, n.y, size);
    ctx.font = (size >= 200 ? 11 : 8) + 'px system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.95;
    ctx.fillText(n.emoji, p.x, p.y);
    ctx.globalAlpha = 1;
  }

  /* 区域建筑 */
  for (const k in REGION_BUILDINGS) {
    for (const b of REGION_BUILDINGS[k]) {
      if (!G.seenRegions[b.region]) continue;
      const p = worldToMap(b.x, b.y, size);
      ctx.font = (size >= 200 ? 11 : 8) + 'px system-ui,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.9;
      ctx.fillText(b.icon, p.x, p.y);
      ctx.globalAlpha = 1;
    }
  }

  /* 特殊地点（未发现的显示为暗问号） */
  for (const k in SITES) {
    const s = SITES[k];
    const p = worldToMap(s.x, s.y, size);
    const seen = !!G.seenSites[s.id];
    const cleared = !!G.bosses[s.region];
    ctx.font = (size >= 200 ? 13 : 9) + 'px system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (seen) {
      ctx.globalAlpha = cleared ? 0.55 : 1;
      ctx.fillText(cleared ? '✅' : s.emoji, p.x, p.y);
      ctx.globalAlpha = 1;
      if (showText) {
        ctx.font = '8.5px system-ui,sans-serif';
        ctx.fillStyle = cleared ? 'rgba(255,255,255,0.4)' : 'rgba(255,235,170,0.92)';
        ctx.fillText(s.name, p.x, p.y + 11);
      }
    } else {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(p.x, p.y, size >= 200 ? 4 : 2.5, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  /* 标记点 */
  if (G.marker) {
    const p = worldToMap(G.marker.x, G.marker.y, size);
    ctx.save();
    ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(p.x, p.y, size >= 200 ? 9 : 5, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p.x - 5, p.y); ctx.lineTo(p.x + 5, p.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p.x, p.y - 5); ctx.lineTo(p.x, p.y + 5); ctx.stroke();
    ctx.restore();
  }

  /* 玩家 */
  if (G.currentMap !== 'cave') {
    const p = worldToMap(G.px, G.py, size);
    const pulse = 0.5 + Math.sin(Date.now() / 320) * 0.5;
    ctx.beginPath(); ctx.arc(p.x, p.y, (size >= 200 ? 7 : 4) + pulse * 3, 0, TAU);
    ctx.strokeStyle = 'rgba(120,220,255,' + (0.35 + pulse * 0.35) + ')'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(p.x, p.y, size >= 200 ? 3.6 : 2.4, 0, TAU);
    ctx.fillStyle = '#8ee7ff'; ctx.fill();
  } else {
    /* 在洞窟里时，把玩家标在对应地点上 */
    const s = SITES[G.cave.siteId];
    const p = worldToMap(s.x, s.y, size);
    ctx.beginPath(); ctx.arc(p.x, p.y, size >= 200 ? 4 : 2.5, 0, TAU);
    ctx.fillStyle = '#ffd76a'; ctx.fill();
  }
}

function hexA(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

/* ---------- 小地图 ---------- */
let miniTimer = null;
function refreshMiniMap() {
  const c = $('miniMapCanvas');
  if (!c) return;
  drawMap(c, { size: 104 });
}
function startMiniMapLoop() {
  if (miniTimer) return;
  miniTimer = setInterval(() => {
    if (G.screen === 'explore') refreshMiniMap();
  }, 260);
}

/* ---------- 大地图面板 ---------- */
function openWorldMap() {
  const panel = $('mapPanel');
  if (!panel) return;
  panel.classList.remove('hidden');
  G.mapPick = null;
  updateMapPanel();
  drawMap($('worldMapCanvas'), { size: Math.min(380, Math.min(window.innerWidth, window.innerHeight) - 90) });
}

function closeWorldMap() {
  const panel = $('mapPanel');
  if (panel) panel.classList.add('hidden');
}

function updateMapPanel() {
  const info = $('mapInfo');
  const btnWalk = $('mapWalk'), btnTp = $('mapTeleport');
  if (!info) return;
  if (!G.marker) {
    info.innerHTML = '<div class="mapHint">点地图任意位置，标记一个目的地</div>';
    if (btnWalk) { btnWalk.disabled = true; btnTp.disabled = true; }
    return;
  }
  const d = Math.hypot(G.marker.x - G.px, G.marker.y - G.py);
  const rid = regionAt(G.marker.x, G.marker.y);
  const rg = REGIONS[rid];
  const inTown = Math.hypot(G.marker.x, G.marker.y) < TOWN_SAFE_R;
  info.innerHTML =
    '<div class="mapTarget">📍 ' + (inTown ? '青石村' : rg.name) + '</div>' +
    '<div class="mapDist">距离约 <b>' + Math.round(d / 10) + '</b> 米' +
    (G.currentMap === 'cave' ? '　（探索中无法传送）' : '') + '</div>';
  const canGo = G.currentMap !== 'cave';
  if (btnWalk) btnWalk.disabled = !canGo;
  if (btnTp) btnTp.disabled = !canGo;
}

/* 点击地图 → 标记 */
function bindMapCanvas() {
  const c = $('worldMapCanvas');
  if (!c) return;
  c.addEventListener('click', (e) => {
    const rect = c.getBoundingClientRect();
    const size = rect.width;
    const mx = (e.clientX - rect.left) / rect.width * size;
    const my = (e.clientY - rect.top) / rect.height * size;
    const w = mapToWorld(mx, my, size);
    const d = Math.hypot(w.x, w.y);
    if (d > WORLD_R) {
      const k = WORLD_R / d;
      w.x *= k; w.y *= k;
    }
    G.marker = { x: Math.round(w.x), y: Math.round(w.y) };
    updateMapPanel();
    drawMap(c, { size });
  });
}

/* 走过去 */
function walkToMarker() {
  if (!G.marker) return;
  if (G.currentMap !== 'field') {
    toast('先离开城镇再出发');
    return;
  }
  G.walkTarget = { x: G.marker.x, y: G.marker.y };
  G.autoExplore = false;
  closeWorldMap();
  toast('出发前往 ' + REGIONS[regionAt(G.marker.x, G.marker.y)].name);
}

/* 传送过去 */
function teleportToMarker() {
  if (!G.marker) return;
  if (G.currentMap === 'cave') { toast('探索中无法传送'); return; }
  const m = G.marker;
  const inTown = Math.hypot(m.x, m.y) < TOWN_SAFE_R;
  closeWorldMap();
  if (inTown) {
    if (typeof enterTown === 'function') enterTown();
    return;
  }
  G.currentMap = 'field';
  G.px = m.x; G.py = m.y;
  G.walkTarget = null;
  G.cave = null;
  G.seenRegions[regionAt(m.x, m.y)] = true;
  if (typeof renderWorldDecor === 'function') renderWorldDecor();
  if (typeof updateWorldDecor === 'function') updateWorldDecor();
  refreshRegion(true);
  if (typeof updateInteract === 'function') updateInteract();
  toast('已传送至 ' + REGIONS[regionAt(m.x, m.y)].name);
}

/* 发现附近的特殊地点 */
function discoverNearby() {
  if (G.currentMap !== 'field') return;
  for (const k in SITES) {
    const s = SITES[k];
    if (G.seenSites[s.id]) continue;
    if (Math.hypot(G.px - s.x, G.py - s.y) < 220) {
      G.seenSites[s.id] = true;
      toast('发现地点：' + s.name);
      saveGame();
      refreshMiniMap();
    }
  }
}

/* 绑定地图面板与小地图 */
function setupMapUI() {
  const mini = $('miniMap');
  if (mini) mini.onclick = () => openWorldMap();
  const close = $('mapClose');
  if (close) close.onclick = () => closeWorldMap();
  const w = $('mapWalk'), t = $('mapTeleport');
  if (w) w.onclick = () => walkToMarker();
  if (t) t.onclick = () => teleportToMarker();
  const clr = $('mapClear');
  if (clr) clr.onclick = () => { G.marker = null; G.mapPick = null; updateMapPanel(); drawMap($('worldMapCanvas'), { size: Math.min(380, Math.min(window.innerWidth, window.innerHeight) - 90) }); };
  bindMapCanvas();
  window.addEventListener('resize', () => {
    const p = $('mapPanel');
    if (p && !p.classList.contains('hidden')) openWorldMap();
  });
}
