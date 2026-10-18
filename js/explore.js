"use strict";

/* ============================================================
   场景与探索
   ============================================================ */
const world = { decor: [], towns: [] };
const exp = { joyActive:false, joyId:null, joyOX:0, joyOY:0, joyDX:0, joyDY:0 };
let currentInteract = null;
let autoExploreTimer = 0;
let exploreAutoDir = {x:0, y:0};

function initExplore() {
  renderWorldDecor(); updateExploreUI();
  $('player').textContent = '🧙‍♂️';
  $('player').style.left = '50%'; $('player').style.top = '50%';
  startExploreLoop(); showScreen('explore');
}

function renderWorldDecor() {
  const d = $('worldDecor'); if (!d) return; d.innerHTML = '';
  world.towns = [
    { id:'town1', name:'青石村', x:0, y:0, radius:600, buildings:[
      { id:'shop', name:'商店', icon:'🏪', x: 300, y: 250, type:'shop' },
      { id:'center', name:'灵兽中心', icon:'🏥', x:-350, y: 100, type:'center' },
      { id:'arena', name:'教堂', icon:'⛪', x: 0, y:-350, type:'arena' },
      { id:'board', name:'任务板', icon:'📋', x: 450, y: 50, type:'board' },
      { id:'smith', name:'铁匠铺', icon:'🔨', x:-300, y: 300, type:'smith' },
    ]},
  ];

  const mapLayout = [
    { e: '☁️', x: -400, y: -600, s: 100, z: 1 }, { e: '☁️', x: 300, y: -700, s: 80, z: 1 },
    { e: '☀️', x: 500, y: -700, s: 120, z: 1 }, { e: '⛰️', x: 0, y: -600, s: 240, z: 2 },
    { e: '🌲', x: -550, y: -200, s: 120, z: 5 }, { e: '🌳', x: -350, y: -450, s: 90, z: 5 },
    { e: '🌳', x: 250, y: -400, s: 90, z: 5 }, { e: '🌳', x: -550, y: 150, s: 130, z: 5 },
    { e: '🌲', x: 300, y: 380, s: 100, z: 5 }, { e: '🌲', x: 600, y: 200, s: 110, z: 5 },
    { e: '⛲', x: 0, y: 0, s: 100, z: 30 }, { e: '🐰', x: 150, y: -100, s: 60, z: 30 },
    { e: '🌻', x: 100, y: 50, s: 50, z: 30 }, { e: '🌷', x: -50, y: -100, s: 30, z: 30 },
    { e: '🍄', x: 250, y: 80, s: 40, z: 30 }, { e: '🪵', x: -250, y: 200, s: 60, z: 30 },
    { e: '🦊', x: 550, y: 380, s: 60, z: 30 }, { e: '🐶', x: -300, y: 450, s: 60, z: 30 },
  ];

  const wallRadius = 600;
  for (let a = 0; a < TAU; a += 0.12) {
    if (Math.abs(a - Math.PI / 2) < 0.25) continue;
    const wx = Math.cos(a) * wallRadius, wy = Math.sin(a) * wallRadius;
    const walls = ['🌳', '🌲', '🪨', '🌿', '🪵', '🌵'];
    mapLayout.push({ e: pick(walls), x: wx, y: wy, s: rnd(70, 90), z: 20 });
  }
  mapLayout.push({ e: '🪵', x: -110, y: wallRadius, s: 80, z: 20 });
  mapLayout.push({ e: '🪵', x: 110, y: wallRadius, s: 80, z: 20 });

  for (const b of world.towns[0].buildings) {
    const base = document.createElement('div');
    base.className = 'decor'; base.textContent = '🏠';
    base.dataset.x = b.x; base.dataset.y = b.y;
    base.style.fontSize = '100px'; base.style.zIndex = '10';
    d.appendChild(base);
    const icon = document.createElement('div');
    icon.className = 'building-icon'; icon.textContent = b.icon;
    icon.dataset.x = b.x; icon.dataset.y = b.y - 70;
    d.appendChild(icon);
  }

  for (const item of mapLayout) {
    const el = document.createElement('div');
    el.className = 'decor'; el.textContent = item.e;
    el.dataset.x = item.x; el.dataset.y = item.y;
    el.style.fontSize = item.s + 'px';
    el.style.zIndex = item.z;
    d.appendChild(el);
  }
  updateWorldDecor();
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
  const loc = $('locName');
  const sub = $('locSub');
  if (isInTown()) { loc.textContent = '青石村'; sub.textContent = '安全区'; }
  else { loc.textContent = '城外野外'; sub.textContent = '危险区域'; }
  const btnAuto = $('btnAuto');
  if (btnAuto) btnAuto.classList.toggle('on', G.autoExplore);
}

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

let exploreRAF = null, lastExploreT = 0, encounterSteps = 0;
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

    const town = currentTown();
    if (town) {
      const dist = Math.hypot(nextX - town.x, nextY - town.y);
      if (dist > town.radius) {
        const inGap = Math.abs(nextX - town.x) < 100 && nextY > town.y;
        if (!inGap) {
          const angle = Math.atan2(nextY - town.y, nextX - town.x);
          nextX = town.x + Math.cos(angle) * (town.radius - 10);
          nextY = town.y + Math.sin(angle) * (town.radius - 10);
          if (G.autoExplore) autoExploreTimer = 0;
        }
      }
    }

    G.px = nextX; G.py = nextY;

    $('player').classList.add('walking');
    setTimeout(()=>$('player').classList.remove('walking'), 100);
    updateWorldDecor();

    if (!isInTown()) {
      encounterSteps += len * dt * 30;
      if (encounterSteps > rndi(30, 60)) { encounterSteps = 0; startBattle(); return; }
    } else { encounterSteps = 0; }
  }
  updateInteract();
}

function isInTown() {
  for (const t of world.towns) { if (Math.hypot(G.px - t.x, G.py - t.y) < t.radius) return true; }
  return false;
}
function currentTown() {
  for (const t of world.towns) { if (Math.hypot(G.px - t.x, G.py - t.y) < t.radius + 50) return t; }
  return null;
}

function updateInteract() {
  const btn = $('interactBtn'); if (!btn) return;
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  let nearest = null, nd = Infinity; const town = currentTown();
  if (town) {
    for (const b of town.buildings) {
      const wx = town.x + b.x, wy = town.y + b.y;
      const d = Math.hypot(G.px - wx, G.py - wy);
      if (d < 100 && d < nd) { nd = d; nearest = { type:'building', data:b, x:wx, y:wy - 80 }; }
    }
  }
  if (nearest) {
    currentInteract = nearest; btn.classList.remove('hidden');
    btn.style.left = (cx + nearest.x - G.px) + 'px'; btn.style.top  = (cy + nearest.y - G.py) + 'px';
    btn.innerHTML = '<span>' + nearest.data.icon + '</span>' + nearest.data.name;
  } else { btn.classList.add('hidden'); currentInteract = null; }
}

function setupInteractBtn() {
  const btn = $('interactBtn'); if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation(); if (!currentInteract) return;
    if (currentInteract.type === 'building') openBuilding(currentInteract.data);
  });
}

/* 建筑功能 */
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