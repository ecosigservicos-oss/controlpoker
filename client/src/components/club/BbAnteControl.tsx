import { useMemo, useState } from "react";
import { Check, Coins, Settings2, X } from "lucide-react";
import { useClub } from "@/context/ClubContext";

interface LevelRow {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  durationMinutes?: number;
  isBreak?: boolean;
}

const FALLBACK_LEVELS: LevelRow[] = [
  { level: 1, smallBlind: 50, bigBlind: 100, ante: 0 },
  { level: 2, smallBlind: 100, bigBlind: 150, ante: 0 },
  { level: 3, smallBlind: 150, bigBlind: 200, ante: 0 },
  { level: 4, smallBlind: 200, bigBlind: 250, ante: 0 },
  { level: 5, smallBlind: 250, bigBlind: 300, ante: 0 },
  { level: 6, smallBlind: 300, bigBlind: 400, ante: 0 },
  { level: 7, smallBlind: 400, bigBlind: 500, ante: 0 },
  { level: 8, smallBlind: 500, bigBlind: 600, ante: 0 },
  { level: 9, smallBlind: 600, bigBlind: 700, ante: 0 },
  { level: 10, smallBlind: 700, bigBlind: 800, ante: 0 },
  { level: 11, smallBlind: 800, bigBlind: 900, ante: 0 },
  { level: 12, smallBlind: 900, bigBlind: 1000, ante: 0 },
  { level: 13, smallBlind: 1000, bigBlind: 1100, ante: 0 },
  { level: 14, smallBlind: 1100, bigBlind: 1200, ante: 0 },
    { level: 15, smallBlind: 1000, bigBlind: 2000, ante: 2000 },
  { level: 16, smallBlind: 1250, bigBlind: 2500, ante: 2500 },
  { level: 17, smallBlind: 1500, bigBlind: 3000, ante: 3000 },
  { level: 18, smallBlind: 1750, bigBlind: 3500, ante: 3500 },
  { level: 19, smallBlind: 2000, bigBlind: 4000, ante: 4000 },
  { level: 20, smallBlind: 2250, bigBlind: 4500, ante: 4500 },
  { level: 21, smallBlind: 2500, bigBlind: 5000, ante: 5000 },
  { level: 22, smallBlind: 2750, bigBlind: 5500, ante: 5500 },
  { level: 23, smallBlind: 3000, bigBlind: 6000, ante: 6000 },
  { level: 24, smallBlind: 3250, bigBlind: 6500, ante: 6500 },
  { level: 25, smallBlind: 3500, bigBlind: 7000, ante: 7000 },
  { level: 26, smallBlind: 3750, bigBlind: 7500, ante: 7500 },
  { level: 27, smallBlind: 4000, bigBlind: 8000, ante: 8000 },
  { level: 28, smallBlind: 4250, bigBlind: 8500, ante: 8500 },
  { level: 29, smallBlind: 4500, bigBlind: 9000, ante: 9000 },
  { level: 30, smallBlind: 4750, bigBlind: 9500, ante: 9500 },
];

export function BbAnteControl({ tournamentId }: { tournamentId?: string }) {
  const club = useClub() as unknown as Record<string, unknown>;
  const tournaments = (Array.isArray(club.tournaments) ? club.tournaments : []) as Array<
    Record<string, unknown>
  >;
  const blindStructures = (Array.isArray(club.blindStructures)
    ? club.blindStructures
    : []) as Array<Record<string, unknown>>;

  const setTournaments = club.setTournaments as
    | ((updater: (prev: Array<Record<string, unknown>>) => Array<Record<string, unknown>>) => void)
    | undefined;
  const setBlindStructures = club.setBlindStructures as
    | ((updater: (prev: Array<Record<string, unknown>>) => Array<Record<string, unknown>>) => void)
    | undefined;

  const targetId = tournamentId || String(club.selectedTournamentId ?? "");
  const activeTournament =
    tournaments.find(t => String(t.id) === targetId) ?? tournaments[0] ?? null;
  const activeStructure =
    blindStructures.find(
      s => String(s.id) === String(activeTournament?.blindStructureId ?? "")
    ) ??
    blindStructures[0] ??
    null;

  const currentLevels = useMemo<LevelRow[]>(() => {
    const raw =
      (Array.isArray(activeTournament?.blindLevels) && activeTournament.blindLevels.length > 0
        ? activeTournament.blindLevels
        : Array.isArray(activeTournament?.levels) && activeTournament.levels.length > 0
        ? activeTournament.levels
        : Array.isArray(activeStructure?.levels) && activeStructure.levels.length > 0
        ? activeStructure.levels
        : Array.isArray(activeStructure?.blindLevels) && activeStructure.levels.length > 0
        ? activeStructure.blindLevels
        : FALLBACK_LEVELS) as Array<Record<string, unknown>>;

    return raw.map((lvl, idx) => ({
      ...lvl,
      level: Number(lvl.level ?? idx + 1),
      smallBlind: Number(lvl.smallBlind ?? lvl.sb ?? lvl.small ?? 0),
      bigBlind: Number(lvl.bigBlind ?? lvl.bb ?? lvl.big ?? 0),
      ante: Number(lvl.ante ?? 0),
      ...(lvl.durationMinutes != null ? { durationMinutes: Number(lvl.durationMinutes) } : {}),
      ...(lvl.isBreak != null ? { isBreak: Boolean(lvl.isBreak) } : {}),
    }));
  }, [activeTournament, activeStructure]);

  const hasAnyAnte = currentLevels.some(l => l.ante > 0);
  const firstAnteLevel = currentLevels.find(l => l.ante > 0)?.level ?? 1;

  const [open, setOpen] = useState(false);
  const [startLevel, setStartLevel] = useState<number>(firstAnteLevel);
  const [draftAntes, setDraftAntes] = useState<Record<number, number>>({});
  const [savedNotice, setSavedNotice] = useState(false);

  const openPanel = () => {
    const map: Record<number, number> = {};
    for (const l of currentLevels) {
      map[l.level] = l.ante;
    }
    setDraftAntes(map);
    setStartLevel(firstAnteLevel);
    setOpen(true);
  };

  const applyBbAnteRule = (enabled: boolean, fromLvl: number) => {
    const map: Record<number, number> = {};
    for (const l of currentLevels) {
      if (!enabled || l.isBreak) {
        map[l.level] = 0;
      } else {
        map[l.level] = l.level >= fromLvl ? l.bigBlind : 0;
      }
    }
    setDraftAntes(map);
  };

  const handleSave = () => {
    const updatedLevels = currentLevels.map(l => ({
      ...l,
      ante: Math.max(0, Number(draftAntes[l.level] ?? l.ante ?? 0)),
    }));

    if (typeof setTournaments === "function") {
      setTournaments(prev =>
        prev.map(t => {
          if (activeTournament && String(t.id) !== String(activeTournament.id)) {
            return t;
          }
          return {
            ...t,
            blindLevels: updatedLevels,
            levels: updatedLevels,
            bbAnteEnabled: updatedLevels.some(l => l.ante > 0),
            bbAnteStartLevel: startLevel,
          };
        })
      );
    }

    if (typeof setBlindStructures === "function") {
      setBlindStructures(prev =>
        prev.map((s, idx) => {
          const isMatch = activeStructure
            ? String(s.id) === String(activeStructure.id)
            : idx === 0;
          if (!isMatch) return s;
          return {
            ...s,
            levels: updatedLevels,
            blindLevels: updatedLevels,
            bbAnteEnabled: updatedLevels.some(l => l.ante > 0),
            bbAnteStartLevel: startLevel,
          };
        })
      );
    }

    setSavedNotice(true);
    window.setTimeout(() => {
      setSavedNotice(false);
      setOpen(false);
    }, 900);
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "8px 14px",
          borderRadius: 10,
          border: hasAnyAnte
            ? "1px solid rgba(245, 158, 11, 0.6)"
            : "1px solid rgba(148, 163, 184, 0.35)",
          background: hasAnyAnte ? "rgba(245, 158, 11, 0.14)" : "#FFFFFF",
          color: hasAnyAnte ? "#B45309" : "#0F172A",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        <Coins size={15} />
        {hasAnyAnte ? `BB Ante Ativo (Nível ${firstAnteLevel}+)` : "Configurar BB Ante"}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(2, 8, 23, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              maxHeight: "88vh",
              overflowY: "auto",
              background: "#FFFFFF",
              color: "#0F172A",
              borderRadius: 16,
              border: "1px solid #E2E8F0",
              boxShadow: "0 24px 60px rgba(2, 8, 23, 0.3)",
              padding: 22,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Settings2 size={18} color="#D97706" />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>
                    Configurar Ante (BB Ante)
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>
                    Regra padrão TDA: o Big Blind paga o Ante igual a 1x o valor do Big Blind
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#64748B",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 10,
                padding: 12,
                borderRadius: 12,
                background: "#FFFBEB",
                border: "1px solid #FDE68A",
                marginBottom: 14,
              }}
            >
              <label style={{ fontSize: 12.5, fontWeight: 700, color: "#92400E" }}>
                Iniciar BB Ante no:
              </label>
              <select
                value={startLevel}
                onChange={e => {
                  const lvl = Number(e.target.value);
                  setStartLevel(lvl);
                  applyBbAnteRule(true, lvl);
                }}
                style={{
                  height: 34,
                  padding: "0 10px",
                  borderRadius: 8,
                  border: "1px solid #F59E0B",
                  background: "#FFFFFF",
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                {currentLevels.map(l => (
                  <option key={l.level} value={l.level}>
                    Nível {l.level} ({l.smallBlind}/{l.bigBlind})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => applyBbAnteRule(true, startLevel)}
                style={{
                  height: 34,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "none",
                  background: "#D97706",
                  color: "#FFFFFF",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Ativar BB Ante (1x BB)
              </button>

              <button
                type="button"
                onClick={() => applyBbAnteRule(false, startLevel)}
                style={{
                  height: 34,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  color: "#475569",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Zerar Ante
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 8,
                maxHeight: 280,
                overflowY: "auto",
                paddingRight: 4,
                marginBottom: 16,
              }}
            >
              {currentLevels.map(l => (
                <div
                  key={l.level}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #E2E8F0",
                    background: (draftAntes[l.level] ?? 0) > 0 ? "#FFFBEB" : "#F8FAFC",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>
                      Nível {l.level}: {l.smallBlind}/{l.bigBlind}
                    </div>
                    <div style={{ fontSize: 10.5, color: "#64748B" }}>
                      1x BB = {l.bigBlind}
                    </div>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={25}
                    value={draftAntes[l.level] ?? 0}
                    onChange={e =>
                      setDraftAntes(prev => ({
                        ...prev,
                        [l.level]: Math.max(0, Number(e.target.value)),
                      }))
                    }
                    style={{
                      width: 82,
                      height: 32,
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      padding: "0 8px",
                      fontSize: 12.5,
                      fontWeight: 700,
                      textAlign: "right",
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  height: 38,
                  padding: "0 14px",
                  borderRadius: 10,
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                style={{
                  height: 38,
                  padding: "0 18px",
                  borderRadius: 10,
                  border: "none",
                  background: savedNotice ? "#10B981" : "#0284C7",
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <Check size={15} />
                {savedNotice ? "BB Ante Salvo!" : "Salvar e Aplicar na TV"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}