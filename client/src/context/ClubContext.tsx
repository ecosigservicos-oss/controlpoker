import { initSupabaseRealtimeSync, pushStateToSupabase } from "@/lib/supabaseSync";
import { useRef, createContext, useContext, useEffect, useState, type ReactNode  } from "react";
import {
  DEFAULT_BLIND_LEVELS,
  DEFAULT_TOURNAMENT_RULES,
  type ActivityItem,
  type BlindLevel,
  type Tournament,
  type TournamentRulesConfig,
  type Transaction,
  type ViewKey,
} from "@/types/club";

const TOURNAMENTS_STORAGE_KEY = "controlpoker_tournaments_v1";
const BLINDS_STORAGE_KEY = "controlpoker_blinds_v1";
const RULES_STORAGE_KEY = "controlpoker_rules_v1";
const PLAYERS_STORAGE_KEY = "controlpoker_players_v1";

type ClubContextValue = {
  view: ViewKey;
  setView: (view: ViewKey) => void;
  tournaments: Tournament[];
  setTournaments: React.Dispatch<React.SetStateAction<Tournament[]>>;
  selectedTournamentId: string | null;
  setSelectedTournamentId: (id: string | null) => void;
  activeTournament: Tournament | null;
  blindLevels: BlindLevel[];
  setBlindLevels: React.Dispatch<React.SetStateAction<BlindLevel[]>>;
  rules: TournamentRulesConfig;
  setRules: React.Dispatch<React.SetStateAction<TournamentRulesConfig>>;
  savedPlayers: string[];
  registerSavedPlayer: (name: string) => void;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  activities: ActivityItem[];
  setActivities: React.Dispatch<React.SetStateAction<ActivityItem[]>>;
  toast: string | null;
  setToast: (msg: string | null) => void;
};

const ClubContext = createContext<ClubContextValue | null>(null);

function mergeUniqueNames(existing: string[], incoming: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of [...existing, ...incoming]) {
    const clean = raw.trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(clean);
    }
  }
  return result;
}

export function ClubProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewKey>("overview");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [blindLevels, setBlindLevels] = useState<BlindLevel[]>(() => {
    try {
      const saved = localStorage.getItem(BLINDS_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as BlindLevel[]) : DEFAULT_BLIND_LEVELS;
    } catch {
      return DEFAULT_BLIND_LEVELS;
    }
  });

  const [rules, setRules] = useState<TournamentRulesConfig>(() => {
    try {
      const saved = localStorage.getItem(RULES_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as TournamentRulesConfig) : DEFAULT_TOURNAMENT_RULES;
    } catch {
      return DEFAULT_TOURNAMENT_RULES;
    }
  });

  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    try {
      const saved = localStorage.getItem(TOURNAMENTS_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved) as Tournament[];
      return parsed.map(t => ({
        ...t,
        stack: t.stack === "1500" ? "15.000" : t.stack,
        registrations: (t.registrations ?? []).map(r =>
          r.entryType === "Buy-in" && r.chips === "1500" ? { ...r, chips: "15.000" } : r
        ),
      }));
    } catch {
      return [];
    }
  });

  const [savedPlayers, setSavedPlayers] = useState<string[]>(() => {
    try {
      const storedPlayers = JSON.parse(localStorage.getItem(PLAYERS_STORAGE_KEY) || "[]") as string[];
      const storedTournaments = JSON.parse(localStorage.getItem(TOURNAMENTS_STORAGE_KEY) || "[]") as Tournament[];
      const fromTournaments = storedTournaments.flatMap(t =>
        (t.registrations ?? []).map(r => r.playerName)
      );
      return mergeUniqueNames(storedPlayers, fromTournaments);
    } catch {
      return [];
    }
  });

  const registerSavedPlayer = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setSavedPlayers(current => mergeUniqueNames(current, [clean]));
  };

  useEffect(() => {
    try {
      localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(tournaments));
    } catch {}
  }, [tournaments]);

  useEffect(() => {
    try {
      localStorage.setItem(PLAYERS_STORAGE_KEY, JSON.stringify(savedPlayers));
    } catch {}
  }, [savedPlayers]);

  useEffect(() => {
    try {
      localStorage.setItem(BLINDS_STORAGE_KEY, JSON.stringify(blindLevels));
    } catch {}
  }, [blindLevels]);

  useEffect(() => {
    try {
      localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
    } catch {}
  }, [rules]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const activeTournament =
    tournaments.find(item => item.id === selectedTournamentId) ?? tournaments[0] ?? null;
useEffect(() => {
    const timer = window.setTimeout(() => {
      void pushStateToSupabase({ view, transactions, activities, selectedTournamentId, toast, blindLevels, rules, tournaments, savedPlayers });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [view, transactions, activities, selectedTournamentId, toast, blindLevels, rules, tournaments, savedPlayers]);
  // Sincronizacao instantanea em memoria sem sobrescrever o Supabase na montagem inicial
  const didMountSyncRef = useRef(false);

  useEffect(() => {
    initSupabaseRealtimeSync();

    const handleRemoteState = (ev: Event) => {
      const detail = (ev as CustomEvent<{ liveContext?: Record<string, unknown> }>).detail;
      const live = detail?.liveContext;
      if (!live || typeof live !== "object") return;
      if ("view" in live && live["view"] !== undefined) { setView(prev => (JSON.stringify(prev) === JSON.stringify(live["view"]) ? prev : (live["view"] as never))); }
      if ("transactions" in live && live["transactions"] !== undefined) { setTransactions(prev => (JSON.stringify(prev) === JSON.stringify(live["transactions"]) ? prev : (live["transactions"] as never))); }
      if ("activities" in live && live["activities"] !== undefined) { setActivities(prev => (JSON.stringify(prev) === JSON.stringify(live["activities"]) ? prev : (live["activities"] as never))); }
      if ("selectedTournamentId" in live && live["selectedTournamentId"] !== undefined) { setSelectedTournamentId(prev => (JSON.stringify(prev) === JSON.stringify(live["selectedTournamentId"]) ? prev : (live["selectedTournamentId"] as never))); }
      if ("toast" in live && live["toast"] !== undefined) { setToast(prev => (JSON.stringify(prev) === JSON.stringify(live["toast"]) ? prev : (live["toast"] as never))); }
      if ("blindLevels" in live && live["blindLevels"] !== undefined) { setBlindLevels(prev => (JSON.stringify(prev) === JSON.stringify(live["blindLevels"]) ? prev : (live["blindLevels"] as never))); }
      if ("rules" in live && live["rules"] !== undefined) { setRules(prev => (JSON.stringify(prev) === JSON.stringify(live["rules"]) ? prev : (live["rules"] as never))); }
      if ("tournaments" in live && live["tournaments"] !== undefined) { setTournaments(prev => (JSON.stringify(prev) === JSON.stringify(live["tournaments"]) ? prev : (live["tournaments"] as never))); }
      if ("savedPlayers" in live && live["savedPlayers"] !== undefined) { setSavedPlayers(prev => (JSON.stringify(prev) === JSON.stringify(live["savedPlayers"]) ? prev : (live["savedPlayers"] as never))); }
    };

    window.addEventListener("pokergestor:supabase-synced", handleRemoteState);
    return () => {
      window.removeEventListener("pokergestor:supabase-synced", handleRemoteState);
    };
  }, []);

  useEffect(() => {
    if (!didMountSyncRef.current) {
      didMountSyncRef.current = true;
      return;
    }
    const timer = window.setTimeout(() => {
      void pushStateToSupabase({ view, transactions, activities, selectedTournamentId, toast, blindLevels, rules, tournaments, savedPlayers });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [view, transactions, activities, selectedTournamentId, toast, blindLevels, rules, tournaments, savedPlayers]);


return (
    <ClubContext.Provider
      value={{
        view,
        setView,
        tournaments,
        setTournaments,
        selectedTournamentId,
        setSelectedTournamentId,
        activeTournament,
        blindLevels,
        setBlindLevels,
        rules,
        setRules,
        savedPlayers,
        registerSavedPlayer,
        transactions,
        setTransactions,
        activities,
        setActivities,
        toast,
        setToast,
      }}
    >
      {children}
    </ClubContext.Provider>
  );
}

export function useClub() {
  const ctx = useContext(ClubContext);
  if (!ctx) {
    throw new Error("useClub deve ser utilizado dentro de <ClubProvider>");
  }
  return ctx;
}
