import { ArrowUpRight, Grid2X2, Sparkles } from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { PageIntro, StatusBadge } from "@/components/club/SharedUI";
import { Button } from "@/components/ui/button";

export function JackpotView() {
  const { setView } = useClub();

  return (
    <>
      <PageIntro
        eyebrow="Fidelidade e premiação"
        title="Jackpot"
        description="Acompanhe o progressivo do clube e os próximos níveis de premiação."
        action={() => setView("overview")}
        actionLabel="Voltar para visão geral"
      />
      <div className="simple-hero">
        <div className="simple-hero-icon icon-gold">
          <Sparkles size={30} />
        </div>
        <div>
          <StatusBadge tone="gold">Módulo conectado</StatusBadge>
          <h2>Jackpot Progressivo</h2>
          <p>Controle o acumulado de Bad Beat e premiações especiais do clube.</p>
        </div>
        <div className="simple-hero-action">
          <Button className="primary-button" onClick={() => setView("overview")}>
            Ver visão geral <ArrowUpRight size={15} />
          </Button>
        </div>
      </div>
      <div className="simple-stats">
        <div className="panel simple-stat">
          <span className="eyebrow">Jackpot atual</span>
          <strong>R$ 0,00</strong>
          <small>sem registros</small>
        </div>
        <div className="panel simple-stat">
          <span className="eyebrow">Próximo nível</span>
          <strong>R$ 0,00</strong>
          <small>sem registros</small>
        </div>
        <div className="panel simple-stat">
          <span className="eyebrow">Contribuição hoje</span>
          <strong>R$ 0,00</strong>
          <small>sem registros</small>
        </div>
      </div>
      <section className="panel empty-state">
        <div className="empty-orbit">
          <Sparkles size={28} />
        </div>
        <h2>Nenhum registro de Jackpot</h2>
        <p>O acumulado está zerado e pronto para iniciar.</p>
        <div className="empty-actions">
          <Button className="primary-button" onClick={() => setView("overview")}>
            <Grid2X2 size={15} /> Voltar ao hub
          </Button>
        </div>
      </section>
    </>
  );
}
