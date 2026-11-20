import {
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Coffee,
  Crown,
  FileBarChart,
  Grid2X2,
  LayoutDashboard,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Spade,
  Trophy,
  Tv2,
  Users,
  WalletCards,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { Avatar, LogoMark } from "@/components/club/SharedUI";
import { cn } from "@/lib/utils";
import type { ViewKey } from "@/types/club";

export const navGroups: {
  label: string;
  items: { id: ViewKey; label: string; icon: LucideIcon; badge?: string }[];
}[] = [
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

export function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const { view, setView } = useClub();

  const handleNavigate = (nextView: ViewKey) => {
    setView(nextView);
    onCloseMobile();
  };

  return (
    <aside className={cn("sidebar", collapsed && "sidebar-collapsed", mobileOpen && "sidebar-mobile-open")}>
      <div className="sidebar-top">
        <button className="sidebar-logo" onClick={() => handleNavigate("overview")}>
          <LogoMark compact={collapsed} />
        </button>
        <button className="collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label="Recolher menu">
          <Menu size={17} />
        </button>
      </div>

      <div className="quick-search">
        <Search size={15} />
        <span>Busca rápida</span>
        <kbd>ALT S</kbd>
      </div>

      <nav className="sidebar-nav">
        {navGroups.map(group => (
          <div className="nav-group" key={group.label}>
            <div className="nav-group-label">{group.label}</div>
            {group.items.map((item, index) => (
              <button
                key={`${item.label}-${index}`}
                type="button"
                className={cn("nav-item", view === item.id && "nav-item-active")}
                onClick={() => handleNavigate(item.id)}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={17} strokeWidth={view === item.id ? 2.4 : 1.8} />
                <span>{item.label}</span>
                {item.badge && <em>{item.badge}</em>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-status">
          <span className="pulse-dot" />
          <span>Sistema operacional</span>
          <ShieldCheck size={14} />
        </div>
        <button className="user-switcher">
          <Avatar initials="AD" color="#00D4FF" size="sm" />
          <span>
            <strong>PokerGestor</strong>
            <small>Admin · Unidade principal</small>
          </span>
          <ChevronDown size={15} />
        </button>
      </div>
    </aside>
  );
}
