const APPKEY = '7e75960b5a36eef2d9b3996d21ea3dfb';
const API_BASE = 'https://api.calil.jp';

// State
let foundLibraries = [];
let selectedSystemIds = [];

// DOM refs
const geoSearchBtn   = document.getElementById('geoSearchBtn');
const prefSearchBtn  = document.getElementById('prefSearchBtn');
const bookSearchBtn  = document.getElementById('bookSearchBtn');
const prefSelect     = document.getElementById('prefSelect');
const cityInput      = document.getElementById('cityInput');
const geoLimit       = document.getElementById('geoLimit');
const prefLimit      = document.getElementById('prefLimit');
const isbnInput      = document.getElementById('isbnInput');
const loading        = document.getElementById('loading');
const loadingMsg     = document.getElementById('loadingMsg');
const errorBox       = document.getElementById('errorBox');
const errorMsg       = document.getElementById('errorMsg');
const resultsSection = document.getElementById('resultsSection');
const resultsTitle   = document.getElementById('resultsTitle');
const resultsCount   = document.getElementById('resultsCount');
const libraryList    = document.getElementById('libraryList');

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// Buttons
geoSearchBtn.addEventListener('click', searchByGeo);
prefSearchBtn.addEventListener('click', searchByPref);
bookSearchBtn.addEventListener('click', searchBooks);

isbnInput.addEventListener('input', () => {
  const v = isbnInput.value.replace(/\D/g, '');
  isbnInput.value = v;
  bookSearchBtn.disabled = !(v.length === 10 || v.length === 13) || foundLibraries.length === 0;
});

// ── Geo search ──────────────────────────────────────────────
function searchByGeo() {
  if (!navigator.geolocation) {
    showError('お使いのブラウザは位置情報に対応していません。');
    return;
  }
  showLoading('現在地を取得中...');
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const limit = geoLimit.value;
      fetchLibraries({ geocode: `${lng},${lat}`, limit }, '現在地周辺の図書館');
    },
    err => {
      hideLoading();
      const msgs = {
        1: '位置情報の取得が拒否されました。ブラウザの設定をご確認ください。',
        2: '位置情報を取得できませんでした。',
        3: '位置情報の取得がタイムアウトしました。',
      };
      showError(msgs[err.code] || '位置情報の取得に失敗しました。');
    },
    { timeout: 10000 }
  );
}

// ── Pref search ─────────────────────────────────────────────
function searchByPref() {
  const pref = prefSelect.value;
  if (!pref) { showError('都道府県を選択してください。'); return; }
  const city  = cityInput.value.trim();
  const limit = prefLimit.value;
  const label = city ? `${pref} ${city}` : pref;
  showLoading('図書館を検索中...');
  fetchLibraries({ pref, city, limit }, `${label}の図書館`);
}

// ── Fetch libraries from CALIL ───────────────────────────────
function fetchLibraries(params, title) {
  const qs = new URLSearchParams({ appkey: APPKEY, format: 'json', callback: 'no', ...params });
  const url = `${API_BASE}/library?${qs}`;

  fetchJsonp(url)
    .then(data => {
      hideLoading();
      if (!Array.isArray(data) || data.length === 0) {
        showError('図書館が見つかりませんでした。条件を変えて再度お試しください。');
        return;
      }
      foundLibraries = data;
      selectedSystemIds = [...new Set(data.map(l => l.systemid))];
      renderLibraries(data, title);
      updateBookBtn();
    })
    .catch(err => {
      hideLoading();
      showError('通信エラーが発生しました。時間をおいて再度お試しください。');
      console.error(err);
    });
}

// ── Render library cards ─────────────────────────────────────
function renderLibraries(libs, title) {
  hideError();
  resultsTitle.textContent = title;
  resultsCount.textContent = `${libs.length}件`;
  libraryList.innerHTML = '';

  libs.forEach(lib => {
    const card = document.createElement('div');
    card.className = 'library-card';
    card.dataset.systemid = lib.systemid;
    card.dataset.libkey   = lib.libkey;

    const nameHtml = lib.url_pc
      ? `<a href="${escHtml(lib.url_pc)}" target="_blank" rel="noopener">${escHtml(lib.formal)}</a>`
      : escHtml(lib.formal);

    card.innerHTML = `
      <div class="lib-top">
        <div class="lib-name">${nameHtml}</div>
        <div class="lib-category">${escHtml(lib.category || '図書館')}</div>
      </div>
      ${lib.address ? `<div class="lib-address">📍 ${escHtml(lib.address)}</div>` : ''}
      ${lib.tel     ? `<div class="lib-tel">📞 <a href="tel:${escHtml(lib.tel)}">${escHtml(lib.tel)}</a></div>` : ''}
      <a class="calil-link" href="https://calil.jp/library/${escHtml(lib.libkey)}" target="_blank" rel="noopener">
        カーリルで詳細を見る →
      </a>
      <div class="book-availability hidden" id="avail-${escHtml(lib.libkey)}"></div>
    `;
    libraryList.appendChild(card);
  });

  resultsSection.classList.remove('hidden');
}

// ── Book search ──────────────────────────────────────────────
function searchBooks() {
  const isbn = isbnInput.value.trim();
  if (!isbn || foundLibraries.length === 0) return;

  // Show loading state in each card
  foundLibraries.forEach(lib => {
    const el = document.getElementById(`avail-${lib.libkey}`);
    if (!el) return;
    el.classList.remove('hidden');
    el.innerHTML = `
      <div class="book-availability-title">蔵書確認中...</div>
      <div class="book-status-list">
        <div class="book-status-item">
          <span class="status-dot loading"></span>
          <span>検索中</span>
        </div>
      </div>`;
  });

  loadingMsg.textContent = '蔵書情報を取得中...';

  pollBookCheck(isbn, selectedSystemIds, result => {
    applyBookResults(result);
  });
}

// ── CALIL check API (polling) ────────────────────────────────
function pollBookCheck(isbn, systemids, onComplete, session = null, attempt = 0) {
  const params = {
    appkey:   APPKEY,
    isbn,
    systemid: systemids.join(','),
    format:   'json',
    callback: 'no',
  };
  if (session) params.session = session;

  const qs  = new URLSearchParams(params);
  const url = `${API_BASE}/check?${qs}`;

  fetchJsonp(url)
    .then(data => {
      onComplete(data);
      if (data.continue === 1 && attempt < 20) {
        setTimeout(() => {
          pollBookCheck(isbn, systemids, onComplete, data.session, attempt + 1);
        }, 2000);
      }
    })
    .catch(err => {
      console.error('蔵書確認エラー:', err);
    });
}

// ── Apply availability results to cards ──────────────────────
function applyBookResults(data) {
  if (!data || !data.books) return;

  const booksData = data.books;

  foundLibraries.forEach(lib => {
    const el = document.getElementById(`avail-${lib.libkey}`);
    if (!el) return;

    const sysData = booksData[isbnInput.value]?.[lib.systemid];
    if (!sysData) return;

    const statusCode = sysData.status;
    const libkeys    = sysData.libkey || {};

    let items = [];

    if (Object.keys(libkeys).length > 0) {
      Object.entries(libkeys).forEach(([key, info]) => {
        if (key === lib.libkey || lib.systemid) {
          items.push({ label: info.status || statusCode, code: info.status });
        }
      });
    }

    if (items.length === 0) {
      items = [{ label: statusCode, code: statusCode }];
    }

    const statusHtml = items.map(item => {
      const dotClass = dotClassFor(item.code);
      return `<div class="book-status-item">
        <span class="status-dot ${dotClass}"></span>
        <span>${escHtml(item.label || '不明')}</span>
      </div>`;
    }).join('');

    const isLoading = data.continue === 1;
    el.innerHTML = `
      <div class="book-availability-title">📗 蔵書・貸出状況${isLoading ? '（確認中）' : ''}</div>
      <div class="book-status-list">${statusHtml || '<div class="book-status-item"><span class="status-dot unknown"></span><span>情報なし</span></div>'}</div>`;
    el.classList.remove('hidden');
  });
}

function dotClassFor(status) {
  if (!status) return 'unknown';
  const s = status.toLowerCase();
  if (s === 'ok' || s.includes('貸出可') || s.includes('在庫'))   return 'available';
  if (s === 'running') return 'loading';
  if (s === 'error' || s === 'no')  return 'unknown';
  if (s.includes('貸出中') || s.includes('予約'))  return 'on-loan';
  return 'unknown';
}

// ── Helpers ──────────────────────────────────────────────────
function fetchJsonp(url) {
  return fetch(url, { mode: 'cors' }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
}

function showLoading(msg) {
  loadingMsg.textContent = msg || '検索中...';
  loading.classList.remove('hidden');
  resultsSection.classList.add('hidden');
  errorBox.classList.add('hidden');
  foundLibraries = [];
  selectedSystemIds = [];
  updateBookBtn();
}
function hideLoading() { loading.classList.add('hidden'); }

function showError(msg) {
  errorMsg.textContent = msg;
  errorBox.classList.remove('hidden');
}
function hideError() { errorBox.classList.add('hidden'); }

function updateBookBtn() {
  const isbn = isbnInput.value;
  const validIsbn = isbn.length === 10 || isbn.length === 13;
  bookSearchBtn.disabled = !validIsbn || foundLibraries.length === 0;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
