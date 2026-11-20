import { ArrowUpRight, Coffee, Grid2X2 } from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { PageIntro, StatusBadge } from "@/components/club/SharedUI";
import { Button } from "@/components/ui/button";

export function BarView() {
  const { setView } = useClub();

  return (
    <>
      <PageIntro
        eyebrow="PDV e consumo"
        title="Bar / Consumo"
        description="Lance consumos na conta do jogador ou feche pagamentos na hora."
        action={() => setView("overview")}
        actionLabel="Voltar para visão geral"
      />
      <div className="simple-hero">
        <div className="simple-hero-icon icon-orange">
          <Coffee size={30} />
        </div>
        <div>
          <StatusBadge tone="orange">Módulo conectado</StatusBadge>
          <h2>Dados limpos</h2>
          <p>Este módulo está pronto para receber novos registros de bar e consumo.</p>
        </div>
        <div className="simple-hero-action">
          <Button className="primary-button" onClick={() => setView("overview")}>
            Ver visão geral <ArrowUpRight size={15} />
          </Button>
        </div>
      </div>
      <div className="simple-stats">
        <div className="panel simple-stat">
          <span className="eyebrow">Comandas abertas</span>
          <strong>0</strong>
          <small>sem registros</small>
        </div>
        <div className="panel simple-stat">
          <span className="eyebrow">Consumo hoje</span>
          <strong>R$ 0,00</strong>
          <small>sem registros</small>
        </div>
        <div className="panel simple-stat">
          <span className="eyebrow">Ticket médio</span>
          <strong>R$ 0,00</strong>
          <small>sem registros</small>
        </div>
      </div>
      <section className="panel empty-state">
        <div className="empty-orbit">
          <Coffee size={28} />
        </div>
        <h2>Nenhuma comanda registrada</h2>
        <p>O módulo de Bar / Consumo está pronto para uso.</p>
        <div className="empty-actions">
          <Button className="primary-button" onClick={() => setView("overview")}>
            <Grid2X2 size={15} /> Voltar ao hub
          </Button>
        </div>
      </section>
    </>
  );
}
