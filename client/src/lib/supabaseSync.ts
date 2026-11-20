// Sincronizacao instantanea em tempo real entre PokerGestor e Supabase (PostgreSQL + Realtime)
// Inclui sanitizacao automatica contra objetos invalidos no JSX (React error #130) e trava de escrita

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://zwqpykunofoetqwioydy.supabase.co";

export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_EMd_-rFGUX90OxcT5uY46w_S37KevNQ";

const DEFAULT_CLUB_ID = "default-club";
const SYNC_META_KEY = "pokergestor_supabase_last_sync_at";
const SYNC_EVENT_NAME = "pokergestor:supabase-synced";
const BROADCAST_CHANNEL_NAME = "pokergestor_instant_sync_v1";

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

export function isSerializedReactElement(val: unknown): boolean {
  if (!val || typeof val !== "object" || Array.isArray(val)) return false;
  const obj = val as Record<string, unknown>;
  if ("$$typeof" in obj) return true;
  if ("props" in obj && ("type" in obj || "_owner" in obj || "key" in obj)) return true;
  return false;
}

export function sanitizeSyncValue<T>(val: T, fallback?: T): T {
  if (val === null || val === undefined) {
    return (fallback !== undefined ? fallback : val) as T;
  }
  if (isSerializedReactElement(val)) {
    return (fallback !== undefined ? fallback : undefined) as T;
  }
  if (Array.isArray(val)) {
    const cleaned = val
      .filter(item => !isSerializedReactElement(item))
      .map(item => sanitizeSyncValue(item));
    return cleaned as unknown as T;
  }
  if (typeof val === "object") {
    const src = val as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) {
      if (isSerializedReactElement(v)) continue;
      if (
        (k === "name" ||
          k === "playerName" ||
          k === "title" ||
          k === "description" ||
          k === "category" ||
          k === "paymentMethod" ||
          k === "method" ||
          k === "status" ||
          k === "type" ||
          k === "nickname" ||
          k === "phone" ||
          k === "unitName" ||
          k === "clubName") &&
        v !== null &&
        v !== undefined &&
        typeof v === "object"
      ) {
        const nested = v as Record<string, unknown>;
        out[k] = String(nested.name ?? nested.label ?? nested.title ?? nested.value ?? "");
        continue;
      }
      out[k] = sanitizeSyncValue(v);
    }
    return out as unknown as T;
  }
  return val;
}

function isUiNavigationKey(key: string): boolean {
  return /(?:active_?view|current_?view|active_?page|current_?page|active_?tab|current_?tab|active_?screen|current_?screen|route|sidebar|selected_?tournament|selected_?player|tv_?mode|clock_?mode|toast|notification|alert)/i.test(
    key
  );
}

function sanitizeExistingLocalStorage(): void {
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || key === SYNC_META_KEY || key.startsWith("__")) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw || (!raw.startsWith("{") && !raw.startsWith("["))) continue;
      try {
        const parsed = JSON.parse(raw);
        const sanitized = sanitizeSyncValue(parsed);
        const reserialized = JSON.stringify(sanitized);
        if (reserialized && reserialized !== raw) {
          window.localStorage.setItem(key, reserialized);
        }
      } catch {
        // Ignore non-JSON values
      }
    }
  } catch {
    // Ignore storage access errors
  }
}

function collectLocalStateSnapshot(): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || key === SYNC_META_KEY || key.startsWith("__") || isUiNavigationKey(key)) continue;
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        try {
          snapshot[key] = sanitizeSyncValue(JSON.parse(raw));
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
  if (
    snapshot.__liveContext &&
    typeof snapshot.__liveContext === "object" &&
    !Array.isArray(snapshot.__liveContext)
  ) {
    return snapshot.__liveContext as Record<string, unknown>;
  }
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
  const tasks: Array<Promise<unknown>> = [];

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
  tasks.push(
    fetch(`${SUPABASE_URL}/rest/v1/clubs?on_conflict=id`, {
      method: "POST",
      headers: buildHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify(clubPayload),
    })
  );

  const structures = Array.isArray(primary.blindStructures)
    ? primary.blindStructures
    : Array.isArray(primary.structures)
    ? primary.structures
    : [];
  if (structures.length > 0) {
    const structRows = structures.map((s: Record<string, unknown>, idx: number) => ({
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
    }));
    tasks.push(
      fetch(`${SUPABASE_URL}/rest/v1/blind_structures?on_conflict=id`, {
        method: "POST",
        headers: buildHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify(structRows),
      })
    );
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
    tasks.push(
      fetch(`${SUPABASE_URL}/rest/v1/tournaments?on_conflict=id`, {
        method: "POST",
        headers: buildHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify(tournRows),
      })
    );
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
    tasks.push(
      fetch(`${SUPABASE_URL}/rest/v1/players?on_conflict=id`, {
        method: "POST",
        headers: buildHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify(playerRows),
      })
    );
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
    tasks.push(
      fetch(`${SUPABASE_URL}/rest/v1/financial_transactions?on_conflict=id`, {
        method: "POST",
        headers: buildHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify(txRows),
      })
    );
  }

  await Promise.all(tasks);
}

let isPushing = false;
let isApplyingRemote = false;
let hasCompletedInitialPull = false;
let currentRevision = 0;
let localWriteLockUntil = 0;
let lastKnownLiveContext: Record<string, unknown> | null = null;
let localChannel: BroadcastChannel | null = null;
let realtimeSocket: WebSocket | null = null;
const tabClientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function markLocalDirty(ms = 4500): void {
  localWriteLockUntil = Math.max(localWriteLockUntil, Date.now() + ms);
}

function applySnapshotEverywhere(
  rawRemoteState: Record<string, unknown>,
  updatedAt?: string
): void {
  const remoteState = sanitizeSyncValue(rawRemoteState);
  isApplyingRemote = true;
  try {
    for (const [k, v] of Object.entries(remoteState)) {
      if (
        k === "__liveContext" ||
        k === "__primaryState" ||
        k === "__rev" ||
        k === "__writerId" ||
        k === SYNC_META_KEY ||
        isUiNavigationKey(k)
      ) {
        continue;
      }
      const serialized = typeof v === "string" ? v : JSON.stringify(v);
      if (window.localStorage.getItem(k) !== serialized) {
        window.localStorage.setItem(k, serialized);
      }
    }
    if (updatedAt) {
      window.localStorage.setItem(SYNC_META_KEY, updatedAt);
    }

    const rawLive =
      (remoteState.__liveContext as Record<string, unknown> | undefined) ??
      (remoteState.__primaryState as Record<string, unknown> | undefined) ??
      findPrimaryStateObject(remoteState);

    const liveContext = rawLive ? sanitizeSyncValue(rawLive) : null;
    if (liveContext) {
      lastKnownLiveContext = liveContext;
    }

    window.dispatchEvent(
      new CustomEvent(SYNC_EVENT_NAME, {
        detail: { liveContext, primary: liveContext, snapshot: remoteState },
      })
    );
  } finally {
    isApplyingRemote = false;
  }
}

function broadcastRealtimeSignal(snapshot: Record<string, unknown>, updatedAt: string): void {
  try {
    localChannel?.postMessage({
      sender: tabClientId,
      snapshot,
      updatedAt,
    });
  } catch {
    // Ignore BroadcastChannel errors
  }

  try {
    if (realtimeSocket && realtimeSocket.readyState === WebSocket.OPEN) {
      realtimeSocket.send(
        JSON.stringify({
          topic: "realtime:pokergestor-live",
          event: "broadcast",
          payload: {
            type: "broadcast",
            event: "state_updated",
            payload: { sender: tabClientId, rev: currentRevision, updatedAt },
          },
          ref: String(Date.now()),
        })
      );
    }
  } catch {
    // Ignore WebSocket errors
  }
}

export async function pushStateToSupabase(
  explicitLiveContext?: Record<string, unknown>,
  forcePush = false
): Promise<boolean> {
  if (isApplyingRemote) return false;
  if (!hasCompletedInitialPull && !forcePush) return false;

  markLocalDirty(4500);

  if (explicitLiveContext && Object.keys(explicitLiveContext).length > 0) {
    lastKnownLiveContext = sanitizeSyncValue(explicitLiveContext);
  }

  if (isPushing) return false;
  isPushing = true;

  try {
    const snapshot = collectLocalStateSnapshot();
    if (lastKnownLiveContext && Object.keys(lastKnownLiveContext).length > 0) {
      snapshot.__liveContext = lastKnownLiveContext;
    }

    const primary = findPrimaryStateObject(snapshot);
    if (!primary && Object.keys(snapshot).length === 0) {
      return false;
    }

    currentRevision += 1;
    snapshot.__rev = currentRevision;
    snapshot.__writerId = tabClientId;

    const nowIso = new Date().toISOString();
    window.localStorage.setItem(SYNC_META_KEY, nowIso);
    broadcastRealtimeSignal(snapshot, nowIso);

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
      if (primary) {
        await upsertNormalizedTables(primary);
      }
      localWriteLockUntil = Date.now() + 1200;
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
  if (isPushing || isApplyingRemote) return null;
  if (!force && Date.now() < localWriteLockUntil) return null;

  const pullStartedAt = Date.now();
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/club_state_sync?club_id=eq.${DEFAULT_CLUB_ID}&select=state_json,updated_at`,
      {
        method: "GET",
        headers: buildHeaders({ "Cache-Control": "no-cache" }),
      }
    );
    if (!res.ok) {
      hasCompletedInitialPull = true;
      return null;
    }

    if (isPushing || localWriteLockUntil > pullStartedAt) {
      hasCompletedInitialPull = true;
      return null;
    }

    const rows = (await res.json()) as Array<{
      state_json?: Record<string, unknown>;
      updated_at?: string;
    }>;
    const row = rows[0];
    const remoteState = row?.state_json;
    hasCompletedInitialPull = true;

    if (!remoteState || Object.keys(remoteState).length === 0) {
      await pushStateToSupabase(undefined, true);
      return null;
    }

    const remoteRev = Number(remoteState.__rev ?? 0);
    const remoteWriter = String(remoteState.__writerId ?? "");

    if (remoteWriter === tabClientId && !force) {
      return null;
    }
    if (!force && remoteRev > 0 && remoteRev <= currentRevision) {
      return null;
    }

    if (remoteRev > currentRevision) {
      currentRevision = remoteRev;
    }

    applySnapshotEverywhere(remoteState, row?.updated_at);
    return findPrimaryStateObject(remoteState);
  } catch {
    hasCompletedInitialPull = true;
    return null;
  }
}

function connectSupabaseRealtimeWebSocket(): void {
  try {
    const wsBase = SUPABASE_URL.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://");
    const wsUrl = `${wsBase}/realtime/v1/websocket?apikey=${encodeURIComponent(SUPABASE_KEY)}&vsn=1.0.0`;
    const ws = new WebSocket(wsUrl);
    realtimeSocket = ws;

    let heartbeatId: number | undefined;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          topic: "realtime:pokergestor-live",
          event: "phx_join",
          payload: {
            config: {
              broadcast: { self: false },
              postgres_changes: [
                { event: "*", schema: "public", table: "club_state_sync" },
              ],
            },
          },
          ref: "1",
        })
      );

      heartbeatId = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              topic: "phoenix",
              event: "heartbeat",
              payload: {},
              ref: String(Date.now()),
            })
          );
        }
      }, 25000);
    };

    ws.onmessage = ev => {
      try {
        const msg = JSON.parse(String(ev.data)) as {
          event?: string;
          payload?: Record<string, unknown>;
        };
        if (msg.event === "broadcast" || msg.event === "postgres_changes") {
          void pullStateFromSupabase(false);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (heartbeatId) window.clearInterval(heartbeatId);
      realtimeSocket = null;
      window.setTimeout(() => {
        connectSupabaseRealtimeWebSocket();
      }, 3000);
    };
  } catch {
    // Fallback to polling if WebSocket is unavailable
  }
}

let initialized = false;

export function initSupabaseRealtimeSync(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  // Limpa imediatamente qualquer objeto corrompido salvo anteriormente no localStorage antes do React renderizar
  sanitizeExistingLocalStorage();

  void pullStateFromSupabase(true);

  if ("BroadcastChannel" in window) {
    localChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    localChannel.onmessage = ev => {
      const data = ev.data as {
        sender?: string;
        snapshot?: Record<string, unknown>;
        updatedAt?: string;
      };
      if (data?.sender === tabClientId || !data?.snapshot) return;
      if (isPushing || Date.now() < localWriteLockUntil) return;
      const incomingRev = Number(data.snapshot.__rev ?? 0);
      if (incomingRev > 0 && incomingRev <= currentRevision) return;
      if (incomingRev > currentRevision) currentRevision = incomingRev;
      applySnapshotEverywhere(data.snapshot, data.updatedAt);
    };
  }

  window.addEventListener("storage", ev => {
    if (!ev.key || ev.key === SYNC_META_KEY || isApplyingRemote || isUiNavigationKey(ev.key)) return;
    if (isPushing || Date.now() < localWriteLockUntil) return;
    const snapshot = collectLocalStateSnapshot();
    const liveContext = findPrimaryStateObject(snapshot);
    window.dispatchEvent(
      new CustomEvent(SYNC_EVENT_NAME, {
        detail: { liveContext, primary: liveContext, snapshot },
      })
    );
  });

  const origSetItem = window.localStorage.setItem.bind(window.localStorage);
  let debounceTimer: number | undefined;

  window.localStorage.setItem = (key: string, value: string) => {
    origSetItem(key, value);
    if (isApplyingRemote || key === SYNC_META_KEY || isUiNavigationKey(key)) return;
    markLocalDirty(4500);
    if (!hasCompletedInitialPull) return;
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      void pushStateToSupabase();
    }, 120);
  };

  connectSupabaseRealtimeWebSocket();
  window.setInterval(() => {
    void pullStateFromSupabase(false);
  }, 2000);
}