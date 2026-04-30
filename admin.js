'use strict';

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
const LS_KEY = 'allen_dash';
let AD = {
  ownerName: 'Allen',
  links:     [],
  events:    [],
  keywords:  [],
  feeds:     [],
  podcasts:  [],
  wordNotes: {},
};
let vocab = [];            // working copy of vocabulary
let awDb       = null;
let sessionKey = null;
let AW_PROJECT_ID = '', AW_DB_ID = '', AW_COL_CONFIG = '', AW_COL_EVENTS = '', AW_COL_HISTORY = '';
const configDocIds = {};
let modalSaveFn = null;    // current modal save callback

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────
const el  = id => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function lsGet(key) { try { return JSON.parse(localStorage.getItem(key)); } catch(_) { return null; } }
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch(_) {} }

function showToast(msg, type = 'ok') {
  const t = el('toast');
  t.textContent = msg;
  t.className = 'show ' + type;
  clearTimeout(t._tid);
  t._tid = setTimeout(() => { t.className = ''; }, 2400);
}

function setSyncStatus(text, cls = '') {
  const s = el('syncStatus');
  if (!s) return;
  s.textContent = text;
  s.className = cls;
}

// ─────────────────────────────────────────────
// APPWRITE LAYER  (mirrors app.js, stripped down)
// ─────────────────────────────────────────────
async function initAdminAppwrite() {
  try {
    if (typeof window.Appwrite === 'undefined') return false;
    if (typeof APPWRITE_CIPHER !== 'undefined' &&
        typeof APPWRITE_SALT   !== 'undefined' && sessionKey) {
      const json = await AW_CRYPTO.decrypt(APPWRITE_CIPHER, sessionKey);
      const cfg  = JSON.parse(json);
      AW_PROJECT_ID  = cfg.projectId;
      AW_DB_ID       = cfg.dbId;
      AW_COL_CONFIG  = cfg.colConfig;
      AW_COL_EVENTS  = cfg.colEvents;
      AW_COL_HISTORY = cfg.colHistory;
    } else if (typeof APPWRITE_PROJECT_ID !== 'undefined' &&
               !APPWRITE_PROJECT_ID.includes('YOUR_')) {
      AW_PROJECT_ID  = APPWRITE_PROJECT_ID;
      AW_DB_ID       = APPWRITE_DB_ID;
      AW_COL_CONFIG  = APPWRITE_COL_CONFIG;
      AW_COL_EVENTS  = APPWRITE_COL_EVENTS;
      AW_COL_HISTORY = APPWRITE_COL_HISTORY;
    } else {
      return false;
    }
    const { Client, Databases } = window.Appwrite;
    const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(AW_PROJECT_ID);
    awDb = new Databases(client);
    await awDb.listDocuments(AW_DB_ID, AW_COL_CONFIG, []);
    return true;
  } catch (_) { awDb = null; return false; }
}

async function maybeEncrypt(text) {
  if (!sessionKey || text == null) return text ?? '';
  return AW_CRYPTO.encrypt(String(text), sessionKey);
}
async function maybeDecrypt(text) {
  if (!sessionKey || !text) return text || '';
  try { return await AW_CRYPTO.decrypt(text, sessionKey); }
  catch (_) { return text; }
}

async function loadFromAppwrite() {
  if (!awDb) return;
  try {
    const { Query } = window.Appwrite;
    const [r1, r2] = await Promise.all([
      awDb.listDocuments(AW_DB_ID, AW_COL_EVENTS, [Query.orderAsc('date'), Query.limit(500)]),
      awDb.listDocuments(AW_DB_ID, AW_COL_CONFIG, [Query.limit(20)]),
    ]);
    AD.events = await Promise.all(r1.documents.map(async d => ({
      id: d.$id, title: await maybeDecrypt(d.title), date: d.date,
      time: d.time || '', note: await maybeDecrypt(d.note || ''), color: d.color || '#58a6ff',
    })));
    const OK = new Set(['ownerName','autoSpeak','word_idx','links','keywords','feeds','podcasts','word_notes']);
    for (const d of r2.documents) {
      configDocIds[d.key] = d.$id;
      if (OK.has(d.key)) {
        try { AD[d.key] = JSON.parse(await maybeDecrypt(d.value)); } catch (_) {}
      }
    }
  } catch (e) { console.error('admin loadFromAppwrite:', e); }
}

async function syncConfigKey(key) {
  if (!awDb) { persistLocal(); return; }
  try {
    const { ID, Query } = window.Appwrite;
    const valueStr = await maybeEncrypt(JSON.stringify(AD[key]));
    if (configDocIds[key]) {
      await awDb.updateDocument(AW_DB_ID, AW_COL_CONFIG, configDocIds[key], { value: valueStr });
    } else {
      const res = await awDb.listDocuments(AW_DB_ID, AW_COL_CONFIG,
        [Query.equal('key', key), Query.limit(1)]);
      if (res.documents.length > 0) {
        configDocIds[key] = res.documents[0].$id;
        await awDb.updateDocument(AW_DB_ID, AW_COL_CONFIG, configDocIds[key], { value: valueStr });
      } else {
        const doc = await awDb.createDocument(AW_DB_ID, AW_COL_CONFIG, ID.unique(), { key, value: valueStr });
        configDocIds[key] = doc.$id;
      }
    }
  } catch (e) { console.error('syncConfigKey', key, e); persistLocal(); }
}

async function syncEvent(evt) {
  if (!awDb) { persistLocal(); return; }
  try {
    const { ID } = window.Appwrite;
    const payload = {
      title: await maybeEncrypt(evt.title), date: evt.date,
      time: evt.time, note: await maybeEncrypt(evt.note || ''), color: evt.color,
    };
    try {
      await awDb.updateDocument(AW_DB_ID, AW_COL_EVENTS, evt.id, payload);
    } catch (e) {
      if (e.code === 404) await awDb.createDocument(AW_DB_ID, AW_COL_EVENTS, evt.id || ID.unique(), payload);
      else throw e;
    }
  } catch (e) { console.error('syncEvent', e); }
}

async function deleteEventDB(id) {
  if (!awDb) return;
  try { await awDb.deleteDocument(AW_DB_ID, AW_COL_EVENTS, id); }
  catch (e) { console.error('deleteEventDB', e); }
}

// ─────────────────────────────────────────────
// LOCAL STORAGE
// ─────────────────────────────────────────────
function persistLocal() {
  const { ownerName, links, events, keywords, feeds, podcasts, wordNotes } = AD;
  lsSet(LS_KEY, { ownerName, links, events, keywords, feeds, podcasts, wordNotes });
}

function loadLocal() {
  const raw = lsGet(LS_KEY);
  if (raw) {
    if (raw.links)     AD.links     = raw.links;
    if (raw.events)    AD.events    = raw.events;
    if (raw.keywords)  AD.keywords  = raw.keywords;
    if (raw.feeds)     AD.feeds     = raw.feeds;
    if (raw.podcasts)  AD.podcasts  = raw.podcasts;
    if (raw.wordNotes) AD.wordNotes = raw.wordNotes;
    if (raw.ownerName) AD.ownerName = raw.ownerName;
  }
  // Vocabulary: custom or default
  vocab = lsGet('allen_vocab') || VOCAB_DEFAULT.map(v => ({ ...v }));
}

function persistVocab() {
  lsSet('allen_vocab', vocab);
}

// ─────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      el('panel-' + btn.dataset.tab).classList.add('active');
    });
  });
}

// ─────────────────────────────────────────────
// MODAL HELPERS
// ─────────────────────────────────────────────
function openModal(title, bodyHtml, saveFn) {
  el('modalTitle').textContent = title;
  el('modalBody').innerHTML = bodyHtml;
  modalSaveFn = saveFn;
  el('editModal').style.display = 'flex';
  // Focus first input
  setTimeout(() => el('editModal').querySelector('input,textarea')?.focus(), 60);
}
function closeModal() {
  el('editModal').style.display = 'none';
  modalSaveFn = null;
}
function modalSave() { if (modalSaveFn) modalSaveFn(); }

// Close modal on backdrop click / Escape
document.addEventListener('DOMContentLoaded', () => {
  el('editModal')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
});

// ─────────────────────────────────────────────
// 1. LINKS
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

function renderLinks() {
  const q    = (el('linkSearch')?.value || '').toLowerCase();
  const data = AD.links.filter(l =>
    !q || l.name.toLowerCase().includes(q) || (l.category || '').toLowerCase().includes(q)
  );
  el('linksCount').textContent = `共 ${AD.links.length} 筆`;
  el('linksBody').innerHTML = data.length ? data.map(l => `
    <tr>
      <td><i class="${esc(l.icon || 'fas fa-link')}" style="color:var(--blue)"></i></td>
      <td><span class="cell-truncate" style="max-width:160px">${esc(l.name)}</span></td>
      <td>${l.category ? `<span class="cat-chip">${esc(l.category)}</span>` : '<span style="color:var(--muted)">—</span>'}</td>
      <td><a href="${esc(l.url)}" target="_blank" class="cell-url cell-truncate" style="display:block;max-width:220px;color:var(--blue)">${esc(l.url)}</a></td>
      <td><div class="cell-actions">
        <button class="ibtn btn-sm" title="編輯" onclick="openLinkModal('${esc(l.id)}')"><i class="fas fa-pen"></i></button>
        <button class="ibtn btn-sm danger" title="刪除" onclick="deleteLink('${esc(l.id)}')"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="5"><div class="empty-state"><i class="fas fa-bookmark"></i>尚無連結</div></td></tr>';
}

function openLinkModal(id) {
  const lnk = id ? AD.links.find(l => l.id === id) : null;
  const title = lnk ? '編輯連結' : '新增連結';
  const body = `
    <label class="flabel">名稱 *</label>
    <input class="finput" id="mLinkName" value="${esc(lnk?.name || '')}" placeholder="連結名稱" />
    <label class="flabel">URL *</label>
    <input class="finput" id="mLinkUrl" value="${esc(lnk?.url || '')}" placeholder="https://…" />
    <label class="flabel">分類</label>
    <input class="finput" id="mLinkCat" value="${esc(lnk?.category || '')}" placeholder="如：工作、學習" />
    <label class="flabel">Font Awesome 圖示 class</label>
    <input class="finput" id="mLinkIcon" value="${esc(lnk?.icon || '')}" placeholder="fab fa-github" />
  `;
  openModal(title, body, () => {
    const name = el('mLinkName').value.trim();
    const url  = el('mLinkUrl').value.trim();
    if (!name || !url) { showToast('名稱與 URL 為必填', 'err'); return; }
    if (lnk) {
      Object.assign(lnk, { name, url, category: el('mLinkCat').value.trim(), icon: el('mLinkIcon').value.trim() });
    } else {
      AD.links.push({ id: uid(), name, url, category: el('mLinkCat').value.trim(), icon: el('mLinkIcon').value.trim() || 'fas fa-link' });
    }
    syncConfigKey('links');
    persistLocal();
    renderLinks();
    closeModal();
    showToast(lnk ? '連結已更新' : '連結已新增');
  });
}

function deleteLink(id) {
  if (!confirm('確定要刪除這個連結？')) return;
  AD.links = AD.links.filter(l => l.id !== id);
  syncConfigKey('links');
  persistLocal();
  renderLinks();
  showToast('連結已刪除');
}

// ─────────────────────────────────────────────
// 2. CALENDAR EVENTS
// ─────────────────────────────────────────────
function renderEvents() {
  const q    = (el('evtSearch')?.value || '').toLowerCase();
  const data = AD.events
    .filter(e => !q || e.title.toLowerCase().includes(q))
    .sort((a, b) => a.date.localeCompare(b.date));
  el('eventsCount').textContent = `共 ${AD.events.length} 筆`;
  el('eventsBody').innerHTML = data.length ? data.map(e => `
    <tr>
      <td><span class="color-dot" style="background:${esc(e.color || '#58a6ff')}"></span></td>
      <td><span class="cell-truncate" style="max-width:180px">${esc(e.title)}</span></td>
      <td style="white-space:nowrap">${esc(e.date)}</td>
      <td>${esc(e.time || '—')}</td>
      <td><span class="cell-truncate cell-url" style="max-width:180px">${esc(e.note || '—')}</span></td>
      <td><div class="cell-actions">
        <button class="ibtn btn-sm" title="編輯" onclick="openEventModal('${esc(e.id)}')"><i class="fas fa-pen"></i></button>
        <button class="ibtn btn-sm danger" title="刪除" onclick="deleteEvent('${esc(e.id)}')"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-calendar-alt"></i>尚無事件</div></td></tr>';
}

function openEventModal(id) {
  const evt   = id ? AD.events.find(e => e.id === id) : null;
  const title = evt ? '編輯事件' : '新增事件';
  const body = `
    <label class="flabel">標題 *</label>
    <input class="finput" id="mEvtTitle" value="${esc(evt?.title || '')}" placeholder="事件名稱" />
    <label class="flabel">日期 *</label>
    <input class="finput" id="mEvtDate" type="date" value="${esc(evt?.date || '')}" />
    <label class="flabel">時間</label>
    <input class="finput" id="mEvtTime" type="time" value="${esc(evt?.time || '')}" />
    <label class="flabel">顏色</label>
    <select class="fselect" id="mEvtColor">
      ${[['#58a6ff','🔵 藍色'],['#3fb950','🟢 綠色'],['#f85149','🔴 紅色'],['#bc8cff','🟣 紫色'],['#d29922','🟠 橘色']]
        .map(([v,t]) => `<option value="${v}" ${(evt?.color||'#58a6ff')===v?'selected':''}>${t}</option>`).join('')}
    </select>
    <label class="flabel">備註</label>
    <textarea class="ftextarea" id="mEvtNote">${esc(evt?.note || '')}</textarea>
  `;
  openModal(title, body, async () => {
    const evtTitle = el('mEvtTitle').value.trim();
    const evtDate  = el('mEvtDate').value;
    if (!evtTitle || !evtDate) { showToast('標題與日期為必填', 'err'); return; }
    const obj = {
      id:    evt?.id || uid(),
      title: evtTitle, date: evtDate,
      time:  el('mEvtTime').value,
      note:  el('mEvtNote').value.trim(),
      color: el('mEvtColor').value,
    };
    if (evt) Object.assign(evt, obj);
    else AD.events.push(obj);
    await syncEvent(obj);
    persistLocal();
    renderEvents();
    closeModal();
    showToast(evt ? '事件已更新' : '事件已新增');
  });
}

async function deleteEvent(id) {
  if (!confirm('確定要刪除這個事件？')) return;
  AD.events = AD.events.filter(e => e.id !== id);
  await deleteEventDB(id);
  persistLocal();
  renderEvents();
  showToast('事件已刪除');
}

// ─────────────────────────────────────────────
// 3. NEWS — KEYWORDS
// ─────────────────────────────────────────────
function renderKeywords() {
  el('kwChips').innerHTML = AD.keywords.length
    ? AD.keywords.map(kw => `
        <span class="kw-chip">
          ${esc(kw)}
          <button onclick="deleteKeyword('${esc(kw)}')" title="移除"><i class="fas fa-times"></i></button>
        </span>`).join('')
    : '<span style="color:var(--muted);font-size:12px">尚無關鍵字</span>';
}

function addKeyword() {
  const inp = el('kwInput');
  const kw  = (inp?.value || '').trim();
  if (!kw) return;
  if (AD.keywords.includes(kw)) { showToast('關鍵字已存在', 'err'); return; }
  AD.keywords.push(kw);
  if (inp) inp.value = '';
  syncConfigKey('keywords');
  persistLocal();
  renderKeywords();
  showToast('關鍵字已新增');
}

function deleteKeyword(kw) {
  AD.keywords = AD.keywords.filter(k => k !== kw);
  syncConfigKey('keywords');
  persistLocal();
  renderKeywords();
  showToast('關鍵字已移除');
}

// ─────────────────────────────────────────────
// 4. NEWS — RSS FEEDS
// ─────────────────────────────────────────────
function renderFeeds() {
  el('feedsBody').innerHTML = AD.feeds.length ? AD.feeds.map((f, i) => `
    <tr>
      <td>${esc(f.name)}</td>
      <td><a href="${esc(f.url)}" target="_blank" class="cell-url cell-truncate" style="display:block;max-width:320px;color:var(--blue)">${esc(f.url)}</a></td>
      <td><div class="cell-actions">
        <button class="ibtn btn-sm danger" title="刪除" onclick="deleteFeed(${i})"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="3"><div class="empty-state"><i class="fas fa-rss"></i>尚無 RSS 來源</div></td></tr>';
}

function openFeedModal() {
  const body = `
    <label class="flabel">來源名稱 *</label>
    <input class="finput" id="mFeedName" placeholder="如：BBC World" />
    <label class="flabel">RSS URL *</label>
    <input class="finput" id="mFeedUrl" placeholder="https://feeds.example.com/rss.xml" />
  `;
  openModal('新增 RSS 來源', body, () => {
    const name = el('mFeedName').value.trim();
    const url  = el('mFeedUrl').value.trim();
    if (!name || !url) { showToast('名稱與 URL 為必填', 'err'); return; }
    AD.feeds.push({ name, url });
    syncConfigKey('feeds');
    persistLocal();
    renderFeeds();
    closeModal();
    showToast('RSS 來源已新增');
  });
}

function deleteFeed(idx) {
  if (!confirm('確定要刪除此 RSS 來源？')) return;
  AD.feeds.splice(idx, 1);
  syncConfigKey('feeds');
  persistLocal();
  renderFeeds();
  showToast('RSS 來源已刪除');
}

// ─────────────────────────────────────────────
// 5. PODCAST
// ─────────────────────────────────────────────
function renderPodcasts() {
  el('podcastCount').textContent = `共 ${AD.podcasts.length} 筆`;
  el('podcastBody').innerHTML = AD.podcasts.length ? AD.podcasts.map((p, i) => `
    <tr>
      <td>${esc(p.name)}</td>
      <td><a href="${esc(p.url)}" target="_blank" class="cell-url cell-truncate" style="display:block;max-width:340px;color:var(--blue)">${esc(p.url)}</a></td>
      <td><div class="cell-actions">
        <button class="ibtn btn-sm danger" title="刪除" onclick="deletePodcast(${i})"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="3"><div class="empty-state"><i class="fas fa-headphones"></i>尚無 Podcast</div></td></tr>';
}

function openPodcastModal() {
  const body = `
    <label class="flabel">Podcast 名稱 *</label>
    <input class="finput" id="mPodName" placeholder="如：TED Talks Daily" />
    <label class="flabel">RSS URL *</label>
    <input class="finput" id="mPodUrl" placeholder="https://feeds.example.com/podcast.xml" />
  `;
  openModal('新增 Podcast', body, () => {
    const name = el('mPodName').value.trim();
    const url  = el('mPodUrl').value.trim();
    if (!name || !url) { showToast('名稱與 URL 為必填', 'err'); return; }
    AD.podcasts.push({ name, url });
    syncConfigKey('podcasts');
    persistLocal();
    renderPodcasts();
    closeModal();
    showToast('Podcast 已新增');
  });
}

function deletePodcast(idx) {
  if (!confirm('確定要刪除此 Podcast？')) return;
  AD.podcasts.splice(idx, 1);
  syncConfigKey('podcasts');
  persistLocal();
  renderPodcasts();
  showToast('Podcast 已刪除');
}

// ─────────────────────────────────────────────
// 6. VOCABULARY
// ─────────────────────────────────────────────
const POS_COLORS = { noun:'var(--blue)', verb:'var(--green)', adjective:'var(--purple)', adverb:'var(--yellow)' };

function renderVocab() {
  const q     = (el('vocabSearch')?.value || '').toLowerCase();
  const shown = vocab.filter(v =>
    !q || v.word.toLowerCase().includes(q) ||
    v.definition.toLowerCase().includes(q) ||
    (v.pos || '').toLowerCase().includes(q)
  );
  el('vocabCount').textContent = `共 ${vocab.length} 個單字`;
  el('vocabBody').innerHTML = shown.length ? shown.map((v, _i) => {
    const realIdx = vocab.indexOf(v);
    const posColor = POS_COLORS[v.pos] || 'var(--muted)';
    return `<tr>
      <td style="color:var(--muted);font-size:12px">${realIdx + 1}</td>
      <td style="font-weight:700;color:var(--text)">${esc(v.word)}</td>
      <td style="font-size:12px;color:var(--muted)">${esc(v.phonetic || '')}</td>
      <td><span class="pos-badge" style="color:${posColor}">${esc(v.pos || '')}</span></td>
      <td><span class="cell-truncate" style="display:block;max-width:240px">${esc(v.definition)}</span></td>
      <td><span class="cell-truncate cell-url" style="display:block;max-width:200px">${esc(v.example || '')}</span></td>
      <td><div class="cell-actions">
        <button class="ibtn btn-sm" title="編輯" onclick="openVocabModal(${realIdx})"><i class="fas fa-pen"></i></button>
        <button class="ibtn btn-sm danger" title="刪除" onclick="deleteVocab(${realIdx})"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`;
  }).join('') : '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-graduation-cap"></i>找不到符合的單字</div></td></tr>';
}

function openVocabModal(idx) {
  const v     = idx !== undefined ? vocab[idx] : null;
  const title = v ? `編輯單字：${v.word}` : '新增單字';
  const body  = `
    <label class="flabel">單字 *</label>
    <input class="finput" id="mVWord" value="${esc(v?.word || '')}" placeholder="e.g. serendipity" />
    <label class="flabel">音標</label>
    <input class="finput" id="mVPhonetic" value="${esc(v?.phonetic || '')}" placeholder="/ˌserənˈdɪpɪti/" />
    <label class="flabel">詞性</label>
    <select class="fselect" id="mVPos">
      ${['noun','verb','adjective','adverb','other'].map(p =>
        `<option value="${p}" ${(v?.pos||'')===p?'selected':''}>${p}</option>`
      ).join('')}
    </select>
    <label class="flabel">定義 *</label>
    <textarea class="ftextarea" id="mVDef" placeholder="英文定義…" style="min-height:60px">${esc(v?.definition || '')}</textarea>
    <label class="flabel">例句</label>
    <textarea class="ftextarea" id="mVEx" placeholder="例句…" style="min-height:52px">${esc(v?.example || '')}</textarea>
  `;
  openModal(title, body, () => {
    const word = el('mVWord').value.trim();
    const def  = el('mVDef').value.trim();
    if (!word || !def) { showToast('單字與定義為必填', 'err'); return; }
    const obj = {
      word, phonetic: el('mVPhonetic').value.trim(),
      pos:  el('mVPos').value,
      definition: def, example: el('mVEx').value.trim(),
    };
    if (v) vocab[idx] = obj;
    else   vocab.push(obj);
    persistVocab();
    renderVocab();
    closeModal();
    showToast(v ? '單字已更新' : '單字已新增');
  });
}

function deleteVocab(idx) {
  if (!confirm(`確定要刪除「${vocab[idx].word}」？`)) return;
  vocab.splice(idx, 1);
  persistVocab();
  renderVocab();
  showToast('單字已刪除');
}

function resetVocab() {
  if (!confirm(`確定要重設為預設的 ${VOCAB_DEFAULT.length} 個單字？自訂單字將全部刪除。`)) return;
  vocab = VOCAB_DEFAULT.map(v => ({ ...v }));
  localStorage.removeItem('allen_vocab');
  renderVocab();
  showToast('已重設為預設單字');
}

// ─────────────────────────────────────────────
// 7. GOOGLE CALENDAR
// ─────────────────────────────────────────────
function renderGCal() {
  const panel = el('gcalPanel');
  if (!panel) return;
  const hasLib    = typeof GCAL !== 'undefined';
  const configured = hasLib && GCAL.isConfigured();
  const connected  = hasLib && GCAL.isConnected();
  const clientId   = hasLib ? GCAL.getClientId()   : '';
  const daysBack   = hasLib ? GCAL.getDaysBack()    : 30;
  const daysAhead  = hasLib ? GCAL.getDaysAhead()   : 90;

  let html = `
    <div class="subsec-title"><i class="fab fa-google" style="color:#4285F4"></i> Google Calendar 整合設定</div>
    <div style="font-size:12px;color:var(--muted);line-height:1.8;background:var(--elev);padding:12px 16px;border-radius:8px;border:1px solid var(--border);">
      <strong style="color:var(--text)">設定步驟：</strong><br>
      1. 前往 <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color:var(--blue)">Google Cloud Console → 憑證</a><br>
      2. 建立 OAuth 2.0 用戶端 ID（類型：網頁應用程式）<br>
      3. 已授權的 JavaScript 來源：加入你的網域（如 <code style="color:var(--text)">https://你的帳號.github.io</code>）<br>
      4. 啟用 Google Calendar API（APIs &amp; Services → 程式庫）<br>
      5. 將 Client ID 貼入下方並儲存
    </div>
    <div>
      <label class="flabel">OAuth 2.0 Client ID</label>
      <div class="row-input">
        <input class="finput" id="gcalClientId" value="${esc(clientId)}"
          placeholder="xxxxxxxx.apps.googleusercontent.com"
          style="font-size:12px;font-family:monospace" />
        <button class="btn btn-ghost btn-sm" onclick="saveGCalClientId()">
          <i class="fas fa-save"></i> 儲存
        </button>
      </div>
    </div>`;

  if (configured) {
    html += `<div class="divider"></div>
    <div class="subsec-title"><i class="fas fa-link"></i> 帳號連結狀態</div>`;

    if (connected) {
      html += `
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;
            background:rgba(63,185,80,.08);border:1px solid rgba(63,185,80,.25);border-radius:8px;">
          <i class="fas fa-circle-check" style="color:var(--green)"></i>
          <span style="font-size:13px;color:var(--green);font-weight:600">已連結 Google 帳號</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="syncGCalNow()">
          <i class="fas fa-sync-alt"></i> 立即同步
        </button>
        <button class="btn btn-danger btn-sm" onclick="disconnectGCal()">
          <i class="fas fa-unlink"></i> 中斷連結
        </button>
      </div>
      <div class="divider"></div>
      <div class="subsec-title"><i class="fas fa-calendar-check"></i> 選擇要同步的日曆</div>
      <div id="gcalCalList" style="display:flex;flex-direction:column;gap:8px;">
        <div style="color:var(--muted);font-size:12px"><i class="fas fa-spinner fa-spin"></i> 載入日曆清單…</div>
      </div>
      <div class="divider"></div>
      <div class="subsec-title"><i class="fas fa-clock"></i> 同步時間範圍</div>
      <div class="row-input" style="gap:20px;align-items:flex-end">
        <div>
          <label class="flabel">過去天數（0–365）</label>
          <input class="finput" id="gcalDaysBack" type="number" min="0" max="365"
            value="${daysBack}" style="width:110px" />
        </div>
        <div>
          <label class="flabel">未來天數（1–365）</label>
          <input class="finput" id="gcalDaysAhead" type="number" min="1" max="365"
            value="${daysAhead}" style="width:110px" />
        </div>
        <button class="btn btn-primary btn-sm" onclick="saveGCalRange()">
          <i class="fas fa-check"></i> 儲存範圍
        </button>
      </div>`;
    } else {
      html += `
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;
            background:var(--elev);border:1px solid var(--border);border-radius:8px;">
          <i class="fas fa-circle-xmark" style="color:var(--muted)"></i>
          <span style="font-size:13px;color:var(--muted)">尚未連結 Google 帳號</span>
        </div>
        <button class="btn btn-primary btn-sm" onclick="connectGCal()">
          <i class="fab fa-google"></i> 連結 Google 帳號
        </button>
      </div>`;
    }
  }

  panel.innerHTML = html;
  if (configured && connected) loadGCalCalendars();
}

async function loadGCalCalendars() {
  if (typeof GCAL === 'undefined') return;
  const listEl = el('gcalCalList');
  if (!listEl) return;
  try {
    const cals = await GCAL.listCalendars();
    if (!cals.length) {
      listEl.innerHTML = '<span style="color:var(--muted);font-size:12px">找不到任何日曆</span>';
      return;
    }
    listEl.innerHTML = cals.map(c => `
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer;
          padding:8px 12px;border-radius:8px;background:var(--elev);border:1px solid var(--border);">
        <input type="checkbox" value="${esc(c.id)}" ${c.selected ? 'checked' : ''}
          onchange="saveGCalCals()" style="width:15px;height:15px;accent-color:var(--blue)" />
        <span style="width:12px;height:12px;border-radius:50%;background:${esc(c.color)};
          flex-shrink:0;display:inline-block"></span>
        <span style="font-size:13px;flex:1">${esc(c.name)}</span>
        ${c.primary
          ? '<span style="font-size:10px;padding:1px 7px;border-radius:20px;background:rgba(88,166,255,.1);border:1px solid rgba(88,166,255,.25);color:var(--blue)">主要</span>'
          : ''}
      </label>`).join('');
  } catch (e) {
    listEl.innerHTML = `<span style="color:var(--red);font-size:12px">
      <i class="fas fa-exclamation-triangle"></i> 無法載入日曆：${esc(e.message)}</span>`;
    if (e.message === 'TOKEN_EXPIRED') renderGCal();
  }
}

function saveGCalClientId() {
  if (typeof GCAL === 'undefined') { showToast('gcal.js 未載入', 'err'); return; }
  const id = (el('gcalClientId')?.value || '').trim();
  if (!id) { showToast('請輸入 Client ID', 'err'); return; }
  GCAL.setClientId(id);
  renderGCal();
  showToast('Client ID 已儲存');
}

async function connectGCal() {
  if (typeof GCAL === 'undefined') { showToast('gcal.js 未載入', 'err'); return; }
  try {
    await GCAL.signIn();
    renderGCal();
    showToast('已連結 Google 帳號');
  } catch (e) {
    showToast('連結失敗：' + e.message, 'err');
  }
}

function disconnectGCal() {
  if (!confirm('確定要中斷與 Google 帳號的連結？')) return;
  if (typeof GCAL !== 'undefined') GCAL.signOut();
  renderGCal();
  showToast('已中斷 Google 帳號連結');
}

function saveGCalCals() {
  if (typeof GCAL === 'undefined') return;
  const checks   = document.querySelectorAll('#gcalCalList input[type=checkbox]');
  const selected = Array.from(checks).filter(c => c.checked).map(c => c.value);
  GCAL.setSelectedCals(selected.length ? selected : ['primary']);
  showToast('日曆選擇已儲存');
}

function saveGCalRange() {
  if (typeof GCAL === 'undefined') return;
  const back  = parseInt(el('gcalDaysBack')?.value  || '30',  10);
  const ahead = parseInt(el('gcalDaysAhead')?.value || '90', 10);
  GCAL.setDaysBack(isNaN(back)  ? 30  : Math.max(0,   back));
  GCAL.setDaysAhead(isNaN(ahead) ? 90 : Math.max(1, ahead));
  showToast('同步範圍已儲存');
}

async function syncGCalNow() {
  if (typeof GCAL === 'undefined') return;
  try {
    showToast('同步中…');
    const evts = await GCAL.syncEvents();
    showToast(`已同步 ${evts.length} 個 Google 日曆事件`);
  } catch (e) {
    showToast('同步失敗：' + e.message, 'err');
    if (e.message === 'TOKEN_EXPIRED') renderGCal();
  }
}

// ─────────────────────────────────────────────
// PASSPHRASE UNLOCK
// ─────────────────────────────────────────────
function showPPModal() {
  el('ppBackdrop').style.display = 'flex';
  setTimeout(() => el('ppInput')?.focus(), 80);
}
function hidePPModal() { el('ppBackdrop').style.display = 'none'; }

async function attemptUnlock() {
  const pass = el('ppInput').value;
  if (!pass) { el('ppErr').textContent = '請輸入密碼短語'; return; }
  el('ppErr').textContent = '驗證中…';
  try {
    const key = await AW_CRYPTO.deriveKey(pass, APPWRITE_SALT);
    await AW_CRYPTO.decrypt(APPWRITE_CIPHER, key);
    sessionKey = key;
    hidePPModal();
    await connectAppwrite();
  } catch (_) {
    el('ppErr').textContent = '密碼短語錯誤，請重試';
    el('ppInput').value = '';
    el('ppInput').focus();
  }
}

function skipUnlock() {
  hidePPModal();
  initUI();
}

async function connectAppwrite() {
  const ok = await initAdminAppwrite();
  if (ok) {
    await loadFromAppwrite();
    setSyncStatus('Appwrite ✓', 'ok');
  } else {
    setSyncStatus('localStorage', '');
  }
  initUI();
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
function initUI() {
  renderLinks();
  renderEvents();
  renderKeywords();
  renderFeeds();
  renderPodcasts();
  renderVocab();
  renderGCal();
}

document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  loadLocal();

  const hasEncrypted = typeof APPWRITE_CIPHER !== 'undefined' &&
                       typeof APPWRITE_SALT   !== 'undefined' &&
                       typeof AW_CRYPTO       !== 'undefined';
  const hasPlain     = typeof APPWRITE_PROJECT_ID !== 'undefined' &&
                       !String(typeof APPWRITE_PROJECT_ID !== 'undefined' ? APPWRITE_PROJECT_ID : '').includes('YOUR_');

  if (hasEncrypted) {
    showPPModal();
  } else if (hasPlain) {
    await connectAppwrite();
  } else {
    setSyncStatus('localStorage', '');
    initUI();
  }
});
