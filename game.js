/* ============================================================
   عين نادر · NADER'S EYE — محرك المشاهد
   Canvas خام، بدون مكتبات. كل حاجة بتتقاس من كانفاس 1290×2796.
   ============================================================ */

const W = 1290, H = 2796;

/* ---------- كل المقاسات هنا. عدّل من هنا بس. ---------- */
const L = {
  topbar:    { x: 0,    y: 30,   w: 1290 },
  portrait:  { x: 60,   y: 46,   w: 200  },
  settings:  { x: 1000, y: 78,   w: 150  },
  help:      { x: 1170, y: 78,   h: 150  },
  coinbar:   { x: 40,   y: 300,  w: 640  },
  coinText:  { x: 300,  y: 372 },
  bag:       { x: 1130, y: 470,  w: 240  },
  play:      { x: 0,    y: 280,  w: 1290, h: 2181 },
  bottombar: { x: 0,    y: 2470, w: 1290 },
  slots:     { y: 2510, size: 190, gap: 30, count: 4 },
  invRow:    { y: 2210, size: 190, gap: 24, count: 5 },
  bubble:    { x: 95,   y: 900,  w: 1100 },
  nader:     { x: 700,  y: 940,  h: 1500 },
};

const TAP_MIN = 120;
const SAVE_KEY = 'nader_eye_save';
const SAVE_VERSION = 1;

/* ---------- الحوار ---------- */
const DLG = {
  nail_line:    { ar: 'مسمار… وما فيش حاجة معلّقة عليه.\nالغبار حواليه بيرسم برواز.\nبرواز اتنين مش واحد.', en: 'A nail. Nothing on it.\nThe dust draws a frame around it.\nTwo frames. Not one.' },
  stairs_nail:  { ar: 'علامات بالقلم على الحيطة.\nطول واحد صغيّر، سنة ورا سنة.\nوبعدين وقفت.', en: 'Pencil marks on the wall.\nA child\'s height, year by year.\nThen they stop.' },
  cellar_nail:  { ar: 'الهوا هنا واقف من زمان.', en: 'The air down here has not moved in years.' },
  box_opened:   { ar: 'ملفوف في قماش.\n…وناقصه حتّة.', en: 'Wrapped in cloth.\n…and a piece of it is gone.' },
  locked_box:   { ar: 'مقفول. محتاج حاجة أفتحه بيها.', en: 'Locked. I need something to prise it open.' },
  locked_exit:  { ar: 'الباب مقفول.', en: 'The door is locked.' },
};

/* ---------- الحالة ---------- */
const S = {
  version: SAVE_VERSION,
  scene: 'ch1_s01',
  coins: 1000,
  inventory: [],
  found: {},        // { scene: [ids] }
  flags: {},
  lang: 'ar',
};

let scenes = {}, img = {}, cur = null;
let bagOpen = false, dialog = null, toast = null;
let canvas, ctx, scale = 1, offX = 0, offY = 0;
let t = 0;

/* ---------- تحميل ---------- */
const load = src => new Promise(res => {
  const i = new Image();
  i.onload = () => res(i);
  i.onerror = () => { console.warn('ناقص:', src); res(null); };
  i.src = src;
});

async function boot() {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');

  const ids = ['ch1_s01', 'ch1_s02', 'ch1_s03'];
  for (const id of ids) scenes[id] = await (await fetch(`data/${id}.json`)).json();

  const ui = ['topbar','bottombar','coinbar','bag_closed','bag_open','arrow_nav',
              'arrow_back','slot','bubble','coin','plus','settings','help','check','search'];
  for (const k of ui) img[k] = await load(`assets/ui/${k}.webp`);
  img.nader = await load('assets/char/nader_stand.webp');

  for (const id of ids) {
    img[`bg_${id}`] = await load(scenes[id].background);
    for (const h of scenes[id].hotspots) img[`${id}_${h.id}`] = await load(h.image);
  }

  loadSave();
  enter(S.scene);

  addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', onTap);
  resize();
  requestAnimationFrame(loop);
  document.getElementById('loading').remove();
}

/* ---------- الحفظ ---------- */
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d.version !== SAVE_VERSION) return;   // نسخة قديمة → ابدأ من جديد
    Object.assign(S, d);
  } catch (e) {}
}
function resetSave() { localStorage.removeItem(SAVE_KEY); location.reload(); }
window.resetSave = resetSave;

/* ---------- المشهد ---------- */
function enter(id) {
  S.scene = id;
  cur = scenes[id];
  if (!S.found[id]) S.found[id] = [];
  bagOpen = false;
  say(cur[S.lang === 'ar' ? 'title_ar' : 'title_en'], 1400);
  save();
}

const isFound = id => S.found[S.scene].includes(id);
const has = item => S.inventory.includes(item);

/* الأهداف اللي لسه مش متلاقية — أول 4 بس */
function activeTargets() {
  return cur.objectives.filter(o => !isFound(o)).slice(0, L.slots.count);
}

/* ---------- قياس الشاشة ---------- */
function resize() {
  const vw = innerWidth, vh = innerHeight;
  scale = Math.min(vw / W, vh / H);
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const r = canvas.getBoundingClientRect();
  offX = r.left; offY = r.top;
}
function toGame(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
}

/* ---------- الرسم ---------- */
function drawImg(i, x, y, w, h) {
  if (!i) return;
  if (w && !h) h = i.height * w / i.width;
  if (h && !w) w = i.width * h / i.height;
  ctx.drawImage(i, x, y, w || i.width, h || i.height);
}
function centered(i, cx, y, w) {
  if (!i) return;
  const h = i.height * w / i.width;
  drawImg(i, cx - w / 2, y, w, h);
}

function loop(ts) {
  t = ts;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#14100c';
  ctx.fillRect(0, 0, W, H);

  drawScene();
  if (dialog) drawDim();
  drawTopBar();
  drawBottomBar();
  if (bagOpen) drawBag();
  if (dialog) drawDialog();
  if (toast) drawToast();

  requestAnimationFrame(loop);
}

function drawScene() {
  const bg = img[`bg_${S.scene}`];
  if (bg) {
    // cover: يملا منطقة اللعب من غير ما يتشوّه
    const p = L.play;
    const s = Math.max(p.w / bg.width, p.h / bg.height);
    const dw = bg.width * s, dh = bg.height * s;
    ctx.save();
    ctx.beginPath(); ctx.rect(p.x, p.y, p.w, p.h); ctx.clip();
    ctx.drawImage(bg, p.x + (p.w - dw) / 2, p.y + (p.h - dh) / 2, dw, dh);
    ctx.restore();
  }

  const order = { back: 0, mid: 1, front: 2 };
  const list = [...cur.hotspots].sort((a, b) => (order[a.layer] ?? 1) - (order[b.layer] ?? 1));

  for (const h of list) {
    if (isFound(h.id)) continue;
    const i = img[`${S.scene}_${h.id}`];
    if (!i) continue;
    drawImg(i, h.x, h.y, h.w, h.h);
  }

  // نادر
  if (dialog && dialog.speaker && img.nader) {
    const n = img.nader, hh = L.nader.h, ww = n.width * hh / n.height;
    ctx.save();
    ctx.shadowColor = 'rgba(240,201,138,.55)'; ctx.shadowBlur = 28;
    ctx.shadowOffsetX = -10; ctx.shadowOffsetY = 0;
    ctx.drawImage(n, L.nader.x, L.nader.y, ww, hh);
    ctx.restore();
    ctx.save();  // ظل تحت الرجلين
    ctx.globalAlpha = .35; ctx.fillStyle = '#1F2A3D';
    ctx.beginPath();
    ctx.ellipse(L.nader.x + ww / 2, L.nader.y + hh - 12, ww * .34, 26, 0, 0, 7);
    ctx.fill(); ctx.restore();
  }

  // السهام
  for (const ex of cur.exits || []) {
    const key = ex.icon || 'arrow_nav';
    const i = img[key]; if (!i) continue;
    const w = key === 'arrow_back' ? 150 : 210;
    const pulse = 1 + Math.sin(t / 480) * .035;
    const locked = ex.requires && !has(ex.requires);
    ctx.save();
    ctx.globalAlpha = locked ? .45 : .9;
    ctx.translate(ex.x, ex.y);
    ctx.scale(pulse, pulse);
    if (ex.dir === 'down') ctx.rotate(Math.PI / 2);
    centered(i, 0, -w / 2, w);
    ctx.restore();
  }
}

function drawDim() {
  ctx.fillStyle = 'rgba(10,8,6,.6)';
  ctx.fillRect(L.play.x, L.play.y, L.play.w, L.play.h);
}

/* ---------- الواجهة ---------- */
function drawTopBar() {
  drawImg(img.topbar, L.topbar.x, L.topbar.y, L.topbar.w);
  if (img.nader) {
    const n = img.nader, w = L.portrait.w, h = w * 1.05;
    ctx.save();
    ctx.beginPath();
    ctx.arc(L.portrait.x + w / 2, L.portrait.y + h / 2, w / 2, 0, 7);
    ctx.clip();
    const s = w / n.width * 1.9;
    ctx.drawImage(n, L.portrait.x - w * .42, L.portrait.y - h * .12, n.width * s, n.height * s);
    ctx.restore();
  }
  drawImg(img.settings, L.settings.x, L.settings.y, L.settings.w);
  drawImg(img.help, L.help.x, L.help.y, null, L.help.h);

  drawImg(img.coinbar, L.coinbar.x, L.coinbar.y, L.coinbar.w);
  ctx.save();
  ctx.fillStyle = '#F0E4C8';
  ctx.font = '700 62px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(S.coins), L.coinText.x, L.coinText.y);
  ctx.restore();

  drawImg(img[bagOpen ? 'bag_open' : 'bag_closed'], L.bag.x, L.bag.y, L.bag.w);
  if (S.inventory.length) {
    ctx.save();
    ctx.fillStyle = '#C9A227';
    ctx.beginPath(); ctx.arc(L.bag.x + L.bag.w - 20, L.bag.y + 22, 30, 0, 7); ctx.fill();
    ctx.fillStyle = '#20180f';
    ctx.font = '700 38px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(S.inventory.length), L.bag.x + L.bag.w - 20, L.bag.y + 24);
    ctx.restore();
  }
}

function slotRects(cfg) {
  const total = cfg.count * cfg.size + (cfg.count - 1) * cfg.gap;
  const x0 = (W - total) / 2;
  return Array.from({ length: cfg.count }, (_, k) => ({
    x: x0 + k * (cfg.size + cfg.gap), y: cfg.y, s: cfg.size,
  }));
}

function drawBottomBar() {
  drawImg(img.bottombar, L.bottombar.x, L.bottombar.y, L.bottombar.w);
  const targets = activeTargets();
  slotRects(L.slots).forEach((r, k) => {
    drawImg(img.slot, r.x, r.y, r.s, r.s);
    const id = targets[k]; if (!id) return;
    const i = img[`${S.scene}_${id}`]; if (!i) return;
    const pad = r.s * .16, box = r.s - pad * 2;
    const s = Math.min(box / i.width, box / i.height);
    drawImg(i, r.x + (r.s - i.width * s) / 2, r.y + (r.s - i.height * s) / 2,
            i.width * s, i.height * s);
  });
}

function drawBag() {
  const cfg = L.invRow;
  ctx.fillStyle = 'rgba(20,16,12,.82)';
  ctx.fillRect(0, cfg.y - 34, W, cfg.size + 68);
  slotRects(cfg).forEach((r, k) => {
    drawImg(img.slot, r.x, r.y, r.s, r.s);
    const it = S.inventory[k]; if (!it) return;
    const i = img[it.img]; if (!i) return;
    const pad = r.s * .16, box = r.s - pad * 2;
    const s = Math.min(box / i.width, box / i.height);
    drawImg(i, r.x + (r.s - i.width * s) / 2, r.y + (r.s - i.height * s) / 2,
            i.width * s, i.height * s);
  });
  if (!S.inventory.length) {
    ctx.save();
    ctx.fillStyle = '#8a7c66'; ctx.font = '400 44px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(S.lang === 'ar' ? 'الشنطة فاضية' : 'Bag is empty', W / 2, cfg.y + cfg.size / 2);
    ctx.restore();
  }
}

function drawDialog() {
  const b = img.bubble; if (!b) return;
  const w = L.bubble.w, h = b.height * w / b.width;
  drawImg(b, L.bubble.x, L.bubble.y, w, h);
  ctx.save();
  ctx.fillStyle = '#2b2118';
  ctx.font = '400 52px system-ui, sans-serif';
  ctx.textAlign = S.lang === 'ar' ? 'right' : 'left';
  ctx.textBaseline = 'top';
  ctx.direction = S.lang === 'ar' ? 'rtl' : 'ltr';
  const lines = dialog.text.split('\n');
  const tx = S.lang === 'ar' ? L.bubble.x + w - 110 : L.bubble.x + 110;
  lines.forEach((ln, k) => ctx.fillText(ln, tx, L.bubble.y + 130 + k * 72));
  ctx.restore();
}

function drawToast() {
  if (performance.now() > toast.until) { toast = null; return; }
  ctx.save();
  ctx.globalAlpha = Math.min(1, (toast.until - performance.now()) / 400);
  ctx.fillStyle = 'rgba(20,16,12,.85)';
  const w = 700, h = 110, x = (W - w) / 2, y = L.play.y + 60;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 26); ctx.fill();
  ctx.fillStyle = '#F0E4C8';
  ctx.font = '600 48px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(toast.text, W / 2, y + h / 2);
  ctx.restore();
}

function say(text, ms = 1500) { toast = { text, until: performance.now() + ms }; }
function speak(key) {
  const d = DLG[key]; if (!d) return;
  dialog = { text: d[S.lang] || d.en, speaker: true };
}

/* ---------- اللمس ---------- */
function onTap(e) {
  const p = toGame(e);

  if (dialog) { dialog = null; return; }

  // البار
  if (hit(p, L.bag.x, L.bag.y, L.bag.w, L.bag.w)) { bagOpen = !bagOpen; return; }
  if (hit(p, L.settings.x, L.settings.y, L.settings.w, L.settings.w)) { say(S.lang === 'ar' ? 'الإعدادات — قريبًا' : 'Settings — soon'); return; }
  if (hit(p, L.help.x - 40, L.help.y, 140, L.help.h)) {
    S.lang = S.lang === 'ar' ? 'en' : 'ar'; save();
    say(S.lang === 'ar' ? 'عربي' : 'English'); return;
  }
  if (bagOpen && p.y > L.invRow.y - 34 && p.y < L.invRow.y + L.invRow.size + 34) return;
  if (p.y > L.bottombar.y || p.y < L.play.y) return;

  // السهام
  for (const ex of cur.exits || []) {
    const r = ex.icon === 'arrow_back' ? 110 : 140;
    if (Math.hypot(p.x - ex.x, p.y - ex.y) < r) {
      if (ex.requires && !has(ex.requires)) { speak('locked_exit'); return; }
      enter(ex.to); return;
    }
  }

  // الـ hotspots — الأقرب للكاميرا الأول
  const order = { front: 0, mid: 1, back: 2 };
  const list = [...cur.hotspots]
    .filter(h => !isFound(h.id))
    .sort((a, b) => (order[a.layer] ?? 1) - (order[b.layer] ?? 1));

  for (const h of list) {
    const [rx, ry, rw, rh] = h.rect || [h.x, h.y, Math.max(h.w, TAP_MIN), Math.max(h.h, TAP_MIN)];
    if (hit(p, rx, ry, rw, rh)) { activate(h); return; }
  }
}

const hit = (p, x, y, w, h) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;

function activate(h) {
  if (h.type === 'container') {
    if (h.requires && !has(h.requires)) { speak('locked_box'); return; }
    collect(h); if (h.dlg) speak(h.dlg);
    return;
  }
  if (h.type === 'line' || h.type === 'flavor') { if (h.dlg) speak(h.dlg); return; }
  if (h.type === 'pickup') { collect(h); return; }
  if (h.dlg) speak(h.dlg);
}

function collect(h) {
  S.found[S.scene].push(h.id);
  if (h.yields) {
    S.inventory.push({ id: h.yields, img: `${S.scene}_${h.id}` });
    S.coins += 5;
  }
  say(h.id, 900);
  save();

  if (cur.objectives.every(o => isFound(o))) {
    setTimeout(() => say(S.lang === 'ar' ? 'خلصت المشهد ✓' : 'Scene complete ✓', 1800), 700);
  }
}

boot();
