// ══════════════════════════════════════════════════════════════════
//  Beartify Extension — Themes/theme-currents/main.js
//  Thème "Currents" — Tame Impala
//
//  Enregistre window.BeartifyExtensions['theme-currents']
// ══════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const ID       = 'theme-currents';
  const STYLE_ID = 'ext-currents-styles';
  const CANVAS_ID = 'ext-currents-canvas';

  // ── Palette Currents (pochette de l'album) ────────────────────────
  const PALETTE = [
    '#b388ff', // mauve pastel
    '#80deea', // teal clair
    '#ffcc80', // or doux
    '#f48fb1', // rose pâle
    '#a5d6a7', // vert sauge
    '#90caf9', // bleu ciel
  ];

  // ── Canvas ────────────────────────────────────────────────────────
  let _canvas = null;
  let _ctx    = null;
  let _raf    = null;
  let _orb    = { x: 0, y: -80, vy: 1.4, vx: 0.45, r: 28, colorIdx: 0, trail: [] };

  function _createCanvas() {
    if (document.getElementById(CANVAS_ID)) return;
    _canvas        = document.createElement('canvas');
    _canvas.id     = CANVAS_ID;
    _canvas.style.cssText = [
      'position:fixed', 'top:0', 'left:0',
      'width:100%', 'height:100%',
      'pointer-events:none',
      'z-index:0',
      'opacity:0.55',
      'mix-blend-mode:screen',
    ].join(';');
    document.body.prepend(_canvas);
    _resize();
    window.addEventListener('resize', _resize);
  }

  function _resize() {
    if (!_canvas) return;
    _canvas.width  = window.innerWidth;
    _canvas.height = window.innerHeight;
    _ctx = _canvas.getContext('2d');
  }

  function _tick() {
    if (!_canvas || !_ctx) return;
    const W = _canvas.width, H = _canvas.height;

    // Effacement partiel → traîne
    _ctx.fillStyle = 'rgba(0,0,0,0.055)';
    _ctx.fillRect(0, 0, W, H);

    _orb.trail.push({ x: _orb.x, y: _orb.y, r: _orb.r });
    if (_orb.trail.length > 42) _orb.trail.shift();

    const color = PALETTE[_orb.colorIdx];

    // Traîne
    _orb.trail.forEach((pt, i) => {
      const p = i / _orb.trail.length;
      _ctx.beginPath();
      _ctx.arc(pt.x, pt.y, pt.r * (0.25 + p * 0.75), 0, Math.PI * 2);
      _ctx.fillStyle = _rgba(color, p * 0.35);
      _ctx.fill();
    });

    // Halo
    const glow = _ctx.createRadialGradient(_orb.x, _orb.y, 0, _orb.x, _orb.y, _orb.r * 3.8);
    glow.addColorStop(0,   _rgba(color, 0.5));
    glow.addColorStop(0.4, _rgba(color, 0.15));
    glow.addColorStop(1,   _rgba(color, 0));
    _ctx.beginPath();
    _ctx.arc(_orb.x, _orb.y, _orb.r * 3.8, 0, Math.PI * 2);
    _ctx.fillStyle = glow;
    _ctx.fill();

    // Corps
    const ball = _ctx.createRadialGradient(
      _orb.x - _orb.r * 0.3, _orb.y - _orb.r * 0.3, _orb.r * 0.05,
      _orb.x, _orb.y, _orb.r
    );
    ball.addColorStop(0, _lighten(color, 0.55));
    ball.addColorStop(1, color);
    _ctx.beginPath();
    _ctx.arc(_orb.x, _orb.y, _orb.r, 0, Math.PI * 2);
    _ctx.fillStyle = ball;
    _ctx.fill();

    // Physique
    _orb.x += _orb.vx;
    _orb.y += _orb.vy;
    if (_orb.y > H * 0.5) _orb.vy = Math.min(_orb.vy + 0.011, 3.0);

    // Rebonds latéraux
    if (_orb.x - _orb.r < 0)  { _orb.x = _orb.r;     _orb.vx =  Math.abs(_orb.vx); }
    if (_orb.x + _orb.r > W)  { _orb.x = W - _orb.r; _orb.vx = -Math.abs(_orb.vx); }

    // Sortie par le bas → reset
    if (_orb.y - _orb.r > H) {
      _orb.y       = -_orb.r * 2;
      _orb.x       = _orb.r + Math.random() * (W - _orb.r * 2);
      _orb.vy      = 1.1 + Math.random() * 0.7;
      _orb.vx      = (Math.random() - 0.5) * 1.3;
      _orb.colorIdx = (_orb.colorIdx + 1) % PALETTE.length;
      _orb.trail   = [];
    }

    _raf = requestAnimationFrame(_tick);
  }

  function _startAnim() {
    if (_raf) return;
    _orb.x = 80 + Math.random() * (window.innerWidth - 160);
    _orb.y = -60;
    _raf = requestAnimationFrame(_tick);
  }

  function _stopAnim() {
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
  }

  function _destroyCanvas() {
    _stopAnim();
    window.removeEventListener('resize', _resize);
    document.getElementById(CANVAS_ID)?.remove();
    _canvas = null; _ctx = null;
  }

  // ── CSS overrides ─────────────────────────────────────────────────
  function _injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id    = STYLE_ID;
    el.textContent = `
:root {
  --green:       #b388ff !important;
  --green-hover: #c8a6ff !important;
}
#spicyGlobalBg { background: #0d0a14 !important; }
.track-item.active .track-title { color: #b388ff !important; }
.filter-pill.active {
  background: rgba(179,136,255,0.15) !important;
  border-color: rgba(179,136,255,0.4) !important;
}
.mkt-tab.active { border-bottom-color: #b388ff !important; }
#progressFill, .mob-mini-fill {
  background: linear-gradient(90deg, #b388ff, #80deea) !important;
}
.home-card:hover, .artist-card:hover {
  box-shadow: 0 8px 32px rgba(179,136,255,0.18) !important;
}
.playlist-play-circle, .detail-play-circle {
  background: #b388ff !important;
  box-shadow: 0 4px 20px rgba(179,136,255,0.4) !important;
}
.playlist-play-circle:hover, .detail-play-circle:hover {
  background: #c8a6ff !important;
}
    `;
    document.head.appendChild(el);
  }

  function _removeStyles() { document.getElementById(STYLE_ID)?.remove(); }

  // ── Helpers ───────────────────────────────────────────────────────
  function _rgba(hex, a) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  }
  function _lighten(hex, amt) {
    return `rgb(${[1,3,5].map(i => Math.min(255, parseInt(hex.slice(i,i+2),16) + Math.round(255*amt))).join(',')})`;
  }

  // ── API ───────────────────────────────────────────────────────────
  window.BeartifyExtensions = window.BeartifyExtensions || {};
  window.BeartifyExtensions[ID] = {
    name:    'Currents',
    version: '1.0.0',
    activate() {
      _injectStyles();
      _createCanvas();
      _startAnim();
      console.info('[Currents] Activé.');
    },
    deactivate() {
      _destroyCanvas();
      _removeStyles();
      console.info('[Currents] Désactivé.');
    },
  };
})();
