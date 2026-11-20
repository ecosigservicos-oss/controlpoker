import { useState } from "react";
import { ClubProvider, useClub } from "@/context/ClubContext";
import { Sidebar } from "@/components/club/Sidebar";
import { Topbar } from "@/components/club/Topbar";
import { OverviewView } from "@/pages/views/OverviewView";
import { DashboardView } from "@/pages/views/DashboardView";
import { FinanceView } from "@/pages/views/FinanceView";
import { TournamentsView } from "@/pages/views/TournamentsView";
import { CashView } from "@/pages/views/CashView";
import { BarView } from "@/pages/views/BarView";
import { MembersView } from "@/pages/views/MembersView";
import { RankingView } from "@/pages/views/RankingView";
import { BlindsStructureView } from "@/pages/views/BlindsStructureView";
import { JackpotView } from "@/pages/views/JackpotView";
import { SettingsView } from "@/pages/views/SettingsView";
import { TvView } from "@/pages/views/TvView";

function AppShell() {
  const { view, toast } = useClub();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (view === "tv-clock") return <TvView mode="clock" />;
  if (view === "tv-draw") return <TvView mode="draw" />;

  const renderCurrentView = () => {
    switch (view) {
      case "overview":
        return <OverviewView />;
      case "dashboard":
        return <DashboardView />;
      case "finance":
        return <FinanceView />;
      case "tournaments":
      case "satellites":
        return <TournamentsView />;
      case "cash":
        return <CashView />;
      case "bar":
        return <BarView />;
      case "members":
        return <MembersView />;
      case "ranking":
        return <RankingView />;
      case "blinds":
        return <BlindsStructureView />;
      case "jackpot":
        return <JackpotView />;
      case "settings":
        return <SettingsView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="main-shell">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="content-area">{renderCurrentView()}</main>
      </div>
      {toast && (
        <div className="toast">
          <span className="toast-check">✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <ClubProvider>
      <AppShell />
    </ClubProvider>
  );
}
