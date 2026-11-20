import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Coffee,
  CreditCard,
  Crown,
  Ellipsis,
  FileBarChart,
  Grid2X2,
  Landmark,
  LayoutDashboard,
  Menu,
  MonitorPlay,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Spade,
  Trophy,
  Tv2,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const compactBrl = (value: number) =>
  value >= 1000 ? `R$ ${(value / 1000).toFixed(1).replace(".", ",")}k` : brl(value);

const parseBrlInput = (raw: string) => {
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

const navGroups: { label: string; items: { id: ViewKey; label: string; icon: LucideIcon; badge?: string }[] }[] = [
  {
    label: "PRINCIPAL",
    items: [
      { id: "overview", label: "Visão Geral", icon: Grid2X2 },
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "finance", label: "Gestão de Saldos", icon: WalletCards },
    ],
  },
  {
    label: "ÁREAS",
    items: [
      { id: "tournaments", label: "Torneios", icon: Trophy },
      { id: "cash", label: "Cash Game", icon: Spade },
      { id: "bar", label: "Bar / Consumo", icon: Coffee },
    ],
  },
  {
    label: "FINANCEIRO",
    items: [
      { id: "finance", label: "Financeiro", icon: CircleDollarSign },
      { id: "dashboard", label: "Relatórios", icon: FileBarChart },
    ],
  },
  {
    label: "OPERAÇÃO",
    items: [
      { id: "members", label: "Membros / Jogadores", icon: Users },
      { id: "ranking", label: "Ranking", icon: Crown },
      { id: "tv-draw", label: "Sorteios (Modo TV)", icon: Tv2 },
      { id: "satellites", label: "Satélites", icon: Zap },
      { id: "blinds", label: "Estruturas de Blinds", icon: Clock3 },
      { id: "jackpot", label: "Jackpot", icon: Sparkles },
      { id: "settings", label: "Configurações", icon: Settings2 },
    ],
  },
];

type ViewKey =
  | "overview"
  | "dashboard"
  | "finance"
  | "tournaments"
  | "satellites"
  | "blinds"
  | "cash"
  | "bar"
  | "members"
  | "ranking"
  | "jackpot"
  | "tv-clock"
  | "tv-draw"
  | "settings";

type Transaction = {
  id: string;
  date: string;
  description: string;
  category: string;
  type: "Entrada" | "Saída";
  value: number;
  payment: string;
  icon: LucideIcon;
  tone: "cyan" | "green" | "orange" | "purple" | "red";
};

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  tone: "cyan" | "green" | "gold" | "purple";
  icon: LucideIcon;
};

type TournamentStatus = "Agendado" | "Em andamento" | "Finalizado";

type EntryType = "Buy-in" | "Rebuy" | "Add-on";

type TournamentRegistration = {
  id: string;
  playerName: string;
  entryType: EntryType;
  value: number;
  payment: string;
  time: string;
};

type BlindLevel = {
  level: number;
  sb: number;
  bb: number;
  ante: number;
};

type Tournament = {
  id: string;
  name: string;
  date: string;
  time: string;
  buyIn: number;
  guaranteed: number;
  stack: string;
  blindMinutes: number;
  status: TournamentStatus;
  entries: number;
  capacity: number;
  registrations?: TournamentRegistration[];
};

const DEFAULT_BLIND_LEVELS: BlindLevel[] = [
  { level: 1, sb: 100, bb: 200, ante: 200 },
  { level: 2, sb: 150, bb: 300, ante: 300 },
  { level: 3, sb: 200, bb: 400, ante: 400 },
  { level: 4, sb: 300, bb: 600, ante: 600 },
  { level: 5, sb: 400, bb: 800, ante: 800 },
  { level: 6, sb: 500, bb: 1000, ante: 1000 },
  { level: 7, sb: 800, bb: 1600, ante: 1600 },
  { level: 8, sb: 1000, bb: 2000, ante: 2000 },
  { level: 9, sb: 1500, bb: 3000, ante: 3000 },
  { level: 10, sb: 2000, bb: 4000, ante: 4000 },
];

const TOURNAMENTS_STORAGE_KEY = "controlpoker_tournaments_v1";

const chartData: { day: string; torneios: number; cash: number }[] = [];
const cashChartData: { day: string; entrada: number; saida: number }[] = [];
const initialTransactions: Transaction[] = [];
const initialActivities: ActivityItem[] = [];
const players: string[][] = [];

function getTournamentTotals(tournament: Tournament) {
  const regs = tournament.registrations ?? [];
  if (regs.length === 0) {
    return {
      registrations: regs,
      buyInsCount: tournament.entries,
      rebuysCount: 0,
      addonsCount: 0,
      collectedTotal: tournament.buyIn * tournament.entries,
    };
  }
  const buyInsCount = regs.filter(r => r.entryType === "Buy-in").length;
  const rebuysCount = regs.filter(r => r.entryType === "Rebuy").length;
  const addonsCount = regs.filter(r => r.entryType === "Add-on").length;
  const collectedTotal = regs.reduce((sum, r) => sum + r.value, 0);
  return {
    registrations: regs,
    buyInsCount,
    rebuysCount,
    addonsCount,
    collectedTotal,
  };
}

function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("brand-lockup", compact && "brand-lockup-compact")}>
      <div className="brand-mark"><span>♠</span><span className="brand-mark-dot" /></div>
      {!compact && <div><div className="brand-name">CONTROL <strong>POKER</strong></div><div className="brand-caption">GESTÃO DE CLUBES</div></div>}
    </div>
  );
}

function StatusBadge({ children, tone = "neutral", dot = true }: { children: React.ReactNode; tone?: "neutral" | "green" | "cyan" | "orange" | "red" | "gold"; dot?: boolean }) {
  return <span className={cn("status-badge", `status-${tone}`)}>{dot && <span className="status-dot" />}{children}</span>;
}

function Avatar({ initials, color = "#00A8C6", size = "md" }: { initials: string; color?: string; size?: "sm" | "md" | "lg" }) {
  return <span className={cn("avatar", `avatar-${size}`)} style={{ background: `${color}22`, color }}>{initials}</span>;
}

function IconTile({ icon: Icon, tone = "cyan" }: { icon: LucideIcon; tone?: string }) {
  return <div className={cn("icon-tile", `icon-${tone}`)}><Icon size={17} strokeWidth={2.1} /></div>;
}

function MetricCard({ label, value, change, icon: Icon, tone = "cyan", detail, onClick }: { label: string; value: string; change?: string; icon: LucideIcon; tone?: string; detail?: string; onClick?: () => void }) {
  return (
    <button type="button" className={cn("metric-card", `metric-${tone}`)} onClick={onClick}>
      <div className="metric-card-top"><span className="eyebrow">{label}</span><IconTile icon={Icon} tone={tone} /></div>
      <div className="metric-value">{value}</div>
      <div className="metric-footer">{change && <span className={cn("change", change.startsWith("-") ? "change-negative" : "change-positive")}><ArrowUpRight size={13} /> {change}</span>}<span className="metric-detail">{detail}</span></div>
    </button>
  );
}

function PageIntro({ eyebrow, title, description, action, actionLabel = "Ação rápida" }: { eyebrow: string; title: string; description: string; action?: () => void; actionLabel?: string }) {
  return <div className="page-intro"><div><div className="eyebrow intro-eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <Button className="primary-button" onClick={action}><Plus size={16} />{actionLabel}</Button>}</div>;
}

function Sidebar({ view, setView, collapsed, setCollapsed, mobileOpen }: { view: ViewKey; setView: (view: ViewKey) => void; collapsed: boolean; setCollapsed: (collapsed: boolean) => void; mobileOpen: boolean }) {
  return <aside className={cn("sidebar", collapsed && "sidebar-collapsed", mobileOpen && "sidebar-mobile-open")}>
    <div className="sidebar-top"><button className="sidebar-logo" onClick={() => setView("overview")}><LogoMark compact={collapsed} /></button><button className="collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label="Recolher menu"><Menu size={17} /></button></div>
    <div className="quick-search"><Search size={15} /><span>Busca rápida</span><kbd>ALT S</kbd></div>
    <nav className="sidebar-nav">
      {navGroups.map(group => <div className="nav-group" key={group.label}><div className="nav-group-label">{group.label}</div>{group.items.map((item, index) => <button key={`${item.label}-${index}`} type="button" className={cn("nav-item", view === item.id && "nav-item-active")} onClick={() => setView(item.id)} title={collapsed ? item.label : undefined}><item.icon size={17} strokeWidth={view === item.id ? 2.4 : 1.8} /><span>{item.label}</span>{item.badge && <em>{item.badge}</em>}</button>)}</div>)}
    </nav>
    <div className="sidebar-bottom"><div className="sidebar-status"><span className="pulse-dot" /><span>Sistema operacional</span><ShieldCheck size={14} /></div><button className="user-switcher"><Avatar initials="AD" color="#00D4FF" size="sm" /><span><strong>Poker Club SP</strong><small>Admin · Unidade principal</small></span><ChevronDown size={15} /></button></div>
  </aside>;
}

function Topbar({ view, onNotify, onMenu }: { view: ViewKey; onNotify: () => void; onMenu: () => void }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const titleMap: Record<ViewKey, string> = { overview: "Visão Geral", dashboard: "Dashboard", finance: "Financeiro", tournaments: "Torneios", satellites: "Satélites", blinds: "Estruturas de Blinds", cash: "Cash Game", bar: "Bar / Consumo", members: "Membros / Jogadores", ranking: "Ranking", jackpot: "Jackpot", "tv-clock": "Clocker", "tv-draw": "Sorteio de Mesas", settings: "Configurações" };
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.altKey && event.key.toLowerCase() === "s") { event.preventDefault(); setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50); } }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, []);
  return <header className="topbar"><button className="mobile-menu-button topbar-icon" onClick={onMenu} aria-label="Abrir menu"><Menu size={18} /></button><div className="breadcrumb"><span>Control Poker</span><span>/</span><strong>{titleMap[view]}</strong></div><div className="topbar-actions">{searchOpen ? <div className="top-search"><Search size={15} /><input ref={searchRef} placeholder="Buscar jogador, torneio ou transação" onBlur={() => setSearchOpen(false)} /><kbd>ESC</kbd></div> : <button className="topbar-icon" onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50); }}><Search size={17} /></button>}<button className="topbar-icon notification-button" onClick={onNotify}><Bell size={17} /><span /></button><div className="topbar-date"><CalendarDays size={15} /><span>20 Nov, 2026</span><ChevronDown size={14} /></div></div></header>;
}

function OverviewView({ setView, activities, tournaments }: { setView: (view: ViewKey) => void; activities: ActivityItem[]; tournaments: Tournament[] }) {
  const totalEntries = tournaments.reduce((sum, item) => sum + getTournamentTotals(item).buyInsCount, 0);
  const totalCapacity = tournaments.reduce((sum, item) => sum + item.capacity, 0);
  const progress = totalCapacity > 0 ? Math.min(100, Math.round((totalEntries / totalCapacity) * 100)) : 0;

  return <>
    <PageIntro eyebrow="Sexta-feira, 20 de novembro de 2026" title="Bem-vindo, Admin!" description="Visão geral da gestão do seu clube de poker" action={() => setView("tournaments")} actionLabel="Gerenciar torneios" />
    <section className="connection-section"><div className="section-header"><div><h2>Tudo conectado</h2><p>O pulso da sua operação em um único lugar.</p></div><StatusBadge tone="green">Atualizado agora</StatusBadge></div><div className="connected-grid">
      <button className="connected-card connected-finance" onClick={() => setView("finance")}><div className="connected-card-head"><IconTile icon={Landmark} tone="cyan" /><span>Financeiro</span><ArrowUpRight size={15} /></div><strong>{brl(0)}</strong><small><span className="up-text"><ArrowUpRight size={12} /> 0%</span> vs. mês anterior</small><div className="mini-spark"><i style={{ height: "32%" }} /><i style={{ height: "45%" }} /><i style={{ height: "40%" }} /><i style={{ height: "66%" }} /><i style={{ height: "58%" }} /><i style={{ height: "82%" }} /><i style={{ height: "100%" }} /></div></button>
      <div className="connection-line" />
      <button className="connected-card" onClick={() => setView("cash")}><div className="connected-card-head"><IconTile icon={Spade} tone="green" /><span>Cash Game</span><ArrowUpRight size={15} /></div><strong>0 <small>mesas ativas</small></strong><small><b>0</b> jogadores jogando agora</small><div className="seat-dots">{Array.from({ length: 8 }).map((_, i) => <span key={i} className={i < 6 ? "seat-filled" : ""} />)}</div></button>
      <div className="connection-line" />
      <button className="connected-card" onClick={() => setView("tournaments")}><div className="connected-card-head"><IconTile icon={Trophy} tone="purple" /><span>Torneios</span><ArrowUpRight size={15} /></div><strong>{tournaments.length} <small>cadastrados</small></strong><small><b>{totalEntries}</b> inscrições confirmadas</small><div className="mini-progress"><span style={{ width: `${progress}%` }} /></div><div className="progress-label"><span>Ocupação</span><b>{progress}%</b></div></button>
      <div className="connection-line" />
      <button className="connected-card" onClick={() => setView("ranking")}><div className="connected-card-head"><IconTile icon={Crown} tone="gold" /><span>Ranking</span><ArrowUpRight size={15} /></div><strong>0 <small>jogadores</small></strong><small><b>+0</b> novas posições esta semana</small><div className="rank-avatars">{players.slice(0, 5).map(([initials, name, color]) => <Avatar key={name} initials={initials} color={color} size="sm" />)}</div></button>
      <div className="connection-line" />
      <button className="connected-card jackpot-card" onClick={() => setView("jackpot")}><div className="connected-card-head"><IconTile icon={Sparkles} tone="gold" /><span>Jackpot</span><ArrowUpRight size={15} /></div><strong>{brl(0)}</strong><small>meta do próximo nível <b>{brl(0)}</b></small><div className="mini-progress gold-progress"><span style={{ width: "0%" }} /></div><div className="progress-label"><span>Progressivo atual</span><b>0%</b></div></button>
    </div></section>
    <div className="overview-columns"><section className="panel activity-panel"><div className="panel-heading"><div><h2>Atividades recentes</h2><p>Eventos de todos os módulos em tempo real.</p></div><button className="text-button">Ver tudo <ArrowUpRight size={14} /></button></div><div className="activity-list">{activities.length ? activities.slice(0, 5).map(activity => <div className="activity-item" key={activity.id}><div className={cn("activity-icon", `activity-${activity.tone}`)}><activity.icon size={16} /></div><div className="activity-copy"><strong>{activity.title}</strong><span>{activity.detail}</span></div><time>{activity.time}</time></div>) : <div className="empty-inline">Nenhuma atividade registrada ainda.</div>}</div></section><section className="panel consolidated-panel"><div className="panel-heading"><div><h2>Indicadores consolidados</h2><p>Desempenho acumulado do clube.</p></div><MoreHorizontal size={18} className="muted-icon" /></div><div className="consolidated-grid"><div><span className="consolidated-icon"><Users size={16} /></span><strong>{totalEntries}</strong><small>Inscrições em torneios</small><em>—</em></div><div><span className="consolidated-icon"><Spade size={16} /></span><strong>0</strong><small>Mesas jogadas no mês</small><em>—</em></div><div><span className="consolidated-icon"><Trophy size={16} /></span><strong>{tournaments.length}</strong><small>Torneios cadastrados</small><em>—</em></div><div><span className="consolidated-icon"><CircleDollarSign size={16} /></span><strong>R$ 0</strong><small>Receita do mês</small><em>—</em></div></div></section></div>
  </>;
}

function DashboardView({ setView }: { setView: (view: ViewKey) => void }) {
  const [range, setRange] = useState("Mês atual");
  return <><PageIntro eyebrow="Indicadores de performance" title="Dashboard analítico" description="Acompanhe a saúde financeira e operacional do seu clube." action={() => setView("finance")} actionLabel="Exportar relatório" /><div className="filter-bar"><div className="filter-pills">{["Mês atual", "Mês anterior", "Últimos 30 dias"].map(item => <button key={item} className={cn(range === item && "filter-active")} onClick={() => setRange(item)}>{item}</button>)}</div><div className="date-filter"><CalendarDays size={15} /><span>01/11/2026 — 20/11/2026</span><ChevronDown size={14} /></div><Button className="apply-button">Aplicar</Button></div><div className="metrics-grid"><MetricCard label="Rake total" value="R$ 0,00" change="0%" detail="sem registros" icon={CircleDollarSign} tone="cyan" /><MetricCard label="Total de despesas" value="R$ 0,00" change="0%" detail="vs. período anterior" icon={ArrowDownRight} tone="orange" /><MetricCard label="Resultado líquido" value="R$ 0,00" change="0%" detail="margem de 0%" icon={BarChart3} tone="green" /><MetricCard label="Jogadores ativos" value="0" change="0%" detail="sem cadastros" icon={Users} tone="purple" /></div><div className="dashboard-grid"><section className="panel chart-panel"><div className="panel-heading"><div><h2>Rake gerado por dia</h2><p>Comparativo entre torneios e cash game.</p></div><div className="legend"><span><i className="legend-dot legend-cyan" />Cash Game</span><span><i className="legend-dot legend-purple" />Torneios</span></div></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}><defs><linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00A8C6" stopOpacity={0.32} /><stop offset="100%" stopColor="#00A8C6" stopOpacity={0.02} /></linearGradient><linearGradient id="tournamentGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C5CFC" stopOpacity={0.25} /><stop offset="100%" stopColor="#7C5CFC" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="#E7EDF3" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 11, fill: "#8190A5" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: "#8190A5" }} axisLine={false} tickLine={false} tickFormatter={value => `${value / 1000}k`} /><RechartsTooltip formatter={(value: number) => brl(value)} contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 10px 30px #071e3614" }} /><Area type="monotone" dataKey="cash" name="Cash Game" stroke="#00A8C6" strokeWidth={2.5} fill="url(#cashGradient)" /><Area type="monotone" dataKey="torneios" name="Torneios" stroke="#7C5CFC" strokeWidth={2.5} fill="url(#tournamentGradient)" /></AreaChart></ResponsiveContainer></div></section><RankingPanel title="Mais horas no Cash Game" icon={Clock3} items={[]} /><RankingPanel title="Mais entradas em torneios" icon={Trophy} items={[]} /></div></>;
}

function RankingPanel({ title, icon: Icon, items }: { title: string; icon: LucideIcon; items: string[][] }) {
  return <section className="panel ranking-panel"><div className="panel-heading"><div className="heading-with-icon"><Icon size={17} /><div><h2>{title}</h2><p>Período selecionado</p></div></div><MoreHorizontal size={18} className="muted-icon" /></div><div className="ranking-list">{items.map(([initials, name, primary, secondary, color], index) => <div className="ranking-row" key={name}><span className="rank-position">{String(index + 1).padStart(2, "0")}</span><Avatar initials={initials} color={color} size="sm" /><div className="rank-name"><strong>{name}</strong><small>ID CP-{String(2384 + index * 127).padStart(5, "0")}</small></div><div className="rank-values"><strong>{primary}</strong><small>{secondary}</small></div></div>)}</div><button className="panel-footer-link">Ver ranking completo <ArrowUpRight size={14} /></button></section>;
}

function FinanceView({ transactions, setTransactions, activities, setActivities }: { transactions: Transaction[]; setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>; activities: ActivityItem[]; setActivities: React.Dispatch<React.SetStateAction<ActivityItem[]>> }) {
  const [grouping, setGrouping] = useState("Mensal");
  const [modalOpen, setModalOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [type, setType] = useState<"Entrada" | "Saída">("Entrada");
  const [category, setCategory] = useState("Receitas");
  const entries = transactions.filter(item => item.type === "Entrada").reduce((sum, item) => sum + item.value, 0);
  const exits = transactions.filter(item => item.type === "Saída").reduce((sum, item) => sum + item.value, 0);
  const handleSubmit = (event: FormEvent) => { event.preventDefault(); const parsed = parseBrlInput(value); if (!description || !parsed) return; const icon = type === "Entrada" ? ArrowDownRight : ArrowUpRight; const tone = type === "Entrada" ? "green" : "red"; const next: Transaction = { id: `tx-${Date.now()}`, date: "20/11/2026", description, category, type, value: parsed, payment: "PIX", icon, tone }; setTransactions(current => [next, ...current]); setActivities(current => [{ id: `a-${Date.now()}`, title: `${type} de ${brl(parsed)} registrada`, detail: `Financeiro · ${description}`, time: "agora", tone: type === "Entrada" ? "green" : "cyan", icon }, ...current]); setDescription(""); setValue(""); setModalOpen(false); };
  return <><PageIntro eyebrow="Controle de caixa e performance" title="Gestão financeira" description="Entradas, saídas e resultado do clube em tempo real." action={() => setModalOpen(true)} actionLabel="Nova transação" /><div className="metrics-grid finance-metrics"><MetricCard label="Entradas" value={compactBrl(entries)} change="0%" detail="vs. período anterior" icon={ArrowDownRight} tone="green" /><MetricCard label="Saídas" value={compactBrl(exits)} change="0%" detail="vs. período anterior" icon={ArrowUpRight} tone="red" /><MetricCard label="Lucro" value={compactBrl(entries - exits)} change="0%" detail="margem de 0%" icon={BarChart3} tone="cyan" /><MetricCard label="Despesas" value={compactBrl(exits)} change="0%" detail="sem registros" icon={ReceiptText} tone="orange" /><MetricCard label="Caixa" value={compactBrl(entries - exits)} detail="saldo disponível" icon={Landmark} tone="purple" /></div><section className="panel finance-chart-panel"><div className="panel-heading"><div><h2>Evolução das entradas e saídas</h2><p>Visão consolidada dos últimos 7 meses.</p></div><div className="segmented-control">{["Mensal", "Semanal", "Diário"].map(item => <button key={item} className={grouping === item ? "segmented-active" : ""} onClick={() => setGrouping(item)}>{item}</button>)}</div></div><div className="chart-wrap finance-chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={cashChartData} margin={{ top: 12, right: 10, left: -20, bottom: 0 }}><defs><linearGradient id="entradaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#071E36" stopOpacity={0.2} /><stop offset="100%" stopColor="#071E36" stopOpacity={0.01} /></linearGradient><linearGradient id="saidaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00A8C6" stopOpacity={0.25} /><stop offset="100%" stopColor="#00A8C6" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid stroke="#E7EDF3" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 11, fill: "#8190A5" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: "#8190A5" }} axisLine={false} tickLine={false} tickFormatter={value => `${value / 1000}k`} /><RechartsTooltip formatter={(value: number) => brl(value)} contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} /><Area type="monotone" dataKey="entrada" name="Entradas" stroke="#071E36" strokeWidth={2.5} fill="url(#entradaGradient)" /><Area type="monotone" dataKey="saida" name="Saídas" stroke="#00A8C6" strokeWidth={2.5} fill="url(#saidaGradient)" /></AreaChart></ResponsiveContainer></div></section><section className="panel transactions-panel"><div className="panel-heading"><div><h2>Últimas transações</h2><p>Registros financeiros mais recentes.</p></div><button className="text-button" onClick={() => setModalOpen(true)}>+ Nova transação</button></div><div className="transaction-table"><div className="transaction-row transaction-head"><span>Data</span><span>Descrição</span><span>Categoria</span><span>Tipo</span><span>Valor</span><span>Pagamento</span><span /></div>{transactions.length ? transactions.slice(0, 6).map(transaction => <div className="transaction-row" key={transaction.id}><span className="table-date">{transaction.date}</span><span className="transaction-description"><IconTile icon={transaction.icon} tone={transaction.tone} /><strong>{transaction.description}</strong></span><span><StatusBadge tone="neutral" dot={false}>{transaction.category}</StatusBadge></span><span><StatusBadge tone={transaction.type === "Entrada" ? "green" : "red"}>{transaction.type}</StatusBadge></span><strong className={transaction.type === "Entrada" ? "money-in" : "money-out"}>{transaction.type === "Entrada" ? "+" : "-"} {brl(transaction.value)}</strong><span className="payment-method"><CreditCard size={13} /> {transaction.payment}</span><button className="icon-button"><Ellipsis size={17} /></button></div>) : <div className="empty-inline">Nenhuma transação registrada.</div>}</div></section>{modalOpen && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setModalOpen(false); }}><form className="modal-card" onSubmit={handleSubmit}><div className="modal-heading"><div><div className="eyebrow">Lançamento manual</div><h2>Nova transação</h2><p>Registre uma entrada ou saída no caixa.</p></div><button type="button" className="icon-button" onClick={() => setModalOpen(false)}><X size={18} /></button></div><label>Descrição<input value={description} onChange={event => setDescription(event.target.value)} placeholder="Ex.: Rake Mesa 05" required /></label><div className="form-grid"><label>Valor (R$)<input value={value} onChange={event => setValue(event.target.value)} placeholder="0,00" inputMode="decimal" required /></label><label>Categoria<select value={category} onChange={event => setCategory(event.target.value)}><option>Receitas</option><option>Despesas</option><option>Torneios</option><option>Cash</option><option>Bar</option></select></label></div><label>Tipo<select value={type} onChange={event => setType(event.target.value as "Entrada" | "Saída")}><option>Entrada</option><option>Saída</option></select></label><div className="modal-actions"><Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button><Button type="submit" className="primary-button">Salvar transação</Button></div></form></div>}</>;
}

function TournamentsView({
  setView,
  tournaments,
  setTournaments,
  setActivities,
  setToast,
  selectedId,
  setSelectedId,
  initialTab = "resumo",
}: {
  setView: (view: ViewKey) => void;
  tournaments: Tournament[];
  setTournaments: React.Dispatch<React.SetStateAction<Tournament[]>>;
  setActivities: React.Dispatch<React.SetStateAction<ActivityItem[]>>;
  setToast: (message: string) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  initialTab?: "resumo" | "blinds" | "premiacao";
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"resumo" | "blinds" | "premiacao">(initialTab);

  // Formulário de criação de torneio
  const [name, setName] = useState("");
  const [date, setDate] = useState("20/11/2026");
  const [time, setTime] = useState("20:00");
  const [buyIn, setBuyIn] = useState("150,00");
  const [guaranteed, setGuaranteed] = useState("15.000,00");
  const [stack, setStack] = useState("25.000");
  const [blindMinutes, setBlindMinutes] = useState("20");
  const [capacity, setCapacity] = useState("80");
  const [status, setStatus] = useState<TournamentStatus>("Agendado");

  // Formulário de lançamento (Buy-in / Rebuy / Add-on)
  const [playerName, setPlayerName] = useState("");
  const [entryType, setEntryType] = useState<EntryType>("Buy-in");
  const [entryValue, setEntryValue] = useState("");
  const [entryPayment, setEntryPayment] = useState("PIX");

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const selectedTournament =
    tournaments.find(item => item.id === selectedId) ?? tournaments[0] ?? null;

  const statusTone = (st: TournamentStatus) =>
    st === "Em andamento" ? "green" : st === "Agendado" ? "cyan" : "neutral";

  const entryTypeTone = (type: EntryType) =>
    type === "Buy-in" ? "cyan" : type === "Rebuy" ? "orange" : "gold";

  const handleOpenEntryModal = () => {
    if (!selectedTournament) return;
    setPlayerName("");
    setEntryType("Buy-in");
    setEntryValue(selectedTournament.buyIn.toFixed(2).replace(".", ","));
    setEntryPayment("PIX");
    setEntryModalOpen(true);
  };

  const handleCreateTournament = (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const created: Tournament = {
      id: `trn-${Date.now()}`,
      name: trimmedName,
      date: date.trim() || "20/11/2026",
      time: time.trim() || "20:00",
      buyIn: parseBrlInput(buyIn),
      guaranteed: parseBrlInput(guaranteed),
      stack: stack.trim() || "25.000",
      blindMinutes: Math.max(5, Number(blindMinutes) || 20),
      status,
      entries: 0,
      capacity: Math.max(9, Number(capacity) || 80),
      registrations: [],
    };

    setTournaments(current => [created, ...current]);
    setSelectedId(created.id);
    setActivities(current => [
      {
        id: `act-${Date.now()}`,
        title: `Torneio "${created.name}" criado`,
        detail: `Buy-in ${brl(created.buyIn)} · GTD ${brl(created.guaranteed)}`,
        time: "agora",
        tone: "purple",
        icon: Trophy,
      },
      ...current,
    ]);
    setToast(`Torneio "${created.name}" criado com sucesso!`);
    setName("");
    setModalOpen(false);
  };

  const handleSubmitEntry = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTournament) return;
    const trimmedPlayer = playerName.trim();
    if (!trimmedPlayer) return;

    const parsedValue = parseBrlInput(entryValue);
    const now = new Date();
    const formattedTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    const newReg: TournamentRegistration = {
      id: `reg-${Date.now()}`,
      playerName: trimmedPlayer,
      entryType,
      value: parsedValue,
      payment: entryPayment,
      time: formattedTime,
    };

    setTournaments(current =>
      current.map(item => {
        if (item.id !== selectedTournament.id) return item;
        const currentRegs = item.registrations ?? [];
        const nextRegs = [newReg, ...currentRegs];
        const nextBuyIns = nextRegs.filter(r => r.entryType === "Buy-in").length;
        return {
          ...item,
          entries: nextBuyIns > 0 ? nextBuyIns : item.entries,
          registrations: nextRegs,
        };
      })
    );

    setActivities(current => [
      {
        id: `act-${Date.now()}`,
        title: `${entryType} de ${trimmedPlayer} (${brl(parsedValue)})`,
        detail: `${selectedTournament.name} · ${entryPayment}`,
        time: "agora",
        tone: entryType === "Buy-in" ? "cyan" : entryType === "Rebuy" ? "green" : "gold",
        icon: Users,
      },
      ...current,
    ]);

    setToast(`${entryType} registrado para ${trimmedPlayer}!`);
    setPlayerName("");
    setEntryModalOpen(false);
  };

  const handleDeleteRegistration = (tournamentId: string, regId: string) => {
    setTournaments(current =>
      current.map(item => {
        if (item.id !== tournamentId) return item;
        const nextRegs = (item.registrations ?? []).filter(r => r.id !== regId);
        const nextBuyIns = nextRegs.filter(r => r.entryType === "Buy-in").length;
        return {
          ...item,
          entries: nextBuyIns,
          registrations: nextRegs,
        };
      })
    );
    setToast("Lançamento removido.");
  };

  const handleToggleStatus = (id: string) => {
    setTournaments(current =>
      current.map(item => {
        if (item.id !== id) return item;
        const nextStatus: TournamentStatus =
          item.status === "Agendado"
            ? "Em andamento"
            : item.status === "Em andamento"
            ? "Finalizado"
            : "Agendado";
        setToast(`Status alterado para: ${nextStatus}`);
        return { ...item, status: nextStatus };
      })
    );
  };

  const handleRemoveTournament = (id: string) => {
    setTournaments(current => current.filter(item => item.id !== id));
    if (selectedId === id) setSelectedId(null);
    setToast("Torneio removido.");
  };

  const totals = selectedTournament ? getTournamentTotals(selectedTournament) : null;
  const collectedTotal = totals?.collectedTotal ?? 0;
  const effectivePrizePool = selectedTournament
    ? Math.max(selectedTournament.guaranteed, collectedTotal)
    : 0;

  return (
    <>
      <PageIntro
        eyebrow="Operação de eventos"
        title="Torneios"
        description="Acompanhe inscrições, premiações e andamento dos eventos."
        action={() => setModalOpen(true)}
        actionLabel="Novo torneio"
      />

      {tournaments.length === 0 ? (
        <section className="panel empty-state">
          <div className="empty-orbit">
            <Trophy size={28} />
          </div>
          <h2>Nenhum torneio cadastrado</h2>
          <p>Crie o primeiro evento do clube para gerenciar inscrições, premiações e o relógio de blinds.</p>
          <div className="empty-actions">
            <Button className="primary-button" onClick={() => setModalOpen(true)}>
              <Plus size={15} /> Criar primeiro torneio
            </Button>
          </div>
        </section>
      ) : (
        <div className="tournament-layout">
          <div className="tournament-list">
            {tournaments.map(item => {
              const itemTotals = getTournamentTotals(item);
              const pct = Math.min(100, Math.round((itemTotals.buyInsCount / item.capacity) * 100));
              const isSelected = selectedTournament?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn("tournament-card", isSelected && "tournament-selected")}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="tournament-card-top">
                    <StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge>
                    <span className="eyebrow">{item.date} · {item.time}</span>
                  </div>
                  <h3>{item.name}</h3>
                  <div className="tournament-meta">
                    <span><Users size={12} /> {itemTotals.buyInsCount}/{item.capacity} inscritos</span>
                    <span><Clock3 size={12} /> Blinds {item.blindMinutes}m</span>
                  </div>
                  <div className="mini-progress">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <div className="tournament-card-bottom">
                    <span>Buy-in: {brl(item.buyIn)}</span>
                    <strong>GTD {brl(item.guaranteed)}</strong>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedTournament && totals && (
            <section className="panel tournament-detail">
              <div className="detail-cover">
                <div className="detail-kicker">
                  <StatusBadge tone={statusTone(selectedTournament.status)}>
                    {selectedTournament.status}
                  </StatusBadge>
                  <span>{selectedTournament.date} ÀS {selectedTournament.time}</span>
                </div>
                <h2>{selectedTournament.name}</h2>
                <p>Stack inicial de {selectedTournament.stack} fichas · Níveis de {selectedTournament.blindMinutes} minutos</p>

                <div className="detail-stats">
                  <div>
                    <span>BUY-IN</span>
                    <strong>{brl(selectedTournament.buyIn)}</strong>
                    <small>Entrada principal</small>
                  </div>
                  <div>
                    <span>GARANTIDO</span>
                    <strong>{brl(selectedTournament.guaranteed)}</strong>
                    <small>Arrecadado: {brl(collectedTotal)}</small>
                  </div>
                  <div>
                    <span>INSCRITOS</span>
                    <strong>{totals.buyInsCount} / {selectedTournament.capacity}</strong>
                    <small>
                      {totals.buyInsCount} buy-ins · {totals.rebuysCount} rebuys · {totals.addonsCount} add-ons
                    </small>
                  </div>
                </div>
              </div>

              <div className="detail-actions">
                <Button className="primary-button" onClick={handleOpenEntryModal}>
                  <Plus size={14} /> Registrar entrada
                </Button>
                <Button variant="outline" onClick={() => handleToggleStatus(selectedTournament.id)}>
                  {selectedTournament.status === "Em andamento" ? <Pause size={14} /> : <Play size={14} />}
                  Alterar status
                </Button>
                <Button variant="outline" onClick={() => setView("tv-clock")}>
                  <MonitorPlay size={14} /> Clocker (Modo TV)
                </Button>
                <Button variant="outline" onClick={() => setView("tv-draw")}>
                  <Tv2 size={14} /> Sorteio de Mesas
                </Button>
                <Button variant="outline" onClick={() => handleRemoveTournament(selectedTournament.id)}>
                  <X size={14} /> Excluir
                </Button>
              </div>

              <div className="detail-tabs">
                <span
                  role="button"
                  tabIndex={0}
                  style={{ cursor: "pointer" }}
                  className={activeTab === "resumo" ? "tab-active" : ""}
                  onClick={() => setActiveTab("resumo")}
                >
                  Resumo da operação ({totals.registrations.length})
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  style={{ cursor: "pointer" }}
                  className={activeTab === "blinds" ? "tab-active" : ""}
                  onClick={() => setActiveTab("blinds")}
                >
                  Estrutura de blinds
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  style={{ cursor: "pointer" }}
                  className={activeTab === "premiacao" ? "tab-active" : ""}
                  onClick={() => setActiveTab("premiacao")}
                >
                  Premiação
                </span>
              </div>

              {activeTab === "resumo" && (
                <div className="detail-feed">
                  <div>
                    <div className="feed-icon"><Trophy size={15} /></div>
                    <p>
                      <strong>Premiação total estimada em {brl(effectivePrizePool)}</strong>
                      <small>
                        Garantido: {brl(selectedTournament.guaranteed)} · Arrecadado: {brl(collectedTotal)} ({totals.buyInsCount} Buy-ins, {totals.rebuysCount} Rebuys, {totals.addonsCount} Add-ons)
                      </small>
                    </p>
                    <time>{selectedTournament.date}</time>
                  </div>

                  {totals.registrations.length === 0 ? (
                    <div>
                      <div className="feed-icon"><Users size={15} /></div>
                      <p>
                        <strong>Nenhuma entrada lançada individualmente ainda</strong>
                        <small>Clique em &quot;+ Registrar entrada&quot; para lançar o nome do jogador e escolher Buy-in, Rebuy ou Add-on.</small>
                      </p>
                      <time>{selectedTournament.time}</time>
                    </div>
                  ) : (
                    totals.registrations.map(reg => (
                      <div key={reg.id}>
                        <div className="feed-icon">
                          <Users size={15} />
                        </div>
                        <p>
                          <strong>
                            {reg.playerName}{" "}
                            <StatusBadge tone={entryTypeTone(reg.entryType)} dot={false}>
                              {reg.entryType}
                            </StatusBadge>
                          </strong>
                          <small>
                            Valor: {brl(reg.value)} · Pagamento: {reg.payment}
                          </small>
                        </p>
                        <time>{reg.time}</time>
                        <button
                          type="button"
                          className="icon-button"
                          title="Remover lançamento"
                          onClick={() => handleDeleteRegistration(selectedTournament.id, reg.id)}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "blinds" && (
                <div className="detail-feed">
                  {DEFAULT_BLIND_LEVELS.map(lvl => (
                    <div key={lvl.level}>
                      <div className="feed-icon"><Clock3 size={15} /></div>
                      <p>
                        <strong>Nível {String(lvl.level).padStart(2, "0")} — Blinds {lvl.sb} / {lvl.bb}</strong>
                        <small>Big Blind Ante: {lvl.ante} · Duração: {selectedTournament.blindMinutes} min</small>
                      </p>
                      <time>{(lvl.level - 1) * selectedTournament.blindMinutes} min</time>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "premiacao" && (
                <div className="detail-feed">
                  <div>
                    <div className="feed-icon feed-icon-gold"><Crown size={15} /></div>
                    <p>
                      <strong>1º Lugar (Campeão) — {brl(effectivePrizePool * 0.5)}</strong>
                      <small>50% do prize pool total ({brl(effectivePrizePool)})</small>
                    </p>
                    <time>50%</time>
                  </div>
                  <div>
                    <div className="feed-icon"><Trophy size={15} /></div>
                    <p>
                      <strong>2º Lugar (Vice-campeão) — {brl(effectivePrizePool * 0.3)}</strong>
                      <small>30% do prize pool total ({brl(effectivePrizePool)})</small>
                    </p>
                    <time>30%</time>
                  </div>
                  <div>
                    <div className="feed-icon"><Sparkles size={15} /></div>
                    <p>
                      <strong>3º Lugar — {brl(effectivePrizePool * 0.2)}</strong>
                      <small>20% do prize pool total ({brl(effectivePrizePool)})</small>
                    </p>
                    <time>20%</time>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {entryModalOpen && selectedTournament && (
        <div
          className="modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setEntryModalOpen(false);
          }}
        >
          <form className="modal-card" onSubmit={handleSubmitEntry}>
            <div className="modal-heading">
              <div>
                <div className="eyebrow">{selectedTournament.name}</div>
                <h2>Registrar entrada</h2>
                <p>Informe o nome do jogador e o tipo de lançamento.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setEntryModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <label>
              Nome do jogador
              <input
                value={playerName}
                onChange={event => setPlayerName(event.target.value)}
                placeholder="Ex.: Carlos Mendes"
                autoFocus
                required
              />
            </label>

            <div>
              <span className="eyebrow" style={{ display: "block", marginBottom: 8 }}>
                Tipo de lançamento
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {(["Buy-in", "Rebuy", "Add-on"] as EntryType[]).map(option => {
                  const selected = entryType === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setEntryType(option)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: selected ? "2px solid #00A8C6" : "1px solid #D8E1EB",
                        background: selected ? "#00A8C614" : "#FFFFFF",
                        color: selected ? "#071E36" : "#4A596D",
                        fontWeight: selected ? 700 : 500,
                        cursor: "pointer",
                        textAlign: "center",
                      }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-grid">
              <label>
                Valor (R$)
                <input
                  value={entryValue}
                  onChange={event => setEntryValue(event.target.value)}
                  placeholder="30,00"
                  inputMode="decimal"
                  required
                />
              </label>
              <label>
                Forma de pagamento
                <select
                  value={entryPayment}
                  onChange={event => setEntryPayment(event.target.value)}
                >
                  <option value="PIX">PIX</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão">Cartão</option>
                  <option value="Conta do Clube">Conta do Clube</option>
                </select>
              </label>
            </div>

            <div className="modal-actions">
              <Button type="button" variant="outline" onClick={() => setEntryModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="primary-button">
                Confirmar {entryType}
              </Button>
            </div>
          </form>
        </div>
      )}

      {modalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
        >
          <form className="modal-card" onSubmit={handleCreateTournament}>
            <div className="modal-heading">
              <div>
                <div className="eyebrow">Operação de eventos</div>
                <h2>Criar novo torneio</h2>
                <p>Configure os dados principais do evento para abrir inscrições.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <label>
              Nome do torneio
              <input
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="Ex.: Main Event Sexta 15K GTD"
                required
              />
            </label>

            <div className="form-grid">
              <label>
                Data
                <input
                  value={date}
                  onChange={event => setDate(event.target.value)}
                  placeholder="DD/MM/AAAA"
                  required
                />
              </label>
              <label>
                Horário
                <input
                  value={time}
                  onChange={event => setTime(event.target.value)}
                  placeholder="20:00"
                  required
                />
              </label>
            </div>

            <div className="form-grid">
              <label>
                Buy-in (R$)
                <input
                  value={buyIn}
                  onChange={event => setBuyIn(event.target.value)}
                  placeholder="150,00"
                  inputMode="decimal"
                  required
                />
              </label>
              <label>
                Garantido GTD (R$)
                <input
                  value={guaranteed}
                  onChange={event => setGuaranteed(event.target.value)}
                  placeholder="15.000,00"
                  inputMode="decimal"
                  required
                />
              </label>
            </div>

            <div className="form-grid">
              <label>
                Stack inicial
                <input
                  value={stack}
                  onChange={event => setStack(event.target.value)}
                  placeholder="25.000"
                  required
                />
              </label>
              <label>
                Blinds (minutos)
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={blindMinutes}
                  onChange={event => setBlindMinutes(event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="form-grid">
              <label>
                Capacidade máxima
                <input
                  type="number"
                  min={9}
                  max={1000}
                  value={capacity}
                  onChange={event => setCapacity(event.target.value)}
                  required
                />
              </label>
              <label>
                Status inicial
                <select
                  value={status}
                  onChange={event => setStatus(event.target.value as TournamentStatus)}
                >
                  <option value="Agendado">Agendado</option>
                  <option value="Em andamento">Em andamento</option>
                  <option value="Finalizado">Finalizado</option>
                </select>
              </label>
            </div>

            <div className="modal-actions">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="primary-button">
                Salvar torneio
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function CashView({ setView }: { setView: (view: ViewKey) => void }) {
  return <><PageIntro eyebrow="Mesas e sessões" title="Cash Game" description="Controle mesas abertas, jogadores sentados e rake recolhido." action={() => setView("finance")} actionLabel="Registrar rake" /><div className="metrics-grid"><MetricCard label="Mesas ativas" value="0" detail="nenhuma mesa aberta" icon={Spade} tone="cyan" /><MetricCard label="Jogadores agora" value="0" detail="sem jogadores sentados" icon={Users} tone="green" /><MetricCard label="Rake hoje" value="R$ 0,00" detail="sem registros" icon={CircleDollarSign} tone="purple" /><MetricCard label="Tempo médio" value="0h 00m" detail="sem sessões" icon={Clock3} tone="orange" /></div><section className="panel empty-state"><div className="empty-orbit"><Spade size={28} /></div><h2>Nenhuma mesa ativa</h2><p>Os dados de cash game foram limpos. Abra uma mesa para iniciar uma nova sessão.</p><div className="empty-actions"><Button className="primary-button" onClick={() => setView("overview")}><Plus size={15} /> Abrir primeira mesa</Button></div></section></>;
}

function SimpleModule({ view, setView }: { view: ViewKey; setView: (view: ViewKey) => void }) {
  const config: Record<string, { eyebrow: string; title: string; description: string; icon: LucideIcon; accent: string; stats: [string, string, string][] }> = {
    bar: { eyebrow: "PDV e consumo", title: "Bar / Consumo", description: "Lance consumos na conta do jogador ou feche pagamentos na hora.", icon: Coffee, accent: "orange", stats: [["Comandas abertas", "0", "sem registros"], ["Consumo hoje", "R$ 0,00", "sem registros"], ["Ticket médio", "R$ 0,00", "sem registros"]] },
    members: { eyebrow: "Base de jogadores", title: "Membros / Jogadores", description: "Cadastro, saldo em conta e histórico de todos os jogadores do clube.", icon: Users, accent: "purple", stats: [["Jogadores cadastrados", "0", "base vazia"], ["Ativos hoje", "0", "sem registros"], ["Saldo em contas", "R$ 0,00", "sem registros"]] },
    ranking: { eyebrow: "Performance e fidelidade", title: "Ranking", description: "Pontos, horas jogadas e posições atualizadas em tempo real.", icon: Crown, accent: "gold", stats: [["Jogadores ranqueados", "0", "base vazia"], ["Pontos distribuídos", "0", "sem registros"], ["Líder atual", "—", "sem registros"]] },
    jackpot: { eyebrow: "Fidelidade e premiação", title: "Jackpot", description: "Acompanhe o progressivo do clube e os próximos níveis de premiação.", icon: Sparkles, accent: "gold", stats: [["Jackpot atual", "R$ 0,00", "sem registros"], ["Próximo nível", "R$ 0,00", "sem registros"], ["Contribuição hoje", "R$ 0,00", "sem registros"]] },
    settings: { eyebrow: "Administração", title: "Configurações", description: "Ajuste unidades, permissões, integrações e preferências do clube.", icon: Settings2, accent: "cyan", stats: [["Unidades", "0", "sem registros"], ["Usuários admin", "0", "sem registros"], ["Último backup", "—", "sem registros"]] },
  };
  const current = config[view] ?? config.members;
  const Icon = current.icon;
  return <><PageIntro eyebrow={current.eyebrow} title={current.title} description={current.description} action={() => setView("overview")} actionLabel="Voltar para visão geral" /><div className="simple-hero"><div className={cn("simple-hero-icon", `icon-${current.accent}`)}><Icon size={30} /></div><div><StatusBadge tone={current.accent === "orange" ? "orange" : current.accent === "gold" ? "gold" : "cyan"}>Módulo conectado</StatusBadge><h2>Dados limpos</h2><p>Este módulo está pronto para receber novos registros. Nenhum dado anterior permanece gravado.</p></div><div className="simple-hero-action"><Button className="primary-button" onClick={() => setView("overview")}>Ver visão geral <ArrowUpRight size={15} /></Button></div></div><div className="simple-stats">{current.stats.map(([label, value, detail]) => <div className="panel simple-stat" key={label}><span className="eyebrow">{label}</span><strong>{value}</strong><small>{detail}</small></div>)}</div><section className="panel empty-state"><div className="empty-orbit"><Icon size={28} /></div><h2>Nenhum registro encontrado</h2><p>O módulo foi limpo e está pronto para uma nova operação.</p><div className="empty-actions"><Button className="primary-button" onClick={() => setView("overview")}><Grid2X2 size={15} /> Voltar ao hub</Button></div></section></>;
}

function TvView({ mode, setView, tournament }: { mode: "clock" | "draw"; setView: (view: ViewKey) => void; tournament: Tournament | null }) {
  const [levelIndex, setLevelIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState((tournament?.blindMinutes ?? 15) * 60);
  const [running, setRunning] = useState(false);
  const [seats, setSeats] = useState<string[]>(Array(8).fill(""));
  const [revealed, setRevealed] = useState(false);

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
        setLevelIndex(idx => Math.min(DEFAULT_BLIND_LEVELS.length - 1, idx + 1));
        return (tournament?.blindMinutes ?? 15) * 60;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, mode, tournament?.blindMinutes]);

  if (!tournament) {
    return (
      <div className="tv-screen">
        <div className="tv-topbar">
          <button className="tv-brand" onClick={() => setView("overview")}>
            <LogoMark />
            <span className="tv-brand-separator" />
            <span className="tv-event-label">MODO TV <small>SEM EVENTO SELECIONADO</small></span>
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

  const totals = getTournamentTotals(tournament);

  if (mode === "clock") {
    const currentLevel = DEFAULT_BLIND_LEVELS[levelIndex] ?? DEFAULT_BLIND_LEVELS[0];
    const nextLevel = DEFAULT_BLIND_LEVELS[levelIndex + 1] ?? null;
    const prizePool = Math.max(tournament.guaranteed, totals.collectedTotal);
    const numericStack = Number(tournament.stack.replace(/\D/g, "")) || 10000;
    const avgStack = totals.buyInsCount > 0 ? numericStack.toLocaleString("pt-BR") : tournament.stack;

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
              <span>INSCRITOS</span>
              <strong>{totals.buyInsCount} <small>/ {tournament.capacity}</small></strong>
            </div>
            <div className="tv-stat-block">
              <span>STACK MÉDIO</span>
              <strong>{avgStack}</strong>
            </div>
          </div>

          <div className="clock-center">
            <div className="clock-kicker">
              <span className="neon-line" />
              <span>NÍVEL {currentLevel.level} DE {DEFAULT_BLIND_LEVELS.length}</span>
              <span className="neon-line" />
            </div>
            <div className="clock-time">{formatTime(secondsLeft)}</div>
            <div className="clock-blinds">
              <strong>{currentLevel.sb} / {currentLevel.bb}</strong>
              <span>BIG BLIND ANTE {currentLevel.ante}</span>
            </div>
            <div className="next-level">
              <span>PRÓXIMO NÍVEL:</span>
              <b>{nextLevel ? `${nextLevel.sb} / ${nextLevel.bb}` : "NÍVEL FINAL"}</b>
              <small>{nextLevel ? `(Ante ${nextLevel.ante})` : ""}</small>
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
              <span>GARANTIDO</span>
              <strong>{brl(tournament.guaranteed)}</strong>
            </div>
            <div className="tv-stat-block">
              <span>TEMPO NÍVEL</span>
              <strong>{tournament.blindMinutes} <small>min</small></strong>
            </div>
          </div>

          <div className="clock-footer">
            <div><span>ENTRADA</span><strong>{brl(tournament.buyIn)}</strong></div>
            <div><span>STACK INICIAL</span><strong>{tournament.stack}</strong></div>
            <div><span>ARRECADADO</span><strong>{brl(totals.collectedTotal)}</strong></div>
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
                  setLevelIndex(i => Math.min(DEFAULT_BLIND_LEVELS.length - 1, i + 1));
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
    const buyInPlayers = totals.registrations
      .filter(r => r.entryType === "Buy-in")
      .map(r => r.playerName);
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
        <button className="tv-brand" onClick={() => setView("tournaments")}>
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
          <p>{tournament.name} · {totals.buyInsCount} inscritos confirmados</p>
        </div>

        <div className="poker-table-large">
          <div className="table-label">
            <span>MESA</span>
            <strong>01</strong>
          </div>
          {seats.map((playerName, idx) => (
            <div
              key={idx}
              className={cn(
                "large-seat",
                `large-seat-${idx + 1}`,
                revealed && playerName && "seat-revealed"
              )}
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

export default function Home() {
  const [view, setView] = useState<ViewKey>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);
  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    try {
      const saved = localStorage.getItem(TOURNAMENTS_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as Tournament[]) : [];
    } catch {
      return [];
    }
  });
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(tournaments));
    } catch {
      // ignore storage errors
    }
  }, [tournaments]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const activeTournament =
    tournaments.find(item => item.id === selectedTournamentId) ?? tournaments[0] ?? null;

  const content = useMemo(() => {
    if (view === "overview") return <OverviewView setView={setView} activities={activities} tournaments={tournaments} />;
    if (view === "dashboard") return <DashboardView setView={setView} />;
    if (view === "finance") return <FinanceView transactions={transactions} setTransactions={setTransactions} activities={activities} setActivities={setActivities} />;
    if (view === "tournaments" || view === "satellites" || view === "blinds") {
      return (
        <TournamentsView
          setView={setView}
          tournaments={tournaments}
          setTournaments={setTournaments}
          setActivities={setActivities}
          setToast={setToast}
          selectedId={selectedTournamentId}
          setSelectedId={setSelectedTournamentId}
          initialTab={view === "blinds" ? "blinds" : "resumo"}
        />
      );
    }
    if (view === "cash") return <CashView setView={setView} />;
    if (view === "tv-clock") return <TvView mode="clock" setView={setView} tournament={activeTournament} />;
    if (view === "tv-draw") return <TvView mode="draw" setView={setView} tournament={activeTournament} />;
    return <SimpleModule view={view} setView={setView} />;
  }, [activeTournament, activities, selectedTournamentId, tournaments, transactions, view]);

  if (view === "tv-clock" || view === "tv-draw") return content;
  const navigate = (nextView: ViewKey) => { setView(nextView); setMobileOpen(false); };
  return <div className="app-shell"><Sidebar view={view} setView={navigate} collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} /><div className="main-shell"><Topbar view={view} onMenu={() => setMobileOpen(true)} onNotify={() => setToast("Você está em dia: nenhuma nova notificação.")} /><main className="content-area">{content}</main></div>{toast && <div className="toast"><span className="toast-check">✓</span>{toast}</div>}</div>;
}