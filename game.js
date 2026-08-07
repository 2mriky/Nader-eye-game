/* ============================================================
   عين نادر · NADER'S EYE  —  v4
   Canvas خام. كانفاس 1290×2796. مفيش مكتبات.
   ============================================================ */

const W = 1290, H = 2796;

/* ---------- كل المقاسات هنا. عدّل من هنا بس. ---------- */
const L = {
  topbar:    { x: 0,    y: 42,  w: 1290 },
  settings:  { x: 940,  y: 96,  w: 130 },
  help:      { x: 1090, y: 96,  h: 130 },
  coinbar:   { x: 14,   y: 322, w: 470 },
  coinText:  { x: 300,  y: 382 },
  plus:      { x: 400,  y: 348, w: 84  },
  bag:       { x: 1010, y: 452, w: 250 },
  hint:      { x: 1040, y: 2160, h: 170 },
  play:      { x: 0,    y: 300, w: 1290, h: 2160 },
  bottombar: { x: 0,    y: 2470, w: 1290 },
  slots:     { y: 2520, size: 176, gap: 34, count: 4 },
  invRow:    { y: 2250, size: 172, gap: 22, count: 5 },
  nader:     { w: 470,  bottom: 2450, right: 55 },
  bubble:    { maxW: 1000, minW: 560, padX: 110, padTop: 105, padBot: 165, line: 74, size: 50 },
};

const TAP_MIN   = 140;
const HINT_COST = 50;
const SAVE_KEY  = 'nader_eye_save_v4';
const SAVE_VERSION = 4;
const SCENES = ['ch1_s01', 'ch1_s02', 'ch1_s03'];

/* شعاع النور المتحرك لكل مشهد: نقطة الدخول + الاتجاه + القوة */
const LIGHT = {
  ch1_s01: { x: 250,  y: 620,  a: 0.95, len: 1500, w: 380, dust: 26, alpha: .16 },
  ch1_s02: { x: 640,  y: 330,  a: 1.55, len: 1250, w: 300, dust: 16, alpha: .13 },
  ch1_s03: { x: 800,  y: 700,  a: 1.25, len: 1400, w: 260, dust: 30, alpha: .20 },
};

const T = {
  ar: { cont:'كمّل', chapters:'الفصول', newg:'من الأول', empty:'الشنطة فاضية',
        done:'خلص المشهد ✓', locked:'مقفول', ch1:'الفصل الأول — المسمار الفاضي',
        cheer:'خلّصت الفصل الأول', cheerSub:'الخريطة اتفتحت', toMap:'للخريطة',
        nofit:'مش هينفع هنا', shop:'المتجر', buy:'شراء', settings:'الإعدادات',
        music:'موسيقى', sfx:'مؤثرات', lang:'اللغة', nocoins:'الدمغات مش كفاية',
        hintNone:'مفيش حاجة فاضلة', bought:'تمام ✓' },
  en: { cont:'Continue', chapters:'Chapters', newg:'New Game', empty:'Bag is empty',
        done:'Scene complete ✓', locked:'Locked', ch1:'Chapter 1 — The Empty Nail',
        cheer:'Chapter One complete', cheerSub:'The map is open', toMap:'To the map',
        nofit:"That doesn't fit here", shop:'Shop', buy:'Buy', settings:'Settings',
        music:'Music', sfx:'Sounds', lang:'Language', nocoins:'Not enough seals',
        hintNone:'Nothing left to find', bought:'Done ✓' },
};

const PACKS = [
  { id:'p1', coins:500,  price:'$0.99', tag:'' },
  { id:'p2', coins:1600, price:'$2.99', tag:'★' },
  { id:'p3', coins:6000, price:'$9.99', tag:'' },
];

const DLG = {
  nail_line:   { ar:'مسمار… وما فيش حاجة معلّقة عليه.\nالغبار حواليه بيرسم برواز.\nبرواز اتنين، مش واحد.', en:'A nail. Nothing hanging on it.\nThe dust draws a frame around it.\nTwo frames. Not one.' },
  stairs_nail: { ar:'علامات بالقلم على الحيطة.\nطول واحد صغيّر، سنة ورا سنة.\nوبعدين وقفت.', en:'Pencil marks on the wall.\nA child\'s height, year by year.\nThen they stop.' },
  cellar_nail: { ar:'الهوا هنا واقف من زمان.', en:'The air down here has not moved in years.' },
  box_opened:  { ar:'ملفوف في قماش.\n…وناقصه حتّة.', en:'Wrapped in cloth.\n…and a piece of it is gone.' },
  locked_box:  { ar:'مقفول. محتاج حاجة أفتحه بيها.', en:'Locked. I need something to prise it open.' },
  locked_exit: { ar:'الباب مقفول.', en:'The door is locked.' },
};

const S = { version:SAVE_VERSION, scene:'ch1_s01', coins:1000, inventory:[],
            found:{}, flags:{}, lang:'ar', started:false, music:true, sfx:true };

let scenes = {}, img = {}, cur = null;
let screen = 'loading', overlay = null;          // overlay: shop | settings
let bagOpen = false, dialog = null, toast = null;
let fx = [], drag = null, hintGlow = null, dust = [];
let canvas, ctx, scale = 1, dpr = 1, t = 0;
const tr = k => T[S.lang][k];

const load = src => new Promise(r => {
  const i = new Image();
  i.onload = () => r(i);
  i.onerror = () => { console.warn('ناقص:', src); r(null); };
  i.src = src;
});

async function boot() {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');

  for (const id of SCENES) scenes[id] = await (await fetch(`data/${id}.json`)).json();
  for (const k of ['topbar','bottombar','coinbar','bag_closed','bag_open','arrow_nav',
                   'bubble','settings','help','check','plus','hint','close','play',
                   'speaker','globe','drag','magnify'])
    img[k] = await load(`assets/ui/${k}.webp`);
  img.nader  = await load('assets/char/nader_stand.webp');
  img.poster = await load('assets/ui/poster.webp');

  for (const id of SCENES) {
    img[`bg_${id}`] = await load(scenes[id].background);
    for (const h of scenes[id].hotspots) img[`${id}_${h.id}`] = await load(h.image);
  }

  loadSave();
  screen = 'menu';
  addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', () => { drag = null; });
  resize();
  requestAnimationFrame(loop);
  const el = document.getElementById('loading'); if (el) el.remove();
}

const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch(e){} };
function loadSave() {
  try { const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
        if (d && d.version === SAVE_VERSION) Object.assign(S, d); } catch(e){}
}
window.resetSave = () => { localStorage.removeItem(SAVE_KEY); location.reload(); };

/* ---------- المشهد ---------- */
function enter(id) {
  S.scene = id; cur = scenes[id];
  if (!S.found[id]) S.found[id] = [];
  bagOpen = false; dialog = null; overlay = null; fx = []; drag = null; hintGlow = null;
  screen = 'game'; S.started = true;
  makeDust();
  say(cur[S.lang === 'ar' ? 'title_ar' : 'title_en'], 1300);
  save();
}
const isFound = id => (S.found[S.scene] || []).includes(id);
const has = it => S.inventory.some(i => i.id === it);
const activeTargets = () => cur.objectives.filter(o => !isFound(o)).slice(0, L.slots.count);
const sceneDone = () => cur.objectives.every(isFound);
const chapterDone = () =>
  SCENES.every(s => (scenes[s].objectives||[]).every(o => (S.found[s]||[]).includes(o)));

function makeDust() {
  const cfg = LIGHT[S.scene]; dust = [];
  if (!cfg) return;
  for (let i = 0; i < cfg.dust; i++)
    dust.push({ u: Math.random(), v: Math.random()*2 - 1,
                sp: .012 + Math.random()*.028, r: 2 + Math.random()*4,
                ph: Math.random()*7 });
}

/* ---------- قياس + ريتينا ---------- */
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  scale = Math.min(innerWidth / W, innerHeight / H);
  canvas.width  = Math.round(W * scale * dpr);
  canvas.height = Math.round(H * scale * dpr);
  canvas.style.width  = Math.round(W * scale) + 'px';
  canvas.style.height = Math.round(H * scale) + 'px';
}
const toGame = e => {
  const r = canvas.getBoundingClientRect();
  return { x:(e.clientX - r.left)/scale, y:(e.clientY - r.top)/scale };
};

/* ---------- أدوات رسم ---------- */
function drawImg(i, x, y, w, h) {
  if (!i) return;
  if (w && !h) h = i.height*w/i.width;
  if (h && !w) w = i.width*h/i.height;
  ctx.drawImage(i, x, y, w || i.width, h || i.height);
}
function fitIn(i, x, y, box) {
  if (!i) return;
  const s = Math.min(box/i.width, box/i.height);
  drawImg(i, x + (box - i.width*s)/2, y + (box - i.height*s)/2, i.width*s, i.height*s);
}
function txt(s, x, y, size, col='#F0E4C8', align='center', weight=600) {
  ctx.save();
  ctx.fillStyle = col;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.direction = S.lang === 'ar' ? 'rtl' : 'ltr';
  ctx.fillText(s, x, y);
  ctx.restore();
}
function drawSlot(x, y, s) {
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, s, s, s*.17);
  ctx.fillStyle = 'rgba(28,21,14,.5)'; ctx.fill();
  ctx.strokeStyle = 'rgba(18,13,8,.6)'; ctx.lineWidth = 7; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(x+5, y+5, s-10, s-10, s*.15);
  ctx.strokeStyle = 'rgba(196,168,131,.2)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
}
function panel(x, y, w, h, r = 32) {
  ctx.save();
  ctx.fillStyle = 'rgba(30,23,16,.97)';
  ctx.strokeStyle = '#6B4A32'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function button(x, y, w, h, label, primary = false, size = 56) {
  ctx.save();
  ctx.fillStyle = primary ? '#C9A227' : 'rgba(52,42,30,.95)';
  ctx.strokeStyle = '#6B4A32'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 26); ctx.fill(); ctx.stroke();
  ctx.restore();
  txt(label, x + w/2, y + h/2, size, primary ? '#20180f' : '#F0E4C8', 'center', 700);
}

/* ---------- اللوب ---------- */
function loop(ts) {
  t = ts;
  ctx.setTransform(scale*dpr, 0, 0, scale*dpr, 0, 0);
  ctx.fillStyle = '#14100c'; ctx.fillRect(0, 0, W, H);

  if (screen === 'menu') drawMenu();
  else if (screen === 'chapters') drawChapters();
  else if (screen === 'cheer') drawCheer();
  else if (screen === 'game') drawGame();

  if (overlay === 'shop') drawShop();
  if (overlay === 'settings') drawSettings();
  if (toast) drawToast();
  requestAnimationFrame(loop);
}

/* ---------- المينيو ---------- */
const menuBtns = () => {
  const w = 720, h = 170, x = (W - w)/2;
  return [{ k:'cont', x, y:1380, w, h, on:S.started },
          { k:'chapters', x, y:1600, w, h, on:true },
          { k:'newg', x, y:1820, w, h, on:true }];
};
function drawMenu() {
  const bg = img.poster || img.bg_ch1_s01;
  if (bg) { const s = Math.max(W/bg.width, H/bg.height);
            ctx.drawImage(bg, (W-bg.width*s)/2, (H-bg.height*s)/2, bg.width*s, bg.height*s); }
  ctx.fillStyle = 'rgba(14,11,8,.66)'; ctx.fillRect(0, 0, W, H);
  txt('عين نادر', W/2, 1120, 122, '#F0C98A', 'center', 700);
  txt("NADER'S EYE", W/2, 1236, 58, '#a08f74', 'center', 600);
  for (const b of menuBtns()) {
    ctx.save(); ctx.globalAlpha = b.on ? 1 : .35;
    button(b.x, b.y, b.w, b.h, tr(b.k), b.k === 'cont', 60);
    ctx.restore();
  }
  drawImg(img.globe, W - 190, H - 230, null, 120);
  drawImg(img.settings, 70, H - 230, 130);
}

/* ---------- الفصول ---------- */
const chapterCard = () => ({ x:145, y:900, w:1000, h:760 });
function drawChapters() {
  ctx.fillStyle = '#1a1510'; ctx.fillRect(0, 0, W, H);
  txt(S.lang === 'ar' ? 'الفصول' : 'Chapters', W/2, 420, 96, '#F0C98A');
  const c = chapterCard(), bg = img.bg_ch1_s01;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 24); ctx.clip();
  if (bg) { const s = Math.max(c.w/bg.width, (c.h-150)/bg.height);
            ctx.drawImage(bg, c.x + (c.w-bg.width*s)/2, c.y - 300, bg.width*s, bg.height*s); }
  ctx.fillStyle = 'rgba(20,16,12,.55)'; ctx.fillRect(c.x, c.y + c.h - 150, c.w, 150);
  ctx.restore();
  ctx.strokeStyle = chapterDone() ? '#C9A227' : '#6B4A32'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 24); ctx.stroke();
  drawImg(img.play, c.x + c.w - 190, c.y + c.h - 320, 140);
  txt((chapterDone() ? '✓ ' : '') + tr('ch1'), c.x + c.w/2, c.y + c.h - 75, 50, '#F0E4C8');

  ctx.save(); ctx.globalAlpha = .3; ctx.fillStyle = '#2a2018';
  ctx.beginPath(); ctx.roundRect(c.x, c.y + c.h + 60, c.w, 230, 24); ctx.fill(); ctx.restore();
  txt('🔒 ' + tr('locked'), W/2, c.y + c.h + 175, 52, '#6b5c48');

  ctx.save(); ctx.translate(160, 270); ctx.rotate(Math.PI); drawImg(img.arrow_nav, -80, -80, 160); ctx.restore();
}

/* ---------- التهنئة ---------- */
const cheerBtn = () => ({ x:(W-640)/2, y:1900, w:640, h:170 });
function drawCheer() {
  const bg = img.bg_ch1_s03;
  if (bg) { const s = Math.max(W/bg.width, H/bg.height);
            ctx.drawImage(bg, (W-bg.width*s)/2, (H-bg.height*s)/2, bg.width*s, bg.height*s); }
  ctx.fillStyle = 'rgba(14,11,8,.8)'; ctx.fillRect(0, 0, W, H);
  const p = 1 + Math.sin(t/700)*.04;
  ctx.save(); ctx.globalAlpha = .9; ctx.strokeStyle = '#C9A227'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(W/2, 1080, 210*p, 0, 7); ctx.stroke(); ctx.restore();
  fitIn(img.check, W/2 - 110, 970, 220);
  txt(tr('cheer'), W/2, 1440, 76, '#F0E4C8');
  txt(tr('cheerSub'), W/2, 1560, 50, '#a08f74');
  const b = cheerBtn(); button(b.x, b.y, b.w, b.h, tr('toMap'), true, 58);
}

/* ---------- اللعب ---------- */
function drawGame() {
  drawScene();
  drawLight();
  if (dialog) {
    ctx.fillStyle = 'rgba(10,8,6,.62)'; ctx.fillRect(L.play.x, L.play.y, L.play.w, L.play.h);
    drawNader();
  }
  drawTopBar();
  drawBottomBar();
  if (bagOpen) drawBag();
  if (dialog) drawBubble();
  drawFx();
  if (drag) drawDrag();
}

function drawScene() {
  const bg = img[`bg_${S.scene}`];
  if (bg) ctx.drawImage(bg, 0, 0, W, H);

  const ord = { back:0, mid:1, front:2 };
  const targets = activeTargets();
  for (const h of [...cur.hotspots].sort((a,b)=>(ord[a.layer]??1)-(ord[b.layer]??1))) {
    if (isFound(h.id)) continue;
    const i = img[`${S.scene}_${h.id}`]; if (!i) continue;
    const lit  = drag && h.requires === drag.item.id;
    const hint = hintGlow === h.id && performance.now() < hintGlow.until;
    if (lit || hintGlow === h.id || targets.includes(h.id)) {
      const fast = lit || hintGlow === h.id;
      const g = (Math.sin(t/(fast?280:700)) + 1)/2;
      ctx.save();
      ctx.shadowColor = `rgba(240,201,138,${fast ? .5+g*.4 : .14+g*.18})`;
      ctx.shadowBlur = (fast ? 45 : 22) + g*16;
      drawImg(i, h.x, h.y, h.w, h.h);
      ctx.restore();
    } else drawImg(i, h.x, h.y, h.w, h.h);
  }

  for (const ex of cur.exits || []) {
    const i = img.arrow_nav; if (!i) continue;
    const w = 190;
    const locked = ex.requires && !has(ex.requires) && !S.flags[`open_${ex.to}`];
    ctx.save();
    ctx.globalAlpha = locked ? .4 : .92;
    ctx.translate(ex.x, ex.y);
    const pu = 1 + Math.sin(t/480)*.035; ctx.scale(pu, pu);
    const rot = { back:Math.PI, down:Math.PI/2, up:-Math.PI/2 }[ex.dir] || 0;
    ctx.rotate(rot);
    ctx.drawImage(i, -w/2, -w/2, w, w*i.height/i.width);
    ctx.restore();
  }
}

/* شعاع نور بيتنفّس + تراب عايم */
function drawLight() {
  const c = LIGHT[S.scene]; if (!c) return;
  const sway = Math.sin(t/4200) * .045;
  const a = c.a + sway;
  const dx = Math.cos(a), dy = Math.sin(a);
  const ex = c.x + dx*c.len, ey = c.y + dy*c.len;
  const px = -dy, py = dx;

  const g = ctx.createLinearGradient(c.x, c.y, ex, ey);
  const pulse = c.alpha * (.82 + .18*Math.sin(t/2600));
  g.addColorStop(0, `rgba(255,232,180,${pulse})`);
  g.addColorStop(.55, `rgba(255,226,168,${pulse*.45})`);
  g.addColorStop(1, 'rgba(255,220,160,0)');

  ctx.save();
  ctx.beginPath(); ctx.rect(L.play.x, L.play.y, L.play.w, L.play.h); ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(c.x + px*c.w*.22, c.y + py*c.w*.22);
  ctx.lineTo(c.x - px*c.w*.22, c.y - py*c.w*.22);
  ctx.lineTo(ex - px*c.w, ey - py*c.w);
  ctx.lineTo(ex + px*c.w, ey + py*c.w);
  ctx.closePath(); ctx.fill();

  for (const d of dust) {
    d.u += d.sp/60; if (d.u > 1) d.u -= 1;
    const spread = c.w * (.22 + d.u*.78);
    const wob = Math.sin(t/900 + d.ph) * 26;
    const x = c.x + dx*c.len*d.u + px*(d.v*spread + wob);
    const y = c.y + dy*c.len*d.u + py*(d.v*spread + wob);
    ctx.globalAlpha = (1 - d.u) * .5 * (.6 + .4*Math.sin(t/700 + d.ph));
    ctx.fillStyle = '#FFE9BE';
    ctx.beginPath(); ctx.arc(x, y, d.r, 0, 7); ctx.fill();
  }
  ctx.restore();
}

function drawNader() {
  const n = img.nader; if (!n) return;
  const w = L.nader.w, h = n.height*w/n.width;
  const x = W - L.nader.right - w, y = L.nader.bottom - h;
  ctx.save(); ctx.globalAlpha = .32; ctx.fillStyle = '#1F2A3D';
  ctx.beginPath(); ctx.ellipse(x + w/2, L.nader.bottom - 10, w*.36, 26, 0, 0, 7); ctx.fill(); ctx.restore();
  ctx.save(); ctx.shadowColor = 'rgba(240,201,138,.5)';
  ctx.shadowBlur = 30; ctx.shadowOffsetX = -14;
  ctx.drawImage(n, x, y, w, h); ctx.restore();
  dialog.headY = y + h*.06;
}

function drawTopBar() {
  drawImg(img.topbar, L.topbar.x, L.topbar.y, L.topbar.w);
  drawImg(img.settings, L.settings.x, L.settings.y, L.settings.w);
  drawImg(img.help, L.help.x, L.help.y, null, L.help.h);
  drawImg(img.coinbar, L.coinbar.x, L.coinbar.y, L.coinbar.w);
  txt(String(S.coins), L.coinText.x, L.coinText.y, 52, '#F0E4C8', 'center', 700);

  drawImg(img[bagOpen ? 'bag_open' : 'bag_closed'], L.bag.x, L.bag.y, L.bag.w);
  if (S.inventory.length) {
    ctx.fillStyle = '#C9A227';
    ctx.beginPath(); ctx.arc(L.bag.x + L.bag.w - 22, L.bag.y + 24, 30, 0, 7); ctx.fill();
    txt(String(S.inventory.length), L.bag.x + L.bag.w - 22, L.bag.y + 26, 38, '#20180f', 'center', 700);
  }
  if (!sceneDone()) {
    const p = 1 + Math.sin(t/900)*.03;
    ctx.save(); ctx.translate(L.hint.x, L.hint.y); ctx.scale(p, p);
    drawImg(img.hint, -L.hint.h*.28, -L.hint.h/2, null, L.hint.h);
    ctx.restore();
    txt(String(HINT_COST), L.hint.x + 8, L.hint.y + L.hint.h*.62, 36, '#C9A227');
  }
}

const slotRects = c => {
  const total = c.count*c.size + (c.count-1)*c.gap, x0 = (W - total)/2;
  return Array.from({length:c.count}, (_,k) => ({ x:x0 + k*(c.size+c.gap), y:c.y, s:c.size }));
};

function drawBottomBar() {
  drawImg(img.bottombar, L.bottombar.x, L.bottombar.y, L.bottombar.w);
  if (sceneDone()) { txt(tr('done'), W/2, L.bottombar.y + 128, 54, '#C9A227'); return; }
  const targets = activeTargets();
  slotRects(L.slots).forEach((r, k) => {
    drawSlot(r.x, r.y, r.s);
    const id = targets[k]; if (!id) return;
    fitIn(img[`${S.scene}_${id}`], r.x + r.s*.15, r.y + r.s*.15, r.s*.7);
  });
}

function drawBag() {
  const c = L.invRow;
  ctx.fillStyle = 'rgba(20,16,12,.9)';
  ctx.fillRect(0, c.y - 34, W, c.size + 68);
  slotRects(c).forEach((r, k) => {
    drawSlot(r.x, r.y, r.s);
    const it = S.inventory[k];
    if (!it || (drag && drag.index === k)) return;
    fitIn(img[it.img], r.x + r.s*.15, r.y + r.s*.15, r.s*.7);
  });
  if (!S.inventory.length) txt(tr('empty'), W/2, c.y + c.size/2, 44, '#a08f74');
  else if (img.drag) {
    ctx.save(); ctx.globalAlpha = .35 + .25*Math.sin(t/800);
    drawImg(img.drag, W - 150, c.y + c.size/2 - 45, 100); ctx.restore();
  }
}

function drawDrag() {
  const i = img[drag.item.img]; if (!i) return;
  ctx.save(); ctx.globalAlpha = .95;
  ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 12;
  fitIn(i, drag.x - 105, drag.y - 165, 210);
  ctx.restore();
}

/* ---------- المتجر ---------- */
const shopRows = () => PACKS.map((p, k) => ({ ...p, x:150, y:900 + k*280, w:990, h:220 }));
function drawShop() {
  ctx.fillStyle = 'rgba(8,6,4,.86)'; ctx.fillRect(0, 0, W, H);
  panel(90, 620, 1110, 1500);
  txt(tr('shop'), W/2, 740, 82, '#F0C98A');
  drawImg(img.close, 1050, 660, 110);
  for (const r of shopRows()) {
    ctx.save();
    ctx.fillStyle = 'rgba(52,42,30,.95)';
    ctx.strokeStyle = r.tag ? '#C9A227' : '#6B4A32'; ctx.lineWidth = r.tag ? 7 : 5;
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 26); ctx.fill(); ctx.stroke();
    ctx.restore();
    drawImg(img.coinbar, r.x + 30, r.y + 62, 260);
    txt(String(r.coins), r.x + 195, r.y + 110, 46, '#F0E4C8', 'center', 700);
    button(r.x + r.w - 300, r.y + 55, 250, 110, r.price, !!r.tag, 46);
    if (r.tag) txt('★', r.x + r.w - 60, r.y + 34, 44, '#C9A227');
  }
  txt(S.lang === 'ar' ? 'الشراء تجريبي دلوقتي' : 'Purchases are simulated',
      W/2, 2020, 38, '#8a7c66');
}

/* ---------- الإعدادات ---------- */
const setRows = () => ([
  { k:'music', icon:'speaker', y:900,  val:S.music },
  { k:'sfx',   icon:'magnify', y:1140, val:S.sfx   },
  { k:'lang',  icon:'globe',   y:1380, val:null    },
]);
function drawSettings() {
  ctx.fillStyle = 'rgba(8,6,4,.86)'; ctx.fillRect(0, 0, W, H);
  panel(90, 620, 1110, 1240);
  txt(tr('settings'), W/2, 740, 82, '#F0C98A');
  drawImg(img.close, 1050, 660, 110);
  for (const r of setRows()) {
    drawImg(img[r.icon], 190, r.y - 55, 110);
    txt(tr(r.k), 350, r.y, 54, '#F0E4C8', S.lang === 'ar' ? 'right' : 'left');
    const on = r.k === 'lang' ? true : r.val;
    const bx = 880, bw = 210, bh = 96;
    ctx.save();
    ctx.fillStyle = on ? '#C9A227' : 'rgba(52,42,30,.95)';
    ctx.strokeStyle = '#6B4A32'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(bx, r.y - bh/2, bw, bh, 24); ctx.fill(); ctx.stroke();
    ctx.restore();
    const label = r.k === 'lang' ? (S.lang === 'ar' ? 'عربي' : 'EN') : (on ? 'ON' : 'OFF');
    txt(label, bx + bw/2, r.y, 44, on ? '#20180f' : '#a08f74', 'center', 700);
  }
  button((W-560)/2, 1650, 560, 130, tr('newg'), false, 50);
}

/* ---------- فقاعة + توست + fx ---------- */
function wrap(text, maxW) {
  ctx.save(); ctx.font = `400 ${L.bubble.size}px system-ui, sans-serif`;
  const out = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = word; }
      else line = test;
    }
    out.push(line);
  }
  ctx.restore(); return out;
}
function drawBubble() {
  const b = img.bubble; if (!b) return;
  const lines = wrap(dialog.text, L.bubble.maxW - L.bubble.padX*2);
  ctx.save(); ctx.font = `400 ${L.bubble.size}px system-ui, sans-serif`;
  const tw = Math.max(...lines.map(l => ctx.measureText(l).width)); ctx.restore();
  const w = Math.min(L.bubble.maxW, Math.max(L.bubble.minW, tw + L.bubble.padX*2));
  const h = Math.max(340, lines.length*L.bubble.line + L.bubble.padTop + L.bubble.padBot);
  const x = 70, y = Math.max(L.play.y + 50, (dialog.headY || 1100) - h - 30);
  drawImg(b, x, y, w, h);
  ctx.save();
  ctx.fillStyle = '#2b2118';
  ctx.font = `400 ${L.bubble.size}px system-ui, sans-serif`;
  ctx.textAlign = S.lang === 'ar' ? 'right' : 'left';
  ctx.textBaseline = 'top';
  ctx.direction = S.lang === 'ar' ? 'rtl' : 'ltr';
  const tx = S.lang === 'ar' ? x + w - L.bubble.padX : x + L.bubble.padX;
  lines.forEach((ln, k) => ctx.fillText(ln, tx, y + L.bubble.padTop + k*L.bubble.line));
  ctx.restore();
}
function drawToast() {
  const left = toast.until - performance.now();
  if (left < 0) { toast = null; return; }
  ctx.save(); ctx.globalAlpha = Math.min(1, left/400);
  const w = 800, h = 108, x = (W-w)/2, y = L.play.y + 70;
  ctx.fillStyle = 'rgba(20,16,12,.9)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 26); ctx.fill();
  txt(toast.text, W/2, y + h/2, 46); ctx.restore();
}
const say = (text, ms=1400) => { toast = { text, until: performance.now() + ms }; };
const speak = k => { const d = DLG[k]; if (d) dialog = { text: d[S.lang] || d.en }; };

function drawFx() {
  fx = fx.filter(f => {
    const p = (performance.now() - f.t0)/f.dur; if (p >= 1) return false;
    const e = 1 - Math.pow(1-p, 3), cx = f.x + f.w/2, cy = f.y + f.h/2;
    ctx.save(); ctx.globalAlpha = 1-e; ctx.translate(cx, cy);
    const s = 1 + e*.55; ctx.scale(s, s);
    ctx.shadowColor = 'rgba(240,201,138,.9)'; ctx.shadowBlur = 40*(1-e);
    if (f.img) ctx.drawImage(f.img, -f.w/2, -f.h/2, f.w, f.h);
    ctx.restore();
    ctx.save(); ctx.globalAlpha = (1-e)*.8;
    ctx.strokeStyle = '#F0C98A'; ctx.lineWidth = 8*(1-e);
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(f.w,f.h)*(.5 + e*1.1), 0, 7); ctx.stroke();
    ctx.restore();
    return true;
  });
}

/* ---------- اللمس ---------- */
const hit = (p,x,y,w,h) => p.x >= x && p.x <= x+w && p.y >= y && p.y <= y+h;

function onDown(e) {
  const p = toGame(e);

  if (overlay === 'shop') {
    if (hit(p, 1040, 650, 140, 140)) { overlay = null; return; }
    for (const r of shopRows())
      if (hit(p, r.x + r.w - 300, r.y + 55, 250, 110)) {
        S.coins += r.coins; save(); say(tr('bought'), 1200); return;
      }
    return;
  }
  if (overlay === 'settings') {
    if (hit(p, 1040, 650, 140, 140)) { overlay = null; return; }
    for (const r of setRows())
      if (hit(p, 880, r.y - 48, 210, 96)) {
        if (r.k === 'lang') S.lang = S.lang === 'ar' ? 'en' : 'ar';
        else S[r.k] = !S[r.k];
        save(); return;
      }
    if (hit(p, (W-560)/2, 1650, 560, 130)) {
      S.found = {}; S.inventory = []; S.flags = {}; S.coins = 1000;
      overlay = null; enter('ch1_s01'); return;
    }
    return;
  }

  if (screen === 'menu') {
    if (hit(p, W-210, H-250, 160, 160)) { S.lang = S.lang === 'ar' ? 'en' : 'ar'; save(); return; }
    if (hit(p, 60, H-240, 160, 160)) { overlay = 'settings'; return; }
    for (const b of menuBtns()) {
      if (!hit(p, b.x, b.y, b.w, b.h)) continue;
      if (b.k === 'cont' && b.on) enter(S.scene);
      if (b.k === 'chapters') screen = 'chapters';
      if (b.k === 'newg') { S.found={}; S.inventory=[]; S.flags={}; S.coins=1000; enter('ch1_s01'); }
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
  if (screen === 'cheer') {
    const b = cheerBtn();
    if (hit(p, b.x, b.y, b.w, b.h)) screen = 'chapters';
    return;
  }

  if (dialog) { dialog = null; return; }

  if (bagOpen) {
    const rs = slotRects(L.invRow);
    for (let k = 0; k < rs.length; k++) {
      if (!S.inventory[k]) continue;
      if (hit(p, rs[k].x, rs[k].y, rs[k].s, rs[k].s)) {
        drag = { item:S.inventory[k], index:k, x:p.x, y:p.y, moved:false }; return;
      }
    }
  }

  if (hit(p, L.bag.x, L.bag.y, L.bag.w, L.bag.w)) { bagOpen = !bagOpen; return; }
  if (hit(p, L.settings.x - 20, L.settings.y - 20, 170, 170)) { overlay = 'settings'; return; }
  if (hit(p, L.help.x - 30, L.help.y - 20, 160, 170)) { screen = 'menu'; return; }
  if (hit(p, L.coinbar.x, L.coinbar.y - 10, L.coinbar.w + 40, 150)) { overlay = 'shop'; return; }
  if (!sceneDone() && hit(p, L.hint.x - 90, L.hint.y - 100, 220, 220)) { useHint(); return; }
  if (bagOpen) { bagOpen = false; return; }
  if (p.y > L.bottombar.y) return;

  for (const ex of cur.exits || []) {
    if (Math.hypot(p.x - ex.x, p.y - ex.y) > 130) continue;
    if (ex.requires && !has(ex.requires) && !S.flags[`open_${ex.to}`]) { speak('locked_exit'); return; }
    if (ex.requires) S.flags[`open_${ex.to}`] = true;
    enter(ex.to); return;
  }
  if (p.y < L.play.y) return;

  const ord = { front:0, mid:1, back:2 };
  for (const h of [...cur.hotspots].filter(h => !isFound(h.id))
        .sort((a,b)=>(ord[a.layer]??1)-(ord[b.layer]??1))) {
    const [rx,ry,rw,rh] = h.rect || [h.x, h.y, Math.max(h.w,TAP_MIN), Math.max(h.h,TAP_MIN)];
    if (hit(p, rx, ry, rw, rh)) { activate(h); return; }
  }
}

function onMove(e) {
  if (!drag) return;
  const p = toGame(e);
  if (Math.hypot(p.x - drag.x, p.y - drag.y) > 18) drag.moved = true;
  drag.x = p.x; drag.y = p.y;
}

function onUp() {
  if (!drag) return;
  const d = drag; drag = null;
  if (!d.moved) return;
  const p = { x:d.x, y:d.y - 60 };
  for (const h of cur.hotspots) {
    if (isFound(h.id)) continue;
    const [rx,ry,rw,rh] = h.rect || [h.x, h.y, Math.max(h.w,TAP_MIN), Math.max(h.h,TAP_MIN)];
    if (!hit(p, rx, ry, rw, rh)) continue;
    if (h.requires === d.item.id) {
      S.inventory.splice(d.index, 1);
      take(h, true); if (h.dlg) speak(h.dlg); bagOpen = false; return;
    }
    say(tr('nofit'), 1100); return;
  }
}

function useHint() {
  const left = cur.objectives.filter(o => !isFound(o));
  if (!left.length) { say(tr('hintNone'), 1200); return; }
  if (S.coins < HINT_COST) { overlay = 'shop'; say(tr('nocoins'), 1400); return; }
  S.coins -= HINT_COST;
  hintGlow = left[0];
  setTimeout(() => { if (hintGlow === left[0]) hintGlow = null; }, 3000);
  save();
}

function activate(h) {
  const type = h.type || 'talk';
  if (type === 'container') {
    if (h.requires && !has(h.requires)) { speak('locked_box'); return; }
    const k = S.inventory.findIndex(i => i.id === h.requires);
    if (k >= 0) S.inventory.splice(k, 1);
    take(h, true); if (h.dlg) speak(h.dlg); return;
  }
  if (type === 'tool') { take(h, true);  return; }
  if (type === 'find') { take(h, false); return; }
  if (h.dlg) speak(h.dlg);
}

function take(h, toBag) {
  S.found[S.scene].push(h.id);
  if (hintGlow === h.id) hintGlow = null;
  const i = img[`${S.scene}_${h.id}`];
  if (i) fx.push({ img:i, x:h.x, y:h.y, w:h.w, h:h.h, t0:performance.now(), dur:420 });
  if (toBag && h.yields) S.inventory.push({ id:h.yields, img:`${S.scene}_${h.id}` });
  S.coins += 5; save();
  if (sceneDone()) setTimeout(() => {
    if (chapterDone()) screen = 'cheer'; else say(tr('done'), 1800);
  }, 700);
}

boot();
