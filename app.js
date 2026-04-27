'use strict';
// vocab.js must be loaded before app.js (defines VOCAB_DEFAULT)

// ─────────────────────────────────────────────
// 1. VOCABULARY  (uses VOCAB_DEFAULT from vocab.js; admin can override via localStorage)
// ─────────────────────────────────────────────
const VOCAB = (() => {
  try {
    const v = JSON.parse(localStorage.getItem('allen_vocab'));
    return Array.isArray(v) && v.length ? v : VOCAB_DEFAULT;
  } catch (_) { return VOCAB_DEFAULT; }
})();

// ─────────────────────────────────────────────
// 2. DEFAULT DATA
// ─────────────────────────────────────────────
const DEFAULT_LINKS = [
  { id:'l1', name:'Google',         url:'https://www.google.com',         category:'常用', icon:'fab fa-google' },
  { id:'l2', name:'Gmail',          url:'https://mail.google.com',        category:'常用', icon:'fas fa-envelope' },
  { id:'l3', name:'GitHub',         url:'https://github.com',             category:'開發', icon:'fab fa-github' },
  { id:'l4', name:'Stack Overflow', url:'https://stackoverflow.com',      category:'開發', icon:'fab fa-stack-overflow' },
  { id:'l5', name:'YouTube',        url:'https://www.youtube.com',        category:'娛樂', icon:'fab fa-youtube' },
  { id:'l6', name:'ChatGPT',        url:'https://chat.openai.com',        category:'AI',   icon:'fas fa-robot' },
  { id:'l7', name:'Notion',         url:'https://notion.so',              category:'生產力',icon:'fas fa-sticky-note' },
  { id:'l8', name:'LinkedIn',       url:'https://linkedin.com',           category:'工作', icon:'fab fa-linkedin' },
];
const DEFAULT_FEEDS = [
  { name:'BBC World',   url:'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name:'The Verge',   url:'https://www.theverge.com/rss/index.xml' },
  { name:'Hacker News', url:'https://hnrss.org/frontpage' },
];
const DEFAULT_PODCASTS = [
  { name:'TED Talks Daily', url:'https://feeds.feedburner.com/TEDTalks_audio' },
  { name:'NPR News Now',    url:'https://feeds.npr.org/500005/podcast.xml' },
];
const CACHE_TTL = 30 * 60 * 1000;

// ─────────────────────────────────────────────
// 3. STATE
// ─────────────────────────────────────────────
let S = {
  ownerName:       'Allen',
  autoSpeak:       false,
  wordIdx:         0,
  flipped:         false,
  calDate:         new Date(),
  events:          [],
  links:           DEFAULT_LINKS.map(x => ({ ...x })),
  keywords:        ['AI', '科技', 'technology'],
  feeds:           DEFAULT_FEEDS.map(x => ({ ...x })),
  podcasts:        DEFAULT_PODCASTS.map(x => ({ ...x })),
  wordNotes:       {},
  editEvtId:       null,
  personalHistory: [],
};

// ─────────────────────────────────────────────
// 4. APPWRITE LAYER  (AES-256-GCM encrypted)
// ─────────────────────────────────────────────
let awDb       = null;
let sessionKey = null; // CryptoKey — in-memory only, never persisted

// Resolved credentials — populated by initAppwriteConfig()
// from either encrypted APPWRITE_CIPHER or plain APPWRITE_PROJECT_ID
let AW_PROJECT_ID  = '';
let AW_DB_ID       = '';
let AW_COL_CONFIG  = '';
let AW_COL_EVENTS  = '';
let AW_COL_HISTORY = '';

const configDocIds = {}; // cache: config key → Appwrite $id

// ── Credential resolution ────────────────────
async function initAppwriteConfig() {
  // Encrypted mode: APPWRITE_SALT + APPWRITE_CIPHER in config.js
  if (typeof APPWRITE_CIPHER !== 'undefined' &&
      typeof APPWRITE_SALT   !== 'undefined' && sessionKey) {
    try {
      const json = await AW_CRYPTO.decrypt(APPWRITE_CIPHER, sessionKey);
      const cfg  = JSON.parse(json);
      AW_PROJECT_ID  = cfg.projectId;
      AW_DB_ID       = cfg.dbId;
      AW_COL_CONFIG  = cfg.colConfig;
      AW_COL_EVENTS  = cfg.colEvents;
      AW_COL_HISTORY = cfg.colHistory;
      return true;
    } catch (e) { console.error('Config decryption failed:', e); return false; }
  }
  // Plain mode: backward-compatible with unencrypted config.js
  if (typeof APPWRITE_PROJECT_ID !== 'undefined' &&
      !APPWRITE_PROJECT_ID.includes('YOUR_') &&
      typeof APPWRITE_DB_ID !== 'undefined' &&
      !APPWRITE_DB_ID.includes('YOUR_')) {
    AW_PROJECT_ID  = APPWRITE_PROJECT_ID;
    AW_DB_ID       = APPWRITE_DB_ID;
    AW_COL_CONFIG  = APPWRITE_COL_CONFIG;
    AW_COL_EVENTS  = APPWRITE_COL_EVENTS;
    AW_COL_HISTORY = APPWRITE_COL_HISTORY;
    return true;
  }
  return false;
}

async function initAppwrite() {
  try {
    if (typeof window.Appwrite === 'undefined') return false;
    if (!await initAppwriteConfig()) return false;
    const { Client, Databases } = window.Appwrite;
    const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(AW_PROJECT_ID);
    awDb = new Databases(client);
    await awDb.listDocuments(AW_DB_ID, AW_COL_CONFIG, []);
    return true;
  } catch (_) { awDb = null; return false; }
}

// ── Transparent encrypt / decrypt ────────────
// maybeEncrypt/maybeDecrypt are no-ops when sessionKey is null (plain mode).
// maybeDecrypt falls back to the raw value so legacy unencrypted records
// continue to work after encryption is enabled.
async function maybeEncrypt(text) {
  if (!sessionKey || text == null) return text ?? '';
  return AW_CRYPTO.encrypt(String(text), sessionKey);
}
async function maybeDecrypt(text) {
  if (!sessionKey || !text) return text || '';
  try { return await AW_CRYPTO.decrypt(text, sessionKey); }
  catch (_) { return text; }
}

// ── Load ─────────────────────────────────────
async function loadFromDB() {
  if (!awDb) return;
  try {
    const { Query } = window.Appwrite;
    const now = new Date();
    const [r1, r2, r3] = await Promise.all([
      awDb.listDocuments(AW_DB_ID, AW_COL_EVENTS,
        [Query.orderAsc('date'), Query.limit(200)]),
      awDb.listDocuments(AW_DB_ID, AW_COL_CONFIG,
        [Query.limit(20)]),
      awDb.listDocuments(AW_DB_ID, AW_COL_HISTORY,
        [Query.equal('month', now.getMonth() + 1), Query.equal('day', now.getDate()),
         Query.orderAsc('year'), Query.limit(200)]),
    ]);

    S.events = await Promise.all(r1.documents.map(async d => ({
      id:    d.$id,
      title: await maybeDecrypt(d.title),
      date:  d.date,
      time:  d.time  || '',
      note:  await maybeDecrypt(d.note || ''),
      color: d.color || '#58a6ff',
    })));

    const OK = new Set(['ownerName','autoSpeak','word_idx','links','keywords','feeds','podcasts','word_notes']);
    for (const d of r2.documents) {
      configDocIds[d.key] = d.$id;
      if (OK.has(d.key)) {
        try { S[d.key] = JSON.parse(await maybeDecrypt(d.value)); } catch (_) {}
      }
    }

    S.personalHistory = await Promise.all(r3.documents.map(async d => ({
      id:          d.$id,
      title:       await maybeDecrypt(d.title),
      description: await maybeDecrypt(d.description || ''),
      year: d.year, month: d.month, day: d.day,
    })));
  } catch (e) { console.error('loadFromDB:', e); }
}

// ── Sync helpers ─────────────────────────────
function syncConfig(key) {
  if (!awDb) { saveLocal(); return; }
  _syncConfigAsync(key).catch(e => { console.error('syncConfig', key, e); saveLocal(); });
}
async function _syncConfigAsync(key) {
  const { ID, Query } = window.Appwrite;
  const valueStr = await maybeEncrypt(JSON.stringify(S[key]));
  if (configDocIds[key]) {
    await awDb.updateDocument(AW_DB_ID, AW_COL_CONFIG, configDocIds[key], { value: valueStr });
  } else {
    const res = await awDb.listDocuments(AW_DB_ID, AW_COL_CONFIG,
      [Query.equal('key', key), Query.limit(1)]);
    if (res.documents.length > 0) {
      configDocIds[key] = res.documents[0].$id;
      await awDb.updateDocument(AW_DB_ID, AW_COL_CONFIG, configDocIds[key], { value: valueStr });
    } else {
      const doc = await awDb.createDocument(AW_DB_ID, AW_COL_CONFIG,
        ID.unique(), { key, value: valueStr });
      configDocIds[key] = doc.$id;
    }
  }
}

function syncEvent(evt) {
  if (!awDb) { saveLocal(); return; }
  _syncEventAsync(evt).catch(e => console.error('syncEvent', e));
}
async function _syncEventAsync(evt) {
  await _syncDocAsync(AW_COL_EVENTS, evt.id, {
    title: await maybeEncrypt(evt.title),
    date:  evt.date,
    time:  evt.time,
    note:  await maybeEncrypt(evt.note || ''),
    color: evt.color,
  });
}

function deleteEventDB(id) {
  if (!awDb) { saveLocal(); return; }
  awDb.deleteDocument(AW_DB_ID, AW_COL_EVENTS, id)
    .catch(e => console.error('deleteEventDB', e));
}

function syncPH(item) {
  if (!awDb) return;
  _syncPHAsync(item).catch(e => console.error('syncPH', e));
}
async function _syncPHAsync(item) {
  await _syncDocAsync(AW_COL_HISTORY, item.id, {
    title:       await maybeEncrypt(item.title),
    description: await maybeEncrypt(item.description || ''),
    year: item.year, month: item.month, day: item.day,
  });
}

function deletePHDB(id) {
  if (!awDb) return;
  awDb.deleteDocument(AW_DB_ID, AW_COL_HISTORY, id)
    .catch(e => console.error('deletePHDB', e));
}

async function _syncDocAsync(colId, docId, data) {
  try {
    await awDb.updateDocument(AW_DB_ID, colId, docId, data);
  } catch (e) {
    if (e.code === 404) await awDb.createDocument(AW_DB_ID, colId, docId, data);
    else throw e;
  }
}

// ── Status badge ─────────────────────────────
function setDBStatus(status) {
  const badge = document.getElementById('dbBadge');
  const label = document.getElementById('dbLabel');
  if (!badge || !label) return;
  badge.className = `db-badge db-${status}`;
  label.textContent = status === 'connected' ? 'Appwrite ✓'
                    : status === 'pending'   ? '連線中…' : '未連線';
  badge.title = status === 'connected' ? '已連接 Appwrite（端對端加密）'
              : status === 'pending'   ? '正在連接資料庫…'
              : '尚未設定 Appwrite（資料暫存於瀏覽器）';
}
function showDBBanner() {
  const b = document.getElementById('dbBanner');
  if (b) b.style.display = 'flex';
}

// ─────────────────────────────────────────────
// 5. LOCAL STORAGE FALLBACK
// ─────────────────────────────────────────────
function saveLocal() {
  const { ownerName, autoSpeak, wordIdx, events, links, keywords, feeds, podcasts, wordNotes } = S;
  try { localStorage.setItem('allen_dash', JSON.stringify({ ownerName, autoSpeak, wordIdx, events, links, keywords, feeds, podcasts, wordNotes })); }
  catch (_) {}
}
function loadLocal() {
  try {
    const raw = localStorage.getItem('allen_dash');
    if (raw) Object.assign(S, JSON.parse(raw));
  } catch (_) {}
}
function lsGet(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; } }
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {} }

// ─────────────────────────────────────────────
// 6. CLOCK
// ─────────────────────────────────────────────
function initClock() { tick(); setInterval(tick, 1000); }

// Apply owner name to page title and header h1
function applyOwnerName() {
  const name = S.ownerName || 'Allen';
  document.title = `${name}'s Dashboard`;
  const h1 = document.querySelector('.header-brand h1');
  if (h1) h1.textContent = `${name}'s Dashboard`;
  // Sync settings input if modal is open
  const inp = el('settingsOwnerName');
  if (inp && document.activeElement !== inp) inp.value = name;
}

function tick() {
  const now  = new Date();
  const name = S.ownerName || 'Allen';
  document.getElementById('clock').textContent = now.toLocaleTimeString('zh-TW', { hour12: false });
  document.getElementById('dateInfo').textContent = now.toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
  const h = now.getHours();
  document.getElementById('greeting').textContent =
    h < 6  ? `🌙 ${name}，夜深了注意休息` :
    h < 12 ? `☀️ 早安，${name}！今天也加油` :
    h < 18 ? `🌤 午安，${name}！保持專注` : `🌆 晚安，${name}，辛苦了`;
}

// ─────────────────────────────────────────────
// 7. ENGLISH LEARNING
// ─────────────────────────────────────────────

// ── TTS (Web Speech API) ─────────────────────
const TTS = (() => {
  if (!('speechSynthesis' in window)) return null;
  let voice = null;

  function loadVoice() {
    const voices = window.speechSynthesis.getVoices();
    voice = voices.find(v => /en[-_]US/i.test(v.lang) && v.localService)
         || voices.find(v => /en[-_]US/i.test(v.lang))
         || voices.find(v => v.lang.startsWith('en'))
         || null;
  }
  loadVoice();
  window.speechSynthesis.onvoiceschanged = loadVoice;

  function speak(text, rate = 0.85) {
    window.speechSynthesis.cancel();
    const utt  = new SpeechSynthesisUtterance(text);
    utt.lang   = 'en-US';
    utt.rate   = rate;
    utt.pitch  = 1;
    if (voice) utt.voice = voice;

    // Visual feedback: icon spins while speaking
    const btn = el('speakWord');
    const ico = btn?.querySelector('i');
    if (ico) { ico.classList.add('fa-spin'); utt.onend = () => ico.classList.remove('fa-spin'); }

    window.speechSynthesis.speak(utt);
  }

  return { speak };
})();

function speakWord() {
  if (!TTS) return;
  TTS.speak(VOCAB[S.wordIdx].word, 0.8);
}

function speakDef() {
  if (!TTS) return;
  const def = el('fcDef').textContent || '';
  const ex  = (el('fcEx').textContent || '').replace(/^"|"$/g, '');
  TTS.speak(def + (ex ? '.  Example: ' + ex : ''), 0.9);
}

function updateAutoSpeakBtn() {
  const btn = el('autoSpeakToggle');
  if (!btn) return;
  const ico = btn.querySelector('i');
  if (S.autoSpeak) {
    ico.className = 'fas fa-volume-high';
    btn.style.color = 'var(--blue)';
    btn.title = '自動朗讀：開啟（點擊關閉）';
  } else {
    ico.className = 'fas fa-volume-slash';
    btn.style.color = '';
    btn.title = '自動朗讀：關閉（點擊開啟）';
  }
  // Hide TTS buttons when not supported
  if (!TTS) {
    ['speakWord','autoSpeakToggle','speakDef'].forEach(id => {
      const b = el(id); if (b) b.style.display = 'none';
    });
  }
}

function initEnglish() {
  const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  S.wordIdx = doy % VOCAB.length;
  renderWord(); fetchWordAPI();

  el('prevWord').addEventListener('click', () => stepWord(-1));
  el('nextWord').addEventListener('click', () => stepWord(+1));
  el('flipCard').addEventListener('click', toggleFlip);
  el('flashcard').addEventListener('click', e => {
    // Prevent flip when clicking speak button inside fc-back
    if (e.target.closest('#speakDef')) return;
    toggleFlip();
  });
  el('speakWord')?.addEventListener('click', e => { e.stopPropagation(); speakWord(); });
  el('speakDef')?.addEventListener('click',  e => { e.stopPropagation(); speakDef(); });
  el('autoSpeakToggle')?.addEventListener('click', () => {
    S.autoSpeak = !S.autoSpeak;
    updateAutoSpeakBtn();
    syncConfig('autoSpeak');
    if (S.autoSpeak) speakWord();
  });
  el('wordNotes').addEventListener('input', e => {
    S.wordNotes[VOCAB[S.wordIdx].word] = e.target.value;
    syncConfig('word_notes');
  });
  updateAutoSpeakBtn();
}

function stepWord(dir) {
  S.wordIdx = (S.wordIdx + dir + VOCAB.length) % VOCAB.length;
  S.flipped = false;
  el('flashcard').classList.remove('flipped');
  renderWord(); fetchWordAPI();
  syncConfig('word_idx');
  if (S.autoSpeak) speakWord();
}

function renderWord() {
  const v = VOCAB[S.wordIdx];
  el('fcWord').textContent     = v.word;
  el('fcPhonetic').textContent = v.phonetic;
  el('fcPos').textContent      = v.pos;
  el('fcDef').textContent      = v.definition;
  el('fcEx').textContent       = v.example ? `"${v.example}"` : '';
  el('wordIdx').textContent    = `${S.wordIdx + 1} / ${VOCAB.length}`;
  el('wordNotes').value        = S.wordNotes[v.word] || '';
}

async function fetchWordAPI() {
  const word = VOCAB[S.wordIdx].word;
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!res.ok) return;
    const data = await res.json();
    if (!Array.isArray(data) || !data[0]) return;
    const entry = data[0];
    const phn   = entry.phonetics?.find(p => p.text)?.text;
    if (phn) el('fcPhonetic').textContent = phn;
    const m = entry.meanings?.[0];
    if (m) {
      el('fcPos').textContent = m.partOfSpeech || VOCAB[S.wordIdx].pos;
      const d = m.definitions?.[0];
      if (d) {
        el('fcDef').textContent = d.definition;
        if (d.example) el('fcEx').textContent = `"${d.example}"`;
      }
    }
  } catch (_) {}
}

function toggleFlip() {
  S.flipped = !S.flipped;
  el('flashcard').classList.toggle('flipped', S.flipped);
  if (S.autoSpeak && S.flipped) speakDef();
}

// ─────────────────────────────────────────────
// 8. CALENDAR
// ─────────────────────────────────────────────
function initCalendar() {
  renderCalendar(); renderUpcoming();
  el('prevMonth').addEventListener('click', () => {
    S.calDate = new Date(S.calDate.getFullYear(), S.calDate.getMonth() - 1, 1);
    renderCalendar();
  });
  el('nextMonth').addEventListener('click', () => {
    S.calDate = new Date(S.calDate.getFullYear(), S.calDate.getMonth() + 1, 1);
    renderCalendar();
  });
  el('addEventBtn').addEventListener('click', () => openEvtModal());
}

function renderCalendar() {
  const yr = S.calDate.getFullYear(), mo = S.calDate.getMonth();
  el('monthLbl').textContent = `${yr}年${mo + 1}月`;
  const firstDow  = new Date(yr, mo, 1).getDay();
  const daysInMon = new Date(yr, mo + 1, 0).getDate();
  const todayStr  = fmtDateKey(new Date());
  const grid      = el('calDays');
  grid.innerHTML  = '';
  for (let i = 0; i < firstDow; i++) {
    const d = document.createElement('div'); d.className = 'cal-day empty'; grid.appendChild(d);
  }
  for (let day = 1; day <= daysInMon; day++) {
    const dateStr = fmtDateKey(new Date(yr, mo, day));
    const isToday = dateStr === todayStr;
    const evts    = S.events.filter(e => e.date === dateStr);
    const d       = document.createElement('div');
    d.className   = 'cal-day' + (isToday ? ' today' : '');
    d.innerHTML   = `<span class="day-num">${day}</span>` +
      (evts.length ? `<div class="day-dots">${evts.slice(0,3).map(e =>
        `<span class="day-dot" style="background:${e.color}"></span>`).join('')}</div>` : '');
    d.addEventListener('click', () => openEvtModal(dateStr));
    grid.appendChild(d);
  }
}

function renderUpcoming() {
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const soon = S.events
    .filter(e => new Date(e.date).getTime() >= todayMs)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);
  const list = el('upcomingList');
  if (!soon.length) { list.innerHTML = '<span class="empty">無近期事件</span>'; return; }
  list.innerHTML = soon.map(ev => `
    <div class="event-row">
      <div class="event-color-bar" style="background:${ev.color}"></div>
      <div class="event-info">
        <div class="event-title-txt">${esc(ev.title)}</div>
        <div class="event-date-txt">${fmtEvtDate(ev.date, ev.time)}</div>
      </div>
      <button class="ibtn danger" onclick="deleteEvt('${ev.id}')" title="刪除">
        <i class="fas fa-trash"></i>
      </button>
    </div>`).join('');
}

function openEvtModal(dateStr) {
  S.editEvtId = null;
  el('evtTitle').value = '';
  el('evtDate').value  = dateStr || fmtDateKey(new Date());
  el('evtTime').value  = '';
  el('evtNote').value  = '';
  el('evtColor').value = '#58a6ff';
  showModal('evtBackdrop');
}

function saveEvt() {
  const title = el('evtTitle').value.trim();
  const date  = el('evtDate').value;
  if (!title || !date) { alert('請填寫事件名稱與日期'); return; }
  const evt = { id: S.editEvtId || uid(), title, date, time: el('evtTime').value, note: el('evtNote').value, color: el('evtColor').value };
  if (S.editEvtId) {
    const idx = S.events.findIndex(e => e.id === S.editEvtId);
    if (idx !== -1) S.events[idx] = evt;
  } else {
    S.events.push(evt);
  }
  syncEvent(evt);
  hideModal('evtBackdrop');
  renderCalendar(); renderUpcoming();
}

function deleteEvt(id) {
  S.events = S.events.filter(e => e.id !== id);
  deleteEventDB(id);
  renderCalendar(); renderUpcoming();
}

// ─────────────────────────────────────────────
// 9. QUICK LINKS
// ─────────────────────────────────────────────
function initLinks() {
  renderLinks();
  el('addLinkBtn').addEventListener('click', openLnkModal);
  el('linkFilter').addEventListener('input', e => renderLinks(e.target.value));
}

function renderLinks(filter = '') {
  const q     = filter.toLowerCase();
  const items = q ? S.links.filter(l =>
    l.name.toLowerCase().includes(q) || (l.category || '').toLowerCase().includes(q)) : S.links;
  const cats  = {};
  items.forEach(l => { const c = l.category || '其他'; if (!cats[c]) cats[c] = []; cats[c].push(l); });
  const body  = el('linksBody');
  if (!Object.keys(cats).length) { body.innerHTML = '<div class="empty">無符合的連結</div>'; return; }
  body.innerHTML = Object.entries(cats).map(([cat, links]) => `
    <div>
      <div class="link-cat-name">${esc(cat)}</div>
      <div class="link-items">
        ${links.map(l => `
          <div class="link-item">
            <a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">
              <div class="link-icon"><i class="${esc(l.icon || 'fas fa-globe')}"></i></div>
              <span class="link-name">${esc(l.name)}</span>
            </a>
            <button class="link-del ibtn" onclick="deleteLink('${l.id}')" title="移除">
              <i class="fas fa-times"></i>
            </button>
          </div>`).join('')}
      </div>
    </div>`).join('');
}

function openLnkModal() {
  ['lnkName','lnkUrl','lnkCategory','lnkIcon'].forEach(id => el(id).value = '');
  showModal('lnkBackdrop');
}
function saveLnk() {
  const name = el('lnkName').value.trim(), url = el('lnkUrl').value.trim();
  if (!name || !url) { alert('請填寫名稱與 URL'); return; }
  S.links.push({ id: uid(), name, url, category: el('lnkCategory').value.trim() || '其他', icon: el('lnkIcon').value.trim() || 'fas fa-globe' });
  syncConfig('links');
  hideModal('lnkBackdrop'); renderLinks();
}
function deleteLink(id) {
  S.links = S.links.filter(l => l.id !== id);
  syncConfig('links'); renderLinks();
}

// ─────────────────────────────────────────────
// 10. NEWS
// ─────────────────────────────────────────────
function initNews() {
  renderKwBar(); fetchAllNews();
  el('newsSettingsBtn').addEventListener('click', openNewsModal);
  el('refreshNewsBtn').addEventListener('click', () => fetchAllNews(true));
}

function renderKwBar() {
  el('kwBar').innerHTML = S.keywords.map(k => `<span class="kw-tag">${esc(k)}</span>`).join('');
}

async function fetchAllNews(force = false) {
  const body = el('newsBody');
  body.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 載入中…</div>';
  const all = [];
  for (const feed of S.feeds) {
    try { all.push(...await fetchRSS(feed.url, feed.name, force)); } catch (_) {}
  }
  all.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  const filtered = S.keywords.length
    ? all.filter(a => S.keywords.some(k => (a.title + a.desc).toLowerCase().includes(k.toLowerCase())))
    : all;
  renderNews(filtered);
}

async function fetchRSS(url, source, force = false) {
  const key = 'rss_' + btoa(unescape(encodeURIComponent(url))).slice(0, 40);
  if (!force) {
    const c = lsGet(key);
    if (c && Date.now() - c.ts < CACHE_TTL) return c.data;
  }
  const res  = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&count=20`);
  const json = await res.json();
  if (json.status !== 'ok') throw new Error('rss');
  const data = json.items.map(i => ({
    title: i.title || '', desc: stripHTML(i.description || i.content || ''),
    link: i.link || '', pubDate: i.pubDate || '', thumb: i.thumbnail || '', source,
  }));
  lsSet(key, { data, ts: Date.now() });
  return data;
}

function renderNews(articles) {
  const body = el('newsBody');
  if (!articles.length) { body.innerHTML = '<div class="empty">無符合關鍵字的新聞，請調整設定</div>'; return; }
  body.innerHTML = articles.slice(0, 30).map(a => `
    <div class="news-item">
      ${a.thumb ? `<img src="${esc(a.thumb)}" class="news-thumb" loading="lazy" onerror="this.style.display='none'">` : ''}
      <div class="news-content">
        <div class="news-meta"><span class="news-source">${esc(a.source)}</span><span class="news-date">${relTime(a.pubDate)}</span></div>
        <a href="${esc(a.link)}" target="_blank" rel="noopener noreferrer" class="news-title">${esc(a.title)}</a>
        <div class="news-desc">${esc(a.desc.slice(0, 160))}…</div>
      </div>
    </div>`).join('');
}

function openNewsModal() { renderKwPreview(); renderFeedsList(); showModal('newsBackdrop'); }
function renderKwPreview() {
  el('kwPreview').innerHTML = S.keywords.map((k, i) => `
    <span class="kw-removable">${esc(k)}<button onclick="removeKw(${i})"><i class="fas fa-times"></i></button></span>`).join('');
}
function addKw() {
  const v = el('kwInput').value.trim();
  if (v && !S.keywords.includes(v)) { S.keywords.push(v); el('kwInput').value = ''; renderKwPreview(); }
}
function removeKw(i) { S.keywords.splice(i, 1); renderKwPreview(); }
function renderFeedsList() {
  el('feedsList').innerHTML = S.feeds.map((f, i) => `
    <div class="feed-row">
      <span class="feed-row-name">${esc(f.name)}</span>
      <span class="feed-row-url">${esc(f.url)}</span>
      <button class="ibtn danger" onclick="removeFeed(${i})"><i class="fas fa-trash"></i></button>
    </div>`).join('');
}
function addFeed() {
  const url = el('feedUrl').value.trim(), name = el('feedName').value.trim();
  if (url && name) { S.feeds.push({ url, name }); el('feedUrl').value = el('feedName').value = ''; renderFeedsList(); }
}
function removeFeed(i) { S.feeds.splice(i, 1); renderFeedsList(); }
function saveNewsSettings() {
  syncConfig('keywords'); syncConfig('feeds');
  renderKwBar(); hideModal('newsBackdrop'); fetchAllNews(true);
}

// ─────────────────────────────────────────────
// 11. PODCAST
// ─────────────────────────────────────────────
function initPodcast() {
  fetchAllPodcasts();
  el('addPodcastBtn').addEventListener('click', openPodModal);
  el('refreshPodcastBtn').addEventListener('click', () => fetchAllPodcasts(true));
}
async function fetchAllPodcasts(force = false) {
  el('podcastBody').innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 載入中…</div>';
  const results = await Promise.all(S.podcasts.map(async p => {
    try { return { ...p, episodes: (await fetchRSS(p.url, p.name, force)).slice(0, 4), error: false }; }
    catch (_) { return { ...p, episodes: [], error: true }; }
  }));
  renderPodcasts(results);
}
function renderPodcasts(list) {
  const body = el('podcastBody');
  if (!list.length) { body.innerHTML = '<div class="empty">尚未新增 Podcast</div>'; return; }
  body.innerHTML = list.map((p, pi) => `
    <div class="podcast-section">
      <div class="podcast-hd-row">
        <div class="podcast-name"><i class="fas fa-podcast"></i> ${esc(p.name)}</div>
        <button class="ibtn danger" onclick="deletePodcast(${pi})" title="移除"><i class="fas fa-trash"></i></button>
      </div>
      ${p.error ? '<div class="error-msg"><i class="fas fa-exclamation-circle"></i> 載入失敗，請確認 RSS URL</div>' : ''}
      ${p.episodes.map(ep => `
        <div class="episode-item">
          <div class="ep-meta"><span class="ep-date">${relTime(ep.pubDate)}</span></div>
          <a href="${esc(ep.link)}" target="_blank" rel="noopener noreferrer" class="ep-title">${esc(ep.title)}</a>
          <div class="ep-desc">${esc(ep.desc.slice(0, 130))}…</div>
        </div>`).join('')}
    </div>`).join('');
}
function openPodModal() { el('podName').value = el('podUrl').value = ''; showModal('podBackdrop'); }
function savePod() {
  const name = el('podName').value.trim(), url = el('podUrl').value.trim();
  if (!name || !url) { alert('請填寫名稱與 RSS URL'); return; }
  S.podcasts.push({ name, url }); syncConfig('podcasts');
  hideModal('podBackdrop'); fetchAllPodcasts();
}
function deletePodcast(i) { S.podcasts.splice(i, 1); syncConfig('podcasts'); fetchAllPodcasts(); }

// ─────────────────────────────────────────────
// 12. WORLD HISTORY  (Wikipedia On This Day)
// ─────────────────────────────────────────────
async function initWorldHistory() {
  const now = new Date();
  const label = `${now.getMonth() + 1}月${now.getDate()}日`;
  const badge = el('historyDateBadge');
  if (badge) badge.textContent = label;
  await fetchWorldHistory();
  el('refreshHistoryBtn')?.addEventListener('click', () => fetchWorldHistory(true));
}

async function fetchWorldHistory(force = false) {
  const body = el('worldHistoryBody');
  if (!body) return;
  body.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 載入中…</div>';
  const now = new Date();
  const mm  = String(now.getMonth() + 1).padStart(2, '0');
  const dd  = String(now.getDate()).padStart(2, '0');
  const ckey = `wiki_${mm}_${dd}`;
  if (!force) {
    const c = lsGet(ckey);
    if (c && Date.now() - c.ts < 24 * 3600 * 1000) { renderWorldHistory(c.data); return; }
  }
  // Try zh then en Wikipedia
  for (const lang of ['zh', 'en']) {
    try {
      const res  = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`);
      if (!res.ok) continue;
      const json = await res.json();
      const data = (json.events || []).slice(0, 8).map(e => ({
        year: e.year,
        text: e.text,
        link: e.pages?.[0]?.content_urls?.desktop?.page || '',
      }));
      if (data.length) { lsSet(ckey, { data, ts: Date.now() }); renderWorldHistory(data); return; }
    } catch (_) {}
  }
  body.innerHTML = '<div class="error-msg"><i class="fas fa-exclamation-circle"></i> 載入失敗，請重試</div>';
}

function renderWorldHistory(events) {
  const body = el('worldHistoryBody');
  if (!events?.length) { body.innerHTML = '<div class="empty">無歷史資料</div>'; return; }
  const sorted = [...events].sort((a, b) => b.year - a.year);
  body.innerHTML = sorted.map(e => `
    <div class="history-item">
      <div class="history-year">${e.year}</div>
      <div class="history-content">
        <div class="history-text">${esc(e.text)}</div>
        ${e.link ? `<a href="${esc(e.link)}" target="_blank" rel="noopener" class="history-link">詳細 →</a>` : ''}
      </div>
    </div>`).join('');
}

// ─────────────────────────────────────────────
// 13. PERSONAL HISTORY  (艾倫歷史上的今天)
// ─────────────────────────────────────────────
function initPersonalHistory() {
  const now   = new Date();
  const label = `${now.getMonth() + 1}月${now.getDate()}日`;
  const badge = el('phDateBadge');
  if (badge) badge.textContent = label;
  renderPersonalHistory();
  el('addPersonalHistoryBtn')?.addEventListener('click', openPHModal);
}

function renderPersonalHistory() {
  const body  = el('personalHistoryBody');
  if (!body) return;
  const items = [...S.personalHistory].sort((a, b) => b.year - a.year);
  if (!items.length) {
    const now = new Date();
    body.innerHTML = `<div class="empty">${now.getMonth()+1}月${now.getDate()}日<br>暫無個人記事<br><small>點擊右上角 + 新增屬於你的歷史</small></div>`;
    return;
  }
  body.innerHTML = items.map(item => `
    <div class="ph-item">
      <div class="ph-year">${item.year}</div>
      <div class="ph-content">
        <div class="ph-title">${esc(item.title)}</div>
        ${item.description ? `<div class="ph-desc">${esc(item.description)}</div>` : ''}
      </div>
      <button class="ibtn danger" onclick="deletePH('${item.id}')" title="刪除">
        <i class="fas fa-trash"></i>
      </button>
    </div>`).join('');
}

function openPHModal() {
  el('phYear').value  = new Date().getFullYear() - 1;
  el('phTitle').value = '';
  el('phDesc').value  = '';
  showModal('phBackdrop');
}

function savePH() {
  const year  = parseInt(el('phYear').value);
  const title = el('phTitle').value.trim();
  if (!year || !title) { alert('請填寫年份與標題'); return; }
  const now  = new Date();
  const item = { id: uid(), title, description: el('phDesc').value.trim(), year, month: now.getMonth() + 1, day: now.getDate() };
  S.personalHistory.push(item);
  syncPH(item);
  hideModal('phBackdrop');
  renderPersonalHistory();
}

function deletePH(id) {
  S.personalHistory = S.personalHistory.filter(h => h.id !== id);
  deletePHDB(id);
  renderPersonalHistory();
}

// ─────────────────────────────────────────────
// 14. UTILITIES
// ─────────────────────────────────────────────
const el  = id => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function stripHTML(html) { const t = document.createElement('div'); t.innerHTML = html; return t.textContent || ''; }
function fmtDateKey(d)   { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function fmtEvtDate(dateStr, timeStr) {
  const d = new Date(dateStr + 'T00:00:00');
  let s = d.toLocaleDateString('zh-TW', { month:'long', day:'numeric', weekday:'short' });
  if (timeStr) s += ' ' + timeStr;
  return s;
}
function relTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1)   return '剛才';
  if (h < 24)  return `${h} 小時前`;
  if (h < 168) return `${Math.floor(h/24)} 天前`;
  return new Date(dateStr).toLocaleDateString('zh-TW', { month:'short', day:'numeric' });
}

// ─────────────────────────────────────────────
// 15. MODAL CONTROL
// ─────────────────────────────────────────────
function showModal(id) { el(id).style.display = 'flex'; }
function hideModal(id) { el(id).style.display = 'none'; }

function setupModals() {
  const wire = (saveId, cancelId, closeId, backdropId, saveFn) => {
    el(saveId)?.addEventListener('click', saveFn);
    el(cancelId)?.addEventListener('click', () => hideModal(backdropId));
    el(closeId)?.addEventListener('click',  () => hideModal(backdropId));
    el(backdropId)?.addEventListener('click', e => { if (e.target === e.currentTarget) hideModal(backdropId); });
  };
  wire('saveEvtBtn',      'cancelEvtModal',      'closeEvtModal',      'evtBackdrop',      saveEvt);
  wire('saveLnkBtn',      'cancelLnkModal',      'closeLnkModal',      'lnkBackdrop',      saveLnk);
  wire('saveNewsBtn',     'cancelNewsModal',     'closeNewsModal',     'newsBackdrop',     saveNewsSettings);
  wire('savePodBtn',      'cancelPodModal',      'closePodModal',      'podBackdrop',      savePod);
  wire('savePHBtn',       'cancelPHModal',       'closePHModal',       'phBackdrop',       savePH);
  wire('saveSettingsBtn', 'cancelSettingsModal', 'closeSettingsModal', 'settingsBackdrop', saveSettings);

  el('settingsBtn')?.addEventListener('click', openSettings);
  el('addKwBtn')?.addEventListener('click', addKw);
  el('kwInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') addKw(); });
  el('addFeedBtn')?.addEventListener('click', addFeed);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape')
      ['evtBackdrop','lnkBackdrop','newsBackdrop','podBackdrop','phBackdrop','settingsBackdrop'].forEach(hideModal);
  });
}

// ─────────────────────────────────────────────
// 16. PASSPHRASE UNLOCK
// ─────────────────────────────────────────────
function requestPassphrase() {
  return new Promise(resolve => {
    const backdrop = document.getElementById('passphraseBackdrop');
    const input    = document.getElementById('passphraseInput');
    const btn      = document.getElementById('passphraseUnlockBtn');
    const errEl    = document.getElementById('passphraseErr');
    if (backdrop) backdrop.style.display = 'flex';

    async function attempt() {
      const pass = input ? input.value : '';
      if (!pass) { if (errEl) errEl.textContent = '請輸入密碼短語'; return; }
      if (errEl) errEl.textContent = '驗證中…';
      if (btn) btn.disabled = true;
      try {
        const key = await AW_CRYPTO.deriveKey(pass, APPWRITE_SALT);
        // Verify passphrase by attempting to decrypt the config cipher
        await AW_CRYPTO.decrypt(APPWRITE_CIPHER, key);
        if (backdrop) backdrop.style.display = 'none';
        resolve(key);
      } catch (_) {
        if (errEl) errEl.textContent = '密碼短語錯誤，請重試';
        if (input) input.value = '';
        if (btn) btn.disabled = false;
        if (input) input.focus();
      }
    }

    if (btn)   btn.addEventListener('click', attempt);
    if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });
    if (input) input.focus();
  });
}

// ─────────────────────────────────────────────
// 17. SETTINGS
// ─────────────────────────────────────────────
function openSettings() {
  const inp = el('settingsOwnerName');
  if (inp) inp.value = S.ownerName || 'Allen';
  showModal('settingsBackdrop');
}

function saveSettings() {
  const name = (el('settingsOwnerName').value || '').trim();
  if (!name) { alert('請輸入名稱'); return; }
  S.ownerName = name;
  applyOwnerName();
  syncConfig('ownerName');
  hideModal('settingsBackdrop');
}

// ─────────────────────────────────────────────
// 18. WEATHER  (Open-Meteo — no API key)
// ─────────────────────────────────────────────
const WMO_ICON = {
  0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️',
  45:'🌫️', 48:'🌫️',
  51:'🌦️', 53:'🌦️', 55:'🌧️',
  61:'🌧️', 63:'🌧️', 65:'🌧️',
  71:'❄️', 73:'❄️', 75:'❄️', 77:'❄️',
  80:'🌦️', 81:'🌦️', 82:'🌧️',
  85:'🌨️', 86:'🌨️',
  95:'⛈️', 96:'⛈️', 99:'⛈️',
};
const WMO_DESC = {
  0:'晴天', 1:'大致晴朗', 2:'局部多雲', 3:'陰天',
  45:'霧', 48:'霧',
  51:'毛毛雨', 53:'毛毛雨', 55:'毛毛雨',
  61:'小雨', 63:'中雨', 65:'大雨',
  71:'小雪', 73:'中雪', 75:'大雪', 77:'雪粒',
  80:'陣雨', 81:'陣雨', 82:'強陣雨',
  85:'陣雪', 86:'強陣雪',
  95:'雷陣雨', 96:'雷陣雨夾冰雹', 99:'雷陣雨夾冰雹',
};

const WEEK_DAYS_ZH = ['日', '一', '二', '三', '四', '五', '六'];

function wmoIcon(code) {
  return WMO_ICON[code] || '🌡️';
}

async function initWeather() {
  const body = el('weatherBody');
  if (!body) return;

  if (!navigator.geolocation) {
    body.innerHTML = '<div class="weather-error"><i class="fas fa-triangle-exclamation"></i> 瀏覽器不支援定位</div>';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => fetchWeather(pos.coords.latitude, pos.coords.longitude),
    _err => {
      body.innerHTML = '<div class="weather-error"><i class="fas fa-triangle-exclamation"></i> 無法取得位置，請允許定位權限</div>';
    },
    { timeout: 10000 }
  );
}

async function fetchWeather(lat, lon) {
  const body = el('weatherBody');
  try {
    // Reverse-geocode city name
    const geoRes  = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=zh-TW`,
      { headers: { 'Accept-Language': 'zh-TW,zh;q=0.9' } }
    );
    const geoJson = await geoRes.json();
    const city =
      geoJson.address?.city ||
      geoJson.address?.town ||
      geoJson.address?.village ||
      geoJson.address?.county ||
      geoJson.address?.state ||
      '目前城市';
    const cityEl = el('weatherCity');
    if (cityEl) cityEl.textContent = city + ' 一週天氣';

    // Fetch 7-day forecast
    const wRes  = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&timezone=auto&forecast_days=7`
    );
    const wJson = await wRes.json();
    const { time, weathercode, temperature_2m_max, temperature_2m_min, precipitation_probability_max } = wJson.daily;

    const todayStr = new Date().toISOString().slice(0, 10);
    const days = time.map((dateStr, i) => {
      const d     = new Date(dateStr + 'T12:00:00');
      const isToday = dateStr === todayStr;
      const name  = isToday ? '今天' : `週${WEEK_DAYS_ZH[d.getDay()]}`;
      const icon  = wmoIcon(weathercode[i]);
      const hi    = Math.round(temperature_2m_max[i]);
      const lo    = Math.round(temperature_2m_min[i]);
      const rain  = precipitation_probability_max[i];
      return { name, icon, hi, lo, rain, isToday };
    });

    body.innerHTML = `<div class="weather-days">${
      days.map(d => `
        <div class="weather-day${d.isToday ? ' today' : ''}">
          <div class="wd-name">${esc(d.name)}</div>
          <div class="wd-icon">${d.icon}</div>
          <div class="wd-hi">${d.hi}°</div>
          <div class="wd-lo">${d.lo}°</div>
          ${d.rain > 0 ? `<div class="wd-rain">💧${d.rain}%</div>` : ''}
        </div>`
      ).join('')
    }</div>`;
  } catch (e) {
    if (body) body.innerHTML = '<div class="weather-error"><i class="fas fa-triangle-exclamation"></i> 天氣資料載入失敗，請稍後再試</div>';
  }
}

// ─────────────────────────────────────────────
// 19. DAILY QUOTE
// ─────────────────────────────────────────────
const QUOTES = [
  { text: '成功是努力、勇氣，以及失敗後一次次重新站起來的結果。', author: '溫斯頓·邱吉爾' },
  { text: '你的時間有限，所以不要浪費時間活在別人的生命裡。', author: '賈伯斯' },
  { text: '不要等到完美，開始行動，邊做邊調整。', author: '里德·霍夫曼' },
  { text: '學而不思則罔，思而不學則殆。', author: '孔子' },
  { text: '天下難事，必作於易；天下大事，必作於細。', author: '老子' },
  { text: '路漫漫其修遠兮，吾將上下而求索。', author: '屈原' },
  { text: '每一個不曾起舞的日子，都是對生命的辜負。', author: '尼采' },
  { text: '生命不在於活得長久，而在於活得充實。', author: '梭羅' },
  { text: '你必須成為你希望在這個世界上看到的改變。', author: '甘地' },
  { text: '人可以被摧毀，但不能被打敗。', author: '海明威' },
  { text: '在你放棄之前，想想你為什麼堅持到現在。', author: '佚名' },
  { text: '夢想是翅膀，行動是起飛的跑道。', author: '佚名' },
  { text: '勇氣並不是沒有恐懼，而是判斷其他事物比恐懼更重要。', author: '安柏羅斯·雷德蒙' },
  { text: '機會不是等來的，而是創造出來的。', author: '克里斯·格羅塞克' },
  { text: '堅持做你認為正確的事，即使沒有人看見。', author: '佚名' },
  { text: '知識是唯一在分享時會增長的資源。', author: '路易斯·艾倫' },
  { text: '一個人能走多遠，取決於他的夢想有多大。', author: '佚名' },
  { text: '細節決定成敗，態度決定一切。', author: '汪中求' },
  { text: '昨日種種，皆成今我。', author: '佚名' },
  { text: '你不需要看到全部的階梯，只需要踏出第一步。', author: '馬丁·路德·金恩' },
  { text: '卓越不是行為，而是習慣。', author: '亞里斯多德' },
  { text: '成大事者，不拘小節，但不忽視細節。', author: '佚名' },
  { text: '讀萬卷書，行萬里路。', author: '劉彝' },
  { text: '只有走出舒適圈，才能真正成長。', author: '佚名' },
  { text: '智慧不是知識的積累，而是對事物本質的洞察。', author: '蘇格拉底' },
  { text: '設定目標是看不見未來的第一步。', author: '托尼·羅賓斯' },
  { text: '把每一天都當作學習的機會，你將永不停止成長。', author: '佚名' },
  { text: '最好的投資，是投資自己。', author: '沃倫·巴菲特' },
  { text: '生命中最重要的事，不是你在哪裡，而是你往哪裡走。', author: '奧利佛·溫德爾·霍姆斯' },
  { text: '與其等待完美時機，不如把握現在並讓它成為完美。', author: '佚名' },
];

let quoteIdx = null;

function initQuote() {
  const body = el('quoteBody');
  if (!body) return;
  // Seed with day-of-year so same quote shows all day, rotates daily
  const now = new Date();
  const doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  quoteIdx = doy % QUOTES.length;
  renderQuote();

  el('nextQuoteBtn')?.addEventListener('click', () => {
    quoteIdx = (quoteIdx + 1) % QUOTES.length;
    renderQuote();
  });
}

function renderQuote() {
  const body = el('quoteBody');
  if (!body) return;
  const q = QUOTES[quoteIdx];
  body.innerHTML = `
    <div class="quote-text">${esc(q.text)}</div>
    <div class="quote-author">— ${esc(q.author)}</div>
  `;
}

// ─────────────────────────────────────────────
// 20. INIT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Encrypted config: show passphrase modal before anything else
  if (typeof APPWRITE_CIPHER !== 'undefined' &&
      typeof APPWRITE_SALT   !== 'undefined' &&
      typeof AW_CRYPTO       !== 'undefined') {
    sessionKey = await requestPassphrase();
  }

  setDBStatus('pending');
  const ready = await initAppwrite();
  if (ready) {
    await loadFromDB();
    setDBStatus('connected');
  } else {
    loadLocal();
    setDBStatus('disconnected');
    showDBBanner();
  }
  applyOwnerName();
  initClock();
  initWeather();
  initQuote();
  el('refreshWeatherBtn')?.addEventListener('click', () => {
    const body = el('weatherBody');
    if (body) body.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 取得位置中…</div>';
    const cityEl = el('weatherCity');
    if (cityEl) cityEl.textContent = '一週天氣';
    initWeather();
  });
  initCalendar();
  initEnglish();
  initLinks();
  initNews();
  initPodcast();
  await initWorldHistory();
  initPersonalHistory();
  setupModals();
});
