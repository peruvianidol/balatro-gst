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

  // ============================================================
  //                   SOUND TOGGLE (persisted)
  // ============================================================
  const MUTE_KEY = 'balatro:sfx-muted';
  const sfxToggleBtn = document.getElementById('sfx-toggle');
  const XLINK = 'http://www.w3.org/1999/xlink';

  // Ensure a sane default if the key is missing (unmuted)
  if (localStorage.getItem(MUTE_KEY) === null) {
    localStorage.setItem(MUTE_KEY, 'false');
  }

  let isMuted = false;
  try { isMuted = JSON.parse(localStorage.getItem(MUTE_KEY) || 'false') === true; }
  catch { isMuted = false; }

  function setToggleIcon(stateMuted) {
    if (!sfxToggleBtn) return;
    const use = sfxToggleBtn.querySelector('use');
    if (!use) return;
    const href = stateMuted ? '#sound-off' : '#sound-on';
    // set both for widest Safari compatibility
    use.setAttribute('href', href);
    use.setAttributeNS(XLINK, 'xlink:href', href);
    sfxToggleBtn.setAttribute('aria-pressed', String(!stateMuted));
    sfxToggleBtn.setAttribute('aria-label', stateMuted ? 'Sound off' : 'Sound on');
  }
  setToggleIcon(isMuted);

  sfxToggleBtn?.addEventListener('click', () => {
    isMuted = !isMuted;
    localStorage.setItem(MUTE_KEY, JSON.stringify(isMuted));
    setToggleIcon(isMuted);
  });

  // ============================================================
  //      whimsical SFX (Web Audio w/ iOS unlock + fallback)
  // ============================================================
  // If you later export WAVs, just change the extensions below.
  const SFX_URLS = [
    '/sounds/pop-1.mp3',
    '/sounds/pop-2.mp3'
  ];

  let audioCtx = null;
  let sfxBuffers = [];
  let sfxLoading = null;   // Promise during fetch/decode
  let sfxReady = false;
  let queuedPlay = false;  // if user taps before decode completes
  let htmlAudioFallbacks = []; // <audio> fallback if decode fails

  function ensureAudioCtx() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx({ latencyHint: 'interactive' });
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  // Play a 1-sample silent buffer to "tickle" iOS into starting audio output
  function primeGraph() {
    try {
      if (!audioCtx) return;
      const b = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
      const src = audioCtx.createBufferSource();
      src.buffer = b;
      src.connect(audioCtx.destination);
      src.start(0);
    } catch {}
  }

  async function initSfx() {
    if (sfxReady) return;
    ensureAudioCtx();
    if (!audioCtx) return;

    // If already loading, just return the promise
    if (sfxLoading) return sfxLoading;

    sfxLoading = (async () => {
      // Try Web Audio decode for all clips
      const decoded = await Promise.all(SFX_URLS.map(async (url) => {
        try {
          const res = await fetch(url, { cache: 'force-cache' });
          const arr = await res.arrayBuffer();
          return await new Promise((resolve, reject) =>
            audioCtx.decodeAudioData(arr, resolve, reject)
          );
        } catch {
          return null;
        }
      }));

      sfxBuffers = decoded.filter(Boolean);
      sfxReady = sfxBuffers.length > 0;

      // Prepare fallback <audio> elements (preloaded) in case Web Audio failed
      if (!sfxReady) {
        htmlAudioFallbacks = SFX_URLS.map(u => {
          const a = new Audio(u);
          a.preload = 'auto';
          a.volume = 0.8;
          return a;
        });
      }

      // iOS “wake”: play a silent tick once we have a context
      primeGraph();
    })().catch(() => {}).finally(() => { sfxLoading = null; });

    return sfxLoading;
  }

  function playPopWebAudio() {
    if (isMuted) return false; // respect mute
    if (!sfxReady || !audioCtx || !sfxBuffers.length) return false;
    try {
      const i = (Math.random() * sfxBuffers.length) | 0;
      const src = audioCtx.createBufferSource();
      src.buffer = sfxBuffers[i];
      const gain = audioCtx.createGain();
      gain.gain.value = 0.8; // volume
      src.connect(gain).connect(audioCtx.destination);
      src.start(audioCtx.currentTime);
      return true;
    } catch {
      return false;
    }
  }

  function playPopFallback() {
    if (isMuted) return false; // respect mute
    if (!htmlAudioFallbacks.length) return false;
    const i = (Math.random() * htmlAudioFallbacks.length) | 0;
    // clone for overlap
    const inst = htmlAudioFallbacks[i].cloneNode(true);
    inst.play().catch(() => {});
    return true;
  }

  async function playPop() {
    // If decoding is in-flight, queue this play and fire when done
    if (!sfxReady && sfxLoading) {
      queuedPlay = true;
      try { await sfxLoading; } catch {}
      if (queuedPlay) {
        queuedPlay = false;
        if (!playPopWebAudio()) playPopFallback();
      }
      return;
    }

    // If nothing is loaded yet, try init and then play
    if (!sfxReady && !sfxLoading) {
      await initSfx();
      if (!playPopWebAudio()) playPopFallback();
      return;
    }

    // Normal case
    if (!playPopWebAudio()) playPopFallback();
  }

  // Unlock & preload on first user interaction (cover all the bases)
  function unlockAudioOnce() {
    ensureAudioCtx();
    initSfx();
    primeGraph();
    window.removeEventListener('touchstart', unlockAudioOnce, true);
    window.removeEventListener('pointerdown', unlockAudioOnce, true);
    window.removeEventListener('click', unlockAudioOnce, true);
    window.removeEventListener('keydown', unlockAudioOnce, true);
  }
  window.addEventListener('touchstart', unlockAudioOnce, true);
  window.addEventListener('pointerdown', unlockAudioOnce, true);
  window.addEventListener('click', unlockAudioOnce, true);
  window.addEventListener('keydown', unlockAudioOnce, true);

  // ============================================================
  //              counter / localStorage (stickers)
  // ============================================================
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

  const normalize = (s) =>
    (s || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[_\s-]+/g, ' ')
      .trim();

  const labels = Array.from(section ? section.querySelectorAll('label')
                                   : document.querySelectorAll('section label'))
    .filter(l => {
      const cb = l.querySelector('input[type="checkbox"]');
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

  if (clearBtn && input) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      applyVisibility();
      input.focus();
      toggleClearButton();
    });
    clearBtn.hidden = !input.value;
  }

  if (hideBox) {
    hideBox.addEventListener('change', () => {
      localStorage.setItem(HIDE_KEY, JSON.stringify(!!hideBox.checked));
      applyVisibility();
    });
  }

  applyVisibility();
  toggleClearButton();

  // ============================================================
  //          Toggle handling (stickers + play pop on check)
  // ============================================================
  document.addEventListener('change', async (e) => {
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

    // play pop only when turning ON
    if (cb.checked) {
      // Force unlock and init in case this is the very first gesture
      unlockAudioOnce();        // safe if already removed
      ensureAudioCtx();
      await initSfx();          // safe if already done

      // If the UI shows "sound-on" but state is muted (stale storage), auto-align once
      const use = sfxToggleBtn?.querySelector('use');
      const iconHref = use ? (use.getAttribute('href') || use.getAttribute('xlink:href')) : null;
      const showingOn = iconHref === '#sound-on';
      if (showingOn && isMuted) {
        isMuted = false;
        localStorage.setItem(MUTE_KEY, 'false');
        setToggleIcon(false);
      }

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
  const container = section;
  const viewBtns  = document.querySelectorAll('[data-view]');
  const orderBtns = Array.from(document.querySelectorAll('[data-order="alpha"], [data-order="game"]'));

  function applyView(viewMode) {
    if (!container) return;
    container.classList.toggle('is-grid', viewMode === 'grid');
    container.classList.toggle('is-list', viewMode === 'list');
    viewBtns.forEach(btn => {
      if (btn.getAttribute('data-view') === viewMode) btn.setAttribute('data-active', '');
      else btn.removeAttribute('data-active');
    });
  }

  let view = getParam('view')
    || [...viewBtns].find(b => b.hasAttribute('data-active'))?.getAttribute('data-view')
    || 'grid';
  applyView(view);

  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-view') === 'list' ? 'list' : 'grid';
      if (next === view) return;
      view = next;
      applyView(view);
      setParam('view', view);
    });
  });

  // ---------------- ORDER (alpha/game) ----------------
  const sortContainer = section;

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

    orderBtns.forEach(btn => {
      btn.toggleAttribute('data-active', btn.getAttribute('data-order') === mode);
    });

    const u = new URL(location.href);
    u.searchParams.set('order', mode);
    history.replaceState(null, '', u.toString());

    applyVisibility();
    document.documentElement.classList.remove('preorder-hide');
  }

  let orderMode =
    new URL(location.href).searchParams.get('order') ||
    (orderBtns.find(b => b.hasAttribute('data-active'))?.getAttribute('data-order')) ||
    'alpha';

  applyOrder(orderMode);

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
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      checkedSet.clear?.();
      boxes.forEach(cb => { cb.checked = false; });
      renderCount();
      applyVisibility();
    });
  }
});
