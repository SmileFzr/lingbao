"use strict";

/* ============================================================
   场景与探索 - 双地图系统（城镇 / 野外）
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
const FIELD_RADIUS = 1800;
const FIELD_VILLAGE = { x: 0, y: 0 };

const exp = { joyActive:false, joyId:null, joyOX:0, joyOY:0, joyDX:0, joyDY:0 };
let currentInteract = null;
let autoExploreTimer = 0;
let exploreAutoDir = {x:0, y:0};
let exploreRAF = null, lastExploreT = 0, encounterSteps = 0;

function initExplore() {
  G.currentMap = 'town';
  G.px = 0; G.py = 300;
  renderWorldDecor(); updateExploreUI();
  $('player').textContent = '🧙‍♂️';
  $('player').style.left = '50%'; $('player').style.top = '50%';
  startExploreLoop(); showScreen('explore');
  playMusic(G.currentMap === 'town' ? 'town' : 'field');
}

/* ============ 地图渲染 ============ */
function renderWorldDecor() {
  const d = $('worldDecor'); if (!d) return; d.innerHTML = '';
  if (G.currentMap === 'town') renderTownMap(d);
  else renderFieldMap(d);
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

function renderTownMap(d) {
  // 围墙（底部留出口缺口）
  for (let a = 0; a < TAU; a += 0.12) {
    if (Math.abs(a - Math.PI / 2) < 0.22) continue;
    const x = Math.cos(a) * TOWN_RADIUS;
    const y = Math.sin(a) * TOWN_RADIUS;
    addDecorEl(d, pick(['🌳','🌲','🪨','🌿']), x, y, rnd(70, 90), 20);
  }
  // 出口标识
  addDecorEl(d, '🪧', TOWN_EXIT.x, TOWN_EXIT.y - 40, 60, 25);
  addDecorEl(d, '🪵', TOWN_EXIT.x - 80, TOWN_EXIT.y, 60, 20);
  addDecorEl(d, '🪵', TOWN_EXIT.x + 80, TOWN_EXIT.y, 60, 20);

  // 中央装饰
  addDecorEl(d, '⛲', 0, 0, 100, 30);
  addDecorEl(d, '🌻', 100, 50, 50, 30);
  addDecorEl(d, '🌷', -80, -60, 35, 30);
  addDecorEl(d, '🍄', 250, 80, 40, 30);
  addDecorEl(d, '🐰', 150, -100, 55, 30);
  addDecorEl(d, '🦊', -200, 180, 55, 30);

  // 建筑
  for (const b of townBuildings) {
    addDecorEl(d, '🏠', b.x, b.y, 100, 10);
    const icon = document.createElement('div');
    icon.className = 'building-icon'; icon.textContent = b.icon;
    icon.dataset.x = b.x; icon.dataset.y = b.y - 70;
    d.appendChild(icon);
  }
}

function renderFieldMap(d) {
  // 外围边界树木/山
  for (let a = 0; a < TAU; a += 0.08) {
    const x = Math.cos(a) * FIELD_RADIUS;
    const y = Math.sin(a) * FIELD_RADIUS;
    addDecorEl(d, pick(['🌲','🌳','🪨','⛰️','🌵']), x, y, rnd(80, 120), 20);
  }
  // 内部随机散落
  const decorList = ['🌲','🌳','🪨','🌿','🌵','🍄','🌻','🪵'];
  for (let i = 0; i < 80; i++) {
    const a = Math.random() * TAU;
    const r = rnd(320, FIELD_RADIUS - 120);
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (Math.hypot(x, y) < 250) continue; // 避开村庄周围
    addDecorEl(d, pick(decorList), x, y, rnd(50, 100), 5 + Math.floor(rnd(0, 10)));
  }
  // 远景
  addDecorEl(d, '⛰️', -900, -900, 240, 2);
  addDecorEl(d, '⛰️',  900, -700, 200, 2);
  addDecorEl(d, '☁️', -600, -1100, 100, 1);
  addDecorEl(d, '☁️',  500, -1000, 100, 1);

  // 青石村入口（🏠）
  addDecorEl(d, '🏠', FIELD_VILLAGE.x, FIELD_VILLAGE.y, 120, 15);
  addDecorEl(d, '🪧', FIELD_VILLAGE.x + 100, FIELD_VILLAGE.y - 20, 55, 16);

  // 野外生物
  addDecorEl(d, '🐰', 250, 200, 50, 30);
  addDecorEl(d, '🦌', -300, -400, 60, 30);
}

function updateWorldDecor() {
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  const d = $('worldDecor'); if (!d) return;
  for (const el of d.children) {
    const wx = parseFloat(el.dataset.x), wy = parseFloat(el.dataset.y);
    const sx = cx + wx - G.px, sy = cy + wy - G.py;
    if (sx < -300 || sx > window.innerWidth + 300 || sy < -300 || sy > window.innerHeight + 300) { el.style.display = 'none'; continue; }
    el.style.display = ''; el.style.left = sx + 'px'; el.style.top = sy + 'px';
  }
}

function updateExploreUI() {
  const g = $('goldTxt'); if (g) g.textContent = G.gold;
  const pc = $('petCount'); if (pc) pc.textContent = G.team.length + '/' + Math.min(5, G.party.length);
  const loc = $('locName'), sub = $('locSub');
  if (G.currentMap === 'town') {
    loc.textContent = '青石村'; sub.textContent = '安全区';
  } else {
    loc.textContent = '野外'; sub.textContent = '危险区域';
  }
  const btnAuto = $('btnAuto');
  if (btnAuto) btnAuto.classList.toggle('on', G.autoExplore);
}

/* ============ 摇杆 ============ */
function setupJoystick() {
  const zone = $('joyZone'), base = $('joyBase'), knob = $('joyKnob');
  if (!zone || !base || !knob) return;
  const start = (e) => {
    if (G.screen !== 'explore') return;
    if (e.target && (e.target.closest('#interactBtn') || e.target.closest('#rightBtns'))) return;
    const t = e.touches ? e.touches[0] : e; if (exp.joyActive) return;
    exp.joyActive = true; exp.joyId = t.identifier !== undefined ? t.identifier : 'm';
    exp.joyOX = t.clientX; exp.joyOY = t.clientY; exp.joyDX = 0; exp.joyDY = 0;
    base.style.left = t.clientX + 'px'; base.style.top = t.clientY + 'px';
    knob.style.left = t.clientX + 'px'; knob.style.top = t.clientY + 'px';
    base.classList.add('on'); knob.classList.add('on');
    if (G.autoExplore) { G.autoExplore = false; updateExploreUI(); }
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
  let mx = 0, my = 0;
  if (exp.joyActive) {
    const d = Math.hypot(exp.joyDX, exp.joyDY);
    if (d > 8) { mx = exp.joyDX / 50; my = exp.joyDY / 50; }
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

  const speed = 220, len = Math.hypot(mx, my);
  if (len > 0.15) {
    let nextX = G.px + mx * speed * dt;
    let nextY = G.py + my * speed * dt;

    // 边界约束
    const R = G.currentMap === 'town' ? TOWN_RADIUS - 30 : FIELD_RADIUS - 100;
    const dist = Math.hypot(nextX, nextY);
    if (dist > R) {
      const angle = Math.atan2(nextY, nextX);
      nextX = Math.cos(angle) * R;
      nextY = Math.sin(angle) * R;
      if (G.autoExplore) autoExploreTimer = 0;
    }

    G.px = nextX; G.py = nextY;

    $('player').classList.add('walking');
    setTimeout(() => $('player').classList.remove('walking'), 100);
    updateWorldDecor();

    // 野外遇敌
    if (G.currentMap === 'field') {
      encounterSteps += len * dt * 30;
      if (encounterSteps > rndi(30, 60)) { encounterSteps = 0; startBattle(); return; }
    } else { encounterSteps = 0; }
  }
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
    const dVill = Math.hypot(G.px - FIELD_VILLAGE.x, G.py - FIELD_VILLAGE.y);
    if (dVill < 160) {
      nearest = { type:'enterTown', x: FIELD_VILLAGE.x, y: FIELD_VILLAGE.y - 90 };
    }
  }

  if (nearest) {
    currentInteract = nearest; btn.classList.remove('hidden');
    btn.style.left = (cx + nearest.x - G.px) + 'px';
    btn.style.top  = (cy + nearest.y - G.py) + 'px';
    if (nearest.type === 'exit') btn.innerHTML = '🚪 离开城镇';
    else if (nearest.type === 'enterTown') btn.innerHTML = '🏠 进入青石村';
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
  });
}

/* ============ 地图切换 ============ */
function enterTown() {
  G.currentMap = 'town';
  G.px = TOWN_EXIT.x;
  G.py = TOWN_EXIT.y - 180;
  encounterSteps = 0;
  renderWorldDecor(); updateWorldDecor(); updateExploreUI(); updateInteract();
  toast('回到了青石村');
  playMusic('town');
}

function leaveTown() {
  G.currentMap = 'field';
  G.px = FIELD_VILLAGE.x;
  G.py = FIELD_VILLAGE.y + 200;
  encounterSteps = 0;
  renderWorldDecor(); updateWorldDecor(); updateExploreUI(); updateInteract();
  toast('离开了青石村');
  playMusic('field');
}

function teleportToTown() {
  G.currentMap = 'town';
  G.px = 0; G.py = 0;
  encounterSteps = 0;
  renderWorldDecor(); updateWorldDecor(); updateExploreUI(); updateInteract();
  playMusic('town');
}

function teleportToField() {
  G.currentMap = 'field';
  G.px = FIELD_VILLAGE.x;
  G.py = FIELD_VILLAGE.y + 200;
  encounterSteps = 0;
  renderWorldDecor(); updateWorldDecor(); updateExploreUI(); updateInteract();
  playMusic('field');
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
function openArena() { showDialog('⛪ 教堂', '暂未开放', [{ text:'离 开', cb: hideDialog }], '🥊'); }
function openBoard() { showDialog('📋 任务板', '暂未开放', [{ text:'离 开', cb: hideDialog }], '📋'); }
function openSmith() { showDialog('🔨 铁匠铺', '暂未开放', [{ text:'离 开', cb: hideDialog }], '👨‍🏭'); }