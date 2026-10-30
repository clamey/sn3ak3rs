// Top-10 high-score table. Shared through Supabase's REST API when configured, otherwise kept
// in this browser's localStorage.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const LOCAL_KEY = 'spacebugs.scores';
const TABLE_SIZE = 10;

export const isShared = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Everything coming back from the network or storage is untrusted: keep only well-formed rows.
function clean(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((r) => r && /^[A-Z]{3}$/.test(r.initials) && Number.isInteger(r.score) && r.score > 0)
    .map((r) => ({ initials: r.initials, score: r.score, wave: Number.isInteger(r.wave) ? r.wave : 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TABLE_SIZE);
}

function loadLocal() {
  try { return clean(JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')); } catch { return []; }
}

function saveLocal(rows) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(rows)); } catch { /* storage unavailable */ }
}

function headers() {
  const h = { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  // Legacy anon keys are JWTs and go in Authorization too; newer publishable keys must not.
  if (!SUPABASE_ANON_KEY.startsWith('sb_')) h.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
  return h;
}

export async function fetchScores() {
  if (!isShared) return loadLocal();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/scores?select=initials,score,wave&order=score.desc&limit=${TABLE_SIZE}`,
    { headers: headers() },
  );
  if (!res.ok) throw new Error(`scores fetch failed: ${res.status}`);
  return clean(await res.json());
}

export async function submitScore(entry) {
  if (!isShared) {
    const rows = clean([...loadLocal(), entry]);
    saveLocal(rows);
    return rows;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=minimal' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error(`score submit failed: ${res.status}`);
  return fetchScores();
}

export function qualifies(table, score) {
  return score > 0 && (table.length < TABLE_SIZE || score > table[table.length - 1].score);
}
