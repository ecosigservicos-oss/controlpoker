import { CircleDollarSign, Clock3, Plus, Spade, Users } from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { MetricCard, PageIntro } from "@/components/club/SharedUI";
import { Button } from "@/components/ui/button";

export function CashView() {
  const { setView } = useClub();

  return (
    <>
      <PageIntro
        eyebrow="Mesas e sessões"
        title="Cash Game"
        description="Controle mesas abertas, jogadores sentados e rake recolhido."
        action={() => setView("finance")}
        actionLabel="Registrar rake"
      />
      <div className="metrics-grid">
        <MetricCard label="Mesas ativas" value="0" detail="nenhuma mesa aberta" icon={Spade} tone="cyan" />
        <MetricCard label="Jogadores agora" value="0" detail="sem jogadores sentados" icon={Users} tone="green" />
        <MetricCard label="Rake hoje" value="R$ 0,00" detail="sem registros" icon={CircleDollarSign} tone="purple" />
        <MetricCard label="Tempo médio" value="0h 00m" detail="sem sessões" icon={Clock3} tone="orange" />
      </div>
      <section className="panel empty-state">
        <div className="empty-orbit">
          <Spade size={28} />
        </div>
        <h2>Nenhuma mesa ativa</h2>
        <p>Os dados de cash game foram limpos. Abra uma mesa para iniciar uma nova sessão.</p>
        <div className="empty-actions">
          <Button className="primary-button" onClick={() => setView("overview")}>
            <Plus size={15} /> Abrir primeira mesa
          </Button>
        </div>
      </section>
    </>
  );
}
