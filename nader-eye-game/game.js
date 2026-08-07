/* ============================================================
   عين نادر · NADER'S EYE  —  v2
   Canvas خام. كانفاس 1290×2796. مفيش مكتبات.
   ============================================================ */

const W = 1290, H = 2796;

/* ---------- كل المقاسات هنا ---------- */
const L = {
  topbar:    { y: 30 },
  portrait:  { x: 62,   y: 44,  s: 196 },
  settings:  { x: 1002, y: 76,  w: 148 },
  help:      { x: 1160, y: 76,  h: 148 },
  coinbar:   { x: 40,   y: 296, w: 600 },
  coinText:  { x: 300,  y: 366 },
  bag:       { x: 1120, y: 470, w: 230 },
  play:      { x: 0,    y: 280, w: 1290, h: 2181 },
  bottombar: { y: 2470 },
  slots:     { y: 2516, size: 180, gap: 34, count: 4 },
  invRow:    { y: 2236, size: 176, gap: 22, count: 5 },
  nader:     { w: 470,  bottom: 2455, right: 60 },
  bubble:    { maxW: 980, minW: 620, padX: 96, padTop: 92, padBot: 150, line: 74 },
};

const TAP_MIN = 130;
const SAVE_KEY = 'nader_eye_save_v2';
const SAVE_VERSION = 2;

const T = {
  ar: { cont:'كمّل', chapters:'الفصول', newg:'من الأول',
        empty:'الشنطة فاضية', done:'خلص المشهد ✓', locked:'مقفول',
        ch1:'الفصل الأول — المسمار الفاضي' },
  en: { cont:'Continue', chapters:'Chapters', newg:'New Game',
        empty:'Bag is empty', done:'Scene complete ✓', locked:'Locked',
        ch1:'Chapter 1 — The Empty Nail' },
};

const DLG = {
  nail_line:   { ar:'مسمار… وما فيش حاجة معلّقة عليه.\nالغبار حواليه بيرسم برواز.\nبرواز اتنين، مش واحد.', en:'A nail. Nothing hanging on it.\nThe dust draws a frame around it.\nTwo frames. Not one.' },
  stairs_nail: { ar:'علامات بالقلم على الحيطة.\nطول واحد صغيّر، سنة ورا سنة.\nوبعدين وقفت.', en:'Pencil marks on the wall.\nA child\'s height, year by year.\nThen they stop.' },
  cellar_nail: { ar:'الهوا هنا واقف من زمان.', en:'The air down here has not moved in years.' },
  box_opened:  { ar:'ملفوف في قماش.\n…وناقصه حتّة.', en:'Wrapped in cloth.\n…and a piece of it is gone.' },
  locked_box:  { ar:'مقفول. محتاج حاجة أفتحه بيها.', en:'Locked. I need something to prise it open.' },
  locked_exit: { ar:'الباب مقفول.', en:'The door is locked.' },
};

const S = { version:SAVE_VERSION, scene:'ch1_s01', coins:1000,
            inventory:[], found:{}, flags:{}, lang:'ar', started:false };

let scenes = {}, img = {}, cur = null;
let screen = 'loading', bagOpen = false, dialog = null, toast = null;
let fx = [];
let canvas, ctx, scale = 1, t = 0;
const tr = k => T[S.lang][k];

/* ---------- تحميل ---------- */
const load = src => new Promise(r => {
  const i = new Image();
  i.onload = () => r(i);
  i.onerror = () => { console.warn('ناقص:', src); r(null); };
  i.src = src;
});

async function boot() {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');

  const ids = ['ch1_s01','ch1_s02','ch1_s03'];
  for (const id of ids) scenes[id] = await (await fetch(`data/${id}.json`)).json();

  for (const k of ['topbar','bottombar','coinbar','bag_closed','bag_open','arrow_nav',
                   'arrow_back','slot','bubble','coin','plus','settings','help','check'])
    img[k] = await load(`assets/ui/${k}.webp`);
  img.nader = await load('assets/char/nader_stand.webp');
  img.head  = await load('assets/char/nader_head.webp');

  for (const id of ids) {
    img[`bg_${id}`] = await load(scenes[id].background);
    for (const h of scenes[id].hotspots) img[`${id}_${h.id}`] = await load(h.image);
  }

  loadSave();
  screen = 'menu';
  addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', onTap);
  resize();
  requestAnimationFrame(loop);
  const el = document.getElementById('loading');
  if (el) el.remove();
}

/* ---------- الحفظ ---------- */
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch(e){} };
function loadSave() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (d && d.version === SAVE_VERSION) Object.assign(S, d);
  } catch(e){}
}
window.resetSave = () => { localStorage.removeItem(SAVE_KEY); location.reload(); };

/* ---------- المشهد ---------- */
function enter(id) {
  S.scene = id; cur = scenes[id];
  if (!S.found[id]) S.found[id] = [];
  bagOpen = false; dialog = null; fx = [];
  screen = 'game'; S.started = true;
  say(cur[S.lang === 'ar' ? 'title_ar' : 'title_en'], 1300);
  save();
}
const isFound = id => (S.found[S.scene] || []).includes(id);
const has = item => S.inventory.some(i => i.id === item);
const activeTargets = () => cur.objectives.filter(o => !isFound(o)).slice(0, L.slots.count);
const sceneDone = () => cur.objectives.every(isFound);

/* ---------- قياس ---------- */
function resize() {
  scale = Math.min(innerWidth / W, innerHeight / H);
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
}
function toGame(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
}

/* ---------- أدوات رسم ---------- */
function drawImg(i, x, y, w, h) {
  if (!i) return;
  if (w && !h) h = i.height * w / i.width;
  if (h && !w) w = i.width * h / i.height;
  ctx.drawImage(i, x, y, w || i.width, h || i.height);
}
function fitIn(i, x, y, box) {
  if (!i) return;
  const s = Math.min(box / i.width, box / i.height);
  drawImg(i, x + (box - i.width * s) / 2, y + (box - i.height * s) / 2, i.width * s, i.height * s);
}
function txt(s, x, y, size, col = '#F0E4C8', align = 'center', weight = 600) {
  ctx.save();
  ctx.fillStyle = col;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.direction = S.lang === 'ar' ? 'rtl' : 'ltr';
  ctx.fillText(s, x, y);
  ctx.restore();
}

/* ---------- اللوب ---------- */
function loop(ts) {
  t = ts;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = '#14100c';
  ctx.fillRect(0, 0, W, H);

  if (screen === 'menu') drawMenu();
  else if (screen === 'chapters') drawChapters();
  else if (screen === 'game') drawGame();

  requestAnimationFrame(loop);
}

/* ---------- شاشة البداية ---------- */
function menuBtns() {
  const w = 720, h = 170, x = (W - w) / 2;
  return [
    { k:'cont',     x, y:1380, w, h, on:S.started },
    { k:'chapters', x, y:1600, w, h, on:true },
    { k:'newg',     x, y:1820, w, h, on:true },
  ];
}
function drawMenu() {
  const bg = img.bg_ch1_s01;
  if (bg) {
    const s = Math.max(W / bg.width, H / bg.height);
    ctx.drawImage(bg, (W - bg.width*s)/2, (H - bg.height*s)/2, bg.width*s, bg.height*s);
  }
  ctx.fillStyle = 'rgba(14,11,8,.72)'; ctx.fillRect(0, 0, W, H);

  if (img.head) {
    const p = 1 + Math.sin(t/900) * .015;
    drawImg(img.head, W/2 - 210*p, 600, 420*p);
  }
  txt('عين نادر', W/2, 1140, 118, '#F0C98A', 'center', 700);
  txt("NADER'S EYE", W/2, 1250, 58, '#8a7c66', 'center', 600);

  for (const b of menuBtns()) {
    ctx.save();
    ctx.globalAlpha = b.on ? 1 : .35;
    ctx.fillStyle = b.k === 'cont' ? '#C9A227' : 'rgba(40,32,24,.92)';
    ctx.strokeStyle = '#6B4A32'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 28); ctx.fill(); ctx.stroke();
    ctx.restore();
    txt(tr(b.k), W/2, b.y + b.h/2, 60, b.k === 'cont' ? '#20180f' : '#F0E4C8', 'center', 700);
  }
  txt(S.lang === 'ar' ? 'EN' : 'ع', W - 90, H - 110, 54, '#8a7c66');
}

/* ---------- شاشة الفصول ---------- */
const chapterCard = () => ({ x:145, y:900, w:1000, h:760 });
function drawChapters() {
  ctx.fillStyle = '#1a1510'; ctx.fillRect(0, 0, W, H);
  txt(S.lang === 'ar' ? 'الفصول' : 'Chapters', W/2, 420, 96, '#F0C98A');

  const c = chapterCard(), bg = img.bg_ch1_s01;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 24); ctx.clip();
  if (bg) {
    const s = Math.max(c.w / bg.width, (c.h - 150) / bg.height);
    ctx.drawImage(bg, c.x + (c.w - bg.width*s)/2, c.y - 40, bg.width*s, bg.height*s);
  }
  ctx.fillStyle = 'rgba(20,16,12,.55)'; ctx.fillRect(c.x, c.y + c.h - 150, c.w, 150);
  ctx.restore();
  ctx.strokeStyle = '#6B4A32'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 24); ctx.stroke();
  txt(tr('ch1'), c.x + c.w/2, c.y + c.h - 75, 50, '#F0E4C8');

  ctx.save(); ctx.globalAlpha = .3; ctx.fillStyle = '#2a2018';
  ctx.beginPath(); ctx.roundRect(c.x, c.y + c.h + 60, c.w, 230, 24); ctx.fill();
  ctx.restore();
  txt('🔒 ' + tr('locked'), W/2, c.y + c.h + 175, 52, '#6b5c48');

  drawImg(img.arrow_back, 90, 200, 150);
}

/* ---------- اللعب ---------- */
function drawGame() {
  drawScene();
  if (dialog) {
    ctx.fillStyle = 'rgba(10,8,6,.62)';
    ctx.fillRect(L.play.x, L.play.y, L.play.w, L.play.h);
    drawNader();
  }
  drawTopBar();
  drawBottomBar();
  if (bagOpen) drawBag();
  if (dialog) drawBubble();
  drawFx();
  if (toast) drawToast();
}

function drawScene() {
  const bg = img[`bg_${S.scene}`], p = L.play;
  if (bg) {
    const s = Math.max(p.w / bg.width, p.h / bg.height);
    ctx.save();
    ctx.beginPath(); ctx.rect(p.x, p.y, p.w, p.h); ctx.clip();
    ctx.drawImage(bg, p.x + (p.w - bg.width*s)/2, p.y + (p.h - bg.height*s)/2, bg.width*s, bg.height*s);
    ctx.restore();
  }

  const ord = { back:0, mid:1, front:2 };
  const targets = activeTargets();
  for (const h of [...cur.hotspots].sort((a,b) => (ord[a.layer]??1) - (ord[b.layer]??1))) {
    if (isFound(h.id)) continue;
    const i = img[`${S.scene}_${h.id}`]; if (!i) continue;
    if (targets.includes(h.id)) {
      const g = (Math.sin(t/700) + 1) / 2;
      ctx.save();
      ctx.shadowColor = `rgba(240,201,138,${.16 + g*.20})`;
      ctx.shadowBlur = 24 + g * 14;
      drawImg(i, h.x, h.y, h.w, h.h);
      ctx.restore();
    } else drawImg(i, h.x, h.y, h.w, h.h);
  }

  for (const ex of cur.exits || []) {
    const key = ex.icon || 'arrow_nav', i = img[key]; if (!i) continue;
    const w = key === 'arrow_back' ? 150 : 200;
    const locked = ex.requires && !has(ex.requires) && !S.flags[`open_${ex.to}`];
    ctx.save();
    ctx.globalAlpha = locked ? .4 : .92;
    ctx.translate(ex.x, ex.y);
    const pu = 1 + Math.sin(t/480) * .035;
    ctx.scale(pu, pu);
    if (ex.dir === 'down') ctx.rotate(Math.PI / 2);
    const hh = i.height * w / i.width;
    ctx.drawImage(i, -w/2, -hh/2, w, hh);
    ctx.restore();
  }
}

function drawNader() {
  const n = img.nader; if (!n) return;
  const w = L.nader.w, h = n.height * w / n.width;
  const x = W - L.nader.right - w, y = L.nader.bottom - h;
  ctx.save();
  ctx.globalAlpha = .32; ctx.fillStyle = '#1F2A3D';
  ctx.beginPath(); ctx.ellipse(x + w/2, L.nader.bottom - 10, w*.36, 26, 0, 0, 7); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.shadowColor = 'rgba(240,201,138,.5)';
  ctx.shadowBlur = 30; ctx.shadowOffsetX = -14;
  ctx.drawImage(n, x, y, w, h);
  ctx.restore();
  dialog.headY = y + h * .06;
}

function drawTopBar() {
  drawImg(img.topbar, 0, L.topbar.y, W);
  const p = L.portrait;
  if (img.head) {
    ctx.save();
    ctx.beginPath(); ctx.arc(p.x + p.s/2, p.y + p.s/2, p.s/2, 0, 7); ctx.clip();
    ctx.drawImage(img.head, p.x, p.y, p.s, p.s);
    ctx.restore();
    ctx.strokeStyle = 'rgba(107,74,50,.85)'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(p.x + p.s/2, p.y + p.s/2, p.s/2 - 3, 0, 7); ctx.stroke();
  }
  drawImg(img.settings, L.settings.x, L.settings.y, L.settings.w);
  drawImg(img.help, L.help.x, L.help.y, null, L.help.h);

  drawImg(img.coinbar, L.coinbar.x, L.coinbar.y, L.coinbar.w);
  txt(String(S.coins), L.coinText.x, L.coinText.y, 58, '#F0E4C8', 'center', 700);

  drawImg(img[bagOpen ? 'bag_open' : 'bag_closed'], L.bag.x, L.bag.y, L.bag.w);
  if (S.inventory.length) {
    ctx.fillStyle = '#C9A227';
    ctx.beginPath(); ctx.arc(L.bag.x + L.bag.w - 16, L.bag.y + 20, 30, 0, 7); ctx.fill();
    txt(String(S.inventory.length), L.bag.x + L.bag.w - 16, L.bag.y + 22, 38, '#20180f', 'center', 700);
  }
}

function slotRects(c) {
  const total = c.count * c.size + (c.count - 1) * c.gap, x0 = (W - total) / 2;
  return Array.from({ length: c.count }, (_, k) => ({ x: x0 + k*(c.size + c.gap), y: c.y, s: c.size }));
}

function drawBottomBar() {
  drawImg(img.bottombar, 0, L.bottombar.y, W);
  if (sceneDone()) { txt(tr('done'), W/2, L.bottombar.y + 128, 56, '#C9A227'); return; }
  const targets = activeTargets();
  slotRects(L.slots).forEach((r, k) => {
    drawImg(img.slot, r.x, r.y, r.s, r.s);
    const id = targets[k]; if (!id) return;
    fitIn(img[`${S.scene}_${id}`], r.x + r.s*.15, r.y + r.s*.15, r.s*.7);
  });
}

function drawBag() {
  const c = L.invRow;
  ctx.fillStyle = 'rgba(20,16,12,.86)';
  ctx.fillRect(0, c.y - 34, W, c.size + 68);
  slotRects(c).forEach((r, k) => {
    drawImg(img.slot, r.x, r.y, r.s, r.s);
    const it = S.inventory[k]; if (!it) return;
    fitIn(img[it.img], r.x + r.s*.15, r.y + r.s*.15, r.s*.7);
  });
  if (!S.inventory.length) txt(tr('empty'), W/2, c.y + c.size/2, 44, '#8a7c66');
}

/* ---------- الفقاعة بتتقاس على النص ---------- */
function drawBubble() {
  const b = img.bubble; if (!b) return;
  const lines = dialog.text.split('\n');
  ctx.save();
  ctx.font = '400 52px system-ui, sans-serif';
  const tw = Math.max(...lines.map(l => ctx.measureText(l).width));
  ctx.restore();

  const w = Math.min(L.bubble.maxW, Math.max(L.bubble.minW, tw + L.bubble.padX * 2));
  const h = Math.max(330, lines.length * L.bubble.line + L.bubble.padTop + L.bubble.padBot);
  const x = 70;
  const y = Math.max(L.play.y + 40, (dialog.headY || 1100) - h - 30);

  drawImg(b, x, y, w, h);
  ctx.save();
  ctx.fillStyle = '#2b2118';
  ctx.font = '400 52px system-ui, sans-serif';
  ctx.textAlign = S.lang === 'ar' ? 'right' : 'left';
  ctx.textBaseline = 'top';
  ctx.direction = S.lang === 'ar' ? 'rtl' : 'ltr';
  const tx = S.lang === 'ar' ? x + w - L.bubble.padX : x + L.bubble.padX;
  lines.forEach((ln, k) => ctx.fillText(ln, tx, y + L.bubble.padTop + k * L.bubble.line));
  ctx.restore();
}

function drawToast() {
  const left = toast.until - performance.now();
  if (left < 0) { toast = null; return; }
  ctx.save();
  ctx.globalAlpha = Math.min(1, left / 400);
  const w = 760, h = 108, x = (W - w)/2, y = L.play.y + 50;
  ctx.fillStyle = 'rgba(20,16,12,.86)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 26); ctx.fill();
  txt(toast.text, W/2, y + h/2, 46);
  ctx.restore();
}
const say = (text, ms = 1400) => { toast = { text, until: performance.now() + ms }; };
const speak = k => { const d = DLG[k]; if (d) dialog = { text: d[S.lang] || d.en }; };

/* ---------- أنيميشن الالتقاط ---------- */
function drawFx() {
  fx = fx.filter(f => {
    const p = (performance.now() - f.t0) / f.dur;
    if (p >= 1) return false;
    const e = 1 - Math.pow(1 - p, 3);
    const cx = f.x + f.w/2, cy = f.y + f.h/2;
    ctx.save();
    ctx.globalAlpha = 1 - e;
    ctx.translate(cx, cy);
    const s = 1 + e * .55; ctx.scale(s, s);
    ctx.shadowColor = 'rgba(240,201,138,.9)';
    ctx.shadowBlur = 40 * (1 - e);
    if (f.img) ctx.drawImage(f.img, -f.w/2, -f.h/2, f.w, f.h);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = (1 - e) * .8;
    ctx.strokeStyle = '#F0C98A';
    ctx.lineWidth = 8 * (1 - e);
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(f.w, f.h) * (.5 + e * 1.1), 0, 7);
    ctx.stroke();
    ctx.restore();
    return true;
  });
}

/* ---------- اللمس ---------- */
const hit = (p, x, y, w, h) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;

function onTap(e) {
  const p = toGame(e);

  if (screen === 'menu') {
    if (hit(p, W - 160, H - 170, 140, 120)) { S.lang = S.lang === 'ar' ? 'en' : 'ar'; save(); return; }
    for (const b of menuBtns()) {
      if (!hit(p, b.x, b.y, b.w, b.h)) continue;
      if (b.k === 'cont' && b.on) enter(S.scene);
      if (b.k === 'chapters') screen = 'chapters';
      if (b.k === 'newg') { S.found = {}; S.inventory = []; S.flags = {}; S.coins = 1000; enter('ch1_s01'); }
      return;
    }
    return;
  }

  if (screen === 'chapters') {
    if (hit(p, 70, 180, 200, 200)) { screen = 'menu'; return; }
    const c = chapterCard();
    if (hit(p, c.x, c.y, c.w, c.h)) enter(S.started ? S.scene : 'ch1_s01');
    return;
  }

  if (dialog) { dialog = null; return; }

  if (hit(p, L.bag.x, L.bag.y, L.bag.w, L.bag.w)) { bagOpen = !bagOpen; return; }
  if (hit(p, L.settings.x, L.settings.y, L.settings.w, L.settings.w)) { screen = 'menu'; return; }
  if (hit(p, L.help.x - 40, L.help.y, 150, L.help.h)) {
    S.lang = S.lang === 'ar' ? 'en' : 'ar'; save();
    say(S.lang === 'ar' ? 'عربي' : 'English'); return;
  }
  if (bagOpen && p.y > L.invRow.y - 34 && p.y < L.invRow.y + L.invRow.size + 34) return;
  if (p.y > L.bottombar.y || p.y < L.play.y) return;

  for (const ex of cur.exits || []) {
    const r = ex.icon === 'arrow_back' ? 110 : 135;
    if (Math.hypot(p.x - ex.x, p.y - ex.y) > r) continue;
    if (ex.requires && !has(ex.requires) && !S.flags[`open_${ex.to}`]) { speak('locked_exit'); return; }
    if (ex.requires) S.flags[`open_${ex.to}`] = true;
    enter(ex.to); return;
  }

  const ord = { front:0, mid:1, back:2 };
  const list = [...cur.hotspots].filter(h => !isFound(h.id))
    .sort((a,b) => (ord[a.layer]??1) - (ord[b.layer]??1));
  for (const h of list) {
    const [rx, ry, rw, rh] = h.rect || [h.x, h.y, Math.max(h.w, TAP_MIN), Math.max(h.h, TAP_MIN)];
    if (hit(p, rx, ry, rw, rh)) { activate(h); return; }
  }
}

function activate(h) {
  const type = h.type || 'talk';
  if (type === 'container') {
    if (h.requires && !has(h.requires)) { speak('locked_box'); return; }
    take(h, true);
    if (h.dlg) speak(h.dlg);
    return;
  }
  if (type === 'tool') { take(h, true);  return; }   // → الشنطة
  if (type === 'find') { take(h, false); return; }   // → الشريط بس
  if (h.dlg) speak(h.dlg);
}

function take(h, toBag) {
  S.found[S.scene].push(h.id);
  const i = img[`${S.scene}_${h.id}`];
  if (i) fx.push({ img:i, x:h.x, y:h.y, w:h.w, h:h.h, t0:performance.now(), dur:420 });
  if (toBag && h.yields) S.inventory.push({ id:h.yields, img:`${S.scene}_${h.id}` });
  S.coins += 5;
  save();
  if (sceneDone()) setTimeout(() => say(tr('done'), 1800), 600);
}

boot();
