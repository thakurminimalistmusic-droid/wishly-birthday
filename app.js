(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const app = $('#app');
const THEMES = { neon: ['Neon', '#8b5cf6'], sunset: ['Sunset', '#fb923c'], mint: ['Mint', '#34d399'], bubble: ['Bubblegum', '#f472b6'], gold: ['Gold', '#fbbf24'] };
const MAX_WORDS = 1000;
const form = { theme: 'neon', photo: '', audio: '', audioName: '', to: '', age: '', from: '', msg: '', yt: '', ys: '', ye: '' };
let audioEl = null, yt = null, ytReady = null;

/* ---------- helpers ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toastEl = $('#toast'); let tt;
const toast = m => { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('on'), 2400); };
const words = s => (s.trim().match(/\S+/g) || []).length;
const setTheme = t => { document.documentElement.dataset.theme = THEMES[t] ? t : 'neon'; };
const b64u = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode(...u8.subarray(i, i + 8192)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function pack(o) { const st = new Blob([JSON.stringify(o)]).stream().pipeThrough(new CompressionStream('deflate-raw')); return b64u(new Uint8Array(await new Response(st).arrayBuffer())); }
async function unpack(s) { const st = new Blob([unb64u(s)]).stream().pipeThrough(new DecompressionStream('deflate-raw')); return JSON.parse(await new Response(st).text()); }
const readFile = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(f); });
function shrink(src, max, q) {
  return new Promise((ok, no) => {
    const img = new Image();
    img.onload = () => { const r = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', q)); };
    img.onerror = no; img.src = src;
  });
}

const ytId = u => { const m = String(u || '').match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/); return m ? m[1] : ''; };
const toSec = v => { v = String(v || '').trim(); if (!v) return 0; const p = v.split(':').map(Number); if (p.some(isNaN)) return 0; return p.reduce((a, x) => a * 60 + x, 0); };
function loadYT() {
  if (ytReady) return ytReady;
  ytReady = new Promise(ok => { if (window.YT && YT.Player) return ok(); const t = document.createElement('script'); t.src = 'https://www.youtube.com/iframe_api'; window.onYouTubeIframeAPIReady = ok; document.head.append(t); });
  return ytReady;
}

/* cursor spotlight */
addEventListener('pointermove', e => { const s = document.documentElement.style; s.setProperty('--mx', e.clientX + 'px'); s.setProperty('--my', e.clientY + 'px'); }, { passive: true });

/* ---------- fx canvas: confetti + balloons ---------- */
const cv = $('#fx'), cx = cv.getContext('2d'); let bits = [], balloons = [], raf = 0;
const dpr = () => Math.min(devicePixelRatio || 1, 2);
function sizeCv() { cv.width = innerWidth * dpr(); cv.height = innerHeight * dpr(); }
addEventListener('resize', sizeCv); sizeCv();
const cols = () => { const css = getComputedStyle(document.documentElement); return ['--a', '--b', '--c'].map(v => css.getPropertyValue(v).trim()).concat('#fff'); };
function confetti(n = 160, ox = .5, oy = .55) {
  const c = cols(), d = dpr();
  for (let i = 0; i < n; i++) bits.push({ x: cv.width * ox, y: cv.height * oy, vx: (Math.random() - .5) * 24 * d, vy: (-Math.random() * 22 - 6) * d, w: (6 + Math.random() * 8) * d, h: (4 + Math.random() * 6) * d, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: c[i % c.length], life: 1 });
  loop();
}
function floatBalloons(n = 14) {
  const c = cols(), d = dpr();
  for (let i = 0; i < n; i++) balloons.push({ x: Math.random() * cv.width, y: cv.height + 80 * d + Math.random() * cv.height * .5, s: (22 + Math.random() * 22) * d, vy: (1 + Math.random() * 1.6) * d, ph: Math.random() * 6, c: c[i % 3] });
  loop();
}
function loop() { if (!raf) raf = requestAnimationFrame(tick); }
function tick() {
  cx.clearRect(0, 0, cv.width, cv.height);
  const d = dpr();
  bits = bits.filter(b => b.y < cv.height + 40 && b.life > 0);
  for (const b of bits) { b.vy += .55 * d; b.vx *= .99; b.x += b.vx; b.y += b.vy; b.r += b.vr; b.life -= .004; cx.save(); cx.globalAlpha = Math.max(b.life, 0); cx.translate(b.x, b.y); cx.rotate(b.r); cx.fillStyle = b.c; cx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); cx.restore(); }
  balloons = balloons.filter(b => b.y > -b.s * 3);
  for (const b of balloons) {
    b.y -= b.vy; b.ph += .02; const x = b.x + Math.sin(b.ph) * 18 * d;
    cx.save(); cx.globalAlpha = .85; cx.strokeStyle = 'rgba(255,255,255,.35)'; cx.lineWidth = d;
    cx.beginPath(); cx.moveTo(x, b.y + b.s * 1.15); cx.quadraticCurveTo(x + 8 * d * Math.sin(b.ph * 2), b.y + b.s * 2.2, x, b.y + b.s * 3); cx.stroke();
    cx.fillStyle = b.c; cx.beginPath(); cx.ellipse(x, b.y, b.s * .8, b.s, 0, 0, 7); cx.fill();
    cx.globalAlpha = .45; cx.fillStyle = '#fff'; cx.beginPath(); cx.ellipse(x - b.s * .3, b.y - b.s * .35, b.s * .14, b.s * .28, .5, 0, 7); cx.fill();
    cx.restore();
  }
  raf = (bits.length || balloons.length) ? requestAnimationFrame(tick) : 0;
}

/* ---------- creator ---------- */
function showCreator() {
  stopAudio(); setTheme(form.theme); history.replaceState(null, '', '/'); scrollTo(0, 0);
  app.innerHTML = `
  <div class="wrap">
    <div class="top"><div class="logo"><b>✦</b>wishly</div><div class="pill">free · no sign-up</div></div>
    <div class="hero">
      <h1 class="big">Make their day <em>unreal.</em></h1>
      <p class="sub">Write the wish. Add a pic and a song. Send one short link.</p>
    </div>
    <div class="grid">
      <div class="form glass">
        <div class="row">
          <label class="f">Birthday person<input id="to" type="text" maxlength="40" placeholder="Aarav" autocomplete="off"></label>
          <label class="f">Age (optional)<input id="age" type="number" inputmode="numeric" min="1" max="120" placeholder="21"></label>
        </div>
        <label class="f">Your name<input id="from" type="text" maxlength="40" placeholder="Your name" autocomplete="off"></label>
        <label class="f">Your wish <textarea id="msg" placeholder="Say the thing you never say out loud…"></textarea><span class="count" id="count">0 / ${MAX_WORDS} words</span></label>
        <label class="f">Vibe<div class="chips" id="chips"></div></label>
        <label class="f">Song · YouTube link (optional)<input id="yt" type="text" inputmode="url" placeholder="https://youtu.be/..." autocomplete="off"></label>
        <div class="row">
          <label class="f">Start at<input id="ys" type="text" placeholder="0:45" autocomplete="off"></label>
          <label class="f">Stop at<input id="ye" type="text" placeholder="1:20" autocomplete="off"></label>
        </div>
        <div class="drops">
          <div class="drop" id="dropPhoto"></div>
        </div>
        <div class="btns two">
          <button class="btn ghost" id="preview" type="button">Preview</button>
          <button class="btn" id="make" type="button">Create link ✦</button>
        </div>
      </div>
      <aside class="live"><div class="tag">Live preview</div><div class="mini" id="mini"></div></aside>
    </div>
  </div>`;
  const chips = $('#chips');
  Object.entries(THEMES).forEach(([k, [label, col]]) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.setAttribute('aria-pressed', k === form.theme);
    b.innerHTML = `<i style="background:${col}"></i>${label}`;
    b.onclick = () => { form.theme = k; setTheme(k); chips.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c === b)); };
    chips.append(b);
  });
  ['to', 'age', 'from', 'msg', 'yt', 'ys', 'ye'].forEach(id => {
    const el = $('#' + id); el.value = form[id];
    el.addEventListener('input', () => { form[id] = el.value; if (id === 'msg') count(); mini(); });
  });
  drawDrops(); count(); mini();
  $('#preview').onclick = () => { const d = collect(); if (d) showWish(d, true); };
  $('#make').onclick = make;
}
function count() { const w = words(form.msg); const c = $('#count'); c.textContent = `${w} / ${MAX_WORDS} words`; c.classList.toggle('over', w > MAX_WORDS); }
function mini() {
  const m = $('#mini'); if (!m) return;
  m.innerHTML = `<div class="k">Happy birthday</div><div class="n">${esc(form.to || 'Name')}</div>${form.photo ? `<img class="ph" src="${form.photo}" alt="">` : ''}<div class="m">${esc(form.msg || 'Your wish shows up here as you type…')}</div>${form.from ? `<div class="fr">— ${esc(form.from)}</div>` : ''}`;
}
function drawDrops() {
  const p = $('#dropPhoto');
  p.className = 'drop' + (form.photo ? ' has' : '');
  p.innerHTML = form.photo ? `<img src="${form.photo}" alt=""><span>Change photo</span><input id="photo" type="file" accept="image/*">` : `<span>📸<br>Add photo</span><input id="photo" type="file" accept="image/*">`;
  $('#photo').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { form.photo = await shrink(await readFile(f), 900, .8); drawDrops(); mini(); } catch { toast("Couldn't read that image"); } };
}
function collect() {
  if (!form.to.trim()) { toast('Who is this for?'); return null; }
  if (!form.msg.trim()) { toast('Write a wish first ✍️'); return null; }
  if (words(form.msg) > MAX_WORDS) { toast(`Wish is over ${MAX_WORDS} words`); return null; }
  let song = null;
  if (form.yt.trim()) {
    const id = ytId(form.yt);
    if (!id) { toast("That YouTube link doesn't look right"); return null; }
    const start = toSec(form.ys), end = toSec(form.ye);
    song = { id, start, end: end > start ? end : 0 };
  }
  return { name: form.to.trim(), age: form.age ? +form.age : '', from: form.from.trim(), message: form.msg.trim(), theme: form.theme, photo: form.photo, song };
}

/* ---------- saving + sharing ---------- */
async function make() {
  const d = collect(); if (!d) return;
  const btn = $('#make'); btn.disabled = true; btn.textContent = 'Creating…';
  let url, short = true;
  try {
    const r = await fetch('/api/wish', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(d) });
    if (!r.ok) throw new Error(r.status);
    url = location.origin + '/w/' + (await r.json()).id;
  } catch {
    short = false;
    const lite = { ...d, audio: '' }; if (d.photo) lite.photo = await shrink(d.photo, 320, .6);
    url = location.origin + '/#w=' + await pack(lite);
  }
  showShare(url, d, short);
}
function showShare(url, d, short) {
  scrollTo(0, 0); confetti(140);
  app.innerHTML = `
  <div class="wrap"><div class="share pop">
    <div class="top"><div class="logo"><b>✦</b>wishly</div></div>
    <div class="hero"><h1 class="big">It's <em>ready.</em></h1><p class="sub">Send this to ${esc(d.name)}. Tell them to turn their sound on.</p></div>
    <div class="glass">
      <div class="linkbox"><span>${esc(url.replace(/^https?:\/\//, '').slice(0, 48))}${url.length > 60 ? '…' : ''}</span><button class="btn" id="copy">Copy</button></div>
      ${short ? '' : '<p class="note">Short links are offline right now, so this is a long link.</p>'}
      <div class="btns">
        <button class="btn" id="share">Share…</button>
        <a class="btn ghost" id="wa" target="_blank" rel="noopener">Send on WhatsApp</a>
        <button class="btn ghost" id="open">Open it myself</button>
        <button class="btn ghost" id="again">Make another</button>
      </div>
    </div>
  </div></div>`;
  const text = `🎂 I made something for you, ${d.name}. Open it:`;
  $('#wa').href = 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + url);
  $('#copy').onclick = async () => { try { await navigator.clipboard.writeText(url); toast('Link copied ✓'); } catch { prompt('Copy this link', url); } };
  $('#share').onclick = () => navigator.share ? navigator.share({ title: 'Happy Birthday!', text, url }).catch(() => { }) : $('#copy').click();
  $('#open').onclick = () => { location.href = url; if (url.includes('#')) location.reload(); };
  $('#again').onclick = () => { Object.assign(form, { to: '', age: '', from: '', msg: '', photo: '', yt: '', ys: '', ye: '' }); showCreator(); };
}

/* ---------- viewer ---------- */
function stopAudio() { if (audioEl) { audioEl.pause(); audioEl = null; } if (yt) { try { yt.destroy(); } catch { } yt = null; } $('#ytHost')?.remove(); $('.music')?.remove(); }
function showWish(d, isPreview) {
  setTheme(d.theme); stopAudio(); scrollTo(0, 0);
  app.innerHTML = `
  <div class="marquee"><span>${'HAPPY BIRTHDAY ✦ '.repeat(14)}</span></div>
  ${isPreview ? '<button class="back" id="back">← Edit</button>' : ''}
  <section class="stage"><div class="gate" id="gate">
    <div class="from">${d.from ? esc(d.from) + ' made this for you' : 'Someone made this for you'}</div>
    <h2>Blow out the <em>candles</em></h2>
    <div class="cake" id="cake">
      <div class="candles">${[0, 1, 2].map(() => '<div class="candle"><div class="flame"></div></div>').join('')}</div>
      <div class="tier t1"></div><div class="tier t2"></div><div class="plate"></div>
    </div>
    <div class="hint">tap each flame (or just tap the cake)</div>
  </div></section>`;
  if (isPreview) $('#back').onclick = showCreator;
  const candles = [...document.querySelectorAll('.candle')]; let opened = false;
  const out = c => {
    if (c.classList.contains('out') || opened) return;
    c.classList.add('out'); if (navigator.vibrate) navigator.vibrate(20);
    $('#cake').classList.remove('shake'); void $('#cake').offsetWidth; $('#cake').classList.add('shake');
    if (candles.every(x => x.classList.contains('out'))) { opened = true; setTimeout(() => reveal(d, isPreview), 700); }
  };
  candles.forEach(c => c.addEventListener('click', e => { e.stopPropagation(); out(c); }));
  $('#cake').onclick = () => { const left = candles.find(c => !c.classList.contains('out')); if (left) out(left); };
}
function reveal(d, isPreview) {
  const stage = $('.stage');
  const nm = [...d.name].map((ch, i) => `<span style="animation-delay:${i * .07}s,0s">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');
  stage.innerHTML = `
  <div class="reveal">
    <div><div class="kicker">Happy birthday</div><div class="name">${nm}</div>${d.age ? `<div class="age">turning ${esc(d.age)}</div>` : ''}</div>
    ${d.photo ? `<div class="polaroid"><div class="in"><img src="${esc(d.photo)}" alt=""></div></div>` : '<div></div>'}
    <div class="glass letter"><p id="wishText"></p>${d.from ? `<div class="sign">with love,<b>${esc(d.from)}</b></div>` : ''}</div>
    ${isPreview ? '<div></div>' : '<div class="cta">Want to make one? <a href="/">Create yours →</a></div>'}
  </div>`;
  /* word-by-word fade-in */
  const p = $('#wishText'), parts = d.message.split(/(\s+)/), n = parts.filter(x => x.trim()).length, step = Math.min(.05, 7 / n); let k = 0;
  parts.forEach(t => { if (!t.trim()) { p.append(document.createTextNode(t)); return; } const s = document.createElement('span'); s.className = 'w'; s.textContent = t; s.style.animationDelay = (2 + k++ * step) + 's'; p.append(s); });
  /* 3D tilt */
  const pol = $('.polaroid .in');
  if (pol) { const box = $('.polaroid'); box.addEventListener('pointermove', e => { const r = box.getBoundingClientRect(); pol.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 16 + 'deg'); pol.style.setProperty('--rx', -((e.clientY - r.top) / r.height - .5) * 16 + 'deg'); }); box.addEventListener('pointerleave', () => { pol.style.setProperty('--rx', '0deg'); pol.style.setProperty('--ry', '0deg'); }); }
  confetti(220); setTimeout(() => confetti(140, .2, .7), 500); setTimeout(() => confetti(140, .8, .7), 800); floatBalloons(16);
  if (navigator.vibrate) navigator.vibrate([40, 40, 80]);
  if (d.song && d.song.id) startSong(d.song);
  else if (d.audio) {
    audioEl = new Audio(d.audio); audioEl.loop = true; audioEl.volume = .85;
    const btn = document.createElement('button'); btn.className = 'music'; btn.textContent = '🔊'; btn.setAttribute('aria-label', 'Toggle music'); document.body.append(btn);
    btn.onclick = () => { if (audioEl.paused) { audioEl.play(); btn.textContent = '🔊'; } else { audioEl.pause(); btn.textContent = '🔇'; } };
    audioEl.play().catch(() => { btn.textContent = '🔇'; });
  }
}

async function startSong(sg) {
  const btn = document.createElement('button'); btn.className = 'music'; btn.textContent = '🔊'; btn.setAttribute('aria-label', 'Toggle music'); document.body.append(btn);
  const host = document.createElement('div'); host.id = 'ytHost'; host.style.cssText = 'position:fixed;left:-9999px;top:0;width:220px;height:220px;opacity:0;pointer-events:none';
  const slot = document.createElement('div'); host.append(slot); document.body.append(host);
  await loadYT();
  const vars = { autoplay: 1, controls: 0, playsinline: 1, rel: 0, disablekb: 1, start: sg.start || 0 };
  if (sg.end && sg.end > (sg.start || 0)) vars.end = sg.end;
  yt = new YT.Player(slot, { videoId: sg.id, playerVars: vars, events: {
    onReady: e => { e.target.setVolume(85); e.target.playVideo(); },
    onStateChange: e => { if (e.data === 0) { e.target.seekTo(sg.start || 0); e.target.playVideo(); } if (e.data === 1) btn.textContent = '🔊'; },
    onError: () => btn.remove()
  } });
  setTimeout(() => { if (yt && yt.getPlayerState && yt.getPlayerState() !== 1) btn.textContent = '🔇'; }, 2500);
  btn.onclick = () => { if (!yt || !yt.getPlayerState) return; if (yt.getPlayerState() === 1) { yt.pauseVideo(); btn.textContent = '🔇'; } else { yt.playVideo(); btn.textContent = '🔊'; } };
}

/* ---------- boot ---------- */
async function boot() {
  const path = location.pathname, hash = location.hash;
  try {
    let m;
    if ((m = path.match(/^\/w\/([a-z0-9]+)\/?$/i))) {
      const r = await fetch('/api/wish?id=' + m[1]); if (!r.ok) throw 0; return showWish(await r.json(), false);
    }
    if (hash.startsWith('#w=')) return showWish(await unpack(hash.slice(3)), false);
    if (hash.startsWith('#wish=')) return showWish(legacy(hash.slice(6)), false);
  } catch { app.innerHTML = '<div class="stage"><div class="gate"><h2>This wish got <em>lost</em> 🫥</h2><a class="btn" href="/">Make a new one</a></div></div>'; return; }
  showCreator();
}
function legacy(raw) {
  let o; try { o = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(raw))))); } catch { o = JSON.parse(atob(decodeURIComponent(raw))); }
  const pick = (...k) => { for (const x of k) if (o[x]) return o[x]; return ''; };
  return { name: pick('name', 'to', 'recipient', 'n'), from: pick('from', 'sender', 'by', 'f'), message: pick('message', 'wish', 'text', 'msg', 'm'), photo: pick('photo', 'image', 'img', 'p'), audio: pick('music', 'audio', 'song'), age: pick('age'), theme: 'neon' };
}
boot();
})();
