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
    { id: 'ahsoka', label: 'Ahsoka Tano',      file: 'sw_saber_ahsoka.png', color: '#F4FEFF', colorLabel: 'Blanc néon' },
    { id: 'anakin', label: 'Anakin Skywalker', file: 'sw_saber_anakin.png', color: '#3FA9F5', colorLabel: 'Bleu' },
    { id: 'leia',   label: 'Leïa Organa',      file: 'sw_saber_leia.png',   color: '#FF6FAE', colorLabel: 'Rose' },
    { id: 'luke',   label: 'Luke Skywalker',   file: 'sw_saber_luke.png',   color: '#2ECC71', colorLabel: 'Vert' },
    { id: 'mace',   label: 'Mace Windu',       file: 'sw_saber_mace.png',   color: '#B967FF', colorLabel: 'Mauve' },
    { id: 'rey',    label: 'Rey',              file: 'sw_saber_rey.png',   color: '#FFD23F', colorLabel: 'Jaune' },
    { id: 'vader',  label: 'Dark Vador',       file: 'sw_saber_vader.png', color: '#FF3B30', colorLabel: 'Rouge' },
  ];
  const DEFAULT_INDEX = 0; // Ahsoka

  const STORAGE_KEY = 'beartify_ext_lightsaber_choice';
  const STYLE_TAG_ID = `ext-style-${EXT_ID}`;
  const HILT_ID = `lgs-hilt-${EXT_ID}`;

  // ── CSS injecté (mêmes règles que main.css du repo, embarquées ici
  //    pour ne pas dépendre d'un second fetch — seul `entry` est
  //    chargé automatiquement par le marketplace) ────────────────────
  const CSS = `
#progressContainer[data-lightsaber="ahsoka"] { --lgs-color:#F4FEFF; --lgs-color-2:#DFF9FF; --lgs-glow:rgba(244,254,255,.75); }
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

  const MODAL_ID = `lgs-config-${EXT_ID}`;

  function configure() {
    document.getElementById(MODAL_ID)?.remove(); // évite les doublons si double-clic

    const currentIndex = _getSaberIndex();

    const ov = document.createElement('div');
    ov.id = MODAL_ID;
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10060;display:flex;align-items:center;justify-content:center';

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-elevated,#1a1a1a);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;width:420px;max-width:calc(100vw - 40px);max-height:85vh;overflow-y:auto;box-sizing:border-box;position:relative';
    card.innerHTML = `
      <button id="${MODAL_ID}-close" style="position:absolute;top:12px;right:12px;background:none;border:none;color:rgba(255,255,255,0.4);font-size:1.1rem;cursor:pointer;padding:4px 6px">✕</button>
      <h2 style="margin:0 0 4px;font-size:1.05rem;color:var(--text-base,#fff)">Sabre laser</h2>
      <p style="margin:0 0 16px;font-size:0.8rem;color:var(--text-subdued,#aaa)">Choisis le sabre affiché sur la barre de lecture.</p>
      <div id="${MODAL_ID}-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px"></div>
      <button id="${MODAL_ID}-reset" style="width:100%;padding:9px;border-radius:8px;background:transparent;border:1px solid rgba(255,255,255,0.2);color:var(--text-base,#fff);cursor:pointer;font-size:0.85rem">Réinitialiser par défaut (Ahsoka)</button>
    `;
    ov.appendChild(card);
    document.body.appendChild(ov);

    const close = () => ov.remove();
    card.querySelector(`#${MODAL_ID}-close`).addEventListener('click', close);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });

    const list = card.querySelector(`#${MODAL_ID}-list`);
    const renderList = selectedIndex => {
      list.innerHTML = '';
      SABERS.forEach((saber, i) => {
        const row = document.createElement('button');
        const selected = i === selectedIndex;
        row.style.cssText = `display:flex;align-items:center;gap:12px;width:100%;padding:9px 12px;border-radius:10px;cursor:pointer;text-align:left;
          background:${selected ? 'rgba(255,255,255,0.08)' : 'transparent'};
          border:1px solid ${selected ? saber.color : 'rgba(255,255,255,0.1)'};
          box-shadow:${selected ? `0 0 8px 1px ${saber.color}66` : 'none'};`;
        row.innerHTML = `
          <img src="${_assetUrl(saber.file)}" alt="" style="width:22px;height:22px;object-fit:contain;filter:drop-shadow(0 0 3px ${saber.color}99)">
          <span style="flex:1;font-size:0.88rem;color:var(--text-base,#fff)">${saber.label}</span>
          <span style="width:12px;height:12px;border-radius:50%;background:${saber.color};box-shadow:0 0 6px ${saber.color}">&nbsp;</span>
          <span style="font-size:0.76rem;color:var(--text-subdued,#999);min-width:52px;text-align:right">${saber.colorLabel}</span>
        `;
        row.addEventListener('click', () => {
          localStorage.setItem(STORAGE_KEY, saber.id);
          _applySaber(i);
          renderList(i);
        });
        list.appendChild(row);
      });
    };
    renderList(currentIndex);

    card.querySelector(`#${MODAL_ID}-reset`).addEventListener('click', () => {
      localStorage.setItem(STORAGE_KEY, SABERS[DEFAULT_INDEX].id);
      _applySaber(DEFAULT_INDEX);
      renderList(DEFAULT_INDEX);
    });
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
    document.getElementById(MODAL_ID)?.remove();
    _removeCSS();
  }

  window.BeartifyExtensions = window.BeartifyExtensions || {};
  window.BeartifyExtensions[EXT_ID] = { activate, deactivate, configure };
})();
