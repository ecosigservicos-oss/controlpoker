import { useEffect, useState } from "react";
import { Clock3, Grid2X2, Pause, Play, Sparkles, Trophy, UserMinus, UserPlus, X } from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { brl, formatTime, LogoMark, StatusBadge } from "@/components/club/SharedUI";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEFAULT_BLIND_LEVELS, getTournamentTotals } from "@/types/club";

function _Legacy_TvView({ mode }: { mode: "clock" | "draw" }) {
  const { setView, activeTournament: tournament, setTournaments, blindLevels, rules } = useClub();

  const [levelIndex, setLevelIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState((tournament?.blindMinutes ?? 15) * 60);
  const [running, setRunning] = useState(false);
  const [seats, setSeats] = useState<string[]>(Array(8).fill(""));
  const [revealed, setRevealed] = useState(false);

  const levels = blindLevels.length > 0 ? blindLevels : DEFAULT_BLIND_LEVELS;

  useEffect(() => {
    setSecondsLeft((tournament?.blindMinutes ?? 15) * 60);
    setLevelIndex(0);
    setRunning(false);
  }, [tournament?.id, tournament?.blindMinutes]);

  useEffect(() => {
    if (!running || mode !== "clock") return;
    const timer = window.setInterval(() => {
      setSecondsLeft(prev => {
        if (prev > 1) return prev - 1;
        setLevelIndex(idx => Math.min(levels.length - 1, idx + 1));
        return (tournament?.blindMinutes ?? 15) * 60;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, mode, tournament?.blindMinutes, levels.length]);

  if (!tournament) {
    return (
      <div className="tv-screen">
        <div className="tv-topbar">
          <button className="tv-brand" onClick={() => setView("overview")}>
            <LogoMark />
            <span className="tv-brand-separator" />
            <span className="tv-event-label">
              MODO TV <small>SEM EVENTO SELECIONADO</small>
            </span>
          </button>
          <button className="tv-exit" onClick={() => setView("tournaments")}>
            <X size={16} /> Sair da TV
          </button>
        </div>
        <div className="empty-state tv-empty-state">
          <div className="empty-orbit">{mode === "clock" ? <Clock3 size={28} /> : <Grid2X2 size={28} />}</div>
          <h2>{mode === "clock" ? "Nenhum torneio no Clocker" : "Nenhum sorteio disponível"}</h2>
          <p>Crie um torneio primeiro para ativar o relógio de blinds ou o sorteio de mesas.</p>
          <div className="empty-actions">
            <Button className="primary-button" onClick={() => setView("tournaments")}>
              <Trophy size={15} /> Ir para torneios
            </Button>
          </div>
        </div>
        <div className="tv-footer-hint">
          <span>CONTROL POKER</span>
          <span>Gestão de clubes · Modo TV</span>
        </div>
      </div>
    );
  }

  const totals = getTournamentTotals(tournament, rules);

  const handleAdjustEliminated = (delta: number) => {
    setTournaments(current =>
      current.map(item => {
        if (item.id !== tournament.id) return item;
        const maxEliminated = Math.max(0, totals.buyInsCount - 1);
        const nextEliminated = Math.min(maxEliminated, Math.max(0, (item.eliminatedCount ?? 0) + delta));
        return { ...item, eliminatedCount: nextEliminated };
      })
    );
  };

  if (mode === "clock") {
    const currentLevel = levels[levelIndex] ?? levels[0];
    const nextLevel = levels[levelIndex + 1] ?? null;
    const prizePool = Math.max(tournament.guaranteed, totals.collectedTotal);

    return (
      <div className="tv-screen">
        <div className="tv-topbar">
          <button className="tv-brand" onClick={() => setView("tournaments")}>
            <LogoMark />
            <span className="tv-brand-separator" />
            <span className="tv-event-label">
              CLOCKER OFICIAL <small>{tournament.name.toUpperCase()}</small>
            </span>
          </button>
          <div className="tv-top-actions">
            <StatusBadge tone={running ? "green" : "orange"}>{running ? "RELÓGIO ATIVO" : "PAUSADO"}</StatusBadge>
            <button className="tv-exit" onClick={() => setView("tournaments")}>
              <X size={16} /> Voltar ao torneio
            </button>
          </div>
        </div>

        <div className="clock-layout">
          <div className="clock-side">
            <div className="tv-stat-block">
              <span>ATIVOS / INSCRITOS</span>
              <strong>
                {totals.activePlayers} <small>/ {totals.buyInsCount}</small>
              </strong>
              {totals.buyInsCount > 1 && (
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button
                    type="button"
                    title="Registrar eliminação"
                    onClick={() => handleAdjustEliminated(1)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: "1px solid rgba(255,255,255,0.16)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#E2E8F0",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    <UserMinus size={12} /> Eliminar
                  </button>
                  {(tournament.eliminatedCount ?? 0) > 0 && (
                    <button
                      type="button"
                      title="Desfazer eliminação"
                      onClick={() => handleAdjustEliminated(-1)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 8px",
                        borderRadius: 6,
                        border: "1px solid rgba(255,255,255,0.16)",
                        background: "rgba(255,255,255,0.06)",
                        color: "#E2E8F0",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      <UserPlus size={12} /> +1
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="tv-stat-block">
              <span>STACK MÉDIO</span>
              <strong>{totals.averageStack.toLocaleString("pt-BR")}</strong>
            </div>
          </div>

          <div className="clock-center">
            <div className="clock-kicker">
              <span className="neon-line" />
              <span>
                NÍVEL {currentLevel.level} DE {levels.length}
              </span>
              <span className="neon-line" />
            </div>
            <div className="clock-time">{formatTime(secondsLeft)}</div>
            <div className="clock-blinds">
              <strong>
                {currentLevel.sb} / {currentLevel.bb}
              </strong>
              <span>SMALL BLIND / BIG BLIND</span>
            </div>
            <div className="next-level">
              <span>PRÓXIMO NÍVEL:</span>
              <b>{nextLevel ? `${nextLevel.sb} / ${nextLevel.bb}` : "NÍVEL FINAL"}</b>
            </div>
            <div className="prize-strip">
              <span>PREMIAÇÃO TOTAL</span>
              <strong>{brl(prizePool)}</strong>
              <span>BUY-IN</span>
              <strong>{brl(tournament.buyIn)}</strong>
            </div>
          </div>

          <div className="clock-side right">
            <div className="tv-stat-block">
              <span>FICHAS EM JOGO</span>
              <strong>{totals.totalChipsInPlay.toLocaleString("pt-BR")}</strong>
            </div>
            <div className="tv-stat-block">
              <span>TEMPO NÍVEL</span>
              <strong>
                {tournament.blindMinutes} <small>min</small>
              </strong>
            </div>
          </div>

          <div className="clock-footer">
            <div>
              <span>ENTRADA</span>
              <strong>{brl(tournament.buyIn)}</strong>
            </div>
            <div>
              <span>STACK INICIAL</span>
              <strong>{tournament.stack}</strong>
            </div>
            <div>
              <span>ARRECADADO</span>
              <strong>{brl(totals.collectedTotal)}</strong>
            </div>
            <div className="clock-controls">
              <button
                type="button"
                title="Nível anterior"
                onClick={() => {
                  setLevelIndex(i => Math.max(0, i - 1));
                  setSecondsLeft(tournament.blindMinutes * 60);
                }}
              >
                «
              </button>
              <button
                type="button"
                className="clock-play"
                title={running ? "Pausar" : "Iniciar"}
                onClick={() => setRunning(r => !r)}
              >
                {running ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                type="button"
                title="Próximo nível"
                onClick={() => {
                  setLevelIndex(i => Math.min(levels.length - 1, i + 1));
                  setSecondsLeft(tournament.blindMinutes * 60);
                }}
              >
                »
              </button>
            </div>
          </div>
        </div>

        <div className="tv-footer-hint">
          <span>CONTROL POKER · CLOCKER</span>
          <span>Use Play/Pause para controlar o tempo dos blinds</span>
        </div>
      </div>
    );
  }

  const handleDrawSeats = () => {
    const buyInPlayers = totals.registrations.filter(r => r.entryType === "Buy-in").map(r => r.playerName);
    const count = Math.min(8, Math.max(2, buyInPlayers.length || totals.buyInsCount || 8));
    const labels = Array.from({ length: count }, (_, idx) =>
      buyInPlayers[idx] ? buyInPlayers[idx] : `Jogador #${idx + 1}`
    );
    for (let i = labels.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [labels[i], labels[j]] = [labels[j], labels[i]];
    }
    const nextSeats = Array(8).fill("");
    labels.forEach((label, idx) => {
      nextSeats[idx] = label;
    });
    setSeats(nextSeats);
    setRevealed(true);
  };

  return (
    <div className="tv-screen">
      <div className="tv-topbar">
        <button className="tv-brand" onClick={() => setView("tv-draw")}>
          <LogoMark />
          <span className="tv-brand-separator" />
          <span className="tv-event-label">
            SORTEIO DE MESAS <small>{tournament.name.toUpperCase()}</small>
          </span>
        </button>
        <button className="tv-exit" onClick={() => setView("tournaments")}>
          <X size={16} /> Voltar ao torneio
        </button>
      </div>

      <div className="draw-layout">
        <div className="draw-heading">
          <h1>Sorteio de Assentos</h1>
          <p>
            {tournament.name} · {totals.buyInsCount} inscritos confirmados
          </p>
        </div>

        <div className="poker-table-large">
          <div className="table-label">
            <span>MESA</span>
            <strong>01</strong>
          </div>
          {seats.map((playerName, idx) => (
            <div
              key={idx}
              className={cn("large-seat", `large-seat-${idx + 1}`, revealed && playerName && "seat-revealed")}
            >
              <span>{revealed && playerName ? playerName.replace("Jogador ", "") : `Pos ${idx + 1}`}</span>
              <small>{revealed && playerName ? `Assento 0${idx + 1}` : "Livre"}</small>
            </div>
          ))}
        </div>

        <div className="draw-bottom">
          <div className="draw-players">
            <span>DISTRIBUIÇÃO AUTOMÁTICA DE ASSENTOS</span>
            <div>
              <div className="draw-player">
                <span>Clique no botão ao lado para sortear os assentos da mesa</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className={cn("draw-button", revealed && "draw-done")}
            onClick={handleDrawSeats}
          >
            <Sparkles size={15} /> {revealed ? "Sortear novamente" : "Sortear assentos"}
          </button>
        </div>
      </div>

      <div className="tv-footer-hint">
        <span>CONTROL POKER · MODO TV</span>
        <span>Sorteio aleatório oficial de posições</span>
      </div>
    </div>
  );
}

export { TvDrawView as TvView } from "@/pages/views/TvDrawView";


