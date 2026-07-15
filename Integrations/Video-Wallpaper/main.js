// ══════════════════════════════════════════════════════════════════
//  Beartify Extension — Integrations/int-video-wallpaper/main.js
//  Intégration "Vidéo Wallpaper"
//
//  Enregistre window.BeartifyExtensions['int-video-wallpaper']
//
//  Config (localStorage) :
//    beartify_vw_src      chemin ou URL de la vidéo
//    beartify_vw_opacity  0–1     (défaut: 0.35)
//    beartify_vw_blur     px      (défaut: 0)
//    beartify_vw_speed    ×       (défaut: 1)
//    beartify_vw_muted    bool    (défaut: true)
//    beartify_vw_fit      cover|contain|fill  (défaut: cover)
// ══════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const ID         = 'int-video-wallpaper';
  const STYLE_ID   = 'ext-vw-styles';
  const VIDEO_ID   = 'ext-vw-video';
  const BTN_ID     = 'ext-vw-cfg-btn';
  const OVERLAY_ID = 'ext-vw-overlay';

  // ── Config helpers ─────────────────────────────────────────────
  const CFG_DEFAULTS = { src: '', opacity: '0.35', blur: '0', speed: '1', muted: 'true', fit: 'cover' };
  function cfg(k)        { const v = localStorage.getItem('beartify_vw_' + k); return v !== null ? v : CFG_DEFAULTS[k]; }
  function setCfg(k, v)  { localStorage.setItem('beartify_vw_' + k, String(v)); }

  // ── Résolution de la source ─────────────────────────────────────
  // Retourne une URL utilisable par <video src>.
  // Tauri : lit le fichier binaire → Blob URL (évite les restrictions WebView sur les chemins locaux).
  // Navigateur : retourne le src tel quel.

  let _currentBlobUrl = null;

  async function _resolveSource(src) {
    if (!src) return null;

    // URL web ou blob déjà utilisable telle quelle
    if (src.startsWith('http') || src.startsWith('blob:')) {
      return src;
    }
    // En navigateur (pas Tauri), un chemin "/…" ou "./…" est déjà une URL
    // relative au site, utilisable telle quelle.
    if (!window._IS_TAURI && (src.startsWith('/') || src.startsWith('./'))) {
      return src;
    }

    if (window._IS_TAURI && window.__TAURI__?.core) {
      const core = window.__TAURI__.core;

      // "file:///C:/…" (ex: collé depuis l'explorateur Windows, ou une
      // barre d'adresse) → on retombe sur un vrai chemin OS.
      let fsPath = src;
      if (fsPath.startsWith('file://')) {
        fsPath = decodeURIComponent(fsPath.replace(/^file:\/\/\/?/, ''));
      }

      const isAbsolute = /^[a-zA-Z]:[\\/]/.test(fsPath)   // C:\... ou C:/...
        || fsPath.startsWith('/')                          // /home/user/...
        || fsPath.startsWith('\\\\');                       // \\serveur\partage

      if (isAbsolute) {
        // Chemin hors du dossier de l'extension : on NE charge PAS le
        // fichier en mémoire (un read_file + Blob sur une vidéo de
        // plusieurs centaines de Mo sature l'IPC et la RAM). On sert le
        // fichier directement via le protocole asset:// de Tauri, qui
        // stream depuis le disque.
        if (core.convertFileSrc) return core.convertFileSrc(fsPath);
        throw new Error(
          "Impossible d'accéder à ce fichier : convertFileSrc indisponible. " +
          "Vérifie que app.security.assetProtocol.enable est activé dans tauri.conf.json, " +
          "avec un scope couvrant ce dossier."
        );
      }

      // Chemin relatif → fichier stocké à côté de l'extension elle-même
      // (AppLocalData, baseDir 4 — cohérent avec le reste de marketplace.js,
      // contrairement à l'ancien baseDir:3 utilisé ici par erreur).
      try {
        const bytes = await core.invoke('plugin:fs|read_file', {
          path: fsPath,
          options: { baseDir: 4 },
        });
        const ext  = fsPath.split('.').pop().toLowerCase();
        const mime = { mp4: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', ogg: 'video/ogg', mov: 'video/mp4' }[ext] || 'video/mp4';
        const blob = new Blob([new Uint8Array(bytes)], { type: mime });
        _currentBlobUrl = URL.createObjectURL(blob);
        return _currentBlobUrl;
      } catch (e) {
        throw new Error(`Impossible de lire la vidéo "${fsPath}" : ${e.message}`);
      }
    }

    // Navigateur (pas de Tauri) : seule une URL web fonctionne, un chemin
    // local ne peut pas être lu pour des raisons de sécurité du navigateur.
    return '/' + src;
  }

  // ── Élément <video> ────────────────────────────────────────────
  async function _mountVideo() {
    _unmountVideo();

    const src = cfg('src');
    if (!src) return; // pas de source → ne rien monter

    let resolvedSrc;
    try {
      resolvedSrc = await _resolveSource(src);
    } catch (e) {
      console.error('[VideoWallpaper]', e.message);
      _toast('Vidéo introuvable : ' + e.message, 'error');
      return;
    }

    const v       = document.createElement('video');
    v.id          = VIDEO_ID;
    v.muted       = cfg('muted') !== 'false';  // muted par défaut → autoplay autorisé
    v.loop        = true;
    v.playsInline = true;
    v.disablePictureInPicture = true;
    v.playbackRate = Math.max(0.1, parseFloat(cfg('speed')) || 1);
    v.style.cssText = _videoCSS();

    // Ajouter la source APRÈS avoir défini muted
    // (certains navigateurs bloquent autoplay si src est défini avant muted)
    v.src = resolvedSrc;

    // Insérer derrière l'UI mais devant #spicyGlobalBg si présent
    const anchor = document.getElementById('spicyGlobalBg');
    if (anchor) anchor.after(v);
    else        document.body.prepend(v);

    // Charger puis jouer
    v.load();
    v.play().catch(e => {
      // Autoplay bloqué uniquement si non-muted ET pas d'interaction utilisateur
      // → forcer muted puis réessayer une seule fois
      if (!v.muted) {
        console.warn('[VideoWallpaper] Autoplay bloqué, passage en muet automatique.');
        v.muted = true;
        v.play().catch(() => {});
      }
    });
  }

  function _unmountVideo() {
    const el = document.getElementById(VIDEO_ID);
    if (el) { el.pause(); el.removeAttribute('src'); el.load(); el.remove(); }
    if (_currentBlobUrl) { URL.revokeObjectURL(_currentBlobUrl); _currentBlobUrl = null; }
  }

  function _videoCSS() {
    return [
      'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
      `object-fit:${cfg('fit')}`,
      `opacity:${cfg('opacity')}`,
      `filter:blur(${cfg('blur')}px)`,
      'z-index:-1',
      'pointer-events:none',
    ].join(';');
  }

  function _applyVideoCSS() {
    const el = document.getElementById(VIDEO_ID);
    if (el) el.style.cssText = _videoCSS();
  }

  // ── Panneau de configuration ───────────────────────────────────
  function _openOverlay() {
    if (document.getElementById(OVERLAY_ID)) return;

    const ov = document.createElement('div');
    ov.id = OVERLAY_ID;
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10001;display:flex;align-items:center;justify-content:center';

    ov.innerHTML = `
      <div style="
        background:var(--bg-elevated,#1a1a1a);
        border:1px solid rgba(255,255,255,0.1);
        border-radius:16px; padding:28px;
        width:440px; max-width:calc(100vw - 40px);
        max-height:85vh; overflow-y:auto;
        box-sizing:border-box; position:relative;
      ">
        <button id="vwClose" style="position:absolute;top:14px;right:14px;background:none;border:none;color:rgba(255,255,255,0.4);font-size:1.1rem;cursor:pointer;line-height:1;padding:4px 6px">✕</button>

        <div style="display:flex;align-items:center;gap:10px;margin-bottom:22px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="22" height="22" style="color:#fb923c"><rect x="2" y="5" width="20" height="14" rx="2"/><polygon points="10 9 15 12 10 15" fill="currentColor" stroke="none" opacity=".8"/></svg>
          <span style="font-size:1rem;font-weight:700;color:var(--text-base,#fff)">Vidéo Wallpaper</span>
        </div>

        ${_row('Source', `
          <input id="vwSrc" type="text"
            placeholder="ex: wallpaper.mp4  /  https://…  /  chemin/relatif.mp4"
            value="${_esc(cfg('src'))}"
            style="width:100%;background:var(--bg-highlight,#222);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:8px 10px;color:var(--text-base,#fff);font-size:0.82rem;outline:none;box-sizing:border-box;font-family:monospace">
          <p style="font-size:0.72rem;color:rgba(255,255,255,0.35);margin:5px 0 0">Chemin relatif au dossier de l'appli, ou URL absolue.</p>
        `)}

        ${_row(`Opacité&nbsp;<span id="vwOpVal">${cfg('opacity')}</span>`,
          `<input id="vwOp" type="range" min="0" max="1" step="0.05" value="${cfg('opacity')}" style="width:100%;accent-color:#fb923c">`
        )}

        ${_row(`Flou&nbsp;<span id="vwBlurVal">${cfg('blur')}px</span>`,
          `<input id="vwBlur" type="range" min="0" max="40" step="1" value="${cfg('blur')}" style="width:100%;accent-color:#fb923c">`
        )}

        ${_row(`Vitesse&nbsp;<span id="vwSpeedVal">${cfg('speed')}×</span>`,
          `<input id="vwSpeed" type="range" min="0.25" max="4" step="0.25" value="${cfg('speed')}" style="width:100%;accent-color:#fb923c">`
        )}

        ${_row('Remplissage',
          `<select id="vwFit" style="background:var(--bg-highlight,#222);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:7px 10px;color:var(--text-base,#fff);font-size:0.82rem;outline:none;font-family:inherit;width:100%">
            <option value="cover"   ${cfg('fit')==='cover'  ?'selected':''}>Cover — recadré, remplit l'écran</option>
            <option value="contain" ${cfg('fit')==='contain'?'selected':''}>Contain — tout visible, barres</option>
            <option value="fill"    ${cfg('fit')==='fill'   ?'selected':''}>Fill — étiré (peut déformer)</option>
          </select>`
        )}

        ${_row('Son',
          `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.82rem;color:var(--text-subdued,#aaa)">
            <input id="vwMuted" type="checkbox" ${cfg('muted')!=='false'?'checked':''} style="accent-color:#fb923c;width:14px;height:14px">
            Muet <span style="opacity:.5;font-size:0.75rem">(recommandé — requis pour l'autoplay)</span>
          </label>`
        )}

        <div style="display:flex;gap:10px;margin-top:22px;justify-content:flex-end">
          <button id="vwCancel" style="padding:8px 18px;border-radius:500px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:var(--text-base,#fff);font-size:0.82rem;cursor:pointer;font-family:inherit">Annuler</button>
          <button id="vwApply"  style="padding:8px 18px;border-radius:500px;border:none;background:#fb923c;color:#000;font-size:0.82rem;font-weight:700;cursor:pointer;font-family:inherit">Appliquer</button>
        </div>
      </div>
    `;

    document.body.appendChild(ov);

    const $ = id => ov.querySelector('#' + id);

    // Live preview
    $('vwOp').addEventListener('input',    e => { $('vwOpVal').textContent = e.target.value; if (document.getElementById(VIDEO_ID)) document.getElementById(VIDEO_ID).style.opacity = e.target.value; });
    $('vwBlur').addEventListener('input',  e => { $('vwBlurVal').textContent = e.target.value + 'px'; _applyVideoCSS(); });
    $('vwSpeed').addEventListener('input', e => { $('vwSpeedVal').textContent = e.target.value + '×'; const v = document.getElementById(VIDEO_ID); if (v) v.playbackRate = parseFloat(e.target.value); });

    const close = () => ov.remove();
    $('vwClose').addEventListener('click',  close);
    $('vwCancel').addEventListener('click', close);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });

    $('vwApply').addEventListener('click', async () => {
      setCfg('src',     $('vwSrc').value.trim());
      setCfg('opacity', $('vwOp').value);
      setCfg('blur',    $('vwBlur').value);
      setCfg('speed',   $('vwSpeed').value);
      setCfg('muted',   $('vwMuted').checked ? 'true' : 'false');
      setCfg('fit',     $('vwFit').value);
      close();
      await _mountVideo();
    });
  }

  // ── Bouton flottant ────────────────────────────────────────────
  function _mountBtn() {
    if (document.getElementById(BTN_ID)) return;
    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.title = 'Configurer la vidéo de fond';
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="2" y="5" width="20" height="14" rx="2"/><polygon points="10 9 15 12 10 15" fill="currentColor" stroke="none" opacity=".8"/></svg> Vidéo wallpaper`;
    btn.addEventListener('click', _openOverlay);
    document.body.appendChild(btn);
  }

  function _unmountBtn() { document.getElementById(BTN_ID)?.remove(); }

  // ── Styles du bouton ───────────────────────────────────────────
  function _injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = `
#${BTN_ID} {
  position: fixed;
  bottom: calc(var(--player-h, 90px) + 16px);
  left: calc(var(--sidebar-w, 64px) + 16px);
  z-index: 200;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 500px;
  border: 1px solid rgba(251,146,60,0.35);
  background: rgba(251,146,60,0.08);
  color: rgba(251,146,60,0.9);
  font-size: 0.78rem; font-weight: 500; font-family: inherit;
  cursor: pointer;
  transition: background .12s, border-color .12s, color .12s;
}
#${BTN_ID}:hover {
  background: rgba(251,146,60,0.18);
  border-color: rgba(251,146,60,0.6);
  color: #fb923c;
}
    `;
    document.head.appendChild(el);
  }

  function _removeStyles() { document.getElementById(STYLE_ID)?.remove(); }

  // ── Helpers ────────────────────────────────────────────────────
  function _row(label, control) {
    return `<div style="margin-bottom:16px">
      <label style="display:block;font-size:0.74rem;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:6px;letter-spacing:0.04em;text-transform:uppercase">${label}</label>
      ${control}
    </div>`;
  }

  function _esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  let _toastTimer;
  function _toast(msg, type) {
    let el = document.getElementById('mktToast');
    if (!el) { el = document.createElement('div'); el.id = 'mktToast'; el.className = 'mkt-toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.className = 'mkt-toast' + (type === 'error' ? ' error' : '');
    clearTimeout(_toastTimer);
    requestAnimationFrame(() => {
      el.classList.add('show');
      _toastTimer = setTimeout(() => el.classList.remove('show'), type === 'error' ? 4000 : 2500);
    });
  }

  // ── API publique ───────────────────────────────────────────────
  window.BeartifyExtensions = window.BeartifyExtensions || {};
  window.BeartifyExtensions[ID] = {
    name:    'Vidéo Wallpaper',
    version: '0.9.0',

    async activate() {
      // Un thème Marketplace actif peut poser son propre fond/overlay et
      // entrer en conflit visuel avec la vidéo. On reproduit ici la même
      // règle d'exclusivité que celle du sélecteur de thème natif :
      // activer ce fond désactive le thème en cours (silencieusement).
      if (window.BeartifyMarketplace?.deactivateType) {
        try {
          const activeThemes = window.BeartifyMarketplace.getActiveByType?.('theme') || [];
          if (activeThemes.length) await window.BeartifyMarketplace.deactivateType('theme');
        } catch (e) { console.warn('[VideoWallpaper] Désactivation du thème en cours a échoué :', e); }
      }

      _injectStyles();
      _mountBtn();
      if (cfg('src')) {
        await _mountVideo();
      } else {
        // Première activation sans config → ouvrir le panneau directement
        _openOverlay();
      }
      window._vwConfigure = _openOverlay;
      console.info('[VideoWallpaper] Activé. Source :', cfg('src') || '(non configurée)');
    },

    deactivate() {
      _unmountVideo();
      _unmountBtn();
      _removeStyles();
      document.getElementById(OVERLAY_ID)?.remove();
      delete window._vwConfigure;
      console.info('[VideoWallpaper] Désactivé.');
    },

    configure: _openOverlay,
  };
})();
