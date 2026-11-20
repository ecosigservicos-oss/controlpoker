import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Building2,
  Coins,
  CreditCard,
  Filter,
  Layers,
  Plus,
  QrCode,
  Receipt,
  Search,
  Sparkles,
  Trophy,
  Wallet,
  X,
} from "lucide-react";
import { useClub } from "@/context/ClubContext";

type MovementOrigin = "torneio" | "cash" | "manual";
type MovementKind = "entrada" | "saida";
type TableStatusFilter = "todas" | "abertas" | "fechadas";
type OriginFilter = "todos" | MovementOrigin;
type KindFilter = "todos" | MovementKind;
type ChartPeriod = "mensal" | "semanal" | "diario";

interface UnifiedMovement {
  id: string;
  dateIso: string;
  dateLabel: string;
  description: string;
  subDescription?: string;
  category: string;
  origin: MovementOrigin;
  kind: MovementKind;
  amount: number;
  paymentMethod: string;
  tableId: string;
  tableName: string;
  isTableOpen: boolean;
}

interface OpenTableOption {
  tableId: string;
  tableName: string;
  origin: "torneio" | "cash";
  isOpen: boolean;
  playersCount: number;
  totalEntradas: number;
  totalSaidas: number;
}

interface PaymentMethodSummary {
  method: string;
  entradas: number;
  saidas: number;
  saldo: number;
  count: number;
  percentage: number;
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function normalizePaymentMethod(raw: unknown, fallback = "Não informado"): string {
  const cleaned = String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!cleaned) return fallback;

  const lower = cleaned.toLowerCase();
  if (lower === "pix" || lower.startsWith("pix ")) return "PIX";
  if (lower.includes("pix") && lower.includes("caixa")) return "PIX / Caixa";
  if (lower === "dinheiro" || lower === "especie" || lower === "espécie" || lower === "cash") {
    return "Dinheiro";
  }
  if (lower.includes("crédito") || lower.includes("credito")) return "Cartão de Crédito";
  if (lower.includes("débito") || lower.includes("debito")) return "Cartão de Débito";
  if (lower === "cartao" || lower === "cartão") return "Cartão";
  if (lower.includes("ficha")) return "Fichas";
  if (lower.includes("saldo") || lower.includes("fiado") || lower.includes("conta")) {
    return "Saldo / Conta";
  }
  if (lower.includes("transf") || lower.includes("ted") || lower.includes("doc")) {
    return "Transferência";
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function getPaymentVisualStyle(method: string): {
  bg: string;
  border: string;
  badgeBg: string;
  color: string;
  kind: "pix" | "cash" | "card" | "chips" | "other";
} {
  const lower = method.toLowerCase();
  if (lower.includes("pix")) {
    return {
      bg: "#F0FDFA",
      border: "#99F6E4",
      badgeBg: "#CCFBF1",
      color: "#0D9488",
      kind: "pix",
    };
  }
  if (lower.includes("dinheiro")) {
    return {
      bg: "#F0FDF4",
      border: "#BBF7D0",
      badgeBg: "#DCFCE7",
      color: "#15803D",
      kind: "cash",
    };
  }
  if (lower.includes("cartão") || lower.includes("cartao")) {
    return {
      bg: "#EFF6FF",
      border: "#BFDBFE",
      badgeBg: "#DBEAFE",
      color: "#1D4ED8",
      kind: "card",
    };
  }
  if (lower.includes("ficha")) {
    return {
      bg: "#FFFBEB",
      border: "#FDE68A",
      badgeBg: "#FEF3C7",
      color: "#B45309",
      kind: "chips",
    };
  }
  return {
    bg: "#F8FAFC",
    border: "#CBD5E1",
    badgeBg: "#E2E8F0",
    color: "#334155",
    kind: "other",
  };
}

function formatDateTime(raw?: unknown): { iso: string; label: string } {
  if (typeof raw === "string" && raw.trim()) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return {
        iso: parsed.toISOString(),
        label: parsed.toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    }
    return { iso: new Date().toISOString(), label: raw };
  }
  if (typeof raw === "number" && raw > 0) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return {
        iso: parsed.toISOString(),
        label: parsed.toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    }
  }
  const now = new Date();
  return {
    iso: now.toISOString(),
    label: now.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
  };
}

function isStatusConsideredOpen(rawStatus: unknown): boolean {
  if (typeof rawStatus === "boolean") return rawStatus;
  const s = String(rawStatus ?? "").trim().toLowerCase();
  if (!s) return true;
  if (
    s.includes("fechad") ||
    s.includes("finaliz") ||
    s.includes("encerr") ||
    s.includes("closed") ||
    s.includes("finished") ||
    s.includes("cancel")
  ) {
    return false;
  }
  return true;
}

function toNumber(val: unknown, fallback = 0): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

export function FinanceiroView() {
  const club = useClub() as unknown as Record<string, unknown>;

  const [tableStatusFilter, setTableStatusFilter] = useState<TableStatusFilter>("todas");
  const [selectedOpenTableId, setSelectedOpenTableId] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<OriginFilter>("todos");
  const [kindFilter, setKindFilter] = useState<KindFilter>("todos");
  const [paymentFilter, setPaymentFilter] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("diario");

  const [modalOpen, setModalOpen] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("Operacional / Clube");
  const [newKind, setNewKind] = useState<MovementKind>("entrada");
  const [newAmount, setNewAmount] = useState("");
  const [newPayment, setNewPayment] = useState("PIX");
  const [localManualItems, setLocalManualItems] = useState<UnifiedMovement[]>([]);

  const { allMovements, tableOptions } = useMemo(() => {
    const movements: UnifiedMovement[] = [];
    const tablesMap = new Map<string, OpenTableOption>();

    const tournaments = Array.isArray(club.tournaments)
      ? (club.tournaments as Array<Record<string, unknown>>)
      : [];

    tournaments.forEach((t, tIdx) => {
      const tId = String(t.id ?? `torneio-${tIdx + 1}`);
      const tName = String(t.name ?? `Torneio ${tIdx + 1}`);
      const isOpen = isStatusConsideredOpen(t.status);
      const buyInPrice = toNumber(t.buyIn, 0);
      const rebuyPrice = toNumber(t.rebuy, buyInPrice);
      const addonPrice = toNumber(t.addon, buyInPrice);
      const dt = formatDateTime(t.date ?? t.createdAt);

      const regs = Array.isArray(t.registrations)
        ? (t.registrations as Array<Record<string, unknown>>)
        : [];

      let regEntriesCount = 0;
      let regRebuysCount = 0;
      let regAddonsCount = 0;

      regs.forEach((reg, rIdx) => {
        const entryType = String(reg.entryType ?? "Buy-in");
        const playerName = String(reg.playerName ?? "Jogador").trim() || "Jogador";
        const regDt = formatDateTime(reg.timestamp ?? reg.createdAt ?? t.date ?? t.createdAt);
        const rawPayment =
          reg.paymentMethod ?? reg.payment ?? reg.formaPagamento ?? reg.metodoPagamento;
        const payment = normalizePaymentMethod(rawPayment, "PIX / Caixa");

        let defaultVal = buyInPrice;
        if (entryType.toLowerCase().includes("rebuy")) {
          defaultVal = rebuyPrice;
          regRebuysCount += 1;
        } else if (entryType.toLowerCase().includes("add")) {
          defaultVal = addonPrice;
          regAddonsCount += 1;
        } else {
          regEntriesCount += 1;
        }

        const amount = toNumber(reg.amount ?? reg.value ?? reg.price, defaultVal);
        const isPayout =
          entryType.toLowerCase().includes("prem") ||
          entryType.toLowerCase().includes("saída") ||
          entryType.toLowerCase().includes("saida") ||
          entryType.toLowerCase().includes("payout");

        movements.push({
          id: `t-${tId}-reg-${String(reg.id ?? rIdx)}`,
          dateIso: regDt.iso,
          dateLabel: regDt.label,
          description: `${playerName} · ${entryType}`,
          subDescription: tName,
          category: `Torneio · ${entryType}`,
          origin: "torneio",
          kind: isPayout ? "saida" : "entrada",
          amount: Math.abs(amount),
          paymentMethod: payment,
          tableId: `torneio:${tId}`,
          tableName: tName,
          isTableOpen: isOpen,
        });
      });

      const totalEntries = toNumber(t.entries, regEntriesCount);
      const missingEntries = Math.max(0, totalEntries - regEntriesCount);
      for (let i = 0; i < missingEntries; i++) {
        movements.push({
          id: `t-${tId}-auto-buyin-${i + 1}`,
          dateIso: dt.iso,
          dateLabel: dt.label,
          description: `Inscrição #${regEntriesCount + i + 1} · Buy-in`,
          subDescription: tName,
          category: "Torneio · Buy-in",
          origin: "torneio",
          kind: "entrada",
          amount: buyInPrice,
          paymentMethod: "Caixa Torneio",
          tableId: `torneio:${tId}`,
          tableName: tName,
          isTableOpen: isOpen,
        });
      }

      const totalRebuys = toNumber(t.rebuys, regRebuysCount);
      const missingRebuys = Math.max(0, totalRebuys - regRebuysCount);
      for (let i = 0; i < missingRebuys; i++) {
        movements.push({
          id: `t-${tId}-auto-rebuy-${i + 1}`,
          dateIso: dt.iso,
          dateLabel: dt.label,
          description: `Rebuy #${regRebuysCount + i + 1}`,
          subDescription: tName,
          category: "Torneio · Rebuy",
          origin: "torneio",
          kind: "entrada",
          amount: rebuyPrice,
          paymentMethod: "Caixa Torneio",
          tableId: `torneio:${tId}`,
          tableName: tName,
          isTableOpen: isOpen,
        });
      }

      const totalAddons = toNumber(t.addons, regAddonsCount);
      const missingAddons = Math.max(0, totalAddons - regAddonsCount);
      for (let i = 0; i < missingAddons; i++) {
        movements.push({
          id: `t-${tId}-auto-addon-${i + 1}`,
          dateIso: dt.iso,
          dateLabel: dt.label,
          description: `Add-on #${regAddonsCount + i + 1}`,
          subDescription: tName,
          category: "Torneio · Add-on",
          origin: "torneio",
          kind: "entrada",
          amount: addonPrice,
          paymentMethod: "Caixa Torneio",
          tableId: `torneio:${tId}`,
          tableName: tName,
          isTableOpen: isOpen,
        });
      }

      const prizes = Array.isArray(t.payouts ?? t.prizes)
        ? ((t.payouts ?? t.prizes) as Array<Record<string, unknown>>)
        : [];
      prizes.forEach((pz, pIdx) => {
        const val = toNumber(pz.amount ?? pz.value ?? pz.prize, 0);
        if (val > 0) {
          movements.push({
            id: `t-${tId}-prize-${pIdx}`,
            dateIso: dt.iso,
            dateLabel: dt.label,
            description: `Premiação · ${String(pz.playerName ?? `${pIdx + 1}º Lugar`)}`,
            subDescription: tName,
            category: "Torneio · Premiação",
            origin: "torneio",
            kind: "saida",
            amount: val,
            paymentMethod: normalizePaymentMethod(
              pz.paymentMethod ?? pz.payment ?? pz.formaPagamento,
              "PIX / Caixa"
            ),
            tableId: `torneio:${tId}`,
            tableName: tName,
            isTableOpen: isOpen,
          });
        }
      });

      const tMovs = movements.filter(m => m.tableId === `torneio:${tId}`);
      tablesMap.set(`torneio:${tId}`, {
        tableId: `torneio:${tId}`,
        tableName: tName,
        origin: "torneio",
        isOpen,
        playersCount: Math.max(totalEntries, regs.length),
        totalEntradas: tMovs
          .filter(m => m.kind === "entrada")
          .reduce((acc, m) => acc + m.amount, 0),
        totalSaidas: tMovs
          .filter(m => m.kind === "saida")
          .reduce((acc, m) => acc + m.amount, 0),
      });
    });

    const rawCashTables =
      (Array.isArray(club.cashTables) && club.cashTables) ||
      (Array.isArray(club.cashGames) && club.cashGames) ||
      (Array.isArray(club.tables) && club.tables) ||
      [];

    (rawCashTables as Array<Record<string, unknown>>).forEach((tbl, idx) => {
      const cId = String(tbl.id ?? `cash-${idx + 1}`);
      const baseName = String(tbl.name ?? `Mesa Cash ${String(idx + 1).padStart(2, "0")}`);
      const stakes = String(tbl.stakes ?? tbl.blinds ?? tbl.gameType ?? "").trim();
      const tableName = stakes ? `${baseName} (${stakes})` : baseName;
      const isOpen = isStatusConsideredOpen(tbl.status ?? tbl.isOpen);
      const dt = formatDateTime(tbl.openedAt ?? tbl.createdAt ?? tbl.date);

      let addedDetailedCashMovs = 0;

      const tableMovs =
        (Array.isArray(tbl.transactions) && tbl.transactions) ||
        (Array.isArray(tbl.movements) && tbl.movements) ||
        (Array.isArray(tbl.history) && tbl.history) ||
        [];

      (tableMovs as Array<Record<string, unknown>>).forEach((mv, mIdx) => {
        const amt = toNumber(mv.amount ?? mv.value, 0);
        if (amt <= 0) return;
        addedDetailedCashMovs += 1;
        const rawType = String(mv.type ?? mv.kind ?? "buy-in").toLowerCase();
        const isOut =
          rawType.includes("out") ||
          rawType.includes("saíd") ||
          rawType.includes("said") ||
          rawType.includes("devol") ||
          rawType.includes("retir");
        const mvDt = formatDateTime(mv.timestamp ?? mv.createdAt ?? dt.iso);
        const player = String(mv.playerName ?? mv.player ?? "").trim();

        movements.push({
          id: `cash-${cId}-mv-${String(mv.id ?? mIdx)}`,
          dateIso: mvDt.iso,
          dateLabel: mvDt.label,
          description: player
            ? `${player} · ${isOut ? "Cash-out (Saída)" : "Buy-in Cash"}`
            : `${isOut ? "Cash-out" : "Buy-in"} · ${tableName}`,
          subDescription: tableName,
          category: isOut ? "Cash Game · Cash-out" : "Cash Game · Buy-in",
          origin: "cash",
          kind: isOut ? "saida" : "entrada",
          amount: amt,
          paymentMethod: normalizePaymentMethod(
            mv.paymentMethod ?? mv.payment ?? mv.formaPagamento,
            "Fichas"
          ),
          tableId: `cash:${cId}`,
          tableName,
          isTableOpen: isOpen,
        });
      });

      const seatsOrPlayers =
        (Array.isArray(tbl.players) && tbl.players) ||
        (Array.isArray(tbl.seats) && tbl.seats) ||
        (Array.isArray(tbl.sessions) && tbl.sessions) ||
        [];

      let activePlayersCount = 0;

      (seatsOrPlayers as Array<Record<string, unknown>>).forEach((seat, sIdx) => {
        const pName = String(seat.playerName ?? seat.name ?? "").trim();
        const buyInVal = toNumber(
          seat.totalBuyIn ?? seat.buyIn ?? seat.amount ?? seat.stack,
          0
        );
        const cashOutVal = toNumber(seat.cashOut ?? seat.returned ?? 0, 0);
        const seatPayment = normalizePaymentMethod(
          seat.paymentMethod ?? seat.payment ?? seat.formaPagamento,
          "Fichas"
        );

        if (pName || buyInVal > 0) {
          activePlayersCount += 1;
        }

        if (addedDetailedCashMovs === 0 && buyInVal > 0) {
          movements.push({
            id: `cash-${cId}-seat-in-${String(seat.id ?? sIdx)}`,
            dateIso: dt.iso,
            dateLabel: dt.label,
            description: `${pName || `Assento ${sIdx + 1}`} · Buy-in Cash`,
            subDescription: tableName,
            category: "Cash Game · Buy-in",
            origin: "cash",
            kind: "entrada",
            amount: buyInVal,
            paymentMethod: seatPayment,
            tableId: `cash:${cId}`,
            tableName,
            isTableOpen: isOpen,
          });
        }

        if (addedDetailedCashMovs === 0 && cashOutVal > 0) {
          movements.push({
            id: `cash-${cId}-seat-out-${String(seat.id ?? sIdx)}`,
            dateIso: dt.iso,
            dateLabel: dt.label,
            description: `${pName || `Assento ${sIdx + 1}`} · Cash-out`,
            subDescription: tableName,
            category: "Cash Game · Cash-out",
            origin: "cash",
            kind: "saida",
            amount: cashOutVal,
            paymentMethod: seatPayment,
            tableId: `cash:${cId}`,
            tableName,
            isTableOpen: isOpen,
          });
        }
      });

      const rakeVal = toNumber(tbl.rake ?? tbl.totalRake, 0);
      if (rakeVal > 0 && addedDetailedCashMovs === 0) {
        movements.push({
          id: `cash-${cId}-rake`,
          dateIso: dt.iso,
          dateLabel: dt.label,
          description: `Rake arrecadado · ${tableName}`,
          subDescription: tableName,
          category: "Cash Game · Rake",
          origin: "cash",
          kind: "entrada",
          amount: rakeVal,
          paymentMethod: "Fichas",
          tableId: `cash:${cId}`,
          tableName,
          isTableOpen: isOpen,
        });
      }

      if (
        addedDetailedCashMovs === 0 &&
        seatsOrPlayers.length === 0 &&
        toNumber(tbl.totalBuyIn, 0) > 0
      ) {
        movements.push({
          id: `cash-${cId}-total-in`,
          dateIso: dt.iso,
          dateLabel: dt.label,
          description: `Entradas consolidadas · ${tableName}`,
          subDescription: tableName,
          category: "Cash Game · Buy-in",
          origin: "cash",
          kind: "entrada",
          amount: toNumber(tbl.totalBuyIn, 0),
          paymentMethod: "Fichas",
          tableId: `cash:${cId}`,
          tableName,
          isTableOpen: isOpen,
        });
      }

      const cMovs = movements.filter(m => m.tableId === `cash:${cId}`);
      tablesMap.set(`cash:${cId}`, {
        tableId: `cash:${cId}`,
        tableName,
        origin: "cash",
        isOpen,
        playersCount: activePlayersCount,
        totalEntradas: cMovs
          .filter(m => m.kind === "entrada")
          .reduce((acc, m) => acc + m.amount, 0),
        totalSaidas: cMovs
          .filter(m => m.kind === "saida")
          .reduce((acc, m) => acc + m.amount, 0),
      });
    });

    const contextTransactions =
      (Array.isArray(club.transactions) && club.transactions) ||
      (Array.isArray(club.financialTransactions) && club.financialTransactions) ||
      [];

    (contextTransactions as Array<Record<string, unknown>>).forEach((tx, idx) => {
      const amt = toNumber(tx.amount ?? tx.value, 0);
      if (amt <= 0) return;
      const rawType = String(tx.type ?? tx.kind ?? "entrada").toLowerCase();
      const isOut =
        rawType.includes("saíd") ||
        rawType.includes("said") ||
        rawType.includes("desp") ||
        rawType.includes("expense") ||
        rawType.includes("out");
      const txDt = formatDateTime(tx.date ?? tx.createdAt);

      movements.push({
        id: `manual-${String(tx.id ?? idx)}`,
        dateIso: txDt.iso,
        dateLabel: txDt.label,
        description: String(tx.description ?? "Lançamento manual"),
        category: String(tx.category ?? "Lançamento Manual"),
        origin: "manual",
        kind: isOut ? "saida" : "entrada",
        amount: amt,
        paymentMethod: normalizePaymentMethod(
          tx.paymentMethod ?? tx.payment ?? tx.formaPagamento,
          "Dinheiro"
        ),
        tableId: "manual:geral",
        tableName: "Caixa Geral",
        isTableOpen: true,
      });
    });

    const combined = [...localManualItems, ...movements];

    return {
      allMovements: combined,
      tableOptions: Array.from(tablesMap.values()),
    };
  }, [club, localManualItems]);

  const openTablesList = useMemo(
    () => tableOptions.filter(t => t.isOpen),
    [tableOptions]
  );

  const baseScopedMovements = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return allMovements.filter(item => {
      if (tableStatusFilter === "abertas" && !item.isTableOpen) return false;
      if (tableStatusFilter === "fechadas" && item.isTableOpen) return false;

      if (selectedOpenTableId !== "all" && item.tableId !== selectedOpenTableId) {
        return false;
      }

      if (originFilter !== "todos" && item.origin !== originFilter) return false;
      if (kindFilter !== "todos" && item.kind !== kindFilter) return false;

      if (query) {
        const hay =
          `${item.description} ${item.subDescription ?? ""} ${item.category} ${item.tableName} ${item.paymentMethod}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }

      return true;
    });
  }, [
    allMovements,
    tableStatusFilter,
    selectedOpenTableId,
    originFilter,
    kindFilter,
    searchTerm,
  ]);

  const paymentSummaries = useMemo<PaymentMethodSummary[]>(() => {
    const map = new Map<
      string,
      { method: string; entradas: number; saidas: number; count: number }
    >();

    baseScopedMovements.forEach(item => {
      const methodKey = normalizePaymentMethod(item.paymentMethod, "Não informado");
      const current = map.get(methodKey) ?? {
        method: methodKey,
        entradas: 0,
        saidas: 0,
        count: 0,
      };

      if (item.kind === "entrada") {
        current.entradas += item.amount;
      } else {
        current.saidas += item.amount;
      }
      current.count += 1;
      map.set(methodKey, current);
    });

    const totalEntradasGeral = Array.from(map.values()).reduce(
      (acc, cur) => acc + cur.entradas,
      0
    );

    return Array.from(map.values())
      .map(entry => {
        const saldo = entry.entradas - entry.saidas;
        const baseShare =
          totalEntradasGeral > 0
            ? (entry.entradas / totalEntradasGeral) * 100
            : 0;
        return {
          method: entry.method,
          entradas: entry.entradas,
          saidas: entry.saidas,
          saldo,
          count: entry.count,
          percentage: Math.round(baseShare * 10) / 10,
        };
      })
      .sort((a, b) => b.entradas - a.entradas || b.count - a.count);
  }, [baseScopedMovements]);

  const filteredMovements = useMemo(() => {
    if (paymentFilter === "todos") return baseScopedMovements;
    return baseScopedMovements.filter(
      item => normalizePaymentMethod(item.paymentMethod) === paymentFilter
    );
  }, [baseScopedMovements, paymentFilter]);

  const totals = useMemo(() => {
    const entradas = filteredMovements
      .filter(m => m.kind === "entrada")
      .reduce((sum, m) => sum + m.amount, 0);

    const saidas = filteredMovements
      .filter(m => m.kind === "saida")
      .reduce((sum, m) => sum + m.amount, 0);

    const despesas = filteredMovements
      .filter(
        m =>
          m.kind === "saida" &&
          (m.origin === "manual" || m.category.toLowerCase().includes("desp"))
      )
      .reduce((sum, m) => sum + m.amount, 0);

    const lucro = entradas - saidas;
    const caixa = lucro;

    return { entradas, saidas, lucro, despesas, caixa };
  }, [filteredMovements]);

  const chartBars = useMemo(() => {
    const map = new Map<string, { label: string; entradas: number; saidas: number }>();

    filteredMovements.forEach(item => {
      const dt = new Date(item.dateIso);
      const valid = !Number.isNaN(dt.getTime()) ? dt : new Date();
      let key = "";
      let label = "";

      if (chartPeriod === "diario") {
        key = valid.toISOString().slice(0, 10);
        label = valid.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      } else if (chartPeriod === "semanal") {
        const day = valid.getDate();
        const weekNum = Math.ceil(day / 7);
        key = `${valid.getFullYear()}-${valid.getMonth() + 1}-W${weekNum}`;
        label = `Sem ${weekNum}/${String(valid.getMonth() + 1).padStart(2, "0")}`;
      } else {
        key = `${valid.getFullYear()}-${String(valid.getMonth() + 1).padStart(2, "0")}`;
        label = valid.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      }

      const prev = map.get(key) ?? { label, entradas: 0, saidas: 0 };
      if (item.kind === "entrada") prev.entradas += item.amount;
      else prev.saidas += item.amount;
      map.set(key, prev);
    });

    const list = Array.from(map.values()).slice(-7);
    if (list.length === 0) {
      return [{ label: "Hoje", entradas: 0, saidas: 0 }];
    }
    return list;
  }, [filteredMovements, chartPeriod]);

  const maxChartValue = Math.max(
    100,
    ...chartBars.flatMap(b => [b.entradas, b.saidas])
  );

  const handleSaveManualTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(newAmount.replace(",", "."));
    if (!newDesc.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return;
    }

    const now = formatDateTime(new Date().toISOString());
    const normalizedMethod = normalizePaymentMethod(newPayment, "PIX");
    const created: UnifiedMovement = {
      id: `manual-local-${Date.now()}`,
      dateIso: now.iso,
      dateLabel: now.label,
      description: newDesc.trim(),
      category: newCategory.trim() || "Lançamento Manual",
      origin: "manual",
      kind: newKind,
      amount: numericAmount,
      paymentMethod: normalizedMethod,
      tableId: "manual:geral",
      tableName: "Caixa Geral",
      isTableOpen: true,
    };

    if (typeof club.addTransaction === "function") {
      try {
        (club.addTransaction as (tx: Record<string, unknown>) => void)({
          description: created.description,
          category: created.category,
          type: created.kind,
          amount: created.amount,
          paymentMethod: created.paymentMethod,
          date: created.dateIso,
        });
      } catch {
        setLocalManualItems(prev => [created, ...prev]);
      }
    } else {
      setLocalManualItems(prev => [created, ...prev]);
    }

    setNewDesc("");
    setNewAmount("");
    setModalOpen(false);
  };

  const hasActiveFilter =
    tableStatusFilter !== "todas" ||
    selectedOpenTableId !== "all" ||
    originFilter !== "todos" ||
    kindFilter !== "todos" ||
    paymentFilter !== "todos" ||
    searchTerm.trim() !== "";

  const clearAllFilters = () => {
    setTableStatusFilter("todas");
    setSelectedOpenTableId("all");
    setOriginFilter("todos");
    setKindFilter("todos");
    setPaymentFilter("todos");
    setSearchTerm("");
  };

  const renderPaymentIcon = (kind: "pix" | "cash" | "card" | "chips" | "other", color: string) => {
    if (kind === "pix") return <QrCode size={16} color={color} />;
    if (kind === "cash") return <Banknote size={16} color={color} />;
    if (kind === "card") return <CreditCard size={16} color={color} />;
    if (kind === "chips") return <Coins size={16} color={color} />;
    return <Wallet size={16} color={color} />;
  };

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1440, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 22,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#00A8C6",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            CONTROLE DE CAIXA E PERFORMANCE
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "#0F172A",
              margin: "0 0 4px",
              letterSpacing: "-0.02em",
            }}
          >
            Gestão financeira
          </h1>
          <p style={{ fontSize: 13.5, color: "#64748B", margin: 0 }}>
            Entradas, saídas e lançamentos consolidados de Torneios, Cash Game e Caixa em tempo real.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              if (tableStatusFilter === "abertas") {
                setTableStatusFilter("todas");
                setSelectedOpenTableId("all");
              } else {
                setTableStatusFilter("abertas");
              }
            }}
            style={{
              height: 40,
              padding: "0 16px",
              borderRadius: 11,
              border:
                tableStatusFilter === "abertas"
                  ? "1.5px solid #00A8C6"
                  : "1px solid #CBD5E1",
              background:
                tableStatusFilter === "abertas" ? "#E0F7FA" : "#FFFFFF",
              color: tableStatusFilter === "abertas" ? "#0369A1" : "#0F172A",
              fontSize: 13,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#10B981",
              }}
            />
            Puxar Mesas Abertas ({openTablesList.length})
          </button>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{
              height: 40,
              padding: "0 18px",
              borderRadius: 11,
              border: "none",
              background: "#071E36",
              color: "#FFFFFF",
              fontSize: 13.5,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              boxShadow: "0 6px 16px rgba(7, 30, 54, 0.16)",
            }}
          >
            <Plus size={16} /> Nova transação
          </button>
        </div>
      </div>

      {/* Cards Principais (KPIs) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 16,
            padding: "18px 20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.06em" }}>
              ENTRADAS
            </span>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "#ECFDF5",
                color: "#10B981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowDownLeft size={15} />
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", margin: "10px 0 4px" }}>
            {formatBRL(totals.entradas)}
          </div>
          <div style={{ fontSize: 11.5, color: "#10B981", fontWeight: 600 }}>
            torneios + cash + lançamentos
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 16,
            padding: "18px 20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.06em" }}>
              SAÍDAS
            </span>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "#FEF2F2",
                color: "#EF4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowUpRight size={15} />
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", margin: "10px 0 4px" }}>
            {formatBRL(totals.saidas)}
          </div>
          <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600 }}>
            premiações + cash-outs + despesas
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 16,
            padding: "18px 20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.06em" }}>
              LUCRO
            </span>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "#ECFEFF",
                color: "#00A8C6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Wallet size={15} />
            </span>
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: totals.lucro >= 0 ? "#0F172A" : "#DC2626",
              margin: "10px 0 4px",
            }}
          >
            {formatBRL(totals.lucro)}
          </div>
          <div style={{ fontSize: 11.5, color: "#00A8C6", fontWeight: 600 }}>
            saldo consolidado
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 16,
            padding: "18px 20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.06em" }}>
              DESPESAS
            </span>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "#FFFBEB",
                color: "#D97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Receipt size={15} />
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", margin: "10px 0 4px" }}>
            {formatBRL(totals.despesas)}
          </div>
          <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600 }}>
            custos operacionais
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 16,
            padding: "18px 20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.06em" }}>
              CAIXA
            </span>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "#F5F3FF",
                color: "#7C3AED",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Building2 size={15} />
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", margin: "10px 0 4px" }}>
            {formatBRL(totals.caixa)}
          </div>
          <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600 }}>
            saldo disponível
          </div>
        </div>
      </div>

      {/* Somatória por Tipo de Pagamento */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 16,
          padding: "20px 22px",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", margin: "0 0 2px" }}>
              Totais por Tipo de Pagamento
            </h2>
            <p style={{ fontSize: 12.5, color: "#64748B", margin: 0 }}>
              Somatória consolidada por forma de pagamento (PIX, Dinheiro, Cartão, Fichas, etc.). Clique em um cartão para filtrar os lançamentos.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {paymentFilter !== "todos" && (
              <button
                type="button"
                onClick={() => setPaymentFilter("todos")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid #00A8C6",
                  background: "#ECFEFF",
                  color: "#0369A1",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  cursor: "pointer",
                }}
              >
                <X size={13} /> Mostrando: {paymentFilter} (ver todos)
              </button>
            )}

            <div
              style={{
                padding: "7px 14px",
                borderRadius: 10,
                background: "#071E36",
                color: "#FFFFFF",
                fontSize: 12.5,
                fontWeight: 700,
              }}
            >
              Somatória Total:{" "}
              <span style={{ color: "#38BDF8" }}>
                {formatBRL(
                  paymentSummaries.reduce((acc, item) => acc + item.saldo, 0)
                )}
              </span>
            </div>
          </div>
        </div>

        {paymentSummaries.length === 0 ? (
          <div
            style={{
              padding: "20px 14px",
              borderRadius: 12,
              background: "#F8FAFC",
              border: "1px dashed #CBD5E1",
              textAlign: "center",
              color: "#64748B",
              fontSize: 13,
            }}
          >
            Nenhum pagamento registrado para os filtros selecionados.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(225px, 1fr))",
              gap: 14,
            }}
          >
            {paymentSummaries.map(pm => {
              const style = getPaymentVisualStyle(pm.method);
              const isSelected = paymentFilter === pm.method;

              return (
                <button
                  key={pm.method}
                  type="button"
                  onClick={() =>
                    setPaymentFilter(prev => (prev === pm.method ? "todos" : pm.method))
                  }
                  style={{
                    textAlign: "left",
                    padding: "16px 18px",
                    borderRadius: 14,
                    border: isSelected
                      ? "2px solid #071E36"
                      : `1px solid ${style.border}`,
                    background: isSelected ? "#F0F9FF" : style.bg,
                    cursor: "pointer",
                    transition: "transform 0.12s ease, box-shadow 0.12s ease",
                    boxShadow: isSelected
                      ? "0 8px 20px rgba(7, 30, 54, 0.12)"
                      : "0 2px 6px rgba(15, 23, 42, 0.03)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          background: style.badgeBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {renderPaymentIcon(style.kind, style.color)}
                      </span>
                      <span
                        style={{
                          fontSize: 13.5,
                          fontWeight: 800,
                          color: "#0F172A",
                        }}
                      >
                        {pm.method}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "#FFFFFF",
                        color: style.color,
                        border: `1px solid ${style.border}`,
                      }}
                    >
                      {pm.percentage}%
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      color: pm.saldo >= 0 ? "#0F172A" : "#DC2626",
                      marginBottom: 6,
                    }}
                  >
                    {formatBRL(pm.saldo)}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 11.5,
                      color: "#475569",
                      fontWeight: 600,
                    }}
                  >
                    <span>
                      {pm.count} {pm.count === 1 ? "lançamento" : "lançamentos"}
                    </span>
                    {pm.saidas > 0 ? (
                      <span>
                        <strong style={{ color: "#059669" }}>+{formatBRL(pm.entradas)}</strong> /{" "}
                        <strong style={{ color: "#DC2626" }}>-{formatBRL(pm.saidas)}</strong>
                      </span>
                    ) : (
                      <span style={{ color: "#059669" }}>Entradas: {formatBRL(pm.entradas)}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Gráfico Evolução das entradas e saídas */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 16,
          padding: "20px 22px",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div>
            <h2 style={{ fontSize: 15.5, fontWeight: 700, color: "#0F172A", margin: "0 0 2px" }}>
              Evolução das entradas e saídas
            </h2>
            <p style={{ fontSize: 12.5, color: "#64748B", margin: 0 }}>
              Visão consolidada dos movimentos de Torneios, Cash Game e Caixa.
            </p>
          </div>

          <div
            style={{
              display: "inline-flex",
              background: "#F1F5F9",
              padding: 4,
              borderRadius: 10,
              gap: 4,
            }}
          >
            {(
              [
                { id: "mensal", label: "Mensal" },
                { id: "semanal", label: "Semanal" },
                { id: "diario", label: "Diário" },
              ] as const
            ).map(tab => {
              const active = chartPeriod === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setChartPeriod(tab.id)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 8,
                    border: "none",
                    background: active ? "#FFFFFF" : "transparent",
                    color: active ? "#0F172A" : "#64748B",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: active ? "0 1px 4px rgba(15, 23, 42, 0.08)" : "none",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            height: 170,
            display: "grid",
            gridTemplateColumns: `repeat(${chartBars.length}, minmax(64px, 1fr))`,
            alignItems: "end",
            gap: 14,
            padding: "12px 10px 4px",
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          {chartBars.map((bar, idx) => {
            const inHeight = Math.max(6, Math.round((bar.entradas / maxChartValue) * 125));
            const outHeight = Math.max(4, Math.round((bar.saidas / maxChartValue) * 125));
            return (
              <div
                key={`${bar.label}-${idx}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "#0F172A" }}>
                  {formatBRL(bar.entradas)}
                </div>
                <div style={{ display: "flex", alignItems: "end", gap: 6, height: 128 }}>
                  <div
                    title={`Entradas: ${formatBRL(bar.entradas)}`}
                    style={{
                      width: 22,
                      height: inHeight,
                      borderRadius: "6px 6px 2px 2px",
                      background: "linear-gradient(180deg, #00A8C6 0%, #0284C7 100%)",
                    }}
                  />
                  {bar.saidas > 0 && (
                    <div
                      title={`Saídas: ${formatBRL(bar.saidas)}`}
                      style={{
                        width: 22,
                        height: outHeight,
                        borderRadius: "6px 6px 2px 2px",
                        background: "linear-gradient(180deg, #F43F5E 0%, #E11D48 100%)",
                      }}
                    />
                  )}
                </div>
                <span style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600 }}>
                  {bar.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Painel de Movimentações Unificadas */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 16,
          padding: "20px 22px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", margin: "0 0 2px" }}>
              Movimentações de Torneios, Cash Game e Caixa
            </h2>
            <p style={{ fontSize: 12.5, color: "#64748B", margin: 0 }}>
              Exibindo <strong>{filteredMovements.length}</strong>{" "}
              {filteredMovements.length === 1 ? "lançamento" : "lançamentos"} puxados
              automaticamente das mesas e torneios.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{
              background: "transparent",
              border: "none",
              color: "#00A8C6",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + Nova transação manual
          </button>
        </div>

        <div
          style={{
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
            display: "grid",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "#475569",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  marginRight: 4,
                }}
              >
                <Filter size={13} color="#00A8C6" /> Mesas:
              </span>

              {(
                [
                  { id: "todas", label: `Todas (${tableOptions.length})` },
                  { id: "abertas", label: `Mesas Abertas (${openTablesList.length})` },
                  {
                    id: "fechadas",
                    label: `Fechadas (${Math.max(0, tableOptions.length - openTablesList.length)})`,
                  },
                ] as const
              ).map(opt => {
                const active = tableStatusFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setTableStatusFilter(opt.id);
                      if (opt.id !== "abertas") setSelectedOpenTableId("all");
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: active ? "1.5px solid #00A8C6" : "1px solid #CBD5E1",
                      background: active ? "#071E36" : "#FFFFFF",
                      color: active ? "#FFFFFF" : "#334155",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}

              {openTablesList.length > 0 && (
                <select
                  value={selectedOpenTableId}
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedOpenTableId(val);
                    if (val !== "all") setTableStatusFilter("abertas");
                  }}
                  aria-label="Selecionar mesa aberta específica"
                  style={{
                    height: 32,
                    padding: "0 10px",
                    borderRadius: 8,
                    border:
                      selectedOpenTableId !== "all"
                        ? "1.5px solid #00A8C6"
                        : "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    color: "#0F172A",
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  <option value="all">Puxar todas as mesas abertas</option>
                  {openTablesList.map(tbl => (
                    <option key={tbl.tableId} value={tbl.tableId}>
                      {tbl.origin === "cash" ? "♠ Cash:" : "🏆 Torneio:"} {tbl.tableName} (
                      {formatBRL(tbl.totalEntradas)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {(
                [
                  { id: "todos", label: "Todas origens" },
                  { id: "torneio", label: "Torneios" },
                  { id: "cash", label: "Cash Game" },
                  { id: "manual", label: "Caixa Manual" },
                ] as const
              ).map(orig => {
                const active = originFilter === orig.id;
                return (
                  <button
                    key={orig.id}
                    type="button"
                    onClick={() => setOriginFilter(orig.id)}
                    style={{
                      padding: "6px 11px",
                      borderRadius: 8,
                      border: active ? "1.5px solid #00A8C6" : "1px solid #CBD5E1",
                      background: active ? "#E0F7FA" : "#FFFFFF",
                      color: active ? "#0369A1" : "#475569",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {orig.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {(
                [
                  { id: "todos", label: "Entradas e Saídas" },
                  { id: "entrada", label: "Somente Entradas" },
                  { id: "saida", label: "Somente Saídas" },
                ] as const
              ).map(k => {
                const active = kindFilter === k.id;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKindFilter(k.id)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 8,
                      border: active ? "1px solid #0F172A" : "1px solid #E2E8F0",
                      background: active ? "#0F172A" : "#FFFFFF",
                      color: active ? "#FFFFFF" : "#64748B",
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {k.label}
                  </button>
                );
              })}

              {paymentSummaries.length > 0 && (
                <select
                  value={paymentFilter}
                  onChange={e => setPaymentFilter(e.target.value)}
                  aria-label="Filtrar por tipo de pagamento"
                  style={{
                    height: 30,
                    padding: "0 10px",
                    borderRadius: 8,
                    border:
                      paymentFilter !== "todos"
                        ? "1.5px solid #00A8C6"
                        : "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    color: "#0F172A",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <option value="todos">Pagamento: Todos ({paymentSummaries.length})</option>
                  {paymentSummaries.map(pm => (
                    <option key={pm.method} value={pm.method}>
                      {pm.method} — {formatBRL(pm.saldo)} ({pm.count})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ position: "relative" }}>
                <Search
                  size={14}
                  color="#94A3B8"
                  style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar jogador, mesa ou pagamento..."
                  style={{
                    height: 34,
                    width: 250,
                    padding: "0 10px 0 30px",
                    borderRadius: 8,
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    fontSize: 12.5,
                    color: "#0F172A",
                  }}
                />
              </div>

              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  style={{
                    height: 34,
                    padding: "0 10px",
                    borderRadius: 8,
                    border: "1px solid #FECACA",
                    background: "#FEF2F2",
                    color: "#DC2626",
                    fontSize: 12,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    cursor: "pointer",
                  }}
                >
                  <X size={13} /> Limpar filtros
                </button>
              )}
            </div>
          </div>

          {tableStatusFilter === "abertas" && openTablesList.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                gap: 10,
                paddingTop: 6,
                borderTop: "1px dashed #CBD5E1",
              }}
            >
              {openTablesList.map(tbl => {
                const isSelected = selectedOpenTableId === tbl.tableId;
                return (
                  <button
                    key={tbl.tableId}
                    type="button"
                    onClick={() =>
                      setSelectedOpenTableId(prev =>
                        prev === tbl.tableId ? "all" : tbl.tableId
                      )
                    }
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: isSelected
                        ? "1.5px solid #00A8C6"
                        : "1px solid #CBD5E1",
                      background: isSelected ? "#ECFEFF" : "#FFFFFF",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          color: tbl.origin === "cash" ? "#059669" : "#0284C7",
                          textTransform: "uppercase",
                        }}
                      >
                        {tbl.origin === "cash" ? "♠ Cash Aberto" : "🏆 Torneio Aberto"}
                      </span>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: "1px 7px",
                          borderRadius: 999,
                          background: "#DCFCE7",
                          color: "#15803D",
                        }}
                      >
                        Aberta
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                      {tbl.tableName}
                    </div>
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>
                      Entradas: <strong style={{ color: "#059669" }}>{formatBRL(tbl.totalEntradas)}</strong>
                      {tbl.totalSaidas > 0 && (
                        <>
                          {" "}
                          · Saídas: <strong style={{ color: "#DC2626" }}>{formatBRL(tbl.totalSaidas)}</strong>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Tabela de Lançamentos */}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid #E2E8F0",
                  color: "#64748B",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "10px 12px" }}>Data</th>
                <th style={{ padding: "10px 12px" }}>Descrição</th>
                <th style={{ padding: "10px 12px" }}>Mesa / Origem</th>
                <th style={{ padding: "10px 12px" }}>Categoria</th>
                <th style={{ padding: "10px 12px" }}>Tipo</th>
                <th style={{ padding: "10px 12px" }}>Valor</th>
                <th style={{ padding: "10px 12px" }}>Pagamento</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "28px 12px",
                      textAlign: "center",
                      color: "#64748B",
                      fontSize: 13.5,
                    }}
                  >
                    Nenhum lançamento encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredMovements.map(item => {
                  const pmStyle = getPaymentVisualStyle(item.paymentMethod);
                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid #F1F5F9",
                      }}
                    >
                      <td style={{ padding: "11px 12px", color: "#64748B", whiteSpace: "nowrap" }}>
                        {item.dateLabel}
                      </td>
                      <td style={{ padding: "11px 12px" }}>
                        <div style={{ fontWeight: 700, color: "#0F172A" }}>{item.description}</div>
                        {item.subDescription && (
                          <div style={{ fontSize: 11.5, color: "#64748B" }}>{item.subDescription}</div>
                        )}
                      </td>
                      <td style={{ padding: "11px 12px" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {item.origin === "torneio" && <Trophy size={13} color="#0284C7" />}
                          {item.origin === "cash" && <Coins size={13} color="#059669" />}
                          {item.origin === "manual" && <Layers size={13} color="#7C3AED" />}
                          <span style={{ fontWeight: 600, color: "#334155" }}>{item.tableName}</span>
                          {item.origin !== "manual" && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: 999,
                                background: item.isTableOpen ? "#DCFCE7" : "#F1F5F9",
                                color: item.isTableOpen ? "#15803D" : "#64748B",
                              }}
                            >
                              {item.isTableOpen ? "Aberta" : "Fechada"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "11px 12px", color: "#475569" }}>{item.category}</td>
                      <td style={{ padding: "11px 12px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 9px",
                            borderRadius: 999,
                            fontSize: 11.5,
                            fontWeight: 700,
                            background: item.kind === "entrada" ? "#ECFDF5" : "#FEF2F2",
                            color: item.kind === "entrada" ? "#059669" : "#DC2626",
                          }}
                        >
                          {item.kind === "entrada" ? "Entrada" : "Saída"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "11px 12px",
                          fontWeight: 800,
                          color: item.kind === "entrada" ? "#059669" : "#DC2626",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.kind === "entrada" ? "+" : "-"} {formatBRL(item.amount)}
                      </td>
                      <td style={{ padding: "11px 12px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "3px 9px",
                            borderRadius: 999,
                            fontSize: 11.5,
                            fontWeight: 700,
                            background: pmStyle.badgeBg,
                            color: pmStyle.color,
                          }}
                        >
                          {item.paymentMethod}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova Transação Manual */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 60,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              background: "#FFFFFF",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0F172A", margin: 0 }}>
                Nova transação financeira
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#64748B",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveManualTransaction} style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Tipo de movimentação
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setNewKind("entrada")}
                    style={{
                      height: 36,
                      borderRadius: 8,
                      border: newKind === "entrada" ? "1.5px solid #059669" : "1px solid #CBD5E1",
                      background: newKind === "entrada" ? "#ECFDF5" : "#FFFFFF",
                      color: newKind === "entrada" ? "#059669" : "#475569",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    + Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewKind("saida")}
                    style={{
                      height: 36,
                      borderRadius: 8,
                      border: newKind === "saida" ? "1.5px solid #DC2626" : "1px solid #CBD5E1",
                      background: newKind === "saida" ? "#FEF2F2" : "#FFFFFF",
                      color: newKind === "saida" ? "#DC2626" : "#475569",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    - Saída / Despesa
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Descrição
                </label>
                <input
                  type="text"
                  required
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Ex.: Pagamento Dealer, Rake extra, Compra Bar..."
                  style={{
                    width: "100%",
                    height: 38,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: "1px solid #CBD5E1",
                    fontSize: 13.5,
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    Valor (R$)
                  </label>
                  <input
                    type="text"
                    required
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    placeholder="150,00"
                    style={{
                      width: "100%",
                      height: 38,
                      padding: "0 12px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      fontSize: 13.5,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    Forma de pagamento
                  </label>
                  <select
                    value={newPayment}
                    onChange={e => setNewPayment(e.target.value)}
                    style={{
                      width: "100%",
                      height: 38,
                      padding: "0 10px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      fontSize: 13.5,
                    }}
                  >
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Fichas">Fichas</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Saldo / Conta">Saldo / Conta</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Categoria
                </label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  style={{
                    width: "100%",
                    height: 38,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: "1px solid #CBD5E1",
                    fontSize: 13.5,
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    height: 38,
                    padding: "0 14px",
                    borderRadius: 8,
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    height: 38,
                    padding: "0 16px",
                    borderRadius: 8,
                    border: "none",
                    background: "#071E36",
                    color: "#FFFFFF",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                  }}
                >
                  <Sparkles size={14} /> Salvar lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
