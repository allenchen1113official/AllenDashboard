'use strict';
// Google Calendar integration — requires GIS loaded:
// <script src="https://accounts.google.com/gsi/client" async></script>
const GCAL = (() => {

  const SCOPE    = 'https://www.googleapis.com/auth/calendar.readonly';
  const API_BASE = 'https://www.googleapis.com/calendar/v3';

  // GCal color ID → hex (Google Calendar palette)
  const COLOR_MAP = {
    '1':'#a4bdfc','2':'#7ae7bf','3':'#dbadff','4':'#ff887c',
    '5':'#fbd75b','6':'#ffb878','7':'#46d6db','8':'#e1e1e1',
    '9':'#5484ed','10':'#51b749','11':'#dc2127',
  };

  // ── localStorage helpers ────────────────────────
  const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch(_) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(_) {} };
  const lsDel = k => { try { localStorage.removeItem(k); } catch(_) {} };

  // ── Token management ────────────────────────────
  let _tokenClient = null;
  let _token       = null;   // in-memory cache

  function getToken() {
    if (_token && _token.access_token) return _token;
    const t = lsGet('gcal_token');
    if (t && t.access_token) { _token = t; return t; }
    return null;
  }

  function saveToken(t) { _token = t; lsSet('gcal_token', t); }

  function clearToken() {
    const t = getToken();
    if (t?.access_token && typeof google !== 'undefined') {
      try { google.accounts.oauth2.revoke(t.access_token, () => {}); } catch(_) {}
    }
    _token = null;
    lsDel('gcal_token');
  }

  // ── Config ──────────────────────────────────────
  function getClientId()          { return lsGet('gcal_client_id') || ''; }
  function setClientId(id)        { lsSet('gcal_client_id', id); }
  function getSelectedCals()      { return lsGet('gcal_calendars') || ['primary']; }
  function setSelectedCals(ids)   { lsSet('gcal_calendars', ids); }
  function getDaysBack()          { return lsGet('gcal_days_back')  ?? 30; }
  function getDaysAhead()         { return lsGet('gcal_days_ahead') ?? 90; }
  function setDaysBack(n)         { lsSet('gcal_days_back',  n); }
  function setDaysAhead(n)        { lsSet('gcal_days_ahead', n); }

  // ── Public: is Google Calendar connected ────────
  function isConnected() { return !!getToken(); }
  function isConfigured() { return !!getClientId(); }

  // ── Initialize token client ─────────────────────
  function _ensureClient() {
    if (_tokenClient) return true;
    const clientId = getClientId();
    if (!clientId) return false;
    if (typeof google === 'undefined' || !google.accounts?.oauth2) return false;
    _tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope:     SCOPE,
      callback:  () => {},       // overridden per-call
    });
    return true;
  }

  // ── Sign in (opens Google popup) ────────────────
  async function signIn() {
    if (!_ensureClient()) throw new Error('Google Identity Services not ready');
    return new Promise((resolve, reject) => {
      _tokenClient.callback = resp => {
        if (resp.error) { reject(new Error(resp.error_description || resp.error)); return; }
        saveToken(resp);
        resolve(resp);
      };
      _tokenClient.requestAccessToken({ prompt: isConnected() ? '' : 'consent' });
    });
  }

  // ── Sign out ────────────────────────────────────
  function signOut() { clearToken(); _tokenClient = null; }

  // ── Authenticated API fetch ─────────────────────
  async function _api(path, params = {}) {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    const url = new URL(API_BASE + path);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    const res = await fetch(url.toString(), {
      headers: { Authorization: 'Bearer ' + token.access_token },
    });
    if (res.status === 401) { clearToken(); throw new Error('TOKEN_EXPIRED'); }
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `HTTP ${res.status}`); }
    return res.json();
  }

  // ── List user's calendars ───────────────────────
  async function listCalendars() {
    const data = await _api('/users/me/calendarList', { maxResults: 50 });
    return (data.items || []).map(c => ({
      id:       c.id,
      name:     c.summary,
      primary:  !!c.primary,
      color:    c.backgroundColor || '#4dabf7',
      selected: getSelectedCals().includes(c.id) || (c.primary && getSelectedCals().includes('primary')),
    }));
  }

  // ── Fetch events from one calendar ─────────────
  async function _fetchCalEvents(calendarId) {
    const now       = new Date();
    const timeMin   = new Date(now); timeMin.setDate(now.getDate() - getDaysBack());
    const timeMax   = new Date(now); timeMax.setDate(now.getDate() + getDaysAhead());

    const data = await _api(`/calendars/${encodeURIComponent(calendarId)}/events`, {
      timeMin:      timeMin.toISOString(),
      timeMax:      timeMax.toISOString(),
      singleEvents: true,
      orderBy:      'startTime',
      maxResults:   500,
    });

    return (data.items || [])
      .filter(item => !item.status || item.status !== 'cancelled')
      .map(item => ({
        id:     'gcal_' + item.id,
        title:  item.summary || '(無標題)',
        date:   (item.start?.date || item.start?.dateTime || '').slice(0, 10),
        time:   item.start?.dateTime ? item.start.dateTime.slice(11, 16) : '',
        note:   item.description || '',
        color:  COLOR_MAP[item.colorId] || '#4dabf7',
        source: 'google',
      }))
      .filter(e => e.date);
  }

  // ── Sync: fetch all selected calendars ─────────
  async function syncEvents() {
    const selectedIds = getSelectedCals();
    if (!selectedIds.length) return [];
    const results = await Promise.all(selectedIds.map(id => _fetchCalEvents(id).catch(() => [])));
    const all = results.flat();
    // deduplicate by id
    const seen = new Set();
    return all.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
  }

  return {
    isConnected, isConfigured,
    getClientId, setClientId,
    getSelectedCals, setSelectedCals,
    getDaysBack, getDaysAhead, setDaysBack, setDaysAhead,
    signIn, signOut,
    listCalendars, syncEvents,
  };
})();
