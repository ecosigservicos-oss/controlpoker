import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  MoreHorizontal,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useClub } from "@/context/ClubContext";
import { Avatar, brl, MetricCard, PageIntro } from "@/components/club/SharedUI";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const chartData: { day: string; torneios: number; cash: number }[] = [];

function RankingPanel({ title, icon: Icon, items }: { title: string; icon: LucideIcon; items: string[][] }) {
  return (
    <section className="panel ranking-panel">
      <div className="panel-heading">
        <div className="heading-with-icon">
          <Icon size={17} />
          <div>
            <h2>{title}</h2>
            <p>Período selecionado</p>
          </div>
        </div>
        <MoreHorizontal size={18} className="muted-icon" />
      </div>
      <div className="ranking-list">
        {items.map(([initials, name, primary, secondary, color], index) => (
          <div className="ranking-row" key={name}>
            <span className="rank-position">{String(index + 1).padStart(2, "0")}</span>
            <Avatar initials={initials} color={color} size="sm" />
            <div className="rank-name">
              <strong>{name}</strong>
              <small>ID CP-{String(2384 + index * 127).padStart(5, "0")}</small>
            </div>
            <div className="rank-values">
              <strong>{primary}</strong>
              <small>{secondary}</small>
            </div>
          </div>
        ))}
      </div>
      <button className="panel-footer-link">
        Ver ranking completo <ArrowUpRight size={14} />
      </button>
    </section>
  );
}

export function DashboardView() {
  const { setView } = useClub();
  const [range, setRange] = useState("Mês atual");

  return (
    <>
      <PageIntro
        eyebrow="Indicadores de performance"
        title="Dashboard analítico"
        description="Acompanhe a saúde financeira e operacional do seu clube."
        action={() => setView("finance")}
        actionLabel="Exportar relatório"
      />

      <div className="filter-bar">
        <div className="filter-pills">
          {["Mês atual", "Mês anterior", "Últimos 30 dias"].map(item => (
            <button key={item} className={cn(range === item && "filter-active")} onClick={() => setRange(item)}>
              {item}
            </button>
          ))}
        </div>
        <div className="date-filter">
          <CalendarDays size={15} />
          <span>01/11/2026 — 20/11/2026</span>
          <ChevronDown size={14} />
        </div>
        <Button className="apply-button">Aplicar</Button>
      </div>

      <div className="metrics-grid">
        <MetricCard label="Rake total" value="R$ 0,00" change="0%" detail="sem registros" icon={CircleDollarSign} tone="cyan" />
        <MetricCard label="Total de despesas" value="R$ 0,00" change="0%" detail="vs. período anterior" icon={ArrowDownRight} tone="orange" />
        <MetricCard label="Resultado líquido" value="R$ 0,00" change="0%" detail="margem de 0%" icon={BarChart3} tone="green" />
        <MetricCard label="Jogadores ativos" value="0" change="0%" detail="sem cadastros" icon={Users} tone="purple" />
      </div>

      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Rake gerado por dia</h2>
              <p>Comparativo entre torneios e cash game.</p>
            </div>
            <div className="legend">
              <span><i className="legend-dot legend-cyan" />Cash Game</span>
              <span><i className="legend-dot legend-purple" />Torneios</span>
            </div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00A8C6" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#00A8C6" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="tournamentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C5CFC" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#7C5CFC" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E7EDF3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#8190A5" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8190A5" }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} />
                <RechartsTooltip
                  formatter={(value: number) => brl(value)}
                  contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 10px 30px #071e3614" }}
                />
                <Area type="monotone" dataKey="cash" name="Cash Game" stroke="#00A8C6" strokeWidth={2.5} fill="url(#cashGradient)" />
                <Area type="monotone" dataKey="torneios" name="Torneios" stroke="#7C5CFC" strokeWidth={2.5} fill="url(#tournamentGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <RankingPanel title="Mais horas no Cash Game" icon={Clock3} items={[]} />
        <RankingPanel title="Mais entradas em torneios" icon={Trophy} items={[]} />
      </div>
    </>
  );
}
