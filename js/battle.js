"use strict";

/* ============================================================
   战斗系统核心
   ============================================================ */
function startBattle() {
  if (G.autoExplore) { G.autoExplore = false; updateExploreUI(); }

  const count = rndi(1, 3); const enemies = [];
  for (let i = 0; i < count; i++) {
    const sp = pick(ALL_SPECIES), isV = isZodiac(sp.id) && Math.random() < 0.05;
    const lv = Math.max(1, Math.round(G.party[0] ? G.party[0].level + rnd(-1, 1) : 3));
    const e = createPet(sp.id, lv, isV); e.isEnemy = true; e.buffs = []; enemies.push(e);
  }
  const myTeam = G.team.map(id => G.party.find(p => p.id === id)).filter(Boolean).slice(0, 5);
  if (myTeam.length === 0) { toast('没有可出战的灵兽'); return; }
  for (const p of myTeam) { p.buffs = []; p.isEnemy = false; }

  G.battle = {
    enemies, team: myTeam, ended: false, auto: G.autoBattle,
    turn: 1, actions: {}, targetEnemyId: null
  };

  if (enemies.filter(e => e.hp > 0).length === 1) {
      G.battle.targetEnemyId = enemies[0].id;
  }

  $('battleLogList').innerHTML = ''; logBattle('⚔️ 遭遇野生灵兽！', 'system');
  showScreen('battle'); renderBattle();
  playMusic('battle');

  const autoBtn = document.querySelector('.actionBtn[data-act="auto"]');
  if (autoBtn) autoBtn.classList.toggle('on', G.battle.auto);

  updateBattleMsg(G.battle.targetEnemyId ? '已自动锁定目标' : '请点击上方敌人选择目标');
  beginTurn();
}

function renderBattle() {
  const er = $('enemyRow'); if (er) er.innerHTML = '';
  if (er) for (const e of G.battle.enemies) {
    const el = makeUnitEl(e);
    if (G.battle.targetEnemyId === e.id) el.classList.add('targeted');
    el.onclick = () => {
      if (e.hp <= 0) return;

      if (G.battle.targetEnemyId === e.id) {
        G.battle.targetEnemyId = null;
        toast(`已取消锁定`);
        updateBattleMsg(`请点击上方敌人选择目标`);
      } else {
        G.battle.targetEnemyId = e.id;
        toast(`已锁定目标：${e.name}`);
        updateBattleMsg(`目标：${e.name}，请选择动作`);
      }
      renderBattle();
    };
    er.appendChild(el);
  }

  const pr = $('playerRow'); if (pr) pr.innerHTML = '';
  if (pr) for (const u of G.battle.team) pr.appendChild(makeUnitEl(u));
}

function makeUnitEl(u) {
  const div = document.createElement('div');
  let cls = 'unit'; if (u.hp <= 0) cls += ' dead'; if (u.isVariant) cls += ' variant';
  div.className = cls; div.id = 'unit_' + u.id;
  const hpPct = clamp(u.hp / u.maxHp, 0, 1);
  const hpClass = hpPct < 0.25 ? 'crit' : hpPct < 0.55 ? 'low' : '';
  const el = ELEMENTS[u.element];
  div.innerHTML = '<div class="unitEle ' + (el ? el.cls : '') + '">' + (el ? el.name : '') + '</div>' +
    '<div class="unitSprite">' + u.emoji + '</div>' +
    '<div class="unitName">' + (u.name.length > 5 ? u.name.slice(0,5) + '…' : u.name) + '</div>' +
    '<div class="unitHPWrap"><div class="unitHP ' + hpClass + '" style="width:' + (hpPct * 100) + '%"></div></div>' +
    '<div style="font-size:9px;opacity:.6">Lv.' + u.level + '</div>';
  return div;
}

function logBattle(htmlStr, type) {
  const list = $('battleLogList'); if (!list) return;
  const item = document.createElement('div');
  item.className = 'logItem log-item-' + type;
  item.innerHTML = htmlStr;
  list.appendChild(item);
  while (list.children.length > 30) list.removeChild(list.firstChild);
  const area = $('battleLogArea'); if (area) area.scrollTop = area.scrollHeight;
}
function updateBattleMsg(msg) { const el = $('battleMsg'); if (el) el.textContent = msg; }

function beginTurn() {
  if (G.battle.ended) return; G.battle.actions = {};
  for (const p of [...G.battle.team, ...G.battle.enemies]) {
    if(p.buffs) p.buffs = p.buffs.filter(b => --b.turns > 0);
  }
  renderBattle(); promptNextPetAction();
}

function promptNextPetAction() {
  const team = G.battle.team.filter(p => p.hp > 0);
  const pending = team.find(p => !G.battle.actions[p.id]);
  if (!pending) { executeTurn(); return; }

  if (G.battle.auto) {
    G.battle.actions[pending.id] = autoChooseAction(pending);
    setTimeout(promptNextPetAction, 100);
    return;
  }

  if (G.battle.targetEnemyId) {
      const t = G.battle.enemies.find(e => e.id === G.battle.targetEnemyId);
      if (!t || t.hp <= 0) G.battle.targetEnemyId = null;
  }
  const aliveEnemies = G.battle.enemies.filter(e => e.hp > 0);
  if (!G.battle.targetEnemyId && aliveEnemies.length === 1) {
      G.battle.targetEnemyId = aliveEnemies[0].id;
  }

  updateBattleMsg(`${pending.name} 的回合`);
  document.querySelectorAll('.unit').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('unit_' + pending.id);
  if (el) el.classList.add('active');
  renderBattle();
}

function showSubMenu(title, list) {
  const sm = $('subMenu'); if (!sm) return;
  $('subTitle').textContent = title;
  const ul = $('subList'); ul.innerHTML = '';
  for (const item of list) {
    const b = document.createElement('button');
    b.className = 'subItem';
    b.innerHTML = item.html;
    b.onclick = () => { hideSubMenu(); item.cb(); };
    ul.appendChild(b);
  }
  sm.classList.remove('hidden');
}
function hideSubMenu() { const sm = $('subMenu'); if (sm) sm.classList.add('hidden'); }

function showSkillMenu(pet) {
  const list = [];
  const targetName = G.battle.targetEnemyId ? G.battle.enemies.find(e=>e.id===G.battle.targetEnemyId).name : '无';

  for (const sid of pet.skills) {
    const sk = SKILLS[sid]; if (!sk) continue;
    const el = ELEMENTS[sk.element];
    let targetDesc = '';
    if (sk.power > 0) targetDesc = `将攻击: <b>${targetName}</b>`;
    else if (sk.type === 'heal') targetDesc = `将治疗自身`;

    list.push({
      html: `<div class="nm">${sk.icon} ${sk.name} <span class="ele ${el?el.cls:''}">${el?el.name:''}</span></div><div class="desc">${sk.power>0?'威力 '+sk.power:sk.desc}<br>${targetDesc}</div>`,
      cb: () => {
        G.battle.actions[pet.id] = { type:'skill', skillId: sid, targetId: G.battle.targetEnemyId };
        promptNextPetAction();
      }
    });
  }
  showSubMenu(`${pet.emoji} ${pet.name} (目标: ${targetName})`, list);
}

function showItemMenu(pet) {
  const list = [];
  for (const id in G.items) {
    if (G.items[id] <= 0) continue;
    const it = ITEMS[id]; if (!it || it.type !== 'heal') continue;
    list.push({
      html: `<div class="nm">${it.icon} ${it.name} ×${G.items[id]}</div><div class="desc">${it.desc} (对自己使用)</div>`,
      cb: () => {
        G.battle.actions[pet.id] = { type:'item', itemId: id, targetId: pet.id };
        promptNextPetAction();
      }
    });
  }
  if (list.length === 0) list.push({ html: '<div class="nm">没有可用道具</div>', cb: () => {} });
  showSubMenu('选择道具', list);
}

function getBestTarget(unit, targets) {
  let best = null, bestScore = -1;
  for (const t of targets) {
    let score = elementMult(unit.element, t.element);
    score += (1 - t.hp / t.maxHp);
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return best;
}

function autoChooseAction(pet) {
  if (pet.isEnemy) {
     const alivePlayers = G.battle.team.filter(p => p.hp > 0);
     if (alivePlayers.length === 0) return { type:'skill', skillId: pet.skills[0] };

     const healSk = pet.skills.find(s => SKILLS[s] && SKILLS[s].type === 'heal');
     if (healSk && pet.hp / pet.maxHp < 0.3) {
         return { type:'skill', skillId: healSk, targetId: pet.id };
     }

     let target = getBestTarget(pet, alivePlayers);
     const atkSkills = pet.skills.map(s => SKILLS[s]).filter(sk => sk && sk.power > 0).sort((a, b) => b.power - a.power);
     const bestSkill = atkSkills.length > 0 ? atkSkills[0].id : pet.skills[0];
     return { type:'skill', skillId: bestSkill, targetId: target ? target.id : null };
  }

  const aliveEnemies = G.battle.enemies.filter(e => e.hp > 0);
  if (aliveEnemies.length === 0) return { type:'skill', skillId: pet.skills[0] };

  const variantEnemy = aliveEnemies.find(e => e.isVariant);
  if (variantEnemy) {
      if (G.items['orb2'] > 0) return { type:'item', itemId:'orb2', isCapture:true, targetId: variantEnemy.id };
      if (G.items['orb'] > 0) return { type:'item', itemId:'orb', isCapture:true, targetId: variantEnemy.id };
  }

  if (pet.hp / pet.maxHp < 0.3) {
      if (G.items['potion2'] > 0) return { type:'item', itemId:'potion2', targetId: pet.id };
      if (G.items['potion'] > 0) return { type:'item', itemId:'potion', targetId: pet.id };
  }

  const healSk = pet.skills.find(s => SKILLS[s] && SKILLS[s].type === 'heal');
  if (healSk && pet.hp / pet.maxHp < 0.6) {
     const aliveAllies = G.battle.team.filter(p => p.hp > 0);
     const worst = aliveAllies.reduce((a, b) => a.hp/a.maxHp < b.hp/b.maxHp ? a : b);
     if (worst.hp / worst.maxHp < 0.6) return { type:'skill', skillId: healSk, targetId: worst.id };
  }

  let target = null;
  if (G.battle.targetEnemyId) {
    target = aliveEnemies.find(e => e.id === G.battle.targetEnemyId);
  }
  if (!target) target = getBestTarget(pet, aliveEnemies);

  const atkSkills = pet.skills.map(s => SKILLS[s]).filter(sk => sk && sk.power > 0).sort((a, b) => b.power - a.power);
  const bestSkill = atkSkills.length > 0 ? atkSkills[0].id : pet.skills[0];

  return { type:'skill', skillId: bestSkill, targetId: target ? target.id : null };
}

function executeTurn() {
  const all = [];
  for (const p of G.battle.team) {
    if (p.hp > 0) all.push({ unit: p, side: 'team', action: G.battle.actions[p.id] });
  }
  for (const e of G.battle.enemies) {
    if (e.hp > 0) {
      const act = autoChooseAction(e);
      all.push({ unit: e, side: 'enemy', action: act });
    }
  }
  all.sort((a, b) => b.unit.stats.spd - a.unit.stats.spd);

  let i = 0;
  const step = () => {
    if (G.battle.ended) return;
    if (i >= all.length) {
      if (G.battle.enemies.every(e => e.hp <= 0)) { endBattle('win'); return; }
      if (G.battle.team.every(p => p.hp <= 0)) { endBattle('lose'); return; }
      G.battle.turn++; beginTurn(); return;
    }
    const item = all[i++];
    if (item.unit.hp <= 0) { step(); return; }

    document.querySelectorAll('.unit').forEach(el => el.classList.remove('active'));
    const actorEl = document.getElementById('unit_' + item.unit.id);
    if (actorEl) actorEl.classList.add('active');

    executeOneAction(item, step);
  };
  step();
}

function createProjectile(rect1, rect2, emoji, duration = 400) {
  const sx = rect1.left + rect1.width / 2;
  const sy = rect1.top + rect1.height / 2;
  const tx = rect2.left + rect2.width / 2;
  const ty = rect2.top + rect2.height / 2;

  const layer = $('fxLayer');
  const p = document.createElement('div');
  p.className = 'fx-projectile';
  p.textContent = emoji;
  p.style.left = sx + 'px';
  p.style.top = sy + 'px';
  p.style.transition = `transform ${duration}ms cubic-bezier(0.2, 0.8, 0.4, 1)`;
  layer.appendChild(p);

  p.offsetHeight;
  p.style.transform = `translate(${tx - sx}px, ${ty - sy}px) rotate(360deg)`;

  setTimeout(() => { if (p.parentNode) p.parentNode.removeChild(p); }, duration + 50);
}

function showFloatingText(rect, text, color) {
  const x = rect.left + rect.width / 2;
  const y = rect.top;

  const layer = $('fxLayer');
  const el = document.createElement('div');
  el.className = 'fx-pop';
  el.textContent = text;
  el.style.color = color;
  el.style.left = x + 'px';
  el.style.top = Math.max(80, y) + 'px';
  layer.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 900);
}

function showHealFx(rect) {
  const x = rect.left + rect.width / 2;
  const y = rect.top;

  const layer = $('fxLayer');
  const el = document.createElement('div');
  el.className = 'fx-heal';
  el.textContent = '❤️';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  layer.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 900);
}

function executeOneAction(item, next) {
  const { unit, side, action } = item;

  if (side === 'enemy' && action.type === 'item') {
      next(); return;
  }

  const mySide = side === 'team' ? G.battle.team : G.battle.enemies;
  const oppSide = side === 'team' ? G.battle.enemies : G.battle.team;

  let aliveOpp = oppSide.filter(e => e.hp > 0);
  if (aliveOpp.length === 0) { next(); return; }

  if (action.type === 'item') {
    const it = ITEMS[action.itemId];
    if (!it) { next(); return; }

    if (action.isCapture) {
      const target = oppSide.find(e => e.id === action.targetId && e.hp > 0) || getBestTarget(unit, aliveOpp);
      G.items[action.itemId]--;

      const baseRate = action.itemId === 'orb2' ? 0.4 : 0.25;
      const rate = clamp(baseRate + (1 - target.hp / target.maxHp) * 0.5, 0.05, 0.95);

      const curUnitEl = document.getElementById('unit_' + unit.id);
      const curTargetEl = document.getElementById('unit_' + target.id);
      if (curUnitEl && curTargetEl) {
          createProjectile(curUnitEl.getBoundingClientRect(), curTargetEl.getBoundingClientRect(), '🔮');
      }

      setTimeout(() => {
        if (Math.random() < rate) {
          const newPet = createPet(target.speciesId, target.level, target.isVariant);
          G.party.push(newPet); saveGame();
          logBattle(`🔮 <b>${target.name}</b> 被成功捕捉了！`, 'capture');
          target.hp = 0; renderBattle(); toast('捕捉成功');
        } else {
          logBattle(`💨 <b>${target.name}</b> 挣脱了灵气球。`, 'system'); toast('捕捉失败');
        }
        renderBattle();
        setTimeout(next, 500);
      }, 400);

    } else {
      const target = mySide.find(p => p.id === action.targetId) || unit;
      G.items[action.itemId]--;
      target.hp = Math.min(target.maxHp, target.hp + it.value);

      const curTargetEl = document.getElementById('unit_' + target.id);
      if (curTargetEl) {
          const rect = curTargetEl.getBoundingClientRect();
          showFloatingText(rect, `+${it.value}`, '#6ee7a0');
          showHealFx(rect);
      }

      logBattle(`🧪 <b>${target.name}</b> 使用 ${it.name}，回复 <b>${it.value}</b> HP`, 'heal');
      renderBattle();
      setTimeout(next, 500);
    }
    return;
  }

  const sk = SKILLS[action.skillId];
  if (!sk) { next(); return; }

  let target = null;
  if (sk.type === 'heal' || sk.type === 'buff') {
    target = mySide.find(p => p.id === action.targetId) || unit;
    if (target.hp <= 0) target = mySide.filter(p=>p.hp>0).reduce((a,b)=>a.hp/a.maxHp<b.hp/b.maxHp?a:b);
  } else {
    target = aliveOpp.find(e => e.id === action.targetId) || getBestTarget(unit, aliveOpp);
  }

  setTimeout(() => {
    const curUnitEl = document.getElementById('unit_' + unit.id);
    const curTargetEl = document.getElementById('unit_' + target.id);
    if (!curUnitEl || !curTargetEl) { next(); return; }
    const rect1 = curUnitEl.getBoundingClientRect();
    const rect2 = curTargetEl.getBoundingClientRect();

    if (sk.type === 'physical' || sk.type === 'special') {
      if (sk.type === 'physical') {
        curUnitEl.classList.add('attack-anim');
        setTimeout(() => curUnitEl.classList.remove('attack-anim'), 300);
      } else {
        const projEmoji = sk.element === 'fire' ? '🔥' : sk.element === 'water' ? '💧' : sk.element === 'metal' ? '⚡' : sk.element === 'wood' ? '🌿' : '🪨';
        createProjectile(rect1, rect2, projEmoji);
      }

      setTimeout(() => {
        const atkStat = sk.type === 'physical' ? unit.stats.atk : unit.stats.matk;
        const defStat = sk.type === 'physical' ? target.stats.def : target.stats.mdef;
        let baseDmg = (unit.level * 2 / 5 + 2) * sk.power * atkStat / Math.max(1, defStat) / 50 + 2;
        const mult = elementMult(sk.element, target.element);
        const crit = Math.random() < 0.0625 ? 1.5 : 1;
        let dmg = Math.max(1, Math.round(baseDmg * mult * crit * rnd(0.85, 1.0)));

        target.hp = Math.max(0, target.hp - dmg);

        const hitEl = document.getElementById('unit_' + target.id);
        if (hitEl) { hitEl.classList.add('hit'); setTimeout(() => hitEl.classList.remove('hit'), 300); }

        let color = '#fff'; let eff = '';
        if (mult > 1) { color = '#ffd76a'; eff = ' 克制！'; }
        else if (mult < 1) { color = '#999'; }
        if (crit > 1) { color = '#ff4d4d'; eff += ' 暴击！'; }
        showFloatingText(rect2, `-${dmg}`, color);

        let logHtml = `${unit.emoji} <b>${unit.name}</b> 使用 ${sk.name}，对 <b>${target.name}</b> 造成 <b>${dmg}</b> 伤害。`;
        if (eff) logHtml += ` <span class="eff">${eff}</span>`;
        logBattle(logHtml, mult > 1 || crit > 1 ? 'crit' : 'damage');

        renderBattle();
        if (target.hp <= 0) { logBattle(`💀 <b>${target.name}</b> 倒下了`, 'system'); renderBattle(); }
        setTimeout(next, 500);
      }, sk.type === 'physical' ? 200 : 400);

    } else if (sk.type === 'heal') {
      const heal = Math.round(unit.maxHp * (sk.healPct || 0.4));
      unit.hp = Math.min(unit.maxHp, unit.hp + heal);

      showFloatingText(rect1, `+${heal}`, '#6ee7a0');
      showHealFx(rect1);

      logBattle(`${unit.emoji} <b>${unit.name}</b> 使用 ${sk.name}，回复了 <b>${heal}</b> HP`, 'heal');
      renderBattle();
      setTimeout(next, 600);

    } else if (sk.type === 'buff' || sk.type === 'debuff') {
      logBattle(`${unit.emoji} <b>${unit.name}</b> 使用 ${sk.name}。`, 'system');
      renderBattle();
      setTimeout(next, 500);
    }
  }, 300);
}

/* 战斗结算自动继续 */
function endBattle(result) {
  G.battle.ended = true;
  const isAuto = G.battle.auto;

  if (result === 'win') {
    let gold = 0, exp = 0;
    for (const e of G.battle.enemies) { gold += 10 + e.level * 5; exp += 15 + e.level * 8; }
    G.gold += gold;
    for (const p of G.battle.team) {
      if (p.hp <= 0) continue; p.exp += exp;
      while (p.exp >= p.expNext) {
        p.exp -= p.expNext; p.level++; p.expNext = expForLevel(p.level);
        const sp = findSpecies(p.speciesId); const statMult = 1 + (p.level - 1) * 0.08, variantMult = p.isVariant ? 1.2 : 1;
        p.maxHp = Math.round(sp.baseStats.hp * statMult * variantMult); p.stats.hp = p.maxHp;
        p.stats.atk = Math.round(sp.baseStats.atk * statMult * variantMult);
        p.stats.def = Math.round(sp.baseStats.def * statMult * variantMult);
        p.stats.matk = Math.round(sp.baseStats.matk * statMult * variantMult);
        p.stats.mdef = Math.round(sp.baseStats.mdef * statMult * variantMult);
        p.stats.spd = Math.round(sp.baseStats.spd * statMult * variantMult);
        p.hp = Math.min(p.hp, p.maxHp);
        logBattle(`🎉 <b>${p.name}</b> 升到 Lv.${p.level}！`, 'system');
      }
    }
    saveGame();

    const proceedWin = () => { hideDialog(); backToExplore(); };

    setTimeout(() => {
        showDialog('战斗胜利', `获得 ${gold} 金币 · ${exp} 经验`, [{ text:'继 续', cb: proceedWin }], '🏆');

        if (isAuto) {
            setTimeout(() => {
                if (!$('dialog').classList.contains('hidden')) proceedWin();
            }, 1500);
        }
    }, 800);
  } else {
    const proceedLose = () => {
        hideDialog();
        for (const p of G.party) p.hp = p.maxHp;
        G.px = 0; G.py = 0;
        updateWorldDecor();
        backToExplore();
    };

    setTimeout(() => {
      showDialog('战斗失败', '你的灵兽全部倒下了...', [{ text:'回 到 城 镇', cb: proceedLose }], '💀');
      if (isAuto) {
          setTimeout(() => {
              if (!$('dialog').classList.contains('hidden')) proceedLose();
          }, 1500);
      }
    }, 800);
  }
}

function backToExplore() {
  G.battle = null;
  showScreen('explore');
  updateExploreUI();

  if (G.autoBattle) {
    G.autoExplore = true;
    if (G.currentMap === 'town') teleportToField();
    updateExploreUI();
  }

  playMusic(G.currentMap === 'town' ? 'town' : 'field');
  checkAutoResupply();
}

function checkAutoResupply() {
    const hasOrb = (G.items['orb']||0) > 0 || (G.items['orb2']||0) > 0;
    const hasPotion = (G.items['potion']||0) > 0 || (G.items['potion2']||0) > 0;
    const needHeal = G.party.some(p => p.hp < p.maxHp * 0.5);

    if (!hasOrb || !hasPotion || needHeal) {
        toast("物资匮乏，自动返回城镇补给...");
        setTimeout(() => {
            teleportToTown();
            for (const p of G.party) p.hp = p.maxHp;

            if (!hasOrb && G.gold >= ITEMS.orb.price) {
                let count = Math.floor(G.gold / ITEMS.orb.price);
                count = Math.min(count, 10);
                G.gold -= count * ITEMS.orb.price;
                G.items['orb'] = (G.items['orb']||0) + count;
                toast(`自动购买 ${count} 个灵气球`);
            }

            if (!hasPotion && G.gold >= ITEMS.potion.price) {
                let count = Math.floor(G.gold / ITEMS.potion.price);
                count = Math.min(count, 5);
                G.gold -= count * ITEMS.potion.price;
                G.items['potion'] = (G.items['potion']||0) + count;
                toast(`自动购买 ${count} 个小药水`);
            }

            saveGame();
            updateExploreUI();

            setTimeout(() => {
                if (G.autoBattle) {
                    toast("补给完毕，继续出城探索...");
                    G.autoExplore = true;
                    teleportToField();
                }
            }, 800);
        }, 1000);
    }
}