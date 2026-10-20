"use strict";

/* ============================================================
   场景与探索
   - town  青石村（安全区，大世界中心）
   - field 大世界：草原 / 森林 / 沙漠 / 海洋 / 废墟
   - cave  特殊地点内部的洞窟（走到最深处遇区域 BOSS）
   ============================================================ */

const townBuildings = [
  { id:'shop',   name:'商店',     icon:'🏪', x: 300, y: 250,  type:'shop' },
  { id:'center', name:'灵兽中心', icon:'🏥', x:-350, y: 100,  type:'center' },
  { id:'arena',  name:'教堂',     icon:'⛪', x:   0, y:-350,  type:'arena' },
  { id:'board',  name:'任务板',   icon:'📋', x: 450, y:  50,  type:'board' },
  { id:'smith',  name:'铁匠铺',   icon:'🔨', x:-300, y: 300,  type:'smith' },
];

const TOWN_RADIUS  = 500;
const TOWN_EXIT    = { x: 0, y: 450 };
const FIELD_RADIUS = WORLD_R;                 // 大世界半径
const FIELD_VILLAGE = { x: 0, y: 0 };

/* 各区域遇敌步频（越小越容易遇敌） */
const ENCOUNTER_RATE = {
  grassland:[45, 80], forest:[34, 62], desert:[30, 58], ocean:[32, 60], ruins:[28, 52],
};

const exp = { joyActive:false, joyId:null, joyOX:0, joyOY:0, joyDX:0, joyDY:0 };
let currentInteract = null;
let autoExploreTimer = 0;
let exploreAutoDir = {x:0, y:0};
let exploreRAF = null, lastExploreT = 0, encounterSteps = 0;
let decorRegion = null;

function initExplore() {
  if (!G.currentMap) G.currentMap = 'town';
  if (G.currentMap === 'cave') G.currentMap = 'field';
  G.cave = null; G.walkTarget = null;
  if (G.currentMap === 'town' && G.px === 0 && G.py === 0) { G.px = 0; G.py = 300; }
  decorRegion = null;
  renderWorldDecor(); updateExploreUI(); refreshRegion(true);
  $('player').textContent = '🧙‍♂️';
  $('player').style.left = '50%'; $('player').style.top = '50%';
  startExploreLoop(); showScreen('explore');
  startMiniMapLoop();
}

/* ============ 地图渲染 ============ */
function renderWorldDecor() {
  const d = $('worldDecor'); if (!d) return; d.innerHTML = '';
  if (G.currentMap === 'town') { renderTownMap(d); decorRegion = 'town'; }
  else if (G.currentMap === 'field') {
    const rid = regionAt(G.px, G.py);
    renderFieldMap(d, rid);
    decorRegion = rid;
  } else if (G.currentMap === 'cave' && typeof renderCaveMap === 'function') {
    renderCaveMap(d); decorRegion = 'cave';
  }
  updateWorldDecor();
}

function addDecorEl(parent, emoji, x, y, size, z) {
  const el = document.createElement('div');
  el.className = 'decor'; el.textContent = emoji;
  el.dataset.x = x; el.dataset.y = y;
  el.style.fontSize = size + 'px';
  el.style.zIndex = z;
  parent.appendChild(el);
  return el;
}

/* ---------- 青石村 ---------- */
function renderTownMap(d) {
  for (let a = 0; a < TAU; a += 0.12) {
    if (Math.abs(a - Math.PI / 2) < 0.22) continue;
    const x = Math.cos(a) * TOWN_RADIUS;
    const y = Math.sin(a) * TOWN_RADIUS;
    addDecorEl(d, pick(['🌳','🌲','🪨','🌿']), x, y, rnd(70, 90), 20);
  }
  addDecorEl(d, '🪧', TOWN_EXIT.x, TOWN_EXIT.y - 40, 60, 25);
  addDecorEl(d, '🪵', TOWN_EXIT.x - 80, TOWN_EXIT.y, 60, 20);
  addDecorEl(d, '🪵', TOWN_EXIT.x + 80, TOWN_EXIT.y, 60, 20);

  addDecorEl(d, '⛲', 0, 0, 100, 30);
  addDecorEl(d, '🌻', 100, 50, 50, 30);
  addDecorEl(d, '🌷', -80, -60, 35, 30);
  addDecorEl(d, '🍄', 250, 80, 40, 30);
  addDecorEl(d, '🐰', 150, -100, 55, 30);
  addDecorEl(d, '🦊', -200, 180, 55, 30);

  for (const b of townBuildings) {
    addDecorEl(d, '🏠', b.x, b.y, 100, 10);
    const icon = document.createElement('div');
    icon.className = 'building-icon'; icon.textContent = b.icon;
    icon.dataset.x = b.x; icon.dataset.y = b.y - 70;
    d.appendChild(icon);
  }
}

/* ---------- 大世界野外 ---------- */
function renderFieldMap(d, regionId) {
  const rg = REGIONS[regionId] || REGIONS.grassland;

  /* 外圈边界：按区域换风格 */
  const edgePool = regionId === 'ocean' ? ['🌊','🏝️','🪨']
    : regionId === 'desert' ? ['🏜️','🪨','🌵']
    : regionId === 'ruins' ? ['🏚️','🪨','🧱']
    : regionId === 'forest' ? ['🌲','🌳','🪨']
    : ['🌲','🌳','🪨','⛰️'];
  for (let a = 0; a < TAU; a += 0.075) {
    const x = Math.cos(a) * (FIELD_RADIUS - 60);
    const y = Math.sin(a) * (FIELD_RADIUS - 60);
    addDecorEl(d, pick(edgePool), x, y, rnd(80, 120), 20);
  }

  /* 区域内部装饰：只画当前区域 + 邻域边缘，避免元素过多 */
  const pool = rg.decor;
  const n = rg.density;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU;
    const r = rnd(280, FIELD_RADIUS - 160);
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (Math.hypot(x, y) < TOWN_SAFE_R + 120) continue;      // 村子周围留空
    const rId = regionAt(x, y);
    if (rId !== regionId) continue;
    // 特殊地点与 NPC 周围留空
    let skip = false;
    for (const k in SITES) if (Math.hypot(x - SITES[k].x, y - SITES[k].y) < 150) { skip = true; break; }
    for (const k in REGION_NPCS) if (Math.hypot(x - REGION_NPCS[k].x, y - REGION_NPCS[k].y) < 120) { skip = true; break; }
    if (skip) continue;
    addDecorEl(d, pick(pool), x, y, rnd(rg.size[0], rg.size[1]), 5 + Math.floor(rnd(0, 10)));
  }

  /* 各区域地标：让远处也能看出"那边是什么" */
  for (const id of REGION_ORDER) {
    const r2 = REGIONS[id];
    if (id === 'grassland') continue;
    const lx = r2.center.x, ly = r2.center.y;
    const mark = id === 'forest' ? '⛰️' : id === 'desert' ? '🏜️' : id === 'ocean' ? '🏝️' : '🏚️';
    addDecorEl(d, mark, lx * 0.62, ly * 0.62, 210, 2);
  }

  /* 青石村入口 */
  addDecorEl(d, '🏠', FIELD_VILLAGE.x, FIELD_VILLAGE.y, 120, 15);
  addDecorEl(d, '🪧', FIELD_VILLAGE.x + 100, FIELD_VILLAGE.y - 20, 55, 16);

  /* 特殊地点 */
  for (const k in SITES) {
    const s = SITES[k];
    if (regionAt(s.x, s.y) !== regionId) continue;
    const cleared = !!G.bosses[s.region];
    addDecorEl(d, s.emoji, s.x, s.y, 92, 14);
    // 洞口的一圈石头，强化"可以进去"的感觉
    for (let t = 0; t < TAU; t += Math.PI / 5) {
      addDecorEl(d, '🪨', s.x + Math.cos(t) * 74, s.y + Math.sin(t) * 60, 40, 13);
    }
    const badge = document.createElement('div');
    badge.className = 'site-label' + (cleared ? ' cleared' : '');
    badge.textContent = cleared ? '✅ ' + s.name + '（已清除）' : s.name;
    badge.dataset.x = s.x; badge.dataset.y = s.y - 82;
    d.appendChild(badge);
  }

  /* 区域建筑 */
  for (const b of buildingsOfRegion(regionId)) {
    addDecorEl(d, b.icon, b.x, b.y, 84, 15);
    const tag = document.createElement('div');
    tag.className = 'npc-label';
    tag.textContent = b.name;
    tag.dataset.x = b.x; tag.dataset.y = b.y - 60;
    d.appendChild(tag);
  }

  /* 区域 NPC */
  for (const k in REGION_NPCS) {
    const npc = REGION_NPCS[k];
    if (npc.region !== regionId) continue;
    addDecorEl(d, npc.emoji, npc.x, npc.y, 56, 16);
    const tag = document.createElement('div');
    tag.className = 'npc-label';
    tag.textContent = npc.name;
    tag.dataset.x = npc.x; tag.dataset.y = npc.y - 54;
    d.appendChild(tag);
  }

  /* 野生动物点缀 */
  const critters = regionId === 'ocean' ? ['🐟','🐠','🐙','🦀']
    : regionId === 'desert' ? ['🦂','🐍']
    : regionId === 'ruins' ? ['🦇','🐀']
    : regionId === 'forest' ? ['🦌','🐺','🦉']
    : ['🐰','🐑','🦋'];
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * TAU, r = rnd(400, FIELD_RADIUS - 300);
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (regionAt(x, y) !== regionId) continue;
    addDecorEl(d, pick(critters), x, y, 46, 12);
  }
}

function updateWorldDecor() {
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  const d = $('worldDecor'); if (!d) return;
  for (const el of d.children) {
    const wx = parseFloat(el.dataset.x), wy = parseFloat(el.dataset.y);
    const sx = cx + wx - G.px, sy = cy + wy - G.py;
    if (sx < -320 || sx > window.innerWidth + 320 || sy < -320 || sy > window.innerHeight + 320) { el.style.display = 'none'; continue; }
    el.style.display = ''; el.style.left = sx + 'px'; el.style.top = sy + 'px';
  }
}

function updateExploreUI() {
  const g = $('goldTxt'); if (g) g.textContent = G.gold;
  const pc = $('petCount'); if (pc) pc.textContent = G.team.length + '/' + Math.min(5, G.party.length);
  updateRegionLabel();
  const btnAuto = $('btnAuto');
  if (btnAuto) btnAuto.classList.toggle('on', G.autoExplore);
  // 海洋区域：给角色加上小船
  const pl = $('player');
  if (pl) {
    const water = G.currentMap === 'field' && currentRegion().water;
    pl.classList.toggle('on-boat', !!water);
  }
  refreshMiniMap();
}

/* ============ 摇杆 ============ */
function setupJoystick() {
  const zone = $('joyZone'), base = $('joyBase'), knob = $('joyKnob');
  if (!zone || !base || !knob) return;
  const start = (e) => {
    if (G.screen !== 'explore') return;
    if (e.target && (e.target.closest('#interactBtn') || e.target.closest('#rightBtns') || e.target.closest('#miniMap'))) return;
    const t = e.touches ? e.touches[0] : e; if (exp.joyActive) return;
    exp.joyActive = true; exp.joyId = t.identifier !== undefined ? t.identifier : 'm';
    exp.joyOX = t.clientX; exp.joyOY = t.clientY; exp.joyDX = 0; exp.joyDY = 0;
    base.style.left = t.clientX + 'px'; base.style.top = t.clientY + 'px';
    knob.style.left = t.clientX + 'px'; knob.style.top = t.clientY + 'px';
    base.classList.add('on'); knob.classList.add('on');
    if (G.autoExplore) { G.autoExplore = false; updateExploreUI(); }
    if (G.walkTarget) { G.walkTarget = null; }
  };
  const move = (e) => {
    if (!exp.joyActive) return;
    const touches = e.touches || [e];
    for (const t of touches) {
      const id = t.identifier !== undefined ? t.identifier : 'm';
      if (id !== exp.joyId) continue;
      let dx = t.clientX - exp.joyOX, dy = t.clientY - exp.joyOY;
      const d = Math.hypot(dx, dy), max = 50;
      if (d > max) { dx = dx / d * max; dy = dy / d * max; }
      exp.joyDX = dx; exp.joyDY = dy;
      knob.style.left = (exp.joyOX + dx) + 'px'; knob.style.top = (exp.joyOY + dy) + 'px';
    }
  };
  const end = (e) => {
    if (!exp.joyActive) return; let still = false;
    const touches = e.touches || [];
    for (const t of touches) { if (t.identifier === exp.joyId || t.identifier === undefined) still = true; }
    if (!still) { exp.joyActive = false; exp.joyDX = 0; exp.joyDY = 0; base.classList.remove('on'); knob.classList.remove('on'); }
  };
  zone.addEventListener('touchstart', e => { e.preventDefault(); start(e); }, { passive:false });
  zone.addEventListener('touchmove', e => { e.preventDefault(); move(e); }, { passive:false });
  zone.addEventListener('touchend', end); zone.addEventListener('touchcancel', end);
  zone.addEventListener('mousedown', e => { e.preventDefault(); start(e); });
  window.addEventListener('mousemove', move); window.addEventListener('mouseup', end);
}

/* ============ 探索主循环 ============ */
function startExploreLoop() {
  if (exploreRAF) return; lastExploreT = performance.now();
  const loop = (now) => {
    exploreRAF = requestAnimationFrame(loop);
    if (G.screen !== 'explore') return;
    const dt = Math.min(0.05, (now - lastExploreT) / 1000); lastExploreT = now;
    updateExplore(dt);
  };
  exploreRAF = requestAnimationFrame(loop);
}

function updateExplore(dt) {
  if (G.currentMap === 'cave') {
    if (typeof updateCave === 'function') updateCave(dt);
    return;
  }

  let mx = 0, my = 0;
  if (exp.joyActive) {
    const d = Math.hypot(exp.joyDX, exp.joyDY);
    if (d > 8) { mx = exp.joyDX / 50; my = exp.joyDY / 50; }
  } else if (G.walkTarget) {
    const dx = G.walkTarget.x - G.px, dy = G.walkTarget.y - G.py;
    const d = Math.hypot(dx, dy);
    if (d < 30) { G.walkTarget = null; toast('已到达目的地'); }
    else { mx = dx / d; my = dy / d; }
  } else if (G.autoExplore) {
    autoExploreTimer -= dt;
    if (autoExploreTimer <= 0) {
      autoExploreTimer = rnd(1.5, 3);
      const a = Math.random() * TAU;
      exploreAutoDir.x = Math.cos(a);
      exploreAutoDir.y = Math.sin(a);
    }
    mx = exploreAutoDir.x; my = exploreAutoDir.y;
  }

  const inWater = G.currentMap === 'field' && currentRegion().water;
  const speed = inWater ? 196 : 224;
  const len = Math.hypot(mx, my);
  if (len > 0.15) {
    let nextX = G.px + mx * speed * dt;
    let nextY = G.py + my * speed * dt;

    const R = FIELD_RADIUS - 110;
    const dist = Math.hypot(nextX, nextY);
    if (dist > R) {
      const angle = Math.atan2(nextY, nextX);
      nextX = Math.cos(angle) * R;
      nextY = Math.sin(angle) * R;
      if (G.autoExplore) autoExploreTimer = 0;
      if (G.walkTarget) G.walkTarget = null;
    }

    G.px = nextX; G.py = nextY;

    $('player').classList.add('walking');
    setTimeout(() => $('player').classList.remove('walking'), 100);

    /* 跨区域：换背景 / 换音乐 / 重铺装饰（只在真的换区域时做，避免每帧重绘） */
    const rid = regionAt(G.px, G.py);
    if (rid !== G.region) {
      if (rid !== decorRegion) renderWorldDecor(); else updateWorldDecor();
      refreshRegion(false);
    } else {
      updateWorldDecor();
    }

    /* 遇敌 */
    if (G.currentMap === 'field') {
      encounterSteps += len * dt * 30;
      const rate = ENCOUNTER_RATE[rid] || [40, 70];
      if (encounterSteps > rndi(rate[0], rate[1])) { encounterSteps = 0; startBattle(); return; }
    } else { encounterSteps = 0; }
  } else {
    updateWorldDecor();
  }

  discoverNearby();
  updateInteract();
}

/* ============ 交互按钮 ============ */
function updateInteract() {
  const btn = $('interactBtn'); if (!btn) return;
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  let nearest = null, nd = Infinity;

  if (G.currentMap === 'town') {
    for (const b of townBuildings) {
      const d = Math.hypot(G.px - b.x, G.py - b.y);
      if (d < 110 && d < nd) { nd = d; nearest = { type:'building', data:b, x:b.x, y:b.y - 80 }; }
    }
    const dExit = Math.hypot(G.px - TOWN_EXIT.x, G.py - TOWN_EXIT.y);
    if (dExit < 120 && dExit < nd) {
      nd = dExit;
      nearest = { type:'exit', x: TOWN_EXIT.x, y: TOWN_EXIT.y - 70 };
    }
  } else {
    /* 野外的交互目标：特殊地点 / 区域NPC / 回村 */
    for (const k in SITES) {
      const s = SITES[k];
      if (regionAt(s.x, s.y) !== regionAt(G.px, G.py)) continue;
      const d = Math.hypot(G.px - s.x, G.py - s.y);
      if (d < 130 && d < nd) { nd = d; nearest = { type:'site', data:s, x:s.x, y:s.y - 96 }; }
    }
    for (const k in REGION_NPCS) {
      const n = REGION_NPCS[k];
      const d = Math.hypot(G.px - n.x, G.py - n.y);
      if (d < 120 && d < nd) { nd = d; nearest = { type:'npc', data:n, x:n.x, y:n.y - 70 }; }
    }
    for (const b of buildingsOfRegion(regionAt(G.px, G.py))) {
      const d = Math.hypot(G.px - b.x, G.py - b.y);
      if (d < 120 && d < nd) { nd = d; nearest = { type:'regionBuilding', data:b, x:b.x, y:b.y - 70 }; }
    }
    const dVill = Math.hypot(G.px - FIELD_VILLAGE.x, G.py - FIELD_VILLAGE.y);
    if (dVill < 190 && dVill < nd) {
      nearest = { type:'enterTown', x: FIELD_VILLAGE.x, y: FIELD_VILLAGE.y - 90 };
    }
  }

  if (nearest) {
    currentInteract = nearest; btn.classList.remove('hidden');
    btn.style.left = (cx + nearest.x - G.px) + 'px';
    btn.style.top  = (cy + nearest.y - G.py) + 'px';
    if (nearest.type === 'exit') btn.innerHTML = '🚪 离开城镇';
    else if (nearest.type === 'enterTown') btn.innerHTML = '🏠 进入青石村';
    else if (nearest.type === 'site') {
      const cleared = !!G.bosses[nearest.data.region];
      btn.innerHTML = (cleared ? '🕳️ ' : '❗ ') + nearest.data.name;
    }
    else if (nearest.type === 'npc') btn.innerHTML = '💬 ' + nearest.data.name;
    else if (nearest.type === 'regionBuilding') btn.innerHTML = nearest.data.icon + ' ' + nearest.data.name;
    else btn.innerHTML = '<span>' + nearest.data.icon + '</span>' + nearest.data.name;
  } else {
    btn.classList.add('hidden'); currentInteract = null;
  }
}

function setupInteractBtn() {
  const btn = $('interactBtn'); if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation(); if (!currentInteract) return;
    if (currentInteract.type === 'building') openBuilding(currentInteract.data);
    else if (currentInteract.type === 'exit') leaveTown();
    else if (currentInteract.type === 'enterTown') enterTown();
    else if (currentInteract.type === 'site') enterSite(currentInteract.data);
    else if (currentInteract.type === 'npc') talkToRegionNpc(currentInteract.data);
    else if (currentInteract.type === 'regionBuilding') openRegionBuilding(currentInteract.data);
    else if (currentInteract.type === 'caveExit' && typeof leaveCave === 'function') leaveCave();
  });
}

/* ============ 区域 NPC ============ */
function talkToRegionNpc(npc) {
  const opts = [];
  if (npc.id === 'trader') {
    opts.push({ text:'🛒 看看货（灵气球/药水）', cb: () => openShop() });
    opts.push({ text:'💧 讨口水喝（全体回复）', cb: () => {
      for (const p of G.party) p.hp = p.maxHp;
      saveGame(); toast('灵兽们恢复了精神'); hideDialog();
    }});
  } else if (npc.id === 'fisher') {
    opts.push({ text:'🎣 借一张网（拿 2 个灵气球）', cb: () => {
      if (G.netTaken) { toast('他已经把网都借出去了'); return; }
      G.netTaken = true; G.items.orb = (G.items.orb || 0) + 2;
      saveGame(); toast('获得灵气球 ×2'); hideDialog();
    }});
    opts.push({ text:'🌊 打听海里的东西', cb: () => {
      showDialog(npc.emoji + ' ' + npc.name,
        '老潮压低声音：\n"沉船底下有个窟窿，往里走能到很深的地方。\n我只到过一次，听见有东西在唱歌。"',
        [{ text:'知道了', cb: hideDialog }], npc.emoji);
    }});
  } else if (npc.id === 'herbalist') {
    opts.push({ text:'🌿 要一份草药（全体回复）', cb: () => {
      for (const p of G.party) p.hp = p.maxHp;
      saveGame(); toast('草药很苦，但有效'); hideDialog();
    }});
    opts.push({ text:'🍄 打听古树洞', cb: () => {
      showDialog(npc.emoji + ' ' + npc.name,
        '"树洞里的根会动。\n你要是非去不可，走到最深处，它就会醒。"',
        [{ text:'知道了', cb: hideDialog }], npc.emoji);
    }});
  } else if (npc.id === 'scavenger') {
    opts.push({ text:'💰 卖点废料（+200 金币）', cb: () => {
      if (G.junkSold) { toast('他把能卖的都卖完了'); return; }
      G.junkSold = true; G.gold += 200;
      saveGame(); updateExploreUI(); toast('获得 200 金币'); hideDialog();
    }});
    opts.push({ text:'🕳️ 打听石头山洞', cb: () => {
      showDialog(npc.emoji + ' ' + npc.name,
        '"石头堆的那个洞？\n我劝你带满药。里面的东西，坐着都比站着高。"',
        [{ text:'知道了', cb: hideDialog }], npc.emoji);
    }});
  } else {
    opts.push({ text:'🌾 打听这片草原', cb: () => {
      showDialog(npc.emoji + ' ' + npc.name,
        '"祭坛的石阶往下通得很深。\n以前有人下去过，回来的时候只说了一句：它还在。"',
        [{ text:'知道了', cb: hideDialog }], npc.emoji);
    }});
  }
  opts.push({ text:'离 开', cb: hideDialog });
  showDialog(npc.emoji + ' ' + npc.name, npc.greet, opts, npc.emoji);
}

/* ============ 进入特殊地点（洞窟） ============ */
function enterSite(site) {
  G.seenSites[site.id] = true;
  const cleared = !!G.bosses[site.region];
  if (cleared) {
    showDialog(site.emoji + ' ' + site.name,
      '这里已经被清空了。\n剩下的只有风，和一点点回音。',
      [{ text:'离 开', cb: hideDialog }], site.emoji);
    return;
  }
  const boss = BOSSES[site.region];
  showDialog(site.emoji + ' ' + site.name,
    site.tip + '\n\n' + '（走到最深处会遇上「' + boss.name + '」）',
    [
      { text:'进入洞窟', cb: () => { hideDialog(); startCave(site); } },
      { text:'再等等', cb: hideDialog },
    ], site.emoji);
}

/* ============ 区域建筑 ============ */
function openRegionBuilding(b) {
  if (!b) return;
  if (b.kind === 'shop') { openShop(); return; }
  showDialog(b.icon + ' ' + b.name, b.line + '\n\n要在这里休息一下吗？', [
    { text:'全体回复', cb: () => {
      for (const p of G.party) p.hp = p.maxHp;
      saveGame(); toast('灵兽们恢复了精神'); hideDialog();
    }},
    { text:'离 开', cb: hideDialog },
  ], b.icon);
}

/* ============ 地图切换 ============ */
function enterTown() {
  G.currentMap = 'town';
  G.cave = null; G.walkTarget = null;
  G.px = TOWN_EXIT.x;
  G.py = TOWN_EXIT.y - 180;
  encounterSteps = 0;
  decorRegion = null;
  renderWorldDecor(); updateWorldDecor(); updateExploreUI(); updateInteract();
  refreshRegion(true);
  toast('回到了青石村');
}

function leaveTown() {
  if (G.autoExplore) { G.autoExplore = false; }
  G.currentMap = 'field';
  G.px = FIELD_VILLAGE.x;
  G.py = FIELD_VILLAGE.y + 260;
  encounterSteps = 0;
  decorRegion = null;
  renderWorldDecor(); updateWorldDecor(); updateExploreUI(); updateInteract();
  refreshRegion(true);
  toast('离开了青石村');
}

function teleportToTown() {
  G.currentMap = 'town';
  G.cave = null;
  G.px = 0; G.py = 0;
  encounterSteps = 0;
  decorRegion = null;
  renderWorldDecor(); updateWorldDecor(); updateExploreUI(); updateInteract();
  refreshRegion(true);
}

function teleportToField() {
  G.currentMap = 'field';
  G.cave = null;
  G.px = FIELD_VILLAGE.x;
  G.py = FIELD_VILLAGE.y + 260;
  encounterSteps = 0;
  decorRegion = null;
  renderWorldDecor(); updateWorldDecor(); updateExploreUI(); updateInteract();
  refreshRegion(true);
}

function isInTown() { return G.currentMap === 'town'; }

/* ============ 建筑功能 ============ */
function openBuilding(b) {
  if (b.type === 'shop') return openShop();
  if (b.type === 'center') return openCenter();
  if (b.type === 'arena') return openArena();
  if (b.type === 'board') return openBoard();
  if (b.type === 'smith') return openSmith();
}
function openShop() {
  const opts = [];
  for (const id in ITEMS) {
    const it = ITEMS[id];
    if (id === 'orb3' && !Object.keys(G.bosses || {}).length) continue;  // 打过 BOSS 才卖传说球
    opts.push({ text: it.icon+' '+it.name+'（'+it.price+'金）', cb: () => {
      if (G.gold < it.price) { toast('金币不足'); return; }
      G.gold -= it.price; G.items[id] = (G.items[id]||0)+1;
      saveGame(); updateExploreUI(); toast('购买 '+it.name); hideDialog();
    }});
  }
  opts.push({ text:'离 开', cb: hideDialog });
  showDialog('🏪 商店', '金币：'+G.gold+'\n要买什么？', opts, '🧑‍💼');
}
function openCenter() {
  showDialog('🏥 灵兽中心', '要让灵兽们休息吗？', [
    { text:'全体回复', cb: () => { for (const p of G.party) p.hp = p.maxHp; saveGame(); toast('全体灵兽回复完毕'); hideDialog(); } },
    { text:'离 开', cb: hideDialog }
  ], '👩‍⚕️');
}
function openArena() {
  const n = Object.keys(G.bosses || {}).length;
  showDialog('⛪ 教堂', '已击败的区域霸主：' + n + ' / 5\n\n' + (
    n === 0 ? '草原祭坛、森林古树洞、沙漠金字塔、海底沉船、废墟石洞——\n每个区域的深处都有一位霸主。'
    : '钟声为它们而响。'), [{ text:'离 开', cb: hideDialog }], '🥊');
}
function openBoard() {
  const rows = [];
  for (const id of REGION_ORDER) {
    const rg = REGIONS[id];
    const cleared = !!G.bosses[id];
    const site = siteOfRegion(id);
    rows.push((cleared ? '✅ ' : '· ') + rg.emoji + ' ' + rg.name +
      (cleared ? '　已清除' : '　' + (site ? site.name : '') + ' 未挑战'));
  }
  showDialog('📋 任务板', '区域进度\n\n' + rows.join('\n') +
    '\n\n已探索 ' + Object.keys(G.seenRegions || {}).length + ' / 5 个区域',
    [{ text:'离 开', cb: hideDialog }], '📋');
}
function openSmith() {
  showDialog('🔨 铁匠铺', '暂未开放（下一版会做装备强化）', [{ text:'离 开', cb: hideDialog }], '👨‍🏭');
}
