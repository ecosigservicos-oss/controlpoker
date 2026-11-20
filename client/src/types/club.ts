import type { LucideIcon } from "lucide-react";

export type ViewKey =
  | "overview"
  | "dashboard"
  | "finance"
  | "tournaments"
  | "satellites"
  | "blinds"
  | "cash"
  | "bar"
  | "members"
  | "ranking"
  | "jackpot"
  | "tv-clock"
  | "tv-draw"
  | "settings";

export type Transaction = {
  id: string;
  date: string;
  description: string;
  category: string;
  type: "Entrada" | "Saída";
  value: number;
  payment: string;
  icon: LucideIcon;
  tone: "cyan" | "green" | "orange" | "purple" | "red";
};

export type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  tone: "cyan" | "green" | "gold" | "purple";
  icon: LucideIcon;
};

export type TournamentStatus = "Agendado" | "Em andamento" | "Finalizado";

export type EntryType = "Buy-in" | "Rebuy" | "Add-on";

export type TournamentRegistration = {
  id: string;
  playerName: string;
  entryType: EntryType;
  value: number;
  chips?: string;
  payment: string;
  time: string;
};

export type PayoutTier = {
  place: number;
  label: string;
  percentage: number;
};

export type BlindLevel = {
  level: number;
  sb: number;
  bb: number;
  ante?: number;
};

export type TournamentRulesConfig = {
  buyInValue: number;
  buyInChips: string;
  buyInBbNote: string;
  rebuyValue: number;
  rebuyChips: string;
  addonValue: number;
  addonChips: string;
  addonBbNote: string;
  blindMinutes?: number;
};

export type Tournament = {
  id: string;
  name: string;
  date: string;
  time: string;
  buyIn: number;
  rebuyValue?: number;
  addonValue?: number;
  guaranteed: number;
  stack: string;
  blindMinutes: number;
  status: TournamentStatus;
  entries: number;
  eliminatedCount?: number;
  capacity: number;
  registrations?: TournamentRegistration[];
  payouts?: PayoutTier[];
};

export const DEFAULT_PAYOUT_TIERS: PayoutTier[] = [
  { place: 1, label: "1º Lugar (Campeão)", percentage: 50 },
  { place: 2, label: "2º Lugar (Vice-campeão)", percentage: 30 },
  { place: 3, label: "3º Lugar", percentage: 20 },
];

export const DEFAULT_BLIND_LEVELS: BlindLevel[] = [
  { level: 1, sb: 50, bb: 100 },
  { level: 2, sb: 100, bb: 150 },
  { level: 3, sb: 150, bb: 200 },
  { level: 4, sb: 200, bb: 250 },
  { level: 5, sb: 250, bb: 300 },
  { level: 6, sb: 300, bb: 400 },
  { level: 7, sb: 400, bb: 500 },
  { level: 8, sb: 500, bb: 600 },
  { level: 9, sb: 600, bb: 700 },
  { level: 10, sb: 700, bb: 800 },
  { level: 11, sb: 800, bb: 900 },
  { level: 12, sb: 900, bb: 1000 },
  { level: 13, sb: 1000, bb: 1100 },
  { level: 14, sb: 1100, bb: 1200 },
  { level: 15, sb: 1200, bb: 1300 },
  { level: 16, sb: 1300, bb: 1400 },
  { level: 17, sb: 1400, bb: 1500 },
  { level: 18, sb: 1500, bb: 1600 },
  { level: 19, sb: 1600, bb: 1700 },
  { level: 20, sb: 1700, bb: 1800 },
];

export const DEFAULT_TOURNAMENT_RULES: TournamentRulesConfig = {
  buyInValue: 30,
  buyInChips: "15.000",
  buyInBbNote: "150bb",
  rebuyValue: 30,
  rebuyChips: "15.000",
  addonValue: 40,
  addonChips: "20.000",
  addonBbNote: "33,33bb",
  blindMinutes: 15,
};

export function parseChipsNumber(raw?: string, fallback = 0): number {
  if (!raw) return fallback;
  const digits = Number(raw.replace(/\D/g, ""));
  return Number.isFinite(digits) && digits > 0 ? digits : fallback;
}

export function getTournamentTotals(
  tournament: Tournament,
  rules: TournamentRulesConfig = DEFAULT_TOURNAMENT_RULES
) {
  const regs = tournament.registrations ?? [];
  const baseBuyInChips = parseChipsNumber(tournament.stack, parseChipsNumber(rules.buyInChips, 15000));
  const defaultRebuyChips = parseChipsNumber(rules.rebuyChips, baseBuyInChips);
  const defaultAddonChips = parseChipsNumber(rules.addonChips, 20000);

  if (regs.length === 0) {
    const buyInsCount = tournament.entries;
    const totalChipsInPlay = buyInsCount * baseBuyInChips;
    const eliminated = Math.min(Math.max(0, buyInsCount - 1), tournament.eliminatedCount ?? 0);
    const activePlayers = buyInsCount > 0 ? Math.max(1, buyInsCount - eliminated) : 0;
    const averageStack = activePlayers > 0 ? Math.round(totalChipsInPlay / activePlayers) : baseBuyInChips;

    return {
      registrations: regs,
      buyInsCount,
      rebuysCount: 0,
      addonsCount: 0,
      collectedTotal: tournament.buyIn * buyInsCount,
      totalChipsInPlay,
      activePlayers,
      averageStack,
    };
  }

  const buyInsCount = regs.filter(r => r.entryType === "Buy-in").length;
  const rebuysCount = regs.filter(r => r.entryType === "Rebuy").length;
  const addonsCount = regs.filter(r => r.entryType === "Add-on").length;
  const collectedTotal = regs.reduce((sum, r) => sum + r.value, 0);

  const totalChipsInPlay = regs.reduce((sum, r) => {
    const fallback =
      r.entryType === "Buy-in"
        ? baseBuyInChips
        : r.entryType === "Rebuy"
        ? defaultRebuyChips
        : defaultAddonChips;
    return sum + parseChipsNumber(r.chips, fallback);
  }, 0);

  const eliminated = Math.min(Math.max(0, buyInsCount - 1), tournament.eliminatedCount ?? 0);
  const activePlayers = buyInsCount > 0 ? Math.max(1, buyInsCount - eliminated) : 0;
  const averageStack = activePlayers > 0 ? Math.round(totalChipsInPlay / activePlayers) : baseBuyInChips;

  return {
    registrations: regs,
    buyInsCount,
    rebuysCount,
    addonsCount,
    collectedTotal,
    totalChipsInPlay,
    activePlayers,
    averageStack,
  };
}
