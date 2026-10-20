"use strict";

/* 面板逻辑 */
function openBag() {
  const bg = $('bagGold'); if (bg) bg.textContent = G.gold;
  const list = $('bagList'); if (!list) return; list.innerHTML = '';
  const ids = Object.keys(G.items); if (ids.length === 0) list.innerHTML = '<div class="empty">背包是空的</div>';
  for (const id of ids) {
    const it = ITEMS[id]; if (!it || G.items[id] <= 0) continue;
    list.innerHTML += '<div class="itemRow"><span class="itemName">'+it.icon+' '+it.name+'</span><span class="itemQty">×'+G.items[id]+'</span></div>';
  }
  $('bagPanel').classList.remove('hidden');
}
function openTeam() {
  const list = $('teamList'); if (!list) return; list.innerHTML = '';
  if (G.party.length === 0) list.innerHTML = '<div class="empty">还没有灵兽</div>';
  for (const p of G.party) {
    const active = G.team.includes(p.id), el = ELEMENTS[p.element];
    list.innerHTML += `<div class="itemRow petRow ${active?'active':''}" onclick="window.viewPet('${p.id}')" style="cursor:pointer">
      <span class="itemName">${p.emoji} ${p.name} <span class="${el?el.cls:''}" style="font-size:10px;padding:1px 5px;border-radius:6px">${el?el.name:''}</span>
      ${p.isVariant?' <span style="color:#f0abfc;font-size:10px">变异</span>':''}</span>
      <span class="itemQty">Lv.${p.level} · HP ${p.hp}/${p.maxHp} ${active?' · 出战':''}</span></div>`;
  }
  $('teamPanel').classList.remove('hidden');
}

let currentPetDetail = null;
window.viewPet = function(id) {
  const p = G.party.find(x => x.id === id); if (!p) return;
  currentPetDetail = p; const el = ELEMENTS[p.element];
  $('petName').textContent = p.emoji + ' ' + p.name;
  $('petSub').innerHTML = 'Lv.' + p.level + ' · <span class="' + (el ? el.cls : '') + '" style="padding:1px 6px;border-radius:6px">' + (el ? el.name : '') + '</span> 属性';
  $('petInfo').innerHTML = '<div class="row"><span class="k">HP</span><span class="v">' + p.hp + ' / ' + p.maxHp + '</span></div>' +
    '<div class="row"><span class="k">攻击 / 防御</span><span class="v">' + p.stats.atk + ' / ' + p.stats.def + '</span></div>' +
    '<div class="row"><span class="k">魔攻 / 魔防</span><span class="v">' + p.stats.matk + ' / ' + p.stats.mdef + '</span></div>' +
    '<div class="row"><span class="k">速度</span><span class="v">' + p.stats.spd + '</span></div>';
  const sl = $('petSkills'); sl.innerHTML = '';
  for (const sid of p.skills) {
    const sk = SKILLS[sid]; if (!sk) continue; const se = ELEMENTS[sk.element];
    sl.innerHTML += `<div class="skillRow"><div class="ic">${sk.icon}</div><div class="info">
      <div class="nm"><span>${sk.name}</span><span class="ele ${se?se.cls:''}">${se?se.name:''}</span></div>
      <div class="desc">${sk.desc}${sk.power>0?' · 威力 '+sk.power:''}</div></div></div>`;
  }
  const btn = $('petToggle');
  if (G.team.includes(p.id)) { btn.textContent = '下 阵'; btn.className = 'btn danger'; }
  else { btn.textContent = '上 阵'; btn.className = 'btn warn'; }
  $('teamPanel').classList.add('hidden');
  $('petPanel').classList.remove('hidden');
};

function openCodex() {
  const total = ALL_SPECIES.length + Object.keys(BOSSES).length;
  const seen = Object.keys(G.codex).length;
  $('codexSub').textContent = '已见 ' + seen + ' / ' + total;
  const grid = $('codexGrid'); if (!grid) return; grid.innerHTML = '';
  for (const sp of ALL_SPECIES) {
    const s = G.codex[sp.id];
    grid.innerHTML += `<div class="codexCard ${s?'':'locked'}">
      <div class="ci">${s?sp.emoji:'❓'}</div><div class="cn">${s?sp.name:'???'}</div></div>`;
  }
  /* 区域霸主 */
  for (const k in BOSSES) {
    const b = BOSSES[k];
    const sid = 'boss_' + k;
    const s = G.codex[sid];
    grid.innerHTML += `<div class="codexCard bossCard ${s?'':'locked'}">
      <div class="ci">${s?b.emoji:'❓'}</div><div class="cn">${s?b.name:'???'}</div>
      <div class="ctag">${G.bosses[k]?'已讨伐':'霸主'}</div></div>`;
  }
  $('codexPanel').classList.remove('hidden');
}

function showDialog(name, text, options, avatar) {
  const n = $('dlgName'); if (n) n.textContent = name;
  const t = $('dlgText'); if (t) t.textContent = text;
  const av = $('dlgAvatar'); if (av) { if (avatar) { av.textContent = avatar; av.style.display = 'flex'; } else av.style.display = 'none'; }
  const opt = $('dlgOptions'); if (!opt) return; opt.innerHTML = '';
  for (const o of options) {
    const b = document.createElement('button'); b.className = 'dlgOpt'; b.textContent = o.text; b.onclick = o.cb; opt.appendChild(b);
  }
  $('dialog').classList.remove('hidden');
}
function hideDialog() { const d = $('dialog'); if (d) d.classList.add('hidden'); }

function setupBattleButtons() {
  document.querySelectorAll('.actionBtn').forEach(btn => {
    btn.onclick = () => {
      const act = btn.dataset.act;
      if (!G.battle) return;
      const pet = G.battle.team.find(p => p.hp > 0 && !G.battle.actions[p.id]);

      if (act === 'auto') {
        G.battle.auto = !G.battle.auto;
        G.autoBattle = G.battle.auto;
        btn.classList.toggle('on', G.battle.auto);
        toast(G.battle.auto ? '自动战斗开启' : '自动战斗关闭');
        if (G.battle.auto) promptNextPetAction();
        return;
      }
      if (act === 'escape') { if (Math.random() < 0.6) { logBattle('🏃 逃跑成功', 'system'); setTimeout(() => { backToExplore(); }, 600); } else { logBattle('❌ 逃跑失败', 'system'); } return; }

      if (!pet) { toast('没有待行动的灵兽'); return; }

      if (act === 'capture' || act === 'skill') {
          const aliveEnemies = G.battle.enemies.filter(e => e.hp > 0);
          if (!G.battle.targetEnemyId) {
              if (aliveEnemies.length > 1) {
                  toast('请先点击上方敌方灵兽选择目标！');
                  return;
              } else if (aliveEnemies.length === 1) {
                  G.battle.targetEnemyId = aliveEnemies[0].id;
              }
          }
      }

      if (act === 'capture') {
        const has = id => (G.items[id] || 0) > 0;
        if (has('orb3')) {
            G.battle.actions[pet.id] = { type:'item', itemId:'orb3', isCapture:true, targetId: G.battle.targetEnemyId };
        } else if (has('orb2')) {
            G.battle.actions[pet.id] = { type:'item', itemId:'orb2', isCapture:true, targetId: G.battle.targetEnemyId };
        } else if (has('orb')) {
            G.battle.actions[pet.id] = { type:'item', itemId:'orb', isCapture:true, targetId: G.battle.targetEnemyId };
        } else {
            toast('没有灵气球'); return;
        }
        promptNextPetAction();
        return;
      }

      if (act === 'skill') showSkillMenu(pet);
      if (act === 'item') showItemMenu(pet);
    };
  });
}

if ($('subBack')) $('subBack').onclick = () => hideSubMenu();

function bindUI() {
  const map = {
    btnNewGame: () => { localStorage.removeItem(SAVE_KEY); initNewGame(); initExplore(); },
    btnContinue: () => { if (!hasSave()) { toast('没有存档'); return; } if (!loadGame()) { toast('存档损坏'); return; } initExplore(); },
    btnCodex: () => openCodex(), codexClose: () => $('codexPanel').classList.add('hidden'),
    bagClose: () => $('bagPanel').classList.add('hidden'), teamClose: () => $('teamPanel').classList.add('hidden'),
    btnBag: () => openBag(), btnTeam: () => openTeam(),
    btnHome: () => {
      if (G.currentMap === 'cave' && typeof leaveCave === 'function') { leaveCave(); return; }
      G.currentMap = 'town'; G.px = 0; G.py = 0; G.walkTarget = null;
      if (typeof renderWorldDecor === 'function') renderWorldDecor();
      updateWorldDecor();
      if (typeof refreshRegion === 'function') refreshRegion(true);
      toast('回到青石村'); updateExploreUI();
    },
    btnAuto: () => { G.autoExplore = !G.autoExplore; updateExploreUI(); toast(G.autoExplore ? '自动探索开启' : '自动探索关闭'); },
    petClose: () => { $('petPanel').classList.add('hidden'); openTeam(); },
    petToggle: () => {
      const p = currentPetDetail; if (!p) return;
      if (G.team.includes(p.id)) { G.team = G.team.filter(id => id !== p.id); }
      else { if (G.team.length >= 5) { toast('最多 5 只出战'); return; } G.team.push(p.id); }
      saveGame(); window.viewPet(p.id); updateExploreUI();
    }
  };
  for (const id in map) { const el = $(id); if (el) el.onclick = map[id]; }
}

function boot() {
  const required = ['menu','explore','battle','btnNewGame','btnContinue','btnCodex','btnBag','btnTeam','btnHome','interactBtn','joyZone','btnAuto'];
  const missing = required.filter(id => !document.getElementById(id));
  if (missing.length > 0) { alert('缺少HTML元素：' + missing.join(', ')); return; }
  try { bindUI(); } catch (e) { console.error(e); }
  try { setupJoystick(); setupInteractBtn(); setupBattleButtons(); } catch (e) { console.error(e); }
  try { if (typeof setupMapUI === 'function') setupMapUI(); } catch (e) { console.error(e); }
  if (!hasSave()) { const bc = $('btnContinue'); if (bc) bc.disabled = true; }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();