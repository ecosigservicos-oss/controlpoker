import { ArrowUpRight, Grid2X2, Settings2 } from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { PageIntro, StatusBadge } from "@/components/club/SharedUI";
import { Button } from "@/components/ui/button";

export function SettingsView() {
  const { setView } = useClub();

  return (
    <>
      <PageIntro
        eyebrow="Administração"
        title="Configurações"
        description="Ajuste unidades, permissões, integrações e preferências do clube."
        action={() => setView("overview")}
        actionLabel="Voltar para visão geral"
      />
      <div className="simple-hero">
        <div className="simple-hero-icon icon-cyan">
          <Settings2 size={30} />
        </div>
        <div>
          <StatusBadge tone="cyan">Módulo conectado</StatusBadge>
          <h2>Configurações do Clube</h2>
          <p>Gerencie dados da unidade, administradores e parâmetros gerais.</p>
        </div>
        <div className="simple-hero-action">
          <Button className="primary-button" onClick={() => setView("overview")}>
            Ver visão geral <ArrowUpRight size={15} />
          </Button>
        </div>
      </div>
      <div className="simple-stats">
        <div className="panel simple-stat">
          <span className="eyebrow">Unidades</span>
          <strong>1</strong>
          <small>PokerGestor</small>
        </div>
        <div className="panel simple-stat">
          <span className="eyebrow">Usuários admin</span>
          <strong>1</strong>
          <small>Admin principal</small>
        </div>
        <div className="panel simple-stat">
          <span className="eyebrow">Armazenamento</span>
          <strong>Ativo</strong>
          <small>sincronizado localmente</small>
        </div>
      </div>
      <section className="panel empty-state">
        <div className="empty-orbit">
          <Settings2 size={28} />
        </div>
        <h2>Preferências padrão ativas</h2>
        <p>Use o menu Estruturas de Blinds para configurar valores e níveis de torneio.</p>
        <div className="empty-actions">
          <Button className="primary-button" onClick={() => setView("overview")}>
            <Grid2X2 size={15} /> Voltar ao hub
          </Button>
        </div>
      </section>
    </>
  );
}
