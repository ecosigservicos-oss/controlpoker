import { useMemo, useState, type FormEvent } from "react";
import {
  Check,
  Clock3,
  Crown,
  MonitorPlay,
  Pause,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Trophy,
  Tv2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { brl, PageIntro, parseBrlInput, StatusBadge } from "@/components/club/SharedUI";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PAYOUT_TIERS,
  getTournamentTotals,
  type EntryType,
  type PayoutTier,
  type Tournament,
  type TournamentRegistration,
  type TournamentStatus,
} from "@/types/club";

const PAYOUT_PRESETS: { label: string; percentages: number[] }[] = [
  { label: "Top 2 (65/35)", percentages: [65, 35] },
  { label: "Top 3 (50/30/20)", percentages: [50, 30, 20] },
  { label: "Top 4 (45/27/18/10)", percentages: [45, 27, 18, 10] },
  { label: "Top 5 (40/25/17/10/8)", percentages: [40, 25, 17, 10, 8] },
];

function getDefaultPlaceLabel(place: number): string {
  if (place === 1) return "1º Lugar (Campeão)";
  if (place === 2) return "2º Lugar (Vice-campeão)";
  return `${place}º Lugar`;
}

export function TournamentsView() {
  const {
    setView,
    tournaments,
    setTournaments,
    setActivities,
    setToast,
    selectedTournamentId,
    setSelectedTournamentId,
    blindLevels,
    rules,
    savedPlayers,
    registerSavedPlayer,
  } = useClub();

  const [modalOpen, setModalOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"resumo" | "blinds" | "premiacao">("resumo");

  const [name, setName] = useState("");
  const [date, setDate] = useState("20/11/2026");
  const [time, setTime] = useState("20:00");
  const [buyIn, setBuyIn] = useState(rules.buyInValue.toFixed(2).replace(".", ","));
  const [guaranteed, setGuaranteed] = useState("0,00");
  const [stack, setStack] = useState(rules.buyInChips);
  const [blindMinutes, setBlindMinutes] = useState("15");
  const [capacity, setCapacity] = useState("30");
  const [status, setStatus] = useState<TournamentStatus>("Agendado");

  const [playerName, setPlayerName] = useState("");
  const [entryType, setEntryType] = useState<EntryType>("Buy-in");
  const [entryValue, setEntryValue] = useState("");
  const [entryPayment, setEntryPayment] = useState("PIX");
  const [manualNameMode, setManualNameMode] = useState(false);

  const [draftPayouts, setDraftPayouts] = useState<PayoutTier[]>(DEFAULT_PAYOUT_TIERS);
  const [draftGuaranteed, setDraftGuaranteed] = useState("0,00");

  const selectedTournament =
    tournaments.find(item => item.id === selectedTournamentId) ?? tournaments[0] ?? null;

  const buyInPlayers = useMemo(() => {
    if (!selectedTournament) return [];
    const seen = new Set<string>();
    const list: string[] = [];
    const chronological = [...(selectedTournament.registrations ?? [])].reverse();
    for (const reg of chronological) {
      if (reg.entryType === "Buy-in") {
        const clean = reg.playerName.trim();
        const key = clean.toLowerCase();
        if (clean && !seen.has(key)) {
          seen.add(key);
          list.push(clean);
        }
      }
    }
    return list;
  }, [selectedTournament]);

  const playerExtraCounts = useMemo(() => {
    const map = new Map<string, { rebuys: number; addons: number }>();
    if (!selectedTournament) return map;
    for (const reg of selectedTournament.registrations ?? []) {
      const key = reg.playerName.trim().toLowerCase();
      if (!key) continue;
      const current = map.get(key) ?? { rebuys: 0, addons: 0 };
      if (reg.entryType === "Rebuy") current.rebuys += 1;
      if (reg.entryType === "Add-on") current.addons += 1;
      map.set(key, current);
    }
    return map;
  }, [selectedTournament]);

  const availableClubPlayers = useMemo(() => {
    const inTournament = new Set(buyInPlayers.map(p => p.toLowerCase()));
    return savedPlayers.filter(p => !inTournament.has(p.toLowerCase()));
  }, [savedPlayers, buyInPlayers]);

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
    setManualNameMode(false);
    const defaultVal = getDefaultValueForEntry("Buy-in", selectedTournament);
    setEntryValue(defaultVal.toFixed(2).replace(".", ","));
    setEntryPayment("PIX");
    setEntryModalOpen(true);
  };

  const handleOpenPayoutModal = () => {
    if (!selectedTournament) return;
    const currentTiers =
      selectedTournament.payouts && selectedTournament.payouts.length > 0
        ? selectedTournament.payouts.map(t => ({ ...t }))
        : DEFAULT_PAYOUT_TIERS.map(t => ({ ...t }));
    setDraftPayouts(currentTiers);
    setDraftGuaranteed(selectedTournament.guaranteed.toFixed(2).replace(".", ","));
    setPayoutModalOpen(true);
  };

  const handleApplyPayoutPreset = (percentages: number[]) => {
    setDraftPayouts(
      percentages.map((pct, idx) => ({
        place: idx + 1,
        label: getDefaultPlaceLabel(idx + 1),
        percentage: pct,
      }))
    );
  };

  const handleAddPayoutTier = () => {
    const nextPlace = draftPayouts.length + 1;
    setDraftPayouts(current => [
      ...current,
      { place: nextPlace, label: getDefaultPlaceLabel(nextPlace), percentage: 0 },
    ]);
  };

  const handleRemovePayoutTier = (index: number) => {
    if (draftPayouts.length <= 1) return;
    setDraftPayouts(current =>
      current
        .filter((_, idx) => idx !== index)
        .map((tier, idx) => ({
          ...tier,
          place: idx + 1,
        }))
    );
  };

  const handleSavePayouts = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTournament) return;

    const normalizedTiers: PayoutTier[] = draftPayouts.map((tier, idx) => ({
      place: idx + 1,
      label: tier.label.trim() || getDefaultPlaceLabel(idx + 1),
      percentage: Math.max(0, Math.min(100, Number(tier.percentage) || 0)),
    }));

    const nextGuaranteed = Math.max(0, parseBrlInput(draftGuaranteed));

    setTournaments(current =>
      current.map(item =>
        item.id === selectedTournament.id
          ? { ...item, guaranteed: nextGuaranteed, payouts: normalizedTiers }
          : item
      )
    );
    setToast("Premiação atualizada com sucesso!");
    setPayoutModalOpen(false);
  };

  const handleSelectEntryType = (option: EntryType) => {
    setEntryType(option);
    setManualNameMode(false);
    if (selectedTournament) {
      const val = getDefaultValueForEntry(option, selectedTournament);
      setEntryValue(val.toFixed(2).replace(".", ","));
    }
    if (option === "Rebuy" || option === "Add-on") {
      const matchesBuyIn = buyInPlayers.some(
        p => p.toLowerCase() === playerName.trim().toLowerCase()
      );
      if (!matchesBuyIn) {
        setPlayerName("");
      }
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
      payouts: DEFAULT_PAYOUT_TIERS.map(t => ({ ...t })),
    };

    setTournaments(current => [created, ...current]);
    setSelectedTournamentId(created.id);
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
    const formattedTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const newReg: TournamentRegistration = {
      id: `reg-${Date.now()}`,
      playerName: trimmedPlayer,
      entryType,
      value: parsedValue,
      chips: chipsLabel,
      payment: entryPayment,
      time: formattedTime,
    };

    registerSavedPlayer(trimmedPlayer);

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
    if (selectedTournamentId === id) setSelectedTournamentId(null);
    setToast("Torneio removido.");
  };

  const totals = selectedTournament ? getTournamentTotals(selectedTournament, rules) : null;
  const collectedTotal = totals?.collectedTotal ?? 0;
  const effectivePrizePool = selectedTournament ? Math.max(selectedTournament.guaranteed, collectedTotal) : 0;

  const activePayoutTiers =
    selectedTournament?.payouts && selectedTournament.payouts.length > 0
      ? selectedTournament.payouts
      : DEFAULT_PAYOUT_TIERS;

  const draftTotalPercentage = draftPayouts.reduce(
    (sum, tier) => sum + (Number(tier.percentage) || 0),
    0
  );
  const draftPreviewPrizePool = Math.max(parseBrlInput(draftGuaranteed), collectedTotal);

  const isExtraEntry = entryType === "Rebuy" || entryType === "Add-on";
  const showBuyInSelectorList = isExtraEntry && buyInPlayers.length > 0 && !manualNameMode;

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
              const itemTotals = getTournamentTotals(item, rules);
              const pct = Math.min(100, Math.round((itemTotals.buyInsCount / item.capacity) * 100));
              const isSelected = selectedTournament?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn("tournament-card", isSelected && "tournament-selected")}
                  onClick={() => setSelectedTournamentId(item.id)}
                >
                  <div className="tournament-card-top">
                    <StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge>
                    <span className="eyebrow">
                      {item.date} · {item.time}
                    </span>
                  </div>
                  <h3>{item.name}</h3>
                  <div className="tournament-meta">
                    <span>
                      <Users size={12} /> {itemTotals.buyInsCount}/{item.capacity} inscritos
                    </span>
                    <span>
                      <Clock3 size={12} /> Blinds {item.blindMinutes}m
                    </span>
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
                  <StatusBadge tone={statusTone(selectedTournament.status)}>{selectedTournament.status}</StatusBadge>
                  <span>
                    {selectedTournament.date} ÀS {selectedTournament.time}
                  </span>
                </div>
                <h2>{selectedTournament.name}</h2>
                <p>
                  Buy-in {brl(selectedTournament.buyIn)} ({rules.buyInChips} fichas) · Rebuy{" "}
                  {brl(selectedTournament.rebuyValue ?? rules.rebuyValue)} ({rules.rebuyChips}) · Add-on{" "}
                  {brl(selectedTournament.addonValue ?? rules.addonValue)} ({rules.addonChips})
                </p>

                <div className="detail-stats">
                  <div>
                    <span>BUY-IN / REBUY / ADD-ON</span>
                    <strong>{brl(selectedTournament.buyIn)}</strong>
                    <small>
                      Rebuy {brl(rules.rebuyValue)} · Add-on {brl(rules.addonValue)}
                    </small>
                  </div>
                  <div>
                    <span>GARANTIDO</span>
                    <strong>{brl(selectedTournament.guaranteed)}</strong>
                    <small>Arrecadado: {brl(collectedTotal)}</small>
                  </div>
                  <div>
                    <span>INSCRITOS</span>
                    <strong>
                      {totals.buyInsCount} / {selectedTournament.capacity}
                    </strong>
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
                  Premiação ({activePayoutTiers.length})
                </span>
              </div>

              {activeTab === "resumo" && (
                <div className="detail-feed">
                  <div>
                    <div className="feed-icon">
                      <Trophy size={15} />
                    </div>
                    <p>
                      <strong>Premiação total estimada em {brl(effectivePrizePool)}</strong>
                      <small>
                        Garantido: {brl(selectedTournament.guaranteed)} · Arrecadado: {brl(collectedTotal)} (
                        {totals.buyInsCount} Buy-ins, {totals.rebuysCount} Rebuys, {totals.addonsCount} Add-ons)
                      </small>
                    </p>
                    <time>{selectedTournament.date}</time>
                  </div>

                  {totals.registrations.length === 0 ? (
                    <div>
                      <div className="feed-icon">
                        <Users size={15} />
                      </div>
                      <p>
                        <strong>Nenhuma entrada lançada individualmente ainda</strong>
                        <small>
                          Clique em &quot;+ Registrar entrada&quot; para lançar o nome do jogador e escolher Buy-in,
                          Rebuy ou Add-on.
                        </small>
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
                            Valor: {brl(reg.value)} {reg.chips ? `· ${reg.chips} fichas` : ""} · Pagamento:{" "}
                            {reg.payment}
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
                      <div className="feed-icon">
                        <Clock3 size={15} />
                      </div>
                      <p>
                        <strong>
                          Nível {lvl.level}: {lvl.sb} / {lvl.bb}
                        </strong>
                        <small>Duração: {selectedTournament.blindMinutes} min</small>
                      </p>
                      <time>{(lvl.level - 1) * selectedTournament.blindMinutes} min</time>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "premiacao" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "12px 14px",
                      marginBottom: 10,
                      borderRadius: 10,
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          display: "block",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#64748B",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Prize Pool Total
                      </span>
                      <strong style={{ fontSize: 16, color: "#0F172A" }}>
                        {brl(effectivePrizePool)}
                      </strong>{" "}
                      <small style={{ color: "#64748B", fontSize: 12 }}>
                        ({activePayoutTiers.length}{" "}
                        {activePayoutTiers.length === 1 ? "posição premiada" : "posições premiadas"})
                      </small>
                    </div>

                    <Button type="button" variant="outline" onClick={handleOpenPayoutModal}>
                      <Pencil size={14} /> Editar premiação
                    </Button>
                  </div>

                  <div className="detail-feed">
                    {activePayoutTiers.map(tier => {
                      const tierValue = effectivePrizePool * (tier.percentage / 100);
                      return (
                        <div key={tier.place}>
                          <div className={cn("feed-icon", tier.place === 1 && "feed-icon-gold")}>
                            {tier.place === 1 ? (
                              <Crown size={15} />
                            ) : tier.place === 2 ? (
                              <Trophy size={15} />
                            ) : (
                              <Sparkles size={15} />
                            )}
                          </div>
                          <p>
                            <strong>
                              {tier.label} — {brl(tierValue)}
                            </strong>
                            <small>
                              {tier.percentage}% do prize pool total ({brl(effectivePrizePool)})
                            </small>
                          </p>
                          <time>{tier.percentage}%</time>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {payoutModalOpen && selectedTournament && (
        <div
          className="modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setPayoutModalOpen(false);
          }}
        >
          <form className="modal-card" onSubmit={handleSavePayouts} style={{ maxWidth: 540 }}>
            <div className="modal-heading">
              <div>
                <div className="eyebrow">{selectedTournament.name}</div>
                <h2>Editar premiação</h2>
                <p>Configure o garantido, a quantidade de premiados e os percentuais.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setPayoutModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="form-grid">
              <label>
                Garantido GTD (R$)
                <input
                  value={draftGuaranteed}
                  onChange={event => setDraftGuaranteed(event.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </label>
              <div>
                <span className="eyebrow" style={{ display: "block", marginBottom: 6 }}>
                  Prize Pool Estimado
                </span>
                <div
                  style={{
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    padding: "0 12px",
                    borderRadius: 10,
                    background: "#F1F5F9",
                    border: "1px solid #E2E8F0",
                    fontWeight: 700,
                    color: "#0F172A",
                    fontSize: 15,
                  }}
                >
                  {brl(draftPreviewPrizePool)}
                </div>
              </div>
            </div>

            <div>
              <span className="eyebrow" style={{ display: "block", marginBottom: 6 }}>
                Modelos rápidos
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {PAYOUT_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleApplyPayoutPreset(preset.percentages)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      background: "#F8FAFC",
                      color: "#0F172A",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
                  Divisão por posição
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: Math.abs(draftTotalPercentage - 100) < 0.01 ? "#15803D" : "#DC2626",
                  }}
                >
                  Total: {draftTotalPercentage}%
                </span>
              </div>

              <div style={{ display: "grid", gap: 8, maxHeight: 240, overflowY: "auto", paddingRight: 2 }}>
                {draftPayouts.map((tier, idx) => {
                  const previewAmount = draftPreviewPrizePool * ((Number(tier.percentage) || 0) / 100);
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 86px 96px 32px",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <input
                        value={tier.label}
                        onChange={event => {
                          const val = event.target.value;
                          setDraftPayouts(current =>
                            current.map((item, i) => (i === idx ? { ...item, label: val } : item))
                          );
                        }}
                        placeholder={getDefaultPlaceLabel(idx + 1)}
                        required
                      />
                      <div style={{ position: "relative" }}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.5"
                          value={tier.percentage}
                          onChange={event => {
                            const val = Number(event.target.value);
                            setDraftPayouts(current =>
                              current.map((item, i) =>
                                i === idx ? { ...item, percentage: Number.isFinite(val) ? val : 0 } : item
                              )
                            );
                          }}
                          style={{ paddingRight: 22, textAlign: "right" }}
                          required
                        />
                        <span
                          style={{
                            position: "absolute",
                            right: 8,
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontSize: 12,
                            color: "#64748B",
                            pointerEvents: "none",
                          }}
                        >
                          %
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: "#00A8C6",
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {brl(previewAmount)}
                      </div>
                      <button
                        type="button"
                        className="icon-button"
                        title="Remover posição"
                        disabled={draftPayouts.length <= 1}
                        onClick={() => handleRemovePayoutTier(idx)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleAddPayoutTier}
                style={{
                  marginTop: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "none",
                  border: "none",
                  color: "#00A8C6",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <Plus size={14} /> Adicionar {draftPayouts.length + 1}º lugar
              </button>
            </div>

            {Math.abs(draftTotalPercentage - 100) >= 0.01 && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  color: "#991B1B",
                  fontSize: 12,
                }}
              >
                A soma dos percentuais está em <strong>{draftTotalPercentage}%</strong> (o ideal é fechar em{" "}
                <strong>100%</strong>).
              </div>
            )}

            <div className="modal-actions">
              <Button type="button" variant="outline" onClick={() => setPayoutModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="primary-button">
                Salvar premiação
              </Button>
            </div>
          </form>
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
                      <small style={{ display: "block", fontSize: 11, opacity: 0.8 }}>{chipsHint} fichas</small>
                    </button>
                  );
                })}
              </div>
            </div>

            {showBuyInSelectorList ? (
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
                    Jogadores com Buy-in ({buyInPlayers.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setManualNameMode(true);
                      setPlayerName("");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#00A8C6",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Digitar outro nome
                  </button>
                </div>

                <select
                  value={playerName}
                  onChange={event => setPlayerName(event.target.value)}
                  required
                  style={{ marginBottom: 10 }}
                >
                  <option value="">-- Selecione o jogador que fez o Buy-in --</option>
                  {buyInPlayers.map(pName => {
                    const stats = playerExtraCounts.get(pName.toLowerCase());
                    const extras: string[] = [];
                    if (stats?.rebuys) extras.push(`${stats.rebuys} rebuy${stats.rebuys > 1 ? "s" : ""}`);
                    if (stats?.addons) extras.push(`${stats.addons} add-on`);
                    return (
                      <option key={pName} value={pName}>
                        {pName} {extras.length ? `(${extras.join(", ")})` : ""}
                      </option>
                    );
                  })}
                </select>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    maxHeight: 132,
                    overflowY: "auto",
                    padding: 8,
                    borderRadius: 10,
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  {buyInPlayers.map(pName => {
                    const isPicked = playerName.trim().toLowerCase() === pName.toLowerCase();
                    const stats = playerExtraCounts.get(pName.toLowerCase());
                    const badgeCount =
                      entryType === "Rebuy" ? stats?.rebuys ?? 0 : stats?.addons ?? 0;

                    return (
                      <button
                        key={pName}
                        type="button"
                        onClick={() => setPlayerName(pName)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 10px",
                          borderRadius: 999,
                          border: isPicked ? "1.5px solid #00A8C6" : "1px solid #CBD5E1",
                          background: isPicked ? "#00A8C6" : "#FFFFFF",
                          color: isPicked ? "#FFFFFF" : "#0F172A",
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {isPicked ? <Check size={13} /> : <UserCheck size={13} />}
                        <span>{pName}</span>
                        {badgeCount > 0 && (
                          <span
                            style={{
                              fontSize: 10.5,
                              padding: "1px 6px",
                              borderRadius: 999,
                              background: isPicked ? "rgba(255,255,255,0.22)" : "#E2E8F0",
                              color: isPicked ? "#FFFFFF" : "#475569",
                            }}
                          >
                            {badgeCount}x
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                {isExtraEntry && buyInPlayers.length === 0 && (
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "#FFFBEB",
                      border: "1px solid #FDE68A",
                      color: "#92400E",
                      fontSize: 12,
                      marginBottom: 8,
                    }}
                  >
                    Nenhum Buy-in com nome registrado neste torneio ainda. Registre o Buy-in primeiro ou informe o nome abaixo.
                  </div>
                )}

                {isExtraEntry && buyInPlayers.length > 0 && manualNameMode && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setManualNameMode(false);
                        setPlayerName("");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#00A8C6",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Voltar para lista do Buy-in ({buyInPlayers.length})
                    </button>
                  </div>
                )}

                <label>
                  Nome do jogador
                  <input
                    list="saved-club-players"
                    value={playerName}
                    onChange={event => setPlayerName(event.target.value)}
                    placeholder="Ex.: Carlos Mendes"
                    autoFocus
                    required
                  />
                </label>

                <datalist id="saved-club-players">
                  {savedPlayers.map(pName => (
                    <option key={pName} value={pName} />
                  ))}
                </datalist>

                {entryType === "Buy-in" && availableClubPlayers.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 11.5,
                        color: "#64748B",
                        marginBottom: 6,
                      }}
                    >
                      Jogadores salvos (clique para preencher):
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 88, overflowY: "auto" }}>
                      {availableClubPlayers.map(pName => (
                        <button
                          key={pName}
                          type="button"
                          onClick={() => setPlayerName(pName)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            border: "1px solid #CBD5E1",
                            background: "#F8FAFC",
                            color: "#334155",
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: "pointer",
                          }}
                        >
                          + {pName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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
                <select value={entryPayment} onChange={event => setEntryPayment(event.target.value)}>
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
                <input value={date} onChange={event => setDate(event.target.value)} placeholder="DD/MM/AAAA" required />
              </label>
              <label>
                Horário
                <input value={time} onChange={event => setTime(event.target.value)} placeholder="20:00" required />
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
                <input value={stack} onChange={event => setStack(event.target.value)} placeholder="15.000" required />
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
                <select value={status} onChange={event => setStatus(event.target.value as TournamentStatus)}>
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
