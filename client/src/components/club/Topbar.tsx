import { useEffect, useRef, useState } from "react";
import { Bell, CalendarDays, ChevronDown, Menu, Search } from "lucide-react";
import { useClub } from "@/context/ClubContext";
import type { ViewKey } from "@/types/club";

const titleMap: Record<ViewKey, string> = {
  overview: "Visão Geral",
  dashboard: "Dashboard",
  finance: "Financeiro",
  tournaments: "Torneios",
  satellites: "Satélites",
  blinds: "Estruturas de Blinds",
  cash: "Cash Game",
  bar: "Bar / Consumo",
  members: "Membros / Jogadores",
  ranking: "Ranking",
  jackpot: "Jackpot",
  "tv-clock": "Clocker",
  "tv-draw": "Sorteio de Mesas",
  settings: "Configurações",
};

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { view, setToast } = useClub();
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="topbar">
      <button className="mobile-menu-button topbar-icon" onClick={onMenu} aria-label="Abrir menu">
        <Menu size={18} />
      </button>
      <div className="breadcrumb">
        <span>PokerGestor</span>
        <span>/</span>
        <strong>{titleMap[view]}</strong>
      </div>
      <div className="topbar-actions">
        {searchOpen ? (
          <div className="top-search">
            <Search size={15} />
            <input
              ref={searchRef}
              placeholder="Buscar jogador, torneio ou transação"
              onBlur={() => setSearchOpen(false)}
            />
            <kbd>ESC</kbd>
          </div>
        ) : (
          <button
            className="topbar-icon"
            onClick={() => {
              setSearchOpen(true);
              setTimeout(() => searchRef.current?.focus(), 50);
            }}
          >
            <Search size={17} />
          </button>
        )}
        <button
          className="topbar-icon notification-button"
          onClick={() => setToast("Você está em dia: nenhuma nova notificação.")}
        >
          <Bell size={17} />
          <span />
        </button>
        <div className="topbar-date">
          <CalendarDays size={15} />
          <span>20 Nov, 2026</span>
          <ChevronDown size={14} />
        </div>
      </div>
    </header>
  );
}
