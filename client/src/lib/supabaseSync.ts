// Sincronizacao em tempo real entre PokerGestor e Supabase (PostgreSQL)

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://zwqpykunofoetqwioydy.supabase.co";

export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_EMd_-rFGUX90OxcT5uY46w_S37KevNQ";

const DEFAULT_CLUB_ID = "default-club";
const SYNC_META_KEY = "pokergestor_supabase_last_sync_at";
const SYNC_EVENT_NAME = "pokergestor:supabase-synced";

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: SUPABASE_KEY,
    "Content-Type": "application/json",
    ...extra,
  };
  if (SUPABASE_KEY.startsWith("eyJ")) {
    headers.Authorization = `Bearer ${SUPABASE_KEY}`;
  }
  return headers;
}

function collectLocalStateSnapshot(): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || key === SYNC_META_KEY || key.startsWith("__")) continue;
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        try {
          snapshot[key] = JSON.parse(raw);
        } catch {
          snapshot[key] = raw;
        }
      }
    }
  } catch {
    // Ignore storage access errors
  }
  return snapshot;
}

function findPrimaryStateObject(
  snapshot: Record<string, unknown>
): Record<string, unknown> | null {
  for (const val of Object.values(snapshot)) {
    if (
      val &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      ("tournaments" in val || "players" in val || "blindStructures" in val)
    ) {
      return val as Record<string, unknown>;
    }
  }
  return null;
}

async function upsertNormalizedTables(primary: Record<string, unknown>): Promise<void> {
  const nowIso = new Date().toISOString();

  const clubPayload = [
    {
      id: DEFAULT_CLUB_ID,
      name: String(primary.clubName ?? primary.name ?? "PokerGestor"),
      unit_name: String(primary.unitName ?? "Unidade principal"),
      default_buy_in: Number(primary.defaultBuyIn ?? 30),
      default_rebuy: Number(primary.defaultRebuy ?? 30),
      default_addon: Number(primary.defaultAddon ?? 40),
      buy_in_chips: Number(primary.buyInChips ?? 15000),
      rebuy_chips: Number(primary.rebuyChips ?? 15000),
      addon_chips: Number(primary.addonChips ?? 20000),
      updated_at: nowIso,
    },
  ];
  await fetch(`${SUPABASE_URL}/rest/v1/clubs?on_conflict=id`, {
    method: "POST",
    headers: buildHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify(clubPayload),
  });

  if (Array.isArray(primary.blindStructures) && primary.blindStructures.length > 0) {
    const structRows = primary.blindStructures.map(
      (s: Record<string, unknown>, idx: number) => ({
        id: String(s.id ?? `struct-${idx + 1}`),
        club_id: DEFAULT_CLUB_ID,
        name: String(s.name ?? `Estrutura ${idx + 1}`),
        level_duration: Number(s.levelDuration ?? s.duration ?? 15),
        bb_ante_enabled: Boolean(s.bbAnteEnabled ?? false),
        bb_ante_start_level: Number(s.bbAnteStartLevel ?? 1),
        buy_in: Number(s.buyIn ?? primary.defaultBuyIn ?? 30),
        rebuy: Number(s.rebuy ?? primary.defaultRebuy ?? 30),
        addon: Number(s.addon ?? primary.defaultAddon ?? 40),
        buy_in_chips: Number(s.buyInChips ?? primary.buyInChips ?? 15000),
        rebuy_chips: Number(s.rebuyChips ?? primary.rebuyChips ?? 15000),
        addon_chips: Number(s.addonChips ?? primary.addonChips ?? 20000),
        levels: Array.isArray(s.levels)
          ? s.levels
          : Array.isArray(s.blindLevels)
          ? s.blindLevels
          : [],
        updated_at: nowIso,
      })
    );
    await fetch(`${SUPABASE_URL}/rest/v1/blind_structures?on_conflict=id`, {
      method: "POST",
      headers: buildHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify(structRows),
    });
  }

  if (Array.isArray(primary.tournaments) && primary.tournaments.length > 0) {
    const tournRows = primary.tournaments.map(
      (t: Record<string, unknown>, idx: number) => ({
        id: String(t.id ?? `tourn-${idx + 1}`),
        club_id: DEFAULT_CLUB_ID,
        name: String(t.name ?? `Torneio ${idx + 1}`),
        status: String(t.status ?? "Em andamento"),
        scheduled_at: t.date ? String(t.date) : t.scheduledAt ? String(t.scheduledAt) : null,
        buy_in: Number(t.buyIn ?? 30),
        rebuy: Number(t.rebuy ?? t.buyIn ?? 30),
        addon: Number(t.addon ?? 40),
        starting_stack: Number(t.startingStack ?? t.buyInChips ?? 15000),
        rebuy_chips: Number(t.rebuyChips ?? 15000),
        addon_chips: Number(t.addonChips ?? 20000),
        guaranteed_prize: Number(t.guaranteedPrize ?? t.gtd ?? 0),
        prize_pool: Number(t.prizePool ?? 0),
        entries: Number(t.entries ?? 0),
        rebuys: Number(t.rebuys ?? 0),
        addons: Number(t.addons ?? 0),
        max_players: Number(t.maxPlayers ?? 18),
        level_duration: Number(t.levelDuration ?? t.blindDuration ?? t.duration ?? 15),
        bb_ante_enabled: Boolean(t.bbAnteEnabled ?? false),
        bb_ante_start_level: Number(t.bbAnteStartLevel ?? 1),
        blind_structure_id: t.blindStructureId ? String(t.blindStructureId) : null,
        blind_levels: Array.isArray(t.blindLevels)
          ? t.blindLevels
          : Array.isArray(t.levels)
          ? t.levels
          : [],
        registrations: Array.isArray(t.registrations) ? t.registrations : [],
        tables_draw: Array.isArray(t.tablesDraw) ? t.tablesDraw : [],
        updated_at: nowIso,
      })
    );
    await fetch(`${SUPABASE_URL}/rest/v1/tournaments?on_conflict=id`, {
      method: "POST",
      headers: buildHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify(tournRows),
    });
  }

  if (Array.isArray(primary.players) && primary.players.length > 0) {
    const playerRows = primary.players.map(
      (p: Record<string, unknown>, idx: number) => ({
        id: String(p.id ?? `player-${idx + 1}`),
        club_id: DEFAULT_CLUB_ID,
        name: String(p.name ?? `Jogador ${idx + 1}`),
        nickname: p.nickname ? String(p.nickname) : null,
        phone: p.phone ? String(p.phone) : null,
        cpf: p.cpf ? String(p.cpf) : null,
        balance: Number(p.balance ?? 0),
        ranking_points: Number(p.points ?? p.rankingPoints ?? 0),
        tournaments_played: Number(p.tournamentsPlayed ?? 0),
        active: p.active !== false,
        updated_at: nowIso,
      })
    );
    await fetch(`${SUPABASE_URL}/rest/v1/players?on_conflict=id`, {
      method: "POST",
      headers: buildHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify(playerRows),
    });
  }

  const rawTx = Array.isArray(primary.transactions)
    ? primary.transactions
    : Array.isArray(primary.financialTransactions)
    ? primary.financialTransactions
    : [];
  if (rawTx.length > 0) {
    const txRows = rawTx.map((tx: Record<string, unknown>, idx: number) => ({
      id: String(tx.id ?? `tx-${idx + 1}`),
      club_id: DEFAULT_CLUB_ID,
      category: String(tx.category ?? tx.area ?? "Torneio"),
      description: String(tx.description ?? tx.title ?? "Movimentação"),
      amount: Number(tx.amount ?? tx.value ?? 0),
      type: String(tx.type ?? "entrada"),
      payment_method: String(tx.paymentMethod ?? tx.method ?? "PIX"),
      player_id: tx.playerId ? String(tx.playerId) : null,
      player_name: tx.playerName ? String(tx.playerName) : null,
      tournament_id: tx.tournamentId ? String(tx.tournamentId) : null,
    }));
    await fetch(`${SUPABASE_URL}/rest/v1/financial_transactions?on_conflict=id`, {
      method: "POST",
      headers: buildHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify(txRows),
    });
  }
}

let isPushing = false;
let isApplyingRemote = false;

export async function pushStateToSupabase(
  explicitPrimary?: Record<string, unknown>
): Promise<boolean> {
  if (isPushing || isApplyingRemote) return false;
  isPushing = true;
  try {
    const snapshot = collectLocalStateSnapshot();
    if (explicitPrimary) {
      snapshot.__primaryState = explicitPrimary;
    }
    const primary = explicitPrimary ?? findPrimaryStateObject(snapshot);
    if (!primary && Object.keys(snapshot).length === 0) {
      return false;
    }

    const nowIso = new Date().toISOString();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/club_state_sync?on_conflict=club_id`, {
      method: "POST",
      headers: buildHeaders({ Prefer: "resolution=merge-duplicates,return=representation" }),
      body: JSON.stringify([
        {
          club_id: DEFAULT_CLUB_ID,
          state_json: snapshot,
          updated_at: nowIso,
        },
      ]),
    });

    if (res.ok) {
      window.localStorage.setItem(SYNC_META_KEY, nowIso);
      if (primary) {
        await upsertNormalizedTables(primary);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  } finally {
    isPushing = false;
  }
}

export async function pullStateFromSupabase(
  force = false
): Promise<Record<string, unknown> | null> {
  if (isPushing) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/club_state_sync?club_id=eq.${DEFAULT_CLUB_ID}&select=state_json,updated_at`,
      {
        method: "GET",
        headers: buildHeaders(),
      }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{
      state_json?: Record<string, unknown>;
      updated_at?: string;
    }>;
    const row = rows[0];
    const remoteState = row?.state_json;
    if (!remoteState || Object.keys(remoteState).length === 0) {
      await pushStateToSupabase();
      return null;
    }

    const remoteUpdated = row?.updated_at ? Date.parse(row.updated_at) : 0;
    const localUpdatedRaw = window.localStorage.getItem(SYNC_META_KEY);
    const localUpdated = localUpdatedRaw ? Date.parse(localUpdatedRaw) : 0;

    if (!force && localUpdated > 0 && remoteUpdated <= localUpdated) {
      return null;
    }

    isApplyingRemote = true;
    try {
      for (const [k, v] of Object.entries(remoteState)) {
        if (k === "__primaryState" || k === SYNC_META_KEY) continue;
        const serialized = typeof v === "string" ? v : JSON.stringify(v);
        if (window.localStorage.getItem(k) !== serialized) {
          window.localStorage.setItem(k, serialized);
        }
      }
      if (row?.updated_at) {
        window.localStorage.setItem(SYNC_META_KEY, row.updated_at);
      }
      const primary =
        (remoteState.__primaryState as Record<string, unknown> | undefined) ??
        findPrimaryStateObject(remoteState);

      window.dispatchEvent(
        new CustomEvent(SYNC_EVENT_NAME, {
          detail: { primary, snapshot: remoteState },
        })
      );
      return primary;
    } finally {
      isApplyingRemote = false;
    }
  } catch {
    return null;
  }
}

let initialized = false;

export function initSupabaseRealtimeSync(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  void pullStateFromSupabase(false);

  const origSetItem = window.localStorage.setItem.bind(window.localStorage);
  let debounceTimer: number | undefined;

  window.localStorage.setItem = (key: string, value: string) => {
    origSetItem(key, value);
    if (isApplyingRemote || key === SYNC_META_KEY) return;
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      void pushStateToSupabase();
    }, 800);
  };

  window.setInterval(() => {
    void pullStateFromSupabase(false);
  }, 4000);
}