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
  RotateCcw,
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
  chips?: string;
  payment: string;
  time: string;
};

type BlindLevel = {
  level: number;
  sb: number;
  bb: number;
  ante?: number;
};

type TournamentRulesConfig = {
  buyInValue: number;
  buyInChips: string;
  buyInBbNote: string;
  rebuyValue: number;
  rebuyChips: string;
  addonValue: number;
  addonChips: string;
  addonBbNote: string;
};

type Tournament = {
  id: string;
  name: string;
  date: string;
  time: string;
  buyIn: number;
  rebuyValue?: number;
  addonValue?: number;
  guaranteed: number;
  stack: string;
  blindMinutes: number;
  status: TournamentStatus;
  entries: number;
  capacity: number;
  registrations?: TournamentRegistration[];
};

const DEFAULT_BLIND_LEVELS: BlindLevel[] = [
  { level: 1, sb: 50, bb: 100 },
  { level: 2, sb: 100, bb: 150 },
  { level: 3, sb: 150, bb: 200 },
  { level: 4, sb: 200, bb: 250 },
  { level: 5, sb: 250, bb: 300 },
  { level: 6, sb: 300, bb: 400 },
  { level: 7, sb: 400, bb: 500 },
  { level: 8, sb: 500, bb: 600 },
  { level: 9, sb: 600, bb: 700 },
  { level: 10, sb: 700, bb: 800 },
  { level: 11, sb: 800, bb: 900 },
  { level: 12, sb: 900, bb: 1000 },
  { level: 13, sb: 1000, bb: 1100 },
  { level: 14, sb: 1100, bb: 1200 },
  { level: 15, sb: 1200, bb: 1300 },
  { level: 16, sb: 1300, bb: 1400 },
  { level: 17, sb: 1400, bb: 1500 },
  { level: 18, sb: 1500, bb: 1600 },
  { level: 19, sb: 1600, bb: 1700 },
  { level: 20, sb: 1700, bb: 1800 },
];

const DEFAULT_TOURNAMENT_RULES: TournamentRulesConfig = {
  buyInValue: 30,
  buyInChips: "15.000",
  buyInBbNote: "150bb",
  rebuyValue: 30,
  rebuyChips: "15.000",
  addonValue: 40,
  addonChips: "20.000",
  addonBbNote: "33,33bb",
};

const TOURNAMENTS_STORAGE_KEY = "controlpoker_tournaments_v1";
const BLINDS_STORAGE_KEY = "controlpoker_blinds_v1";
const RULES_STORAGE_KEY = "controlpoker_rules_v1";

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

function BlindsStructureView({
  blindLevels,
  setBlindLevels,
  rules,
  setRules,
  setView,
  setToast,
}: {
  blindLevels: BlindLevel[];
  setBlindLevels: React.Dispatch<React.SetStateAction<BlindLevel[]>>;
  rules: TournamentRulesConfig;
  setRules: React.Dispatch<React.SetStateAction<TournamentRulesConfig>>;
  setView: (view: ViewKey) => void;
  setToast: (message: string) => void;
}) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [newSb, setNewSb] = useState("1800");
  const [newBb, setNewBb] = useState("2000");

  const [buyInVal, setBuyInVal] = useState(rules.buyInValue.toFixed(2).replace(".", ","));
  const [buyInChips, setBuyInChips] = useState(rules.buyInChips);
  const [rebuyVal, setRebuyVal] = useState(rules.rebuyValue.toFixed(2).replace(".", ","));
  const [rebuyChips, setRebuyChips] = useState(rules.rebuyChips);
  const [addonVal, setAddonVal] = useState(rules.addonValue.toFixed(2).replace(".", ","));
  const [addonChips, setAddonChips] = useState(rules.addonChips);

  useEffect(() => {
    setBuyInVal(rules.buyInValue.toFixed(2).replace(".", ","));
    setBuyInChips(rules.buyInChips);
    setRebuyVal(rules.rebuyValue.toFixed(2).replace(".", ","));
    setRebuyChips(rules.rebuyChips);
    setAddonVal(rules.addonValue.toFixed(2).replace(".", ","));
    setAddonChips(rules.addonChips);
  }, [rules]);

  const half = Math.ceil(blindLevels.length / 2);
  const leftColumn = blindLevels.slice(0, half);
  const rightColumn = blindLevels.slice(half);

  const handleAddLevel = (event: FormEvent) => {
    event.preventDefault();
    const sb = Math.max(1, Number(newSb) || 0);
    const bb = Math.max(1, Number(newBb) || 0);
    const nextLevelNumber = blindLevels.length + 1;
    setBlindLevels(current => [...current, { level: nextLevelNumber, sb, bb }]);
    setToast(`Nível ${nextLevelNumber} (${sb}/${bb}) adicionado!`);
    setEditModalOpen(false);
  };

  const handleSaveRules = (event: FormEvent) => {
    event.preventDefault();
    setRules({
      ...rules,
      buyInValue: parseBrlInput(buyInVal),
      buyInChips: buyInChips.trim() || "15.000",
      rebuyValue: parseBrlInput(rebuyVal),
      rebuyChips: rebuyChips.trim() || "15.000",
      addonValue: parseBrlInput(addonVal),
      addonChips: addonChips.trim() || "20.000",
    });
    setToast("Valores de Buy-in, Rebuy e Add-on atualizados!");
  };

  const handleResetDefault = () => {
    setBlindLevels(DEFAULT_BLIND_LEVELS);
    setRules(DEFAULT_TOURNAMENT_RULES);
    setToast("Estrutura padrão oficial (20 níveis) restaurada!");
  };

  return (
    <>
      <PageIntro
        eyebrow="Configuração oficial de torneios"
        title="Estruturas de Blinds"
        description="Tabela oficial de blinds (Nível 1 ao 20) e valores de Buy-in, Rebuy e Add-on."
        action={() => setEditModalOpen(true)}
        actionLabel="Adicionar nível"
      />

      <div className="metrics-grid">
        <MetricCard
          label="Buy-in"
          value={brl(rules.buyInValue)}
          detail={`${rules.buyInChips} fichas (${rules.buyInBbNote})`}
          icon={CircleDollarSign}
          tone="cyan"
        />
        <MetricCard
          label="Rebuy"
          value={brl(rules.rebuyValue)}
          detail={`${rules.rebuyChips} fichas`}
          icon={Zap}
          tone="orange"
        />
        <MetricCard
          label="Add-on"
          value={brl(rules.addonValue)}
          detail={`${rules.addonChips} fichas (${rules.addonBbNote})`}
          icon={Sparkles}
          tone="gold"
        />
        <MetricCard
          label="Estrutura ativa"
          value={`${blindLevels.length} níveis`}
          detail={`${blindLevels[0]?.sb ?? 50}/${blindLevels[0]?.bb ?? 100} até ${blindLevels[blindLevels.length - 1]?.sb ?? 1700}/${blindLevels[blindLevels.length - 1]?.bb ?? 1800}`}
          icon={Clock3}
          tone="purple"
        />
      </div>

      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-heading">
          <div>
            <h2>Blinds ({blindLevels.length} Níveis)</h2>
            <p>Esta estrutura é aplicada automaticamente nos torneios e no Clocker (Modo TV).</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button type="button" variant="outline" onClick={handleResetDefault}>
              <RotateCcw size={14} /> Restaurar padrão
            </Button>
            <Button type="button" className="primary-button" onClick={() => setView("tournaments")}>
              <Trophy size={14} /> Ir para Torneios
            </Button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 16,
            marginTop: 12,
          }}
        >
          {[leftColumn, rightColumn].map((col, colIdx) => (
            <div
              key={colIdx}
              style={{
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                overflow: "hidden",
                background: "#FFFFFF",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  padding: "10px 16px",
                  background: "#F8FAFC",
                  borderBottom: "1px solid #E2E8F0",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#64748B",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                <span>Nível</span>
                <span style={{ textAlign: "right" }}>Small / Big Blind</span>
              </div>

              {col.map((lvl, idx) => (
                <div
                  key={lvl.level}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    alignItems: "center",
                    padding: "11px 16px",
                    borderBottom: idx === col.length - 1 ? "none" : "1px solid #F1F5F9",
                    fontSize: 14,
                  }}
                >
                  <span style={{ fontWeight: 600, color: "#0F172A" }}>
                    Nível {lvl.level}:
                  </span>
                  <strong
                    style={{
                      textAlign: "right",
                      color: "#00A8C6",
                      fontVariantNumeric: "tabular-nums",
                      fontSize: 15,
                    }}
                  >
                    {lvl.sb}/{lvl.bb}
                  </strong>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Valores e Fichas do Torneio</h2>
            <p>Configuração padrão aplicada ao abrir lançamentos de Buy-in, Rebuy e Add-on.</p>
          </div>
          <StatusBadge tone="cyan">Configurado</StatusBadge>
        </div>

        <form onSubmit={handleSaveRules} style={{ display: "grid", gap: 14, marginTop: 12 }}>
          <div className="form-grid">
            <label>
              Valor Buy-in (R$)
              <input
                value={buyInVal}
                onChange={e => setBuyInVal(e.target.value)}
                inputMode="decimal"
                required
              />
            </label>
            <label>
              Fichas Buy-in
              <input
                value={buyInChips}
                onChange={e => setBuyInChips(e.target.value)}
                placeholder="15.000"
                required
              />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Valor Rebuy (R$)
              <input
                value={rebuyVal}
                onChange={e => setRebuyVal(e.target.value)}
                inputMode="decimal"
                required
              />
            </label>
            <label>
              Fichas Rebuy
              <input
                value={rebuyChips}
                onChange={e => setRebuyChips(e.target.value)}
                placeholder="15.000"
                required
              />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Valor Add-on (R$)
              <input
                value={addonVal}
                onChange={e => setAddonVal(e.target.value)}
                inputMode="decimal"
                required
              />
            </label>
            <label>
              Fichas Add-on
              <input
                value={addonChips}
                onChange={e => setAddonChips(e.target.value)}
                placeholder="20.000"
                required
              />
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button type="submit" className="primary-button">
              Salvar valores e fichas
            </Button>
          </div>
        </form>
      </section>

      {editModalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setEditModalOpen(false);
          }}
        >
          <form className="modal-card" onSubmit={handleAddLevel}>
            <div className="modal-heading">
              <div>
                <div className="eyebrow">Nível {blindLevels.length + 1}</div>
                <h2>Adicionar nível de blind</h2>
                <p>Informe os valores de Small Blind e Big Blind.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setEditModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="form-grid">
              <label>
                Small Blind
                <input
                  type="number"
                  min={1}
                  value={newSb}
                  onChange={e => setNewSb(e.target.value)}
                  required
                />
              </label>
              <label>
                Big Blind
                <input
                  type="number"
                  min={1}
                  value={newBb}
                  onChange={e => setNewBb(e.target.value)}
                  required
                />
              </label>
            </div>

            <div className="modal-actions">
              <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="primary-button">
                Adicionar nível
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function TournamentsView({
  setView,
  tournaments,
  setTournaments,
  setActivities,
  setToast,
  selectedId,
  setSelectedId,
  blindLevels,
  rules,
  initialTab = "resumo",
}: {
  setView: (view: ViewKey) => void;
  tournaments: Tournament[];
  setTournaments: React.Dispatch<React.SetStateAction<Tournament[]>>;
  setActivities: React.Dispatch<React.SetStateAction<ActivityItem[]>>;
  setToast: (message: string) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  blindLevels: BlindLevel[];
  rules: TournamentRulesConfig;
  initialTab?: "resumo" | "blinds" | "premiacao";
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"resumo" | "blinds" | "premiacao">(initialTab);

  // Formulário de criação de torneio (pré-preenchido com R$ 30,00 e 15.000 fichas)
  const [name, setName] = useState("");
  const [date, setDate] = useState("20/11/2026");
  const [time, setTime] = useState("20:00");
  const [buyIn, setBuyIn] = useState(rules.buyInValue.toFixed(2).replace(".", ","));
  const [guaranteed, setGuaranteed] = useState("0,00");
  const [stack, setStack] = useState(rules.buyInChips);
  const [blindMinutes, setBlindMinutes] = useState("15");
  const [capacity, setCapacity] = useState("30");
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

  const getDefaultValueForEntry = (type: EntryType, trn: Tournament) => {
    if (type === "Buy-in") return trn.buyIn || rules.buyInValue;
    if (type === "Rebuy") return trn.rebuyValue ?? rules.rebuyValue;
    return trn.addonValue ?? rules.addonValue;
  };

  const getChipsForEntry = (type: EntryType, trn: Tournament) => {
    if (type === "Buy-in") return trn.stack || rules.buyInChips;
    if (type === "Rebuy") return rules.rebuyChips;
    return rules.addonChips;
  };

  const handleOpenEntryModal = () => {
    if (!selectedTournament) return;
    setPlayerName("");
    setEntryType("Buy-in");
    const defaultVal = getDefaultValueForEntry("Buy-in", selectedTournament);
    setEntryValue(defaultVal.toFixed(2).replace(".", ","));
    setEntryPayment("PIX");
    setEntryModalOpen(true);
  };

  const handleSelectEntryType = (option: EntryType) => {
    setEntryType(option);
    if (selectedTournament) {
      const val = getDefaultValueForEntry(option, selectedTournament);
      setEntryValue(val.toFixed(2).replace(".", ","));
    }
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
      rebuyValue: rules.rebuyValue,
      addonValue: rules.addonValue,
      guaranteed: parseBrlInput(guaranteed),
      stack: stack.trim() || rules.buyInChips,
      blindMinutes: Math.max(5, Number(blindMinutes) || 15),
      status,
      entries: 0,
      capacity: Math.max(9, Number(capacity) || 30),
      registrations: [],
    };

    setTournaments(current => [created, ...current]);
    setSelectedId(created.id);
    setActivities(current => [
      {
        id: `act-${Date.now()}`,
        title: `Torneio "${created.name}" criado`,
        detail: `Buy-in ${brl(created.buyIn)} · Stack ${created.stack}`,
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
    const chipsLabel = getChipsForEntry(entryType, selectedTournament);
    const now = new Date();
    const formattedTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    const newReg: TournamentRegistration = {
      id: `reg-${Date.now()}`,
      playerName: trimmedPlayer,
      entryType,
      value: parsedValue,
      chips: chipsLabel,
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
        detail: `${selectedTournament.name} · ${chipsLabel} fichas · ${entryPayment}`,
        time: "agora",
        tone: entryType === "Buy-in" ? "cyan" : entryType === "Rebuy" ? "green" : "gold",
        icon: Users,
      },
      ...current,
    ]);

    setToast(`${entryType} (${chipsLabel} fichas) registrado para ${trimmedPlayer}!`);
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
                <p>
                  Buy-in {brl(selectedTournament.buyIn)} ({rules.buyInChips} fichas) · Rebuy {brl(selectedTournament.rebuyValue ?? rules.rebuyValue)} ({rules.rebuyChips}) · Add-on {brl(selectedTournament.addonValue ?? rules.addonValue)} ({rules.addonChips})
                </p>

                <div className="detail-stats">
                  <div>
                    <span>BUY-IN / REBUY / ADD-ON</span>
                    <strong>{brl(selectedTournament.buyIn)}</strong>
                    <small>Rebuy {brl(rules.rebuyValue)} · Add-on {brl(rules.addonValue)}</small>
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
                  Estrutura de blinds ({blindLevels.length})
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
                            Valor: {brl(reg.value)} {reg.chips ? `· ${reg.chips} fichas` : ""} · Pagamento: {reg.payment}
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
                  {blindLevels.map(lvl => (
                    <div key={lvl.level}>
                      <div className="feed-icon"><Clock3 size={15} /></div>
                      <p>
                        <strong>Nível {lvl.level}: {lvl.sb} / {lvl.bb}</strong>
                        <small>Duração: {selectedTournament.blindMinutes} min</small>
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
                  const chipsHint = getChipsForEntry(option, selectedTournament);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleSelectEntryType(option)}
                      style={{
                        padding: "10px 8px",
                        borderRadius: 10,
                        border: selected ? "2px solid #00A8C6" : "1px solid #D8E1EB",
                        background: selected ? "#00A8C614" : "#FFFFFF",
                        color: selected ? "#071E36" : "#4A596D",
                        fontWeight: selected ? 700 : 500,
                        cursor: "pointer",
                        textAlign: "center",
                      }}
                    >
                      <div>{option}</div>
                      <small style={{ display: "block", fontSize: 11, opacity: 0.8 }}>
                        {chipsHint} fichas
                      </small>
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
                Confirmar {entryType} ({getChipsForEntry(entryType, selectedTournament)} fichas)
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
                placeholder="Ex.: Torneio Universitário"
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
                  placeholder="30,00"
                  inputMode="decimal"
                  required
                />
              </label>
              <label>
                Garantido GTD (R$)
                <input
                  value={guaranteed}
                  onChange={event => setGuaranteed(event.target.value)}
                  placeholder="0,00"
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
                  placeholder="15.000"
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

function TvView({
  mode,
  setView,
  tournament,
  blindLevels,
}: {
  mode: "clock" | "draw";
  setView: (view: ViewKey) => void;
  tournament: Tournament | null;
  blindLevels: BlindLevel[];
}) {
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
    const currentLevel = levels[levelIndex] ?? levels[0];
    const nextLevel = levels[levelIndex + 1] ?? null;
    const prizePool = Math.max(tournament.guaranteed, totals.collectedTotal);
    const numericStack = Number(tournament.stack.replace(/\D/g, "")) || 15000;
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
              <span>NÍVEL {currentLevel.level} DE {levels.length}</span>
              <span className="neon-line" />
            </div>
            <div className="clock-time">{formatTime(secondsLeft)}</div>
            <div className="clock-blinds">
              <strong>{currentLevel.sb} / {currentLevel.bb}</strong>
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
  const [blindLevels, setBlindLevels] = useState<BlindLevel[]>(() => {
    try {
      const saved = localStorage.getItem(BLINDS_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as BlindLevel[]) : DEFAULT_BLIND_LEVELS;
    } catch {
      return DEFAULT_BLIND_LEVELS;
    }
  });
  const [rules, setRules] = useState<TournamentRulesConfig>(() => {
    try {
      const saved = localStorage.getItem(RULES_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as TournamentRulesConfig) : DEFAULT_TOURNAMENT_RULES;
    } catch {
      return DEFAULT_TOURNAMENT_RULES;
    }
  });
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
    try {
      localStorage.setItem(BLINDS_STORAGE_KEY, JSON.stringify(blindLevels));
    } catch {
      // ignore storage errors
    }
  }, [blindLevels]);

  useEffect(() => {
    try {
      localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
    } catch {
      // ignore storage errors
    }
  }, [rules]);

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
    if (view === "blinds") {
      return (
        <BlindsStructureView
          blindLevels={blindLevels}
          setBlindLevels={setBlindLevels}
          rules={rules}
          setRules={setRules}
          setView={setView}
          setToast={setToast}
        />
      );
    }
    if (view === "tournaments" || view === "satellites") {
      return (
        <TournamentsView
          setView={setView}
          tournaments={tournaments}
          setTournaments={setTournaments}
          setActivities={setActivities}
          setToast={setToast}
          selectedId={selectedTournamentId}
          setSelectedId={setSelectedTournamentId}
          blindLevels={blindLevels}
          rules={rules}
          initialTab="resumo"
        />
      );
    }
    if (view === "cash") return <CashView setView={setView} />;
    if (view === "tv-clock") return <TvView mode="clock" setView={setView} tournament={activeTournament} blindLevels={blindLevels} />;
    if (view === "tv-draw") return <TvView mode="draw" setView={setView} tournament={activeTournament} blindLevels={blindLevels} />;
    return <SimpleModule view={view} setView={setView} />;
  }, [activeTournament, activities, blindLevels, rules, selectedTournamentId, tournaments, transactions, view]);

  if (view === "tv-clock" || view === "tv-draw") return content;
  const navigate = (nextView: ViewKey) => { setView(nextView); setMobileOpen(false); };
  return <div className="app-shell"><Sidebar view={view} setView={navigate} collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} /><div className="main-shell"><Topbar view={view} onMenu={() => setMobileOpen(true)} onNotify={() => setToast("Você está em dia: nenhuma nova notificação.")} /><main className="content-area">{content}</main></div>{toast && <div className="toast"><span className="toast-check">✓</span>{toast}</div>}</div>;
}