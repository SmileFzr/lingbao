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
];
const ALL_SPECIES = [...ZODIAC, ...ORIGINALS];
function findSpecies(id) { return ALL_SPECIES.find(s => s.id === id); }
function isZodiac(id) { return ZODIAC.some(s => s.id === id); }

const ITEMS = {
  potion:  { id:'potion',  name:'小药水', icon:'🧪', type:'heal', value:40, price:30,  desc:'回复 40 HP' },
  potion2: { id:'potion2', name:'中药水', icon:'💊', type:'heal', value:100,price:80,  desc:'回复 100 HP' },
  orb:     { id:'orb',     name:'灵气球', icon:'🔮', type:'capture', price:50, desc:'捕捉用' },
  orb2:    { id:'orb2',    name:'高级灵气球', icon:'✨', type:'capture', price:150, desc:'高捕捉率' },
};

const SAVE_KEY = 'shengxiao_save_v5';
const G = { screen:'menu', gold:300, items:{ potion:5, orb:5, orb2:1 }, party:[], team:[], px:0, py:0, battle:null, codex:{}, saveKey:SAVE_KEY, autoBattle:false, autoExplore:false };
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