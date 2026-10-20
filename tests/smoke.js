/**
 * 冒烟测试：用 DOM 桩在 Node 里真实跑一遍游戏逻辑
 * 覆盖：大世界 5 区域 / 海洋小船 / 特殊地点 / 洞窟 BOSS / 小地图与大地图 / 存档
 *
 * 运行： node tests/smoke.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.dirname(__dirname);
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const order = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => m[1]);

let fails = 0;
let group = '';
function ok(cond, msg) {
  if (!cond) { fails++; console.log('  ✘ ' + msg); }
  else console.log('  ✔ ' + msg);
}
function section(t) { group = t; console.log('\n=== ' + t + ' ==='); }

/* ---------- DOM 桩 ---------- */
const elements = new Map();
const drawCalls = [];

function makeCtx() {
  const ctx = {};
  const methods = ['setTransform', 'clearRect', 'save', 'restore', 'beginPath', 'arc', 'clip',
    'fill', 'stroke', 'fillRect', 'strokeRect', 'moveTo', 'lineTo', 'closePath', 'fillText',
    'strokeText', 'rect', 'ellipse', 'translate', 'rotate', 'scale', 'setLineDash', 'drawImage',
    'quadraticCurveTo', 'bezierCurveTo'];
  for (const m of methods) ctx[m] = (...a) => drawCalls.push({ m, a });
  ctx.createLinearGradient = () => ({ addColorStop() {} });
  ctx.createRadialGradient = () => ({ addColorStop() {} });
  ctx.measureText = (t) => ({ width: String(t).length * 7 });
  return ctx;
}

function makeEl(id) {
  const el = {
    id, dataset: {}, children: [], style: {}, _html: '', _text: '', disabled: false,
    width: 0, height: 0, onclick: null,
    _cls: new Set(),
    classList: {
      add(...c) { c.forEach(x => el._cls.add(x)); },
      remove(...c) { c.forEach(x => el._cls.delete(x)); },
      contains(c) { return el._cls.has(c); },
      toggle(c, on) { if (on === undefined) { el._cls.has(c) ? el._cls.delete(c) : el._cls.add(c); } else if (on) el._cls.add(c); else el._cls.delete(c); },
    },
    appendChild(c) { el.children.push(c); return c; },
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); return c; },
    addEventListener() {}, removeEventListener() {},
    getContext: () => makeCtx(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 380, height: 380, right: 380, bottom: 380 }),
    closest: () => null,
    querySelectorAll: () => [],
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html; },
    set(v) { el._html = String(v); if (!v) el.children.length = 0; },
  });
  Object.defineProperty(el, 'textContent', {
    get() { return el._text; },
    set(v) { el._text = String(v); },
  });
  el.style = {};
  return el;
}

const document = {
  readyState: 'complete',
  getElementById(id) { if (!elements.has(id)) elements.set(id, makeEl(id)); return elements.get(id); },
  createElement(tag) { return makeEl('new-' + tag); },
  querySelectorAll() { return []; },
  querySelector() { return null; },
  addEventListener() {},
  body: makeEl('body'),
};
document.body = makeEl('body');

/* ---------- 定时器 / RAF 桩 ---------- */
let now = 0;
const timers = [];
const intervals = [];
const rafs = [];
function flushTimers(maxRounds = 400) {
  let guard = 0;
  while (timers.length && guard++ < maxRounds) {
    timers.sort((a, b) => a.at - b.at);
    const t = timers.shift();
    now = Math.max(now, t.at);
    try { t.fn(); } catch (e) { console.log('    [timer error] ' + e.message); }
  }
}
function frame(ms) {
  now += (ms || 16);
  const q = rafs.splice(0, rafs.length);
  for (const cb of q) { try { cb(now); } catch (e) { console.log('    [raf error] ' + e.message); } }
  flushTimers();
}

const store = new Map();
const sb = {
  console, Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Error, Map, Set, Promise,
  isFinite, isNaN, parseInt, parseFloat, Infinity, NaN, Float32Array,
  document,
  localStorage: {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  },
  innerWidth: 420, innerHeight: 820, devicePixelRatio: 1,
  requestAnimationFrame: cb => { rafs.push(cb); return rafs.length; },
  cancelAnimationFrame: () => {},
  setTimeout: (fn, ms) => { timers.push({ fn, at: now + (ms || 0) }); return timers.length; },
  clearTimeout: () => {},
  setInterval: (fn, ms) => { intervals.push({ fn, ms }); return intervals.length; },
  clearInterval: () => {},
  performance: { now: () => now },
  addEventListener() {}, removeEventListener() {},
  AudioContext: function () { return null; },   // 无音频环境
};
sb.window = sb; sb.globalThis = sb; sb.self = sb;

const ctx = vm.createContext(sb);
const code = order.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n');
try {
  vm.runInContext(code, ctx, { filename: 'bundle.js' });
} catch (e) {
  console.log('✘ 脚本加载失败: ' + e.message);
  process.exit(1);
}
const g = vm.runInContext(`({
  get G(){ return G; }, set G(v){ G = v; },
  REGIONS, REGION_ORDER, SITES, REGION_NPCS, REGION_BUILDINGS, BOSSES, WORLD_R, GRASSLAND_R,
  regionAt, createBoss, bossStats, createBossAlly, baseStatsOf,
  initNewGame, initExplore, saveGame, loadGame, hasSave,
  startBattle, endBattle, startBossBattle,
  refreshRegion, currentRegion, currentRegionId, openWorldMap, closeWorldMap, updateMapPanel,
  teleportToMarker, walkToMarker, discoverNearby, drawMap, updateExploreUI,
  enterSite, startCave, leaveCave, caveDepthPct, caveEndY, triggerCaveBoss, updateCave, CAVE_ENTRY_Y,
  get currentInteract(){ return currentInteract; },
  openCodex, boot, updateExplore, updateInteract,
  $: (id) => document.getElementById(id),
})`, ctx);

/* ---------- 开始测试 ---------- */
console.log('加载模块: ' + order.join(', '));

section('1. 新游戏与进入探索');
g.initNewGame();
g.initExplore();
ok(g.G.screen === 'explore', '进入探索界面');
ok(g.G.currentMap === 'town', '开局在青石村');
ok(!!g.$('player')._text, '玩家元素有内容: ' + g.$('player')._text);

section('2. 5 个区域判定');
const cases = [
  ['草原中心', 0, 0, 'grassland'],
  ['森林(北)', 0, -2200, 'forest'],
  ['沙漠(东)', 2200, 0, 'desert'],
  ['海洋(南)', 0, 2200, 'ocean'],
  ['废墟(西)', -2200, 0, 'ruins'],
  ['草原边缘', 0, 1200, 'grassland'],
  ['东北方向', 1000, -2000, 'forest'],
  ['东南方向', 2000, 1000, 'desert'],
];
for (const [name, x, y, want] of cases) {
  const got = g.regionAt(x, y);
  ok(got === want, name + ' → ' + got + (got === want ? '' : '（期望 ' + want + '）'));
}
ok(g.REGION_ORDER.length === 5, '区域总数为 5');
for (const id of g.REGION_ORDER) {
  const r = g.REGIONS[id];
  ok(!!r && !!r.name && !!r.bg && Array.isArray(r.decor) && r.decor.length > 3,
    '区域 ' + id + ' 有名称/背景/装饰: ' + (r ? r.name : '无'));
}

section('3. 区域切换：背景 / 音乐 / 记录');
g.G.currentMap = 'field'; g.G.px = 0; g.G.py = -2200;
g.refreshRegion(true);
ok(g.currentRegionId() === 'forest', '当前区域是森林');
ok(g.G.seenRegions.forest === true, '森林被记为已探索');
ok(g.$('worldBg')._cls.has('bg-forest'), '世界背景切到森林: ' + [...g.$('worldBg')._cls].join(','));
ok(g.$('locName')._text === g.REGIONS.forest.name, '顶部地点名: ' + g.$('locName')._text);

section('4. 海洋区域自动出现小船');
g.G.px = 0; g.G.py = 2200;
g.refreshRegion(true);
g.updateExploreUI();
ok(g.currentRegionId() === 'ocean', '当前区域是海洋');
ok(g.$('player')._cls.has('on-boat'), '玩家元素带上了 on-boat（显示 🛶）');
g.G.px = 0; g.G.py = 0;
g.refreshRegion(true); g.updateExploreUI();
ok(!g.$('player')._cls.has('on-boat'), '离开海洋后小船消失');

section('5. 特殊地点：发现 / 进入 / 深入');
const site = g.SITES.altar;
g.G.currentMap = 'field'; g.G.px = site.x; g.G.py = site.y;
g.discoverNearby();
ok(g.G.seenSites[site.id] === true, '走近后发现了「' + site.name + '」');
g.startCave(site);
ok(g.G.currentMap === 'cave', '进入了洞窟');
ok(g.G.cave && g.G.cave.siteId === site.id, '洞窟记录了来源地点');
ok(g.caveDepthPct() === 0, '刚进洞深度 0%');
// 往深处走
g.G.py = g.caveEndY() + 300;
ok(g.caveDepthPct() > 0.7, '往里走后深度 ' + Math.round(g.caveDepthPct() * 100) + '%');

section('6. 走到尽头触发区域 BOSS');
g.G.cave.awaiting = false;
g.triggerCaveBoss();
ok(g.G.cave.awaiting === true, '触发 BOSS（弹窗询问是否迎战）');
const dlg = g.$('dialog');
ok(!dlg._cls.has('hidden'), 'BOSS 对话框已弹出');

section('7. BOSS 战：生成 / 属性 / 胜利奖励');
const boss = g.createBoss('grassland', 14);
ok(boss && boss.isBoss === true, 'createBoss 生成了霸主: ' + (boss ? boss.name : '失败'));
ok(boss.maxHp > 150, '霸主血量 ' + boss.maxHp + '（明显高于普通怪）');
const before = { gold: g.G.gold, orb3: g.G.items.orb3 || 0 };
g.startBossBattle('grassland');
ok(g.G.screen === 'battle', '切换到战斗界面');
ok(g.G.battle.isBoss === true && g.G.battle.bossRegion === 'grassland', '战斗标记为 BOSS 战');
ok(g.G.battle.enemies.length === 1, 'BOSS 战只有一个敌人');
// 直接把 BOSS 打死并结算
g.G.battle.enemies[0].hp = 0;
g.endBattle('win');
flushTimers();
ok(g.G.bosses.grassland === true, '讨伐记录写入 G.bosses');
ok((g.G.items.orb3 || 0) > before.orb3, '获得传说灵气球 ' + before.orb3 + ' → ' + (g.G.items.orb3 || 0));
ok(g.G.gold > before.gold, '金币增加 ' + before.gold + ' → ' + g.G.gold);

section('8. 大地图：标记 / 走路 / 传送');
g.G.currentMap = 'field'; g.G.px = 0; g.G.py = 0;
g.openWorldMap();
ok(!g.$('mapPanel')._cls.has('hidden'), '地图面板打开');
ok(drawCalls.length > 20, '地图有实际绘制指令 (' + drawCalls.length + ')');
g.G.marker = { x: 2200, y: 0 };
g.updateMapPanel();
g.drawMap(g.$('worldMapCanvas'), { size: 380 });
ok(g.$('mapInfo')._html.indexOf('流沙荒漠') >= 0, '标记后显示区域名: ' + g.$('mapInfo')._html.replace(/<[^>]*>/g, ' ').trim());
g.walkToMarker();
ok(g.G.walkTarget && g.G.walkTarget.x === 2200, '"走过去"设置了目标');
g.G.marker = { x: 0, y: 2200 };
g.teleportToMarker();
ok(g.G.px === 0 && g.G.py === 2200, '"传送过去"改好了坐标 (' + g.G.px + ',' + g.G.py + ')');
ok(g.currentRegionId() === 'ocean', '传送后区域为海洋');
ok(g.G.seenRegions.ocean === true, '传送到的区域记为已探索');

section('9. 小地图绘制不报错');
let miniErr = null;
try { g.drawMap(g.$('miniMapCanvas'), { size: 104 }); } catch (e) { miniErr = e.message; }
ok(!miniErr, '小地图绘制正常' + (miniErr ? ': ' + miniErr : ''));

section('10. 自动寻路会朝目标移动');
g.G.currentMap = 'field'; g.G.px = 0; g.G.py = 0;
g.G.walkTarget = { x: 600, y: 0 };
const x0 = g.G.px;
g.updateExplore(0.05);
ok(g.G.px > x0, '玩家朝目标移动 ' + x0 + ' → ' + Math.round(g.G.px));

section('11. 存档：新字段可保存与恢复');
g.G.bosses.ruins = true;
g.G.seenRegions.desert = true;
g.G.seenSites.pyramid = true;
g.saveGame();
g.G.bosses = {}; g.G.seenRegions = {}; g.G.seenSites = {};
ok(g.loadGame(), 'loadGame 返回成功');
ok(g.G.bosses.ruins === true, 'BOSS 进度恢复');
ok(g.G.seenRegions.desert === true, '区域探索进度恢复');
ok(g.G.seenSites.pyramid === true, '地点发现进度恢复');

section('12. 图鉴包含 5 位霸主');
g.openCodex();
const grid = g.$('codexGrid')._html;
const bossCards = (grid.match(/bossCard/g) || []).length;
ok(bossCards === 5, '图鉴里有 ' + bossCards + ' 张霸主卡');
ok(grid.indexOf(g.BOSSES.grassland.name) >= 0, '已讨伐的霸主显示名字：' + g.BOSSES.grassland.name);
ok(grid.indexOf('已讨伐') >= 0, '显示「已讨伐」标记');

section('13. 战斗平衡：霸主不能"打不动"');
// 照抄游戏里的伤害公式，检查玩家同级宠物能打出有效伤害
function rawDmg(power, atk, def, lv) {
  return Math.max(1, Math.round((lv * 2 / 5 + 2) * power * atk / Math.max(1, def) / 50 + 2));
}
for (const rid of g.REGION_ORDER) {
  const lv = 12;
  const boss = g.createBoss(rid, lv + 1);
  const mult = 1 + (lv - 1) * 0.08;
  const atk = Math.round(13 * mult);      // 以虎灵为准
  const d = rawDmg(35, atk, boss.stats.def, lv);
  const turns = Math.ceil(boss.maxHp / Math.max(1, d * 5));
  ok(d >= 4, rid + ' 霸主：单次伤害 ' + d + '（≥4，否则几乎打不动）');
  ok(turns <= 25, rid + ' 霸主：满编 5 只约 ' + turns + ' 回合可击破（≤25）');
  ok(boss.maxHp < 700, rid + ' 霸主血量 ' + boss.maxHp + '（<700）');
}

section('14. 地图面板按钮');
g.G.marker = { x: 100, y: 100 };
g.openWorldMap();
g.$('mapClose').onclick && g.$('mapClose').onclick();
ok(g.$('mapPanel')._cls.has('hidden'), '「关闭」能关掉地图面板');
g.openWorldMap();
g.$('mapClear').onclick && g.$('mapClear').onclick();
ok(g.G.marker === null, '「清除标记」清掉了标记');

section('15. 洞窟里可以原路返回');
const site2 = g.SITES.stonecave;
g.G.currentMap = 'field'; g.G.px = site2.x; g.G.py = site2.y;
g.startCave(site2);
g.G.py = g.CAVE_ENTRY_Y;          // 站在入口
g.updateCave(0.016);
ok(g.currentInteract && g.currentInteract.type === 'caveExit', '入口处出现「原路返回」交互');
g.leaveCave();
ok(g.G.currentMap === 'field', '原路返回后回到野外');
ok(Math.abs(g.G.px - site2.x) < 1 && Math.abs(g.G.py - site2.y) < 1, '回到了进洞前的位置');

section('16. 连续帧循环不报错');
let loopErr = null;
try {
  g.G.currentMap = 'field';
  for (const rid of g.REGION_ORDER) {
    const c = g.REGIONS[rid].center;
    g.G.px = c.x * 0.6; g.G.py = c.y * 0.6;
    g.refreshRegion(true);
    for (let i = 0; i < 40; i++) g.updateExplore(0.016);
  }
  // 洞窟里也跑几十帧
  const s3 = g.SITES.pyramid;
  g.startCave(s3);
  for (let i = 0; i < 40; i++) g.updateCave(0.016);
  g.leaveCave();
  // 回到村子
  g.G.currentMap = 'town'; g.G.px = 0; g.G.py = 0;
  for (let i = 0; i < 40; i++) g.updateExplore(0.016);
} catch (e) {
  loopErr = e.message + '\n' + (e.stack || '').split('\n')[1];
}
ok(!loopErr, '5 区域 + 洞窟 + 村子 共 280 帧无异常' + (loopErr ? '：' + loopErr : ''));

section('17. 每个区域都有建筑与 NPC');
for (const rid of g.REGION_ORDER) {
  const bs = g.REGION_BUILDINGS[rid] || [];
  const npc = g.REGION_NPCS[Object.keys(g.REGION_NPCS).find(k => g.REGION_NPCS[k].region === rid)];
  ok(bs.length >= 1, rid + ' 有建筑：' + (bs[0] ? bs[0].name : '无'));
  ok(!!npc, rid + ' 有 NPC：' + (npc ? npc.name : '无'));
}
// 走近沙漠驿站 → 应能交互
g.G.currentMap = 'field';
const desertB = g.REGION_BUILDINGS.desert[0];
g.G.px = desertB.x; g.G.py = desertB.y;
g.refreshRegion(true);
g.updateInteract();
ok(g.currentInteract && g.currentInteract.type === 'regionBuilding',
  '走到「' + desertB.name + '」旁出现交互按钮');

section('18. 收服霸主后升级不会崩');
{
  const ally = g.createBossAlly ? g.createBossAlly('ruins', 10) : null;
  ok(!!ally && ally.isBoss === true, 'createBossAlly 生成霸主灵兽: ' + (ally ? ally.name : '失败'));
  let err = null;
  try {
    g.G.party.push(ally);
    g.G.team = [ally.id];
    g.G.currentMap = 'field';
    g.startBattle();
    g.G.battle.enemies.forEach(e => { e.hp = 0; });
    g.G.battle.team.forEach(p => { p.exp = p.expNext; });   // 保证升级
    const beforeLv = ally.level;
    g.endBattle('win');
    flushTimers();
    ok(ally.level > beforeLv, '霸主灵兽升级成功 ' + beforeLv + ' → ' + ally.level);
    ok(ally.stats.atk > 0 && isFinite(ally.stats.atk), '升级后属性有效 (atk=' + ally.stats.atk + ')');
  } catch (e) { err = e.message; }
  ok(!err, '升级过程无异常' + (err ? '：' + err : ''));
  // 清理
  g.G.party = g.G.party.filter(p => p !== ally);
  g.G.team = [];
}

console.log('\n' + (fails === 0 ? '结论：全部通过 ✔' : '结论：' + fails + ' 项失败 ✘'));
process.exitCode = fails ? 1 : 0;
