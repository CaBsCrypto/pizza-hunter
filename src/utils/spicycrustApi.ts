/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const API_BASE = 'https://spicycrust-api.alphadocere.cl/api/v1';
const GAME_KEY = '5d89bb72f9c345f5ceead9b6b4979f1dd92b948d72ae1b6ac26a7611893f7a5c';
const GAME_SLUG = 'slice-hunter';

let _seasonSlug: string | null = null;

export interface SpicyLeaderboardEntry {
  rank?: number;
  nickname: string;
  score: number;
  created_at?: string;
  player_id?: number;
  player_external_id?: string;
  email?: string;
  metadata?: Record<string, any>;
}

export async function getActiveSeason(): Promise<string> {
  if (_seasonSlug) return _seasonSlug;
  try {
    const res = await fetch(`${API_BASE}/seasons?status=active`, {
      signal: AbortSignal.timeout(4000),
    });
    const json = await res.json();
    const season = Array.isArray(json) ? json[0] : (json.data ?? json);
    if (season?.slug) {
      _seasonSlug = season.slug;
      return _seasonSlug;
    }
  } catch (e: any) {
    console.warn('[SpicyCrust] Season fallback:', e?.message || e);
  }
  return 'season-01';
}

function getPlayerExternalId(): string {
  try {
    let id = localStorage.getItem('pizza_hunter_player_id');
    if (!id) {
      id = 'player-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now();
      localStorage.setItem('pizza_hunter_player_id', id);
    }
    return id;
  } catch {
    return 'player-' + Date.now();
  }
}

export async function submitScore({
  nickname,
  email = '',
  score,
  metadata = {},
}: {
  nickname: string;
  email?: string;
  score: number;
  metadata?: Record<string, any>;
}) {
  const seasonSlug = await getActiveSeason();
  const payload: Record<string, any> = {
    game_slug: GAME_SLUG,
    season_slug: seasonSlug,
    player_external_id: getPlayerExternalId(),
    nickname,
    score,
    metadata,
  };

  const cleanEmail = email ? email.trim() : '';
  if (cleanEmail) {
    payload.email = cleanEmail;
  }

  const res = await fetch(`${API_BASE}/scores`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Game-Key': GAME_KEY,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    throw new Error(errorJson?.message || `HTTP error ${res.status}`);
  }

  return await res.json();
}

export async function getLeaderboard(limit = 10): Promise<SpicyLeaderboardEntry[]> {
  try {
    const seasonSlug = await getActiveSeason();
    const res = await fetch(
      `${API_BASE}/leaderboard?game=${GAME_SLUG}&season=${seasonSlug}&limit=${limit}`,
      { signal: AbortSignal.timeout(5000) }
    );
    const json = await res.json();
    return json?.data?.ranking ?? json?.data?.leaderboard ?? json?.ranking ?? [];
  } catch (e: any) {
    console.warn('[SpicyCrust] Leaderboard fallback:', e?.message || e);
    return [];
  }
}
