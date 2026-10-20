"use strict";
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const pick = a => a[Math.floor(Math.random() * a.length)];
const $ = id => document.getElementById(id);

/* 五行 */
const ELEMENTS = {
  metal: { name:'金', color:'#ffd76a', cls:'ele-metal', counters:'wood', emoji: '⚔️' },
  wood:  { name:'木', color:'#6ee7a0', cls:'ele-wood',  counters:'earth', emoji: '🌿' },
  earth: { name:'土', color:'#c8a06e', cls:'ele-earth', counters:'water', emoji: '🪨' },
  water: { name:'水', color:'#6eb8ff', cls:'ele-water', counters:'fire', emoji: '💧' },
  fire:  { name:'火', color:'#ff9070', cls:'ele-fire',  counters:'metal', emoji: '🔥' },
};
function elementMult(atk, def) {
  if (!ELEMENTS[atk] || !ELEMENTS[def]) return 1;
  if (ELEMENTS[atk].counters === def) return 1.5;
  if (ELEMENTS[def].counters === atk) return 0.75;
  return 1.0;
}

/* 技能 */
const SKILLS = {
  tackle:   { id:'tackle',   name:'撞击',   icon:'💢', element:'earth', power:35, type:'physical', mp:0,  desc:'土系物理' },
  bite:     { id:'bite',     name:'撕咬',   icon:'🦷', element:'metal', power:45, type:'physical', mp:4,  desc:'金系物理' },
  slash:    { id:'slash',    name:'爪击',   icon:'⚔️', element:'metal', power:50, type:'physical', mp:5,  desc:'金系物理' },
  charge:   { id:'charge',   name:'冲锋',   icon:'🐎', element:'fire',  power:55, type:'physical', mp:6,  desc:'火系物理' },
  fireball: { id:'fireball', name:'火球',   icon:'🔥', element:'fire',  power:50, type:'special',  mp:6,  desc:'火系法术' },
  watergun: { id:'watergun', name:'水枪',   icon:'💧', element:'water', power:50, type:'special',  mp:6,  desc:'水系法术' },
  vinewhip: { id:'vinewhip', name:'藤鞭',   icon:'🌿', element:'wood',  power:50, type:'special',  mp:6,  desc:'木系法术' },
  rockfall: { id:'rockfall', name:'落石',   icon:'🪨', element:'earth', power:50, type:'special',  mp:6,  desc:'土系法术' },
  thunder:  { id:'thunder',  name:'电击',   icon:'⚡', element:'metal', power:55, type:'special',  mp:7,  desc:'金系法术' },
  icebeam:  { id:'icebeam',  name:'冰冻光束',icon:'❄️', element:'water', power:55, type:'special',  mp:7,  desc:'水系法术' },
  gust:     { id:'gust',     name:'疾风',   icon:'🌪️', element:'wood',  power:45, type:'special',  mp:5,  desc:'木系法术' },
  shadow:   { id:'shadow',   name:'暗影球', icon:'🌑', element:'earth', power:55, type:'special',  mp:7,  desc:'土系法术' },
  heal:     { id:'heal',     name:'治愈',   icon:'💚', element:'wood',  power:0,  type:'heal',      mp:6,  desc:'回复 40% HP', healPct:0.4 },
  harden:   { id:'harden',   name:'硬化',   icon:'🛡️', element:'earth', power:0,  type:'buff',      mp:5,  desc:'提升防御', buffStat:'def', buffPct:0.3, buffTurns:3 },
  howl:     { id:'howl',     name:'咆哮',   icon:'📢', element:'metal', power:0,  type:'debuff',    mp:5,  desc:'降敌攻击', debuffStat:'atk', debuffPct:0.25, debuffTurns:3 },
  storm:    { id:'storm',    name:'雷神怒', icon:'🌩️', element:'metal', power:75, type:'special',  mp:9,  desc:'变异技能' },
  blaze:    { id:'blaze',    name:'烈焰冲击',icon:'🔥', element:'fire',  power:75, type:'special',  mp:9,  desc:'变异技能' },
  tsunami:  { id:'tsunami',  name:'海啸',   icon:'🌊', element:'water', power:75, type:'special',  mp:9,  desc:'变异技能' },
  forest:   { id:'forest',   name:'森罗万象',icon:'🌳', element:'wood',  power:75, type:'special',  mp:9,  desc:'变异技能' },
  quake:    { id:'quake',    name:'地裂',   icon:'🏔️', element:'earth', power:75, type:'special',  mp:9,  desc:'变异技能' },
};

/* 图鉴 */
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
const ORIGINALS = [
  { id:'flame',  name:'火灵', emoji:'🔥', element:'fire',  baseStats:{ hp:42, atk:6, def:6, matk:14,mdef:8, spd:11 }, skills:['fireball','tackle'] },
  { id:'aqua',   name:'水灵', emoji:'💧', element:'water', baseStats:{ hp:45, atk:6, def:7, matk:13,mdef:9, spd:10 }, skills:['watergun','harden'] },
  { id:'leaf',   name:'草灵', emoji:'🌿', element:'wood',  baseStats:{ hp:48, atk:7, def:8, matk:11,mdef:9, spd:9  }, skills:['vinewhip','heal'] },
  { id:'stone',  name:'岩灵', emoji:'🪨', element:'earth', baseStats:{ hp:55, atk:10,def:12,matk:6, mdef:9, spd:6  }, skills:['rockfall','harden'] },
  { id:'bolt',   name:'雷灵', emoji:'⚡', element:'metal', baseStats:{ hp:38, atk:8, def:6, matk:13,mdef:8, spd:15 }, skills:['thunder','tackle'] },
  { id:'wind',   name:'风灵', emoji:'🌪️', element:'wood',  baseStats:{ hp:36, atk:7, def:5, matk:11,mdef:8, spd:17 }, skills:['gust','tackle'] },
  { id:'frost',  name:'冰灵', emoji:'❄️', element:'water', baseStats:{ hp:44, atk:6, def:7, matk:13,mdef:10,spd:10 }, skills:['icebeam','harden'] },
  { id:'shadow', name:'暗灵', emoji:'🌑', element:'earth', baseStats:{ hp:41, atk:9, def:7, matk:12,mdef:8, spd:12 }, skills:['shadow','howl'] },
  /* —— 各区域特色灵兽 —— */
  { id:'octo',     name:'章鱼灵', emoji:'🐙', element:'water', baseStats:{ hp:46, atk:8, def:8, matk:13,mdef:10,spd:11 }, skills:['watergun','harden'] },
  { id:'turtle',   name:'龟灵',   emoji:'🐢', element:'water', baseStats:{ hp:62, atk:7, def:14,matk:7, mdef:11,spd:5  }, skills:['harden','watergun'] },
  { id:'scorpion', name:'蝎灵',   emoji:'🦂', element:'earth', baseStats:{ hp:43, atk:12,def:9, matk:8, mdef:7, spd:13 }, skills:['rockfall','howl'] },
  { id:'skeleton', name:'骸灵',   emoji:'💀', element:'earth', baseStats:{ hp:44, atk:11,def:8, matk:11,mdef:7, spd:12 }, skills:['shadow','bite'] },
  { id:'deer',     name:'鹿灵',   emoji:'🦌', element:'wood',  baseStats:{ hp:47, atk:9, def:8, matk:10,mdef:9, spd:15 }, skills:['gust','tackle'] },
];
const ALL_SPECIES = [...ZODIAC, ...ORIGINALS];
function findSpecies(id) { return ALL_SPECIES.find(s => s.id === id); }
function isZodiac(id) { return ZODIAC.some(s => s.id === id); }

const ITEMS = {
  potion:  { id:'potion',  name:'小药水', icon:'🧪', type:'heal', value:40, price:30,  desc:'回复 40 HP' },
  potion2: { id:'potion2', name:'中药水', icon:'💊', type:'heal', value:100,price:80,  desc:'回复 100 HP' },
  orb:     { id:'orb',     name:'灵气球', icon:'🔮', type:'capture', price:50, desc:'捕捉用' },
  orb2:    { id:'orb2',    name:'高级灵气球', icon:'✨', type:'capture', price:150, desc:'高捕捉率' },
  orb3:    { id:'orb3',    name:'传说灵气球', icon:'🌟', type:'capture', price:600, desc:'最高捕捉率' },
};

const SAVE_KEY = 'shengxiao_save_v5';
const G = { screen:'menu', gold:300, items:{ potion:5, orb:5, orb2:1 }, party:[], team:[], px:0, py:0, battle:null, codex:{}, saveKey:SAVE_KEY, autoBattle:false, autoExplore:false,
  /* ---- 大世界状态 ---- */
  currentMap:'town',      // town / field / cave
  region:'grassland',     // 当前所在区域
  seenRegions:{},         // 已走过的区域
  seenSites:{},           // 已走近的特殊地点
  bosses:{},              // 已击败的区域 BOSS
  cave:null,              // 洞窟状态 { siteId, awaiting }
  caveReturn:null,        // 进洞前的位置
  walkTarget:null,        // 大地图"走过去"的目标
  marker:null,            // 大地图上标记的位置
};
let petSeq = 1;

function createPet(speciesId, level, forceVariant) {
  const sp = findSpecies(speciesId); if (!sp) return null;
  const lv = level || 1, isV = !!forceVariant;
  const statMult = 1 + (lv - 1) * 0.08, variantMult = isV ? 1.2 : 1;
  const stats = {
    hp: Math.round(sp.baseStats.hp * statMult * variantMult),
    atk: Math.round(sp.baseStats.atk * statMult * variantMult),
    def: Math.round(sp.baseStats.def * statMult * variantMult),
    matk: Math.round(sp.baseStats.matk * statMult * variantMult),
    mdef: Math.round(sp.baseStats.mdef * statMult * variantMult),
    spd: Math.round(sp.baseStats.spd * statMult * variantMult),
  };
  const skills = sp.skills.slice();
  if (isV) skills.push(pick(['storm','blaze','tsunami','forest','quake']));
  const pet = { id:'p'+(petSeq++), speciesId, name:sp.name+(isV?'·变异':''), emoji:sp.emoji, element:sp.element,
    level:lv, exp:0, expNext:expForLevel(lv), isVariant:isV, maxHp:stats.hp, hp:stats.hp, stats, skills, buffs:[] };
  G.codex[speciesId] = true; return pet;
}
function expForLevel(lv) { return 30 + lv * 15; }

/* ============================================================
   大世界：5 个区域
   - 中央是【青草原】(半径 GRASSLAND_R)，青石村坐落在其中
   - 超出草原后按方位分 4 个区域：北森林 / 东沙漠 / 南海洋 / 西废墟
   ============================================================ */
const WORLD_R = 3600;        // 野外可走的最大半径
const GRASSLAND_R = 1450;    // 中央草原半径

const REGIONS = {
  grassland: {
    id:'grassland', name:'青草原', emoji:'🌾', color:'#7ec86a', bg:'bg-grass',
    center:{ x:0, y:0 }, danger:'安全',
    desc:'风吹草低，青石村就坐落在这片草原的中心。',
    decor:['🌾','🌿','🌻','🌼','🍄','🪵','🐑','🦋','🌳','🌷'], density:70, size:[44,86],
    music:'field', npc:'herder', site:'altar',
  },
  forest: {
    id:'forest', name:'迷雾森林', emoji:'🌲', color:'#4e9a5a', bg:'bg-forest',
    center:{ x:0, y:-2200 }, danger:'危险',
    desc:'树冠遮天，深处有会走路的树，和不该醒来的东西。',
    decor:['🌲','🌳','🎋','🍄','🌿','🪵','🦌','🐺','🕸️','🌸'], density:110, size:[56,112],
    music:'forest', npc:'herbalist', site:'treehole',
  },
  desert: {
    id:'desert', name:'流沙荒漠', emoji:'🏜️', color:'#d9b26a', bg:'bg-desert',
    center:{ x:2200, y:0 }, danger:'危险',
    desc:'白日炙烤，夜里能听见沙层底下有东西在挪动。',
    decor:['🌵','🪨','🏜️','🦂','🐍','🦴','⛱️','🔥'], density:60, size:[46,98],
    music:'desert', npc:'trader', site:'pyramid',
  },
  ocean: {
    id:'ocean', name:'碧潮之海', emoji:'🌊', color:'#5aa9d6', bg:'bg-ocean',
    center:{ x:0, y:2200 }, danger:'危险', water:true,
    desc:'脚一踩就会沉下去 —— 好在你随手能叫来一条小船。',
    decor:['🌊','🐚','🐠','🪸','🐙','⛵','🏝️','🦀'], density:80, size:[50,102],
    music:'ocean', npc:'fisher', site:'sunken',
  },
  ruins: {
    id:'ruins', name:'灰烬废墟', emoji:'🏚️', color:'#8b7d6b', bg:'bg-ruins',
    center:{ x:-2200, y:0 }, danger:'极危险',
    desc:'曾经的城市，如今只剩断墙、碎石与说不清的低语。',
    decor:['🪨','🧱','🏚️','💀','🕯️','⚰️','🕸️','🗿','⛓️'], density:85, size:[50,106],
    music:'ruins', npc:'scavenger', site:'stonecave',
  },
};
const REGION_ORDER = ['grassland','forest','desert','ocean','ruins'];

/* 根据坐标判断属于哪个区域 */
function regionAt(x, y) {
  if (Math.hypot(x, y) < GRASSLAND_R) return 'grassland';
  const a = Math.atan2(y, x);           // 屏幕坐标 y 向下为正，所以北 = -90°
  if (a >= -Math.PI * 0.75 && a < -Math.PI * 0.25) return 'forest';
  if (a >= -Math.PI * 0.25 && a < Math.PI * 0.25)  return 'desert';
  if (a >= Math.PI * 0.25 && a < Math.PI * 0.75)   return 'ocean';
  return 'ruins';
}
function regionOf(x, y) { return REGIONS[regionAt(x, y)]; }

/* ============================================================
   特殊地点（走近可进入 → 深入 → 区域 BOSS）
   ============================================================ */
const SITES = {
  altar: {
    id:'altar', region:'grassland', name:'荒原祭坛', emoji:'🗿',
    x:760, y:-820, boss:'grassland', depth:1500,
    tip:'石阶下有风往上吹，像是通向很深的地方。',
  },
  treehole: {
    id:'treehole', region:'forest', name:'古树洞', emoji:'🌳',
    x:0, y:-2430, boss:'forest', depth:1600,
    tip:'树根盘成的门，里面比外面还要安静。',
  },
  pyramid: {
    id:'pyramid', region:'desert', name:'流沙金字塔', emoji:'🔺',
    x:2430, y:0, boss:'desert', depth:1700,
    tip:'半埋在沙里的入口，门缝里透出温热的风。',
  },
  sunken: {
    id:'sunken', region:'ocean', name:'沉船海窟', emoji:'🚢',
    x:0, y:2430, boss:'ocean', depth:1600,
    tip:'沉船的破口正好够一个人钻进去。',
  },
  stonecave: {
    id:'stonecave', region:'ruins', name:'石头山洞', emoji:'🕳️',
    x:-2430, y:0, boss:'ruins', depth:1700,
    tip:'石头堆成的一个圆洞，往里看只有黑。',
  },
};
function siteOfRegion(regionId) {
  for (const k in SITES) if (SITES[k].region === regionId) return SITES[k];
  return null;
}

/* ============================================================
   区域 NPC
   ============================================================ */
const REGION_NPCS = {
  herder: {
    id:'herder', region:'grassland', name:'牧羊人 阿草', emoji:'🧑‍🌾',
    x:320, y:-760,
    greet:'羊群今天很安静，说明地下没什么动静。你是要去祭坛吗？',
  },
  herbalist: {
    id:'herbalist', region:'forest', name:'采药人 阿蕨', emoji:'🧝',
    x:-300, y:-2320,
    greet:'别踩那些会发光的蘑菇。森林深处的古树洞，我劝你带够药。',
  },
  trader: {
    id:'trader', region:'desert', name:'行商 沙穆', emoji:'🧕',
    x:2320, y:-300,
    greet:'水、药、灵气球，我一个都不缺。只要你付得起金币。',
  },
  fisher: {
    id:'fisher', region:'ocean', name:'渔夫 老潮', emoji:'🎣',
    x:300, y:2320,
    greet:'这片海很怪。我的网总捞上一些不是鱼的东西。',
  },
  scavenger: {
    id:'scavenger', region:'ruins', name:'拾荒者 灰烬', emoji:'🧟',
    x:-2320, y:300,
    greet:'别碰那些会响的骨头。石洞里有大家伙，我听过它呼吸。',
  },
};
function npcOfRegion(regionId) {
  for (const k in REGION_NPCS) if (REGION_NPCS[k].region === regionId) return REGION_NPCS[k];
  return null;
}

/* ============================================================
   区域建筑（每个区域一座，风格不同）
   ============================================================ */
const REGION_BUILDINGS = {
  grassland: [
    { id:'windmill', region:'grassland', name:'风车小屋', icon:'🌬️', x:-430, y:300, kind:'heal',
      line:'风车转一圈，灵兽就恢复一点力气。' },
  ],
  forest: [
    { id:'treehouse', region:'forest', name:'树屋营地', icon:'🛖', x:280, y:-2380, kind:'heal',
      line:'树屋的主人很欢迎旅人，草药随便用。' },
  ],
  desert: [
    { id:'caravan', region:'desert', name:'沙商驿站', icon:'🏕️', x:2330, y:230, kind:'shop',
      line:'驿站里什么都有，就是贵。' },
  ],
  ocean: [
    { id:'lighthouse', region:'ocean', name:'海崖灯塔', icon:'🗼', x:-380, y:2330, kind:'heal',
      line:'灯塔看守人让你在火边烘干衣服。' },
  ],
  ruins: [
    { id:'tower', region:'ruins', name:'残破塔楼', icon:'🏯', x:-2380, y:-270, kind:'shop',
      line:'塔楼里居然还有人在做买卖。' },
  ],
};
function buildingsOfRegion(regionId) { return REGION_BUILDINGS[regionId] || []; }

/* ============================================================
   区域 BOSS
   ============================================================ */
const BOSSES = {
  grassland: {
    id:'grassland', name:'蛮角王', emoji:'🐃', element:'earth', title:'草原霸主',
    baseStats:{ hp:210, atk:20, def:15, matk:14, mdef:12, spd:12 },
    skills:['quake','tackle','harden'], gold:320, orb:1,
    intro:'你踩坏了我的草场。',
  },
  forest: {
    id:'forest', name:'千年树妖', emoji:'🌳', element:'wood', title:'森之守护',
    baseStats:{ hp:230, atk:18, def:17, matk:20, mdef:15, spd:11 },
    skills:['forest','vinewhip','heal'], gold:380, orb:1,
    intro:'根须之下，皆是归处。',
  },
  desert: {
    id:'desert', name:'法老王', emoji:'🏺', element:'metal', title:'沙海暴君',
    baseStats:{ hp:220, atk:21, def:14, matk:22, mdef:13, spd:17 },
    skills:['storm','thunder','howl'], gold:420, orb:1,
    intro:'凡人，你惊扰了沙下的王座。',
  },
  ocean: {
    id:'ocean', name:'利维坦', emoji:'🐋', element:'water', title:'深海霸主',
    baseStats:{ hp:250, atk:19, def:16, matk:23, mdef:16, spd:14 },
    skills:['tsunami','icebeam','harden'], gold:460, orb:1,
    intro:'潮水会记住你的名字。',
  },
  ruins: {
    id:'ruins', name:'骸骨王', emoji:'💀', element:'earth', title:'废墟之主',
    baseStats:{ hp:260, atk:23, def:17, matk:18, mdef:14, spd:15 },
    skills:['quake','shadow','howl'], gold:500, orb:2,
    intro:'这座城死了，但我还坐着。',
  },
};

/* BOSS 属性计算（等级按玩家队伍给） */
function bossStats(regionId, level) {
  const b = BOSSES[regionId]; if (!b) return null;
  const lv = Math.max(10, level || 14);
  const m = 1 + (lv - 1) * 0.085;
  return {
    level: lv,
    hp: Math.round(b.baseStats.hp * m), atk: Math.round(b.baseStats.atk * m),
    def: Math.round(b.baseStats.def * m), matk: Math.round(b.baseStats.matk * m),
    mdef: Math.round(b.baseStats.mdef * m), spd: Math.round(b.baseStats.spd * m),
  };
}

/* 造一只敌方 BOSS */
function createBoss(regionId, level) {
  const b = BOSSES[regionId]; if (!b) return null;
  const st = bossStats(regionId, level); if (!st) return null;
  return {
    id:'boss_' + regionId, speciesId:'boss_' + regionId, name:b.name, title:b.title,
    emoji:b.emoji, element:b.element, level:st.level, exp:0, expNext:9999,
    isVariant:false, isBoss:true, isEnemy:true, bossRegion:regionId,
    maxHp:st.hp, hp:st.hp,
    stats:{ hp:st.hp, atk:st.atk, def:st.def, matk:st.matk, mdef:st.mdef, spd:st.spd },
    skills:b.skills.slice(), buffs:[],
  };
}

/* 把 BOSS 收服成自己的灵兽 */
function createBossAlly(regionId, level) {  const b = BOSSES[regionId]; if (!b) return null;
  const st = bossStats(regionId, level); if (!st) return null;
  return {
    id:'p'+(petSeq++), speciesId:'boss_' + regionId, name:b.name, emoji:b.emoji,
    element:b.element, level:st.level, exp:0, expNext:expForLevel(st.level),
    isVariant:false, isBoss:true, isAlly:true,
    maxHp:st.hp, hp:st.hp,
    stats:{ hp:st.hp, atk:st.atk, def:st.def, matk:st.matk, mdef:st.mdef, spd:st.spd },
    skills:b.skills.slice(), buffs:[],
  };
}

/* 取某个品种的基础属性（普通灵兽 / 被收服的 BOSS 都支持） */
function baseStatsOf(speciesId) {
  const sp = findSpecies(speciesId);
  if (sp) return sp.baseStats;
  if (typeof speciesId === 'string' && speciesId.indexOf('boss_') === 0) {
    const b = BOSSES[speciesId.slice(5)];
    if (b) return b.baseStats;
  }
  return null;
}