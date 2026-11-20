import { useEffect, useMemo, useState } from "react";
import {
  LayoutGrid,
  Minus,
  Plus,
  Shuffle,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useClub } from "@/context/ClubContext";

type SeatAssignment = {
  seatNumber: number;
  playerName: string | null;
};

type TableDraw = {
  tableNumber: number;
  seats: SeatAssignment[];
};

const SEATS_PER_TABLE_PRESETS = [6, 8, 9, 10];

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildBalancedTableDraw(
  players: string[],
  tableCount: number,
  seatsPerTable: number
): TableDraw[] {
  const safeSeats = Math.max(2, Math.min(12, seatsPerTable));
  const minTablesNeeded = Math.max(1, Math.ceil(players.length / safeSeats));
  const safeTables = Math.max(minTablesNeeded, Math.min(30, tableCount));

  const shuffledPlayers = shuffleArray(players);
  const buckets: string[][] = Array.from({ length: safeTables }, () => []);

  shuffledPlayers.forEach((player, idx) => {
    const targetTable = idx % safeTables;
    if (buckets[targetTable].length < safeSeats) {
      buckets[targetTable].push(player);
    } else {
      const fallback = buckets.find(b => b.length < safeSeats);
      if (fallback) fallback.push(player);
    }
  });

  return buckets.map((tablePlayers, idx) => {
    const seatIndices = shuffleArray(
      Array.from({ length: safeSeats }, (_, sIdx) => sIdx)
    );
    const seats: SeatAssignment[] = Array.from({ length: safeSeats }, (_, sIdx) => ({
      seatNumber: sIdx + 1,
      playerName: null,
    }));

    tablePlayers.forEach((pName, pIdx) => {
      const assignedSeatIndex = seatIndices[pIdx];
      if (assignedSeatIndex !== undefined) {
        seats[assignedSeatIndex].playerName = pName;
      }
    });

    return {
      tableNumber: idx + 1,
      seats,
    };
  });
}

function getSeatPosition(seatIndex: number, totalSeats: number) {
  const angle = -Math.PI / 2 + (2 * Math.PI * seatIndex) / totalSeats;
  const rx = totalSeats >= 9 ? 43 : 41;
  const ry = totalSeats >= 9 ? 39 : 37;
  const left = 50 + rx * Math.cos(angle);
  const top = 50 + ry * Math.sin(angle);
  return { left: `${left.toFixed(2)}%`, top: `${top.toFixed(2)}%` };
}

export function TvDrawView() {
  const {
    setView,
    tournaments,
    selectedTournamentId,
    setSelectedTournamentId,
  } = useClub();

  const selectedTournament =
    tournaments.find(t => t.id === selectedTournamentId) ?? tournaments[0] ?? null;

  const confirmedPlayers = useMemo(() => {
    if (!selectedTournament) return [];
    const seen = new Set<string>();
    const list: string[] = [];
    const chronological = [...(selectedTournament.registrations ?? [])].reverse();

    for (const reg of chronological) {
      if (reg.entryType === "Buy-in") {
        const clean = reg.playerName.trim();
        const key = clean.toLowerCase();
        if (clean && !seen.has(key)) {
          seen.add(key);
          list.push(clean);
        }
      }
    }

    const totalExpected = Math.max(list.length, selectedTournament.entries || 0);
    for (let i = list.length + 1; i <= totalExpected; i++) {
      list.push(`Jogador ${String(i).padStart(2, "0")}`);
    }

    return list;
  }, [selectedTournament]);

  const [seatsPerTable, setSeatsPerTable] = useState<number>(8);
  const [tableCount, setTableCount] = useState<number>(2);
  const [focusedTable, setFocusedTable] = useState<number | "all">("all");
  const [drawSeed, setDrawSeed] = useState<number>(0);

  const minTablesRequired = Math.max(
    1,
    Math.ceil(confirmedPlayers.length / Math.max(2, seatsPerTable))
  );

  useEffect(() => {
    setTableCount(prev => Math.max(minTablesRequired, prev));
  }, [minTablesRequired]);

  useEffect(() => {
    if (focusedTable !== "all" && focusedTable > Math.max(minTablesRequired, tableCount)) {
      setFocusedTable("all");
    }
  }, [focusedTable, minTablesRequired, tableCount]);

  const activeTableCount = Math.max(minTablesRequired, tableCount);

  const tablesDraw = useMemo(() => {
    void drawSeed;
    return buildBalancedTableDraw(confirmedPlayers, activeTableCount, seatsPerTable);
  }, [confirmedPlayers, activeTableCount, seatsPerTable, drawSeed]);

  const handleChangeSeatsPerTable = (nextValue: number) => {
    const clamped = Math.max(2, Math.min(12, Math.round(nextValue) || 8));
    setSeatsPerTable(clamped);
    const needed = Math.max(1, Math.ceil(confirmedPlayers.length / clamped));
    setTableCount(needed);
    setDrawSeed(s => s + 1);
  };

  const handleChangeTableCount = (nextTables: number) => {
    const clamped = Math.max(minTablesRequired, Math.min(30, Math.round(nextTables) || 1));
    setTableCount(clamped);
    setDrawSeed(s => s + 1);
  };

  const handleAddTable = () => {
    handleChangeTableCount(activeTableCount + 1);
  };

  const handleDrawAgain = () => {
    setDrawSeed(s => s + 1);
  };

  const visibleTables =
    focusedTable === "all"
      ? tablesDraw
      : tablesDraw.filter(t => t.tableNumber === focusedTable);

  const isSingleDisplay = visibleTables.length === 1;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background:
          "radial-gradient(circle at 50% 38%, #0B2239 0%, #061322 52%, #030A14 100%)",
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
                CONTROL POKER
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
                color: "#F59E0B",
                textTransform: "uppercase",
              }}
            >
              SORTEIO DE MESAS
            </div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.1em",
                color: "#94A3B8",
                textTransform: "uppercase",
              }}
            >
              {selectedTournament ? selectedTournament.name : "Nenhum torneio selecionado"}
            </div>
          </div>

          {tournaments.length > 1 && (
            <select
              value={selectedTournament?.id ?? ""}
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
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

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
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "18px 0",
          gap: 18,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: "clamp(24px, 3vw, 34px)",
              fontWeight: 700,
              margin: "0 0 6px",
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
            }}
          >
            Sorteio de Assentos
          </h1>
          <p
            style={{
              fontSize: 13,
              letterSpacing: "0.08em",
              color: "#94A3B8",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            {selectedTournament ? selectedTournament.name : "TORNEIO"} -{" "}
            <strong style={{ color: "#38BDF8" }}>
              {confirmedPlayers.length}{" "}
              {confirmedPlayers.length === 1 ? "inscrito confirmado" : "inscritos confirmados"}
            </strong>{" "}
            · {activeTableCount} {activeTableCount === 1 ? "mesa" : "mesas"} ({seatsPerTable}{" "}
            pessoas/mesa)
          </p>
        </div>

        {activeTableCount > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => setFocusedTable("all")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 999,
                border:
                  focusedTable === "all"
                    ? "1.5px solid #00A8C6"
                    : "1px solid rgba(148, 163, 184, 0.25)",
                background:
                  focusedTable === "all"
                    ? "rgba(0, 168, 198, 0.22)"
                    : "rgba(8, 26, 46, 0.75)",
                color: focusedTable === "all" ? "#7DD3FC" : "#94A3B8",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <LayoutGrid size={13} /> Todas as mesas ({activeTableCount})
            </button>

            {tablesDraw.map(tbl => {
              const occupied = tbl.seats.filter(s => s.playerName !== null).length;
              const isSelected = focusedTable === tbl.tableNumber;
              return (
                <button
                  key={tbl.tableNumber}
                  type="button"
                  onClick={() => setFocusedTable(tbl.tableNumber)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 999,
                    border: isSelected
                      ? "1.5px solid #F59E0B"
                      : "1px solid rgba(148, 163, 184, 0.25)",
                    background: isSelected
                      ? "rgba(245, 158, 11, 0.2)"
                      : "rgba(8, 26, 46, 0.75)",
                    color: isSelected ? "#FCD34D" : "#CBD5E1",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Mesa {String(tbl.tableNumber).padStart(2, "0")} ({occupied}/{seatsPerTable})
                </button>
              );
            })}
          </div>
        )}

        <div
          style={{
            width: "100%",
            maxWidth: isSingleDisplay ? 760 : 1320,
            display: "grid",
            gridTemplateColumns: isSingleDisplay
              ? "minmax(300px, 720px)"
              : "repeat(auto-fit, minmax(460px, 1fr))",
            justifyContent: "center",
            gap: 24,
          }}
        >
          {visibleTables.map(table => {
            const occupiedCount = table.seats.filter(s => s.playerName !== null).length;
            return (
              <div
                key={table.tableNumber}
                style={{
                  position: "relative",
                  width: "100%",
                  height: isSingleDisplay ? 410 : 350,
                  borderRadius: 24,
                  background: "rgba(6, 20, 36, 0.55)",
                  border: "1px solid rgba(56, 189, 248, 0.14)",
                  boxShadow: "0 20px 50px rgba(0, 0, 0, 0.45)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: "16%",
                    right: "16%",
                    top: "20%",
                    bottom: "20%",
                    borderRadius: "999px",
                    background:
                      "radial-gradient(circle at center, #0E3150 0%, #081E34 70%, #061627 100%)",
                    border: "2px solid rgba(0, 168, 198, 0.55)",
                    boxShadow:
                      "0 0 36px rgba(0, 168, 198, 0.2), inset 0 0 28px rgba(0, 168, 198, 0.14)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: "0.22em",
                      color: "#94A3B8",
                      textTransform: "uppercase",
                    }}
                  >
                    MESA
                  </span>
                  <strong
                    style={{
                      fontSize: isSingleDisplay ? 36 : 30,
                      fontWeight: 800,
                      color: "#F59E0B",
                      lineHeight: 1.05,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {String(table.tableNumber).padStart(2, "0")}
                  </strong>
                  <span
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      color: "#7DD3FC",
                      fontWeight: 600,
                    }}
                  >
                    {occupiedCount} / {seatsPerTable} jogadores
                  </span>
                </div>

                {table.seats.map((seat, idx) => {
                  const pos = getSeatPosition(idx, seatsPerTable);
                  const isOccupied = Boolean(seat.playerName);
                  return (
                    <div
                      key={seat.seatNumber}
                      style={{
                        position: "absolute",
                        left: pos.left,
                        top: pos.top,
                        transform: "translate(-50%, -50%)",
                        minWidth: isSingleDisplay ? 116 : 98,
                        maxWidth: isSingleDisplay ? 142 : 120,
                        padding: isSingleDisplay ? "8px 12px" : "6px 9px",
                        borderRadius: 12,
                        background: isOccupied
                          ? "rgba(7, 26, 46, 0.94)"
                          : "rgba(7, 22, 38, 0.65)",
                        border: isOccupied
                          ? "1.5px solid #00A8C6"
                          : "1px dashed rgba(148, 163, 184, 0.28)",
                        boxShadow: isOccupied
                          ? "0 8px 20px rgba(0, 168, 198, 0.18)"
                          : "none",
                        textAlign: "center",
                        zIndex: 2,
                      }}
                    >
                      <div
                        style={{
                          fontSize: isSingleDisplay ? 13.5 : 12,
                          fontWeight: 700,
                          color: isOccupied ? "#38BDF8" : "#64748B",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={seat.playerName ?? "Assento livre"}
                      >
                        {seat.playerName ?? "Livre"}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: isOccupied ? "#94A3B8" : "#475569",
                          marginTop: 2,
                          fontWeight: 600,
                        }}
                      >
                        Assento {String(seat.seatNumber).padStart(2, "0")}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div
          style={{
            width: "100%",
            maxWidth: 1120,
            padding: "14px 18px",
            borderRadius: 16,
            background: "rgba(8, 25, 44, 0.85)",
            border: "1px solid rgba(56, 189, 248, 0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            <div>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "#94A3B8",
                  textTransform: "uppercase",
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Users size={12} color="#38BDF8" /> Pessoas por mesa
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => handleChangeSeatsPerTable(seatsPerTable - 1)}
                  disabled={seatsPerTable <= 2}
                  title="Diminuir pessoas por mesa"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: "1px solid rgba(148, 163, 184, 0.3)",
                    background: "#061729",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: seatsPerTable <= 2 ? "not-allowed" : "pointer",
                    opacity: seatsPerTable <= 2 ? 0.45 : 1,
                  }}
                >
                  <Minus size={14} />
                </button>

                <input
                  type="number"
                  min={2}
                  max={12}
                  value={seatsPerTable}
                  onChange={e => handleChangeSeatsPerTable(Number(e.target.value))}
                  aria-label="Quantidade de pessoas por mesa"
                  style={{
                    width: 54,
                    height: 32,
                    borderRadius: 8,
                    border: "1.5px solid #00A8C6",
                    background: "#061729",
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: 800,
                    textAlign: "center",
                  }}
                />

                <button
                  type="button"
                  onClick={() => handleChangeSeatsPerTable(seatsPerTable + 1)}
                  disabled={seatsPerTable >= 12}
                  title="Aumentar pessoas por mesa"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: "1px solid rgba(148, 163, 184, 0.3)",
                    background: "#061729",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: seatsPerTable >= 12 ? "not-allowed" : "pointer",
                    opacity: seatsPerTable >= 12 ? 0.45 : 1,
                  }}
                >
                  <Plus size={14} />
                </button>

                <div style={{ display: "flex", gap: 4, marginLeft: 4 }}>
                  {SEATS_PER_TABLE_PRESETS.map(preset => {
                    const active = seatsPerTable === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleChangeSeatsPerTable(preset)}
                        style={{
                          padding: "5px 9px",
                          borderRadius: 8,
                          border: active
                            ? "1.5px solid #00A8C6"
                            : "1px solid rgba(148, 163, 184, 0.25)",
                          background: active ? "rgba(0, 168, 198, 0.22)" : "#061729",
                          color: active ? "#7DD3FC" : "#94A3B8",
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {preset}p
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div
              style={{
                width: 1,
                height: 40,
                background: "rgba(148, 163, 184, 0.18)",
              }}
            />

            <div>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "#94A3B8",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Mesas no sorteio (mín. {minTablesRequired})
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => handleChangeTableCount(activeTableCount - 1)}
                  disabled={activeTableCount <= minTablesRequired}
                  title="Remover mesa"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: "1px solid rgba(148, 163, 184, 0.3)",
                    background: "#061729",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: activeTableCount <= minTablesRequired ? "not-allowed" : "pointer",
                    opacity: activeTableCount <= minTablesRequired ? 0.45 : 1,
                  }}
                >
                  <Minus size={14} />
                </button>

                <input
                  type="number"
                  min={minTablesRequired}
                  max={30}
                  value={activeTableCount}
                  onChange={e => handleChangeTableCount(Number(e.target.value))}
                  aria-label="Quantidade de mesas"
                  style={{
                    width: 54,
                    height: 32,
                    borderRadius: 8,
                    border: "1.5px solid #F59E0B",
                    background: "#061729",
                    color: "#FCD34D",
                    fontSize: 14,
                    fontWeight: 800,
                    textAlign: "center",
                  }}
                />

                <button
                  type="button"
                  onClick={handleAddTable}
                  style={{
                    height: 32,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: "1px solid rgba(245, 158, 11, 0.5)",
                    background: "rgba(245, 158, 11, 0.16)",
                    color: "#FCD34D",
                    fontSize: 12.5,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    cursor: "pointer",
                  }}
                >
                  <Plus size={14} /> Mais mesa
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={handleDrawAgain}
              style={{
                height: 42,
                padding: "0 18px",
                borderRadius: 11,
                border: "1.5px solid #00A8C6",
                background: "rgba(0, 168, 198, 0.2)",
                color: "#7DD3FC",
                fontSize: 13.5,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(0, 168, 198, 0.2)",
              }}
            >
              <Sparkles size={15} />
              <Shuffle size={15} />
              Sortear novamente
            </button>
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
        <span>CONTROL POKER · MODO TV</span>
        <span>
          {activeTableCount} {activeTableCount === 1 ? "MESA ATIVA" : "MESAS ATIVAS"} ·{" "}
          {activeTableCount * seatsPerTable} ASSENTOS TOTAIS
        </span>
      </footer>
    </div>
  );
}
