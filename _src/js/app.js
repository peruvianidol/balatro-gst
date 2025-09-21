// /js/app.js
document.addEventListener('DOMContentLoaded', () => {
  const SELECTOR    = 'label > input[type="checkbox"]';
  const STORAGE_KEY = 'balatro:jokers:checked';
  const HIDE_KEY    = 'balatro:hide-checked';

  // ---------- helpers ----------
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const getParam = (k) => new URL(location.href).searchParams.get(k);
  const setParam = (k, v) => {
    const u = new URL(location.href);
    if (!v) u.searchParams.delete(k); else u.searchParams.set(k, v);
    history.replaceState(null, '', u.toString());
  };

  // The jokers container is the (only) <section>
  const section = document.querySelector('section');

  // ---------- whimsical SFX (Web Audio: low-latency, iOS-friendly) ----------
  // You currently have MP3s; this works fine. If you later export WAVs,
  // just change the extensions here for even snappier starts.
  const SFX_URLS = [
    '/sounds/pop-1.mp3',
    '/sounds/pop-2.mp3'
  ];

  let audioCtx = null;
  let sfxBuffers = [];
  let sfxLoading = null;   // Promise during fetch/decode
  let sfxReady = false;

  function ensureAudioCtx() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx({ latencyHint: 'interactive' });
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  async function initSfx() {
    if (sfxReady) return;
    ensureAudioCtx();
    if (!audioCtx || sfxLoading) return;

    sfxLoading = Promise.all(
      SFX_URLS.map(async (url) => {
        try {
          const res = await fetch(url, { cache: 'force-cache' });
          const arr = await res.arrayBuffer();
          // Older Safari prefers callback form
          return await new Promise((resolve, reject) =>
            audioCtx.decodeAudioData(arr, resolve, reject)
          );
        } catch {
          return null;
        }
      })
    ).then(decoded => {
      sfxBuffers = decoded.filter(Boolean);
      sfxReady = sfxBuffers.length > 0;
    }).catch(() => {}).finally(() => { sfxLoading = null; });

    return sfxLoading;
  }

  function playPop() {
    if (!sfxReady || !audioCtx || !sfxBuffers.length) return;
    const i = (Math.random() * sfxBuffers.length) | 0;
    const src = audioCtx.createBufferSource();
    src.buffer = sfxBuffers[i];

    const gain = audioCtx.createGain();
    gain.gain.value = 0.8; // tweak volume here

    src.connect(gain).connect(audioCtx.destination);
    src.start(audioCtx.currentTime);
  }

  // Unlock & preload on first user interaction (touch/click/keyboard)
  function unlockAudioOnce() {
    ensureAudioCtx();
    initSfx();
    document.removeEventListener('pointerdown', unlockAudioOnce);
    document.removeEventListener('keydown', unlockAudioOnce);
  }
  document.addEventListener('pointerdown', unlockAudioOnce, { passive: true });
  document.addEventListener('keydown', unlockAudioOnce);

  // ---------- counter / localStorage ----------
  const $count = $('#joker-count');
  const $total = $('#joker-total');

  const loadSet = () => {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
    catch { return new Set(); }
  };
  const saveSet = (set) => localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));

  // Only the joker checkboxes inside the section (exclude external controls)
  const boxes = Array.from(section ? section.querySelectorAll(SELECTOR)
                                   : document.querySelectorAll(SELECTOR));
  if ($total) $total.textContent = boxes.length || 150;

  const checkedSet = loadSet();
  for (const cb of boxes) {
    const id = cb.id || cb.name;
    if (id && checkedSet.has(id)) cb.checked = true;
  }

  const renderCount = () => { if ($count) $count.textContent = checkedSet.size; };
  renderCount();

  // ============================================================
  //                FILTER + HIDE-CHECKED (PERSISTED)
  // ============================================================
  const input    = $('#filter-jokers');
  const clearBtn = $('#clear-filter');
  const hideBox  = $('#hide-checked');

  // Normalize helper for text filtering
  const normalize = (s) =>
    (s || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[_\s-]+/g, ' ')
      .trim();

  // Build lookup once (labels that wrap a checkbox) scoped to the jokers section
  const labels = Array.from(section ? section.querySelectorAll('label')
                                   : document.querySelectorAll('section label'))
    .filter(l => {
      const cb = l.querySelector('input[type="checkbox"]');
      // exclude the "Hide collected" control if it's ever inside the section
      return cb && (!hideBox || !l.contains(hideBox));
    });

  const lookup = labels.map(label => {
    const nameEl = label.querySelector('.joker-desc h2') || label.querySelector('h2');
    const imgEl  = label.querySelector('img');
    const raw    = (nameEl?.textContent) || (imgEl?.alt) || label.textContent;
    const cb     = label.querySelector('input[type="checkbox"]');
    return { label, key: normalize(raw), cb };
  });

  // Persisted hide state: read on load, default false
  let hideCheckedState = false;
  try {
    hideCheckedState = JSON.parse(localStorage.getItem(HIDE_KEY) || 'false') === true;
  } catch { hideCheckedState = false; }
  if (hideBox) hideBox.checked = hideCheckedState;

  function applyVisibility() {
    const qNorm = normalize(input ? input.value : '');
    const hideChecked = hideBox ? hideBox.checked : false;

    for (const { label, key, cb } of lookup) {
      const matchesText = !qNorm || key.includes(qNorm);
      const shouldHideForSticker = hideChecked && !!cb?.checked;
      label.hidden = !matchesText || shouldHideForSticker;
    }
  }

  function toggleClearButton() {
    if (clearBtn && input) clearBtn.hidden = !input.value;
  }

  // Wire filter input
  if (input) {
    input.addEventListener('input', () => { applyVisibility(); toggleClearButton(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && input.value) {
        input.value = '';
        applyVisibility();
        toggleClearButton();
      }
    });
  }

  // Clear button
  if (clearBtn && input) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      applyVisibility();
      input.focus();
      toggleClearButton();
    });
    clearBtn.hidden = !input.value;
  }

  // Hide-checked toggle (persisted)
  if (hideBox) {
    hideBox.addEventListener('change', () => {
      localStorage.setItem(HIDE_KEY, JSON.stringify(!!hideBox.checked));
      applyVisibility();
    });
  }

  // Initial pass
  applyVisibility();
  toggleClearButton();

  // ---------- Toggle handling (localStorage only) ----------
  document.addEventListener('change', (e) => {
    const cb = e.target;
    if (!(cb instanceof HTMLInputElement) || cb.type !== 'checkbox') return;

    // Ignore the "Hide collected" checkbox entirely
    if (hideBox && cb === hideBox) {
      applyVisibility();
      return;
    }

    // Only handle joker checkboxes inside the section
    if (!section || !section.contains(cb)) return;
    if (!cb.matches(SELECTOR)) return;

    const id = cb.id || cb.name;
    if (!id) return;

    // play pop only when turning ON (ensure context is awake)
    if (cb.checked) {
      ensureAudioCtx();
      initSfx();
      playPop();
    }

    cb.checked ? checkedSet.add(id) : checkedSet.delete(id);
    saveSet(checkedSet);
    renderCount();
    applyVisibility();
  });

  // ============================================================
  //                     VIEW + ORDER TOGGLES
  // ============================================================

  // container is the single <section> on the page
  const container = section;

  // VIEW buttons: expect two buttons somewhere with data-view="grid|list"
  const viewBtns  = document.querySelectorAll('[data-view]');
  // ORDER buttons: expect two buttons with data-order="alpha|game"
  const orderBtns = Array.from(document.querySelectorAll('[data-order="alpha"], [data-order="game"]'));

  // ---------- VIEW ----------
  function applyView(viewMode) {
    if (!container) return;
    container.classList.toggle('is-grid', viewMode === 'grid');
    container.classList.toggle('is-list', viewMode === 'list');
    viewBtns.forEach(btn => {
      if (btn.getAttribute('data-view') === viewMode) btn.setAttribute('data-active', '');
      else btn.removeAttribute('data-active');
    });
  }

  // initial view: URL ?view=..., else whichever button has data-active, else "grid"
  let view = getParam('view')
    || [...viewBtns].find(b => b.hasAttribute('data-active'))?.getAttribute('data-view')
    || 'grid';

  applyView(view);

  // click handlers for view buttons
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-view') === 'list' ? 'list' : 'grid';
      if (next === view) return;
      view = next;
      applyView(view);
      setParam('view', view);
    });
  });

  // ---------------- ORDER (alpha/game) — robust + unhides section ----------------

  // pick the <section> that actually contains the jokers (labels with checkboxes)
  const sortContainer = section;

  // helpers
  const getItems = () => {
    if (!sortContainer) return [];
    return Array.from(sortContainer.querySelectorAll('label'))
      .filter(l => l.querySelector('input[type="checkbox"]'));
  };
  const ensureNameMeta = (els) => {
    els.forEach(el => {
      if (!el.dataset.name) {
        const h2 = el.querySelector('.joker-desc h2, h2');
        const img = el.querySelector('img');
        el.dataset.name = (h2?.textContent || img?.alt || '').trim();
      }
    });
  };
  function sortByAlpha(a, b) {
    const an = (a.dataset.name || '').toLowerCase();
    const bn = (b.dataset.name || '').toLowerCase();
    return an.localeCompare(bn);
  }
  function sortByGameStable(items) {
    items.forEach((el, i) => { if (!el.dataset._idx) el.dataset._idx = String(i); });
    const withOrder = [];
    const withoutOrder = [];
    for (const el of items) {
      const n = Number(el.dataset.order);
      (Number.isFinite(n) ? withOrder : withoutOrder).push(el);
    }
    withOrder.sort((a, b) => Number(a.dataset.order) - Number(b.dataset.order));
    withoutOrder.sort((a, b) => Number(a.dataset._idx) - Number(b.dataset._idx));
    return withOrder.concat(withoutOrder);
  }

  function applyOrder(mode) {
    if (!sortContainer) return;
    const items = getItems();
    if (!items.length) return;

    ensureNameMeta(items);

    const sorted = mode === 'game'
      ? sortByGameStable(items)
      : items.slice().sort(sortByAlpha);

    const frag = document.createDocumentFragment();
    sorted.forEach(el => frag.appendChild(el));
    sortContainer.appendChild(frag);

    // reflect active state
    orderBtns.forEach(btn => {
      btn.toggleAttribute('data-active', btn.getAttribute('data-order') === mode);
    });

    // URL param
    const u = new URL(location.href);
    u.searchParams.set('order', mode);
    history.replaceState(null, '', u.toString());

    // Re-apply filter/hide after reordering to maintain visibility rules
    applyVisibility();

    // IMPORTANT: unhide if we pre-hid for ordering
    document.documentElement.classList.remove('preorder-hide');
  }

  // initial mode
  let orderMode =
    new URL(location.href).searchParams.get('order') ||
    (orderBtns.find(b => b.hasAttribute('data-active'))?.getAttribute('data-order')) ||
    'alpha';

  applyOrder(orderMode);

  // clicks
  orderBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-order'); // "alpha" | "game"
      if (!next || next === orderMode) return;
      orderMode = next;
      applyOrder(orderMode);
    });
  });

  // ============================================================
  //                         RESET ALL
  // ============================================================
  const resetBtn = document.getElementById('reset-jokers');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      // 1) clear storage + in-memory set (persist empty array for consistency)
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      checkedSet.clear?.();

      // 2) uncheck all boxes
      boxes.forEach(cb => { cb.checked = false; });

      // 3) update UI
      renderCount();

      // 4) re-apply visibility so everything shows if "Hide collected" is on
      applyVisibility();
    });
  }
});
