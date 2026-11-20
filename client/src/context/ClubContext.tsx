import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  activities: ActivityItem[];
  setActivities: React.Dispatch<React.SetStateAction<ActivityItem[]>>;
  toast: string | null;
  setToast: (msg: string | null) => void;
};

const ClubContext = createContext<ClubContextValue | null>(null);

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

  useEffect(() => {
    try {
      localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(tournaments));
    } catch {}
  }, [tournaments]);

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
