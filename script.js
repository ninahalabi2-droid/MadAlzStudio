/* =========================================================
   ECHO/STACK — main interaction script (vanilla JS)
   Sections:
   1. Utils           7. Desktop OS
   2. Sound           8. File system
   3. Secrets/toast   9. Projects
   4. Canvas FX      10. Arcade
   5. Boot           11. About / Contact / Shutdown
   6. Laptop device  12. Terminal + global keys + easter eggs
   ========================================================= */
(function () {
  'use strict';

  /* ---------------- 1. UTILS ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => mqReduce.matches;
  const isSmall = () => window.innerWidth <= 860;
  const isTiny = () => window.innerWidth <= 640;
  const canHover = window.matchMedia('(hover: hover)').matches;
  // In-memory settings store (resets on reload; swap for a persistent store if you need one)
  const store = (() => {
    const mem = {};
    return { get(k, d) { return k in mem ? mem[k] : d; }, set(k, v) { mem[k] = v; } };
  })();
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const isTyping = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'); };

  function goTo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  }

  async function typeInto(el, text, speed = 18, sound = false) {
    if (reduced()) { el.textContent = text; return; }
    el.textContent = '';
    for (let i = 0; i < text.length; i++) {
      el.textContent += text[i];
      if (sound && i % 3 === 0) SFX.play('type');
      if (text[i] !== ' ') await sleep(speed);
    }
  }

  /* ---------------- 2. SOUND ----------------
     Files live in assets/sounds/*.wav — replace any of them to reskin.
     Nothing plays until the visitor enables sound. */
  const SFX = (() => {
    const names = ['click', 'hover', 'boot', 'error', 'success', 'open', 'close', 'coin', 'hit', 'pickup', 'type', 'gameover', 'modem'];
    const vol = { hover: .35, type: .25, modem: .5 };
    const cache = {};
    let on = false, lastHover = 0;
    function load() { names.forEach((n) => { if (!cache[n]) { const a = new Audio('assets/sounds/' + n + '.wav'); a.preload = 'auto'; cache[n] = a; } }); }
    function play(n) {
      if (!on || !cache[n]) return;
      if (n === 'hover') { const t = performance.now(); if (t - lastHover < 70) return; lastHover = t; }
      const a = cache[n].cloneNode();
      a.volume = vol[n] || .6;
      a.play().catch(() => {});
    }
    function set(v) {
      on = !!v;
      if (on) load();
      store.set('sound', on);
      const b = $('#soundToggle');
      b.setAttribute('aria-pressed', String(on));
      $('#soundState').textContent = on ? 'ON' : 'OFF';
    }
    return { play, set, get on() { return on; } };
  })();

  $('#soundToggle').addEventListener('click', () => { SFX.set(!SFX.on); SFX.play('click'); toast(SFX.on ? 'SOUND: ON ♪' : 'SOUND: OFF'); });

  // generic click / hover sounds for buttons
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button, a');
    if (b && !b.dataset.sfx) SFX.play('click');
  });
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const b = e.target.closest('.screen__items button, .icon, .dir__item, .tree [role="treeitem"], .pxbtn');
    if (b && !b.contains(e.relatedTarget)) SFX.play('hover');
  });

  /* ---------------- 3. SECRETS + TOAST ---------------- */
  let toastT = 0;
  function toast(msg, ms = 2200) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('is-on'), ms);
  }

  const SECRETS = {
    konami:   { t: 'CHEAT MODE UNLOCKED', d: 'Up, up, down, down... you know the code. The palette now cycles and the arcade grants infinite lives. Enter the code again to switch it off.' },
    overheat: { t: 'YOU BROKE IT (A LITTLE)', d: 'You clicked the laptop until it overheated. Curiosity: 100. Patience: 0.' },
    terminal: { t: 'ROOT ACCESS', d: 'You found the hidden terminal. Type HELP to see what it can do. Press ` anytime to open it.' },
    peeker:   { t: 'BLIP SAYS HI', d: 'You found Blip, the creature that lives behind the taskbar. He has been watching you scroll.' },
    vault:    { t: 'VAULT OPENED', d: 'The password was the year the machine was built. The vault contains a message from 2089.' },
    trash:    { t: 'GOOD RIDDANCE', d: 'You shredded the boring website template. It will never come back.' },
    signal:   { t: 'SIGNAL LOCKED', d: 'You tuned the antenna to 2089 MHz and heard the future say hello.' },
    pi:       { t: 'π IS FOR PIXEL', d: 'You clicked the tiniest thing in the footer. You are extremely thorough.' },
  };
  const TOTAL = Object.keys(SECRETS).length;
  let found = new Set(store.get('secrets', []));
  function renderSecrets() { $('#hudSecrets').textContent = `SECRETS ${found.size}/${TOTAL}`; }
  renderSecrets();

  let lastFocus = null;
  function unlock(id) {
    const s = SECRETS[id];
    if (!s) return;
    const isNew = !found.has(id);
    found.add(id);
    store.set('secrets', [...found]);
    renderSecrets();
    const box = $('#found');
    $('#foundN').textContent = found.size;
    $('#foundTitle').textContent = isNew ? (found.size === TOTAL ? 'ALL SECRETS FOUND' : 'YOU FOUND IT') : 'FOUND AGAIN';
    $('#foundText').textContent = s.t + ' — ' + s.d + (found.size === TOTAL && isNew ? ' You have seen everything this machine can show. For now.' : '');
    lastFocus = document.activeElement;
    box.hidden = false;
    $('#foundOk').focus({ preventScroll: true });
    SFX.play('success');
    FX.burst(window.innerWidth / 2, window.innerHeight / 2, 70);
  }
  function closeFound() { $('#found').hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }
  $('#foundOk').addEventListener('click', closeFound);
  $('#found').addEventListener('click', (e) => { if (e.target.id === 'found') closeFound(); });

  /* ---------------- 4. CANVAS FX ---------------- */
  const FX = (() => {
    const cv = $('#particles');
    const ctx = cv.getContext('2d');
    let parts = [], raf = 0, w = 0, h = 0;
    const COLS = () => { const cs = getComputedStyle(document.documentElement); return [cs.getPropertyValue('--c').trim(), cs.getPropertyValue('--y').trim(), cs.getPropertyValue('--m').trim()]; };
    let cols = COLS();
    function size() { w = cv.width = window.innerWidth; h = cv.height = window.innerHeight; }
    size();
    window.addEventListener('resize', size);
    function tick() {
      ctx.clearRect(0, 0, w, h);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life--;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        ctx.globalAlpha = Math.min(1, p.life / 20);
        ctx.fillStyle = p.c;
        const s = p.s;
        ctx.fillRect(Math.round(p.x / 2) * 2, Math.round(p.y / 2) * 2, s, s);
      }
      ctx.globalAlpha = 1;
      raf = parts.length ? requestAnimationFrame(tick) : 0;
    }
    function add(p) { if (parts.length > 400) parts.shift(); parts.push(p); if (!raf) raf = requestAnimationFrame(tick); }
    return {
      refresh() { cols = COLS(); },
      trail(x, y) {
        if (reduced()) return;
        add({ x, y, vx: (Math.random() - .5) * 1.4, vy: -Math.random() * 1.2 - .2, g: .03, life: 30 + Math.random() * 20, c: cols[(Math.random() * 3) | 0], s: Math.random() < .3 ? 6 : 4 });
      },
      burst(x, y, n = 30) {
        if (reduced()) return;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 6;
          add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, g: .18, life: 40 + Math.random() * 30, c: cols[(Math.random() * 3) | 0], s: Math.random() < .4 ? 8 : 4 });
        }
      },
    };
  })();

  // Pixel-block wipe transition. cb runs while the screen is covered.
  function pixelWipe(cb) {
    if (reduced()) { cb && cb(); return Promise.resolve(); }
    return new Promise((resolve) => {
      const cv = $('#pixelWipe'), ctx = cv.getContext('2d');
      const W = cv.width = window.innerWidth, H = cv.height = window.innerHeight;
      const B = Math.max(28, Math.round(W / 36));
      const cols = Math.ceil(W / B), rows = Math.ceil(H / B);
      const cells = [];
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) cells.push([x, y, Math.random() * .6 + (x / cols) * .4]);
      const palette = ['#0c0a1c', '#0c0a1c', '#0c0a1c', getComputedStyle(document.documentElement).getPropertyValue('--c').trim(), '#ff4fd8'];
      const dur = 360; let t0 = performance.now(), phase = 0;
      function frame(now) {
        const p = (now - t0) / dur;
        ctx.clearRect(0, 0, W, H);
        for (const c of cells) {
          const on = phase === 0 ? p > c[2] : p < c[2];
          if (on) { ctx.fillStyle = palette[(c[0] * 7 + c[1] * 3) % palette.length]; ctx.fillRect(c[0] * B, c[1] * B, B, B); }
        }
        if (p < 1) return requestAnimationFrame(frame);
        if (phase === 0) {
          ctx.fillStyle = '#0c0a1c'; ctx.fillRect(0, 0, W, H);
          cb && cb();
          phase = 1; t0 = performance.now() + 120;
          return setTimeout(() => requestAnimationFrame(frame), 140);
        }
        ctx.clearRect(0, 0, W, H);
        resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  // Parallax starfield
  (function stars() {
    const cv = $('#stars'), ctx = cv.getContext('2d');
    let w, h, list = [], sy = 0, queued = false;
    function build() {
      w = cv.width = window.innerWidth; h = cv.height = window.innerHeight;
      const n = Math.round((w * h) / 9000);
      list = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h * 3, z: Math.random(), tw: Math.random() * 10 }));
      draw();
    }
    function draw() {
      queued = false;
      ctx.clearRect(0, 0, w, h);
      const t = performance.now() / 1000;
      for (const s of list) {
        const y = ((s.y - sy * (0.08 + s.z * 0.25)) % (h * 3) + h * 3) % (h * 3);
        if (y > h) continue;
        const b = reduced() ? 1 : (Math.sin(t * 1.5 + s.tw) + 1) / 2;
        ctx.fillStyle = s.z > .85 ? (b > .5 ? '#ffe600' : '#5d6690') : s.z > .7 ? '#00eaff' : '#3a4170';
        const sz = s.z > .85 ? 3 : 2;
        ctx.globalAlpha = .35 + b * .6;
        ctx.fillRect(s.x | 0, y | 0, sz, sz);
        if (s.z > .95 && b > .7) { ctx.fillRect((s.x - 3) | 0, (y + 0.5) | 0, 9, 1); ctx.fillRect((s.x + 1) | 0, (y - 3) | 0, 1, 9); }
      }
      ctx.globalAlpha = 1;
    }
    function q() { if (!queued) { queued = true; requestAnimationFrame(draw); } }
    window.addEventListener('scroll', () => { sy = window.scrollY; q(); }, { passive: true });
    window.addEventListener('resize', build);
    build();
    if (!reduced()) setInterval(q, 220);
  })();

  /* ---------------- 5. BOOT ---------------- */
  const Boot = (() => {
    const el = $('#boot'), log = $('#bootLog');
    let done = false, startShown = false;
    const lines = [
      ['ECHO-BIOS (C) 1989 ECHO/STACK SYSTEMS', 'y'],
      ['CPU: ECHO-8 @ 4.77 MHZ ........ ', 'ok', 'OK'],
      ['MEMORY TEST: 640K ............. ', 'ok', 'OK'],
      ['PIXEL BUFFER 320x200 .......... ', 'ok', 'OK'],
      ['DETECTING ECHOES .............. ', 'ok', '9 FOUND'],
      ['MODEM: DIALING 2089 ........... ', 'ok', 'CARRIER'],
      ['[ SYSTEM INITIALIZING... ]', 'y'],
    ];
    async function run() {
      if (reduced()) {
        log.innerHTML = lines.map((l) => l[0] + (l[2] ? `<span class="${l[1]}">${l[2]}</span>` : '')).join('\n');
        setBar(100); return showStart();
      }
      for (const l of lines) {
        if (done) return;
        const row = document.createElement('div');
        if (!l[2]) row.className = l[1];
        log.appendChild(row);
        await typeInto(row, l[0], 9);
        if (l[2]) { await sleep(110); const s = document.createElement('span'); s.className = l[1]; s.textContent = l[2]; row.appendChild(s); }
        await sleep(70);
      }
      for (let p = 0; p <= 100; p += Math.ceil(Math.random() * 9)) { if (done) return; setBar(Math.min(p, 100)); await sleep(p > 80 && p < 90 ? 160 : 38); }
      setBar(100);
      showStart();
    }
    function setBar(p) {
      const n = 22, f = Math.round((p / 100) * n);
      $('#bootBar').textContent = '█'.repeat(f) + '░'.repeat(n - f);
      $('#bootPct').textContent = p + '%';
    }
    function showStart() {
      startShown = true;
      $('#bootStart').hidden = false;
      $('#startSound').focus({ preventScroll: true });
    }
    async function finish(withSound) {
      if (done) return; done = true;
      if (withSound !== undefined) SFX.set(withSound);
      SFX.play('boot');
      el.classList.add('is-off');
      await sleep(reduced() ? 0 : 520);
      el.remove();
      document.body.classList.remove('is-booting');
      window.scrollTo(0, 0);
      Device.enter();
    }
    $('#startSound').addEventListener('click', () => finish(true));
    $('#startSilent').addEventListener('click', () => finish(false));
    $('#bootSkip').addEventListener('click', () => finish(store.get('sound', false)));
    document.addEventListener('keydown', function onKey(e) {
      if (done) return document.removeEventListener('keydown', onKey);
      if (e.key === 'Enter' && startShown && !e.target.closest('button')) finish(true);
      if (e.key === 'Escape') finish(false);
    });
    return { run, get done() { return done; } };
  })();

  /* ---------------- 6. LAPTOP DEVICE ---------------- */
  const Device = (() => {
    const dev = $('#device'), tilt = $('#deviceTilt'), screen = $('#screen');
    const msg = $('#screenMsg'), menu = $('#screenMenu'), wake = $('#screenWake');
    const hint = $('#screenHint'), consoleLine = $('#consoleLine');
    let connected = false, busy = false, clicks = [], lastTrail = 0;

    function say(text) { consoleLine.innerHTML = ''; const s = document.createElement('span'); consoleLine.append(s); const c = document.createElement('span'); c.className = 'caret'; c.textContent = '_'; consoleLine.append(c); typeInto(s, '> ' + text, 14); }

    function enter() {
      dev.classList.add('is-in');
      say('DEVICE DETECTED. CLICK THE SCREEN.');
    }

    // tilt + particles on hover
    dev.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || reduced()) return;
      const r = dev.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      if (!dev.classList.contains('is-zoom')) tilt.style.transform = `rotateY(${px * 10}deg) rotateX(${-py * 8}deg) translateZ(0)`;
      const now = performance.now();
      if (now - lastTrail > 35) { lastTrail = now; FX.trail(e.clientX, e.clientY); }
    });
    dev.addEventListener('pointerleave', () => { if (!dev.classList.contains('is-zoom')) tilt.style.transform = ''; });
    dev.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !connected) say('SCREEN SIGNAL DETECTED. CLICK TO CONNECT?'); });

    // click counter — 7 rapid clicks overheats the machine
    dev.addEventListener('click', (e) => {
      const now = Date.now();
      clicks = clicks.filter((t) => now - t < 3000); clicks.push(now);
      $('#roTemp').textContent = (31 + clicks.length * 9) + '°C';
      if (clicks.length >= 4) dev.classList.add('is-hot');
      if (clicks.length >= 7) { clicks = []; overheat(); return; }
      setTimeout(() => { if (Date.now() - (clicks[clicks.length - 1] || 0) > 2900) { dev.classList.remove('is-hot'); $('#roTemp').textContent = '31°C'; } }, 3000);
      // clicks on the body (not the screen) get a little reaction
      if (!e.target.closest('#screen')) {
        dev.classList.remove('is-shake'); void dev.offsetWidth; dev.classList.add('is-shake');
        FX.burst(e.clientX, e.clientY, 14);
        const quips = ['KEYBOARD NOT FOUND. PRESS F1 TO CONTINUE.', 'OUCH. TRY THE SCREEN.', 'TRACKPAD SAYS HELLO.', 'ECHO ' + ((Math.random() * 9 + 1) | 0) + ' RESPONDED.', 'THAT TICKLES.'];
        say(quips[(Math.random() * quips.length) | 0]);
        SFX.play('hit');
      }
    });

    wake.addEventListener('click', connect);

    async function connect(e) {
      if (connected || busy) return;
      busy = true;
      if (e && e.clientX) FX.burst(e.clientX, e.clientY, 40);
      wake.hidden = true;
      msg.classList.add('is-on');
      SFX.play('modem');
      $('#roLink').textContent = 'DIAL';
      await typeInto(msg, 'DIALING...', 30);
      await sleep(250);
      await typeInto(msg, 'HANDSHAKE OK', 22);
      await sleep(220);
      msg.innerHTML = '';
      await typeInto(msg, '> CONNECTION ESTABLISHED', 26);
      SFX.play('success');
      await sleep(450);
      msg.classList.remove('is-on');
      menu.hidden = false;
      $('#deck').hidden = false;
      dev.classList.add('is-connected');
      $('#roLink').textContent = 'ONLINE';
      hint.innerHTML = isTiny() ? '&gt; ONLINE<br>&gt; PICK A KEY ▼' : '&gt; SELECT PROGRAM<span class="caret">_</span>';
      say('CONNECTION ESTABLISHED. MAIN MENU UNLOCKED.');
      connected = true; busy = false;
      const first = menu.querySelector('button');
      if (first && !isTiny() && e && e.detail === 0) first.focus({ preventScroll: true });
    }

    // menu + deck navigation, each with its own transition
    $$('[data-go]').forEach((b) => {
      const show = () => { const h = b.dataset.hint || ('OPEN ' + b.textContent.trim() + '?'); hint.innerHTML = '&gt; ' + h + '<span class="caret">_</span>'; say(h); };
      b.addEventListener('mouseenter', show);
      b.addEventListener('focus', show);
      b.addEventListener('click', (e) => { e.stopPropagation(); launch(b.dataset.go, b.dataset.fx, e); });
    });

    async function launch(target, fx, e) {
      if (busy) return; busy = true;
      if (e && e.clientX) FX.burst(e.clientX, e.clientY, 24);
      try {
        switch (fx) {
          case 'zoom': // dive into the screen
            say('MOUNTING /ROOT/ECHO ...'); SFX.play('open');
            if (!reduced() && !isTiny()) { dev.classList.add('is-zoom'); await sleep(600); }
            await pixelWipe(() => { dev.classList.remove('is-zoom'); tilt.style.transform = ''; jump(target); });
            break;
          case 'wipe': // pixel dissolve
            say('EXECUTING DIR *.EXE ...'); SFX.play('open');
            await pixelWipe(() => jump(target));
            break;
          case 'glitch': // corrupted jump
            say('OPEN FILE? README.TXT ... Y'); SFX.play('error');
            dev.classList.add('is-glitch'); document.body.classList.add('glitching');
            await sleep(reduced() ? 0 : 480);
            dev.classList.remove('is-glitch'); document.body.classList.remove('glitching');
            goTo(target);
            break;
          case 'coin': // insert coin
            SFX.play('coin');
            await flashScreen(['INSERT COIN', 'CREDIT 01', 'READY PLAYER 1']);
            goTo(target);
            setTimeout(() => $('#gStart').focus({ preventScroll: true }), reduced() ? 0 : 700);
            break;
          case 'dial': // modem dial-out
            SFX.play('modem');
            await flashScreen(['ATDT 555-2089', 'RING... RING...', 'CONNECT 2400']);
            goTo(target);
            setTimeout(() => $('#modemForm input').focus({ preventScroll: true }), reduced() ? 0 : 800);
            break;
          default: goTo(target);
        }
      } finally { busy = false; }
    }
    function jump(id) { const el = document.getElementById(id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 56, behavior: 'auto' }); }

    async function flashScreen(texts) {
      const wasHidden = menu.hidden;
      menu.hidden = true; msg.classList.add('is-on');
      for (const t of texts) { msg.textContent = t; say(t); await sleep(reduced() ? 120 : 420); }
      msg.classList.remove('is-on'); msg.textContent = '';
      menu.hidden = wasHidden && !connected;
    }

    function overheat() {
      SFX.play('error');
      dev.classList.remove('is-hot');
      $('#roTemp').textContent = '451°C';
      showError('The device has been clicked too many times and is now overheating.', () => { $('#roTemp').textContent = '31°C'; unlock('overheat'); });
    }

    // ambient glitch now and then
    if (!reduced()) setInterval(() => {
      if (document.hidden || Math.random() > .5) return;
      const r = dev.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight || busy) return;
      dev.classList.add('is-glitch'); setTimeout(() => dev.classList.remove('is-glitch'), 260);
    }, 14000);

    return { enter, say, connect, get connected() { return connected; } };
  })();

  // Fake error / BSOD screen
  function showError(reason, after) {
    const b = $('#bsod');
    $('#bsodReason').textContent = reason;
    b.hidden = false;
    const close = () => {
      b.hidden = true;
      document.removeEventListener('keydown', close, true);
      b.removeEventListener('click', close);
      after && after();
    };
    setTimeout(() => { document.addEventListener('keydown', close, true); b.addEventListener('click', close); }, 400);
  }

  // clocks + rail
  function clock() {
    const d = new Date();
    $('#roClock').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    $('#osClock').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  clock(); setInterval(clock, 1000);

  const rail = new IntersectionObserver((ents) => {
    ents.forEach((en) => {
      if (!en.isIntersecting) return;
      $$('.rail a').forEach((a) => a.classList.toggle('is-on', a.dataset.rail === en.target.id));
      $('#hudStatus').textContent = 'SYS: ' + (en.target.querySelector('.sec-tag')?.textContent.split('—')[1] || 'ONLINE').trim();
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main > .sec').forEach((s) => rail.observe(s));

  // headings type themselves when they scroll into view
  const typer = new IntersectionObserver((ents) => {
    ents.forEach((en) => {
      if (!en.isIntersecting) return;
      typer.unobserve(en.target);
      const el = en.target, txt = el.dataset.text;
      el.textContent = '';
      const s = document.createElement('span'); const c = document.createElement('span'); c.className = 'caret'; c.textContent = '_';
      el.append(s, c);
      typeInto(s, txt, 45).then(() => setTimeout(() => c.remove(), 1800));
    });
  }, { threshold: .6 });
  if (!reduced()) $$('.type-on').forEach((h) => typer.observe(h));

  /* ---------------- 7. DESKTOP OS ---------------- */
  const OS = (() => {
    const root = $('#os'), layer = $('#osWindows'), tasks = $('#osTasks');
    const open = new Map();
    let z = 10, cascade = 0;

    const WINS = {
      projects: { title: 'PROJECTS', body: () => `
        <h4>C:\\PROJECTS</h4>
        <ul>${PROJECTS.map((p, i) => `<li><button class="row-btn" data-proj="${i}"><span>${p.file}</span><span>${p.size}</span></button></li>`).join('')}</ul>
        <div class="oswin__actions"><button class="pxbtn pxbtn--sm" data-goto="projects">[ VIEW ALL ]</button></div>` },
      archive: { title: 'ARCHIVE — A:\\', body: () => `
        <h4>FLOPPY DISK A:</h4>
        <ul>
          <li><button class="row-btn" data-arch="tape"><span>TAPE_1989.DAT</span><span>12K</span></button></li>
          <li><button class="row-btn" data-arch="wav"><span>LOST_SIGNAL.WAV</span><span>88K</span></button></li>
          <li><button class="row-btn" data-arch="corrupt"><span>CORRUPTED.SYS</span><span>??K</span></button></li>
          <li><button class="row-btn" data-arch="term"><span>TERMINAL.EXE</span><span>4K</span></button></li>
        </ul>
        <p class="arch-out" style="margin-top:10px;min-height:1.6em;font-family:var(--f-term);font-size:1.15rem;color:var(--y)"></p>` },
      system: { title: 'SYSTEM.INF', body: () => `
        <h4>ECHO-OS v1.989</h4>
        <ul>
          <li><span>CPU</span><span>ECHO-8 4.77MHZ</span></li>
          <li><span>RAM</span><span>640K (ENOUGH)</span></li>
          <li><span>DISPLAY</span><span>320×200 · 16 COL</span></li>
          <li><span>UPTIME</span><span class="sys-up">00:00:00</span></li>
        </ul>
        <p style="margin-top:12px">CPU LOAD</p><div class="bar-meter"><i class="sys-cpu" style="--v:30%"></i></div>
        <p style="margin-top:10px">CURIOSITY</p><div class="bar-meter"><i style="--v:100%"></i></div>`,
        onOpen(el) { const t0 = Date.now(); const iv = setInterval(() => {
          if (!el.isConnected) return clearInterval(iv);
          const s = ((Date.now() - t0) / 1000) | 0; el.querySelector('.sys-up').textContent = `${pad((s / 3600) | 0)}:${pad(((s / 60) | 0) % 60)}:${pad(s % 60)}`;
          el.querySelector('.sys-cpu').style.setProperty('--v', (20 + Math.random() * 70) + '%');
        }, 600); } },
      arcade: { title: 'ARCADE.EXE', body: () => `
        <h4>STAR CATCHER</h4>
        <p>One cabinet installed. High score: <b style="color:var(--y)">${$('#gHigh').textContent}</b></p>
        <canvas class="arc-prev" width="160" height="60"></canvas>
        <div class="oswin__actions"><button class="pxbtn pxbtn--yellow pxbtn--sm" data-play>[ INSERT COIN ]</button></div>`,
        onOpen(el) { animPreview(el.querySelector('canvas'), 'rain'); } },
      signal: { title: 'SIGNAL.EXE', body: () => `
        <h4>ANTENNA TUNER</h4>
        <canvas class="sig-cv" width="200" height="60"></canvas>
        <label style="display:grid;gap:6px;margin-top:12px;font-family:var(--f-term);font-size:1.15rem">FREQUENCY: <b class="sig-f" style="color:var(--y)">1200 MHZ</b>
          <input class="sig-in" type="range" min="1000" max="3000" step="1" value="1200" aria-label="Tune frequency"></label>
        <p class="sig-msg" style="margin-top:8px;min-height:1.4em;font-family:var(--f-term);font-size:1.2rem;color:var(--ok)">…static…</p>`,
        onOpen(el) { signal(el); } },
      contact: { title: 'MAIL.EXE', body: () => `
        <h4>NEW TRANSMISSION</h4>
        <p>Messages travel at 2400 baud. Or faster, if you ask nicely.</p>
        <p style="font-family:var(--f-term);font-size:1.2rem;color:var(--c)">hello@echostack.studio</p>
        <div class="oswin__actions"><button class="pxbtn pxbtn--sm" data-goto="contact">[ OPEN MODEM ]</button></div>` },
      trash: { title: 'TRASH', body: () => `
        <h4>1 ITEM</h4>
        <ul><li><span>generic_saas_template.html</span><span>9.9MB</span></li></ul>
        <div class="oswin__actions"><button class="pxbtn pxbtn--sm" data-trash="restore">[ RESTORE ]</button><button class="pxbtn pxbtn--danger pxbtn--sm" data-trash="shred">[ SHRED ]</button></div>
        <p class="trash-out" style="margin-top:10px;font-family:var(--f-term);font-size:1.15rem;color:var(--y)"></p>` },
      error: { title: 'ERROR', body: () => `
        <h4 style="color:var(--err)">⚠ GENERAL FAILURE</h4>
        <p>READING DRIVE A:<br>CORRUPTED.SYS IS FULL OF BEES.</p>
        <div class="oswin__actions"><button class="pxbtn pxbtn--sm" data-err="abort">ABORT</button><button class="pxbtn pxbtn--sm" data-err="retry">RETRY</button><button class="pxbtn pxbtn--danger pxbtn--sm" data-err="fail">FAIL</button></div>` },
    };

    function openWin(id, opts = {}) {
      const key = opts.key || id;
      if (open.has(key)) { const w = open.get(key); w.el.hidden = false; w.task.classList.remove('is-min'); front(w.el); return w.el; }
      const def = WINS[id]; if (!def) return;
      const el = document.createElement('div');
      el.className = 'oswin';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', def.title);
      el.innerHTML = `<div class="win__bar"><span>${def.title}</span><span class="oswin__ctrls"><button class="win__min" aria-label="Minimize">_</button><button class="win__x" aria-label="Close">×</button></span></div><div class="oswin__body">${def.body()}</div>`;
      const rw = layer.clientWidth, rh = layer.clientHeight;
      const ww = Math.min(360, rw - 24);
      const offX = isSmall() ? 8 : Math.max(8, Math.min(rw - ww - 8, 250 + (cascade % 5) * 46 + (opts.dx || 0)));
      const offY = isSmall() ? 8 : Math.max(8, Math.min(rh - 260, 24 + (cascade % 5) * 34 + (opts.dy || 0)));
      cascade++;
      el.style.left = offX + 'px'; el.style.top = offY + 'px';
      layer.appendChild(el);
      const task = document.createElement('button');
      task.className = 'os__task'; task.textContent = def.title.split(' ')[0];
      task.addEventListener('click', () => { if (el.hidden) { el.hidden = false; task.classList.remove('is-min'); front(el); } else if (el.classList.contains('is-front')) { minimize(); } else front(el); });
      tasks.appendChild(task);
      const minimize = () => { el.hidden = true; task.classList.add('is-min'); SFX.play('close'); };
      el.querySelector('.win__x').addEventListener('click', () => closeWin(key));
      el.querySelector('.win__min').addEventListener('click', minimize);
      el.addEventListener('pointerdown', () => front(el));
      drag(el);
      open.set(key, { el, task });
      front(el);
      SFX.play('open');
      def.onOpen && def.onOpen(el);
      return el;
    }
    function closeWin(key) {
      const w = open.get(key); if (!w) return;
      open.delete(key);
      SFX.play('close');
      w.el.classList.add('is-closing');
      w.task.remove();
      setTimeout(() => w.el.remove(), reduced() ? 0 : 200);
    }
    function front(el) { $$('.oswin', layer).forEach((w) => w.classList.remove('is-front')); el.classList.add('is-front'); el.style.zIndex = ++z; }
    function drag(el) {
      const bar = el.querySelector('.win__bar');
      let sx, sy, ox, oy, on = false;
      bar.addEventListener('pointerdown', (e) => {
        if (isSmall() || e.target.closest('button')) return;
        on = true; el.classList.add('is-drag'); bar.setPointerCapture(e.pointerId);
        sx = e.clientX; sy = e.clientY; ox = el.offsetLeft; oy = el.offsetTop;
      });
      bar.addEventListener('pointermove', (e) => {
        if (!on) return;
        const maxX = layer.clientWidth - 60, maxY = layer.clientHeight - 30;
        el.style.left = Math.max(-el.offsetWidth + 80, Math.min(maxX, ox + e.clientX - sx)) + 'px';
        el.style.top = Math.max(0, Math.min(maxY, oy + e.clientY - sy)) + 'px';
      });
      const end = () => { on = false; el.classList.remove('is-drag'); };
      bar.addEventListener('pointerup', end); bar.addEventListener('pointercancel', end);
    }

    // icons
    $$('.os__icons .icon').forEach((ic) => ic.addEventListener('click', (e) => {
      $$('.os__icons .icon').forEach((i) => i.classList.remove('is-sel'));
      ic.classList.add('is-sel');
      FX.burst(e.clientX || 0, e.clientY || 0, 10);
      openWin(ic.dataset.win);
    }));

    // delegated actions inside windows
    layer.addEventListener('click', async (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.proj) runProject(+t.dataset.proj);
      if (t.dataset.goto) goTo(t.dataset.goto);
      if (t.hasAttribute('data-play')) { goTo('arcade'); setTimeout(() => Arcade.start(), reduced() ? 0 : 700); }
      if (t.dataset.arch) {
        const out = t.closest('.oswin').querySelector('.arch-out');
        if (t.dataset.arch === 'tape') typeInto(out, '> PLAYING TAPE... "IT DIALED A NUMBER THAT DID NOT EXIST YET."', 14);
        if (t.dataset.arch === 'wav') { SFX.play('modem'); typeInto(out, SFX.on ? '> ♪ KSSHHHHH-EEEE-DOOO ♪' : '> ENABLE SOUND TO HEAR THE SIGNAL.', 14); }
        if (t.dataset.arch === 'corrupt') { SFX.play('error'); openWin('error', { key: 'error0', dx: 40, dy: 40 }); }
        if (t.dataset.arch === 'term') Terminal.open();
      }
      if (t.dataset.err) {
        const win = t.closest('.oswin');
        const key = [...open.entries()].find(([, v]) => v.el === win)?.[0];
        if (t.dataset.err === 'retry') {
          SFX.play('error');
          const n = [...open.keys()].filter((k) => k.startsWith('error')).length;
          if (n < 6) openWin('error', { key: 'error' + Date.now(), dx: 30 * n, dy: 26 * n });
          else Device.say('TOO MANY ERRORS. EVEN THE ERRORS ARE TIRED.');
        } else if (t.dataset.err === 'fail') {
          [...open.keys()].filter((k) => k.startsWith('error')).forEach(closeWin);
        } else closeWin(key);
      }
      if (t.dataset.trash) {
        const out = t.closest('.oswin').querySelector('.trash-out');
        if (t.dataset.trash === 'restore') { SFX.play('error'); typeInto(out, '> ACCESS DENIED. SOME THINGS SHOULD STAY DELETED.', 14); }
        else {
          const ul = t.closest('.oswin').querySelector('ul');
          ul.innerHTML = '<li><span>(empty)</span><span>0B</span></li>';
          t.closest('.oswin').querySelector('h4').textContent = '0 ITEMS';
          FX.burst(e.clientX, e.clientY, 50);
          await typeInto(out, '> SHREDDING... ████████ DONE.', 20);
          unlock('trash');
        }
      }
    });

    // start menu
    const sm = $('#osStartMenu'), sb = $('#osStart');
    sb.setAttribute('aria-expanded', 'false');
    sb.addEventListener('click', (e) => { e.stopPropagation(); const v = sm.hidden; sm.hidden = !v; sb.setAttribute('aria-expanded', String(v)); });
    sm.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      sm.hidden = true; sb.setAttribute('aria-expanded', 'false');
      if (b.dataset.win) openWin(b.dataset.win);
      if (b.dataset.action === 'terminal') Terminal.open();
      if (b.dataset.action === 'shutdown') Power.off();
    });
    document.addEventListener('click', (e) => { if (!sm.hidden && !e.target.closest('#osStartMenu')) { sm.hidden = true; sb.setAttribute('aria-expanded', 'false'); } });

    // Blip, the hidden creature
    $('#peeker').addEventListener('click', (e) => { FX.burst(e.clientX, e.clientY, 30); unlock('peeker'); });

    // signal tuner
    function signal(el) {
      const cv = el.querySelector('canvas'), ctx = cv.getContext('2d');
      const inp = el.querySelector('.sig-in'), f = el.querySelector('.sig-f'), m = el.querySelector('.sig-msg');
      let locked = false;
      inp.addEventListener('input', () => {
        const v = +inp.value; f.textContent = v + ' MHZ';
        const d = Math.abs(v - 2089);
        if (d < 4 && !locked) { locked = true; m.textContent = '"HELLO FROM 2089. KEEP BUILDING WEIRD THINGS."'; SFX.play('success'); setTimeout(() => unlock('signal'), 600); }
        else if (!locked) m.textContent = d < 60 ? '…something… is… there…' : d < 250 ? '…faint voices…' : '…static…';
      });
      (function loop(t) {
        if (!el.isConnected) return;
        const v = +inp.value, d = Math.min(1, Math.abs(v - 2089) / 600);
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 200, 60);
        ctx.fillStyle = locked ? '#39ff6a' : '#00eaff';
        for (let x = 0; x < 200; x += 2) {
          const y = 30 + Math.sin(x / (8 + v / 300) + t / 200) * 16 * (1 - d * .5) + (Math.random() - .5) * 40 * d;
          ctx.fillRect(x, y | 0, 2, 2);
        }
        requestAnimationFrame(loop);
      })(0);
    }

    return { openWin };
  })();

  /* ---------------- 8. FILE SYSTEM ---------------- */
  const FS = (() => {
    const TREE = [
      { n: 'WELCOME.TXT', c: `<span class="hl">WELCOME, VISITOR.</span>\n\nYou are browsing the file system of ES-1989/X,\nthe only laptop with nine echoes.\n\nClick a file to read it. Folders open and close.\nOne file is <span class="mg">locked</span>. The password is hidden on this site.\n\n<span class="cy">TIP:</span> press <span class="hl">\`</span> to summon the terminal.` },
      { n: 'STUDIO', d: [
        { n: 'MANIFESTO.TXT', c: `<span class="hl">THE ECHO/STACK MANIFESTO</span>\n\n01. The internet should be fun again.\n02. Every button deserves a reaction.\n03. Nostalgia is a material, not a theme.\n04. Weird is a feature.\n05. Polish is respect.\n06. If nobody clicks it twice, try again.` },
        { n: 'SERVICES.TXT', c: `<span class="hl">WHAT WE BUILD</span>\n\n<span class="cy">▸</span> Interactive websites & microsites\n<span class="cy">▸</span> Browser games & playable campaigns\n<span class="cy">▸</span> Pixel identity systems & mascots\n<span class="cy">▸</span> Creative coding & installations\n<span class="cy">▸</span> Strange internal tools that people actually enjoy` },
        { n: 'PROCESS.TXT', c: `<span class="hl">HOW A PROJECT RUNS</span>\n\nBOOT ......... discovery call, goals, weirdness tolerance\nCOMPILE ...... concept + pixel prototypes\nDEBUG ........ build, test, play, repeat\nLAUNCH ....... ship it, celebrate, high-five the echoes` },
      ] },
      { n: 'PROJECTS', d: [] /* filled from PROJECTS */ },
      { n: 'SYSTEM', d: [
        { n: 'CONFIG.SYS', c: `FILES=99\nBUFFERS=2089\nDEVICE=C:\\ECHO\\LAPTOP.SYS /ECHOES:9\nDEVICE=C:\\ECHO\\FUN.SYS /MAX\nSHELL=C:\\ECHO\\WIN.ECHO\n<span class="mg">REM DO NOT EDIT. IT KNOWS.</span>` },
        { n: 'AUTOEXEC.BAT', c: `@ECHO OFF\nPROMPT $P$G\nPATH C:\\ECHO;C:\\FUTURE\nCALL DIALUP.BAT 2089\nWIN.ECHO\n<span class="hl">REM Built in 1989. Never sold.</span>` },
      ] },
      { n: 'VAULT', d: [ { n: 'SECRET.TXT', lock: true } ] },
    ];
    const tree = $('#tree'), content = $('#fsContent'), path = $('#fsPath'), meta = $('#fsMeta'), lock = $('#fsLock');
    let typingId = 0, vaultOpen = false;

    function build(nodes, parentPath, ul) {
      nodes.forEach((nd) => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.setAttribute('role', 'treeitem');
        const p = parentPath + '\\' + nd.n;
        if (nd.d) {
          b.className = 't-dir'; b.setAttribute('aria-expanded', nd.n === 'STUDIO' ? 'true' : 'false');
          b.innerHTML = `<i class="t-ico"></i>${nd.n}`;
          li.append(b);
          const sub = document.createElement('ul'); sub.setAttribute('role', 'group');
          build(nd.d, p, sub); li.append(sub);
          b.addEventListener('click', () => { const ex = b.getAttribute('aria-expanded') === 'true'; b.setAttribute('aria-expanded', String(!ex)); SFX.play(ex ? 'close' : 'open'); });
        } else {
          b.className = nd.lock ? 't-lock' : 't-file';
          b.innerHTML = `<i class="t-ico"></i>${nd.n}`;
          li.append(b);
          b.addEventListener('click', () => { $$('[role="treeitem"]', tree).forEach((x) => x.classList.remove('is-sel')); b.classList.add('is-sel'); show(nd, p); });
        }
        ul.append(li);
      });
    }

    async function show(nd, p) {
      path.textContent = p;
      const id = ++typingId;
      lock.hidden = true;
      if (nd.lock && !vaultOpen) {
        content.innerHTML = '<span class="mg">ACCESS DENIED.</span>\nTHIS FILE IS ENCRYPTED WITH 8-BIT MILITARY GRADE PASSWORD.\n';
        meta.textContent = 'LOCKED · ?? KB';
        lock.hidden = false; $('#fsPass').value = ''; $('#fsPass').focus({ preventScroll: true });
        return;
      }
      const html = nd.lock ? VAULT_MSG : nd.c;
      meta.textContent = `1 FILE · ${Math.max(1, Math.round(html.length / 120))} KB`;
      // typewriter that preserves markup: type plain text then swap to html
      if (reduced()) { content.innerHTML = html; return; }
      const tmp = document.createElement('div'); tmp.innerHTML = html; const plain = tmp.textContent;
      content.textContent = '';
      for (let i = 0; i < plain.length; i += 3) {
        if (id !== typingId) return;
        content.textContent = plain.slice(0, i);
        await sleep(6);
      }
      if (id === typingId) content.innerHTML = html;
    }

    const VAULT_MSG = `<span class="hl">SECRET.TXT — DECRYPTED</span>\n\nTo whoever finds this machine:\n\nWe built it in 1989 to talk to the future.\nThe future answered with one sentence:\n\n<span class="cy">"MAKE THE INTERNET PLAYFUL AGAIN."</span>\n\nSo that is what we do.\n\n— the ECHO/STACK crew`;

    lock.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = $('#fsPass').value.trim();
      if (v === '1989') {
        vaultOpen = true; lock.hidden = true; SFX.play('success');
        show({ n: 'SECRET.TXT', lock: true }, 'C:\\ROOT\\VAULT\\SECRET.TXT').then(() => unlock('vault'));
      } else {
        SFX.play('error');
        lock.classList.remove('is-wrong'); void lock.offsetWidth; lock.classList.add('is-wrong');
        content.innerHTML += `<span class="mg">WRONG PASSWORD "${v.replace(/[<>&]/g, '')}".</span>\n`;
      }
    });

    function init() {
      TREE[2].d = PROJECTS.map((p, i) => ({ n: p.file, c: `<span class="hl">${p.file}</span>\n\n${p.name}\n${p.desc}\n\n<span class="cy">STACK:</span> ${p.tech.join(' · ')}\n\n<span class="mg">› Run it from section 04 — PROJECTS.</span>`, i }));
      build(TREE, 'C:\\ROOT', tree);
      show(TREE[0], 'C:\\ROOT\\WELCOME.TXT');
      tree.querySelector('.t-file').classList.add('is-sel');
    }
    return { init };
  })();

  /* ---------------- 9. PROJECTS ---------------- */
  // Edit this list to change the portfolio. `url` is optional; when set, LAUNCH opens it.
  const PROJECTS = [
    { file: 'PROJECT_001.EXE', name: 'NEON ORBIT', type: 'WEBSITE', size: '64K', date: '03-14-89', fx: 'planet', url: null,
      desc: 'A scroll-driven launch site for a synth-wave record label. Every track is a planet; scroll to fly between them and hover to hear a preview.',
      tech: ['WEBGL', 'WEB AUDIO', 'GSAP', 'PIXEL SHADERS'] },
    { file: 'PROJECT_002.EXE', name: 'TUNNEL VISION', type: 'GAME', size: '128K', date: '07-02-90', fx: 'tunnel', url: null,
      desc: 'A browser racing game made for a sneaker drop. Players raced through a pixel tunnel to unlock early access codes. 410,000 plays in the first week.',
      tech: ['CANVAS', 'TYPESCRIPT', 'LEADERBOARD API'] },
    { file: 'PROJECT_003.EXE', name: 'DATA RAIN', type: 'INSTALL', size: '256K', date: '11-11-91', fx: 'rain', url: null,
      desc: 'A gallery installation that turned live city transit data into falling pixel rain, projected across a 12-metre wall.',
      tech: ['TOUCHDESIGNER', 'NODE', 'OPEN DATA'] },
    { file: 'PROJECT_004.EXE', name: 'LIFE.COM', type: 'TOOL', size: '32K', date: '02-29-92', fx: 'life', url: null,
      desc: 'An internal brainstorming tool for a design team: ideas spawn as cells, grow when upvoted and die when ignored. Strangely effective.',
      tech: ['SVELTE', 'WEBSOCKETS', 'CELLULAR AUTOMATA'] },
    { file: 'PROJECT_005.EXE', name: 'PLASMA BRAND', type: 'IDENTITY', size: '96K', date: '09-09-93', fx: 'plasma', url: null,
      desc: 'A generative visual identity for a fintech startup that wanted to look like it came from 1993 and 2093 at the same time.',
      tech: ['GENERATIVE DESIGN', 'FIGMA', 'P5.JS'] },
    { file: 'PROJECT_006.EXE', name: 'EQUALIZER', type: 'MICROSITE', size: '48K', date: '12-31-99', fx: 'bars', url: null,
      desc: 'A Y2K-themed year-in-review microsite for a music app. Your listening history became a dancing pixel equalizer you could share.',
      tech: ['REACT', 'CANVAS', 'SHARE CARDS'] },
  ];

  // procedural pixel previews (low-res canvas, scaled up crisp)
  function animPreview(cv, kind, opts = {}) {
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const C = ['#00eaff', '#ffe600', '#ff4fd8', '#39ff6a'];
    const state = { drops: [], life: null, speed: 1 };
    if (kind === 'rain') state.drops = Array.from({ length: Math.round(W / 3) }, () => ({ x: (Math.random() * W) | 0, y: Math.random() * H, v: .3 + Math.random() }));
    if (kind === 'life') { state.life = new Uint8Array(W * H); for (let i = 0; i < state.life.length; i++) state.life[i] = Math.random() < .28 ? 1 : 0; }
    let raf = 0, f = 0;
    function frame() {
      if (!cv.isConnected) return;
      f += state.speed;
      const t = f / 60;
      if (kind === 'planet') {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 30; i++) { ctx.fillStyle = (i + (f >> 4)) % 5 ? '#3a4170' : '#ffe600'; ctx.fillRect((i * 37) % W, (i * 23) % H, 1, 1); }
        const cx = W / 2, cy = H / 2, r = H / 5;
        for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) { ctx.fillStyle = ((x + y + (f >> 3)) & 7) < 2 ? '#ffc400' : '#ffe600'; ctx.fillRect(cx + x, cy + y, 1, 1); }
        for (let a = 0; a < 6.28; a += .04) { const x = Math.cos(a) * r * 1.9, y = Math.sin(a) * r * .5; if (y < 0 && x * x + (y * 2) ** 2 < r * r * 1.1) continue; ctx.fillStyle = '#ff4fd8'; ctx.fillRect((cx + x) | 0, (cy + y) | 0, 1, 1); }
        const mx = cx + Math.cos(t) * r * 2.6, my = cy + Math.sin(t) * r * .9; ctx.fillStyle = '#00eaff'; ctx.fillRect(mx | 0, my | 0, 3, 3);
      } else if (kind === 'tunnel') {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        for (let i = 12; i > 0; i--) {
          const z = ((i - (t * 2) % 1) / 12);
          const w = W * z, h = H * z, ox = Math.sin(t + i * .3) * 6 * (1 - z);
          ctx.strokeStyle = C[i % 3]; ctx.lineWidth = 1;
          ctx.strokeRect(((W - w) / 2 + ox) | 0, ((H - h) / 2) | 0, w | 0, h | 0);
        }
      } else if (kind === 'rain') {
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, W, H);
        for (const d of state.drops) { d.y += d.v * state.speed; if (d.y > H) { d.y = -2; d.x = (Math.random() * W) | 0; } ctx.fillStyle = d.v > 1 ? '#ffe600' : '#00eaff'; ctx.fillRect(d.x, d.y | 0, 1, 2); }
      } else if (kind === 'life') {
        if (f % Math.max(1, (6 / state.speed) | 0) < state.speed) {
          const L = state.life, N = new Uint8Array(L.length);
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            let n = 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) n += L[((y + dy + H) % H) * W + ((x + dx + W) % W)];
            const i = y * W + x; N[i] = (n === 3 || (n === 2 && L[i])) ? 1 : 0;
          }
          if (Math.random() < .1) for (let k = 0; k < 20; k++) N[(Math.random() * N.length) | 0] = 1;
          state.life = N;
        }
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < state.life.length; i++) if (state.life[i]) { ctx.fillStyle = C[(i + (f >> 5)) % 3]; ctx.fillRect(i % W, (i / W) | 0, 1, 1); }
      } else if (kind === 'plasma') {
        const img = ctx.createImageData(W, H), d = img.data;
        const pal = [[0, 0, 0], [0, 234, 255], [255, 230, 0], [255, 79, 216], [12, 10, 28]];
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const v = Math.sin(x / 7 + t) + Math.sin(y / 5 - t * 1.3) + Math.sin((x + y) / 9 + t * .7);
          const c = pal[((v + 3) * 1.2 | 0) % pal.length], i = (y * W + x) * 4;
          d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
      } else if (kind === 'bars') {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        const n = 12, bw = Math.floor(W / n);
        for (let i = 0; i < n; i++) {
          const h = ((Math.sin(t * 3 + i * .9) + Math.sin(t * 5.3 + i * 1.7) + 2) / 4) * (H - 6);
          for (let y = 0; y < h; y += 3) { ctx.fillStyle = y > H * .6 ? '#ff4fd8' : y > H * .35 ? '#ffe600' : '#00eaff'; ctx.fillRect(i * bw + 1, H - 2 - y, bw - 2, 2); }
        }
      }
      raf = requestAnimationFrame(frame);
    }
    if (reduced()) { state.speed = 0; frame(); cancelAnimationFrame(raf); f = 40; return state; }
    frame();
    return state;
  }

  const projList = $('#projList');
  PROJECTS.forEach((p, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<button class="dir__item" data-i="${i}" aria-label="Run ${p.file}, ${p.name}"><span class="nm"><span>${p.file}</span></span><span class="ty">${p.type}</span><span class="sz">${p.size}</span><span class="dt">${p.date}</span></button>`;
    projList.append(li);
  });
  $('#projCount').textContent = PROJECTS.length + ' FILE(S)';
  projList.addEventListener('click', (e) => { const b = e.target.closest('.dir__item'); if (b) runProject(+b.dataset.i, b); });

  let modalReturn = null;
  async function runProject(i, rowBtn) {
    const p = PROJECTS[i]; if (!p) return;
    const layer = $('#modalLayer');
    modalReturn = rowBtn || document.activeElement;
    if (rowBtn) rowBtn.classList.add('is-running');
    layer.innerHTML = '';
    layer.classList.add('is-on');
    const win = document.createElement('div');
    win.className = 'pwin'; win.setAttribute('role', 'dialog'); win.setAttribute('aria-modal', 'true'); win.setAttribute('aria-label', p.name);
    win.innerHTML = `<div class="win__bar"><span>C:\\PROJECTS\\${p.file}</span><button class="win__x" aria-label="Close project">×</button></div><pre class="pwin__load" aria-live="polite"></pre>`;
    layer.append(win);
    win.querySelector('.win__x').addEventListener('click', closeProject);
    win.querySelector('.win__x').focus({ preventScroll: true });
    SFX.play('open');
    const load = win.querySelector('.pwin__load');
    const steps = ['C:\\PROJECTS> ' + p.file, '> EXECUTING PROJECT...', '> LOADING ASSETS... ', '> CHECKING ECHOES... 9/9', '> SYSTEM APPROVED'];
    for (const s of steps) {
      if (!win.isConnected) return;
      const line = document.createElement('div'); load.append(line);
      await typeInto(line, s, 10);
      if (s.includes('LOADING')) { for (let k = 0; k <= 10; k++) { line.textContent = '> LOADING ASSETS... ' + '█'.repeat(k) + '░'.repeat(10 - k); await sleep(reduced() ? 0 : 35); } }
      await sleep(reduced() ? 0 : 90);
    }
    if (!win.isConnected) return;
    SFX.play('success');
    await sleep(reduced() ? 0 : 200);
    load.remove();
    const body = document.createElement('div');
    body.className = 'pwin__grid';
    body.innerHTML = `
      <div class="pwin__prev"><canvas width="96" height="72" aria-label="${p.name} animated preview"></canvas><span class="tag">PREVIEW</span></div>
      <div>
        <p class="pwin__meta">${p.type} · ${p.size} · ${p.date}</p>
        <h3>${p.name}</h3>
        <p>${p.desc}</p>
        <ul class="chips">${p.tech.map((t) => `<li>${t}</li>`).join('')}</ul>
        <p class="pwin__ok">✓ SYSTEM APPROVED</p>
        <div class="oswin__actions"><button class="pxbtn pxbtn--yellow" data-launch>[ LAUNCH ]</button><button class="pxbtn" data-close>[ EXIT ]</button></div>
      </div>`;
    win.append(body);
    const st = animPreview(body.querySelector('canvas'), p.fx);
    body.querySelector('[data-close]').addEventListener('click', closeProject);
    body.querySelector('[data-launch]').addEventListener('click', async (e) => {
      const ok = body.querySelector('.pwin__ok');
      FX.burst(e.clientX, e.clientY, 60);
      SFX.play('coin');
      st.speed = 4;
      body.querySelector('.tag').textContent = 'RUNNING ×4';
      await typeInto(ok, '> LAUNCHED. RUNNING AT 2089 MHZ', 16);
      if (p.url) window.open(p.url, '_blank', 'noopener');
    });
  }
  function closeProject() {
    const layer = $('#modalLayer'), win = layer.querySelector('.pwin');
    $$('.dir__item.is-running').forEach((b) => b.classList.remove('is-running'));
    if (!win) return;
    SFX.play('close');
    win.classList.add('is-closing');
    setTimeout(() => { layer.innerHTML = ''; layer.classList.remove('is-on'); }, reduced() ? 0 : 200);
    if (modalReturn && modalReturn.focus) modalReturn.focus({ preventScroll: true });
  }
  $('#modalLayer').addEventListener('click', (e) => { if (e.target.id === 'modalLayer') closeProject(); });

  /* ---------------- 10. ARCADE ---------------- */
  const Arcade = (() => {
    const ov = $('#gOverlay');
    const game = window.StarCatcher.create({
      canvas: $('#game'),
      sfx: (n) => SFX.play(n),
      onHud: (h) => { $('#gScore').textContent = h.score; $('#gHigh').textContent = h.high; $('#gLives').textContent = h.lives; },
      onState: (s, d) => {
        if (s === 'play') ov.hidden = true;
        if (s === 'over') {
          ov.hidden = false;
          ov.innerHTML = `<p class="cab__title">GAME OVER</p><p>SCORE ${d.score}</p>${d.record ? '<p class="blink" style="color:var(--y)">NEW HIGH SCORE!</p>' : '<p>HIGH SCORE ' + $('#gHigh').textContent + '</p>'}<button class="pxbtn pxbtn--yellow" id="gAgain">[ PLAY AGAIN ]</button>`;
          $('#gAgain').addEventListener('click', start);
          $('#gAgain').focus({ preventScroll: true });
        }
      },
    });
    function start() { game.start(); $('#game').focus && $('#game').setAttribute('tabindex', '0'); }
    $('#gStart').addEventListener('click', start);
    $('#padS').addEventListener('click', () => (game.running ? game.togglePause() : start()));
    const hold = (btn, dir) => {
      const dn = (e) => { e.preventDefault(); btn.classList.add('is-down'); game.setKey(dir, true); };
      const up = () => { btn.classList.remove('is-down'); game.setKey(dir, false); };
      btn.addEventListener('pointerdown', dn); btn.addEventListener('pointerup', up); btn.addEventListener('pointerleave', up); btn.addEventListener('pointercancel', up);
    };
    hold($('#padL'), 'l'); hold($('#padR'), 'r');
    const cv = $('#game');
    cv.addEventListener('pointerdown', (e) => { if (!game.running) return start(); game.setPointer(e.clientX); });
    cv.addEventListener('pointermove', (e) => { if (game.running && (e.pointerType !== 'mouse' || e.buttons)) game.setPointer(e.clientX); else if (game.running && e.pointerType === 'mouse') game.setPointer(e.clientX); });
    cv.addEventListener('pointerleave', () => game.setPointer(null));

    let inView = false;
    new IntersectionObserver(([en]) => { inView = en.isIntersecting; if (!inView) game.pause(); }, { threshold: .35 }).observe($('.cab'));

    document.addEventListener('keydown', (e) => {
      if (isTyping() || !inView) return;
      if (e.code === 'Space' || e.key === 'Enter' && document.activeElement === cv) {
        if (document.activeElement && document.activeElement.tagName === 'BUTTON' && !game.running) return; // let buttons handle themselves
        e.preventDefault();
        game.running ? game.togglePause() : start();
      }
      game.onKey(e, true);
    });
    document.addEventListener('keyup', (e) => game.onKey(e, false));
    return { start, game };
  })();

  /* ---------------- 11. ABOUT / CONTACT / POWER ---------------- */
  $$('#meters b').forEach((b) => b.style.setProperty('--v', b.dataset.v));
  new IntersectionObserver(([en], o) => { if (en.isIntersecting) { $('#meters').classList.add('is-on'); o.disconnect(); } }, { threshold: .4 }).observe($('#meters'));

  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    $$('.phosphor__opts button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.theme === t)));
    store.set('theme', t);
    FX.refresh();
  }
  $$('.phosphor__opts button').forEach((b) => b.addEventListener('click', (e) => { setTheme(b.dataset.theme); FX.burst(e.clientX, e.clientY, 24); Device.say('PHOSPHOR SET TO ' + b.dataset.theme.toUpperCase()); }));
  setTheme(store.get('theme', 'neon'));

  // Contact form — no backend is required: after the dial-up animation the visitor
  // can send the message through their email app (mailto). Swap `sendMessage` for a
  // real endpoint (Formspree, Netlify Forms, your API...) when you deploy.
  const CONTACT_EMAIL = 'hello@echostack.studio';
  async function sendMessage(data) { await sleep(200); return { ok: true, data }; }
  $('#modemForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget, err = $('#modemErr');
    const data = Object.fromEntries(new FormData(f));
    if (!data.name.trim()) return (err.textContent = '> ERROR: NAME REQUIRED', SFX.play('error'), f.name.focus());
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) return (err.textContent = '> ERROR: INVALID EMAIL ADDRESS', SFX.play('error'), f.email.focus());
    if (data.msg.trim().length < 3) return (err.textContent = '> ERROR: MESSAGE TOO SHORT', SFX.play('error'), f.msg.focus());
    err.textContent = '';
    const body = f.querySelector('.modem__body'), log = $('#modemLog');
    body.hidden = true; log.hidden = false; log.textContent = '';
    SFX.play('modem');
    const lines = ['ATZ', 'OK', 'ATDT 555-2089', 'RINGING...', 'CONNECT 2400', 'UPLOADING TRANSMISSION ' + '█'.repeat(12), ''];
    for (const l of lines) { const d = document.createElement('div'); log.append(d); await typeInto(d, l, 14); await sleep(reduced() ? 0 : 160); }
    await sendMessage(data);
    SFX.play('success');
    const done = document.createElement('div');
    done.innerHTML = `<span style="color:var(--y)">&gt; MESSAGE TRANSMITTED. THANK YOU, ${data.name.replace(/[<>&"]/g, '').toUpperCase()}.</span>\n\n`;
    const mail = document.createElement('a');
    mail.className = 'pxbtn pxbtn--yellow'; mail.style.display = 'inline-block'; mail.style.textDecoration = 'none';
    mail.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Transmission from ' + data.name)}&body=${encodeURIComponent(data.msg + '\n\n— ' + data.name + ' <' + data.email + '>')}`;
    mail.textContent = '[ SEND VIA EMAIL APP ]';
    const again = document.createElement('button');
    again.className = 'pxbtn'; again.type = 'button'; again.textContent = '[ NEW MESSAGE ]'; again.style.marginLeft = '12px'; again.style.marginTop = '12px';
    again.addEventListener('click', () => { f.reset(); log.hidden = true; body.hidden = false; f.name.focus(); });
    done.append(mail, again);
    log.append(done);
    FX.burst(innerWidth / 2, innerHeight / 2, 50);
  });

  const Power = (() => {
    const po = $('#poweroff');
    function off() {
      SFX.play('close');
      document.body.classList.add('is-off');
      setTimeout(() => { po.hidden = false; $('#powerOn').focus({ preventScroll: true }); }, reduced() ? 0 : 480);
    }
    $('#powerOn').addEventListener('click', () => {
      po.hidden = true; document.body.classList.remove('is-off');
      window.scrollTo(0, 0);
      const d = $('#device'); d.classList.remove('is-in'); void d.offsetWidth; d.classList.add('is-in');
      SFX.play('boot'); toast('WELCOME BACK.');
      Device.say('REBOOT COMPLETE. HELLO AGAIN.');
    });
    $('#shutdownBtn').addEventListener('click', off);
    return { off };
  })();

  $('#footSecret').addEventListener('click', (e) => { FX.burst(e.clientX, e.clientY, 20); unlock('pi'); });

  /* ---------------- 12. TERMINAL + KEYS + EGGS ---------------- */
  const Terminal = (() => {
    const box = $('#terminal'), out = $('#termOut'), inp = $('#termInput');
    const hist = []; let hi = 0, greeted = false;
    function print(html, cls) { const d = document.createElement('div'); if (cls) d.className = cls; d.innerHTML = html; out.append(d); out.scrollTop = out.scrollHeight; }
    function open() {
      box.hidden = false;
      if (!greeted) { greeted = true; print('ECHO-OS TERMINAL v1.989 — type <span class="y">help</span>'); }
      setTimeout(() => inp.focus({ preventScroll: true }), 30);
      SFX.play('open');
      if (!found.has('terminal')) setTimeout(() => unlock('terminal'), 500);
    }
    function close() { box.hidden = true; SFX.play('close'); }
    const sections = ['boot-section', 'desktop', 'files', 'projects', 'arcade', 'about', 'contact'];
    const CMDS = {
      help: () => print(`<span class="c">COMMANDS</span>
help · ls · goto &lt;section&gt; · open &lt;window&gt; · run &lt;1-6&gt;
play · theme &lt;neon|amber|green|vapor&gt; · sound &lt;on|off&gt;
whoami · date · secrets · glitch · hack · sudo · clear · exit`),
      ls: () => print(sections.map((s, i) => `<span class="y">0${i + 1}</span> ${s === 'boot-section' ? 'boot' : s}/`).join('   ')),
      goto: (a) => { const s = a === 'boot' ? 'boot-section' : a; if (sections.includes(s)) { print('> jumping to ' + a); goTo(s); } else print('section not found. try ls', 'm'); },
      cd: (a) => CMDS.goto(a),
      open: (a) => { const ok = ['projects', 'archive', 'system', 'arcade', 'signal', 'contact', 'trash'].includes(a); if (ok) { goTo('desktop'); setTimeout(() => OS.openWin(a), 500); print('> opening ' + a); } else print('usage: open projects|archive|system|arcade|signal|contact|trash', 'm'); },
      run: (a) => { const i = parseInt(a, 10) - 1; if (PROJECTS[i]) { print('> executing ' + PROJECTS[i].file); runProject(i); } else print('usage: run 1-6', 'm'); },
      play: () => { goTo('arcade'); setTimeout(() => Arcade.start(), 700); print('> insert coin...'); },
      theme: (a) => { if (['neon', 'amber', 'green', 'vapor'].includes(a)) { setTheme(a); print('> phosphor: ' + a); } else print('usage: theme neon|amber|green|vapor', 'm'); },
      sound: (a) => { SFX.set(a === 'on'); print('> sound ' + (SFX.on ? 'on' : 'off')); },
      whoami: () => print('visitor@' + (new Date().getFullYear()) + ' — curious, persistent, probably clicking everything'),
      date: () => print(new Date().toString().toUpperCase() + '  <span class="m">(SIGNAL ORIGIN: 2089)</span>'),
      secrets: () => print(`found ${found.size}/${TOTAL}: ` + ([...found].join(', ') || 'none yet') + '<br><span class="c">hints:</span> old cheat codes · impatient clicking · something behind the taskbar · the year it was built · the trash · 2089 MHz · the smallest thing at the bottom'),
      glitch: () => { doGlitch(); print('> r̷e̴a̸l̷i̶t̵y̴ ̷u̴n̸s̷t̶a̵b̴l̷e̴'); },
      hack: async () => { for (let i = 0; i < 8; i++) { print(Array.from({ length: 6 }, () => Math.random().toString(16).slice(2, 8).toUpperCase()).join(' '), i % 2 ? 'c' : ''); await sleep(60); } print('ACCESS GRANTED... to absolutely nothing. but it looked cool.', 'y'); },
      sudo: () => { print('[sudo] password for visitor: ********'); setTimeout(() => print('visitor is not in the sudoers file. this incident will be reported to 2089.', 'm'), 400); },
      clear: () => { out.innerHTML = ''; },
      exit: () => close(),
      reset: () => { found = new Set(); store.set('secrets', []); renderSecrets(); print('> secrets reset'); },
      echo: (a, raw) => print(raw.replace(/[<>&]/g, '') || ' '),
      1989: () => print('the year it was built. you might need that somewhere.', 'y'),
      konami: () => print('↑ ↑ ↓ ↓ ← → ← → B A', 'y'),
    };
    $('#termForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = inp.value.trim(); inp.value = '';
      if (!raw) return;
      hist.push(raw); hi = hist.length;
      print('<span class="y">root@echo:~$</span> ' + raw.replace(/[<>&]/g, ''));
      const [cmd, ...rest] = raw.split(/\s+/);
      const fn = CMDS[cmd.toLowerCase()];
      if (fn) fn((rest[0] || '').toLowerCase(), rest.join(' ')); else { print(`'${cmd.replace(/[<>&]/g, '')}' is not recognized. type help`, 'm'); SFX.play('error'); }
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') { hi = Math.max(0, hi - 1); inp.value = hist[hi] || ''; e.preventDefault(); }
      if (e.key === 'ArrowDown') { hi = Math.min(hist.length, hi + 1); inp.value = hist[hi] || ''; e.preventDefault(); }
      if (e.key === 'Escape' || e.key === '`') { e.preventDefault(); close(); }
    });
    $('#termClose').addEventListener('click', close);
    return { open, close, get isOpen() { return !box.hidden; } };
  })();

  function doGlitch() {
    if (reduced()) return;
    SFX.play('error');
    document.body.classList.add('glitching');
    setTimeout(() => document.body.classList.remove('glitching'), 380);
  }

  // Konami code + typed words
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let kpos = 0, typed = '';
  document.addEventListener('keydown', (e) => {
    if (!Boot.done) return;
    if (e.key === 'Escape') {
      if (!$('#found').hidden) closeFound();
      else if ($('#modalLayer').classList.contains('is-on')) closeProject();
      else if (Terminal.isOpen) Terminal.close();
      return;
    }
    if (isTyping()) return;
    if (e.key === '`' || e.key === '~') { e.preventDefault(); Terminal.isOpen ? Terminal.close() : Terminal.open(); return; }
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    kpos = k === KONAMI[kpos] ? kpos + 1 : (k === KONAMI[0] ? 1 : 0);
    if (kpos === KONAMI.length) {
      kpos = 0;
      const on = !document.documentElement.classList.contains('cheat-on');
      document.documentElement.classList.toggle('cheat-on', on);
      $('main').classList.toggle('cheat', on);
      Arcade.game.setInfinite(on);
      if (on) unlock('konami'); else toast('CHEAT MODE OFF');
    }
    if (e.key.length === 1) {
      typed = (typed + e.key.toLowerCase()).slice(-12);
      if (typed.endsWith('glitch')) doGlitch();
      if (typed.endsWith('hello')) Device.say('HELLO, HUMAN. THE ECHOES SAY HI.');
      if (typed.endsWith('2089')) toast('SIGNAL ORIGIN CONFIRMED: 2089');
    }
  });

  // console greeting for devs
  console.log('%c ECHO/STACK %c Built on ECHO-OS v1.989 — press ` on the page for the terminal. ', 'background:#ffe600;color:#000;font-weight:bold', 'color:#00eaff');

  /* ---------------- INIT ---------------- */
  FS.init();
  if (store.get('sound', false)) { /* remembered preference applies only after a click on the boot screen */ }
  Boot.run();
})();
