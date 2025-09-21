document.addEventListener('DOMContentLoaded', () => {
  const SELECTOR = 'label > input[type="checkbox"]';
  const STORAGE_KEY = 'balatro:jokers:checked';

  // --- counter / localStorage ---
  const $count = document.getElementById('joker-count');
  const $total = document.getElementById('joker-total');

  const loadSet = () => {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
    catch { return new Set(); }
  };
  const saveSet = (set) => localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));

  const boxes = Array.from(document.querySelectorAll(SELECTOR));
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

  // --- live filter by joker name ---
  const input = document.getElementById('filter-jokers');
  const clearBtn = document.getElementById('clear-filter');

  if (input) {
    const labels = Array.from(document.querySelectorAll('label'))
      .filter(l => l.querySelector('input[type="checkbox"]'));

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
      if (!qNorm) {
        for (const {label} of lookup) label.hidden = false;
        return;
      }
      for (const {label, key} of lookup) {
        label.hidden = !key.includes(qNorm);
      }
    }

    function toggleClearButton() {
      if (clearBtn) clearBtn.hidden = !input.value;
    }

    input.addEventListener('input', () => {
      applyFilter(input.value);
      toggleClearButton();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && input.value) {
        input.value = '';
        applyFilter('');
        toggleClearButton();
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        applyFilter('');
        input.focus();
        toggleClearButton();
      });
      clearBtn.hidden = !input.value; // initial
    }
  }

  // --- reset all stickers (local only) ---
  const resetBtn = document.getElementById('reset-jokers');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      document.querySelectorAll(SELECTOR).forEach(cb => { cb.checked = false; });
      checkedSet.clear?.();
      renderCount();
    });
  }
});