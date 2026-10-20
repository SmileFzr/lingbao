"use strict";

/* ============================================================
   特殊地点内部：洞窟
   - 从入口往里走，越走越深
   - 走到最深处 → 区域 BOSS
   - 也可以原路退出
   ============================================================ */

const CAVE_ENTRY_Y = 780;      // 入口的 y
const CAVE_HALF_W  = 235;      // 通道半宽

function caveSite() { return G.cave ? SITES[G.cave.siteId] : null; }
function caveEndY() { const s = caveSite(); return CAVE_ENTRY_Y - (s ? s.depth : 1500); }
function caveDepthPct() {
  if (!G.cave) return 0;
  const end = caveEndY();
  return clamp((CAVE_ENTRY_Y - G.py) / Math.max(1, CAVE_ENTRY_Y - end), 0, 1);
}

function startCave(site) {
  if (!site) return;
  G.caveReturn = { x: G.px, y: G.py, map: G.currentMap };
  G.cave = { siteId: site.id, awaiting: false, pctShown: -1 };
  G.currentMap = 'cave';
  G.px = 0; G.py = CAVE_ENTRY_Y;
  G.walkTarget = null;
  G.autoExplore = false;
  encounterSteps = 0;
  decorRegion = null;
  renderCaveDecor();
  refreshRegion(true);
  updateExploreUI();
  updateCaveInteract();
  toast('你走进了' + site.name);
}

function leaveCave() {
  const s = caveSite();
  const back = G.caveReturn || { x: 0, y: 260, map: 'field' };
  G.cave = null; G.caveReturn = null;
  G.currentMap = 'field';
  G.px = back.x; G.py = back.y;
  decorRegion = null;
  renderWorldDecor(); updateWorldDecor(); updateExploreUI(); updateInteract();
  refreshRegion(true);
  toast(s ? '离开了' + s.name : '离开了洞窟');
}

/* ---------- 洞窟装饰 ---------- */
function renderCaveDecor() {
  const d = $('worldDecor'); if (!d) return; d.innerHTML = '';
  renderCaveMap(d);
  decorRegion = 'cave';
  updateWorldDecor();
}

function renderCaveMap(d) {
  const end = caveEndY();
  const s = caveSite();
  const boss = s ? BOSSES[s.region] : null;
  const pool = s && s.region === 'ruins' ? ['🪨','🧱','💀','🕯️','⚰️','🕸️','⛓️']
    : s && s.region === 'forest' ? ['🌿','🍄','🪨','🪵','🕸️','🦇']
    : s && s.region === 'desert' ? ['🪨','🕯️','💀','🐍','🦂']
    : s && s.region === 'ocean' ? ['🐚','🪸','🪨','💧','🐙']
    : ['🪨','🕯️','🪵','🌿'];

  /* 两侧石壁 */
  for (let y = CAVE_ENTRY_Y + 120; y > end - 200; y -= 62) {
    for (const side of [-1, 1]) {
      const jitter = (Math.random() - 0.5) * 40;
      addDecorEl(d, pick(pool), side * (CAVE_HALF_W + 60 + jitter), y, rnd(48, 84), 20);
      if (Math.random() < 0.45) {
        addDecorEl(d, pick(pool), side * (CAVE_HALF_W + 130 + jitter), y - 30, rnd(40, 70), 19);
      }
    }
    // 地面碎石
    if (Math.random() < 0.5) {
      addDecorEl(d, pick(['🪨','🦴','🕯️','🧱']), rnd(-CAVE_HALF_W + 40, CAVE_HALF_W - 40), y, rnd(26, 44), 6);
    }
    // 火把
    if (y % 186 < 62) {
      addDecorEl(d, '🕯️', -CAVE_HALF_W + 34, y, 40, 12);
      addDecorEl(d, '🕯️', CAVE_HALF_W - 34, y, 40, 12);
    }
  }

  /* 入口 */
  addDecorEl(d, '🪜', 0, CAVE_ENTRY_Y + 60, 84, 14);
  const exitTag = document.createElement('div');
  exitTag.className = 'npc-label';
  exitTag.textContent = '← 原路返回';
  exitTag.dataset.x = 0; exitTag.dataset.y = CAVE_ENTRY_Y + 118;
  d.appendChild(exitTag);

  /* 深度刻度 */
  const depth = CAVE_ENTRY_Y - end;
  for (let i = 1; i <= 3; i++) {
    const y = CAVE_ENTRY_Y - depth * i / 4;
    const tag = document.createElement('div');
    tag.className = 'depth-mark';
    tag.textContent = '· ' + Math.round(i * 25) + '% ·';
    tag.dataset.x = -CAVE_HALF_W - 26; tag.dataset.y = y;
    d.appendChild(tag);
  }

  /* 尽头：BOSS 所在 */
  if (boss) {
    addDecorEl(d, boss.emoji, 0, end + 40, 150, 14);
    const tag = document.createElement('div');
    tag.className = 'boss-mark';
    tag.textContent = '『' + boss.title + '』' + boss.name;
    tag.dataset.x = 0; tag.dataset.y = end - 70;
    d.appendChild(tag);
    for (let t = 0; t < TAU; t += Math.PI / 6) {
      addDecorEl(d, '🪨', Math.cos(t) * 150, end + 40 + Math.sin(t) * 110, 46, 13);
    }
  }
}

/* ---------- 洞窟主循环 ---------- */
function updateCave(dt) {
  let mx = 0, my = 0;
  if (exp.joyActive) {
    const d = Math.hypot(exp.joyDX, exp.joyDY);
    if (d > 8) { mx = exp.joyDX / 50; my = exp.joyDY / 50; }
  }
  const speed = 200;
  const len = Math.hypot(mx, my);
  if (len > 0.15) {
    G.px = clamp(G.px + mx * speed * dt, -CAVE_HALF_W, CAVE_HALF_W);
    G.py = clamp(G.py + my * speed * dt, caveEndY() + 90, CAVE_ENTRY_Y + 90);
    $('player').classList.add('walking');
    setTimeout(() => $('player').classList.remove('walking'), 100);
    updateWorldDecor();
  } else {
    updateWorldDecor();
  }

  /* 深度提示只在地点变化时刷新，避免每帧写 DOM */
  const pct = Math.round(caveDepthPct() * 100);
  if (G.cave && G.cave.pctShown !== pct) {
    G.cave.pctShown = pct;
    const sub = $('locSub');
    if (sub) sub.textContent = '深入 ' + pct + '%　·　越深越危险';
  }

  updateCaveInteract();

  /* 走到尽头 → BOSS */
  if (G.cave && !G.cave.awaiting && G.py <= caveEndY() + 110) {
    triggerCaveBoss();
  }
}

function updateCaveInteract() {
  const btn = $('interactBtn'); if (!btn) return;
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  const nearExit = G.py > CAVE_ENTRY_Y - 60;
  if (nearExit) {
    currentInteract = { type: 'caveExit', x: 0, y: CAVE_ENTRY_Y - 10 };
    btn.classList.remove('hidden');
    btn.style.left = (cx - G.px) + 'px';
    btn.style.top  = (cy + (CAVE_ENTRY_Y - 10) - G.py) + 'px';
    btn.innerHTML = '⬆️ 原路返回';
  } else {
    currentInteract = null;
    btn.classList.add('hidden');
  }
}

/* 触发区域 BOSS 战 */
function triggerCaveBoss() {
  const site = caveSite();
  if (!site) return;
  const boss = BOSSES[site.region];
  G.cave.awaiting = true;
  showDialog(boss.emoji + ' ' + boss.name,
    boss.intro + '\n\n（『' + boss.title + '』拦住了去路）',
    [
      { text:'迎 战', cb: () => { hideDialog(); startBossBattle(site.region); } },
      { text:'退 回 去', cb: () => { hideDialog(); G.cave.awaiting = false; G.py += 220; updateWorldDecor(); } },
    ], boss.emoji);
}
