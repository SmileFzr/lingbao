"use strict";

/* ============================================================
   8-bit 背景音乐与音效合成器
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

const TRACKS = {
  town: { bpm: 104, lead: [['C5',0.5],['E5',0.5],['G5',1],['E5',0.5],['G5',0.5],['C6',1],['A5',0.5],['G5',0.5],['E5',1],['A5',0.5],['G5',0.5],['E5',1],['F5',0.5],['A5',0.5],['C6',1],['A5',0.5],['G5',0.5],['F5',1],['G5',0.5],['B5',0.5],['D6',1],['B5',1],['G5',1]], bass: [['C3',2],['G3',2],['A2',2],['E3',2],['F2',2],['C3',2],['G2',2],['D3',2]] },
  field: { bpm: 128, lead: [['B4',0.5],['D5',0.5],['G5',1],['D5',0.5],['B4',0.5],['G4',1],['E5',0.5],['G5',0.5],['B5',1],['G5',0.5],['E5',0.5],['B4',1],['C5',0.5],['E5',0.5],['G5',1],['E5',0.5],['C5',0.5],['G4',1],['D5',0.5],['F#5',0.5],['A5',1],['F#5',0.5],['D5',0.5],['A4',1]], bass: [['G2',2],['D3',2],['E2',2],['B2',2],['C3',2],['G3',2],['D3',2],['A3',2]] },
  battle: { bpm: 148, lead: [['E5',0.5],['E5',0.5],['G5',0.5],['B5',0.5],['A5',0.5],['G5',0.5],['E5',0.5],['D5',0.5],['C5',0.5],['C5',0.5],['E5',0.5],['G5',0.5],['A5',0.5],['G5',0.5],['E5',0.5],['C5',0.5],['B4',0.5],['B4',0.5],['D5',0.5],['G5',0.5],['F#5',0.5],['E5',0.5],['D5',0.5],['B4',0.5],['A4',0.5],['A4',0.5],['D5',0.5],['F#5',0.5],['A5',0.5],['F#5',0.5],['D5',0.5],['A4',0.5]], bass: [['E2',0.5],['E2',0.5],['E3',0.5],['E2',0.5],['E2',0.5],['E2',0.5],['E3',0.5],['E2',0.5],['C3',0.5],['C3',0.5],['C2',0.5],['C3',0.5],['C3',0.5],['C3',0.5],['C2',0.5],['C3',0.5],['G2',0.5],['G2',0.5],['G3',0.5],['G2',0.5],['G2',0.5],['G2',0.5],['G3',0.5],['G2',0.5],['D3',0.5],['D3',0.5],['D2',0.5],['D3',0.5],['D3',0.5],['D3',0.5],['D2',0.5],['D3',0.5]] },
  forest: { bpm: 100, lead: [['A4',0.5],['C5',0.5],['E5',1],['D5',0.5],['C5',0.5],['A4',1],['G4',0.5],['A4',0.5],['C5',1],['B4',0.5],['A4',0.5],['G4',1],['F5',0.5],['E5',0.5],['D5',1],['C5',0.5],['B4',0.5],['A4',1],['E5',0.5],['D5',0.5],['C5',1],['A4',2]], bass: [['A2',2],['F2',2],['C3',2],['G2',2],['F2',2],['C3',2],['E2',2],['A2',2]] },
  desert: { bpm: 112, lead: [['D5',0.5],['F5',0.5],['A5',1],['G5',0.5],['F5',0.5],['E5',1],['D5',0.5],['C5',0.5],['D5',1],['F5',0.5],['E5',0.5],['D5',1],['A5',0.5],['Bb5',0.5],['A5',1],['G5',0.5],['F5',0.5],['E5',1],['D5',0.5],['E5',0.5],['F5',1],['D5',2]], bass: [['D2',2],['A2',2],['C3',2],['G2',2],['Bb2',2],['F2',2],['D2',2],['A2',2]] },
  ocean: { bpm: 96, lead: [['F5',0.5],['A5',0.5],['C6',1],['A5',0.5],['G5',0.5],['F5',1],['E5',0.5],['F5',0.5],['A5',1],['G5',0.5],['F5',0.5],['E5',1],['D5',0.5],['F5',0.5],['A5',1],['G5',0.5],['F5',0.5],['E5',1],['C5',0.5],['F5',0.5],['A5',1],['F5',2]], bass: [['F2',2],['C3',2],['D3',2],['Bb2',2],['F2',2],['C3',2],['Bb2',2],['F2',2]] },
  ruins: { bpm: 88, lead: [['C5',0.5],['Eb5',0.5],['G5',1],['F5',0.5],['Eb5',0.5],['C5',1],['B4',0.5],['C5',0.5],['Eb5',1],['D5',0.5],['C5',0.5],['B4',1],['Ab5',0.5],['G5',0.5],['F5',1],['Eb5',0.5],['D5',0.5],['C5',1],['G4',0.5],['C5',0.5],['Eb5',1],['C5',2]], bass: [['C2',2],['Ab2',2],['G2',2],['F2',2],['Ab2',2],['Eb2',2],['G2',2],['C2',2]] }
};

const AudioEngine = {
  ctx: null, master: null, track: null, trackName: null,
  lead: { index: 0, next: 0 }, bass: { index: 0, next: 0 }, timer: null
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
  } catch (e) { AudioEngine.ctx = null; return false; }
}

function resumeAudio() {
  if (AudioEngine.ctx && AudioEngine.ctx.state === 'suspended') {
    AudioEngine.ctx.resume().catch(() => {});
  }
}

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
  osc.connect(gain); gain.connect(AudioEngine.master);
  osc.start(time); osc.stop(time + dur + 0.02);
}

function audioScheduler() {
  if (!AudioEngine.ctx || !AudioEngine.track) return;
  if (AudioEngine.ctx.state === 'suspended') return;
  const track = AudioEngine.track;
  const spb = 60 / track.bpm;
  const lookahead = AudioEngine.ctx.currentTime + 0.15;

  let guard = 0;
  while (AudioEngine.lead.next < lookahead && guard++ < 16) {
    const item = track.lead[AudioEngine.lead.index % track.lead.length];
    if (item[0]) playNote(noteToFreq(item[0]), AudioEngine.lead.next, item[1] * spb * 0.92, 'square', 0.18);
    AudioEngine.lead.next += item[1] * spb; AudioEngine.lead.index++;
  }
  guard = 0;
  while (AudioEngine.bass.next < lookahead && guard++ < 16) {
    const item = track.bass[AudioEngine.bass.index % track.bass.length];
    if (item[0]) playNote(noteToFreq(item[0]), AudioEngine.bass.next, item[1] * spb * 0.95, 'triangle', 0.34);
    AudioEngine.bass.next += item[1] * spb; AudioEngine.bass.index++;
  }
}

function playMusic(name) {
  if (!name) return;
  if (AudioEngine.trackName === name && AudioEngine.track) return;
  if (!ensureAudio()) return; resumeAudio();
  const track = TRACKS[name]; if (!track) return;
  const start = AudioEngine.ctx.currentTime + 0.06;
  AudioEngine.track = track; AudioEngine.trackName = name;
  AudioEngine.lead = { index: 0, next: start }; AudioEngine.bass = { index: 0, next: start };
  if (!AudioEngine.timer) { AudioEngine.timer = setInterval(audioScheduler, 25); audioScheduler(); }
}

function stopMusic() {
  AudioEngine.track = null; AudioEngine.trackName = null;
  if (AudioEngine.timer) { clearInterval(AudioEngine.timer); AudioEngine.timer = null; }
}

/* ============================================================
   8-bit 实时音效合成器 (SFX)
   ============================================================ */
function playSfx(type) {
  if (!ensureAudio()) return;
  resumeAudio();
  const ctx = AudioEngine.ctx;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(AudioEngine.master);

  if (type === 'hit') {
    // 撞击/打击：短促方波骤降
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.start(t); osc.stop(t + 0.1);
  } else if (type === 'shoot') {
    // 法术发射：高频锯齿波上升
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.linearRampToValueAtTime(800, t + 0.15);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.15);
    osc.start(t); osc.stop(t + 0.15);
  } else if (type === 'heal') {
    // 治疗：正弦波琶音
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.setValueAtTime(554, t + 0.05);
    osc.frequency.setValueAtTime(659, t + 0.1);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    osc.start(t); osc.stop(t + 0.3);
  } else if (type === 'capture') {
    // 捕捉：快速抖动的方波
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.setValueAtTime(800, t + 0.05);
    osc.frequency.setValueAtTime(600, t + 0.1);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    osc.start(t); osc.stop(t + 0.2);
  }
}

document.addEventListener('visibilitychange', () => { if (!document.hidden) resumeAudio(); });
['touchstart','mousedown','keydown'].forEach(ev => { window.addEventListener(ev, resumeAudio, { passive: true }); });