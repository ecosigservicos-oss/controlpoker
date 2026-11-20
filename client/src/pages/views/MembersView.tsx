import { ArrowUpRight, Grid2X2, Users } from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { PageIntro, StatusBadge } from "@/components/club/SharedUI";
import { Button } from "@/components/ui/button";

export function MembersView() {
  const { setView } = useClub();

  return (
    <>
      <PageIntro
        eyebrow="Base de jogadores"
        title="Membros / Jogadores"
        description="Cadastro, saldo em conta e histórico de todos os jogadores do clube."
        action={() => setView("overview")}
        actionLabel="Voltar para visão geral"
      />
      <div className="simple-hero">
        <div className="simple-hero-icon icon-purple">
          <Users size={30} />
        </div>
        <div>
          <StatusBadge tone="cyan">Módulo conectado</StatusBadge>
          <h2>Base de membros</h2>
          <p>Este módulo está conectado ao sistema do clube e pronto para novos cadastros.</p>
        </div>
        <div className="simple-hero-action">
          <Button className="primary-button" onClick={() => setView("overview")}>
            Ver visão geral <ArrowUpRight size={15} />
          </Button>
        </div>
      </div>
      <div className="simple-stats">
        <div className="panel simple-stat">
          <span className="eyebrow">Jogadores cadastrados</span>
          <strong>0</strong>
          <small>base vazia</small>
        </div>
        <div className="panel simple-stat">
          <span className="eyebrow">Ativos hoje</span>
          <strong>0</strong>
          <small>sem registros</small>
        </div>
        <div className="panel simple-stat">
          <span className="eyebrow">Saldo em contas</span>
          <strong>R$ 0,00</strong>
          <small>sem registros</small>
        </div>
      </div>
      <section className="panel empty-state">
        <div className="empty-orbit">
          <Users size={28} />
        </div>
        <h2>Nenhum jogador cadastrado</h2>
        <p>Cadastre jogadores para acompanhar histórico e saldo em conta.</p>
        <div className="empty-actions">
          <Button className="primary-button" onClick={() => setView("overview")}>
            <Grid2X2 size={15} /> Voltar ao hub
          </Button>
        </div>
      </section>
    </>
  );
}
