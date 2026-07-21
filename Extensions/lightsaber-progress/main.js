// ══════════════════════════════════════════════════════════════════════
//  Beartify — Extension "Sabres Laser — Barre de progression"
//  main.js
//
//  Remplace le style de la barre de progression (#progressContainer /
//  #progressFill / #progressThumb) par un sabre laser Star Wars, avec
//  l'icône du sabre au tout début de la barre. Clic sur l'icône pour
//  changer de personnage (cycle Ahsoka → Anakin → Leïa → Luke → Mace
//  Windu → Rey → Vador). Le choix est mémorisé (localStorage).
//
//  Fichiers attendus dans ce même dossier du repo :
//    config.json, main.js (ce fichier), main.css (référence / doc),
//    preview.png,
//    sw_saber_ahsoka.png, sw_saber_anakin.png, sw_saber_leia.png,
//    sw_saber_luke.png,   sw_saber_mace.png,   sw_saber_rey.png,
//    sw_saber_vader.png
// ══════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const EXT_ID = 'lightsaber-progress';

  // ── Doit correspondre exactement à extensions.js / marketplace.js ──
  const GITHUB_REPO   = 'PapaOursPolaire/beartify-marketplace';
  const GITHUB_BRANCH = 'Projets';
  const REPO_PATH      = `Extensions/${EXT_ID}`;
  const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${REPO_PATH}`;

  function _assetUrl(filename) {
    const rawUrl = `${RAW_BASE}/${filename}`;
    if (typeof window._resolveProxyUrl === 'function') {
      return window._resolveProxyUrl(`/api/extensions/file?url=${encodeURIComponent(rawUrl)}`);
    }
    return `/api/extensions/file?url=${encodeURIComponent(rawUrl)}`;
  }

  const SABERS = [
    { id: 'ahsoka', label: 'Ahsoka Tano',  file: 'sw_saber_ahsoka.png' },
    { id: 'anakin', label: 'Anakin Skywalker', file: 'sw_saber_anakin.png' },
    { id: 'leia',   label: 'Leïa Organa',  file: 'sw_saber_leia.png' },
    { id: 'luke',   label: 'Luke Skywalker', file: 'sw_saber_luke.png' },
    { id: 'mace',   label: 'Mace Windu',   file: 'sw_saber_mace.png' },
    { id: 'rey',    label: 'Rey',          file: 'sw_saber_rey.png' },
    { id: 'vader',  label: 'Dark Vador',   file: 'sw_saber_vader.png' },
  ];

  const STORAGE_KEY = 'beartify_ext_lightsaber_choice';
  const STYLE_TAG_ID = `ext-style-${EXT_ID}`;
  const HILT_ID = `lgs-hilt-${EXT_ID}`;

  // ── CSS injecté (mêmes règles que main.css du repo, embarquées ici
  //    pour ne pas dépendre d'un second fetch — seul `entry` est
  //    chargé automatiquement par le marketplace) ────────────────────
  const CSS = `
#progressContainer[data-lightsaber="ahsoka"] { --lgs-color:#7CFC00; --lgs-color-2:#FFD84D; --lgs-glow:rgba(124,252,0,.55); }
#progressContainer[data-lightsaber="anakin"] { --lgs-color:#3FA9F5; --lgs-color-2:#3FA9F5; --lgs-glow:rgba(63,169,245,.55); }
#progressContainer[data-lightsaber="leia"]   { --lgs-color:#FF6FAE; --lgs-color-2:#FF6FAE; --lgs-glow:rgba(255,111,174,.55); }
#progressContainer[data-lightsaber="luke"]   { --lgs-color:#2ECC71; --lgs-color-2:#2ECC71; --lgs-glow:rgba(46,204,113,.55); }
#progressContainer[data-lightsaber="mace"]   { --lgs-color:#B967FF; --lgs-color-2:#B967FF; --lgs-glow:rgba(185,103,255,.55); }
#progressContainer[data-lightsaber="rey"]    { --lgs-color:#FFD23F; --lgs-color-2:#FFD23F; --lgs-glow:rgba(255,210,63,.55); }
#progressContainer[data-lightsaber="vader"]  { --lgs-color:#FF3B30; --lgs-color-2:#FF3B30; --lgs-glow:rgba(255,59,48,.6); }

#progressContainer.lgs-active { position: relative; margin-left: 26px; overflow: visible; }

.lgs-hilt {
  position: absolute; left: -22px; top: 50%; width: 20px; height: 20px;
  transform: translateY(-50%); cursor: pointer; user-select: none;
  -webkit-user-drag: none;
  filter: drop-shadow(0 0 4px var(--lgs-glow, rgba(255,255,255,.4)));
  transition: filter .2s ease, transform .15s ease; z-index: 5;
}
.lgs-hilt:hover  { filter: drop-shadow(0 0 8px var(--lgs-glow, rgba(255,255,255,.6))); }
.lgs-hilt:active { transform: translateY(-50%) scale(.9); }

#progressContainer.lgs-active #progressFill {
  background: linear-gradient(90deg, var(--lgs-color) 0%, var(--lgs-color-2) 100%) !important;
  box-shadow: 0 0 6px 1px var(--lgs-glow), 0 0 14px 2px var(--lgs-glow);
  position: relative;
}
#progressContainer.lgs-active #progressFill::after {
  content: ""; position: absolute; inset: 0; height: 30%; top: 35%;
  background: rgba(255,255,255,.55); border-radius: 2px; pointer-events: none;
}
#progressContainer.lgs-active #progressThumb {
  background: #fff !important;
  box-shadow: 0 0 0 3px var(--lgs-color), 0 0 10px 3px var(--lgs-glow);
}
`.trim();

  function _injectCSS() {
    if (document.getElementById(STYLE_TAG_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_TAG_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  function _removeCSS() {
    document.getElementById(STYLE_TAG_ID)?.remove();
  }

  function _getSaberIndex() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const idx = SABERS.findIndex(s => s.id === saved);
    return idx >= 0 ? idx : 0; // Ahsoka par défaut
  }

  function _applySaber(index) {
    const container = document.getElementById('progressContainer');
    if (!container) return;
    const saber = SABERS[index];

    container.classList.add('lgs-active');
    container.dataset.lightsaber = saber.id;

    let hilt = document.getElementById(HILT_ID);
    if (!hilt) {
      hilt = document.createElement('img');
      hilt.id = HILT_ID;
      hilt.className = 'lgs-hilt';
      hilt.draggable = false;
      hilt.addEventListener('click', e => {
        e.stopPropagation();
        e.preventDefault();
        const next = (_getSaberIndex() + 1) % SABERS.length;
        localStorage.setItem(STORAGE_KEY, SABERS[next].id);
        _applySaber(next);
      });
      container.prepend(hilt);
    }
    hilt.src = _assetUrl(saber.file);
    hilt.title = `${saber.label} — cliquer pour changer de sabre`;
    hilt.alt = saber.label;

    localStorage.setItem(STORAGE_KEY, saber.id);
  }

  function activate() {
    _injectCSS();

    // #progressContainer est créé au chargement du player ; s'il n'est
    // pas encore présent (extension activée avant que le DOM du player
    // ne soit prêt), on retente jusqu'à ce qu'il apparaisse.
    const tryApply = () => {
      const container = document.getElementById('progressContainer');
      if (container) { _applySaber(_getSaberIndex()); return true; }
      return false;
    };
    if (!tryApply()) {
      const observer = new MutationObserver(() => { if (tryApply()) observer.disconnect(); });
      observer.observe(document.body, { childList: true, subtree: true });
      // Sécurité : on arrête d'observer après 15s pour ne pas fuiter.
      setTimeout(() => observer.disconnect(), 15000);
    }
  }

  function deactivate() {
    const container = document.getElementById('progressContainer');
    if (container) {
      container.classList.remove('lgs-active');
      delete container.dataset.lightsaber;
    }
    document.getElementById(HILT_ID)?.remove();
    _removeCSS();
  }

  window.BeartifyExtensions = window.BeartifyExtensions || {};
  window.BeartifyExtensions[EXT_ID] = { activate, deactivate };
})();
