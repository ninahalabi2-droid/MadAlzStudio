/* =========================================================
   STAR CATCHER — tiny canvas arcade game
   Exposes window.StarCatcher.create(opts)
   ========================================================= */
(function () {
  'use strict';

  const W = 160, H = 120;            // logical pixel resolution (scaled 3x on canvas)
  const PAL = { bg: '#000', c: '#00eaff', y: '#ffe600', m: '#ff4fd8', k: '#000', w: '#e9f7ff', g: '#39ff6a' };

  // 8x6 ship sprite (1 = cyan, 2 = yellow, 3 = magenta)
  const SHIP = [
    '...22...',
    '...11...',
    '..1111..',
    '.111111.',
    '11311311',
    '1..33..1',
  ];
  const STAR = ['.2.', '222', '.2.'];
  const GLITCH = ['33.3', '.333', '333.', '3.33'];

  function drawSprite(ctx, spr, x, y, colors) {
    for (let r = 0; r < spr.length; r++) {
      for (let c = 0; c < spr[r].length; c++) {
        const ch = spr[r][c];
        if (ch === '.') continue;
        ctx.fillStyle = colors[ch];
        ctx.fillRect((x + c) | 0, (y + r) | 0, 1, 1);
      }
    }
  }

  function create(opts) {
    const canvas = opts.canvas;
    const ctx = canvas.getContext('2d');
    canvas.width = W * 3; canvas.height = H * 3;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(3, 0, 0, 3, 0, 0);

    let high = 9900; // session high score (kept in memory)

    const st = {
      running: false, paused: false, over: false,
      x: W / 2 - 4, vx: 0, score: 0, lives: 3, t: 0, level: 1,
      items: [], sparks: [], bg: [], shake: 0, invuln: 0, combo: 0,
      infinite: false,
    };
    const keys = { l: false, r: false };
    let raf = 0, last = 0, pointerX = null;

    for (let i = 0; i < 40; i++) st.bg.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * .6 + .2 });

    function fmt(n) { return String(Math.min(999999, n)).padStart(6, '0'); }
    function hud() {
      opts.onHud && opts.onHud({ score: fmt(st.score), high: fmt(high), lives: st.infinite ? '∞' : '♥'.repeat(Math.max(0, st.lives)) || '—' });
    }

    function reset() {
      st.x = W / 2 - 4; st.vx = 0; st.score = 0; st.lives = 3; st.t = 0; st.level = 1;
      st.items = []; st.sparks = []; st.over = false; st.invuln = 0; st.combo = 0;
      hud();
    }

    function spawn() {
      const glitchChance = Math.min(.45, .18 + st.level * .03);
      const isG = Math.random() < glitchChance;
      st.items.push({
        x: 4 + Math.random() * (W - 12), y: -6,
        vy: (isG ? 32 : 26) + st.level * 5 + Math.random() * 12,
        g: isG, wob: Math.random() * 6.28,
      });
    }

    function burst(x, y, col, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.28, s = 20 + Math.random() * 50;
        st.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .5 + Math.random() * .4, col });
      }
    }

    function update(dt) {
      st.t += dt;
      st.level = 1 + Math.floor(st.score / 400);
      // movement
      const acc = 420, max = 110;
      if (pointerX !== null) {
        const target = pointerX - 4;
        st.vx = Math.max(-max, Math.min(max, (target - st.x) * 10));
      } else {
        if (keys.l) st.vx -= acc * dt;
        if (keys.r) st.vx += acc * dt;
        if (!keys.l && !keys.r) st.vx *= Math.pow(.0005, dt);
        st.vx = Math.max(-max, Math.min(max, st.vx));
      }
      st.x = Math.max(0, Math.min(W - 8, st.x + st.vx * dt));

      // spawn rate scales with level
      const rate = Math.min(3.4, 1.1 + st.level * .3);
      if (Math.random() < rate * dt) spawn();

      const sy = H - 10;
      for (let i = st.items.length - 1; i >= 0; i--) {
        const it = st.items[i];
        it.y += it.vy * dt;
        it.wob += dt * 4;
        if (it.g) it.x += Math.sin(it.wob) * 10 * dt;
        const w = it.g ? 4 : 3;
        if (it.y + w > sy && it.y < sy + 6 && it.x + w > st.x && it.x < st.x + 8) {
          st.items.splice(i, 1);
          if (it.g) {
            if (st.invuln <= 0) {
              if (!st.infinite) st.lives--;
              st.shake = .3; st.invuln = 1.2; st.combo = 0;
              burst(it.x, it.y, PAL.m, 18);
              opts.sfx && opts.sfx('hit');
              if (st.lives <= 0) return gameOver();
            }
          } else {
            st.combo++;
            const pts = 10 * Math.min(8, st.combo) * st.level;
            st.score += pts;
            burst(it.x + 1, it.y + 1, st.combo > 4 ? PAL.c : PAL.y, 8);
            opts.sfx && opts.sfx('pickup');
          }
          hud();
          continue;
        }
        if (it.y > H + 4) {
          if (!it.g) st.combo = 0;
          st.items.splice(i, 1);
        }
      }
      for (let i = st.sparks.length - 1; i >= 0; i--) {
        const p = st.sparks[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 80 * dt; p.life -= dt;
        if (p.life <= 0) st.sparks.splice(i, 1);
      }
      for (const s of st.bg) { s.y += s.s * 20 * dt * (1 + st.level * .2); if (s.y > H) { s.y = 0; s.x = Math.random() * W; } }
      if (st.shake > 0) st.shake -= dt;
      if (st.invuln > 0) st.invuln -= dt;
    }

    function draw() {
      ctx.save();
      if (st.shake > 0) ctx.translate((Math.random() - .5) * 3, (Math.random() - .5) * 3);
      ctx.fillStyle = PAL.bg; ctx.fillRect(-4, -4, W + 8, H + 8);
      for (const s of st.bg) { ctx.fillStyle = s.s > .6 ? '#5d6690' : '#2a2f55'; ctx.fillRect(s.x | 0, s.y | 0, 1, 1); }
      // ground line
      ctx.fillStyle = '#1d1944'; ctx.fillRect(0, H - 3, W, 3);
      for (let x = 0; x < W; x += 8) { ctx.fillStyle = (x / 8 + ((st.t * 6) | 0)) % 2 ? PAL.m : '#1d1944'; ctx.fillRect(x, H - 3, 4, 1); }

      for (const it of st.items) {
        if (it.g) drawSprite(ctx, GLITCH, it.x, it.y, { 3: Math.random() < .5 ? PAL.m : PAL.w });
        else drawSprite(ctx, STAR, it.x, it.y, { 2: PAL.y });
      }
      if (!(st.invuln > 0 && ((st.t * 12) | 0) % 2)) drawSprite(ctx, SHIP, st.x, H - 10, { 1: PAL.c, 2: PAL.y, 3: PAL.m });
      // thruster
      if (st.running && !st.paused) { ctx.fillStyle = ((st.t * 20) | 0) % 2 ? PAL.y : PAL.m; ctx.fillRect((st.x + 3) | 0, H - 4, 2, 1); }
      for (const p of st.sparks) { ctx.fillStyle = p.col; ctx.fillRect(p.x | 0, p.y | 0, 1, 1); }

      if (st.combo > 2 && st.running) {
        ctx.fillStyle = PAL.c; ctx.font = '6px "Press Start 2P", monospace'; ctx.textAlign = 'right';
        ctx.fillText('x' + Math.min(8, st.combo), W - 3, 9);
      }
      if (st.paused) {
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = PAL.y; ctx.font = '8px "Press Start 2P", monospace'; ctx.textAlign = 'center';
        ctx.fillText('PAUSED', W / 2, H / 2);
      }
      ctx.restore();
    }

    function loop(ts) {
      const dt = Math.min(.05, (ts - last) / 1000 || 0);
      last = ts;
      if (st.running && !st.paused) update(dt);
      draw();
      if (st.running) raf = requestAnimationFrame(loop);
    }

    function start() {
      if (st.running && st.paused) return togglePause();
      if (st.running) return;
      reset();
      st.running = true; st.paused = false;
      opts.onState && opts.onState('play');
      opts.sfx && opts.sfx('coin');
      last = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    }

    function gameOver() {
      st.running = false; st.over = true;
      let record = false;
      if (st.score > high) { high = st.score; record = true; }
      hud(); draw();
      opts.sfx && opts.sfx('gameover');
      opts.onState && opts.onState('over', { score: fmt(st.score), record, raw: st.score });
    }

    function togglePause() {
      if (!st.running) return;
      st.paused = !st.paused;
      if (!st.paused) { last = performance.now(); }
      draw();
    }

    function pause() { if (st.running && !st.paused) togglePause(); }

    // input
    const onKey = (e, down) => {
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.l = down; pointerX = null; if (st.running) e.preventDefault(); }
      if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.r = down; pointerX = null; if (st.running) e.preventDefault(); }
    };
    function setKey(dir, down) { keys[dir] = down; pointerX = null; }
    function setPointer(clientX) {
      if (clientX === null) { pointerX = null; return; }
      const r = canvas.getBoundingClientRect();
      pointerX = ((clientX - r.left) / r.width) * W;
    }

    reset(); draw();

    return {
      start, pause, togglePause, onKey, setKey, setPointer,
      get running() { return st.running; },
      get paused() { return st.paused; },
      setInfinite(v) { st.infinite = v; hud(); },
    };
  }

  window.StarCatcher = { create };
})();
