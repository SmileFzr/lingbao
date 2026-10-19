"use strict";

/* ============================================================
   8-bit 背景音乐合成器
   - 用 Web Audio API 实时合成，不需要任何外部音频文件
   - 每个场景一首曲子，自动循环
   - 曲目结构：lead（方波旋律）+ bass（三角波低音）
   ============================================================ */

const NOTE_SEMITONE = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
function noteToFreq(name) {
  if (!name) return 0;
  const m = /^([A-G])([#b]?)(\d)$/.exec(name);
  if (!m) return 0;
  let semi = NOTE_SEMITONE[m[1]];
  if (m[2] === '#') semi++;
  else if (m[2] === 'b') semi--;
  const oct = parseInt(m[3], 10);
  return 440 * Math.pow(2, (oct - 4) + (semi - 9) / 12);
}

/* ---------- 三首曲目 ----------
   格式：[音名, 拍数]，音名为 null 表示休止
   lead 用方波，bass 用三角波
----------------------------------- */
const TRACKS = {
  /* 城镇：C 大调，舒缓轻快 */
  town: {
    bpm: 104,
    lead: [
      ['C5',0.5],['E5',0.5],['G5',1],['E5',0.5],['G5',0.5],['C6',1],
      ['A5',0.5],['G5',0.5],['E5',1],['A5',0.5],['G5',0.5],['E5',1],
      ['F5',0.5],['A5',0.5],['C6',1],['A5',0.5],['G5',0.5],['F5',1],
      ['G5',0.5],['B5',0.5],['D6',1],['B5',1],['G5',1]
    ],
    bass: [
      ['C3',2],['G3',2],
      ['A2',2],['E3',2],
      ['F2',2],['C3',2],
      ['G2',2],['D3',2]
    ]
  },

  /* 野外：G 大调，冒险探索感 */
  field: {
    bpm: 128,
    lead: [
      ['B4',0.5],['D5',0.5],['G5',1],['D5',0.5],['B4',0.5],['G4',1],
      ['E5',0.5],['G5',0.5],['B5',1],['G5',0.5],['E5',0.5],['B4',1],
      ['C5',0.5],['E5',0.5],['G5',1],['E5',0.5],['C5',0.5],['G4',1],
      ['D5',0.5],['F#5',0.5],['A5',1],['F#5',0.5],['D5',0.5],['A4',1]
    ],
    bass: [
      ['G2',2],['D3',2],
      ['E2',2],['B2',2],
      ['C3',2],['G3',2],
      ['D3',2],['A3',2]
    ]
  },

  /* 战斗：E 小调，急促紧张 */
  battle: {
    bpm: 148,
    lead: [
      ['E5',0.5],['E5',0.5],['G5',0.5],['B5',0.5],['A5',0.5],['G5',0.5],['E5',0.5],['D5',0.5],
      ['C5',0.5],['C5',0.5],['E5',0.5],['G5',0.5],['A5',0.5],['G5',0.5],['E5',0.5],['C5',0.5],
      ['B4',0.5],['B4',0.5],['D5',0.5],['G5',0.5],['F#5',0.5],['E5',0.5],['D5',0.5],['B4',0.5],
      ['A4',0.5],['A4',0.5],['D5',0.5],['F#5',0.5],['A5',0.5],['F#5',0.5],['D5',0.5],['A4',0.5]
    ],
    bass: [
      ['E2',0.5],['E2',0.5],['E3',0.5],['E2',0.5],['E2',0.5],['E2',0.5],['E3',0.5],['E2',0.5],
      ['C3',0.5],['C3',0.5],['C2',0.5],['C3',0.5],['C3',0.5],['C3',0.5],['C2',0.5],['C3',0.5],
      ['G2',0.5],['G2',0.5],['G3',0.5],['G2',0.5],['G2',0.5],['G2',0.5],['G3',0.5],['G2',0.5],
      ['D3',0.5],['D3',0.5],['D2',0.5],['D3',0.5],['D3',0.5],['D3',0.5],['D2',0.5],['D3',0.5]
    ]
  }
};

/* ---------- 播放引擎 ---------- */
const AudioEngine = {
  ctx: null,
  master: null,
  track: null,
  trackName: null,
  lead: { index: 0, next: 0 },
  bass: { index: 0, next: 0 },
  timer: null
};

function ensureAudio() {
  if (AudioEngine.ctx) return true;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return false;
  try {
    AudioEngine.ctx = new Ctor();
    AudioEngine.master = AudioEngine.ctx.createGain();
    AudioEngine.master.gain.value = 0.22;
    AudioEngine.master.connect(AudioEngine.ctx.destination);
    return true;
  } catch (e) {
    AudioEngine.ctx = null;
    return false;
  }
}

function resumeAudio() {
  if (AudioEngine.ctx && AudioEngine.ctx.state === 'suspended') {
    AudioEngine.ctx.resume().catch(() => {});
  }
}

/* 播放一个单音（自带 attack / release，避免爆音） */
function playNote(freq, time, dur, type, vol) {
  if (!freq) return;
  const ctx = AudioEngine.ctx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;

  const attack = 0.008;
  const release = Math.min(0.08, dur * 0.35);
  const sustainEnd = Math.max(time + attack, time + dur - release);

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(vol, time + attack);
  gain.gain.setValueAtTime(vol, sustainEnd);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

  osc.connect(gain);
  gain.connect(AudioEngine.master);
  osc.start(time);
  osc.stop(time + dur + 0.02);
}

/* 前瞻调度器：每 25ms 检查一次，把未来 150ms 的音符安排上 */
function audioScheduler() {
  if (!AudioEngine.ctx || !AudioEngine.track) return;
  if (AudioEngine.ctx.state === 'suspended') return;

  const track = AudioEngine.track;
  const spb = 60 / track.bpm;
  const lookahead = AudioEngine.ctx.currentTime + 0.15;

  let guard = 0;
  while (AudioEngine.lead.next < lookahead && guard++ < 16) {
    const item = track.lead[AudioEngine.lead.index % track.lead.length];
    const name = item[0], beats = item[1];
    const dur = beats * spb;
    if (name) {
      playNote(noteToFreq(name), AudioEngine.lead.next, dur * 0.92, 'square', 0.18);
    }
    AudioEngine.lead.next += dur;
    AudioEngine.lead.index++;
  }

  guard = 0;
  while (AudioEngine.bass.next < lookahead && guard++ < 16) {
    const item = track.bass[AudioEngine.bass.index % track.bass.length];
    const name = item[0], beats = item[1];
    const dur = beats * spb;
    if (name) {
      playNote(noteToFreq(name), AudioEngine.bass.next, dur * 0.95, 'triangle', 0.34);
    }
    AudioEngine.bass.next += dur;
    AudioEngine.bass.index++;
  }
}

/* 对外接口：切换曲目（同名不会重复启动） */
function playMusic(name) {
  if (!name) return;
  if (AudioEngine.trackName === name && AudioEngine.track) return;
  if (!ensureAudio()) return;
  resumeAudio();

  const track = TRACKS[name];
  if (!track) return;

  const start = AudioEngine.ctx.currentTime + 0.06;
  AudioEngine.track = track;
  AudioEngine.trackName = name;
  AudioEngine.lead = { index: 0, next: start };
  AudioEngine.bass = { index: 0, next: start };

  if (!AudioEngine.timer) {
    AudioEngine.timer = setInterval(audioScheduler, 25);
    audioScheduler();
  }
}

function stopMusic() {
  AudioEngine.track = null;
  AudioEngine.trackName = null;
  if (AudioEngine.timer) {
    clearInterval(AudioEngine.timer);
    AudioEngine.timer = null;
  }
}

/* 移动端音频解锁：任何一次点击/触摸都尝试恢复 AudioContext */
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) resumeAudio();
});
['touchstart','mousedown','keydown'].forEach(ev => {
  window.addEventListener(ev, resumeAudio, { passive: true });
});