'use strict';

const APPKEY = '7e75960b5a36eef2d9b3996d21ea3dfb';
const CALIL_LIBRARY_API = 'https://api.calil.jp/library';
const CALIL_CHECK_API   = 'https://api.calil.jp/check';

const locateBtn          = document.getElementById('locateBtn');
const locationText       = document.getElementById('locationText');
const statusMsg          = document.getElementById('statusMsg');
const librarySection     = document.getElementById('librarySection');
const libraryList        = document.getElementById('libraryList');
const libraryCount       = document.getElementById('libraryCount');
const isbnInput          = document.getElementById('isbnInput');
const searchBookBtn      = document.getElementById('searchBookBtn');
const bookError          = document.getElementById('bookError');
const bookResultSection  = document.getElementById('bookResultSection');
const bookResultList     = document.getElementById('bookResultList');
const bookResultCount    = document.getElementById('bookResultCount');

let nearbyLibraries = [];
let selectedSystemIds = new Set();
let callbackCounter = 0;

// ── Helpers ──────────────────────────────────────────────────────────────────

function showStatus(msg, isError = false) {
  statusMsg.textContent = msg;
  statusMsg.className   = 'status-msg' + (isError ? ' error' : '');
  statusMsg.classList.remove('hidden');
}

function hideStatus() {
  statusMsg.classList.add('hidden');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function libTypeBadge(category) {
  const map = {
    '公共': { label: '公共', cls: 'public' },
    '都道府県': { label: '都道府県', cls: 'pref' },
    '大学': { label: '大学', cls: 'univ' },
    '専門': { label: '専門', cls: 'other' },
  };
  const entry = map[category] || { label: category || 'その他', cls: 'other' };
  return `<span class="lib-type-badge ${entry.cls}">${escapeHtml(entry.label)}</span>`;
}

// ── JSONP utility ─────────────────────────────────────────────────────────────

function jsonp(url, params, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const cbName = `_calilCb${++callbackCounter}`;
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('タイムアウト'));
    }, timeoutMs);

    window[cbName] = (data) => {
      cleanup();
      resolve(data);
    };

    const qs = new URLSearchParams({ ...params, callback: cbName }).toString();
    const script = document.createElement('script');
    script.src = `${url}?${qs}`;
    script.onerror = () => { cleanup(); reject(new Error('通信エラー')); };
    document.head.appendChild(script);

    function cleanup() {
      clearTimeout(timeout);
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }
  });
}

// ── Step 1: Geolocation ───────────────────────────────────────────────────────

locateBtn.addEventListener('click', async () => {
  if (!navigator.geolocation) {
    showStatus('このブラウザは位置情報に対応していません', true);
    return;
  }

  locateBtn.classList.add('loading');
  locateBtn.disabled = true;
  showStatus('現在地を取得中...');

  navigator.geolocation.getCurrentPosition(
    pos => fetchLibraries(pos.coords.latitude, pos.coords.longitude),
    err => {
      locateBtn.classList.remove('loading');
      locateBtn.disabled = false;
      const msg = err.code === 1
        ? '位置情報へのアクセスが拒否されました。ブラウザの設定を確認してください。'
        : '現在地の取得に失敗しました。';
      showStatus(msg, true);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

// ── Step 2: Fetch nearby libraries ───────────────────────────────────────────

async function fetchLibraries(lat, lon) {
  locationText.textContent = `緯度 ${lat.toFixed(5)}、経度 ${lon.toFixed(5)}`;
  showStatus('近くの図書館を検索中...');

  try {
    // geocode parameter: "longitude,latitude" (lon first)
    const data = await jsonp(CALIL_LIBRARY_API, {
      appkey: APPKEY,
      geocode: `${lon},${lat}`,
      limit:   20,
      format:  'json',
    });

    locateBtn.classList.remove('loading');
    locateBtn.disabled = false;

    nearbyLibraries = Array.isArray(data) ? data : [];
    if (nearbyLibraries.length === 0) {
      showStatus('近くに図書館が見つかりませんでした', true);
      return;
    }

    hideStatus();
    renderLibraries();
    searchBookBtn.disabled = false;

  } catch (e) {
    locateBtn.classList.remove('loading');
    locateBtn.disabled = false;
    showStatus('図書館情報の取得に失敗しました: ' + e.message, true);
  }
}

// ── Step 3: Render library list ───────────────────────────────────────────────

function renderLibraries() {
  libraryList.innerHTML = '';
  selectedSystemIds.clear();

  nearbyLibraries.forEach((lib, idx) => {
    const item = document.createElement('div');
    item.className = 'library-item';
    item.dataset.idx = idx;

    const address = [lib.pref, lib.city, lib.address].filter(Boolean).join('');
    const urlHtml = lib.url_pc
      ? `<span class="lib-meta lib-url"><a href="${escapeHtml(lib.url_pc)}" target="_blank" rel="noopener">ウェブサイト</a></span>`
      : '';
    const telHtml = lib.tel
      ? `<span class="lib-meta lib-tel">${escapeHtml(lib.tel)}</span>`
      : '';

    item.innerHTML = `
      <div class="lib-row1">
        <span class="lib-name">${escapeHtml(lib.formal || lib.systemname || '図書館')}</span>
        ${libTypeBadge(lib.category)}
      </div>
      <div class="lib-meta">
        ${address ? `<span class="lib-meta lib-address">${escapeHtml(address)}</span>` : ''}
        ${telHtml}
        ${urlHtml}
      </div>
      <p class="select-hint">クリックして蔵書検索の対象に追加</p>
    `;

    item.addEventListener('click', () => toggleLibrary(item, lib, idx));
    libraryList.appendChild(item);
  });

  libraryCount.textContent = `${nearbyLibraries.length} 件`;
  librarySection.classList.remove('hidden');
}

function toggleLibrary(itemEl, lib, idx) {
  const sid = lib.systemid;
  if (selectedSystemIds.has(sid)) {
    selectedSystemIds.delete(sid);
    itemEl.classList.remove('selected');
  } else {
    selectedSystemIds.add(sid);
    itemEl.classList.add('selected');
  }
}

// ── Step 4: Book search ───────────────────────────────────────────────────────

isbnInput.addEventListener('input', () => {
  bookError.classList.add('hidden');
});

searchBookBtn.addEventListener('click', () => {
  const raw = isbnInput.value.trim().replace(/-/g, '');
  if (!/^\d{10}$|^\d{13}$/.test(raw)) {
    bookError.textContent = 'ISBNは10桁または13桁の数字で入力してください';
    bookError.classList.remove('hidden');
    return;
  }
  bookError.classList.add('hidden');

  const targets = selectedSystemIds.size > 0
    ? nearbyLibraries.filter(l => selectedSystemIds.has(l.systemid))
    : nearbyLibraries.slice(0, 5);

  if (targets.length === 0) {
    bookError.textContent = '先に図書館を選択してください';
    bookError.classList.remove('hidden');
    return;
  }

  searchBooks(raw, targets);
});

// ── Step 5: Check book availability ──────────────────────────────────────────

async function searchBooks(isbn, libraries) {
  bookResultList.innerHTML = '';
  bookResultSection.classList.remove('hidden');
  bookResultCount.textContent = `${libraries.length} 館を検索中`;

  // Render pending state for each library
  const itemMap = {};
  libraries.forEach(lib => {
    const el = document.createElement('div');
    el.className = 'book-result-item checking';
    el.innerHTML = `
      <div class="book-result-header">
        <span class="book-lib-name">${escapeHtml(lib.formal || lib.systemname || '図書館')}</span>
      </div>
      <div class="checking-indicator">
        <div class="spinner"></div>検索中...
      </div>
    `;
    bookResultList.appendChild(el);
    itemMap[lib.systemid] = el;
  });

  // Group by systemid (they should already be unique here)
  const systemids = libraries.map(l => l.systemid).join(',');
  const libBySystemId = {};
  libraries.forEach(l => { libBySystemId[l.systemid] = l; });

  try {
    const result = await pollCheck(isbn, systemids);
    renderBookResults(result, libBySystemId, itemMap, isbn);
    bookResultCount.textContent = `${libraries.length} 館の結果`;
  } catch (e) {
    bookResultCount.textContent = 'エラー';
    Object.values(itemMap).forEach(el => {
      el.querySelector('.checking-indicator').innerHTML =
        `<span style="color:#fca5a5">取得失敗: ${escapeHtml(e.message)}</span>`;
    });
  }
}

// Poll CALIL check API until status is not "Running"
async function pollCheck(isbn, systemids, maxTries = 8) {
  let session = null;

  for (let i = 0; i < maxTries; i++) {
    const params = {
      appkey:   APPKEY,
      isbn:     isbn,
      systemid: systemids,
      format:   'json',
    };
    if (session) params.session = session;

    const data = await jsonp(CALIL_CHECK_API, params, 15000);

    if (data.session) session = data.session;
    if (data.continue === 0 || data.continue === '0') return data;

    // still running – wait and retry
    await new Promise(r => setTimeout(r, 2000));
  }

  throw new Error('蔵書情報の取得がタイムアウトしました');
}

function renderBookResults(data, libBySystemId, itemMap, isbn) {
  const books = data.books || {};

  Object.entries(itemMap).forEach(([systemid, el]) => {
    el.classList.remove('checking');
    const lib = libBySystemId[systemid];
    const libName = escapeHtml(lib.formal || lib.systemname || '図書館');

    // books[isbn][systemid]
    const isbnData = books[isbn] || {};
    const sysData  = isbnData[systemid];

    if (!sysData) {
      el.innerHTML = `
        <div class="book-result-header">
          <span class="book-lib-name">${libName}</span>
          <span class="avail-status error">蔵書なし</span>
        </div>
      `;
      return;
    }

    const libkey   = sysData.libkey || {};
    const reserveUrl = sysData.reserveurl || '';
    const entries  = Object.entries(libkey);

    let overallStatus = 'none';
    entries.forEach(([, val]) => {
      if (val === '貸出可') overallStatus = 'ok';
      else if (overallStatus !== 'ok' && val === '貸出中') overallStatus = 'lending';
      else if (overallStatus === 'none') overallStatus = 'unknown';
    });

    const badgeMap = {
      ok:      ['ok', '貸出可'],
      lending: ['lending', '貸出中'],
      unknown: ['unknown', '確認要'],
      none:    ['unknown', '情報なし'],
    };
    const [badgeCls, badgeLabel] = badgeMap[overallStatus] || ['unknown', '確認要'];

    const branchRows = entries.map(([branch, status]) => {
      const stCls = status === '貸出可' ? 'ok'
                  : status === '貸出中' ? 'lending'
                  : status === '館内のみ' ? 'unknown'
                  : 'unknown';
      return `
        <div class="branch-row">
          <span class="branch-name">${escapeHtml(branch)}</span>
          <span class="branch-status ${stCls}">${escapeHtml(status)}</span>
        </div>
      `;
    }).join('');

    const reserveHtml = reserveUrl
      ? `<a class="calil-link" href="${escapeHtml(reserveUrl)}" target="_blank" rel="noopener">カーリルで予約・詳細を見る →</a>`
      : '';

    el.innerHTML = `
      <div class="book-result-header">
        <span class="book-lib-name">${libName}</span>
        <span class="avail-status ${badgeCls}">${badgeLabel}</span>
      </div>
      <div class="book-branches">${branchRows || '<p style="font-size:0.8rem;color:var(--muted)">分館情報なし</p>'}</div>
      ${reserveHtml}
    `;
  });
}
