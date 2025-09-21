document.addEventListener('DOMContentLoaded', () => {
  const SELECTOR = 'label > input[type="checkbox"]';
  const STORAGE_KEY = 'balatro:jokers:checked';

  // ---------- helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const getParam = (k) => new URL(location.href).searchParams.get(k);
  const setParam = (k, v) => {
    const u = new URL(location.href);
    if (!v) u.searchParams.delete(k); else u.searchParams.set(k, v);
    history.replaceState(null, '', u.toString());
  };

  // ---------- counter / localStorage ----------
  const $count = $('#joker-count');
  const $total = $('#joker-total');

  const loadSet = () => {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
    catch { return new Set(); }
  };
  const saveSet = (set) => localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));

  const boxes = $$(SELECTOR);
  if ($total) $total.textContent = boxes.length || 150;

  const checkedSet = loadSet();
  for (const cb of boxes) {
    const id = cb.id || cb.name;
    if (id && checkedSet.has(id)) cb.checked = true;
  }

  const renderCount = () => { if ($count) $count.textContent = checkedSet.size; };
  renderCount();

  // Toggle handling (localStorage only)
  document.addEventListener('change', (e) => {
    const cb = e.target;
    if (!(cb instanceof HTMLInputElement) || !cb.matches(SELECTOR)) return;
    const id = cb.id || cb.name;
    if (!id) return;
    cb.checked ? checkedSet.add(id) : checkedSet.delete(id);
    saveSet(checkedSet);
    renderCount();
  });

  // ---------- live filter ----------
  const input = $('#filter-jokers');
  const clearBtn = $('#clear-filter');

  if (input) {
    const labels = $$('label').filter(l => l.querySelector('input[type="checkbox"]'));

    const normalize = (s) =>
      (s || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[_\s-]+/g, ' ')
        .trim();

    const lookup = labels.map(label => {
      const nameEl = label.querySelector('.joker-desc h2') || label.querySelector('h2');
      const imgEl  = label.querySelector('img');
      const raw = (nameEl?.textContent) || (imgEl?.alt) || label.textContent;
      return { label, key: normalize(raw) };
    });

    function applyFilter(q) {
      const qNorm = normalize(q);
      if (!qNorm) { for (const {label} of lookup) label.hidden = false; return; }
      for (const {label, key} of lookup) label.hidden = !key.includes(qNorm);
    }

    const toggleClearButton = () => { if (clearBtn) clearBtn.hidden = !input.value; };

    input.addEventListener('input', () => { applyFilter(input.value); toggleClearButton(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && input.value) {
        input.value = ''; applyFilter(''); toggleClearButton();
      }
    });
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = ''; applyFilter(''); input.focus(); toggleClearButton();
      });
      clearBtn.hidden = !input.value;
    }
  }

  // ---------- reset all ----------
  const resetBtn = $('#reset-jokers');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      $$(SELECTOR).forEach(cb => { cb.checked = false; });
      checkedSet.clear?.();
      renderCount();
    });
  }

  
  // View and Order toggles

  // container is the single <section> on the page
  const container = document.querySelector('section');

  // VIEW buttons: expect two buttons somewhere with data-view="grid|list"
  const viewBtns  = document.querySelectorAll('[data-view]');
  // ORDER buttons: expect two buttons with data-order="alpha|game"
  const orderBtns = Array.from(document.querySelectorAll('[data-order="alpha"], [data-order="game"]'));
  // ---------- VIEW ----------
  function applyView(viewMode) {
    if (!container) return;
    // Toggle classes on the section itself
    container.classList.toggle('is-grid', viewMode === 'grid');
    container.classList.toggle('is-list', viewMode === 'list');
    // Reflect active state on buttons (data-active present on the active one)
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

  // ---------- ORDER ----------

  // ---------------- ORDER (alpha/game) — robust + unhides section ----------------

// pick the <section> that actually contains the jokers (labels with checkboxes)
const sortContainer = (() => {
  const sections = Array.from(document.querySelectorAll('section'));
  return sections.find(sec => sec.querySelector('label input[type="checkbox"]')) || sections[0] || null;
})();

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
  }

  // initial mode
  let orderMode =
    new URL(location.href).searchParams.get('order') ||
    (orderBtns.find(b => b.hasAttribute('data-active'))?.getAttribute('data-order')) ||
    'alpha';

  applyOrder(orderMode);

  // IMPORTANT: unhide if we pre-hid for ordering
  document.documentElement.classList.remove('preorder-hide');

  // clicks
  orderBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-order'); // "alpha" | "game"
      if (!next || next === orderMode) return;
      orderMode = next;
      applyOrder(orderMode);
    });
  });
});
