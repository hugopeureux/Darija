/* Darija · application hors ligne générée à partir des leçons du cours.
   Contenu : window.DARIJA (data.js, produit par export_app.py ; chaque ligne, faute et exercice a un identifiant stable).
   Progression : localStorage, clé darija-v2 (fusionnée si deux fenêtres écrivent en même temps). */
(function () {
'use strict';
const D = window.DARIJA;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const view = $('#view');
const HOUR = 3600000;
const byId = {};
D.lessons.forEach(l => { byId[l.id] = l; });
byId.MEMO = D.memo;
// Ordre d'apprentissage : celui des parties (l'annexe de la leçon 13 vient en dernier).
// Ordre d'affichage : l'annexe juste après sa leçon.
const LEARN = D.parts.flatMap(p => p.ids).filter(id => byId[id]);
const navOf = ids => { const o = ids.filter(x => x[0] !== 'A'); ids.filter(x => x[0] === 'A').forEach(a => { const k = o.indexOf('L' + a.slice(1)); o.splice(k < 0 ? o.length : k + 1, 0, a); }); return o; };
const NAV = navOf(LEARN);
const VDATE = /^\d{4}-\d\d-\d\d$/.test(D.version) ? D.version.split('-').reverse().join('/') : String(D.version);
const PARTS = D.parts.map(p => ({ n: p.n, title: p.title, ids: navOf(p.ids.filter(id => byId[id])) }));

/* ======================= utilitaires ======================= */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'", '&#39;': "'" };
const strip = s => String(s ?? '').replace(/<[^>]+>/g, '').replace(/&(amp|lt|gt|quot|#x27|#39);/g, m => ENT[m]);
const noAcc = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
const noHarakat = s => String(s ?? '').replace(/[ً-ْٰـ]/g, '');
const norm = s => noAcc(strip(s).toLowerCase()).replace(/\([^)]*\)/g, '').replace(/[«»"“”?!.,;:…·]/g, ' ').replace(/[\s\-'’]+/g, '');
const simple = s => noAcc(strip(s).toLowerCase()).replace(/\([^)]*\)/g, '').replace(/[«»"“”?!.,;:…]/g, '').replace(/\s+/g, ' ').trim();
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const plural = (n, w) => n + ' ' + w + (n > 1 ? 's' : '');
const lessonLabel = id => id === 'MEMO' ? 'Mémo' : id[0] === 'A' ? 'L' + id.slice(1) + ' annexe' : byId[id] ? 'L' + String(byId[id].n).padStart(2, '0') : id;
const lessonName = id => id[0] === 'A' ? "l'annexe de la leçon " + Number(id.slice(1)) : 'la leçon ' + byId[id].n;
/* Journée d'étude : elle commence à 4 h du matin (réviser à 23 h 50 ou à 1 h compte pour la même journée).
   Tout est calculé en heure locale, ce qui reste juste aux changements d'heure. */
const SHIFT = 4;
const studyStart = (t = Date.now()) => { const d = new Date(t); if (d.getHours() < SHIFT) d.setDate(d.getDate() - 1); d.setHours(SHIFT, 0, 0, 0); return d.getTime(); };
const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); };
const endOfToday = () => addDays(studyStart(), 1) - 1;
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dayKey = (t = Date.now()) => ymd(new Date(studyStart(t)));
const frDate = t => new Date(t).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
function initials(names) {   // la plus courte abréviation qui distingue chaque locuteur (S, Cl, J, Ch…)
  const o = {};
  names.forEach(s => { let k = 1; while (k < s.length && names.some(n => n !== s && n.slice(0, k).toLowerCase() === s.slice(0, k).toLowerCase())) k++; o[s] = s[0].toUpperCase() + s.slice(1, k); });
  return o;
}
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2800); }
function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
function diffHTML(a, b) {   // a = ta réponse, b = la bonne : lettres en trop barrées, lettres manquantes en vert
  const m = a.length, n = b.length, L = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  let i = 0, j = 0, out = '';
  while (i < m || j < n) {
    if (i < m && j < n && a[i] === b[j]) { out += esc(a[i]); i++; j++; }
    else if (j < n && (i >= m || L[i][j + 1] >= L[i + 1][j])) { out += `<span class="add">${esc(b[j])}</span>`; j++; }
    else { out += `<span class="del">${esc(a[i])}</span>`; i++; }
  }
  return out;
}

/* ======================= progression (stockage robuste) ======================= */
const KEY = 'darija-v2', BACKUP_KEY = 'darija-v2-avant-import', V1_KEY = 'darija-progress-v1';
const SETTINGS = { newPerDay: [5, 10, 15, 20, 30], maxReview: [10, 20, 30, 50, 9999], font: [0.9, 1, 1.15, 1.3], arabic: [true, false], phrases: [true, false] };
const DEFAULT_SETTINGS = { newPerDay: 15, maxReview: 20, font: 1, arabic: true, phrases: true };
const NOTE_KINDS = { bug: 'Bug', idee: 'Amélioration', contenu: 'Erreur dans le cours' };
const num = (x, d = 0) => (typeof x === 'number' && isFinite(x) ? x : d);
const DATE = /^\d{4}-\d\d-\d\d$/;
function normalize(p) {   // valide et nettoie une progression (stockée ou importée)
  p = p && typeof p === 'object' ? p : {};
  const now = Date.now();
  const out = { items: {}, days: {}, sessions: [], ex: {}, settings: Object.assign({}, DEFAULT_SETTINGS) };
  for (const [k, s] of Object.entries(p.items && typeof p.items === 'object' ? p.items : {})) {
    if (!s || typeof s !== 'object') continue;
    out.items[k] = { box: Math.max(0, Math.min(8, Math.round(num(s.box)))), due: num(s.due, now), ok: num(s.ok), ko: num(s.ko), lapses: num(s.lapses), first: num(s.first, now), last: num(s.last) };
    if (s.forced) out.items[k].forced = true;
  }
  for (const [d, v] of Object.entries(p.days && typeof p.days === 'object' ? p.days : {})) if (DATE.test(d) && v) out.days[d] = { n: num(v.n), ok: num(v.ok), nw: num(v.nw), b: num(v.b) };
  if (Array.isArray(p.sessions)) out.sessions = p.sessions.filter(s => s && DATE.test(s.d)).map(s => ({ d: s.d, t: String(s.t || '').slice(0, 60), n: num(s.n), ok: num(s.ok), ts: num(s.ts) })).slice(-300);
  for (const [k, v] of Object.entries(p.ex && typeof p.ex === 'object' ? p.ex : {})) if (typeof v === 'string' && DATE.test(v)) out.ex[k] = v;
  for (const f of ['read', 'dlg', 'badges']) { out[f] = {}; for (const [k, v] of Object.entries(p[f] && typeof p[f] === 'object' ? p[f] : {})) if (typeof v === 'string' && DATE.test(v)) out[f][k] = v; }
  out.notes = (Array.isArray(p.notes) ? p.notes : []).filter(n => n && typeof n.id === 'string').map(n => ({ id: n.id.slice(0, 40), ts: num(n.ts, now), upd: num(n.upd, num(n.ts, now)), kind: NOTE_KINDS[n.kind] ? n.kind : 'bug', text: String(n.text || '').slice(0, 3000), ctx: String(n.ctx || '').slice(0, 500), done: !!n.done, del: !!n.del })).slice(-500);
  if (p.settings) for (const k of Object.keys(DEFAULT_SETTINGS)) if (SETTINGS[k].includes(p.settings[k])) out.settings[k] = p.settings[k];
  out.settingsAt = num(p.settingsAt); out.epoch = num(p.epoch); out.created = num(p.created, now);
  out.backup = num(p.backup); out.last = typeof p.last === 'string' ? p.last : null;
  out.persistAsked = !!p.persistAsked; out.persisted = !!p.persisted; out.rev = typeof p.rev === 'string' ? p.rev : '';
  return out;
}
function readStored() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
function mergeNotes(a, b) {   // les notes ne se perdent jamais : union, la version la plus récente de chaque note gagne
  const m = new Map(a.map(n => [n.id, n])); b.forEach(n => { const o = m.get(n.id); if (!o || n.upd > o.upd) m.set(n.id, n); });
  return [...m.values()].sort((x, y) => x.ts - y.ts).slice(-500);
}
function merge(base, mine) { const notes = mergeNotes(base.notes, mine.notes); const out = merge0(base, mine); out.notes = notes; return out; }
function merge0(base, mine) {   // base = version écrite par un autre écran, mine = la nôtre
  if (base.epoch !== mine.epoch) {
    if (mine.epoch > base.epoch) return mine;   // nous venons d'importer ou de tout effacer : notre version gagne
    for (const [k, s] of Object.entries(mine.items)) if (s.last > base.epoch && (!base.items[k] || s.last > base.items[k].last)) base.items[k] = s;
    return base;                                // l'autre écran a importé ou tout effacé : on ne garde que nos réponses plus récentes
  }
  const out = base;
  for (const [k, s] of Object.entries(mine.items)) if (!out.items[k] || s.last > out.items[k].last) out.items[k] = s;
  for (const [d, v] of Object.entries(mine.days)) { const o = out.days[d]; out.days[d] = o ? { n: Math.max(o.n, v.n), ok: Math.max(o.ok, v.ok), nw: Math.max(o.nw, v.nw), b: Math.max(o.b || 0, v.b || 0) } : v; }
  const seen = new Set(out.sessions.map(s => s.ts)); mine.sessions.forEach(s => { if (!seen.has(s.ts)) out.sessions.push(s); });
  out.sessions.sort((a, b) => a.ts - b.ts); out.sessions = out.sessions.slice(-300);
  out.ex = Object.assign({}, out.ex, mine.ex);
  for (const f of ['read', 'dlg', 'badges']) out[f] = Object.assign({}, out[f], mine[f]);
  if (mine.settingsAt > out.settingsAt) { out.settings = mine.settings; out.settingsAt = mine.settingsAt; }
  out.backup = Math.max(out.backup, mine.backup); out.last = mine.last || out.last;
  out.persistAsked = out.persistAsked || mine.persistAsked; out.persisted = out.persisted || mine.persisted;
  return out;
}
let P = normalize(readStored());
let saveFailed = false, syncing = false;
function save() {
  const stored = readStored();
  if (stored && stored.rev && stored.rev !== P.rev) P = merge(normalize(stored), P);   // un autre écran a écrit entre-temps
  P.rev = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  try { localStorage.setItem(KEY, JSON.stringify(P)); saveFailed = false; }
  catch (e) { if (!saveFailed) toast('Impossible d\'enregistrer la progression sur ce téléphone.'); saveFailed = true; }
}
function reloadIfChanged() {   // l'application installée et un onglet Chrome peuvent être ouverts en même temps
  const s = readStored();
  if (!s || !s.rev || s.rev === P.rev) return;
  P = normalize(s); applyFont();
  if (!inSession()) { syncing = true; try { route(true); } finally { syncing = false; } }
}
window.addEventListener('storage', e => { if (e.key === KEY) reloadIfChanged(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { reloadIfChanged(); checkUpdate(); } });
function applyFont() { document.documentElement.style.fontSize = (16 * P.settings.font) + 'px'; }
applyFont();
function askPersist() {   // demande au navigateur de ne pas effacer la progression quand le téléphone manque de place
  if (P.persistAsked || !navigator.storage || !navigator.storage.persist) return;
  P.persistAsked = true; save();
  navigator.storage.persist().then(r => { P.persisted = r; save(); }).catch(() => {});
}

/* ======================= index du contenu ======================= */
const ITEMS = [], IMAP = {}, SYN = {};
LEARN.forEach(id => {
  let sec = '';
  byId[id].blocks.forEach(b => {
    if (b.t === 'h2') sec = strip(b.x);
    if (b.t !== 'v' || b.kind === 'ref') return;
    let prev = null;
    b.rows.forEach(r => {
      const key = r[5];
      if (key && IMAP[key]) { if (!IMAP[key].refs.includes(id)) IMAP[key].refs.push(id); }   // même ligne dans deux leçons : un seul élément
      else if (key) {
        const frp = strip(r[3]), djp = strip(r[4]);
        const ctx = /^(Réponse|→)/.test(frp) && prev ? prev : null;
        const it = { key, id, refs: [id], kind: b.kind, sec, table: strip(b.title || ''), fr: r[0], frp, dj: r[1], djp, ar: r[2], ctx, nf: norm(frp), nd: norm(djp), na: noHarakat(r[2]) };
        const nw = djp.trim().split(/\s+/).length;
        it.writable = !/…/.test(djp) && nw <= 6;
        it.ord = b.kind === 'phr' && nw >= 3 && nw <= 9 && !/[…\/·(]/.test(djp);   // phrase à remettre en ordre
        ITEMS.push(it); IMAP[key] = it;
        (SYN[it.nf] = SYN[it.nf] || []).push(it);
      }
      prev = { dj: r[1] };
    });
  });
});
const LEX = ITEMS.filter(i => i.kind === 'vocab' && !/^[\d¼½¾]/.test(i.frp) && !i.frp.includes('→'))
  .map(it => ({ it, sort: noAcc(it.frp.replace(/^(le |la |les |l'|l’|un |une |des )/i, '').toLowerCase()).replace(/^[^a-z0-9]+/, '') }))
  .sort((a, b) => a.sort.localeCompare(b.sort, 'fr'));
const DIALOGS = [];
NAV.forEach(id => { let di = 0; byId[id].blocks.forEach(b => { if (b.t === 'dlg') DIALOGS.push({ id, idx: di++, title: b.title, lines: b.lines, nl: b.lines.map(x => [norm(x[1]), norm(x[2]), noHarakat(x[3])]) }); }); });
const FIXES = (D.fixes || []).filter(f => byId[f.l]).map(f => ({ key: f.id, id: f.l, refs: [f.l], fix: true, wrong: String(f.wrong), right: String(f.right), fr: '', frp: '', dj: esc(f.right), djp: String(f.right), ar: '', sec: 'Tes corrections', table: '' }));
const FMAP = Object.fromEntries(FIXES.map(f => [f.key, f]));
const ALPHA = (() => {
  const b = byId.L00 && byId.L00.blocks.find(x => x.t === 'v' && x.head && x.head[0] === 'Nom et son');
  return b ? b.rows.map(r => {
    const letter = r[2].split(' · ')[0].trim(), name = strip(r[0]).split(' · ')[0];
    return { key: 'abc|' + letter, id: 'L00', refs: ['L00'], sec: "L'alphabet", table: '', letter, forms: r[2], name, sound: strip(r[0]).split(' · ').slice(1).join(' · '), tr: strip(r[1]), fr: esc(name), dj: esc(strip(r[1])), djp: strip(r[1]), ar: letter };
  }) : [];
})();
const ALL = ITEMS.concat(FIXES);
const findItem = key => IMAP[key] || FMAP[key];

/* ======================= répétition espacée (boîtes de Leitner) ======================= */
// Intervalle en jours selon la boîte. Boîte 0 = nouveau ou raté (à revoir tout de suite).
const INT = [0, 1, 2, 4, 7, 15, 30, 60, 120];
const ACQUIS = 4;   // à partir de la boîte 4 (prochaine révision dans 7 jours ou plus)
const fuzz = n => (n >= 4 ? Math.max(1, Math.round(n * (0.88 + Math.random() * 0.24))) : n);   // évite que tout revienne le même jour
const st = it => P.items[it.key];
const isDue = (it, t = endOfToday()) => { const s = st(it); return !!s && s.due <= t; };
const boxOf = it => (st(it) ? st(it).box : -1);
const fresh = now => ({ box: 0, due: now, ok: 0, ko: 0, lapses: 0, first: now, last: 0 });
function logDay(good, learnedNew) {
  const d = P.days[dayKey()] = P.days[dayKey()] || { n: 0, ok: 0, nw: 0, b: 0 };
  d.n++; if (good) d.ok++; if (learnedNew) d.nw++;
}
function grade(it, g, learning) {   // g : 0 raté, 1 hésité, 2 su
  const now = Date.now(); let s = st(it); const isNew = !s;
  if (!s) s = P.items[it.key] = fresh(now);
  const due = s.box === 0 || s.due <= endOfToday();
  if (g === 0) { s.ko++; if (s.box >= 2) s.lapses++; s.box = 0; s.due = now; delete s.forced; }
  else if (s.forced) { s.ok++; delete s.forced; s.due = addDays(studyStart(), fuzz(Math.max(1, INT[s.box]))); }   // ajouté à la main : réussi, il garde sa boîte
  else if (g === 1) { s.ok++; if (due) { s.box = Math.max(1, s.box); s.due = addDays(studyStart(), Math.max(1, Math.round(INT[s.box] / 2))); } }
  else { s.ok++; if (due) { s.box = Math.min(s.box + 1, INT.length - 1); s.due = addDays(studyStart(), fuzz(INT[s.box])); } }
  s.last = now; logDay(g > 0, isNew && learning); save();
}
function knownAlready(it, spread) {   // « Je connais déjà » et tri : directement en boîte 2 ; premières révisions étalées sur deux semaines
  const now = Date.now(); const s = P.items[it.key] = st(it) || fresh(now);
  s.box = Math.max(s.box, 2); s.due = addDays(studyStart(), 2 + (spread ? Math.floor(Math.random() * 13) : 0)); s.ok++; s.last = now;
}
function addToReview(it) { const now = Date.now(); const s = P.items[it.key] = st(it) || fresh(now); if (s.box >= 1) s.forced = true; s.due = now; s.last = now; save(); }
const dueList = () => ALL.filter(i => isDue(i)).sort((a, b) => st(a).due - st(b).due);
const newToday = () => (P.days[dayKey()] || {}).nw || 0;
const nextNew = (n, ids) => ITEMS.filter(i => !st(i) && (!ids || i.refs.some(r => ids.includes(r))) && (P.settings.phrases || i.kind !== 'phr')).slice(0, n);
function streak() {
  let n = 0, t = studyStart();
  if (!(P.days[dayKey(t)] || {}).n) t = addDays(t, -1);   // la série continue tant qu'on n'a pas encore révisé aujourd'hui
  while ((P.days[dayKey(t)] || {}).n) { n++; t = addDays(t, -1); }
  return n;
}
function lessonStats(id) {
  const its = ITEMS.filter(i => i.refs.includes(id));
  return { n: its.length, seen: its.filter(i => st(i)).length, known: its.filter(i => boxOf(i) >= ACQUIS).length, due: its.filter(i => isDue(i)).length };
}
// Progression de la première version de l'application (clés « leçon|darija ») : reprise une seule fois.
function fromV1(old) {
  const out = { items: {}, sessions: [] }, now = Date.now();
  for (const [k, s] of Object.entries(old.items || {})) {
    const m = /^([LA]\d\d)\|(.*)$/.exec(k); if (!m || !s) continue;
    const it = ITEMS.find(i => i.refs.includes(m[1]) && i.djp === m[2]) || ITEMS.find(i => i.djp === m[2]);
    if (!it || out.items[it.key]) continue;
    const box = Math.min(3, Math.max(0, Math.round(num(s.streak))));
    out.items[it.key] = { box, due: box ? addDays(studyStart(), 1 + Math.floor(Math.random() * INT[box] * 2)) : now, ok: num(s.ok), ko: num(s.ko), lapses: 0, first: num(s.last, now), last: num(s.last, now) };
  }
  return out;
}
(function migrateV1() {
  if (readStored()) return;
  let old = null; try { old = JSON.parse(localStorage.getItem(V1_KEY) || 'null'); } catch (e) {}
  if (!old || !old.items || !Object.keys(old.items).length) return;
  P = normalize(fromV1(old)); save();
})();

/* ======================= rendu des blocs ======================= */
const IC = {
  vocab: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-4a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h5z"/></svg>',
  phr: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v10H9l-5 4z"/></svg>',
  rule: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h10M4 18h13"/></svg>',
  tip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/></svg>',
  cult: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
  dlg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h12v8H7l-4 3z"/><path d="M9 15v2h8l4 3V9h-4"/></svg>',
  fix: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4-1 11-11-3-3L5 16z"/></svg>',
};
const LABELS = { vocab: 'Vocabulaire', conj: 'Conjugaison', forms: 'Formes', ref: 'Référence' };
const CULT = ['Culture', 'Au café', 'Taxi', 'Bssa77a'];
const chip = (attrs, on, text) => `<button type="button" class="chip ${on ? 'on' : ''}" ${attrs} aria-pressed="${on ? 'true' : 'false'}">${text}</button>`;
function vHTML(b) {
  const tt = b.title ? `<span class="tt">${b.title}</span>` : '';
  if (b.kind === 'phr') return `<div class="lab l-phr">${IC.phr}Phrases modèles${tt}</div><div class="phr">${b.rows.map(r => `<div class="s rv" ${r[5] ? `data-k="${esc(r[5])}"` : ''}><div class="fr">${r[0]}</div><div class="dj">${r[1]}</div><div class="ar">${esc(r[2])}</div></div>`).join('')}</div>`;
  const alpha = b.head && b.head[0] === 'Nom et son';
  return `<div class="lab l-vocab">${IC.vocab}${LABELS[b.kind] || 'Vocabulaire'}${tt}</div><div class="vocab ${b.kind === 'conj' ? 'conj' : ''}">${b.rows.map(r => `<div class="it rv" ${r[5] ? `data-k="${esc(r[5])}"` : ''}><div class="fr">${r[0]}</div><div class="dj">${r[1]}</div><div class="ar">${esc(alpha ? r[2].replace(/ · /g, '   ') : r[2])}</div></div>`).join('')}</div>`;
}
function blockHTML(b, l, extra) {
  if (b.t === 'h2') return `<h2 id="s${extra}">${b.x}</h2>`;
  if (b.t === 'h3') return `<h3>${b.x}</h3>`;
  if (b.t === 'v') return vHTML(b);
  if (b.t === 'rule') {
    const isCult = !b.title && b.p.some(p => /Main sur le cœur|Se marchandent|d-dar darkoum/.test(String(p)));
    const body = b.p.map(p => Array.isArray(p) ? `<ul>${p.map(i => `<li>${i}</li>`).join('')}</ul>` : `<p>${p}</p>`).join('');
    if (isCult) return `<div class="cult"><div class="lab l-cult">${IC.cult}Culture</div>${body}</div>`;
    return `<div class="rule"><div class="lab">${IC.rule}Règle${b.title ? `<span class="tt">${b.title}</span>` : ''}</div>${body}</div>`;
  }
  if (b.t === 'tip') {
    if (/^(Tes corrections|Ton erreur|Tes erreurs)/.test(b.title)) return `<div class="fix"><div class="lab l-fix">${IC.fix}Tes corrections</div>${b.x.replace(/<i>([^<]+?)<\/i>(\s*)→/g, '<s>$1</s>$2→')}</div>`;
    if (CULT.includes(b.title)) return `<div class="cult"><div class="lab l-cult">${IC.cult}Culture · ${esc(b.title)}</div>${b.x}</div>`;
    return `<div class="tip"><div class="lab l-tip">${IC.tip}${esc(b.title || 'Astuce')}</div>${b.x}</div>`;
  }
  if (b.t === 'dlg') return dialogHTML({ id: l.id, idx: extra, title: b.title, lines: b.lines }, 'read') + `<a class="btn small ghost" href="#/dialogue/${l.id}/${extra}">S'entraîner sur ce dialogue</a>`;
  return '';
}
function dialogHTML(d, mode) {   // mode : read | nofr | role:<locuteur>
  const sp = [...new Set(d.lines.map(x => x[0]))]; const ini = initials(sp);
  const role = mode.startsWith('role:') ? mode.slice(5) : null;
  return `<div class="lab l-dlg">${IC.dlg}Dialogue<span class="tt">${d.title}</span></div><div class="dlg"><div class="cast">${sp.map(s => `<b>${esc(ini[s])}</b> = ${esc(s)}`).join(' · ')}</div>${d.lines.map(x => {
    const me = role === x[0]; const hdj = me ? 'hid' : ''; const hfr = mode === 'nofr' ? 'hid' : '';
    return `<div class="ln ${me ? 'me' : ''}"><div class="who" title="${esc(x[0])}" aria-label="${esc(x[0])}">${esc(ini[x[0]])}</div><div class="bub" ${hdj || hfr ? 'role="button" tabindex="0"' : ''}><div class="dj ${hdj}">${x[2]}</div><div class="ar ${hdj}">${esc(x[3])}</div><div class="fr ${hfr}">${x[1]}</div></div></div>`;
  }).join('')}</div>`;
}
function exHTML(b, n) {
  const aligned = b.ans.length && b.ans.length === b.items.length;
  const items = b.items.length ? `<ol>${b.items.map((i, k) => `<li>${i[0]}${i[1] ? `<div class="tr">${i[1]}</div>` : ''}<input type="text" placeholder="Ta réponse" aria-label="Ta réponse ${k + 1}" autocomplete="off" autocapitalize="off" spellcheck="false">${aligned ? `<div class="sol" hidden>${b.ans[k][0]}${b.ans[k][1] ? `<div class="tr">${b.ans[k][1]}</div>` : ''}</div>` : ''}</li>`).join('')}</ol>` : '<div style="padding:0 .8rem"><textarea aria-label="Ta réponse" placeholder="Écris ta réponse ici (elle n\'est pas enregistrée)"></textarea></div>';
  const p = b.p.map(x => `<div class="q" style="font-weight:400">${x[0]}${x[1] ? `<div class="tr">${x[1]}</div>` : ''}</div>`).join('');
  const glob = b.ans.length && !aligned ? `<ol class="sol" hidden style="margin:0 .8rem .6rem;padding-left:2rem">${b.ans.map(a => `<li>${a[0]}${a[1] ? `<div class="tr">${a[1]}</div>` : ''}</li>`).join('')}</ol>` : '';
  const done = P.ex[b.id];
  return `<div class="ex" data-ex="${esc(b.id)}"><div class="hd">Exercice ${n}<span class="done">${done ? '✓ fait le ' + esc(done) : ''}</span></div><div class="q">${b.q}</div>${p}${items}${glob}
    <div class="foot">${b.ans.length ? '<button type="button" class="btn small" data-sol>Voir le corrigé</button>' : ''}<button type="button" class="btn small ghost" data-done>${done ? 'Refaire plus tard' : 'Marquer comme fait'}</button></div></div>`;
}
// l'arabe est déclaré comme tel (lecteur d'écran, police, césure)
new MutationObserver(() => $$('.ar:not([lang])', view).forEach(e => { e.lang = 'ar'; })).observe(view, { childList: true, subtree: true });

/* ======================= cadre des écrans ======================= */
let R = null;   // séance en cours
const inSession = () => !!R && R.i < R.tasks.length;
function setHead(title, back) {
  $('#title').textContent = title; $('#back').hidden = !back;
  document.title = title === 'Aujourd\'hui' ? 'Darija' : title + ' · Darija';
  const h = location.hash || '#/';
  const tab = h === '#/' || h === '#' || h.startsWith('#/libre') || h.startsWith('#/aide') || h.startsWith('#/notes') ? 'home'
    : h.startsWith('#/lecon') || h.startsWith('#/memo') || h.startsWith('#/tri') ? 'lecons' : h.startsWith('#/lexique') ? 'lexique'
    : h.startsWith('#/dialogue') ? 'dialogues' : h.startsWith('#/progres') || h.startsWith('#/reglages') ? 'progres' : '';
  $$('#tabs a').forEach(a => { const on = a.dataset.tab === tab; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
}
$('#back').onclick = () => { if (history.length > 1) history.back(); else location.replace('#/'); };
const upBtn = $('#up');
// Barre « Séance en cours » : visible sur tous les écrans quand on a quitté une séance sans la finir (bouton retour…)
const rbar = document.createElement('div'); rbar.id = 'resumebar'; rbar.hidden = true; rbar.setAttribute('role', 'region'); rbar.setAttribute('aria-label', 'Séance en cours');
document.body.appendChild(rbar);
function updateResumeBar(onSession) {
  const show = inSession() && !onSession;
  rbar.hidden = !show; document.body.classList.toggle('has-resume', show);
  if (!show) return;
  rbar.innerHTML = `<span>Séance en cours · ${esc(R.title)} · ${R.i}/${R.tasks.length}</span><button type="button" id="rb-go">Reprendre</button><button type="button" id="rb-x" aria-label="Terminer la séance" title="Terminer la séance">✕</button>`;
  $('#rb-go').onclick = () => { location.hash = '#/session'; };
  $('#rb-x').onclick = () => { finalize(); R = null; updateResumeBar(); };
}
window.addEventListener('scroll', () => { upBtn.hidden = window.scrollY < 900 || document.body.classList.contains('in-session'); }, { passive: true });
upBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });

/* ======================= bloc-notes (bugs, idées, erreurs du cours) ======================= */
const liveNotes = () => P.notes.filter(n => !n.del);
function updateBadge() { const b = $('#nbadge'); if (!b) return; const n = liveNotes().filter(x => !x.done).length; b.hidden = !n; b.textContent = n; }
function addNote(kind, text, ctx) {
  const now = Date.now();
  P.notes.push({ id: now.toString(36) + Math.random().toString(36).slice(2, 6), ts: now, upd: now, kind, text: text.trim().slice(0, 3000), ctx: String(ctx || '').slice(0, 500), done: false, del: false });
  save(); updateBadge();
}
const itemCtx = it => `${lessonLabel(it.id)} · ${it.key} · ${it.fix ? 'faute relevée : ' + it.wrong + ' → ' + it.right : (it.frp || it.name || '') + ' → ' + it.djp + (it.ar ? ' (' + it.ar + ')' : '')}`;
function screenLabel(h) {
  const p = (h || '#/').replace(/^#\/?/, '').split('/');
  const names = { '': 'Accueil', lecons: 'Leçons', lexique: 'Lexique', dialogues: 'Dialogues', session: 'Séance', libre: 'Séance libre', progres: 'Progrès', reglages: 'Réglages', aide: 'Aide', memo: 'Mémo', notes: 'Notes' };
  if (p[0] === 'lecon' && byId[p[1]]) return 'Leçon ' + lessonLabel(p[1]);
  if (p[0] === 'tri' && byId[p[1]]) return 'Tri ' + lessonLabel(p[1]);
  if (p[0] === 'dialogue') { const d = DIALOGS.find(x => x.id === p[1] && x.idx === +p[2]); return 'Dialogue ' + lessonLabel(p[1] || '') + (d ? ' · ' + strip(d.title) : ''); }
  return names[p[0]] || 'Accueil';
}
function noteSheet(ctx, kind) {   // petite fenêtre « Signaler » ouverte depuis une carte, une ligne de leçon, un dialogue…
  const old = $('#sheet'); if (old) old.remove();
  let k = kind || 'contenu';
  const el = document.createElement('div'); el.id = 'sheet';
  el.innerHTML = `<div class="sheet-in" role="dialog" aria-label="Ajouter une note"><h3>Signaler ou noter</h3><div class="muted nctx">${esc(ctx)}</div>
    <div class="chips" id="nk">${Object.entries(NOTE_KINDS).map(([v, t]) => chip(`data-v="${v}"`, v === k, t)).join('')}</div>
    <textarea id="nt" placeholder="Qu'est-ce qui ne va pas, ou que faudrait-il améliorer ?" aria-label="Ta note"></textarea>
    <div class="row2"><button type="button" class="btn ghost" id="nc">Annuler</button><button type="button" class="btn" id="ns">Enregistrer</button></div></div>`;
  document.body.appendChild(el);
  const close = () => el.remove();
  $('#nk', el).onclick = e => { const c = e.target.closest('.chip'); if (!c) return; k = c.dataset.v; $$('#nk .chip', el).forEach(x => { x.classList.toggle('on', x === c); x.setAttribute('aria-pressed', x === c); }); };
  $('#nc', el).onclick = close; el.onclick = e => { if (e.target === el) close(); };
  $('#ns', el).onclick = () => { const t = $('#nt', el).value.trim(); if (!t) return $('#nt', el).focus(); addNote(k, t, ctx); close(); toast('Note enregistrée. Retrouve-la avec le crayon, en haut.'); };
  setTimeout(() => $('#nt', el).focus(), 50);
}
function notesText() {
  const fmt = n => `[${new Date(n.ts).toLocaleString('fr-FR')}] ${NOTE_KINDS[n.kind]}${n.done ? ' (réglée)' : ''}\n  Où : ${n.ctx || '—'}\n  ${n.text.replace(/\n/g, '\n  ')}`;
  const all = liveNotes(); const open = all.filter(n => !n.done), done = all.filter(n => n.done);
  return `Notes de l'application Darija\nExportées le ${new Date().toLocaleString('fr-FR')} · contenu ${D.hash} du ${VDATE}\n\n== À traiter (${open.length}) ==\n\n${open.map(fmt).join('\n\n') || '(aucune)'}\n\n== Réglées (${done.length}) ==\n\n${done.map(fmt).join('\n\n') || '(aucune)'}\n`;
}
let noteKind = 'bug', prevHash = '#/';
function screenNotes() {
  setHead('Mes notes', true);
  const all = liveNotes().slice().reverse(); const open = all.filter(n => !n.done), done = all.filter(n => n.done);
  const card = n => `<div class="card note ${n.done ? 'isdone' : ''}" data-id="${esc(n.id)}"><div class="nh"><span class="tag t-${n.kind}">${NOTE_KINDS[n.kind]}</span><span class="muted">${new Date(n.ts).toLocaleDateString('fr-FR')}</span></div>
    ${n.ctx ? `<div class="muted nctx">${esc(n.ctx)}</div>` : ''}<div class="ntext">${esc(n.text)}</div>
    <div class="chips"><button type="button" class="btn small ghost" data-done>${n.done ? 'Rouvrir' : 'Marquer réglée'}</button><button type="button" class="btn small ghost" data-del>Supprimer</button></div></div>`;
  view.innerHTML = `<p class="muted">Note ici un bug, une idée ou une erreur dans le cours. Le bouton « Signaler », sur chaque carte de séance et chaque ligne de leçon, ajoute tout seul l'endroit exact. Envoie-moi ensuite tes notes : je les lis et je corrige.</p>
  <div class="card"><div class="chips" id="nk">${Object.entries(NOTE_KINDS).map(([v, t]) => chip(`data-v="${v}"`, v === noteKind, t)).join('')}</div>
    <textarea id="nt" placeholder="Écris ta note…" aria-label="Nouvelle note"></textarea><button type="button" class="btn wide" id="na">Ajouter la note</button></div>
  <div class="chips"><button type="button" class="btn small" id="nsend" ${all.length ? '' : 'disabled'}>Envoyer mes notes</button><button type="button" class="btn small ghost" id="ncopy" ${all.length ? '' : 'disabled'}>Copier le texte</button></div>
  <div class="lab">À traiter (${open.length})</div>${open.map(card).join('') || '<p class="muted">Aucune note en attente.</p>'}
  ${done.length ? `<div class="lab">Réglées (${done.length})</div>${done.map(card).join('')}` : ''}`;
  $('#nk').onclick = e => { const c = e.target.closest('.chip'); if (!c) return; noteKind = c.dataset.v; $$('#nk .chip').forEach(x => { x.classList.toggle('on', x === c); x.setAttribute('aria-pressed', x === c); }); };
  $('#na').onclick = () => { const t = $('#nt').value.trim(); if (!t) return $('#nt').focus(); addNote(noteKind, t, 'Écran : ' + screenLabel(prevHash)); screenNotes(); };
  $('#nsend').onclick = () => {
    const name = 'darija-notes-' + dayKey() + '.txt'; const file = new File([notesText()], name, { type: 'text/plain' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: 'Notes darija' }).catch(() => {});
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 10000); toast('Fichier de notes enregistré.'); }
  };
  $('#ncopy').onclick = () => { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(notesText()).then(() => toast('Notes copiées.')).catch(() => toast('Copie impossible : utilise « Envoyer ».')); else toast('Copie impossible : utilise « Envoyer ».'); };
  view.onclick = e => {
    const c = e.target.closest('.note'); if (!c) return; const n = P.notes.find(x => x.id === c.dataset.id); if (!n) return;
    if (e.target.closest('[data-done]')) { n.done = !n.done; n.upd = Date.now(); save(); updateBadge(); screenNotes(); }
    else if (e.target.closest('[data-del]')) { if (!confirm('Supprimer cette note ?')) return; n.del = true; n.text = ''; n.upd = Date.now(); save(); updateBadge(); screenNotes(); }
  };
}

/* ======================= parcours du jour, badges, encouragements ======================= */
const hasWord = w => ITEMS.some(i => i.djp.toLowerCase().split(/[^a-z0-9']+/).includes(w));
const MZ = hasWord('mzyan') && hasWord('bzzaf');   // encouragements en darija seulement si les mots sont dans le cours
const HELLO = ITEMS.find(i => i.nd === norm('s-salamou 3alikoum')) || null;
function bonus() { const d = P.days[dayKey()] = P.days[dayKey()] || { n: 0, ok: 0, nw: 0, b: 0 }; d.b = (d.b || 0) + 1; save(); }
function daily() {   // les trois étapes de la journée
  const due = dueList(); const left = Math.max(0, P.settings.newPerDay - newToday());
  const avail = nextNew(Math.max(left, 1)); const t = P.days[dayKey()] || { n: 0, ok: 0, nw: 0, b: 0 };
  const s1 = !due.length, s2 = left === 0 || !avail.length, s3 = (t.b || 0) > 0;
  return { due, left, avail, t, s1, s2, s3, done: [s1, s2, s3].filter(Boolean).length };
}
function nextDialogue() {   // un dialogue d'une leçon déjà commencée, le moins récemment travaillé
  const pool = DIALOGS.filter(d => lessonStats(d.id).seen > 0); const list = pool.length ? pool : DIALOGS;
  return list.slice().sort((a, b) => (P.dlg[a.id + '/' + a.idx] || '').localeCompare(P.dlg[b.id + '/' + b.idx] || ''))[0];
}
function bestStreak() {
  const ks = Object.keys(P.days).filter(k => P.days[k].n).sort(); let best = 0, run = 0, prev = null;
  ks.forEach(k => { const t = new Date(k + 'T12:00:00').getTime(); run = prev !== null && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = t; });
  return best;
}
const acquired = () => ALL.filter(i => boxOf(i) >= ACQUIS).length;
const mastered = id => { const s = lessonStats(id); return s.n > 0 && s.known / s.n >= 0.8; };
const BADGES = [
  ['s1', 'Première séance', 'Terminer une séance', () => P.sessions.length >= 1],
  ['d3', '3 jours de suite', 'Réviser 3 jours d\'affilée', () => bestStreak() >= 3],
  ['d7', 'Une semaine', 'Réviser 7 jours d\'affilée', () => bestStreak() >= 7],
  ['d30', 'Un mois', 'Réviser 30 jours d\'affilée', () => bestStreak() >= 30],
  ['k50', '50 acquis', '50 éléments acquis', () => acquired() >= 50],
  ['k200', '200 acquis', '200 éléments acquis', () => acquired() >= 200],
  ['k500', '500 acquis', '500 éléments acquis', () => acquired() >= 500],
  ['k1000', '1000 acquis', '1000 éléments acquis', () => acquired() >= 1000],
  ['l1', 'Leçon maîtrisée', '80 % d\'une leçon acquis', () => LEARN.some(mastered)],
  ['p1', 'Les bases', 'Toute la partie 1 maîtrisée', () => PARTS[0].ids.filter(id => lessonStats(id).n).every(mastered)],
  ['f10', 'Fautes corrigées', '10 fautes relevées acquises', () => FIXES.filter(f => boxOf(f) >= ACQUIS).length >= 10],
  ['g5', 'Comédien', '5 dialogues joués', () => Object.keys(P.dlg).length >= 5],
  ['e5', 'Studieux', '5 exercices de leçon faits', () => Object.keys(P.ex).length >= 5],
];
function checkBadges() {   // renvoie les badges qui viennent d'être gagnés
  const got = BADGES.filter(b => !P.badges[b[0]] && b[3]());
  if (got.length) { got.forEach(b => { P.badges[b[0]] = dayKey(); }); save(); }
  return got;
}
function celebrate() {
  const c = document.createElement('div'); c.className = 'confetti'; c.setAttribute('aria-hidden', 'true');
  c.innerHTML = Array.from({ length: 18 }, (_, k) => `<i style="left:${4 + k * 5.3}%;animation-delay:${(k % 6) * 0.09}s;background:${['#0f6e64', '#e8bd57', '#b5432b', '#3a4f8f'][k % 4]}"></i>`).join('');
  document.body.appendChild(c); setTimeout(() => c.remove(), 2400);
}
function itemPanel(r, it, links) {   // fiche d'un mot : état, « Réviser aujourd'hui », « Signaler »
  const open = $('.more', r); if (open) { open.remove(); return; }
  const s = st(it);
  const state = !s ? 'Pas encore appris' : s.box >= ACQUIS ? 'Acquis · prochaine révision ' + frDate(s.due) : isDue(it) ? 'À réviser aujourd\'hui' : 'Prochaine révision : ' + frDate(s.due);
  r.insertAdjacentHTML('beforeend', `<div class="more"><span class="muted" style="font-size:.8rem;width:100%">${state}</span>${isDue(it) ? '' : '<button type="button" class="btn small" data-add>Réviser aujourd\'hui</button>'}<button type="button" class="btn small ghost" data-note>Signaler</button>${links ? it.refs.map(x => `<a class="btn small ghost" href="#/lecon/${x}">${lessonLabel(x)}</a>`).join('') : ''}</div>`);
  const add = $('[data-add]', r);
  if (add) add.onclick = ev => { ev.stopPropagation(); addToReview(it); toast('Ajouté aux révisions du jour.'); $('.more', r).remove(); };
  $('[data-note]', r).onclick = ev => { ev.stopPropagation(); noteSheet(itemCtx(it), 'contenu'); };
}

/* ---------- Aujourd'hui ---------- */
let celebrated = '';
function screenHome() {
  setHead('Aujourd\'hui');
  const d = daily(); const { due, left, avail, t } = d; const dueFix = due.filter(i => i.fix).length;
  const nLearn = Math.min(left, nextNew(left).length);
  const fixTodo = FIXES.filter(f => !st(f) || (boxOf(f) < ACQUIS && isDue(f))).length;
  const upcoming = ALL.filter(i => st(i) && st(i).due > endOfToday()).sort((a, b) => st(a).due - st(b).due);
  const nextDay = upcoming.length ? studyStart(st(upcoming[0]).due) : 0;
  const nextCount = nextDay ? upcoming.filter(i => studyStart(st(i).due) === nextDay).length : 0;
  const isFresh = !Object.keys(P.items).length;
  const firstTri = LEARN.find(x => nextNew(1, [x]).length);
  const backupOld = Object.keys(P.items).length > 40 && (!P.backup || Date.now() - P.backup > 14 * 24 * HOUR);
  const sk = streak(); const dg = nextDialogue();
  const curId = avail.length ? avail[0].id : (P.last && byId[P.last] && P.last !== 'MEMO' ? P.last : null); const cur = curId ? byId[curId] : null; const cs = curId ? lessonStats(curId) : null;
  const first = !d.s1 ? 1 : !d.s2 ? 2 : !d.s3 ? 3 : 0;   // la prochaine étape est mise en avant
  const step = (n, done, title, sub, action) => `<div class="step ${done ? 'done' : ''} ${first === n ? 'now' : ''}"><div class="dot" aria-hidden="true">${done ? '✓' : n}</div><div class="sb"><div class="st">${title}${done ? ' <span class="muted">· fait</span>' : ''}</div><div class="muted ss">${sub}</div>${action}</div></div>`;
  const s1sub = due.length ? `${plural(due.length, 'élément')} à revoir, juste avant de les oublier.${dueFix ? ` Dont ${plural(dueFix, 'faute relevée')}.` : ''}` : (nextCount ? `Prochaine révision : ${plural(nextCount, 'élément')} ${nextDay === addDays(studyStart(), 1) ? 'demain' : 'le ' + frDate(nextDay)}.` : 'Rien à revoir pour l\'instant.');
  const s2sub = avail.length ? `Suite du cours : ${lessonLabel(avail[0].id)} · ${esc(avail[0].sec)}` : 'Tu as vu tous les éléments du cours.';
  view.innerHTML = `${HELLO ? `<div class="hello"><span class="dj">${HELLO.dj}</span><span class="ar">${esc(HELLO.ar)}</span></div>` : ''}
  ${isFresh && firstTri ? `<div class="card" style="border-color:var(--v)"><h3>Premiers pas</h3><div class="muted">Tu as déjà suivi ces leçons avec ton prof : trie-les une par une en cochant ce que tu sais déjà dire. Ce que tu connais part en révision espacée ; le reste sera appris quelques éléments par jour.</div><div class="row2"><a class="btn small" href="#/tri/${firstTri}">Trier ${lessonName(firstTri)}</a><a class="btn small ghost" href="#/aide">Comment ça marche&nbsp;?</a></div></div>` : ''}
  <div class="card path"><div class="phead"><h3>Ton parcours du jour</h3><span class="pcount">${d.done}/3</span></div><div class="bar"><i style="width:${d.done / 3 * 100}%"></i></div>
    ${d.done === 3 ? `<div class="win">Journée complète${MZ ? ' · <b>mzyan bzzaf !</b>' : ' · bravo !'}${sk ? ` Série : ${plural(sk, 'jour')}.` : ''}</div>` : ''}
    ${step(1, d.s1, 'Réviser', s1sub, `<button type="button" class="btn wide ${first === 1 ? '' : 'ghost'}" id="rev" ${due.length ? '' : 'disabled'}>Réviser${due.length ? ' (' + Math.min(due.length, P.settings.maxReview) + ')' : ''}</button>`)}
    ${step(2, d.s2, 'Apprendre', s2sub, left ? `<button type="button" class="btn wide ${first === 2 ? '' : 'ghost'}" id="learn" ${nLearn ? '' : 'disabled'}>Apprendre${nLearn ? ' (' + nLearn + ')' : ''}</button>` : `<button type="button" class="btn wide ghost" id="more" ${avail.length ? '' : 'disabled'}>Objectif atteint · encore 5</button>`)}
    ${step(3, d.s3, 'Pratiquer', d.s3 ? 'Fait pour aujourd\'hui. Tu peux continuer si tu veux.' : 'Au choix : un dialogue, tes fautes relevées ou un exercice de leçon.', `${dg ? `<a class="btn wide ${first === 3 ? '' : 'ghost'}" href="#/dialogue/${dg.id}/${dg.idx}">Jouer un dialogue · ${lessonLabel(dg.id)}</a>` : ''}${fixTodo ? `<button type="button" class="btn wide ghost" id="fixes">Retravailler mes fautes (${fixTodo})</button>` : ''}`)}
  </div>
  ${cur ? `<a class="card lrow" href="#/lecon/${curId}"><div class="num ${curId[0] === 'A' ? 'sm' : ''}">${curId[0] === 'A' ? 'Annexe' : cur.n}</div><div style="flex:1;min-width:0"><div class="s">Tu en es là dans le cours</div><div class="t">${cur.title}</div>${cs.n ? `<div class="bar"><i style="width:${cs.known / cs.n * 100}%"></i><i class="seen" style="width:${(cs.seen - cs.known) / cs.n * 100}%"></i></div><div class="legend">${cs.known} acquis · ${cs.seen} vus sur ${cs.n}</div>` : ''}</div></a>` : ''}
  ${backupOld ? `<div class="card" style="border-color:var(--tip)"><b>Pense à sauvegarder ta progression.</b><div class="muted">Elle n'existe que sur ce téléphone.</div><a class="btn small" href="#/progres/sauvegarde" style="margin-top:.4rem">Exporter</a></div>` : ''}
  <div class="stats"><div class="card"><div class="big">${sk}</div><div class="muted">jour${sk > 1 ? 's' : ''} de suite</div></div><div class="card"><div class="big">${t.n}</div><div class="muted">réponses aujourd'hui</div></div><div class="card"><div class="big">${acquired()}</div><div class="muted">acquis sur ${ALL.length}</div></div></div>
  <div class="card"><h3>Séance libre</h3><div class="muted">Envie d'autre chose ? Paires, phrases à remettre en ordre, cartes, QCM, écriture, lecture de l'arabe, alphabet…</div><a class="btn wide ghost" href="#/libre">Composer une séance</a></div>
  <div class="chips"><a class="chip" href="#/memo">Mémo de grammaire</a><a class="chip" href="#/lexique">Lexique</a><a class="chip" href="#/notes">Mes notes</a><a class="chip" href="#/aide">Comment ça marche&nbsp;?</a></div>`;
  if ($('#rev')) $('#rev').onclick = () => startReview();
  if ($('#learn')) $('#learn').onclick = () => startLearn(nextNew(left));
  if ($('#more')) $('#more').onclick = () => startLearn(nextNew(5));
  if ($('#fixes')) $('#fixes').onclick = () => startFixes();
  if (d.done === 3 && t.n > 0 && celebrated !== dayKey()) { celebrated = dayKey(); celebrate(); }
}

/* ---------- Leçons ---------- */
function lessonSteps(id) {   // étapes d'une leçon : lire, mots, dialogues, exercices
  const l = byId[id], s = lessonStats(id);
  const dl = DIALOGS.filter(d => d.id === id), ex = l.blocks.filter(b => b.t === 'ex');
  return { s, read: P.read[id], dl: dl.length, dlDone: dl.filter(d => P.dlg[id + '/' + d.idx]).length, ex: ex.length, exDone: ex.filter(b => P.ex[b.id]).length };
}
function screenLessons() {
  setHead('Leçons');
  const curId = (nextNew(1)[0] || {}).id;
  view.innerHTML = PARTS.map(p => `<div class="part">Partie ${esc(p.n)} · ${esc(p.title)}</div>` + p.ids.map(id => {
    const l = byId[id], q = lessonSteps(id), s = q.s;
    const k = s.n ? Math.round(s.known / s.n * 100) : 0, v = s.n ? Math.round((s.seen - s.known) / s.n * 100) : 0;
    const status = !s.n ? '' : mastered(id) ? '<span class="tag t-ok">Maîtrisée</span>' : s.seen ? '<span class="tag t-run">En cours</span>' : '<span class="tag">À découvrir</span>';
    const steps = [q.read ? 'Lue ✓' : 'À lire', q.dl ? `Dialogues ${q.dlDone}/${q.dl}` : '', q.ex ? `Exercices ${q.exDone}/${q.ex}` : ''].filter(Boolean).join(' · ');
    const prog = s.n ? `<div class="bar"><i style="width:${k}%"></i><i class="seen" style="width:${v}%"></i></div><div class="legend">${s.known} acquis · ${s.seen} vus sur ${s.n}${s.due ? ' · ' + s.due + ' à réviser' : ''}</div><div class="legend">${steps}</div>`
      : `<div class="legend">${id === 'L00' ? 'Référence : l\'alphabet se travaille dans la leçon et en séance libre.' : 'Pas d\'éléments à mémoriser.'}</div>`;
    return `<a class="card lrow ${id === curId ? 'cur' : ''}" href="#/lecon/${id}"><div class="num ${id[0] === 'A' ? 'sm' : ''}">${id[0] === 'A' ? 'Annexe' : l.n}</div><div style="flex:1;min-width:0"><div class="t">${l.title} ${status}</div>${id === curId ? '<div class="here">Tu en es là</div>' : ''}<div class="s">${l.sub}</div>${prog}</div></a>`;
  }).join('')).join('')
  + `<div class="part">En fin de cours</div><a class="card lrow" href="#/memo"><div class="num sm">Mémo</div><div><div class="t">Mémo de grammaire</div><div class="s">Pronoms, possessifs, avoir, passé, présent, futur, devoir, négation.</div></div></a>
  <a class="card lrow" href="#/lexique"><div class="num sm">A-Z</div><div><div class="t">Lexique et recherche</div><div class="s">${LEX.length} mots, et toutes les phrases et répliques.</div></div></a>
  <p class="count">Contenu du ${esc(VDATE)} (${esc(D.hash)}) · ${ITEMS.length} éléments · ${FIXES.length} fautes relevées · ${DIALOGS.length} dialogues.</p>`;
}
let lessonMode = 'read';
function screenLesson(id) {
  if (id === 'MEMO') return screenMemo();
  const l = byId[id]; if (!l) return screenLessons();
  if (!syncing && P.last !== id) { P.last = id; save(); }
  setHead(id[0] === 'A' ? 'Annexe de la leçon ' + Number(id.slice(1)) : `Leçon ${l.n}`, true);
  const s = lessonStats(id); const nNew = nextNew(9999, [id]).length;
  let hi = 0, dl = 0, ex = 0; const secs = [];
  const body = l.blocks.map(b => {
    if (b.t === 'h2') { secs.push([hi, strip(b.x)]); return blockHTML(b, l, hi++); }
    if (b.t === 'dlg') return blockHTML(b, l, dl++);
    if (b.t === 'ex') return exHTML(b, ++ex);
    return blockHTML(b, l);
  }).join('');
  const k = NAV.indexOf(id), prev = NAV[k - 1], next = NAV[k + 1];
  view.innerHTML = `<h1 class="lt">${l.title}</h1><div class="ar" style="text-align:left">${esc(l.ar)}</div><p class="muted" style="margin:.2rem 0">${l.sub}</p>
  ${s.n ? `<div class="legend">${s.known} acquis · ${s.seen} vus sur ${s.n} éléments${s.due ? ' · ' + s.due + ' à réviser' : ''}</div>
  <div class="row2"><button type="button" class="btn" id="lrn" ${nNew ? '' : 'disabled'}>Apprendre${nNew ? ' (' + Math.min(nNew, 10) + ')' : ''}</button><button type="button" class="btn ghost" id="rvw" ${s.seen ? '' : 'disabled'}>Réviser la leçon</button></div>
  ${nNew ? `<a class="btn small ghost" href="#/tri/${id}" style="margin-bottom:.4rem">Déjà vu en cours ? Coche ce que tu connais (${nNew})</a>` : ''}` : (ALPHA.length && id === 'L00' ? `<button type="button" class="btn small ghost" id="abc">S'entraîner à reconnaître les lettres</button>` : '')}
  <div class="lsteps" id="lsteps"></div>
  ${l.obj.length ? `<div class="card"><b>Objectifs</b><ul style="margin:.2rem 0;padding-left:1.2rem">${l.obj.map(o => `<li>${o}</li>`).join('')}</ul></div>` : ''}
  <div class="sec-nav"><div class="chips" id="secs">${secs.map(([i, t]) => `<button type="button" class="chip" data-s="${i}">${esc(t)}</button>`).join('')}</div>
  <div class="chips" id="modes">${[['read', 'Tout afficher'], ['hide-dj', 'Cacher la darija'], ['hide-fr', 'Cacher le français']].map(([m, t]) => chip(`data-m="${m}"`, lessonMode === m, t)).join('')}</div></div>
  <div id="lbody" class="${lessonMode}">${body}</div>
  <div class="card" id="lend"></div>
  <div class="navl">${prev ? `<a class="btn small ghost" href="#/lecon/${prev}">‹ ${lessonLabel(prev)}</a>` : '<span></span>'}${next ? `<a class="btn small ghost" href="#/lecon/${next}">${lessonLabel(next)} ›</a>` : '<a class="btn small ghost" href="#/memo">Mémo ›</a>'}</div>`;
  const stick = () => document.documentElement.style.setProperty('--stick', ($('#top').offsetHeight + ($('.sec-nav') ? $('.sec-nav').offsetHeight : 0) + 10) + 'px');
  const focusRows = () => $$('#lbody .rv').forEach(x => { if (lessonMode !== 'read') { x.tabIndex = 0; x.setAttribute('role', 'button'); } else { x.removeAttribute('tabindex'); x.removeAttribute('role'); } });
  const drawSteps = () => {
    const q = lessonSteps(id);
    $('#lsteps').innerHTML = [['Lire', q.read ? '✓' : '', !!q.read], s.n ? ['Mots', `${q.s.seen}/${q.s.n}`, q.s.seen === q.s.n] : null, q.dl ? ['Dialogues', `${q.dlDone}/${q.dl}`, q.dlDone === q.dl] : null, q.ex ? ['Exercices', `${q.exDone}/${q.ex}`, q.exDone === q.ex] : null].filter(Boolean)
      .map(([t, v, ok], n) => `<span class="lstep ${ok ? 'ok' : ''}"><b>${n + 1}</b> ${t}${v ? ' ' + v : ''}</span>`).join('<span class="arrow" aria-hidden="true">›</span>');
    const dnext = DIALOGS.find(d => d.id === id && !P.dlg[id + '/' + d.idx]);
    $('#lend').innerHTML = q.read
      ? `<b>Leçon lue le ${esc(q.read.split('-').reverse().join('/'))}.</b><div class="muted">La suite : ${nNew ? 'apprends les mots, ' : ''}${dnext ? 'joue un dialogue, ' : ''}puis fais les exercices ci-dessus.</div><div class="chips">${nNew ? '<button type="button" class="btn small" id="lrn2">Apprendre les mots</button>' : ''}${dnext ? `<a class="btn small ghost" href="#/dialogue/${id}/${dnext.idx}">Jouer un dialogue</a>` : ''}<button type="button" class="btn small ghost" id="lnote">Ajouter une note sur cette leçon</button></div>`
      : `<b>Tu as tout lu ?</b><div class="muted">Marque la leçon comme lue : c'est la première étape du parcours.</div><div class="chips"><button type="button" class="btn small" id="lread">J'ai lu cette leçon</button><button type="button" class="btn small ghost" id="lnote">Ajouter une note sur cette leçon</button></div>`;
    if ($('#lread')) $('#lread').onclick = () => { P.read[id] = dayKey(); save(); drawSteps(); toast(MZ ? 'Mzyan ! Leçon lue.' : 'Leçon lue.'); };
    if ($('#lrn2')) $('#lrn2').onclick = () => startLearn(nextNew(10, [id]));
    $('#lnote').onclick = () => noteSheet('Leçon ' + lessonLabel(id) + ' · ' + strip(l.title), 'contenu');
  };
  stick(); focusRows(); drawSteps();
  $('#secs').onclick = e => { const c = e.target.closest('.chip'); if (c) { stick(); $('#s' + c.dataset.s).scrollIntoView({ behavior: 'smooth' }); } };
  $('#modes').onclick = e => { const c = e.target.closest('.chip'); if (!c) return; lessonMode = c.dataset.m; $('#lbody').className = lessonMode; $$('#modes .chip').forEach(x => { x.classList.toggle('on', x === c); x.setAttribute('aria-pressed', x === c); }); $$('.rv.show').forEach(x => x.classList.remove('show')); focusRows(); };
  $('#lbody').onclick = e => {
    const rv = e.target.closest('.rv');
    if (rv && lessonMode !== 'read') rv.classList.toggle('show');
    else if (rv && rv.dataset.k && !e.target.closest('.more') && IMAP[rv.dataset.k]) itemPanel(rv, IMAP[rv.dataset.k], false);   // lecture : fiche du mot
    const sb = e.target.closest('[data-sol]'); if (sb) { const box = sb.closest('.ex'); const sols = $$('.sol', box); const show = sols.some(x => x.hidden); sols.forEach(x => { x.hidden = !show; }); sb.textContent = show ? 'Cacher le corrigé' : 'Voir le corrigé'; }
    const db = e.target.closest('[data-done]'); if (db) { const box = db.closest('.ex'); const k2 = box.dataset.ex; if (P.ex[k2]) delete P.ex[k2]; else { P.ex[k2] = dayKey(); bonus(); } save(); drawSteps(); $('.done', box).textContent = P.ex[k2] ? '✓ fait le ' + P.ex[k2] : ''; db.textContent = P.ex[k2] ? 'Refaire plus tard' : 'Marquer comme fait'; }
  };
  $('#lbody').onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('rv')) { e.preventDefault(); e.target.click(); } };
  if ($('#abc')) $('#abc').onclick = () => { free = { ids: [], src: 'alpha', mode: 'qcm', n: 20 }; runFree(); };
  if (!s.n) return;
  $('#lrn').onclick = () => startLearn(nextNew(10, [id]));
  const revLesson = () => { const its = ITEMS.filter(i => i.refs.includes(id) && st(i)); startSession('Révision · ' + lessonLabel(id), pickWeighted(its, 20).map(it => ({ type: taskFor(it), it })), revLesson, 'free'); };
  $('#rvw').onclick = revLesson;
}
function screenMemo() {
  setHead('Mémo de grammaire', true);
  view.innerHTML = `<h1 class="lt">Mémo de grammaire</h1><div class="ar" style="text-align:left">${esc(D.memo.ar)}</div><p class="muted">Les tableaux essentiels, repris des leçons (le numéro de la leçon est entre parenthèses).</p>` + D.memo.blocks.map(b => blockHTML(b, D.memo)).join('');
}

/* ---------- Tri rapide d'une leçon déjà vue en cours ---------- */
function screenTri(id) {
  const l = byId[id]; if (!l || id === 'MEMO') return screenLessons();
  setHead('Tri · ' + lessonLabel(id), true);
  const its = nextNew(9999, [id]);
  if (!its.length) { view.innerHTML = `<p class="muted">Tous les éléments de cette leçon sont déjà en apprentissage.</p><a class="btn wide ghost" href="#/lecon/${id}">Retour à la leçon</a>`; return; }
  const on = new Set(); let hideDj = false;
  const label = () => `Valider : ${on.size} connu${on.size > 1 ? 's' : ''}, ${its.length - on.size} à apprendre`;
  const draw = () => {
    view.innerHTML = `<p class="muted">Coche ce que tu sais déjà dire. Les éléments cochés passent en révision espacée (premières révisions étalées sur les deux semaines à venir) ; les autres restent à apprendre, quelques-uns par jour.</p>
    <div class="chips"><button type="button" class="chip" id="all">Tout cocher</button><button type="button" class="chip" id="none">Tout décocher</button>${chip('id="hide"', hideDj, 'Cacher la darija')}</div>
    <div class="tri">${its.map((it, k) => `<div class="it ${on.has(k) ? 'on' : ''}" data-k="${k}" role="checkbox" aria-checked="${on.has(k)}" tabindex="0"><div class="ck" aria-hidden="true">${on.has(k) ? '✓' : ''}</div><div><div class="fr">${it.fr}</div><div class="dj ${hideDj ? 'hid' : ''}">${it.dj}</div></div><div class="ar ${hideDj ? 'hid' : ''}">${esc(it.ar)}</div></div>`).join('')}</div>
    <div class="sticky-foot"><button type="button" class="btn wide" id="ok">${label()}</button></div>`;
    $('.tri').onclick = e => { const r = e.target.closest('.it'); if (!r) return; const k = +r.dataset.k; if (on.has(k)) on.delete(k); else on.add(k); r.classList.toggle('on', on.has(k)); r.setAttribute('aria-checked', on.has(k)); $('.ck', r).textContent = on.has(k) ? '✓' : ''; $('#ok').textContent = label(); };
    $('.tri').onkeydown = e => { if ((e.key === ' ' || e.key === 'Enter') && e.target.matches('.it')) { e.preventDefault(); e.target.click(); } };
    $('#all').onclick = () => { its.forEach((_, k) => on.add(k)); draw(); };
    $('#none').onclick = () => { on.clear(); draw(); };
    $('#hide').onclick = () => { hideDj = !hideDj; draw(); };
    $('#ok').onclick = () => {
      [...on].forEach(k => knownAlready(its[k], true)); save(); checkBadges();
      const nextId = LEARN.slice(LEARN.indexOf(id) + 1).find(x => nextNew(1, [x]).length);
      const rest = its.length - on.size;
      view.innerHTML = `<div class="card"><h3>${plural(on.size, 'élément')} en révision espacée</h3><div class="muted">${rest ? `${plural(rest, 'élément')} de ${lessonName(id)} ${rest > 1 ? 'restent' : 'reste'} à apprendre (bouton « Apprendre » de l'accueil).` : 'Toute la leçon est en révision.'}</div></div>
        ${nextId ? `<a class="btn wide" href="#/tri/${nextId}">Trier ${lessonName(nextId)}</a>` : ''}<a class="btn wide ghost" href="#/lecon/${id}">Retour à la leçon</a><a class="btn wide ghost" href="#/">Accueil</a>`;
      window.scrollTo(0, 0);
    };
  };
  draw();
}

/* ---------- Recherche et lexique ---------- */
let lexState = { q: '', part: '' };
function screenLexique() {
  setHead('Lexique et recherche');
  view.innerHTML = `<input type="search" id="q" aria-label="Rechercher" placeholder="Mot ou phrase, en français, darija ou arabe" value="${esc(lexState.q)}" autocomplete="off" autocapitalize="off" spellcheck="false">
  <div class="chips" id="pc">${chip('data-p=""', !lexState.part, 'Tout')}${PARTS.map(p => chip(`data-p="${esc(p.n)}"`, lexState.part === p.n, 'Partie ' + esc(p.n))).join('')}</div>
  <div id="lx"></div>`;
  const row = it => `<div class="it ${(it.ar || '').length > 22 || it.djp.length > 28 ? 'long' : ''}" data-k="${esc(it.key)}" role="button" tabindex="0"><div class="fr">${it.fr} <span class="ref">${it.refs.map(lessonLabel).join(', ')}</span></div><div class="dj">${it.dj}</div><div class="ar">${esc(it.ar)}</div></div>`;
  const draw = () => {
    const raw0 = lexState.q.trim(); const nq = norm(raw0); const aq = /[؀-ۿ]/.test(raw0) ? noHarakat(raw0) : '';
    const part = lexState.part ? PARTS.find(p => p.n === lexState.part) : null; const ids = part ? part.ids : null;
    const inPart = it => !ids || it.refs.some(r => ids.includes(r));
    if (!nq && !aq) {
      let letter = ''; const out = []; const list = LEX.filter(e => inPart(e.it));
      list.forEach(e => { const L0 = (e.sort[0] || '#').toUpperCase(); if (L0 !== letter) { letter = L0; out.push(`<div class="letter">${esc(letter)}</div>`); } out.push(row(e.it)); });
      $('#lx').innerHTML = `<div class="count">${plural(list.length, 'mot')} · touche un mot pour voir sa leçon ou le réviser aujourd'hui</div><div class="lex">${out.join('')}</div>`;
      return;
    }
    const hit = it => inPart(it) && ((nq && (it.nf.includes(nq) || it.nd.includes(nq))) || (aq && it.na.includes(aq)));
    const words = ITEMS.filter(i => i.kind === 'vocab' && hit(i));
    const phrases = ITEMS.filter(i => i.kind !== 'vocab' && hit(i));
    const lines = [];
    DIALOGS.forEach(d => { if (!ids || ids.includes(d.id)) d.lines.forEach((x, k) => { const n = d.nl[k]; if ((nq && (n[0].includes(nq) || n[1].includes(nq))) || (aq && n[2].includes(aq))) lines.push({ d, x }); }); });
    $('#lx').innerHTML = (words.length + phrases.length + lines.length === 0 ? '<p class="muted">Aucun résultat. Essaie sans article, ou avec une autre orthographe (3, 7, 9).</p>' : '')
      + (words.length ? `<div class="lab l-vocab">${IC.vocab}Mots (${words.length})</div><div class="lex">${words.slice(0, 150).map(row).join('')}</div>` : '')
      + (phrases.length ? `<div class="lab l-phr">${IC.phr}Phrases et formes (${phrases.length})</div><div class="lex">${phrases.slice(0, 150).map(row).join('')}</div>` : '')
      + (lines.length ? `<div class="lab l-dlg">${IC.dlg}Dans les dialogues (${lines.length})</div><div class="lex">${lines.slice(0, 80).map(o => `<a class="it long" style="text-decoration:none;color:inherit" href="#/dialogue/${o.d.id}/${o.d.idx}"><div class="fr">${o.x[1]} <span class="ref">${lessonLabel(o.d.id)} · ${o.d.title}</span></div><div class="dj">${o.x[2]}</div><div class="ar">${esc(o.x[3])}</div></a>`).join('')}</div>` : '');
  };
  $('#q').oninput = e => { lexState.q = e.target.value; draw(); };
  $('#pc').onclick = e => { const c = e.target.closest('.chip'); if (!c) return; lexState.part = c.dataset.p; $$('#pc .chip').forEach(x => { x.classList.toggle('on', x === c); x.setAttribute('aria-pressed', x === c); }); draw(); };
  $('#lx').onclick = e => {
    const r = e.target.closest('.it[data-k]'); if (!r || e.target.closest('.more')) return;
    const it = findItem(r.dataset.k); if (it) itemPanel(r, it, true);
  };
  $('#lx').onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.it[data-k]')) { e.preventDefault(); e.target.click(); } };
  draw();
}

/* ---------- Dialogues ---------- */
function screenDialogues() {
  setHead('Dialogues');
  view.innerHTML = '<p class="muted">Lis-les à voix haute, puis entraîne-toi : cache le français pour comprendre, ou joue un rôle (tes répliques sont cachées, tu les dis avant de vérifier). Un dialogue travaillé valide l\'étape « Pratiquer » du jour.</p>' + PARTS.map(p => {
    const ds = DIALOGS.filter(d => p.ids.includes(d.id));
    return ds.length ? `<div class="part">Partie ${esc(p.n)} · ${esc(p.title)}</div>` + ds.map(d => { const done = P.dlg[d.id + '/' + d.idx]; return `<a class="card lrow" href="#/dialogue/${d.id}/${d.idx}"><div class="num sm">${lessonLabel(d.id)}</div><div><div class="t">${d.title} ${done ? '<span class="tag t-ok">Joué</span>' : ''}</div><div class="s">${d.lines.length} répliques · ${esc([...new Set(d.lines.map(x => x[0]))].join(', '))}</div></div></a>`; }).join('') : '';
  }).join('');
}
function screenDialogue(id, idx) {
  const d = DIALOGS.find(x => x.id === id && x.idx === +idx); if (!d) return screenDialogues();
  setHead(lessonLabel(id) + ' · dialogue', true);
  const sp = [...new Set(d.lines.map(x => x[0]))]; const key = id + '/' + d.idx;
  const k = DIALOGS.indexOf(d), nextD = DIALOGS[k + 1];
  const draw = mode => {
    let credited = false;
    view.innerHTML = `<div class="chips">${chip('data-m="read"', mode === 'read', 'Lire')}${chip('data-m="nofr"', mode === 'nofr', 'Cacher le français')}${sp.map(s => chip(`data-m="role:${esc(s)}"`, mode === 'role:' + s, 'Jouer ' + esc(s))).join('')}</div>`
      + (mode === 'read' ? '<p class="muted">Lis le dialogue à voix haute, puis choisis un rôle ci-dessus pour le jouer.</p>' : `<p class="muted">${mode === 'nofr' ? 'Comprends chaque réplique, puis touche-la pour voir le français.' : 'Dis tes répliques en darija, puis touche la bulle pour vérifier.'}</p>`)
      + dialogHTML(d, mode) + `<div id="dend"></div><div class="chips"><a class="btn small ghost" href="#/lecon/${id}">Voir ${lessonName(id)}</a><button type="button" class="btn small ghost" id="dnote">Signaler</button></div>`;
    $('.chips', view).onclick = e => { const c = e.target.closest('.chip'); if (c) draw(c.dataset.m); };
    $('#dnote').onclick = () => noteSheet('Dialogue ' + lessonLabel(id) + ' · ' + strip(d.title), 'contenu');
    const finished = () => {   // toutes les répliques cachées ont été révélées : le dialogue est travaillé
      if (credited || mode === 'read' || $('.dlg .hid', view)) return;
      credited = true; const firstTime = !P.dlg[key]; P.dlg[key] = dayKey(); bonus(); const nb = checkBadges();
      $('#dend').innerHTML = `<div class="res good">${MZ ? 'Mzyan ! ' : ''}Dialogue travaillé${firstTime ? '' : ' une fois de plus'}.${nb.length ? ' Nouveau badge : ' + esc(nb.map(b => b[1]).join(', ')) + '.' : ''}</div><div class="chips">${sp.filter(s => mode !== 'role:' + s).slice(0, 2).map(s => `<button type="button" class="btn small" data-role="${esc(s)}">Jouer ${esc(s)}</button>`).join('')}${nextD ? `<a class="btn small ghost" href="#/dialogue/${nextD.id}/${nextD.idx}">Dialogue suivant</a>` : ''}<a class="btn small ghost" href="#/">Accueil</a></div>`;
      $$('[data-role]', view).forEach(b => { b.onclick = () => { draw('role:' + b.dataset.role); window.scrollTo(0, 0); }; });
      if (nb.length) celebrate();
    };
    $$('.bub', view).forEach(b => { b.onclick = () => { $$('.hid', b).forEach(h => h.classList.remove('hid')); finished(); }; b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); } }; });
  };
  draw('read');
}

/* ======================= séances ======================= */
function pickWeighted(items, n) {   // tirage pondéré sans remise : les points faibles sortent plus souvent
  const w = it => { const s = st(it); if (!s) return 2; return Math.max(0.3, 1 + s.lapses * 2 + (s.box === 0 ? 2 : 0) - s.box * 0.4 + (isDue(it) ? 2 : 0)); };
  return items.map(it => [Math.pow(Math.random(), 1 / w(it)), it]).sort((a, b) => b[0] - a[0]).slice(0, n).map(x => x[1]);
}
function taskFor(it) {   // le type d'exercice suit le niveau : reconnaître, puis se rappeler, puis écrire
  if (it.fix) return 'fix';
  const b = boxOf(it);
  if (b <= 1) return Math.random() < 0.5 ? 'qcm-fr' : 'qcm-dj';
  if (b <= 3) { if (it.ord && Math.random() < 0.5) return 'order'; return P.settings.arabic && it.ar && !/…/.test(it.ar) && Math.random() < 0.25 ? 'arabe' : 'card-fr'; }
  return it.writable ? 'write' : it.ord ? 'order' : 'card-fr';
}
function startReview() {
  const due = dueList().slice(0, P.settings.maxReview);
  startSession('Révision du jour', shuffle(due.map(it => ({ type: taskFor(it), it }))), () => startReview(), 'review');
}
function startLearn(items) {
  if (!items.length) return toast('Plus rien de nouveau ici.');
  const tasks = [];
  for (let k = 0; k < items.length; k += 5) {   // par groupes de 5 : présentation, puis vérification
    const batch = items.slice(k, k + 5);
    batch.forEach(it => tasks.push({ type: 'intro', it, learn: true }));
    if (batch.length >= 3) tasks.push({ type: 'pairs', it: batch[0], its: batch });   // un jeu d'association avant la vérification
    shuffle(batch.slice()).forEach(it => tasks.push({ type: 'qcm-fr', it, learn: true }));
  }
  startSession('Apprendre', tasks, null, 'learn');
}
function startFixes() {
  const f = FIXES.filter(x => !st(x) || isDue(x)).slice(0, 20);
  startSession('Tes fautes relevées', shuffle(f).map(it => ({ type: 'fix', it })), null, 'fix');
}
function finalize() {   // enregistre la séance dans l'historique, même interrompue
  if (!R || R.saved) return;
  const keys = Object.keys(R.first); if (!keys.length) return;
  R.saved = true;
  P.sessions.push({ d: dayKey(R.started), t: R.title, n: keys.length, ok: keys.filter(k => R.first[k] > 0).length, ts: R.started });
  P.sessions = P.sessions.slice(-300); save();
}
function startSession(title, tasks, again, kind) {
  if (!tasks.length) return toast('Rien à faire pour cette sélection.');
  if (R) finalize();
  askPersist();
  R = { title, tasks, i: 0, first: {}, wrong: [], tries: {}, again, kind: kind || 'free', combo: 0, played: 0, started: Date.now(), shownAt: 0 };
  if (location.hash === '#/session') screenSession(); else location.hash = '#/session';
}
function distractors(it, n, field) {
  const val = x => (field === 'dj' ? x.nd : x.nf);
  const shown = new Set([val(it)]); const out = [];
  const part = (D.parts.find(p => p.ids.includes(it.id)) || { ids: [] }).ids;
  const pools = [ITEMS.filter(x => x.id === it.id && x.kind === it.kind), ITEMS.filter(x => x.kind === it.kind && part.includes(x.id)), ITEMS.filter(x => x.kind === it.kind), ITEMS];
  for (const pool of pools) {
    for (const x of shuffle(pool.slice())) {
      if (out.length >= n) break;
      if (x === it || shown.has(val(x)) || x.nf === it.nf) continue;
      shown.add(val(x)); out.push(x);
    }
    if (out.length >= n) break;
  }
  return out;
}
function accepted(it) {   // réponses acceptées : variantes « a / b », partie entre parenthèses facultative, synonymes du même mot français
  if (it.fix) return [it.right];
  const vars = x => [x.djp.replace(/\([^)]*\)/g, ''), x.djp.replace(/[()]/g, '')].flatMap(base => [base, ...base.split(/\s+\/\s+|\s+·\s+/)]).map(s => s.trim()).filter(Boolean);
  const list = []; [it, ...(SYN[it.nf] || [])].forEach(x => vars(x).forEach(v => list.push(v)));
  return [...new Set(list)];
}
function screenSession() {
  if (!R) { location.replace('#/'); return; }
  if (R.i >= R.tasks.length) return endSession();
  document.body.classList.add('in-session'); upBtn.hidden = true;
  setHead(R.title, false);
  window.scrollTo(0, 0);
  const task = R.tasks[R.i], it = task.it;
  R.shownAt = Date.now();
  const guard = fn => (...a) => { if (Date.now() - R.shownAt < 350) return; fn(...a); };   // évite qu'un toucher compte sur l'écran suivant
  const head = `<div class="sessbar"><div class="bar" role="progressbar" aria-label="Avancement" aria-valuemin="0" aria-valuemax="${R.tasks.length}" aria-valuenow="${R.i}"><i style="width:${R.i / R.tasks.length * 100}%"></i></div>${R.combo >= 3 ? `<span class="combo">${R.combo} d'affilée</span>` : ''}<span class="count">${R.i + 1}/${R.tasks.length}</span><button type="button" class="btn small ghost" id="stop">Arrêter</button></div>`;
  const where = it.fix ? `Faute relevée · ${lessonLabel(it.id)}` : `${lessonLabel(it.id)} · ${esc(it.sec)}${it.table ? ' · ' + esc(it.table) : ''}`;
  const ctx = it.ctx ? `<div class="ctx">en réponse à : <b>${it.ctx.dj}</b></div>` : '';
  const reveal = it.fix ? `<div class="reveal"><div class="dj">${esc(it.right)}</div><div class="muted">et non <s>${esc(it.wrong)}</s> · ${lessonLabel(it.id)}</div></div>`
    : `<div class="reveal"><div class="dj">${it.dj}</div><div class="ar">${esc(it.ar)}</div><div class="tr">${it.fr}</div></div>`;
  const showNext = el => { R.shownAt = Date.now(); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  const praise = () => { const c = R.combo + 1; if (c >= 5 && c % 5 === 0) return `${MZ ? 'Mzyan bzzaf' : 'Excellent'} ! ${c} d'affilée.`; return ['Juste !', MZ ? 'Mzyan !' : 'Bien !', 'Bravo !'][Math.floor(Math.random() * 3)]; };
  const answer = g => {
    R.combo = g > 0 ? R.combo + 1 : 0;
    if (!(it.key in R.first)) R.first[it.key] = g;
    grade(it, g, task.learn);
    if (g === 0) {
      if (!R.wrong.includes(it)) R.wrong.push(it);
      R.tries[it.key] = (R.tries[it.key] || 0) + 1;
      if (R.tries[it.key] <= 2) R.tasks.splice(Math.min(R.i + 4, R.tasks.length), 0, { type: it.fix ? 'fix' : 'qcm-fr', it, learn: task.learn });   // revient un peu plus loin
      if (navigator.vibrate) navigator.vibrate(40);
    }
    R.i++; screenSession();
  };
  const three = `<div class="row3"><button type="button" class="btn bad" data-g="0">Raté</button><button type="button" class="btn mid" data-g="1">Hésité</button><button type="button" class="btn" data-g="2">Su</button></div>`;
  const flipCard = () => { $('#flip').onclick = guard(() => { $('#flip').remove(); $('#after').innerHTML = reveal + three; $$('[data-g]', view).forEach(b => { b.onclick = guard(() => answer(+b.dataset.g)); }); showNext($('.row3', view)); }); };
  const qcm = (prompt, hint, opts, label, good, rev, done) => {
    view.innerHTML = head + `<div class="quiz"><div class="ctx">${where}</div>${ctx}${prompt}<div class="hint">${hint}</div>${opts.map((o, k) => `<button type="button" class="choice" data-k="${k}">${label(o)}</button>`).join('')}<div id="after"></div></div>`;
    bindStop();
    $$('.choice').forEach(b => { b.onclick = guard(() => {
      if (b.disabled) return;
      const ok = opts[+b.dataset.k] === good;
      $$('.choice').forEach((c, k) => { c.disabled = true; if (opts[k] === good) c.classList.add('good'); });
      if (!ok) b.classList.add('wrong');
      $('#after').innerHTML = (ok ? `<div class="res good">${praise()}</div>` : '<div class="res wrong">Ce n\'est pas ça. La bonne réponse :</div>') + rev + '<button type="button" class="btn wide" id="nx">Suivant</button>';
      $('#nx').onclick = guard(() => (done ? done(ok) : answer(ok ? 2 : 0)));
      showNext($('#nx'));
    }); });
  };
  if (task.type === 'intro') {
    view.innerHTML = head + `<div class="quiz"><div class="ctx">Nouveau · ${where}</div>${ctx}<div class="prompt">${it.fr}</div><div class="reveal"><div class="dj">${it.dj}</div><div class="ar">${esc(it.ar)}</div></div>
      <button type="button" class="btn wide" id="nx">J'ai noté, suivant</button><button type="button" class="btn wide ghost" id="kn">Je connais déjà</button></div>`;
    bindStop();
    $('#nx').onclick = guard(() => { R.i++; screenSession(); });
    $('#kn').onclick = guard(() => { knownAlready(it, false); save(); R.first[it.key] = 2; R.tasks = R.tasks.filter((t, j) => j <= R.i || t.type === 'pairs' || t.it !== it); R.i++; screenSession(); });
  } else if (task.type === 'qcm-fr' || task.type === 'qcm-dj') {
    const fr = task.type === 'qcm-fr';
    qcm(`<div class="prompt">${fr ? it.fr : it.dj}</div>`, fr ? 'Quelle est la darija ?' : 'Que veut dire… ?', shuffle([it, ...distractors(it, 3, fr ? 'dj' : 'fr')]), o => (fr ? o.dj : o.fr), it, reveal);
  } else if (task.type === 'alpha') {   // l'alphabet n'entre pas dans la révision espacée
    const opts = shuffle([it, ...shuffle(ALPHA.filter(x => x !== it && x.tr !== it.tr)).slice(0, 3)]);
    const rev = `<div class="reveal"><div class="ar">${esc(it.forms.replace(/ · /g, '   '))}</div><div class="muted">${esc(it.name)} · ${esc(it.sound)}</div></div>`;
    qcm(`<div class="prompt arp ar">${esc(it.letter)}</div>`, 'Quelle est cette lettre ?', opts, o => `<b>${esc(o.tr)}</b> · ${esc(o.name)}`, it, rev,
      ok => { if (!(it.key in R.first)) R.first[it.key] = ok ? 2 : 0; if (!ok && !R.wrong.includes(it)) R.wrong.push(it); R.i++; screenSession(); });
  } else if (task.type === 'card-fr' || task.type === 'card-dj' || task.type === 'arabe') {
    const prompt = task.type === 'arabe' ? `<div class="prompt arp ar">${esc(it.ar)}</div><div class="hint">Lis l'arabe : comment ça se dit, et que veut dire… ?</div>`
      : task.type === 'card-fr' ? `<div class="prompt">${it.fr}</div><div class="hint">Dis-le en darija, puis retourne la carte</div>`
      : `<div class="prompt">${it.dj}</div><div class="hint">Que veut dire… ?</div>`;
    view.innerHTML = head + `<div class="quiz"><div class="ctx">${where}</div>${task.type === 'arabe' ? '' : ctx}${prompt}<button type="button" class="btn wide" id="flip">Retourner la carte</button><div id="after"></div></div>`;
    bindStop(); flipCard();
  } else if (task.type === 'fix') {
    view.innerHTML = head + `<div class="quiz"><div class="ctx">${where}</div><div class="hint">Tu avais écrit</div><div class="prompt"><s>${esc(it.wrong)}</s></div><div class="hint">Quelle est la bonne forme ? Dis-la, puis vérifie.</div><button type="button" class="btn wide" id="flip">Voir la réponse</button><div id="after"></div></div>`;
    bindStop(); flipCard();
  } else if (task.type === 'write') {
    view.innerHTML = head + `<div class="quiz"><div class="ctx">${where}</div>${ctx}<div class="prompt">${it.fr}</div><div class="hint">Écris-le en darija (lettres latines)</div>
      <input type="text" id="in" aria-label="Ta réponse en darija" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="ex. bghit atay">
      <div class="keys">${['3', '7', '9', "'", '-'].map(k => `<button type="button" data-key="${esc(k)}" aria-label="Insérer ${esc(k)}">${esc(k)}</button>`).join('')}</div>
      <div class="row2"><button type="button" class="btn ghost" id="idk">Je ne sais pas</button><button type="button" class="btn" id="chk">Vérifier</button></div><div id="after"></div></div>`;
    bindStop();
    const inp = $('#in'); setTimeout(() => inp.focus(), 50);
    $$('[data-key]').forEach(b => {
      b.onpointerdown = e => e.preventDefault();   // garde le clavier ouvert
      b.onmousedown = e => e.preventDefault();
      b.onclick = () => { const p = inp.selectionStart ?? inp.value.length, q = inp.selectionEnd ?? p; inp.value = inp.value.slice(0, p) + b.dataset.key + inp.value.slice(q); inp.focus(); inp.setSelectionRange(p + 1, p + 1); };
    });
    const finish = (g, msg) => {
      inp.disabled = true; $$('.keys, .row2', view).forEach(x => x.remove());
      $('#after').innerHTML = msg + reveal + (g < 2 ? '<button type="button" class="btn wide ghost" id="mine">J\'avais juste (variante acceptée)</button>' : '') + '<button type="button" class="btn wide" id="nx">Suivant</button>';
      $('#nx').onclick = guard(() => answer(g));
      if (g < 2) $('#mine').onclick = guard(() => answer(2));
      showNext($('#nx'));
    };
    const check = () => {
      const v = inp.value.trim(); if (!v) return;
      const acc = accepted(it); const nv = norm(v);
      if (acc.some(a => norm(a) === nv)) return finish(2, `<div class="res good">${praise()}</div>`);
      const best = acc.map(a => [a, lev(nv, norm(a))]).sort((a, b) => a[1] - b[1])[0];
      const close = best[1] <= Math.max(2, Math.ceil(norm(best[0]).length / 3));
      const cmp = close ? `<div class="card"><div class="muted" style="font-size:.8rem">Ta réponse corrigée (rouge : en trop, vert : manquant)</div><div class="diff">${diffHTML(simple(v), simple(best[0]))}</div></div>`
        : `<div class="card"><div class="muted" style="font-size:.8rem">Ta réponse</div><div class="diff"><span class="del">${esc(simple(v))}</span></div></div>`;
      if (best[1] <= 1 && norm(best[0]).length >= 4) finish(1, '<div class="res mid">Presque : une lettre de différence (compté « Hésité »).</div>' + cmp);
      else finish(0, '<div class="res wrong">Pas tout à fait.</div>' + cmp);
    };
    $('#chk').onclick = check; inp.onkeydown = e => { if (e.key === 'Enter') check(); };
    $('#idk').onclick = () => finish(0, '<div class="res wrong">Voici la réponse :</div>');
  } else if (task.type === 'order') {   // phrase à remettre en ordre
    const words = it.djp.trim().split(/\s+/).reduce((a, w) => { if (/^[?!.,;:]+$/.test(w) && a.length) a[a.length - 1] += ' ' + w; else a.push(w); return a; }, []); const idx = shuffle(words.map((_, k) => k)); if (idx.every((v, k) => v === k)) idx.reverse();
    const placed = [];
    view.innerHTML = head + `<div class="quiz"><div class="ctx">${where}</div>${ctx}<div class="prompt">${it.fr}</div><div class="hint">Remets les mots dans l'ordre</div>
      <div class="tiles ans" id="ans" aria-label="Ta phrase"></div><div class="tiles" id="pool" aria-label="Mots à placer"></div>
      <div class="row2"><button type="button" class="btn ghost" id="idk">Je ne sais pas</button><button type="button" class="btn" id="chk" disabled>Vérifier</button></div><div id="after"></div></div>`;
    bindStop();
    const tile = k => `<button type="button" class="tile" data-i="${k}">${esc(words[k])}</button>`;
    const draw = () => { $('#ans').innerHTML = placed.map(tile).join('') || '<span class="muted">Touche les mots dans l\'ordre</span>'; $('#pool').innerHTML = idx.filter(k => !placed.includes(k)).map(tile).join(''); $('#chk').disabled = placed.length !== words.length; };
    $('#pool').onclick = e => { const b = e.target.closest('.tile'); if (b) { placed.push(+b.dataset.i); draw(); } };
    $('#ans').onclick = e => { const b = e.target.closest('.tile'); if (b) { placed.splice(placed.indexOf(+b.dataset.i), 1); draw(); } };
    const finish = (g, msg) => {
      $$('.row2', view).forEach(x => x.remove()); $('#pool').remove(); $('#ans').classList.add('locked'); $('#ans').onclick = null;
      $('#after').innerHTML = msg + reveal + '<button type="button" class="btn wide" id="nx">Suivant</button>';
      $('#nx').onclick = guard(() => answer(g)); showNext($('#nx'));
    };
    $('#chk').onclick = () => { const v = placed.map(k => words[k]).join(' '); if (norm(v) === it.nd) finish(2, `<div class="res good">${praise()}</div>`); else finish(0, '<div class="res wrong">Pas dans cet ordre. La phrase :</div>'); };
    $('#idk').onclick = () => finish(0, '<div class="res wrong">Voici la phrase :</div>');
    draw();
  } else if (task.type === 'pairs') {   // association : un jeu, sans note
    const its = task.its; const A = shuffle(its.slice()), B = shuffle(its.slice()); let sel = null, left = its.length, miss = 0;
    const col = (list, side, f) => `<div>${list.map((x, k) => `<button type="button" class="pair" data-s="${side}" data-k="${k}" data-key="${esc(x.key)}">${f(x)}</button>`).join('')}</div>`;
    view.innerHTML = head + `<div class="quiz"><div class="ctx">Association · ${lessonLabel(it.id)}</div><div class="hint">Touche un mot, puis sa traduction</div><div class="pairs">${col(A, 'l', x => x.fr)}${col(B, 'r', x => x.dj)}</div><div id="after"></div></div>`;
    bindStop();
    $('.pairs').onclick = e => {
      const b = e.target.closest('.pair'); if (!b || b.disabled) return;
      if (!sel || sel.dataset.s === b.dataset.s) { if (sel) sel.classList.remove('sel'); sel = b === sel ? null : b; if (sel) b.classList.add('sel'); return; }
      const pick = x => (x.dataset.s === 'l' ? A : B)[+x.dataset.k]; const a = pick(sel), c = pick(b); const s0 = sel; sel = null; s0.classList.remove('sel');
      if (a === c || a.nf === c.nf || a.nd === c.nd) {
        [s0, b].forEach(x => { x.disabled = true; x.classList.add('good'); });
        if (--left === 0) { R.played++; $('#after').innerHTML = `<div class="res good">${miss ? 'Toutes les paires sont trouvées.' : (MZ ? 'Mzyan ! ' : '') + 'Sans une erreur.'}</div><button type="button" class="btn wide" id="nx">Suivant</button>`; $('#nx').onclick = guard(() => { R.i++; screenSession(); }); showNext($('#nx')); }
      } else { miss++; [s0, b].forEach(x => { x.classList.add('wrong'); setTimeout(() => x.classList.remove('wrong'), 450); }); if (navigator.vibrate) navigator.vibrate(30); }
    };
  }
  view.insertAdjacentHTML('beforeend', '<button type="button" class="linkbtn" id="flag">Signaler un problème sur cette carte</button>');
  $('#flag').onclick = () => noteSheet(itemCtx(it) + ' · exercice : ' + task.type, 'contenu');
}
function bindStop() { const b = $('#stop'); if (b) b.onclick = () => { R.tasks = R.tasks.slice(0, R.i); endSession(); }; }
function endSession() {
  finalize();
  document.body.classList.remove('in-session');
  const keys = Object.keys(R.first); const good = keys.filter(k => R.first[k] > 0).length;
  const again = R.again; const wrong = R.wrong; const kind = R.kind;
  if ((kind === 'fix' || kind === 'free') && (keys.length >= 5 || R.played >= 1)) bonus();   // compte pour l'étape « Pratiquer »
  const nb = checkBadges(); const d = daily(); const left = d.left, nLearn = Math.min(left, nextNew(left).length); const dg = nextDialogue();
  const ratio = keys.length ? good / keys.length : 1;
  const msg = !keys.length ? 'Séance terminée.' : ratio >= 0.9 ? (MZ ? 'Mzyan bzzaf !' : 'Excellent !') : ratio >= 0.6 ? (MZ ? 'Mzyan !' : 'Bien joué !') : 'Ça rentre en répétant : les éléments ratés reviennent vite.';
  setHead(R.title, false);
  window.scrollTo(0, 0);
  const nextStep = d.due.length ? `<button type="button" class="btn wide" id="rev">Continuer la révision du jour (${Math.min(d.due.length, P.settings.maxReview)}${d.due.length > P.settings.maxReview ? ' sur ' + d.due.length : ''})</button>`
    : !d.s2 && nLearn ? `<button type="button" class="btn wide" id="learn2">Étape suivante : apprendre ${nLearn} nouveau${nLearn > 1 ? 'x' : ''}</button>`
    : !d.s3 && dg ? `<a class="btn wide" href="#/dialogue/${dg.id}/${dg.idx}">Étape suivante : jouer un dialogue</a>`
    : `<div class="win">Parcours du jour terminé${MZ ? ' · <b>mzyan bzzaf !</b>' : ''} À demain.</div>`;
  view.innerHTML = `<div class="card" style="text-align:center">${keys.length ? `<div class="big">${good} / ${keys.length}</div><div class="muted">réussis du premier coup</div>` : ''}<div class="endmsg">${msg}</div><div class="muted">Parcours du jour : ${d.done}/3</div></div>`
    + nb.map(b => `<div class="card badge-new"><b>Nouveau badge : ${esc(b[1])}</b><div class="muted">${esc(b[2])}</div></div>`).join('')
    + (wrong.length ? `<div class="lab l-fix">${IC.fix}À retenir</div><div class="vocab">${wrong.map(i => `<div class="it"><div class="fr">${i.fix ? 'et non <s>' + esc(i.wrong) + '</s>' : i.fr}</div><div class="dj">${i.fix ? esc(i.right) : i.dj}</div><div class="ar">${esc(i.ar)}</div></div>`).join('')}</div>` : '')
    + nextStep
    + (again ? '<button type="button" class="btn wide ghost" id="again">Une autre séance du même type</button>' : '')
    + '<button type="button" class="btn wide ghost" id="home">Retour à l\'accueil</button>';
  R = null;
  if ($('#rev')) $('#rev').onclick = () => startReview();
  if ($('#learn2')) $('#learn2').onclick = () => startLearn(nextNew(left));
  if ($('#again')) $('#again').onclick = () => again();
  $('#home').onclick = () => location.replace('#/');
  if (nb.length || (d.done === 3 && keys.length && celebrated !== dayKey())) { if (d.done === 3) celebrated = dayKey(); celebrate(); }
}

/* ---------- Séance libre ---------- */
let free = { ids: [], src: 'tout', mode: 'auto', n: 20 };
const FREE_MODES = [['pairs', 'Paires'], ['order', 'Phrases en ordre'], ['card-fr', 'Cartes FR → darija'], ['card-dj', 'Cartes darija → FR'], ['qcm', 'QCM'], ['write', 'Écrire'], ['arabe', 'Lire l\'arabe'], ['auto', 'Selon mon niveau']];
const FREE_SRC = [['tout', 'Mots et phrases'], ['vocab', 'Mots'], ['phr', 'Phrases'], ['erreurs', 'Mes erreurs'], ['fix', 'Fautes relevées'], ['alpha', 'Alphabet']];
function freePool() {
  if (free.src === 'fix') return FIXES.filter(f => !free.ids.length || free.ids.includes(f.id));
  if (free.src === 'alpha') return ALPHA;
  let p = ITEMS.filter(i => !free.ids.length || i.refs.some(r => free.ids.includes(r)));
  if (free.src === 'vocab') p = p.filter(i => i.kind !== 'phr');
  if (free.src === 'phr') p = p.filter(i => i.kind === 'phr');
  if (free.src === 'erreurs') p = p.filter(i => st(i) && st(i).ko > 0 && boxOf(i) < ACQUIS);
  if (free.mode === 'write') p = p.filter(i => i.writable);
  if (free.mode === 'order') p = p.filter(i => i.ord);
  if (free.mode === 'arabe') p = p.filter(i => i.ar && !/…/.test(i.ar));
  return p;
}
function screenLibre() {
  setHead('Séance libre', true);
  const special = free.src === 'fix' || free.src === 'alpha';
  const n = freePool().length;
  view.innerHTML = `<div class="card"><b>Leçons</b><div class="chips" id="ls">${chip('data-id=""', !free.ids.length, 'Toutes')}${NAV.map(id => chip(`data-id="${id}"`, free.ids.includes(id), lessonLabel(id))).join('')}</div></div>
  <div class="card"><b>Contenu</b><div class="chips" id="src">${FREE_SRC.map(([k, t]) => chip(`data-k="${k}"`, free.src === k, t)).join('')}</div></div>
  ${special ? '' : `<div class="card"><b>Exercice</b><div class="chips" id="md">${FREE_MODES.map(([k, t]) => chip(`data-k="${k}"`, free.mode === k, t)).join('')}</div></div>`}
  <div class="card"><b>Nombre</b><div class="chips" id="nb">${[10, 20, 40, 0].map(k => chip(`data-k="${k}"`, free.n === k, k || 'Tout')).join('')}</div></div>
  <button type="button" class="btn wide" id="go" ${n ? '' : 'disabled'}>Commencer · ${plural(n, 'élément')} disponible${n > 1 ? 's' : ''}</button>
  <p class="muted" style="font-size:.85rem">${free.src === 'alpha' ? 'L\'alphabet n\'est pas noté : entraîne-toi autant que tu veux.' : free.mode === 'pairs' ? 'Les paires sont un jeu d\'échauffement, sans note.' : 'Tes réponses comptent dans la révision espacée : un élément raté revient dès la prochaine révision du jour.'}</p>`;
  const bind = (sel, fn) => { const el = $(sel); if (el) el.onclick = e => { const c = e.target.closest('.chip'); if (c) { fn(c); screenLibre(); } }; };
  bind('#ls', c => { const id = c.dataset.id; free.ids = !id ? [] : free.ids.includes(id) ? free.ids.filter(x => x !== id) : [...free.ids, id]; });
  bind('#src', c => { free.src = c.dataset.k; });
  bind('#md', c => { free.mode = c.dataset.k; });
  bind('#nb', c => { free.n = +c.dataset.k; });
  $('#go').onclick = () => runFree();
}
function runFree() {
  const pool = freePool(); const n = free.n || pool.length;
  let tasks;
  if (free.src === 'alpha') tasks = shuffle(pool.slice()).slice(0, n).map(it => ({ type: 'alpha', it }));
  else if (free.src === 'fix') tasks = pickWeighted(pool, n).map(it => ({ type: 'fix', it }));
  else if (free.mode === 'pairs') { const pk = pickWeighted(pool.filter(i => i.djp.length <= 30), n); tasks = []; for (let k = 0; k + 3 <= pk.length || (k === 0 && pk.length >= 2); k += 5) tasks.push({ type: 'pairs', it: pk[k], its: pk.slice(k, k + 5) }); }
  else tasks = pickWeighted(pool, n).map(it => ({ type: free.mode === 'auto' ? taskFor(it) : free.mode === 'qcm' ? (Math.random() < 0.5 ? 'qcm-fr' : 'qcm-dj') : free.mode, it }));
  startSession(free.src === 'alpha' ? 'Alphabet' : 'Séance libre', tasks, () => runFree(), 'free');
}

/* ---------- Progrès ---------- */
function screenProgres(anchor) {
  setHead('Progrès'); checkBadges();
  const seen = ALL.filter(i => st(i)).length, kn = ALL.filter(i => boxOf(i) >= ACQUIS).length;
  const fc = []; for (let d = 1; d <= 7; d++) { const a = addDays(studyStart(), d), b = addDays(studyStart(), d + 1); fc.push([a, ALL.filter(i => st(i) && st(i).due >= a && st(i).due < b).length]); }
  const mx = Math.max(1, ...fc.map(x => x[1])); const days = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
  const weak = ITEMS.filter(i => st(i) && st(i).ko > 0 && boxOf(i) < ACQUIS).sort((a, b) => (st(b).lapses * 2 + st(b).ko) - (st(a).lapses * 2 + st(a).ko));
  const exIds = new Set(D.lessons.flatMap(l => l.blocks.filter(b => b.t === 'ex').map(b => b.id)));
  const exDone = Object.keys(P.ex).filter(k => exIds.has(k)).length;
  view.innerHTML = `<div class="stats"><div class="card"><div class="big">${kn}</div><div class="muted">acquis</div></div><div class="card"><div class="big">${seen - kn}</div><div class="muted">en cours</div></div><div class="card"><div class="big">${ALL.length - seen}</div><div class="muted">jamais vus</div></div></div>
  <p class="muted" style="font-size:.85rem">« Acquis » : su plusieurs fois de suite, prochaine révision dans 7 jours ou plus. Série : ${plural(streak(), 'jour')} · Exercices des leçons faits : ${exDone} sur ${exIds.size}.</p>
  <div class="lab">Révisions des 7 prochains jours</div><div class="forecast">${fc.map(([t, n]) => `<div><span>${n}</span><b style="height:${n / mx * 3.6}rem"></b>${days[new Date(t).getDay()]}</div>`).join('')}</div>
  <div class="lab">Badges (${Object.keys(P.badges).length} sur ${BADGES.length})</div><div class="badges">${BADGES.map(b => `<div class="badge ${P.badges[b[0]] ? 'on' : ''}"><b>${esc(b[1])}</b><span>${P.badges[b[0]] ? 'le ' + esc(P.badges[b[0]].split('-').reverse().join('/')) : esc(b[2])}</span></div>`).join('')}</div>
  <div class="lab">Par leçon</div>${NAV.filter(id => lessonStats(id).n).map(id => { const s = lessonStats(id); const k = s.known / s.n * 100, v = (s.seen - s.known) / s.n * 100; return `<a href="#/lecon/${id}" style="display:block;margin:.45rem 0;text-decoration:none;color:inherit"><div class="prog"><span>${lessonLabel(id)} · ${esc(strip(byId[id].title))}</span><span>${s.known}/${s.n}</span></div><div class="bar"><i style="width:${k}%"></i><i class="seen" style="width:${v}%"></i></div></a>`; }).join('')}
  <div class="legend">Barre foncée : acquis · claire : en cours.</div>
  <div class="lab l-fix">${IC.fix}Mes erreurs (${weak.length})</div>${weak.length ? `<button type="button" class="btn small" id="rw">Réviser mes erreurs</button><div class="vocab" style="margin-top:.4rem">${weak.slice(0, 40).map(i => `<div class="it"><div class="fr">${i.fr} <span class="muted">· raté ${st(i).ko} fois</span></div><div class="dj">${i.dj}</div><div class="ar">${esc(i.ar)}</div></div>`).join('')}</div>` : '<p class="muted">Rien pour l\'instant.</p>'}
  <div class="lab">Dernières séances</div>${P.sessions.slice(-10).reverse().map(s => `<div class="prog"><span>${esc(s.d)} · ${esc(s.t)}</span><span>${Number(s.ok)}/${Number(s.n)}</span></div>`).join('') || '<p class="muted">Aucune séance.</p>'}
  <div class="lab" id="sauvegarde">Sauvegarde</div><p class="muted">Ta progression est enregistrée sur ce téléphone${P.persisted ? ' (stockage protégé)' : ''}. Dernier export : ${P.backup ? new Date(P.backup).toLocaleDateString('fr-FR') : 'jamais'}. Exporte-la de temps en temps : tu peux aussi m'envoyer le fichier pour que tes fiches d'exercices ciblent tes erreurs.</p>
  <div class="chips"><button type="button" class="btn small" id="exp">Exporter</button><label class="btn small ghost" tabindex="0">Importer<input type="file" id="imp" accept=".json,application/json" hidden></label><a class="btn small ghost" href="#/reglages">Réglages</a><a class="btn small ghost" href="#/notes">Mes notes</a></div>`;
  if ($('#rw')) $('#rw').onclick = () => { free = { ids: [], src: 'erreurs', mode: 'auto', n: 20 }; runFree(); };
  $('#exp').onclick = exportProgress;
  $('#imp').onchange = e => importProgress(e.target.files[0]);
  $('label.btn', view).onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#imp').click(); } };
  if (anchor === 'sauvegarde') setTimeout(() => $('#sauvegarde').scrollIntoView(), 50);
}
function exportProgress() {
  const name = 'darija-progression-' + dayKey() + '.json';
  const data = JSON.stringify(Object.assign({}, P, { app: 'darija', exported: new Date().toISOString(), content: D.hash }));
  const file = new File([data], name, { type: 'application/json' });
  const done = () => { P.backup = Date.now(); save(); toast('Progression exportée.'); };
  if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: 'Progression darija' }).then(done).catch(() => {});
  else { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 10000); done(); }
}
function importProgress(f) {
  if (!f) return;
  f.text().then(t => {
    let raw = JSON.parse(t);
    if (!raw || typeof raw.items !== 'object') throw new Error('format');
    if (Object.keys(raw.items).some(k => /^[LA]\d\d\|/.test(k))) raw = fromV1(raw);   // sauvegarde de la première version
    if (!confirm('Remplacer la progression de ce téléphone par celle du fichier ? (L\'actuelle est gardée de côté : Réglages > Rétablir.)')) return;
    try { localStorage.setItem(BACKUP_KEY, localStorage.getItem(KEY) || '{}'); } catch (e) {}
    const p = normalize(raw); p.epoch = Date.now(); p.rev = P.rev; p.notes = mergeNotes(P.notes, p.notes); P = p; save(); applyFont(); updateBadge();
    toast(plural(Object.keys(P.items).length, 'élément') + ' importés.'); route(true);
  }).catch(() => toast('Ce fichier n\'est pas une sauvegarde de l\'application.'));
}

/* ---------- Réglages et aide ---------- */
function screenReglages() {
  setHead('Réglages', true);
  const S = P.settings;
  const opt = (key, labels) => `<div class="chips" data-set="${key}">${SETTINGS[key].map((v, i) => chip(`data-v="${i}"`, S[key] === v, labels[i])).join('')}</div>`;
  let hasBackup = false; try { hasBackup = !!localStorage.getItem(BACKUP_KEY); } catch (e) {}
  view.innerHTML = `<div class="card"><b>Nouveaux éléments par jour</b>${opt('newPerDay', ['5', '10', '15', '20', '30'])}</div>
  <div class="card"><b>Longueur d'une séance de révision</b>${opt('maxReview', ['10', '20', '30', '50', 'Toutes'])}</div>
  <div class="card"><b>Taille du texte</b>${opt('font', ['Petite', 'Normale', 'Grande', 'Très grande'])}<div class="ar" style="text-align:left">سْمِيتِي هُوڭُو</div></div>
  <div class="card"><b>Lecture de l'arabe pendant les révisions</b>${opt('arabic', ['Oui, parfois', 'Non'])}</div>
  <div class="card"><b>Apprendre aussi les phrases modèles</b>${opt('phrases', ['Oui', 'Seulement les mots'])}</div>
  <div class="card"><b>Application</b><p class="muted">Contenu du ${esc(VDATE)} (${esc(D.hash)}). Fonctionne hors ligne une fois installée ; les mises à jour s'installent quand tu l'ouvres avec internet.</p><div class="chips"><button type="button" class="btn small ghost" id="upd">Chercher une mise à jour</button><a class="btn small ghost" href="#/aide">Comment ça marche&nbsp;?</a></div></div>
  ${hasBackup ? '<div class="card"><b>Dernier import</b><p class="muted">La progression d\'avant l\'import a été gardée de côté.</p><button type="button" class="btn small ghost" id="undo">Rétablir la progression d\'avant l\'import</button></div>' : ''}
  <div class="card"><b>Zone sensible</b><p class="muted">Efface toute ta progression sur ce téléphone (pense à exporter avant). Tes notes sont gardées.</p><button type="button" class="btn small bad" id="rst">Tout effacer</button></div>`;
  $$('[data-set]').forEach(box => { box.onclick = e => { const c = e.target.closest('.chip'); if (!c) return; const key = box.dataset.set; P.settings[key] = SETTINGS[key][+c.dataset.v]; P.settingsAt = Date.now(); save(); applyFont(); screenReglages(); }; });
  $('#upd').onclick = () => {
    if (!navigator.onLine) return toast('Pas de connexion.');
    if (!window.__reg) return toast('Disponible une fois l\'application installée.');
    lastCheck = Date.now(); window.__reg.update().then(() => toast(window.__reg.installing || window.__reg.waiting ? 'Mise à jour trouvée, installation…' : 'Tu as la dernière version.')).catch(() => toast('Vérification impossible.'));
  };
  if ($('#undo')) $('#undo').onclick = () => {
    if (!confirm('Revenir à la progression d\'avant l\'import ?')) return;
    let old = null; try { old = JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null'); } catch (e) {}
    const p = normalize(old); p.epoch = Date.now(); p.rev = P.rev; p.notes = mergeNotes(p.notes, P.notes); P = p; save();
    try { localStorage.removeItem(BACKUP_KEY); } catch (e) {}
    applyFont(); toast('Progression rétablie.'); screenReglages();
  };
  $('#rst').onclick = () => { if (!confirm('Effacer toute ta progression ?')) return; const p = normalize({ settings: P.settings, settingsAt: P.settingsAt, notes: P.notes }); p.epoch = Date.now(); p.rev = P.rev; P = p; save(); R = null; toast('Progression effacée.'); };
}
function screenAide() {
  setHead('Comment ça marche\u00a0?', true);
  view.innerHTML = `<div class="card help"><h3>Ton parcours du jour</h3><p>L'accueil propose trois étapes, dans l'ordre : <b>Réviser</b> ce qui est dû, <b>Apprendre</b> quelques nouveaux éléments, <b>Pratiquer</b> (un dialogue, tes fautes relevées ou un exercice). Dix à quinze minutes suffisent. Chaque jour complet allonge ta série.</p>
  <h3>La méthode</h3><ol>
  <li><b>Trie les leçons déjà vues en cours</b> : dans chaque leçon, « Coche ce que tu connais ». Ce que tu sais part en révision espacée.</li>
  <li><b>Chaque leçon a ses étapes</b> : la lire, apprendre ses mots, jouer ses dialogues, faire ses exercices. « Cacher la darija » ou « Cacher le français » transforme les tableaux en test ; en lecture, touche un mot pour le réviser aujourd'hui ou le signaler.</li>
  <li><b>Apprendre</b> : les nouveaux éléments arrivent dans l'ordre du cours, par groupes de cinq : présentation, jeu d'association, puis QCM. Si tu en connais un, touche « Je connais déjà ».</li>
  <li><b>Réviser</b> : l'application redonne chaque élément de plus en plus tard quand tu réussis (1, 2, 4, 7, 15, 30, 60, 120 jours) et tout de suite quand tu rates. Les séances sont courtes ; tu peux les enchaîner. La journée change à 4 h du matin.</li>
  <li><b>Le niveau monte avec toi</b> : d'abord reconnaître (QCM), puis te rappeler (cartes : « Raté », « Hésité » ou « Su ») et remettre des phrases en ordre, puis écrire la darija toi-même.</li>
  <li><b>Tes fautes relevées</b> en cours reviennent aussi : la forme que tu avais écrite, et la forme correcte.</li>
  <li><b>Dialogues</b> : cache le français, ou joue un rôle.</li>
  <li><b>Badges et série</b> : ils sont dans l'onglet Progrès.</li></ol>
  <h3>Bloc-notes</h3><p>Un bug, une idée, une erreur dans le cours ? Touche le crayon en haut de l'écran, ou « Signaler » sur une carte, un mot ou un dialogue : l'endroit exact est noté tout seul. Dans « Mes notes », « Envoyer mes notes » crée un fichier texte à me transmettre (par exemple en l'enregistrant dans ton dossier Arabe sur OneDrive). Les notes sont aussi dans l'export de ta progression.</p>
  <h3>Écrire en darija</h3><p>3 = ع, 7 = ح, 9 = ق, gh = غ, kh = خ, ch = ش, ou = و. Les touches 3, 7, 9, ' et - sont au-dessus du clavier. Les tirets, apostrophes, espaces et majuscules ne comptent pas ; une seule lettre de différence dans un mot de 4 lettres ou plus compte « Hésité » (bzzaf ≠ bzaf). Si ta variante est juste, touche « J'avais juste ».</p>
  <h3>Hors ligne</h3><p>Une fois ajoutée à l'écran d'accueil, l'application fonctionne sans internet. Ta progression reste sur ce téléphone : exporte-la de temps en temps (Progrès), et envoie-la-moi pour des fiches ciblées sur tes erreurs.</p></div>`;
}

/* ======================= routeur ======================= */
function route(keepScroll) {
  const h = location.hash || '#/'; const p = h.replace(/^#\/?/, '').split('/').map(x => decodeURIComponent(x));
  if (p[0] !== 'session') document.body.classList.remove('in-session');
  if (p[0] !== 'notes') prevHash = h;
  const sh = $('#sheet'); if (sh) sh.remove();
  switch (p[0]) {
    case 'lecons': screenLessons(); break;
    case 'lecon': screenLesson(p[1]); break;
    case 'tri': screenTri(p[1]); break;
    case 'memo': screenMemo(); break;
    case 'lexique': screenLexique(); break;
    case 'dialogues': screenDialogues(); break;
    case 'dialogue': screenDialogue(p[1], p[2]); break;
    case 'session': screenSession(); break;
    case 'libre': screenLibre(); break;
    case 'progres': screenProgres(p[1]); break;
    case 'reglages': screenReglages(); break;
    case 'aide': screenAide(); break;
    case 'notes': screenNotes(); break;
    default: screenHome();
  }
  if (!keepScroll && p[0] !== 'session') window.scrollTo(0, 0);
  updateResumeBar(p[0] === 'session'); updateBadge();
}
window.addEventListener('hashchange', () => route());
route();

/* ======================= hors ligne et mises à jour ======================= */
const net = () => { $('#net').textContent = navigator.onLine ? '' : 'hors ligne'; };
window.addEventListener('online', net); window.addEventListener('offline', net); net();
let lastCheck = 0;
function checkUpdate() { if (window.__reg && navigator.onLine && Date.now() - lastCheck > HOUR) { lastCheck = Date.now(); window.__reg.update().catch(() => {}); } }
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  let had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg => { window.__reg = reg; lastCheck = Date.now(); }).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!had) { had = true; return; }   // première installation : rien à recharger
    const b = $('#banner'); b.hidden = false; b.innerHTML = 'Nouvelle version des cours installée.<button type="button" id="rl">Recharger</button>';
    $('#rl').onclick = () => location.reload();
  });
}
window.__darija = { P: () => P, R: () => R, ITEMS, FIXES, ALPHA, LEX, DIALOGS, LEARN, NAV, grade, save, route, dueList, nextNew, studyStart, addDays, endOfToday, dayKey, streak, accepted, fromV1, daily, checkBadges, BADGES, bonus };   // pour les tests
})();
