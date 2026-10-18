/* ============================================================
   无限回响：生肖灵宝 — 游戏主逻辑 v0.1.0
   ============================================================ */
"use strict";

console.log('[生肖灵宝] game.js 加载中...');

const GAME_VERSION = 'v0.1.0';

const TAU = Math.PI * 2;
const rnd  = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const pick = a => a[Math.floor(Math.random() * a.length)];
const $ = id => document.getElementById(id);

/* ============================================================
   五行
   ============================================================ */
const ELEMENTS = {
  metal: { name:'金', color:'#ffd76a', cls:'ele-metal', counters:'wood' },
  wood:  { name:'木', color:'#6ee7a0', cls:'ele-wood',  counters:'earth' },
  earth: { name:'土', color:'#c8a06e', cls:'ele-earth', counters:'water' },
  water: { name:'水', color:'#6eb8ff', cls:'ele-water', counters:'fire' },
  fire:  { name:'火', color:'#ff9070', cls:'ele-fire',  counters:'metal' },
};

function elementMult(atk, def) {
  if (!ELEMENTS[atk] || !ELEMENTS[def]) return 1;
  if (ELEMENTS[atk].counters === def) return 1.5;
  if (ELEMENTS[def].counters === atk) return 0.75;
  return 1.0;
}

/* ============================================================
   技能池
   ============================================================ */
const SKILLS = {
  tackle:   { id:'tackle',   name:'撞击',   icon:'💢', element:'earth', power:35, type:'physical', mp:0,  desc:'土系物理攻击' },
  bite:     { id:'bite',     name:'撕咬',   icon:'🦷', element:'metal', power:45, type:'physical', mp:4,  desc:'金系物理攻击' },
  slash:    { id:'slash',    name:'爪击',   icon:'⚔️', element:'metal', power:50, type:'physical', mp:5,  desc:'金系物理攻击' },
  charge:   { id:'charge',   name:'冲锋',   icon:'🐎', element:'fire',  power:55, type:'physical', mp:6,  desc:'火系物理攻击' },
  fireball: { id:'fireball', name:'火球',   icon:'🔥', element:'fire',  power:50, type:'special',  mp:6,  desc:'火系法术攻击' },
  watergun: { id:'watergun', name:'水枪',   icon:'💧', element:'water', power:50, type:'special',  mp:6,  desc:'水系法术攻击' },
  vinewhip: { id:'vinewhip', name:'藤鞭',   icon:'🌿', element:'wood',  power:50, type:'special',  mp:6,  desc:'木系法术攻击' },
  rockfall: { id:'rockfall', name:'落石',   icon:'🪨', element:'earth', power:50, type:'special',  mp:6,  desc:'土系法术攻击' },
  thunder:  { id:'thunder',  name:'电击',   icon:'⚡', element:'metal', power:55, type:'special',  mp:7,  desc:'金系法术攻击' },
  icebeam:  { id:'icebeam',  name:'冰冻光束',icon:'❄️', element:'water', power:55, type:'special',  mp:7,  desc:'水系法术攻击' },
  gust:     { id:'gust',     name:'疾风',   icon:'🌪️', element:'wood',  power:45, type:'special',  mp:5,  desc:'木系法术攻击' },
  shadow:   { id:'shadow',   name:'暗影球', icon:'🌑', element:'earth', power:55, type:'special',  mp:7,  desc:'土系法术攻击' },
  heal:     { id:'heal',     name:'治愈',   icon:'💚', element:'wood',  power:0,  type:'heal',      mp:6,  desc:'回复 40% 最大 HP', healPct:0.4 },
  harden:   { id:'harden',   name:'硬化',   icon:'🛡️', element:'earth', power:0,  type:'buff',      mp:5,  desc:'提升自身防御', buffStat:'def', buffPct:0.3, buffTurns:3 },
  howl:     { id:'howl',     name:'咆哮',   icon:'📢', element:'metal', power:0,  type:'debuff',    mp:5,  desc:'降低敌人攻击', debuffStat:'atk', debuffPct:0.25, debuffTurns:3 },
  // 变异技能
  storm:    { id:'storm',    name:'雷神怒', icon:'🌩️', element:'metal', power:75, type:'special',  mp:9,  desc:'变异技能：金系高额伤害' },
  blaze:    { id:'blaze',    name:'烈焰冲击',icon:'🔥', element:'fire',  power:75, type:'special',  mp:9,  desc:'变异技能：火系高额伤害' },
  tsunami:  { id:'tsunami',  name:'海啸',   icon:'🌊', element:'water', power:75, type:'special',  mp:9,  desc:'变异技能：水系高额伤害' },
  forest:   { id:'forest',   name:'森罗万象',icon:'🌳', element:'wood',  power:75, type:'special',  mp:9,  desc:'变异技能：木系高额伤害' },
  quake:    { id:'quake',    name:'地裂',   icon:'🏔️', element:'earth', power:75, type:'special',  mp:9,  desc:'变异技能：土系高额伤害' },
};

/* ============================================================
   灵兽池
   ============================================================ */
// 12 生肖（可变异）
const ZODIAC = [
  { id:'rat',     name:'鼠灵', emoji:'🐭', element:'metal', baseStats:{ hp:35, atk:8, def:6, matk:8, mdef:6, spd:14 }, skills:['tackle','bite'] },
  { id:'ox',      name:'牛灵', emoji:'🐮', element:'earth', baseStats:{ hp:55, atk:11,def:9, matk:5, mdef:7, spd:6  }, skills:['tackle','harden'] },
  { id:'tiger',   name:'虎灵', emoji:'🐯', element:'metal', baseStats:{ hp:45, atk:13,def:8, matk:6, mdef:6, spd:12 }, skills:['slash','howl'] },
  { id:'rabbit',  name:'兔灵', emoji:'🐰', element:'wood',  baseStats:{ hp:38, atk:7, def:6, matk:9, mdef:8, spd:15 }, skills:['tackle','gust'] },
  { id:'dragon',  name:'龙灵', emoji:'🐲', element:'fire',  baseStats:{ hp:50, atk:9, def:8, matk:13,mdef:8, spd:10 }, skills:['fireball','bite'] },
  { id:'snake',   name:'蛇灵', emoji:'🐍', element:'fire',  baseStats:{ hp:42, atk:8, def:7, matk:12,mdef:9, spd:11 }, skills:['fireball','howl'] },
  { id:'horse',   name:'马灵', emoji:'🐴', element:'fire',  baseStats:{ hp:45, atk:11,def:7, matk:7, mdef:7, spd:16 }, skills:['charge','tackle'] },
  { id:'goat',    name:'羊灵', emoji:'🐑', element:'earth', baseStats:{ hp:48, atk:7, def:10,matk:9, mdef:10,spd:9  }, skills:['heal','tackle'] },
  { id:'monkey',  name:'猴灵', emoji:'🐵', element:'metal', baseStats:{ hp:40, atk:12,def:7, matk:7, mdef:7, spd:14 }, skills:['slash','tackle'] },
  { id:'rooster', name:'鸡灵', emoji:'🐔', element:'metal', baseStats:{ hp:38, atk:9, def:6, matk:11,mdef:8, spd:13 }, skills:['thunder','howl'] },
  { id:'dog',     name:'狗灵', emoji:'🐶', element:'earth', baseStats:{ hp:50, atk:10,def:9, matk:6, mdef:8, spd:11 }, skills:['bite','harden'] },
  { id:'pig',     name:'猪灵', emoji:'🐷', element:'water', baseStats:{ hp:60, atk:9, def:11,matk:6, mdef:8, spd:5  }, skills:['tackle','harden'] },
];

// 8 原创（不可变异）
const ORIGINALS = [
  { id:'flame',    name:'火灵', emoji:'🔥', element:'fire',  baseStats:{ hp:42, atk:6, def:6, matk:14,mdef:8, spd:11 }, skills:['fireball','tackle'] },
  { id:'aqua',     name:'水灵', emoji:'💧', element:'water', baseStats:{ hp:45, atk:6, def:7, matk:13,mdef:9, spd:10 }, skills:['watergun','harden'] },
  { id:'leaf',     name:'草灵', emoji:'🌿', element:'wood',  baseStats:{ hp:48, atk:7, def:8, matk:11,mdef:9, spd:9  }, skills:['vinewhip','heal'] },
  { id:'stone',    name:'岩灵', emoji:'🪨', element:'earth', baseStats:{ hp:55, atk:10,def:12,matk:6, mdef:9, spd:6  }, skills:['rockfall','harden'] },
  { id:'bolt',     name:'雷灵', emoji:'⚡', element:'metal', baseStats:{ hp:38, atk:8, def:6, matk:13,mdef:8, spd:15 }, skills:['thunder','tackle'] },
  { id:'wind',     name:'风灵', emoji:'🌪️', element:'wood',  baseStats:{ hp:36, atk:7, def:5, matk:11,mdef:8, spd:17 }, skills:['gust','tackle'] },
  { id:'frost',    name:'冰灵', emoji:'❄️', element:'water', baseStats:{ hp:44, atk:6, def:7, matk:13,mdef:10,spd:10 }, skills:['icebeam','harden'] },
  { id:'shadow',   name:'暗灵', emoji:'🌑', element:'earth', baseStats:{ hp:41, atk:9, def:7, matk:12,mdef:8, spd:12 }, skills:['shadow','howl'] },
];

const ALL_SPECIES = [...ZODIAC, ...ORIGINALS];
function findSpecies(id) { return ALL_SPECIES.find(s => s.id === id); }
function isZodiac(id) { return ZODIAC.some(s => s.id === id); }

/* ============================================================
   物品
   ============================================================ */
const ITEMS = {
  potion:  { id:'potion',  name:'小药水', icon:'🧪', type:'heal', value:40, price:30,  desc:'回复 40 HP' },
  potion2: { id:'potion2', name:'中药水', icon:'💊', type:'heal', value:100,price:80,  desc:'回复 100 HP' },
  orb:     { id:'orb',     name:'灵气球', icon:'🔮', type:'capture', price:50, desc:'捕捉灵兽用' },
  orb2:    { id:'orb2',    name:'高级灵气球', icon:'✨', type:'capture', price:150, desc:'捕捉率更高' },
};

/* ============================================================
   存档键
   ============================================================ */
const SAVE_KEY = 'shengxiao_save_v1';

/* ============================================================
   全局状态
   ============================================================ */
const G = {
  screen: 'menu',
  gold: 300,
  items: { potion:5, orb:5, orb2:1 },
  party: [],          // 全部宠物
  team: [],           // 出战队伍（最多 5 只 id）
  px: 0, py: 0,       // 玩家坐标
  battle: null,
  codex: {},          // 图鉴 { speciesId: 已见过 }
  saveKey: SAVE_KEY,
};

/* ============================================================
   宠物创建
   ============================================================ */
let petSeq = 1;
function createPet(speciesId, level, forceVariant) {
  const sp = findSpecies(speciesId);
  if (!sp) return null;
  const lv = level || 1;
  const isV = !!forceVariant;
  const statMult = 1 + (lv - 1) * 0.08;
  const variantMult = isV ? 1.2 : 1;
  const stats = {
    hp:   Math.round(sp.baseStats.hp   * statMult * variantMult),
    atk:  Math.round(sp.baseStats.atk  * statMult * variantMult),
    def:  Math.round(sp.baseStats.def  * statMult * variantMult),
    matk: Math.round(sp.baseStats.matk * statMult * variantMult),
    mdef: Math.round(sp.baseStats.mdef * statMult * variantMult),
    spd:  Math.round(sp.baseStats.spd  * statMult * variantMult),
  };
  const skills = sp.skills.slice();
  if (isV) {
    // 变异额外获得 1 个变异技能
    const variantPool = ['storm','blaze','tsunami','forest','quake'];
    skills.push(pick(variantPool));
  }
  const pet = {
    id: 'p' + (petSeq++),
    speciesId,
    name: sp.name + (isV ? '·变异' : ''),
    emoji: sp.emoji,
    element: sp.element,
    level: lv,
    exp: 0,
    expNext: expForLevel(lv),
    isVariant: isV,
    maxHp: stats.hp,
    hp: stats.hp,
    stats,
    skills,
    buffs: [],
  };
  G.codex[speciesId] = true;
  return pet;
}

function expForLevel(lv) { return 30 + lv * 15; }

/* ============================================================
   存档
   ============================================================ */
function saveGame() {
  try {
    const data = {
      gold: G.gold,
      items: G.items,
      party: G.party.map(p => ({
        id:p.id, speciesId:p.speciesId, name:p.name, emoji:p.emoji,
        element:p.element, level:p.level, exp:p.exp, expNext:p.expNext,
        isVariant:p.isVariant, maxHp:p.maxHp, hp:p.hp, stats:p.stats, skills:p.skills,
      })),
      team: G.team.slice(),
      px: G.px, py: G.py,
      codex: G.codex,
      petSeq,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) { console.error('save 失败', e); }
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    G.gold = d.gold || 0;
    G.items = d.items || {};
    G.party = (d.party || []).map(p => ({
      id:p.id, speciesId:p.speciesId, name:p.name, emoji:p.emoji,
      element:p.element, level:p.level, exp:p.exp, expNext:p.expNext,
      isVariant:p.isVariant, maxHp:p.maxHp, hp:p.hp, stats:p.stats, skills:p.skills,
      buffs: [],
    }));
    G.team = d.team || [];
    G.px = d.px || 0; G.py = d.py || 0;
    G.codex = d.codex || {};
    petSeq = d.petSeq || (G.party.length + 1);
    return true;
  } catch (e) { console.error('load 失败', e); return false; }
}
function hasSave() { return !!localStorage.getItem(SAVE_KEY); }

/* ============================================================
   UI 工具
   ============================================================ */
let toastT = 0;
function toast(msg) {
  const t = $('toast'); if (!t) return;
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.style.opacity = '0'; }, 1800);
}
let hintT = 0;
function showHint(msg, dur) {
  dur = dur || 4000;
  const h = $('hintBar'); if (!h) return;
  h.textContent = msg;
  h.classList.remove('hidden', 'fade');
  clearTimeout(hintT);
  hintT = setTimeout(() => {
    h.classList.add('fade');
    setTimeout(() => h.classList.add('hidden'), 500);
  }, dur);
}
function showScreen(name) {
  ['menu','explore','battle'].forEach(s => {
    const el = $(s); if (el) el.classList.toggle('hidden', s !== name);
  });
  G.screen = name;
}

/* ============================================================
   初始队伍
   ============================================================ */
function initNewGame() {
  G.gold = 300;
  G.items = { potion:5, orb:5, orb2:1 };
  G.party = [];
  G.team = [];
  G.codex = {};
  G.px = 0; G.py = 0;
  petSeq = 1;
  // 送 2 只初始
  const p1 = createPet('tiger', 5);
  const p2 = createPet('dragon', 5);
  G.party.push(p1, p2);
  G.team.push(p1.id, p2.id);
  saveGame();
}

/* ============================================================
   探索世界
   ============================================================ */
const world = { decor: [], towns: [], fields: [] };
const exp = { joyActive:false, joyId:null, joyOX:0, joyOY:0, joyDX:0, joyDY:0 };
let currentInteract = null;

function initExplore() {
  renderWorldDecor();
  updateExploreUI();
  updateExplorePlayerPos();
  startExploreLoop();
  showScreen('explore');
  setTimeout(() => showHint('📍 走动探索世界 · 靠近建筑/NPC 可交互'), 500);
}

function renderWorldDecor() {
  const d = $('worldDecor'); if (!d) return;
  d.innerHTML = '';
  world.decor = [];

  // 城镇：青石村（原点）
  world.towns = [
    { id:'town1', name:'青石村', x:0, y:0, radius:400, emoji:'🏘️', buildings:[
      { id:'shop',    name:'商店',   emoji:'🏪', x: 120, y: 60,  type:'shop' },
      { id:'center',  name:'灵兽中心', emoji:'🏥', x:-120, y: 60,  type:'center' },
      { id:'arena',   name:'竞技场', emoji:'🏟️', x: 0,   y:-140, type:'arena' },
      { id:'board',   name:'任务板', emoji:'📋', x: 180, y:-60,  type:'board' },
      { id:'smith',   name:'铁匠铺', emoji:'🔨', x:-180, y:-60,  type:'smith' },
      { id:'lab',     name:'研究所', emoji:'🔬', x: 0,   y: 160, type:'lab' },
    ]},
  ];

  // 野外区域
  world.fields = [
    { id:'field1', name:'翠绿草原', x: 900,  y: 0,    emoji:'🌿' },
    { id:'field2', name:'幽暗森林', x: 0,    y: 900,  emoji:'🌲' },
    { id:'field3', name:'荒漠戈壁', x:-900,  y: 0,    emoji:'🏜️' },
    { id:'field4', name:'冰霜雪原', x: 0,    y:-900,  emoji:'❄️' },
  ];

  // 大树、石头、草随机撒在世界上
  const decorations = [];
  for (let i = 0; i < 120; i++) {
    const types = [
      { e:'🌳', size:64 }, { e:'🌲', size:60 }, { e:'🌴', size:56 },
      { e:'🪨', size:32 }, { e:'🪵', size:40 }, { e:'🌿', size:36 },
      { e:'🌾', size:24 }, { e:'🌻', size:28 }, { e:'🍄', size:24 },
    ];
    const t = pick(types);
    decorations.push({
      emoji: t.e, size: t.size,
      x: rnd(-2000, 2000), y: rnd(-2000, 2000),
    });
  }
  world.decor = decorations;

  // 城镇建筑
  for (const town of world.towns) {
    addWorldEmoji(d, town.emoji, town.x, town.y, 100, true);
    for (const b of town.buildings) {
      addWorldEmoji(d, b.emoji, town.x + b.x, town.y + b.y, 64);
    }
  }
  // 野外标记
  for (const f of world.fields) {
    addWorldEmoji(d, f.emoji, f.x, f.y, 80, false, 0.5);
  }
  // 散落装饰
  for (const dec of decorations) {
    addWorldEmoji(d, dec.emoji, dec.x, dec.y, dec.size, false, 0.85);
  }
  updateWorldDecor();
}

function addWorldEmoji(parent, emoji, x, y, size, isTown, opacity) {
  const el = document.createElement('div');
  el.className = 'decor';
  el.textContent = emoji;
  el.dataset.x = x; el.dataset.y = y;
  el.style.fontSize = size + 'px';
  el.style.zIndex = isTown ? '3' : '1';
  if (opacity !== undefined) el.style.opacity = opacity;
  parent.appendChild(el);
}

function updateWorldDecor() {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const d = $('worldDecor'); if (!d) return;
  const RANGE = 1800;
  for (const el of d.children) {
    let wx = parseFloat(el.dataset.x);
    let wy = parseFloat(el.dataset.y);
    while (wx - G.px < -RANGE) wx += RANGE * 2;
    while (wx - G.px >  RANGE) wx -= RANGE * 2;
    while (wy - G.py < -RANGE) wy += RANGE * 2;
    while (wy - G.py >  RANGE) wy -= RANGE * 2;
    const sx = cx + wx - G.px;
    const sy = cy + wy - G.py;
    if (sx < -200 || sx > window.innerWidth + 200 || sy < -200 || sy > window.innerHeight + 200) {
      el.style.display = 'none';
      continue;
    }
    el.style.display = '';
    el.style.left = sx + 'px';
    el.style.top  = sy + 'px';
  }
}

function updateExplorePlayerPos() {
  const p = $('player'); if (!p) return;
  p.textContent = '🧑‍🌾';
  p.style.left = '50%';
  p.style.top  = '50%';
}

function updateExploreUI() {
  const g = $('goldTxt'); if (g) g.textContent = G.gold;
  const pc = $('petCount'); if (pc) pc.textContent = G.team.length + '/' + Math.min(5, G.party.length);
}

/* 摇杆 */
function setupJoystick() {
  const zone = $('joyZone'); const base = $('joyBase'); const knob = $('joyKnob');
  if (!zone || !base || !knob) return;
  const start = (e) => {
    if (G.screen !== 'explore') return;
    if (e.target && (e.target.closest('#interactBtn') || e.target.closest('#rightBtns'))) return;
    const t = e.touches ? e.touches[0] : e;
    if (exp.joyActive) return;
    exp.joyActive = true;
    exp.joyId = t.identifier !== undefined ? t.identifier : 'm';
    exp.joyOX = t.clientX; exp.joyOY = t.clientY;
    exp.joyDX = 0; exp.joyDY = 0;
    base.style.left = t.clientX + 'px';
    base.style.top = t.clientY + 'px';
    knob.style.left = t.clientX + 'px';
    knob.style.top = t.clientY + 'px';
    base.classList.add('on'); knob.classList.add('on');
  };
  const move = (e) => {
    if (!exp.joyActive) return;
    const touches = e.touches || [e];
    for (const t of touches) {
      const id = t.identifier !== undefined ? t.identifier : 'm';
      if (id !== exp.joyId) continue;
      let dx = t.clientX - exp.joyOX;
      let dy = t.clientY - exp.joyOY;
      const d = Math.hypot(dx, dy);
      const max = 50;
      if (d > max) { dx = dx / d * max; dy = dy / d * max; }
      exp.joyDX = dx; exp.joyDY = dy;
      knob.style.left = (exp.joyOX + dx) + 'px';
      knob.style.top = (exp.joyOY + dy) + 'px';
    }
  };
  const end = (e) => {
    if (!exp.joyActive) return;
    let still = false;
    const touches = e.touches || [];
    for (const t of touches) {
      const id = t.identifier !== undefined ? t.identifier : 'm';
      if (id === exp.joyId) still = true;
    }
    if (!still) {
      exp.joyActive = false; exp.joyDX = 0; exp.joyDY = 0;
      base.classList.remove('on'); knob.classList.remove('on');
    }
  };
  zone.addEventListener('touchstart', e => { e.preventDefault(); start(e); }, { passive:false });
  zone.addEventListener('touchmove', e => { e.preventDefault(); move(e); }, { passive:false });
  zone.addEventListener('touchend', end);
  zone.addEventListener('touchcancel', end);
  zone.addEventListener('mousedown', e => { e.preventDefault(); start(e); });
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);
}

/* 探索循环 */
let exploreRAF = null;
let lastExploreT = 0;
let encounterSteps = 0;
function startExploreLoop() {
  if (exploreRAF) return;
  lastExploreT = performance.now();
  const loop = (now) => {
    exploreRAF = requestAnimationFrame(loop);
    if (G.screen !== 'explore') return;
    const dt = Math.min(0.05, (now - lastExploreT) / 1000);
    lastExploreT = now;
    updateExplore(dt);
  };
  exploreRAF = requestAnimationFrame(loop);
}

function updateExplore(dt) {
  let mx = 0, my = 0;
  if (exp.joyActive) {
    const d = Math.hypot(exp.joyDX, exp.joyDY);
    if (d > 8) { mx = exp.joyDX / 50; my = exp.joyDY / 50; }
  }
  const speed = 220;
  const len = Math.hypot(mx, my);
  if (len > 0.15) {
    G.px += mx * speed * dt;
    G.py += my * speed * dt;
    updateWorldDecor();
    // 遇怪判定：不在城镇里
    if (!isInTown()) {
      encounterSteps += len * dt * 30;
      if (encounterSteps > rndi(30, 60)) {
        encounterSteps = 0;
        startBattle();
        return;
      }
    } else {
      encounterSteps = 0;
    }
  }
  updateInteract();
}

function isInTown() {
  for (const t of world.towns) {
    if (Math.hypot(G.px - t.x, G.py - t.y) < t.radius) return true;
  }
  return false;
}

function currentTown() {
  for (const t of world.towns) {
    if (Math.hypot(G.px - t.x, G.py - t.y) < t.radius) return t;
  }
  return null;
}

/* 交互按钮 */
function updateInteract() {
  const btn = $('interactBtn'); if (!btn) return;
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  let nearest = null, nd = Infinity;
  const town = currentTown();

  if (town) {
    for (const b of town.buildings) {
      const wx = town.x + b.x, wy = town.y + b.y;
      const d = Math.hypot(G.px - wx, G.py - wy);
      if (d < 110 && d < nd) {
        nd = d;
        nearest = { type:'building', data:b, x:wx, y:wy - 60 };
      }
    }
  }

  if (nearest) {
    currentInteract = nearest;
    btn.classList.remove('hidden', 'town', 'field');
    btn.style.left = (cx + nearest.x - G.px) + 'px';
    btn.style.top  = (cy + nearest.y - G.py) + 'px';
    btn.innerHTML = '<span>💬</span>' + nearest.data.name;
  } else {
    btn.classList.add('hidden');
    currentInteract = null;
  }
}

function setupInteractBtn() {
  const btn = $('interactBtn'); if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!currentInteract) return;
    if (currentInteract.type === 'building') openBuilding(currentInteract.data);
  });
}

function openBuilding(b) {
  const town = currentTown();
  if (b.type === 'shop')      return openShop();
  if (b.type === 'center')    return openCenter();
  if (b.type === 'arena')     return openArena();
  if (b.type === 'board')     return openBoard();
  if (b.type === 'smith')     return openSmith();
  if (b.type === 'lab')       return openLab();
}

/* ============================================================
   城镇功能
   ============================================================ */
function openShop() {
  const options = [];
  for (const id in ITEMS) {
    const it = ITEMS[id];
    options.push({
      text: it.icon + ' ' + it.name + '（' + it.price + '金）',
      cb: () => {
        if (G.gold < it.price) { toast('金币不足'); return; }
        G.gold -= it.price;
        G.items[id] = (G.items[id] || 0) + 1;
        saveGame(); updateExploreUI();
        toast('购买 ' + it.name);
        hideDialog();
      }
    });
  }
  options.push({ text:'离 开', cb: hideDialog });
  showDialog('🏪 商店', '金币：' + G.gold + '\n要买什么？', options, '🧑‍💼');
}

function openCenter() {
  showDialog('🏥 灵兽中心', '要让灵兽们休息吗？', [
    { text:'全体回复', cb: () => {
      for (const p of G.party) p.hp = p.maxHp;
      saveGame();
      toast('全体灵兽回复完毕');
      hideDialog();
    }},
    { text:'离 开', cb: hideDialog },
  ], '👩‍⚕️');
}

function openArena() {
  showDialog('🏟️ 竞技场', '要和训练师对战吗？\n（P1 暂未开放）', [
    { text:'离 开', cb: hideDialog },
  ], '🥊');
}

function openBoard() {
  showDialog('📋 任务板', '当前没有可接的任务。\n（P1 暂未开放）', [
    { text:'离 开', cb: hideDialog },
  ], '📋');
}

function openSmith() {
  showDialog('🔨 铁匠铺', '“要打造装备吗？”\n（P1 暂未开放）', [
    { text:'离 开', cb: hideDialog },
  ], '👨‍🏭');
}

function openLab() {
  showDialog('🔬 研究所', '“想了解灵兽的变异吗？”\n\n12 生肖的灵兽有 5% 概率是变异体，\n变异后属性 +20% 并获得额外技能。', [
    { text:'离 开', cb: hideDialog },
  ], '🔬');
}

/* ============================================================
   战斗
   ============================================================ */
function startBattle() {
  // 生成敌方 1-5 只
  const count = rndi(1, 3);
  const enemies = [];
  for (let i = 0; i < count; i++) {
    const sp = pick(ALL_SPECIES);
    const isV = isZodiac(sp.id) && Math.random() < 0.05;
    const lv = Math.max(1, Math.round(G.party[0] ? G.party[0].level + rnd(-1, 1) : 3));
    const e = createPet(sp.id, lv, isV);
    e.isEnemy = true;
    e.buffs = [];
    enemies.push(e);
  }

  // 己方出战
  const myTeam = G.team.map(id => G.party.find(p => p.id === id)).filter(Boolean).slice(0, 5);
  if (myTeam.length === 0) { toast('没有可出战的灵兽'); return; }
  for (const p of myTeam) { p.buffs = []; p.isEnemy = false; }

  G.battle = {
    enemies,
    team: myTeam,
    ended: false,
    auto: false,
    turn: 1,
    actions: {},  // petId -> action
    actorQueue: [],
  };

  $('battleLogList').innerHTML = '';
  logBattle('⚔️ 遭遇野生灵兽！', 'log-system');

  showScreen('battle');
  renderBattle();
  updateBattleMsg('选择每只灵兽的行动');
  beginTurn();
}

function renderBattle() {
  const er = $('enemyRow'); if (er) er.innerHTML = '';
  if (er) for (const e of G.battle.enemies) er.appendChild(makeUnitEl(e));
  const pr = $('playerRow'); if (pr) pr.innerHTML = '';
  if (pr) for (const u of G.battle.team) pr.appendChild(makeUnitEl(u));
}

function makeUnitEl(u) {
  const div = document.createElement('div');
  let cls = 'unit';
  if (u.hp <= 0) cls += ' dead';
  if (u.isVariant) cls += ' variant';
  div.className = cls;
  div.id = 'unit_' + u.id;
  const hpPct = clamp(u.hp / u.maxHp, 0, 1);
  const hpClass = hpPct < 0.25 ? 'crit' : hpPct < 0.55 ? 'low' : '';
  const el = ELEMENTS[u.element];
  div.innerHTML =
    '<div class="unitEle ' + (el ? el.cls : '') + '">' + (el ? el.name : '') + '</div>' +
    '<div class="unitSprite">' + u.emoji + '</div>' +
    '<div class="unitName">' + (u.name.length > 5 ? u.name.slice(0,5) + '…' : u.name) + '</div>' +
    '<div class="unitHPWrap"><div class="unitHP ' + hpClass + '" style="width:' + (hpPct * 100) + '%"></div></div>' +
    '<div style="font-size:9px;opacity:.6">Lv.' + u.level + '</div>';
  return div;
}

function logBattle(text, cls) {
  const list = $('battleLogList'); if (!list) return;
  const item = document.createElement('div');
  item.className = 'logItem ' + (cls || '');
  item.textContent = text;
  list.appendChild(item);
  while (list.children.length > 30) list.removeChild(list.firstChild);
  const area = $('battleLogArea');
  if (area) area.scrollTop = area.scrollHeight;
}

function updateBattleMsg(msg) { const el = $('battleMsg'); if (el) el.textContent = msg; }

/* 回合开始 */
function beginTurn() {
  if (G.battle.ended) return;
  G.battle.actions = {};
  // 清理 buff 回合
  for (const p of [...G.battle.team, ...G.battle.enemies]) {
    p.buffs = (p.buffs || []).filter(b => --b.turns > 0);
  }
  renderBattle();
  promptNextPetAction();
}

function promptNextPetAction() {
  const team = G.battle.team.filter(p => p.hp > 0);
  const pending = team.find(p => !G.battle.actions[p.id]);
  if (!pending) {
    // 所有行动已选 → 执行
    executeTurn();
    return;
  }
  // 自动接管
  if (G.battle.auto) {
    G.battle.actions[pending.id] = autoChooseAction(pending);
    setTimeout(promptNextPetAction, 100);
    return;
  }
  // 弹技能菜单
  updateBattleMsg(pending.name + ' 的回合');
  showSkillMenu(pending);
}

function showSkillMenu(pet) {
  const sm = $('subMenu'); if (!sm) return;
  $('subTitle').textContent = pet.emoji + ' ' + pet.name + ' · Lv.' + pet.level;
  const list = $('subList'); list.innerHTML = '';
  for (const sid of pet.skills) {
    const sk = SKILLS[sid];
    if (!sk) continue;
    const b = document.createElement('button');
    b.className = 'subItem';
    const el = ELEMENTS[sk.element];
    b.innerHTML = '<span>' + sk.icon + ' ' + sk.name + ' <span class="' + (el ? el.cls : '') + '" style="font-size:10px;padding:1px 5px;border-radius:6px">' + (el ? el.name : '') + '</span></span>' +
      '<span class="cost">' + (sk.power > 0 ? '威力 ' + sk.power : sk.desc) + '</span>';
    b.onclick = () => {
      hideSubMenu();
      G.battle.actions[pet.id] = { type:'skill', skillId: sid };
      promptNextPetAction();
    };
    list.appendChild(b);
  }
  // 换宠？暂时略过
  sm.classList.remove('hidden');
}

function autoChooseAction(pet) {
  // 简单 AI：选最高威力的技能；血量低用治疗
  if (pet.hp / pet.maxHp < 0.3) {
    const healSk = pet.skills.find(s => SKILLS[s] && SKILLS[s].type === 'heal');
    if (healSk) return { type:'skill', skillId: healSk };
  }
  const atkSkills = pet.skills
    .map(s => SKILLS[s])
    .filter(sk => sk && sk.power > 0)
    .sort((a, b) => b.power - a.power);
  if (atkSkills.length === 0) return { type:'skill', skillId: pet.skills[0] };
  return { type:'skill', skillId: atkSkills[0].id };
}

/* 执行整个回合 */
function executeTurn() {
  const all = [];
  for (const p of G.battle.team) {
    if (p.hp > 0) all.push({ unit: p, side: 'team', action: G.battle.actions[p.id] });
  }
  for (const e of G.battle.enemies) {
    if (e.hp > 0) all.push({ unit: e, side: 'enemy', action: autoChooseAction(e) });
  }
  // 按速度排序
  all.sort((a, b) => b.unit.stats.spd - a.unit.stats.spd);

  let i = 0;
  const step = () => {
    if (G.battle.ended) return;
    if (i >= all.length) {
      // 检查结束
      if (G.battle.enemies.every(e => e.hp <= 0)) { endBattle('win'); return; }
      if (G.battle.team.every(p => p.hp <= 0)) { endBattle('lose'); return; }
      G.battle.turn++;
      beginTurn();
      return;
    }
    const item = all[i++];
    if (item.unit.hp <= 0) { step(); return; }
    executeOneAction(item, step);
  };
  step();
}

function executeOneAction(item, next) {
  const { unit, side, action } = item;
  // 选目标
  let targets;
  if (side === 'team') targets = G.battle.enemies.filter(e => e.hp > 0);
  else targets = G.battle.team.filter(p => p.hp > 0);
  if (targets.length === 0) { next(); return; }
  const sk = SKILLS[action.skillId];
  if (!sk) { next(); return; }
  let target = targets[0];
  if (sk.type === 'heal') target = unit; // 自己
  else if (sk.type === 'buff') target = unit;
  else {
    // 选血最少的敌人
    target = targets.reduce((a, b) => a.hp < b.hp ? a : b);
  }

  setTimeout(() => {
    let log = '';
    if (sk.type === 'physical' || sk.type === 'special') {
      const atkStat = sk.type === 'physical' ? unit.stats.atk : unit.stats.matk;
      const defStat = sk.type === 'physical' ? target.stats.def : target.stats.mdef;
      let baseDmg = (unit.level * 2 / 5 + 2) * sk.power * atkStat / Math.max(1, defStat) / 50 + 2;
      const mult = elementMult(sk.element, target.element);
      const crit = Math.random() < 0.0625 ? 1.5 : 1;
      const rand = rnd(0.85, 1.0);
      let dmg = Math.round(baseDmg * mult * crit * rand);
      dmg = Math.max(1, dmg);
      target.hp = Math.max(0, target.hp - dmg);
      log = unit.emoji + ' ' + unit.name + ' 使用 ' + sk.name + '，对 ' + target.name + ' 造成 ' + dmg + ' 伤害';
      if (mult > 1) log += ' （克制！）';
      if (mult < 1) log += ' （被克制）';
      if (crit > 1) log += ' ⭐暴击';
      logBattle(log, mult > 1 ? 'log-crit' : 'log-damage');
      playHit(target);
    } else if (sk.type === 'heal') {
      const heal = Math.round(unit.maxHp * (sk.healPct || 0.4));
      unit.hp = Math.min(unit.maxHp, unit.hp + heal);
      logBattle(unit.emoji + ' ' + unit.name + ' 使用 ' + sk.name + '，回复 ' + heal + ' HP', 'log-heal');
    } else if (sk.type === 'buff') {
      unit.buffs.push({ stat: sk.buffStat, pct: sk.buffPct, turns: sk.buffTurns });
      logBattle(unit.emoji + ' ' + unit.name + ' 使用 ' + sk.name, 'log-skill');
    } else if (sk.type === 'debuff') {
      target.buffs.push({ stat: sk.debuffStat, pct: -sk.debuffPct, turns: sk.debuffTurns });
      logBattle(unit.emoji + ' ' + unit.name + ' 使用 ' + sk.name + ' 削弱 ' + target.name, 'log-skill');
    }
    renderBattle();
    if (target.hp <= 0) {
      logBattle('💀 ' + target.name + ' 倒下了', 'log-damage');
      renderBattle();
    }
    setTimeout(next, 400);
  }, 300);
}

function playHit(unit) {
  const el = document.getElementById('unit_' + unit.id);
  if (!el) return;
  el.classList.add('hit');
  setTimeout(() => el.classList.remove('hit'), 300);
}

/* 结束战斗 */
function endBattle(result) {
  G.battle.ended = true;
  if (result === 'win') {
    let gold = 0, exp = 0;
    for (const e of G.battle.enemies) {
      gold += 10 + e.level * 5;
      exp  += 15 + e.level * 8;
    }
    G.gold += gold;
    for (const p of G.battle.team) {
      if (p.hp <= 0) continue;
      p.exp += exp;
      while (p.exp >= p.expNext) {
        p.exp -= p.expNext;
        p.level++;
        p.expNext = expForLevel(p.level);
        // 属性成长
        const sp = findSpecies(p.speciesId);
        const statMult = 1 + (p.level - 1) * 0.08;
        const variantMult = p.isVariant ? 1.2 : 1;
        p.maxHp = Math.round(sp.baseStats.hp * statMult * variantMult);
        p.stats.hp   = p.maxHp;
        p.stats.atk  = Math.round(sp.baseStats.atk  * statMult * variantMult);
        p.stats.def  = Math.round(sp.baseStats.def  * statMult * variantMult);
        p.stats.matk = Math.round(sp.baseStats.matk * statMult * variantMult);
        p.stats.mdef = Math.round(sp.baseStats.mdef * statMult * variantMult);
        p.stats.spd  = Math.round(sp.baseStats.spd  * statMult * variantMult);
        p.hp = Math.min(p.hp, p.maxHp);
        logBattle('🎉 ' + p.name + ' 升到 Lv.' + p.level + '！', 'log-skill');
      }
    }
    saveGame();
    setTimeout(() => {
      showDialog('战斗胜利', '获得 ' + gold + ' 金币 · ' + exp + ' 经验', [
        { text:'继 续', cb: () => { hideDialog(); backToExplore(); } }
      ], '🏆');
    }, 500);
  } else {
    setTimeout(() => {
      showDialog('战斗失败', '你的灵兽全部倒下了...', [
        { text:'回 到 城 镇', cb: () => {
          hideDialog();
          for (const p of G.party) p.hp = p.maxHp;
          G.px = 0; G.py = 0;
          updateWorldDecor();
          backToExplore();
        }}
      ], '💀');
    }, 500);
  }
}

function backToExplore() {
  G.battle = null;
  showScreen('explore');
  updateExploreUI();
}

/* ============================================================
   背包 / 队伍 / 图鉴
   ============================================================ */
function openBag() {
  const bg = $('bagGold'); if (bg) bg.textContent = G.gold;
  const list = $('bagList'); if (!list) return;
  list.innerHTML = '';
  const ids = Object.keys(G.items);
  if (ids.length === 0) list.innerHTML = '<div class="empty">背包是空的</div>';
  for (const id of ids) {
    const it = ITEMS[id]; if (!it || G.items[id] <= 0) continue;
    const row = document.createElement('div');
    row.className = 'itemRow';
    row.innerHTML = '<span class="itemName">' + it.icon + ' ' + it.name + '</span><span class="itemQty">×' + G.items[id] + '</span>';
    list.appendChild(row);
  }
  $('bagPanel').classList.remove('hidden');
}

function openTeam() {
  const list = $('teamList'); if (!list) return;
  list.innerHTML = '';
  if (G.party.length === 0) list.innerHTML = '<div class="empty">还没有灵兽</div>';
  for (const p of G.party) {
    const active = G.team.includes(p.id);
    const el = ELEMENTS[p.element];
    const row = document.createElement('div');
    row.className = 'itemRow petRow' + (active ? ' active' : '');
    row.style.cursor = 'pointer';
    row.innerHTML = '<span class="itemName">' + p.emoji + ' ' + p.name +
      ' <span class="' + (el ? el.cls : '') + '" style="font-size:10px;padding:1px 5px;border-radius:6px">' + (el ? el.name : '') + '</span>' +
      (p.isVariant ? ' <span style="color:#f0abfc;font-size:10px">变异</span>' : '') +
      '</span><span class="itemQty">Lv.' + p.level + ' · HP ' + p.hp + '/' + p.maxHp + (active ? ' · 出战' : '') + '</span>';
    row.onclick = () => {
      $('teamPanel').classList.add('hidden');
      openPetPanel(p);
    };
    list.appendChild(row);
  }
  $('teamPanel').classList.remove('hidden');
}

let currentPetDetail = null;
function openPetPanel(p) {
  currentPetDetail = p;
  const el = ELEMENTS[p.element];
  $('petName').textContent = p.emoji + ' ' + p.name;
  $('petSub').innerHTML = 'Lv.' + p.level + ' · <span class="' + (el ? el.cls : '') + '" style="padding:1px 6px;border-radius:6px">' + (el ? el.name : '') + '</span> 属性';
  $('petInfo').innerHTML =
    '<div class="row"><span class="k">HP</span><span class="v">' + p.hp + ' / ' + p.maxHp + '</span></div>' +
    '<div class="row"><span class="k">攻击</span><span class="v">' + p.stats.atk + '</span></div>' +
    '<div class="row"><span class="k">防御</span><span class="v">' + p.stats.def + '</span></div>' +
    '<div class="row"><span class="k">魔攻</span><span class="v">' + p.stats.matk + '</span></div>' +
    '<div class="row"><span class="k">魔防</span><span class="v">' + p.stats.mdef + '</span></div>' +
    '<div class="row"><span class="k">速度</span><span class="v">' + p.stats.spd + '</span></div>' +
    '<div class="row"><span class="k">经验</span><span class="v">' + p.exp + ' / ' + p.expNext + '</span></div>';
  const sl = $('petSkills'); sl.innerHTML = '';
  for (const sid of p.skills) {
    const sk = SKILLS[sid]; if (!sk) continue;
    const se = ELEMENTS[sk.element];
    const row = document.createElement('div');
    row.className = 'skillRow';
    row.innerHTML =
      '<div class="ic">' + sk.icon + '</div>' +
      '<div class="info">' +
        '<div class="nm"><span>' + sk.name + '</span>' +
        '<span class="ele ' + (se ? se.cls : '') + '">' + (se ? se.name : '') + '</span></div>' +
        '<div class="desc">' + sk.desc + (sk.power > 0 ? ' · 威力 ' + sk.power : '') + '</div>' +
      '</div>';
    sl.appendChild(row);
  }
  const btn = $('petToggle');
  if (G.team.includes(p.id)) {
    btn.textContent = '下 阵';
    btn.className = 'btn danger';
  } else {
    btn.textContent = '上 阵';
    btn.className = 'btn warn';
  }
  $('petPanel').classList.remove('hidden');
}

function setupPetPanel() {
  $('petClose').onclick = () => $('petPanel').classList.add('hidden');
  $('petToggle').onclick = () => {
    const p = currentPetDetail; if (!p) return;
    if (G.team.includes(p.id)) {
      G.team = G.team.filter(id => id !== p.id);
    } else {
      if (G.team.length >= 5) { toast('最多 5 只出战'); return; }
      G.team.push(p.id);
    }
    saveGame();
    openPetPanel(p);
    updateExploreUI();
  };
}

function openCodex() {
  const total = ALL_SPECIES.length;
  const seen = Object.keys(G.codex).length;
  $('codexSub').textContent = '已见 ' + seen + ' / ' + total;
  const grid = $('codexGrid'); if (!grid) return;
  grid.innerHTML = '';
  for (const sp of ALL_SPECIES) {
    const s = G.codex[sp.id];
    const card = document.createElement('div');
    card.className = 'codexCard' + (s ? '' : ' locked');
    card.innerHTML = '<div class="ci">' + (s ? sp.emoji : '❓') + '</div><div class="cn">' + (s ? sp.name : '???') + '</div>';
    grid.appendChild(card);
  }
  $('codexPanel').classList.remove('hidden');
}

/* ============================================================
   对话框
   ============================================================ */
function showDialog(name, text, options, avatar) {
  const n = $('dlgName'); if (n) n.textContent = name;
  const t = $('dlgText'); if (t) t.textContent = text;
  const av = $('dlgAvatar');
  if (av) { if (avatar) { av.textContent = avatar; av.style.display = 'flex'; } else av.style.display = 'none'; }
  const opt = $('dlgOptions'); if (!opt) return;
  opt.innerHTML = '';
  for (const o of options) {
    const b = document.createElement('button');
    b.className = 'dlgOpt'; b.textContent = o.text; b.onclick = o.cb;
    opt.appendChild(b);
  }
  $('dialog').classList.remove('hidden');
}
function hideDialog() { const d = $('dialog'); if (d) d.classList.add('hidden'); }

/* ============================================================
   战斗按钮
   ============================================================ */
function setupBattleButtons() {
  document.querySelectorAll('.actionBtn').forEach(btn => {
    btn.onclick = () => {
      const act = btn.dataset.act;
      const pet = G.battle && G.battle.team.find(p => p.hp > 0 && !G.battle.actions[p.id]);
      if (act === 'auto') {
        G.battle.auto = !G.battle.auto;
        btn.classList.toggle('on', G.battle.auto);
        toast(G.battle.auto ? '自动战斗开启' : '自动战斗关闭');
        if (G.battle.auto) promptNextPetAction();
        return;
      }
      if (act === 'capture') { tryCapture(); return; }
      if (act === 'escape') {
        if (Math.random() < 0.6) {
          logBattle('🏃 逃跑成功', 'log-action');
          setTimeout(() => { backToExplore(); }, 600);
        } else {
          logBattle('❌ 逃跑失败', 'log-action');
        }
        return;
      }
      if (!pet) { toast('没有待行动的灵兽'); return; }
      if (act === 'skill') showSkillMenu(pet);
      if (act === 'item') showItemMenu(pet);
      if (act === 'swap') { toast('P1 暂未开放换宠'); }
    };
  });
}

function showItemMenu(pet) {
  const sm = $('subMenu'); if (!sm) return;
  $('subTitle').textContent = '使用道具（对 ' + pet.name + '）';
  const list = $('subList'); list.innerHTML = '';
  let has = false;
  for (const id in G.items) {
    if (G.items[id] <= 0) continue;
    const it = ITEMS[id]; if (!it) continue;
    if (it.type !== 'heal') continue;
    has = true;
    const b = document.createElement('button');
    b.className = 'subItem';
    b.innerHTML = '<span>' + it.icon + ' ' + it.name + ' ×' + G.items[id] + '</span><span class="cost">' + it.desc + '</span>';
    b.onclick = () => {
      G.items[id]--;
      pet.hp = Math.min(pet.maxHp, pet.hp + it.value);
      logBattle('🧪 ' + pet.name + ' 使用 ' + it.name + '，回复 ' + it.value + ' HP', 'log-heal');
      hideSubMenu();
      G.battle.actions[pet.id] = { type:'item' };
      renderBattle();
      promptNextPetAction();
    };
    list.appendChild(b);
  }
  if (!has) list.innerHTML = '<div class="empty">没有可用道具</div>';
  sm.classList.remove('hidden');
}

function tryCapture() {
  const enemies = G.battle.enemies.filter(e => e.hp > 0);
  if (enemies.length === 0) return;
  const orbId = G.items['orb2'] > 0 ? 'orb2' : (G.items['orb'] > 0 ? 'orb' : null);
  if (!orbId) { toast('没有灵气球'); return; }
  const target = enemies.reduce((a, b) => a.hp / a.maxHp < b.hp / b.maxHp ? a : b);
  G.items[orbId]--;
  const baseRate = orbId === 'orb2' ? 0.4 : 0.25;
  const hpBonus = (1 - target.hp / target.maxHp) * 0.5;
  const rate = clamp(baseRate + hpBonus, 0.05, 0.95);
  if (Math.random() < rate) {
    const newPet = createPet(target.speciesId, target.level, target.isVariant);
    G.party.push(newPet);
    saveGame();
    logBattle('🔮 成功捕捉 ' + target.name + '！', 'log-capture');
    target.hp = 0;
    renderBattle();
    toast('捕捉成功');
  } else {
    logBattle('💨 ' + target.name + ' 挣脱了灵气球', 'log-action');
    toast('捕捉失败');
  }
  setTimeout(() => {
    if (G.battle.enemies.every(e => e.hp <= 0)) endBattle('win');
    else { G.battle.actions[G.battle.team[0].id] = { type:'item' }; promptNextPetAction(); }
  }, 800);
}

/* ============================================================
   启动
   ============================================================ */
function bindUI() {
  console.log('[生肖灵宝] bindUI 开始');
  const map = {
    btnNewGame: () => { localStorage.removeItem(SAVE_KEY); initNewGame(); initExplore(); },
    btnContinue: () => { if (!hasSave()) { toast('没有存档'); return; } if (!loadGame()) { toast('存档损坏'); return; } initExplore(); },
    btnCodex: () => openCodex(),
    codexClose: () => $('codexPanel').classList.add('hidden'),
    bagClose: () => $('bagPanel').classList.add('hidden'),
    teamClose: () => $('teamPanel').classList.add('hidden'),
    btnBag: () => openBag(),
    btnTeam: () => openTeam(),
    btnHome: () => { G.px = 0; G.py = 0; updateWorldDecor(); toast('回到青石村'); },
  };
  for (const id in map) {
    const el = $(id);
    if (el) el.onclick = map[id];
  }
  console.log('[生肖灵宝] bindUI 完成');
}

function boot() {
  console.log('[生肖灵宝] boot v' + GAME_VERSION);
  const required = ['menu','explore','battle','btnNewGame','btnContinue','btnCodex',
    'btnBag','btnTeam','btnHome','interactBtn','joyZone'];
  const missing = required.filter(id => !document.getElementById(id));
  if (missing.length > 0) {
    const msg = '缺少HTML元素：' + missing.join(', ');
    console.error(msg); alert(msg); return;
  }
  try { bindUI(); } catch (e) { console.error(e); alert('bindUI 出错：' + e.message); return; }
  try {
    setupJoystick();
    setupInteractBtn();
    setupBattleButtons();
    setupPetPanel();
  } catch (e) { console.error(e); }
  if (!hasSave()) {
    const bc = $('btnContinue'); if (bc) bc.disabled = true;
  }
  console.log('[生肖灵宝] 初始化完成 ✓ v' + GAME_VERSION);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}