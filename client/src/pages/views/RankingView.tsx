import { ArrowUpRight, Crown, Grid2X2 } from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { PageIntro, StatusBadge } from "@/components/club/SharedUI";
import { Button } from "@/components/ui/button";

export function RankingView() {
  const { setView } = useClub();

  return (
    <>
      <PageIntro
        eyebrow="Performance e fidelidade"
        title="Ranking"
        description="Pontos, horas jogadas e posições atualizadas em tempo real."
        action={() => setView("overview")}
        actionLabel="Voltar para visão geral"
      />
      <div className="simple-hero">
        <div className="simple-hero-icon icon-gold">
          <Crown size={30} />
        </div>
        <div>
          <StatusBadge tone="gold">Módulo conectado</StatusBadge>
          <h2>Ranking do Clube</h2>
          <p>Acompanhe a pontuação geral da temporada e classificações para a final.</p>
        </div>
        <div className="simple-hero-action">
          <Button className="primary-button" onClick={() => setView("overview")}>
            Ver visão geral <ArrowUpRight size={15} />
          </Button>
        </div>
      </div>
      <div className="simple-stats">
        <div className="panel simple-stat">
          <span className="eyebrow">Jogadores ranqueados</span>
          <strong>0</strong>
          <small>base vazia</small>
        </div>
        <div className="panel simple-stat">
          <span className="eyebrow">Pontos distribuídos</span>
          <strong>0</strong>
          <small>sem registros</small>
        </div>
        <div className="panel simple-stat">
          <span className="eyebrow">Líder atual</span>
          <strong>—</strong>
          <small>sem registros</small>
        </div>
      </div>
      <section className="panel empty-state">
        <div className="empty-orbit">
          <Crown size={28} />
        </div>
        <h2>Nenhuma pontuação registrada</h2>
        <p>Finalize torneios para somar pontos automaticamente no ranking.</p>
        <div className="empty-actions">
          <Button className="primary-button" onClick={() => setView("overview")}>
            <Grid2X2 size={15} /> Voltar ao hub
          </Button>
        </div>
      </section>
    </>
  );
}
