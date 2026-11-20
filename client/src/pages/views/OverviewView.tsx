import {
  ArrowUpRight,
  CircleDollarSign,
  Crown,
  Landmark,
  MoreHorizontal,
  Sparkles,
  Spade,
  Trophy,
  Users,
} from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { Avatar, brl, IconTile, PageIntro, StatusBadge } from "@/components/club/SharedUI";
import { cn } from "@/lib/utils";
import { getTournamentTotals } from "@/types/club";

const players: string[][] = [];

export function OverviewView() {
  const { setView, activities, tournaments, transactions } = useClub();

  const totalEntries = tournaments.reduce((sum, item) => sum + getTournamentTotals(item).buyInsCount, 0);
  const totalCapacity = tournaments.reduce((sum, item) => sum + item.capacity, 0);
  const progress = totalCapacity > 0 ? Math.min(100, Math.round((totalEntries / totalCapacity) * 100)) : 0;

  const totalCollectedTournaments = tournaments.reduce(
    (sum, item) => sum + getTournamentTotals(item).collectedTotal,
    0
  );
  const manualEntries = transactions
    .filter(t => t.type === "Entrada")
    .reduce((sum, t) => sum + t.value, 0);
  const totalRevenue = totalCollectedTournaments + manualEntries;

  return (
    <>
      <PageIntro
        eyebrow="Sexta-feira, 20 de novembro de 2026"
        title="Bem-vindo, Admin!"
        description="Visão geral da gestão do seu clube de poker"
        action={() => setView("tournaments")}
        actionLabel="Gerenciar torneios"
      />

      <section className="connection-section">
        <div className="section-header">
          <div>
            <h2>Tudo conectado</h2>
            <p>O pulso da sua operação em um único lugar.</p>
          </div>
          <StatusBadge tone="green">Atualizado agora</StatusBadge>
        </div>

        <div className="connected-grid">
          <button className="connected-card connected-finance" onClick={() => setView("finance")}>
            <div className="connected-card-head">
              <IconTile icon={Landmark} tone="cyan" />
              <span>Financeiro</span>
              <ArrowUpRight size={15} />
            </div>
            <strong>{brl(totalRevenue)}</strong>
            <small>
              <span className="up-text">
                <ArrowUpRight size={12} /> 0%
              </span>{" "}
              vs. mês anterior
            </small>
            <div className="mini-spark">
              <i style={{ height: "32%" }} />
              <i style={{ height: "45%" }} />
              <i style={{ height: "40%" }} />
              <i style={{ height: "66%" }} />
              <i style={{ height: "58%" }} />
              <i style={{ height: "82%" }} />
              <i style={{ height: "100%" }} />
            </div>
          </button>

          <div className="connection-line" />

          <button className="connected-card" onClick={() => setView("cash")}>
            <div className="connected-card-head">
              <IconTile icon={Spade} tone="green" />
              <span>Cash Game</span>
              <ArrowUpRight size={15} />
            </div>
            <strong>
              0 <small>mesas ativas</small>
            </strong>
            <small>
              <b>0</b> jogadores jogando agora
            </small>
            <div className="seat-dots">
              {Array.from({ length: 8 }).map((_, i) => (
                <span key={i} className={i < 6 ? "seat-filled" : ""} />
              ))}
            </div>
          </button>

          <div className="connection-line" />

          <button className="connected-card" onClick={() => setView("tournaments")}>
            <div className="connected-card-head">
              <IconTile icon={Trophy} tone="purple" />
              <span>Torneios</span>
              <ArrowUpRight size={15} />
            </div>
            <strong>
              {tournaments.length} <small>cadastrados</small>
            </strong>
            <small>
              <b>{totalEntries}</b> inscrições confirmadas
            </small>
            <div className="mini-progress">
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-label">
              <span>Ocupação</span>
              <b>{progress}%</b>
            </div>
          </button>

          <div className="connection-line" />

          <button className="connected-card" onClick={() => setView("ranking")}>
            <div className="connected-card-head">
              <IconTile icon={Crown} tone="gold" />
              <span>Ranking</span>
              <ArrowUpRight size={15} />
            </div>
            <strong>
              0 <small>jogadores</small>
            </strong>
            <small>
              <b>+0</b> novas posições esta semana
            </small>
            <div className="rank-avatars">
              {players.slice(0, 5).map(([initials, name, color]) => (
                <Avatar key={name} initials={initials} color={color} size="sm" />
              ))}
            </div>
          </button>

          <div className="connection-line" />

          <button className="connected-card jackpot-card" onClick={() => setView("jackpot")}>
            <div className="connected-card-head">
              <IconTile icon={Sparkles} tone="gold" />
              <span>Jackpot</span>
              <ArrowUpRight size={15} />
            </div>
            <strong>{brl(0)}</strong>
            <small>
              meta do próximo nível <b>{brl(0)}</b>
            </small>
            <div className="mini-progress gold-progress">
              <span style={{ width: "0%" }} />
            </div>
            <div className="progress-label">
              <span>Progressivo atual</span>
              <b>0%</b>
            </div>
          </button>
        </div>
      </section>

      <div className="overview-columns">
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Atividades recentes</h2>
              <p>Eventos de todos os módulos em tempo real.</p>
            </div>
            <button className="text-button" onClick={() => setView("tournaments")}>
              Ver tudo <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="activity-list">
            {activities.length ? (
              activities.slice(0, 5).map(activity => (
                <div className="activity-item" key={activity.id}>
                  <div className={cn("activity-icon", `activity-${activity.tone}`)}>
                    <activity.icon size={16} />
                  </div>
                  <div className="activity-copy">
                    <strong>{activity.title}</strong>
                    <span>{activity.detail}</span>
                  </div>
                  <time>{activity.time}</time>
                </div>
              ))
            ) : (
              <div className="empty-inline">Nenhuma atividade registrada ainda.</div>
            )}
          </div>
        </section>

        <section className="panel consolidated-panel">
          <div className="panel-heading">
            <div>
              <h2>Indicadores consolidados</h2>
              <p>Desempenho acumulado do clube.</p>
            </div>
            <MoreHorizontal size={18} className="muted-icon" />
          </div>
          <div className="consolidated-grid">
            <div>
              <span className="consolidated-icon">
                <Users size={16} />
              </span>
              <strong>{totalEntries}</strong>
              <small>Inscrições em torneios</small>
              <em>—</em>
            </div>
            <div>
              <span className="consolidated-icon">
                <Spade size={16} />
              </span>
              <strong>0</strong>
              <small>Mesas jogadas no mês</small>
              <em>—</em>
            </div>
            <div>
              <span className="consolidated-icon">
                <Trophy size={16} />
              </span>
              <strong>{tournaments.length}</strong>
              <small>Torneios cadastrados</small>
              <em>—</em>
            </div>
            <div>
              <span className="consolidated-icon">
                <CircleDollarSign size={16} />
              </span>
              <strong>{brl(totalRevenue)}</strong>
              <small>Receita do mês</small>
              <em>—</em>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
