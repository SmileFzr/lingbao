"use strict";

function saveGame() {
  try {
    const data = {
      gold: G.gold, items: G.items,
      party: G.party.map(p => ({ id:p.id, speciesId:p.speciesId, name:p.name, emoji:p.emoji, element:p.element, level:p.level, exp:p.exp, expNext:p.expNext, isVariant:p.isVariant, maxHp:p.maxHp, hp:p.hp, stats:p.stats, skills:p.skills })),
      team: G.team.slice(), px: G.px, py: G.py, codex: G.codex, petSeq
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {}
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    G.gold = d.gold || 0; G.items = d.items || {};
    G.party = (d.party || []).map(p => ({ ...p, buffs: [] }));
    G.team = d.team || []; G.px = d.px || 0; G.py = d.py || 0; G.codex = d.codex || {}; petSeq = d.petSeq || (G.party.length + 1);
    return true;
  } catch (e) { return false; }
}
function hasSave() { return !!localStorage.getItem(SAVE_KEY); }

let toastT = 0;
function toast(msg) {
  const t = $('toast'); if (!t) return;
  t.textContent = msg; t.style.opacity = '1';
  clearTimeout(toastT); toastT = setTimeout(() => { t.style.opacity = '0'; }, 1800);
}
function showScreen(name) {
  ['menu','explore','battle'].forEach(s => { const el = $(s); if (el) el.classList.toggle('hidden', s !== name); });
  G.screen = name;
}

function initNewGame() {
  G.gold = 300; G.items = { potion:5, orb:5, orb2:1 };
  G.party = []; G.team = []; G.codex = {}; G.px = 0; G.py = 0; petSeq = 1;
  const p1 = createPet('tiger', 5); const p2 = createPet('dragon', 5);
  G.party.push(p1, p2); G.team.push(p1.id, p2.id);
  saveGame();
}