import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useClub } from "@/context/ClubContext";

interface BlindLevelItem {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  durationMinutes: number;
  isBreak?: boolean;
}

const DEFAULT_BLIND_LEVELS: BlindLevelItem[] = [
  { level: 1, smallBlind: 50, bigBlind: 100, ante: 0, durationMinutes: 15 },
  { level: 2, smallBlind: 100, bigBlind: 150, ante: 0, durationMinutes: 15 },
  { level: 3, smallBlind: 150, bigBlind: 200, ante: 0, durationMinutes: 15 },
  { level: 4, smallBlind: 200, bigBlind: 250, ante: 0, durationMinutes: 15 },
  { level: 5, smallBlind: 250, bigBlind: 300, ante: 0, durationMinutes: 15 },
  { level: 6, smallBlind: 300, bigBlind: 400, ante: 0, durationMinutes: 15 },
  { level: 7, smallBlind: 400, bigBlind: 500, ante: 0, durationMinutes: 15 },
  { level: 8, smallBlind: 500, bigBlind: 600, ante: 0, durationMinutes: 15 },
  { level: 9, smallBlind: 600, bigBlind: 700, ante: 0, durationMinutes: 15 },
  { level: 10, smallBlind: 700, bigBlind: 800, ante: 0, durationMinutes: 15 },
  { level: 11, smallBlind: 800, bigBlind: 900, ante: 0, durationMinutes: 15 },
  { level: 12, smallBlind: 900, bigBlind: 1000, ante: 0, durationMinutes: 15 },
  { level: 13, smallBlind: 1000, bigBlind: 1100, ante: 0, durationMinutes: 15 },
  { level: 14, smallBlind: 1100, bigBlind: 1200, ante: 0, durationMinutes: 15 },
  { level: 15, smallBlind: 1200, bigBlind: 1300, ante: 0, durationMinutes: 15 },
  { level: 16, smallBlind: 1300, bigBlind: 1400, ante: 0, durationMinutes: 15 },
  { level: 17, smallBlind: 1400, bigBlind: 1500, ante: 0, durationMinutes: 15 },
  { level: 18, smallBlind: 1500, bigBlind: 1600, ante: 0, durationMinutes: 15 },
  { level: 19, smallBlind: 1600, bigBlind: 1700, ante: 0, durationMinutes: 15 },
  { level: 20, smallBlind: 1700, bigBlind: 1800, ante: 0, durationMinutes: 15 },
];

function formatNumber(n: number): string {
  return n.toLocaleString("pt-BR");
}

function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function playBeep(freq = 880, durationMs = 220) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0.14;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    window.setTimeout(() => {
      osc.stop();
      void ctx.close();
    }, durationMs);
  } catch {
    // Ignore audio restrictions
  }
}

export function TvClockView() {
  const club = useClub() as unknown as Record<string, unknown>;
  const setView = club.setView as (view: string) => void;
  const tournaments = (Array.isArray(club.tournaments) ? club.tournaments : []) as Array<
    Record<string, unknown>
  >;
  const selectedTournamentId = String(club.selectedTournamentId ?? "");
  const setSelectedTournamentId = club.setSelectedTournamentId as
    | ((id: string) => void)
    | undefined;

  const selectedTournament =
    tournaments.find(t => String(t.id) === selectedTournamentId) ?? tournaments[0] ?? null;

  const { blindLevels, matchedStructure } = useMemo(() => {
    const structures = (Array.isArray(club.blindStructures) ? club.blindStructures : []) as Array<
      Record<string, unknown>
    >;
    const structureId = String(selectedTournament?.blindStructureId ?? "");
    const matched =
      structures.find(s => String(s.id) === structureId) ?? structures[0] ?? null;

    const tournamentLevels = Array.isArray(selectedTournament?.blindLevels)
      ? (selectedTournament.blindLevels as Array<Record<string, unknown>>)
      : Array.isArray(selectedTournament?.levels)
      ? (selectedTournament.levels as Array<Record<string, unknown>>)
      : Array.isArray(selectedTournament?.blinds)
      ? (selectedTournament.blinds as Array<Record<string, unknown>>)
      : [];

    const clubDirectLevels = Array.isArray(club.blindLevels)
      ? (club.blindLevels as Array<Record<string, unknown>>)
      : Array.isArray(club.defaultBlindLevels)
      ? (club.defaultBlindLevels as Array<Record<string, unknown>>)
      : Array.isArray(club.blinds)
      ? (club.blinds as Array<Record<string, unknown>>)
      : [];

    const structureLevels = Array.isArray(matched?.levels)
      ? (matched.levels as Array<Record<string, unknown>>)
      : Array.isArray(matched?.blindLevels)
      ? (matched.blindLevels as Array<Record<string, unknown>>)
      : [];

    const rawLevels =
      tournamentLevels.length > 0
        ? tournamentLevels
        : clubDirectLevels.length > 0
        ? clubDirectLevels
        : structureLevels;

    const globalDuration = Number(
      selectedTournament?.levelDuration ??
        selectedTournament?.blindDuration ??
        selectedTournament?.durationMinutes ??
        selectedTournament?.timePerLevel ??
        matched?.levelDuration ??
        matched?.duration ??
        matched?.durationMinutes ??
        club.levelDuration ??
        club.blindDuration ??
        0
    );

    if (rawLevels.length === 0) {
      return {
        matchedStructure: matched,
        blindLevels: DEFAULT_BLIND_LEVELS.map(item => ({
          ...item,
          durationMinutes: globalDuration > 0 ? globalDuration : item.durationMinutes,
        })),
      };
    }

    const mapped = rawLevels.map((lvl, idx) => {
      const lvlDur = Number(
        lvl.durationMinutes ?? lvl.duration ?? lvl.minutes ?? lvl.time ?? 0
      );
      const resolvedDuration =
        lvlDur > 0 ? lvlDur : globalDuration > 0 ? globalDuration : 15;

      return {
        level: Number(lvl.level ?? idx + 1),
        smallBlind: Number(lvl.smallBlind ?? lvl.sb ?? lvl.small ?? 0),
        bigBlind: Number(lvl.bigBlind ?? lvl.bb ?? lvl.big ?? 0),
        ante: Number(lvl.ante ?? 0),
        durationMinutes: Math.max(1, resolvedDuration),
        isBreak: Boolean(lvl.isBreak),
      };
    });

    return { matchedStructure: matched, blindLevels: mapped };
  }, [club, selectedTournament]);

  const [levelIndex, setLevelIndex] = useState(0);
  const currentLevel = blindLevels[levelIndex] ?? blindLevels[0];
  const nextLevel = blindLevels[levelIndex + 1] ?? null;

  const [secondsLeft, setSecondsLeft] = useState(() => (currentLevel?.durationMinutes ?? 15) * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [nowClock, setNowClock] = useState(() =>
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );

  const levelIndexRef = useRef(levelIndex);
  levelIndexRef.current = levelIndex;

  useEffect(() => {
    if (!isRunning) {
      setSecondsLeft((currentLevel?.durationMinutes ?? 15) * 60);
    }
  }, [currentLevel?.durationMinutes, selectedTournament?.id, isRunning]);

  useEffect(() => {
    const clockInterval = window.setInterval(() => {
      setNowClock(
        new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      );
    }, 5000);
    return () => window.clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          const nextIdx = levelIndexRef.current + 1;
          if (nextIdx < blindLevels.length) {
            if (soundEnabled) playBeep(980, 420);
            setLevelIndex(nextIdx);
            return blindLevels[nextIdx].durationMinutes * 60;
          }
          setIsRunning(false);
          return 0;
        }
        if (prev <= 4 && soundEnabled) {
          playBeep(660, 120);
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning, blindLevels, soundEnabled]);

  const goToLevel = (targetIdx: number) => {
    const clamped = Math.max(0, Math.min(blindLevels.length - 1, targetIdx));
    setLevelIndex(clamped);
    setSecondsLeft(blindLevels[clamped].durationMinutes * 60);
  };

  const resetCurrentLevel = () => {
    setIsRunning(false);
    setSecondsLeft((currentLevel?.durationMinutes ?? 15) * 60);
  };

  const minutesStr = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secondsStr = String(secondsLeft % 60).padStart(2, "0");

  const stats = useMemo(() => {
    const regs = Array.isArray(selectedTournament?.registrations)
      ? (selectedTournament.registrations as Array<Record<string, unknown>>)
      : [];

    const regEntries = regs.filter(r => {
      const t = String(r.entryType ?? "Buy-in").toLowerCase();
      return !t.includes("rebuy") && !t.includes("add");
    }).length;
    const regRebuys = regs.filter(r =>
      String(r.entryType ?? "").toLowerCase().includes("rebuy")
    ).length;
    const regAddons = regs.filter(r =>
      String(r.entryType ?? "").toLowerCase().includes("add")
    ).length;

    const entries = Math.max(Number(selectedTournament?.entries ?? 0), regEntries);
    const rebuys = Math.max(Number(selectedTournament?.rebuys ?? 0), regRebuys);
    const addons = Math.max(Number(selectedTournament?.addons ?? 0), regAddons);

    const buyIn = Number(
      selectedTournament?.buyIn ?? matchedStructure?.buyIn ?? club.defaultBuyIn ?? 30
    );
    const rebuyVal = Number(
      selectedTournament?.rebuy ?? matchedStructure?.rebuy ?? club.defaultRebuy ?? buyIn
    );
    const addonVal = Number(
      selectedTournament?.addon ?? matchedStructure?.addon ?? club.defaultAddon ?? buyIn
    );

    const rawStartStack = Number(
      selectedTournament?.startingStack ??
        selectedTournament?.startingChips ??
        selectedTournament?.buyInChips ??
        selectedTournament?.stack ??
        matchedStructure?.startingStack ??
        matchedStructure?.buyInChips ??
        club.buyInChips ??
        15000
    );
    const startingStack =
      rawStartStack > 0 && rawStartStack < 100 ? rawStartStack * 1000 : rawStartStack;

    const rawRebuyChips = Number(
      selectedTournament?.rebuyChips ??
        selectedTournament?.rebuyStack ??
        matchedStructure?.rebuyChips ??
        club.rebuyChips ??
        startingStack
    );
    const rebuyChips =
      rawRebuyChips > 0 && rawRebuyChips < 100 ? rawRebuyChips * 1000 : rawRebuyChips;

    const rawAddonChips = Number(
      selectedTournament?.addonChips ??
        selectedTournament?.addonStack ??
        matchedStructure?.addonChips ??
        club.addonChips ??
        20000
    );
    const addonChips =
      rawAddonChips > 0 && rawAddonChips < 100 ? rawAddonChips * 1000 : rawAddonChips;

    const computedPrize = entries * buyIn + rebuys * rebuyVal + addons * addonVal;
    const totalPrize =
      computedPrize > 0 ? computedPrize : Number(selectedTournament?.prizePool ?? 0);

    const totalChips =
      entries * startingStack + rebuys * rebuyChips + addons * addonChips;
    const activePlayers = Math.max(1, entries);
    const avgStack = entries > 0 ? Math.round(totalChips / activePlayers) : startingStack;

    return {
      entries,
      rebuys,
      addons,
      totalPrize,
      avgStack,
    };
  }, [selectedTournament, matchedStructure, club]);

  const totalDurationSec = Math.max(1, (currentLevel?.durationMinutes ?? 15) * 60);
  const progressPct = Math.max(0, Math.min(100, (secondsLeft / totalDurationSec) * 100));
  const isDangerTime = secondsLeft <= 30 && !currentLevel?.isBreak;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background:
          "radial-gradient(circle at 50% 35%, #0B2542 0%, #061424 55%, #020812 100%)",
        color: "#F8FAFC",
        padding: "20px 28px",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "rgba(0, 168, 198, 0.16)",
                border: "1px solid rgba(56, 189, 248, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#38BDF8",
                fontWeight: 800,
              }}
            >
              ♠
            </div>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  color: "#FFFFFF",
                }}
              >
                POKER GESTOR
              </div>
              <div
                style={{
                  fontSize: 9.5,
                  letterSpacing: "0.14em",
                  color: "#64748B",
                  textTransform: "uppercase",
                }}
              >
                Gestão de Clubes
              </div>
            </div>
          </div>

          <div
            style={{
              height: 26,
              width: 1,
              background: "rgba(148, 163, 184, 0.2)",
            }}
          />

          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: "#38BDF8",
                textTransform: "uppercase",
              }}
            >
              CLOCKER · MODO TV
            </div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.1em",
                color: "#94A3B8",
                textTransform: "uppercase",
              }}
            >
              {selectedTournament ? String(selectedTournament.name) : "TORNEIO EM ANDAMENTO"}
            </div>
          </div>

          {tournaments.length > 1 && setSelectedTournamentId && (
            <select
              value={String(selectedTournament?.id ?? "")}
              onChange={e => setSelectedTournamentId(e.target.value)}
              style={{
                height: 34,
                padding: "0 10px",
                borderRadius: 8,
                border: "1px solid rgba(56, 189, 248, 0.3)",
                background: "#081A2E",
                color: "#E2E8F0",
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              {tournaments.map(t => (
                <option key={String(t.id)} value={String(t.id)}>
                  {String(t.name)}
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              fontSize: 13,
              fontWeight: 700,
              color: "#94A3B8",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {nowClock}
          </span>

          <button
            type="button"
            onClick={() => setView("tv-draw")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid rgba(245, 158, 11, 0.45)",
              background: "rgba(245, 158, 11, 0.14)",
              color: "#FCD34D",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Shuffle size={14} /> Ir para Sorteio de Mesas
          </button>

          <button
            type="button"
            onClick={() => setView("tournaments")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid rgba(148, 163, 184, 0.22)",
              background: "rgba(15, 23, 42, 0.6)",
              color: "#CBD5E1",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <X size={15} /> Voltar ao torneio
          </button>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: "16px 0",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 18px",
            borderRadius: 999,
            background: currentLevel?.isBreak
              ? "rgba(245, 158, 11, 0.2)"
              : "rgba(0, 168, 198, 0.18)",
            border: currentLevel?.isBreak
              ? "1px solid rgba(245, 158, 11, 0.5)"
              : "1px solid rgba(56, 189, 248, 0.45)",
            color: currentLevel?.isBreak ? "#FCD34D" : "#7DD3FC",
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {currentLevel?.isBreak
            ? "INTERVALO · BREAK"
            : `NÍVEL ${String(currentLevel?.level ?? 1).padStart(2, "0")}`}
        </div>

        <div
          style={{
            fontSize: "clamp(84px, 15vw, 176px)",
            fontWeight: 900,
            lineHeight: 0.95,
            letterSpacing: "-0.03em",
            fontVariantNumeric: "tabular-nums",
            color: isDangerTime ? "#F87171" : "#FFFFFF",
            textShadow: isDangerTime
              ? "0 0 40px rgba(248, 113, 113, 0.45)"
              : "0 0 42px rgba(0, 168, 198, 0.25)",
          }}
        >
          {minutesStr}:{secondsStr}
        </div>

        <div
          style={{
            width: "100%",
            maxWidth: 680,
            height: 8,
            borderRadius: 999,
            background: "rgba(148, 163, 184, 0.18)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressPct}%`,
              height: "100%",
              background: isDangerTime
                ? "linear-gradient(90deg, #EF4444, #F87171)"
                : "linear-gradient(90deg, #00A8C6, #38BDF8)",
              transition: "width 0.4s linear",
            }}
          />
        </div>

        <div
          style={{
            width: "100%",
            maxWidth: 960,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginTop: 4,
          }}
        >
          <div
            style={{
              background: "rgba(7, 25, 45, 0.85)",
              border: "1px solid rgba(56, 189, 248, 0.28)",
              borderRadius: 18,
              padding: "18px 22px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: "#94A3B8",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              BLINDS ATUAIS
            </div>
            <div
              style={{
                fontSize: "clamp(28px, 3.5vw, 42px)",
                fontWeight: 900,
                color: "#38BDF8",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {currentLevel?.isBreak
                ? "INTERVALO"
                : `${formatNumber(currentLevel?.smallBlind ?? 0)} / ${formatNumber(
                    currentLevel?.bigBlind ?? 0
                  )}`}
            </div>
          </div>

          <div
            style={{
              background: "rgba(7, 25, 45, 0.85)",
              border: "1px solid rgba(245, 158, 11, 0.28)",
              borderRadius: 18,
              padding: "18px 22px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: "#94A3B8",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              ANTE (BB ANTE)
            </div>
            <div
              style={{
                fontSize: "clamp(28px, 3.5vw, 42px)",
                fontWeight: 900,
                color: "#F59E0B",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {currentLevel?.isBreak ? "-" : formatNumber(currentLevel?.ante ?? 0)}
            </div>
          </div>

          <div
            style={{
              background: "rgba(7, 25, 45, 0.65)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              borderRadius: 18,
              padding: "18px 22px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: "#94A3B8",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              PRÓXIMO NÍVEL
            </div>
            <div
              style={{
                fontSize: "clamp(22px, 2.8vw, 32px)",
                fontWeight: 800,
                color: "#CBD5E1",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {!nextLevel
                ? "NÍVEL FINAL"
                : nextLevel.isBreak
                ? "INTERVALO"
                : `${formatNumber(nextLevel.smallBlind)} / ${formatNumber(nextLevel.bigBlind)}${
                    nextLevel.ante > 0 ? ` (${formatNumber(nextLevel.ante)})` : ""
                  }`}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => goToLevel(levelIndex - 1)}
            disabled={levelIndex === 0}
            style={{
              height: 44,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid rgba(148, 163, 184, 0.28)",
              background: "rgba(15, 23, 42, 0.7)",
              color: "#E2E8F0",
              fontSize: 13,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: levelIndex === 0 ? "not-allowed" : "pointer",
              opacity: levelIndex === 0 ? 0.45 : 1,
            }}
          >
            <ChevronLeft size={16} /> Nível anterior
          </button>

          <button
            type="button"
            onClick={() => setIsRunning(prev => !prev)}
            style={{
              height: 48,
              padding: "0 26px",
              borderRadius: 12,
              border: "none",
              background: isRunning ? "#F59E0B" : "#00C8E8",
              color: "#041627",
              fontSize: 15,
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0, 200, 232, 0.3)",
            }}
          >
            {isRunning ? <Pause size={18} /> : <Play size={18} />}
            {isRunning ? "Pausar relógio" : "Iniciar relógio"}
          </button>

          <button
            type="button"
            onClick={resetCurrentLevel}
            style={{
              height: 44,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid rgba(148, 163, 184, 0.28)",
              background: "rgba(15, 23, 42, 0.7)",
              color: "#E2E8F0",
              fontSize: 13,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            <RotateCcw size={15} /> Reiniciar nível
          </button>

          <button
            type="button"
            onClick={() => goToLevel(levelIndex + 1)}
            disabled={levelIndex >= blindLevels.length - 1}
            style={{
              height: 44,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid rgba(148, 163, 184, 0.28)",
              background: "rgba(15, 23, 42, 0.7)",
              color: "#E2E8F0",
              fontSize: 13,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: levelIndex >= blindLevels.length - 1 ? "not-allowed" : "pointer",
              opacity: levelIndex >= blindLevels.length - 1 ? 0.45 : 1,
            }}
          >
            Próximo nível <ChevronRight size={16} />
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled(prev => !prev)}
            title={soundEnabled ? "Desativar alerta sonoro" : "Ativar alerta sonoro"}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              border: "1px solid rgba(148, 163, 184, 0.28)",
              background: "rgba(15, 23, 42, 0.7)",
              color: soundEnabled ? "#38BDF8" : "#64748B",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
        </div>

        <div
          style={{
            width: "100%",
            maxWidth: 960,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 12,
          }}
        >
          <div
            style={{
              background: "rgba(8, 25, 44, 0.75)",
              border: "1px solid rgba(148, 163, 184, 0.16)",
              borderRadius: 12,
              padding: "12px 16px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 10.5, color: "#94A3B8", fontWeight: 700 }}>INSCRITOS</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#FFFFFF", marginTop: 2 }}>
              {stats.entries}
            </div>
          </div>

          <div
            style={{
              background: "rgba(8, 25, 44, 0.75)",
              border: "1px solid rgba(148, 163, 184, 0.16)",
              borderRadius: 12,
              padding: "12px 16px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 10.5, color: "#94A3B8", fontWeight: 700 }}>
              REBUYS / ADD-ONS
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#FFFFFF", marginTop: 2 }}>
              {stats.rebuys} / {stats.addons}
            </div>
          </div>

          <div
            style={{
              background: "rgba(8, 25, 44, 0.75)",
              border: "1px solid rgba(148, 163, 184, 0.16)",
              borderRadius: 12,
              padding: "12px 16px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 10.5, color: "#94A3B8", fontWeight: 700 }}>STACK MÉDIO</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#38BDF8", marginTop: 2 }}>
              {formatNumber(stats.avgStack)}
            </div>
          </div>

          <div
            style={{
              background: "rgba(8, 25, 44, 0.75)",
              border: "1px solid rgba(148, 163, 184, 0.16)",
              borderRadius: 12,
              padding: "12px 16px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 10.5, color: "#94A3B8", fontWeight: 700 }}>
              PREMIAÇÃO TOTAL
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#10B981", marginTop: 2 }}>
              {formatBRL(stats.totalPrize)}
            </div>
          </div>
        </div>
      </main>

      <footer
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 10.5,
          letterSpacing: "0.08em",
          color: "#475569",
          textTransform: "uppercase",
        }}
      >
        <span>POKER GESTOR · CLOCKER TV</span>
        <span>
          NÍVEL {levelIndex + 1} DE {blindLevels.length}
        </span>
      </footer>
    </div>
  );
}