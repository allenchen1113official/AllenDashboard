'use strict';

// ─────────────────────────────────────────────
// 1. VOCABULARY  (50 words, day-of-year rotation)
// ─────────────────────────────────────────────
const VOCAB = [
  { word:'serendipity',  phonetic:'/ˌserənˈdɪpɪti/',  pos:'noun',      definition:'The occurrence of finding pleasant things by chance.',                         example:'It was pure serendipity that led me to my dream job.' },
  { word:'ephemeral',    phonetic:'/ɪˈfemərəl/',       pos:'adjective', definition:'Lasting for a very short time; transitory.',                                  example:'The ephemeral beauty of cherry blossoms makes them precious.' },
  { word:'resilience',   phonetic:'/rɪˈzɪliəns/',      pos:'noun',      definition:'The capacity to recover quickly from difficulties.',                          example:'Her resilience in the face of adversity was truly inspiring.' },
  { word:'eloquent',     phonetic:'/ˈeləkwənt/',       pos:'adjective', definition:'Fluent or persuasive in speaking or writing.',                                example:'He gave an eloquent speech that moved the entire audience.' },
  { word:'tenacious',    phonetic:'/tɪˈneɪʃəs/',       pos:'adjective', definition:'Tending to keep a firm hold; persistent.',                                    example:'She was tenacious in pursuing her goals despite obstacles.' },
  { word:'meticulous',   phonetic:'/mɪˈtɪkjʊləs/',    pos:'adjective', definition:'Showing great attention to detail; very careful.',                            example:'His meticulous notes made revision much easier.' },
  { word:'ubiquitous',   phonetic:'/juːˈbɪkwɪtəs/',   pos:'adjective', definition:'Present, appearing, or found everywhere.',                                    example:'Smartphones have become ubiquitous in modern life.' },
  { word:'paradigm',     phonetic:'/ˈpærədaɪm/',       pos:'noun',      definition:'A typical example or pattern of something; a model.',                        example:'The invention of the internet created a new paradigm for communication.' },
  { word:'integrity',    phonetic:'/ɪnˈtegrɪti/',      pos:'noun',      definition:'The quality of being honest and having strong moral principles.',             example:'Her integrity was never questioned throughout her career.' },
  { word:'perseverance', phonetic:'/ˌpɜːsɪˈvɪərəns/', pos:'noun',      definition:'Continued effort despite difficulty or delay in achieving success.',          example:'Perseverance is the key to mastering any skill.' },
  { word:'innovation',   phonetic:'/ˌɪnəˈveɪʃən/',    pos:'noun',      definition:'The action of introducing new ideas, methods, or products.',                  example:'Innovation drives growth in the technology sector.' },
  { word:'articulate',   phonetic:'/ɑːˈtɪkjʊlɪt/',    pos:'adjective', definition:'Having or showing the ability to speak fluently and coherently.',             example:'An articulate speaker can simplify complex topics effortlessly.' },
  { word:'pragmatic',    phonetic:'/præɡˈmætɪk/',      pos:'adjective', definition:'Dealing with things sensibly and realistically.',                             example:'A pragmatic approach helped the team solve the problem quickly.' },
  { word:'diligent',     phonetic:'/ˈdɪlɪdʒənt/',      pos:'adjective', definition:'Having or showing care and conscientiousness in work.',                       example:'Diligent students consistently outperform their peers.' },
  { word:'empathy',      phonetic:'/ˈempəθi/',          pos:'noun',      definition:'The ability to understand and share the feelings of another.',               example:'Good leaders show empathy toward their team members.' },
  { word:'versatile',    phonetic:'/ˈvɜːsətaɪl/',      pos:'adjective', definition:'Able to adapt or be adapted to many different functions.',                    example:'A versatile programmer can work across multiple languages.' },
  { word:'profound',     phonetic:'/prəˈfaʊnd/',        pos:'adjective', definition:'Very great or intense; having deep insight.',                                example:'Reading that book had a profound effect on my perspective.' },
  { word:'authentic',    phonetic:'/ɔːˈθentɪk/',        pos:'adjective', definition:'Of undisputed origin; genuine.',                                             example:'Being authentic builds deeper connections with others.' },
  { word:'ambitious',    phonetic:'/æmˈbɪʃəs/',         pos:'adjective', definition:'Having a strong desire for success or achievement.',                         example:'She was ambitious enough to start her own company at 25.' },
  { word:'conscientious',phonetic:'/ˌkɒnʃɪˈenʃəs/',   pos:'adjective', definition:'Wishing to do what is right, especially to do one\'s work well.',           example:'A conscientious employee always double-checks their work.' },
  { word:'perceptive',   phonetic:'/pəˈseptɪv/',        pos:'adjective', definition:'Having or showing sensitive insight.',                                        example:'Her perceptive questions impressed the whole panel.' },
  { word:'fortitude',    phonetic:'/ˈfɔːtɪtjuːd/',     pos:'noun',      definition:'Courage in pain or adversity.',                                               example:'He faced the hardship with remarkable fortitude.' },
  { word:'magnanimous',  phonetic:'/mæɡˈnænɪməs/',     pos:'adjective', definition:'Generous or forgiving, especially toward a rival.',                          example:'The winner was magnanimous in victory.' },
  { word:'sagacious',    phonetic:'/səˈɡeɪʃəs/',        pos:'adjective', definition:'Having or showing keen mental discernment and good judgement.',              example:'A sagacious investor avoids emotional decisions.' },
  { word:'zealous',      phonetic:'/ˈzeləs/',            pos:'adjective', definition:'Having or showing great energy or enthusiasm in pursuit of a cause.',       example:'She was zealous in her efforts to protect the environment.' },
  { word:'benevolent',   phonetic:'/bɪˈnevələnt/',      pos:'adjective', definition:'Well-meaning and kindly.',                                                    example:'The benevolent donor funded dozens of scholarships.' },
  { word:'cogent',       phonetic:'/ˈkəʊdʒənt/',        pos:'adjective', definition:'Clear, logical, and convincing.',                                             example:'She presented a cogent argument that won everyone over.' },
  { word:'discerning',   phonetic:'/dɪˈsɜːnɪŋ/',        pos:'adjective', definition:'Having or showing good judgement.',                                           example:'A discerning reader notices subtle details.' },
  { word:'elucidate',    phonetic:'/ɪˈluːsɪdeɪt/',      pos:'verb',      definition:'Make something clear; explain.',                                              example:'The professor elucidated the theory with simple examples.' },
  { word:'formidable',   phonetic:'/ˈfɔːmɪdəbəl/',     pos:'adjective', definition:'Inspiring fear or respect through being impressively large or capable.',     example:'The team faced a formidable opponent in the finals.' },
  { word:'gregarious',   phonetic:'/ɡrɪˈɡeəriəs/',     pos:'adjective', definition:'Fond of company; sociable.',                                                  example:'Her gregarious personality made her popular at parties.' },
  { word:'heuristic',    phonetic:'/hjʊˈrɪstɪk/',       pos:'adjective', definition:'Enabling a person to discover or learn something for themselves.',           example:'Heuristic teaching methods encourage independent thinking.' },
  { word:'insightful',   phonetic:'/ˈɪnsaɪtfʊl/',       pos:'adjective', definition:'Having or showing an accurate and deep understanding.',                      example:'Her insightful feedback helped the team improve rapidly.' },
  { word:'judicious',    phonetic:'/dʒuːˈdɪʃəs/',       pos:'adjective', definition:'Having, showing, or done with good judgement or sense.',                    example:'A judicious choice of words can prevent misunderstandings.' },
  { word:'loquacious',   phonetic:'/ləˈkweɪʃəs/',       pos:'adjective', definition:'Tending to talk a great deal; talkative.',                                   example:'The loquacious host kept the audience entertained all evening.' },
  { word:'nuanced',      phonetic:'/ˈnjuːɑːnst/',        pos:'adjective', definition:'Characterized by subtle shades of meaning or expression.',                  example:'A nuanced understanding of culture is essential for diplomacy.' },
  { word:'pivotal',      phonetic:'/ˈpɪvətəl/',          pos:'adjective', definition:'Of crucial importance in relation to the development or success of something.', example:'That meeting proved pivotal in securing the deal.' },
  { word:'quintessential',phonetic:'/ˌkwɪntɪˈsenʃəl/', pos:'adjective', definition:'Representing the most perfect or typical example of something.',             example:'Jazz is the quintessential American art form.' },
  { word:'succinct',     phonetic:'/səkˈsɪŋkt/',         pos:'adjective', definition:'Briefly and clearly expressed.',                                             example:'A succinct summary saves everyone valuable time.' },
  { word:'tactful',      phonetic:'/ˈtæktfʊl/',          pos:'adjective', definition:'Having or showing skill and sensitivity in dealing with others.',            example:'A tactful response can defuse a tense situation.' },
  { word:'vigilant',     phonetic:'/ˈvɪdʒɪlənt/',        pos:'adjective', definition:'Keeping careful watch for possible danger or difficulties.',                example:'Vigilant monitoring prevented a major security breach.' },
  { word:'vivacious',    phonetic:'/vɪˈveɪʃəs/',         pos:'adjective', definition:'Attractively lively and animated.',                                          example:'Her vivacious energy lit up every room she entered.' },
  { word:'acumen',       phonetic:'/ˈækjʊmɪn/',          pos:'noun',      definition:'The ability to make good judgements and take quick decisions.',              example:'His business acumen built a company worth millions.' },
  { word:'brevity',      phonetic:'/ˈbrevɪti/',           pos:'noun',      definition:'Concise and exact use of words; shortness of time.',                        example:'Brevity is the soul of wit.' },
  { word:'candor',       phonetic:'/ˈkændə/',             pos:'noun',      definition:'The quality of being open and honest in expression.',                       example:'She appreciated his candor even when the feedback was hard to hear.' },
  { word:'dexterity',    phonetic:'/dekˈsterɪti/',        pos:'noun',      definition:'Skill in performing tasks, especially with the hands.',                     example:'The surgeon\'s dexterity was evident throughout the operation.' },
  { word:'equanimity',   phonetic:'/ˌekwəˈnɪmɪti/',     pos:'noun',      definition:'Mental calmness and composure, especially in difficult situations.',         example:'She handled the crisis with remarkable equanimity.' },
  { word:'fervent',      phonetic:'/ˈfɜːvənt/',           pos:'adjective', definition:'Having or displaying a passionate intensity.',                              example:'He was a fervent advocate for renewable energy.' },
  { word:'galvanize',    phonetic:'/ˈɡælvənaɪz/',        pos:'verb',      definition:'Shock or excite someone into taking action.',                                example:'The tragedy galvanized the community into demanding change.' },
  { word:'harbinger',    phonetic:'/ˈhɑːbɪndʒə/',        pos:'noun',      definition:'A person or thing that announces or signals the approach of something.',    example:'The first cherry blossoms are a harbinger of spring.' },
];

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

const CACHE_TTL = 30 * 60 * 1000; // 30 min

// ─────────────────────────────────────────────
// 3. STATE
// ─────────────────────────────────────────────
let S = {
  wordIdx:    0,
  flipped:    false,
  calDate:    new Date(),
  events:     [],
  links:      DEFAULT_LINKS.map(x => ({ ...x })),
  keywords:   ['AI', '科技', 'technology'],
  feeds:      DEFAULT_FEEDS.map(x => ({ ...x })),
  podcasts:   DEFAULT_PODCASTS.map(x => ({ ...x })),
  wordNotes:  {},
  editEvtId:  null,
};

// ─────────────────────────────────────────────
// 4. STORAGE
// ─────────────────────────────────────────────
function saveState() {
  const { wordIdx, events, links, keywords, feeds, podcasts, wordNotes } = S;
  localStorage.setItem('allen_dash', JSON.stringify(
    { wordIdx, events, links, keywords, feeds, podcasts, wordNotes }
  ));
}

function loadState() {
  try {
    const raw = localStorage.getItem('allen_dash');
    if (!raw) return;
    const saved = JSON.parse(raw);
    Object.assign(S, saved);
  } catch (_) {}
}

// ─────────────────────────────────────────────
// 5. CLOCK
// ─────────────────────────────────────────────
function initClock() {
  tick();
  setInterval(tick, 1000);
}

function tick() {
  const now = new Date();
  document.getElementById('clock').textContent =
    now.toLocaleTimeString('zh-TW', { hour12: false });

  document.getElementById('dateInfo').textContent =
    now.toLocaleDateString('zh-TW', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    });

  const h = now.getHours();
  const greet = h < 6 ? '🌙 夜深了，注意休息' :
                h < 12 ? '☀️ 早安，今天也要加油！' :
                h < 18 ? '🌤 午安，保持專注！' : '🌆 晚安，辛苦了！';
  document.getElementById('greeting').textContent = greet;
}

// ─────────────────────────────────────────────
// 6. ENGLISH LEARNING
// ─────────────────────────────────────────────
function initEnglish() {
  // Start on today's word (consistent all day)
  const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(),0,0)) / 86400000);
  S.wordIdx = doy % VOCAB.length;
  renderWord();
  fetchWordAPI();

  el('prevWord').addEventListener('click', () => { stepWord(-1); });
  el('nextWord').addEventListener('click', () => { stepWord(+1); });
  el('flipCard').addEventListener('click', toggleFlip);
  el('flashcard').addEventListener('click', toggleFlip);

  el('wordNotes').addEventListener('input', e => {
    S.wordNotes[VOCAB[S.wordIdx].word] = e.target.value;
    saveState();
  });
}

function stepWord(dir) {
  S.wordIdx = (S.wordIdx + dir + VOCAB.length) % VOCAB.length;
  S.flipped = false;
  el('flashcard').classList.remove('flipped');
  renderWord();
  fetchWordAPI();
}

function renderWord() {
  const v = VOCAB[S.wordIdx];
  el('fcWord').textContent    = v.word;
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
    const entry   = data[0];
    const phonTxt = entry.phonetics?.find(p => p.text)?.text;
    if (phonTxt) el('fcPhonetic').textContent = phonTxt;
    const meaning = entry.meanings?.[0];
    if (meaning) {
      el('fcPos').textContent = meaning.partOfSpeech || VOCAB[S.wordIdx].pos;
      const def = meaning.definitions?.[0];
      if (def) {
        el('fcDef').textContent = def.definition;
        if (def.example) el('fcEx').textContent = `"${def.example}"`;
      }
    }
  } catch (_) {}
}

function toggleFlip() {
  S.flipped = !S.flipped;
  el('flashcard').classList.toggle('flipped', S.flipped);
}

// ─────────────────────────────────────────────
// 7. CALENDAR
// ─────────────────────────────────────────────
function initCalendar() {
  renderCalendar();
  renderUpcoming();

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

  const firstDow   = new Date(yr, mo, 1).getDay();
  const daysInMon  = new Date(yr, mo + 1, 0).getDate();
  const today      = new Date();
  const todayStr   = fmtDateKey(today);
  const grid       = el('calDays');
  grid.innerHTML   = '';

  // blank leading cells
  for (let i = 0; i < firstDow; i++) {
    const d = div('cal-day empty'); grid.appendChild(d);
  }

  for (let day = 1; day <= daysInMon; day++) {
    const dateStr  = fmtDateKey(new Date(yr, mo, day));
    const isToday  = dateStr === todayStr;
    const dayEvts  = S.events.filter(e => e.date === dateStr);
    const d        = div('cal-day' + (isToday ? ' today' : ''));

    d.innerHTML = `<span class="day-num">${day}</span>` +
      (dayEvts.length ? `<div class="day-dots">${
        dayEvts.slice(0,3).map(e => `<span class="day-dot" style="background:${e.color}"></span>`).join('')
      }</div>` : '');

    d.addEventListener('click', () => openEvtModal(dateStr));
    grid.appendChild(d);
  }
}

function renderUpcoming() {
  const todayMs = new Date().setHours(0,0,0,0);
  const soon = S.events
    .filter(e => new Date(e.date).getTime() >= todayMs)
    .sort((a,b) => a.date.localeCompare(b.date))
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

  const evt = {
    id:    S.editEvtId || uid(),
    title,
    date,
    time:  el('evtTime').value,
    note:  el('evtNote').value,
    color: el('evtColor').value,
  };

  if (S.editEvtId) {
    const idx = S.events.findIndex(e => e.id === S.editEvtId);
    if (idx !== -1) S.events[idx] = evt;
  } else {
    S.events.push(evt);
  }
  saveState();
  hideModal('evtBackdrop');
  renderCalendar();
  renderUpcoming();
}

function deleteEvt(id) {
  S.events = S.events.filter(e => e.id !== id);
  saveState();
  renderCalendar();
  renderUpcoming();
}

// ─────────────────────────────────────────────
// 8. QUICK LINKS
// ─────────────────────────────────────────────
function initLinks() {
  renderLinks();
  el('addLinkBtn').addEventListener('click', openLnkModal);
  el('linkFilter').addEventListener('input', e => renderLinks(e.target.value));
}

function renderLinks(filter = '') {
  const q = filter.toLowerCase();
  const items = q
    ? S.links.filter(l => l.name.toLowerCase().includes(q) || (l.category||'').toLowerCase().includes(q))
    : S.links;

  const cats = {};
  items.forEach(l => {
    const c = l.category || '其他';
    if (!cats[c]) cats[c] = [];
    cats[c].push(l);
  });

  const body = el('linksBody');
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
  const name = el('lnkName').value.trim();
  const url  = el('lnkUrl').value.trim();
  if (!name || !url) { alert('請填寫名稱與 URL'); return; }
  S.links.push({
    id:       uid(),
    name, url,
    category: el('lnkCategory').value.trim() || '其他',
    icon:     el('lnkIcon').value.trim() || 'fas fa-globe',
  });
  saveState();
  hideModal('lnkBackdrop');
  renderLinks();
}

function deleteLink(id) {
  S.links = S.links.filter(l => l.id !== id);
  saveState();
  renderLinks();
}

// ─────────────────────────────────────────────
// 9. NEWS
// ─────────────────────────────────────────────
function initNews() {
  renderKwBar();
  fetchAllNews();
  el('newsSettingsBtn').addEventListener('click', openNewsModal);
  el('refreshNewsBtn').addEventListener('click', () => fetchAllNews(true));
}

function renderKwBar() {
  el('kwBar').innerHTML = S.keywords
    .map(k => `<span class="kw-tag">${esc(k)}</span>`).join('');
}

async function fetchAllNews(force = false) {
  const body = el('newsBody');
  body.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 載入中…</div>';
  const all = [];
  for (const feed of S.feeds) {
    try { all.push(...await fetchRSS(feed.url, feed.name, force)); }
    catch (_) {}
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
    const cached = lsGet(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;
  }
  const api = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&count=20`;
  const res  = await fetch(api);
  const json = await res.json();
  if (json.status !== 'ok') throw new Error('rss fail');
  const data = json.items.map(i => ({
    title:   i.title   || '',
    desc:    stripHTML(i.description || i.content || ''),
    link:    i.link    || '',
    pubDate: i.pubDate || '',
    thumb:   i.thumbnail || '',
    source,
  }));
  lsSet(key, { data, ts: Date.now() });
  return data;
}

function renderNews(articles) {
  const body = el('newsBody');
  if (!articles.length) {
    body.innerHTML = '<div class="empty">無符合關鍵字的新聞，請調整設定</div>';
    return;
  }
  body.innerHTML = articles.slice(0, 30).map(a => `
    <div class="news-item">
      ${a.thumb ? `<img src="${esc(a.thumb)}" class="news-thumb" loading="lazy" onerror="this.style.display='none'">` : ''}
      <div class="news-content">
        <div class="news-meta">
          <span class="news-source">${esc(a.source)}</span>
          <span class="news-date">${relTime(a.pubDate)}</span>
        </div>
        <a href="${esc(a.link)}" target="_blank" rel="noopener noreferrer" class="news-title">${esc(a.title)}</a>
        <div class="news-desc">${esc(a.desc.slice(0, 160))}…</div>
      </div>
    </div>`).join('');
}

/* News modal helpers */
function openNewsModal() {
  renderKwPreview();
  renderFeedsList();
  showModal('newsBackdrop');
}

function renderKwPreview() {
  el('kwPreview').innerHTML = S.keywords.map((k, i) => `
    <span class="kw-removable">${esc(k)}
      <button onclick="removeKw(${i})"><i class="fas fa-times"></i></button>
    </span>`).join('');
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
  const url  = el('feedUrl').value.trim();
  const name = el('feedName').value.trim();
  if (url && name) {
    S.feeds.push({ url, name });
    el('feedUrl').value = el('feedName').value = '';
    renderFeedsList();
  }
}

function removeFeed(i) { S.feeds.splice(i, 1); renderFeedsList(); }

function saveNewsSettings() {
  saveState();
  renderKwBar();
  hideModal('newsBackdrop');
  fetchAllNews(true);
}

// ─────────────────────────────────────────────
// 10. PODCAST
// ─────────────────────────────────────────────
function initPodcast() {
  fetchAllPodcasts();
  el('addPodcastBtn').addEventListener('click', openPodModal);
  el('refreshPodcastBtn').addEventListener('click', () => fetchAllPodcasts(true));
}

async function fetchAllPodcasts(force = false) {
  const body = el('podcastBody');
  body.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 載入中…</div>';
  const results = await Promise.all(
    S.podcasts.map(async p => {
      try {
        const eps = await fetchRSS(p.url, p.name, force);
        return { ...p, episodes: eps.slice(0, 4), error: false };
      } catch (_) {
        return { ...p, episodes: [], error: true };
      }
    })
  );
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
          <div class="ep-meta">
            <span class="ep-date">${relTime(ep.pubDate)}</span>
          </div>
          <a href="${esc(ep.link)}" target="_blank" rel="noopener noreferrer" class="ep-title">${esc(ep.title)}</a>
          <div class="ep-desc">${esc(ep.desc.slice(0, 130))}…</div>
        </div>`).join('')}
    </div>`).join('');
}

function openPodModal() {
  el('podName').value = el('podUrl').value = '';
  showModal('podBackdrop');
}

function savePod() {
  const name = el('podName').value.trim();
  const url  = el('podUrl').value.trim();
  if (!name || !url) { alert('請填寫名稱與 RSS URL'); return; }
  S.podcasts.push({ name, url });
  saveState();
  hideModal('podBackdrop');
  fetchAllPodcasts();
}

function deletePodcast(i) {
  S.podcasts.splice(i, 1);
  saveState();
  fetchAllPodcasts();
}

// ─────────────────────────────────────────────
// 11. UTILITIES
// ─────────────────────────────────────────────
const el  = id => document.getElementById(id);
const div = cls => { const d = document.createElement('div'); d.className = cls; return d; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

function esc(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function stripHTML(html) {
  const t = document.createElement('div');
  t.innerHTML = html;
  return t.textContent || t.innerText || '';
}

function fmtDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

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

function lsGet(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
}

// ─────────────────────────────────────────────
// 12. MODAL CONTROL
// ─────────────────────────────────────────────
function showModal(id) { el(id).style.display = 'flex'; }
function hideModal(id) { el(id).style.display = 'none'; }

function setupModals() {
  // Event modal
  el('saveEvtBtn').addEventListener('click', saveEvt);
  el('cancelEvtModal').addEventListener('click', () => hideModal('evtBackdrop'));
  el('closeEvtModal').addEventListener('click',  () => hideModal('evtBackdrop'));
  el('evtBackdrop').addEventListener('click', e => { if (e.target===e.currentTarget) hideModal('evtBackdrop'); });

  // Link modal
  el('saveLnkBtn').addEventListener('click', saveLnk);
  el('cancelLnkModal').addEventListener('click', () => hideModal('lnkBackdrop'));
  el('closeLnkModal').addEventListener('click',  () => hideModal('lnkBackdrop'));
  el('lnkBackdrop').addEventListener('click', e => { if (e.target===e.currentTarget) hideModal('lnkBackdrop'); });

  // News modal
  el('saveNewsBtn').addEventListener('click', saveNewsSettings);
  el('cancelNewsModal').addEventListener('click', () => hideModal('newsBackdrop'));
  el('closeNewsModal').addEventListener('click',  () => hideModal('newsBackdrop'));
  el('newsBackdrop').addEventListener('click', e => { if (e.target===e.currentTarget) hideModal('newsBackdrop'); });
  el('addKwBtn').addEventListener('click', addKw);
  el('kwInput').addEventListener('keydown', e => { if (e.key === 'Enter') addKw(); });
  el('addFeedBtn').addEventListener('click', addFeed);

  // Podcast modal
  el('savePodBtn').addEventListener('click', savePod);
  el('cancelPodModal').addEventListener('click', () => hideModal('podBackdrop'));
  el('closePodModal').addEventListener('click',  () => hideModal('podBackdrop'));
  el('podBackdrop').addEventListener('click', e => { if (e.target===e.currentTarget) hideModal('podBackdrop'); });

  // Global ESC key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      ['evtBackdrop','lnkBackdrop','newsBackdrop','podBackdrop'].forEach(hideModal);
    }
  });
}

// ─────────────────────────────────────────────
// 13. INIT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initClock();
  initCalendar();
  initEnglish();
  initLinks();
  initNews();
  initPodcast();
  setupModals();
});
