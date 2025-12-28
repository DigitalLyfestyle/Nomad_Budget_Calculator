(function () {
  const BASE_URL = 'https://tools.digitallyfestyle.com/nomad-budget-calculator/';
  const STORAGE_KEY = 'nomad-budget-state-v1';

  const categories = [
    { key: 'ac', label: 'Accommodation', defaultValue: 1200 },
    { key: 'ut', label: 'Utilities', defaultValue: 200 },
    { key: 'fd', label: 'Food & groceries', defaultValue: 500 },
    { key: 'tr', label: 'Local transport', defaultValue: 180 },
    { key: 'cw', label: 'Coworking / work setup', defaultValue: 250 },
    { key: 'hi', label: 'Health insurance', defaultValue: 180 },
    { key: 'vi', label: 'Visa/immigration', defaultValue: 100 },
    { key: 'en', label: 'Entertainment', defaultValue: 200 },
    { key: 'su', label: 'Subscriptions', defaultValue: 80 },
    { key: 'mi', label: 'Misc', defaultValue: 120 }
  ];

  const presets = {
    frugal: { ac: 800, ut: 150, fd: 350, tr: 120, cw: 180, hi: 120, vi: 80, en: 120, su: 60, mi: 80 },
    balanced: { ac: 1200, ut: 220, fd: 550, tr: 180, cw: 250, hi: 180, vi: 100, en: 200, su: 80, mi: 140 },
    comfortable: { ac: 1800, ut: 300, fd: 750, tr: 260, cw: 320, hi: 240, vi: 140, en: 320, su: 120, mi: 220 }
  };

  const MAX_CATEGORY_VALUE = 9999999999;

  const defaultState = {
    destination: '',
    currency: 'USD',
    household: 'solo',
    preset: '',
    categories: Object.fromEntries(categories.map((c) => [c.key, c.defaultValue])),
    buffer: { mode: 'percent', value: 10 },
    oneTime: { flight: 800, deposit: 1000, gear: 400 },
    savings: 0,
    income: 0,
    remember: false,
    theme: 'auto'
  };

  let state = { ...defaultState, categories: { ...defaultState.categories }, buffer: { ...defaultState.buffer }, oneTime: { ...defaultState.oneTime } };

  const els = {};

  function qs(id) {
    return document.getElementById(id);
  }

  function initElements() {
    els.destination = qs('destination');
    els.currency = qs('currency');
    els.household = qs('household');
    els.categoryList = qs('categoryList');
    els.bufferValue = qs('bufferValue');
    els.bufferHint = qs('bufferHint');
    els.bufferRadios = Array.from(document.querySelectorAll('input[name="bufferMode"]'));
    els.flight = qs('flight');
    els.deposit = qs('deposit');
    els.gear = qs('gear');
    els.savings = qs('savings');
    els.income = qs('income');
    els.monthlyTotal = qs('monthlyTotal');
    els.oneTimeTotal = qs('oneTimeTotal');
    els.firstMonth = qs('firstMonth');
    els.runway = qs('runway');
    els.net = qs('net');
    els.chart = qs('chart');
    els.warnings = qs('warnings');
    els.netCashChart = qs('netCashChart');
    els.netCashSummary = qs('netCashSummary');
    els.calculate = qs('calculate');
    els.share = qs('share');
    els.csv = qs('csv');
    els.currencyDisplay = qs('currencyDisplay');
    els.rememberToggle = qs('rememberToggle');
    els.resultsCard = qs('resultsCard');
  }

  function formatCurrency(value) {
    const currency = state.currency || 'USD';
    const safe = Number.isFinite(value) ? value : 0;
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(safe);
    } catch (e) {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(safe);
    }
  }

  function renderCategories() {
    els.categoryList.innerHTML = '';
    categories.forEach((cat) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'category';
      wrapper.innerHTML = `
        <div>
          <h3>${cat.label}</h3>
          <p class="hint">Enter monthly amount (supports large values)</p>
        </div>
        <div class="inputs">
          <input type="number" min="0" max="${MAX_CATEGORY_VALUE}" step="1" inputmode="decimal" aria-label="${cat.label} amount" data-key="${cat.key}" />
        </div>
      `;
      els.categoryList.appendChild(wrapper);
    });
  }

  function hydrateUI() {
    els.destination.value = state.destination;
    els.currency.value = state.currency;
    els.household.value = state.household;
    els.rememberToggle.checked = state.remember;
    els.bufferValue.value = state.buffer.value;
    els.bufferRadios.forEach((radio) => (radio.checked = radio.value === state.buffer.mode));

    const numberInputs = els.categoryList.querySelectorAll('input[type="number"]');

    numberInputs.forEach((input) => {
      const key = input.dataset.key;
      const value = state.categories[key] || 0;
      input.value = value;
    });

    els.flight.value = state.oneTime.flight;
    els.deposit.value = state.oneTime.deposit;
    els.gear.value = state.oneTime.gear;
    els.savings.value = state.savings;
    els.income.value = state.income;
    updatePresetButtons();
    updateBufferHint();
    applyTheme(state.theme || 'auto');
  }

  function updatePresetButtons() {
    document.querySelectorAll('.chip').forEach((btn) => {
      const active = btn.dataset.preset === state.preset;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active.toString());
    });
  }

  function getNumber(value, fallback = 0) {
    const num = parseFloat(value);
    if (Number.isNaN(num) || num < 0) return fallback;
    return num;
  }

  function clampCategoryValues() {
    categories.forEach(({ key }) => {
      const safe = getNumber(state.categories[key], 0);
      state.categories[key] = Math.min(Math.max(safe, 0), MAX_CATEGORY_VALUE);
    });
  }

  function attachCategoryListeners() {
    els.categoryList.addEventListener('input', (e) => {
      const target = e.target;
      const key = target.dataset.key;
      if (!key) return;
      const num = getNumber(target.value, state.categories[key] || 0);
      state.categories[key] = Math.min(Math.max(num, 0), MAX_CATEGORY_VALUE);
      syncCategoryInputs(key, target);
      saveState();
      calculate();
    });
  }

  function syncCategoryInputs(key, source) {
    const pair = els.categoryList.querySelectorAll(`[data-key="${key}"]`);
    pair.forEach((input) => {
      if (input !== source) {
        input.value = state.categories[key];
      }
    });
  }

  function attachBufferListeners() {
    els.bufferRadios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          state.buffer.mode = radio.value;
          if (state.buffer.mode === 'percent' && state.buffer.value === 0) {
            state.buffer.value = 10;
          }
          updateBufferHint();
          saveState();
          calculate();
        }
      });
    });

    els.bufferValue.addEventListener('input', () => {
      const value = getNumber(els.bufferValue.value, state.buffer.mode === 'percent' ? 10 : 0);
      state.buffer.value = value;
      updateBufferHint();
      saveState();
      calculate();
    });
  }

  function attachOneTimeListeners() {
    ['flight', 'deposit', 'gear', 'savings', 'income'].forEach((key) => {
      els[key].addEventListener('input', () => {
        const value = getNumber(els[key].value, 0);
        if (key === 'savings' || key === 'income') {
          state[key] = value;
        } else {
          state.oneTime[key] = value;
        }
        saveState();
        calculate();
      });
    });
  }

  function attachMetaListeners() {
    els.destination.addEventListener('input', () => {
      state.destination = els.destination.value.trim();
      saveState();
    });

    els.currency.addEventListener('change', () => {
      state.currency = els.currency.value;
      saveState();
      calculate();
    });

    els.household.addEventListener('change', () => {
      state.household = els.household.value;
      saveState();
    });

    els.rememberToggle.addEventListener('change', () => {
      state.remember = els.rememberToggle.checked;
      if (!state.remember) localStorage.removeItem(STORAGE_KEY);
      saveState();
    });

    document.querySelectorAll('.chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const presetKey = btn.dataset.preset;
        const presetValues = presets[presetKey];
        if (!presetValues) return;
        state.preset = presetKey;
        state.categories = { ...state.categories, ...presetValues };
        hydrateUI();
        saveState();
        calculate();
      });
    });

    document.querySelector('.toggle-collapse').addEventListener('click', (e) => {
      const body = document.getElementById('oneTimeBody');
      const expanded = e.target.getAttribute('aria-expanded') === 'true';
      e.target.setAttribute('aria-expanded', (!expanded).toString());
      e.target.textContent = expanded ? 'Show' : 'Hide';
      body.style.display = expanded ? 'none' : 'block';
      sendHeight();
    });

    els.calculate.addEventListener('click', () => {
      calculate();
      document.getElementById('resultsCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    els.share.addEventListener('click', handleShare);
    els.csv.addEventListener('click', exportCSV);
  }

  function calculate() {
    let subtotal = 0;
    categories.forEach((cat) => {
      subtotal += getNumber(state.categories[cat.key], 0);
    });

    const bufferAmount = state.buffer.mode === 'percent' ? subtotal * (state.buffer.value / 100) : state.buffer.value;
    const monthlyTotal = subtotal + bufferAmount;
    const oneTimeTotal = getNumber(state.oneTime.flight) + getNumber(state.oneTime.deposit) + getNumber(state.oneTime.gear);
    const firstMonth = monthlyTotal + oneTimeTotal;
    const runwayMonths = monthlyTotal > 0 ? (getNumber(state.savings) / monthlyTotal) : 0;
    const net = state.income ? state.income - monthlyTotal : null;

    els.monthlyTotal.textContent = formatCurrency(monthlyTotal);
    els.oneTimeTotal.textContent = formatCurrency(oneTimeTotal);
    els.firstMonth.textContent = formatCurrency(firstMonth);
    els.runway.textContent = monthlyTotal > 0 ? runwayMonths.toFixed(1) : '—';
    els.net.textContent = net !== null ? `${net >= 0 ? '+' : ''}${formatCurrency(net)}` : '—';
    els.currencyDisplay.textContent = state.currency;

    renderBars(subtotal, bufferAmount);
    renderWarnings(subtotal, bufferAmount, monthlyTotal);
    renderNetCashGraph(monthlyTotal, oneTimeTotal);
    saveState();
    sendHeight();
  }

  function renderBars(subtotal, bufferAmount) {
    els.chart.innerHTML = '';
    const total = subtotal + bufferAmount;
    const addRow = (label, value, colorClass = '') => {
      const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
      const row = document.createElement('div');
      row.className = 'chart-row';
      row.innerHTML = `
        <div>
          <p class="label">${label}</p>
          <div class="bar-track"><div class="bar-fill ${colorClass}" style="width:${percent}%"></div></div>
        </div>
        <div class="metric-value">${formatCurrency(value)}</div>
      `;
      els.chart.appendChild(row);
    };

    categories.forEach((cat) => addRow(cat.label, getNumber(state.categories[cat.key], 0)));
    addRow('Buffer', bufferAmount, 'soft');
  }

  function renderWarnings(subtotal, bufferAmount, monthlyTotal) {
    const warnings = [];
    const zeroed = categories.filter((c) => !getNumber(state.categories[c.key], 0));
    if (zeroed.length) {
      warnings.push(`We noticed ${zeroed.map((c) => c.label).join(', ')} set to 0. Double-check in case you expect costs.`);
    }

    const bufferPercent = monthlyTotal > 0 ? (bufferAmount / monthlyTotal) * 100 : 0;
    if (bufferPercent < 5) {
      warnings.push('Buffer is below 5%. Consider raising it for safety.');
    }

    els.warnings.innerHTML = '';
    warnings.forEach((msg) => {
      const div = document.createElement('div');
      div.className = 'warning';
      div.innerHTML = `<span class="dot" aria-hidden="true"></span><span>${msg}</span>`;
      els.warnings.appendChild(div);
    });
  }

  function renderNetCashGraph(monthlyTotal, oneTimeTotal) {
    if (!els.netCashChart) return;
    const income = getNumber(state.income, 0);
    const months = Array.from({ length: 6 }, (_, i) => {
      const expenses = monthlyTotal + (i === 0 ? oneTimeTotal : 0);
      return { month: i + 1, net: income - expenses };
    });

    const maxAbs = Math.max(1, ...months.map((m) => Math.abs(m.net)));
    els.netCashChart.innerHTML = '';

    months.forEach((m) => {
      const row = document.createElement('div');
      row.className = 'net-bar';
      const percent = Math.round((Math.abs(m.net) / maxAbs) * 100);
      row.innerHTML = `
        <span class="label" aria-hidden="true">M${m.month}</span>
        <div class="net-track" aria-hidden="true">
          <div class="net-fill ${m.net >= 0 ? 'positive' : 'negative'}" style="width:${percent}%"></div>
        </div>
        <span class="metric-value">${m.net >= 0 ? '+' : ''}${formatCurrency(m.net)}</span>
      `;
      row.setAttribute('aria-label', `Month ${m.month} net ${m.net >= 0 ? 'surplus' : 'deficit'} of ${formatCurrency(m.net)}`);
      els.netCashChart.appendChild(row);
    });

    if (els.netCashSummary && months.length) {
      const firstNet = months[0].net;
      els.netCashSummary.textContent = `${firstNet >= 0 ? 'Month 1 surplus' : 'Month 1 shortfall'} ${formatCurrency(firstNet)}`;
    }
  }

  function updateBufferHint() {
    const mode = state.buffer.mode;
    els.bufferHint.textContent = mode === 'percent' ? 'Recommended: 10% safety net' : 'Fixed buffer adds a set amount each month';
    els.bufferValue.setAttribute('aria-label', mode === 'percent' ? 'Buffer percent' : 'Buffer amount');
    if (mode === 'percent') {
      els.bufferValue.setAttribute('max', '100');
      els.bufferValue.setAttribute('step', '1');
    } else {
      els.bufferValue.removeAttribute('max');
      els.bufferValue.setAttribute('step', '50');
    }
  }

  function handleShare() {
    const url = new URL(BASE_URL || window.location.href);
    const params = new URLSearchParams();
    params.set('d', state.destination || '');
    params.set('c', state.currency);
    params.set('h', state.household);
    params.set('p', state.preset || '');
    params.set('bm', state.buffer.mode);
    params.set('bv', state.buffer.value);
    params.set('sv', state.savings || 0);
    params.set('in', state.income || 0);
    Object.entries(state.categories).forEach(([key, val]) => params.set(key, val));
    Object.entries(state.oneTime).forEach(([key, val]) => params.set(key, val));
    url.search = params.toString();

    const shareURL = url.toString();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareURL).then(() => {
        els.share.textContent = 'Link copied';
        setTimeout(() => (els.share.textContent = 'Share'), 1600);
      }).catch(() => {
        window.prompt('Copy this link', shareURL);
      });
    } else {
      window.prompt('Copy this link', shareURL);
    }
  }

  function exportCSV() {
    const rows = [];
    rows.push(['Destination', state.destination]);
    rows.push(['Currency', state.currency]);
    categories.forEach((cat) => rows.push([cat.label, getNumber(state.categories[cat.key], 0)]));
    rows.push(['Buffer mode', state.buffer.mode]);
    rows.push(['Buffer value', state.buffer.value]);
    rows.push(['Flights / relocation', state.oneTime.flight]);
    rows.push(['Deposit / move-in', state.oneTime.deposit]);
    rows.push(['Gear / setup', state.oneTime.gear]);
    rows.push(['Savings', state.savings]);
    rows.push(['Income', state.income]);
    const subtotal = categories.reduce((acc, cat) => acc + getNumber(state.categories[cat.key], 0), 0);
    const bufferAmount = state.buffer.mode === 'percent' ? subtotal * (state.buffer.value / 100) : state.buffer.value;
    const monthlyTotal = subtotal + bufferAmount;
    const oneTimeTotal = getNumber(state.oneTime.flight) + getNumber(state.oneTime.deposit) + getNumber(state.oneTime.gear);
    rows.push(['Monthly total', monthlyTotal]);
    rows.push(['One-time total', oneTimeTotal]);
    rows.push(['First-month need', monthlyTotal + oneTimeTotal]);

    const csv = rows.map((r) => r.map((val) => `"${val}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nomad-budget.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function saveState() {
    if (!state.remember) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // ignore
    }
  }

  function loadFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.remember) {
          state = { ...state, ...parsed, categories: { ...state.categories, ...parsed.categories }, buffer: { ...state.buffer, ...parsed.buffer }, oneTime: { ...state.oneTime, ...parsed.oneTime } };
          clampCategoryValues();
        }
      }
    } catch (e) {
      // ignore
    }
  }

  function loadFromQuery() {
    const params = new URLSearchParams(window.location.search);
    if (![...params.keys()].length) return;

    state.destination = params.get('d') || state.destination;
    state.currency = params.get('c') || state.currency;
    state.household = params.get('h') || state.household;
    state.preset = params.get('p') || '';
    state.buffer.mode = params.get('bm') === 'fixed' ? 'fixed' : 'percent';
    state.buffer.value = getNumber(params.get('bv'), state.buffer.mode === 'percent' ? 10 : 0);
    state.savings = getNumber(params.get('sv'), 0);
    state.income = getNumber(params.get('in'), 0);

    categories.forEach((cat) => {
      const val = params.get(cat.key);
      if (val !== null) state.categories[cat.key] = getNumber(val, state.categories[cat.key]);
    });

    clampCategoryValues();

    ['flight', 'deposit', 'gear'].forEach((key) => {
      const val = params.get(key);
      if (val !== null) state.oneTime[key] = getNumber(val, state.oneTime[key]);
    });
  }

  function sendHeight() {
    const height = document.body.scrollHeight;
    window.parent?.postMessage({ type: 'nbc-height', height }, '*');
  }

  function applyTheme(theme) {
    const root = document.querySelector('.dl-nomad-budget');
    root.setAttribute('data-theme', theme);
    state.theme = theme;
    document.querySelectorAll('.theme-btn').forEach((btn) => {
      const pressed = btn.dataset.theme === theme;
      btn.setAttribute('aria-pressed', pressed.toString());
    });
    saveState();
  }

  function attachThemeButtons() {
    document.querySelectorAll('.theme-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyTheme(btn.dataset.theme);
      });
    });
  }

  function initRememberedTheme() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.theme) state.theme = parsed.theme;
      } catch (e) {
        // ignore
      }
    }
  }

  function bindAccessibility() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.classList.contains('chip')) {
        e.preventDefault();
        e.target.click();
      }
    });
  }

  function init() {
    initElements();
    renderCategories();
    initElements();
    initRememberedTheme();
    loadFromStorage();
    loadFromQuery();
    hydrateUI();
    attachCategoryListeners();
    attachBufferListeners();
    attachOneTimeListeners();
    attachMetaListeners();
    attachThemeButtons();
    bindAccessibility();
    calculate();
    sendHeight();
  }

  window.addEventListener('resize', sendHeight);
  document.addEventListener('DOMContentLoaded', init);
})();
