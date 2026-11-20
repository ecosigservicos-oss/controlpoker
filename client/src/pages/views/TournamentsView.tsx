import { useState, type FormEvent } from "react";
import {
  Clock3,
  Crown,
  MonitorPlay,
  Pause,
  Play,
  Plus,
  Sparkles,
  Trophy,
  Tv2,
  Users,
  X,
} from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { brl, PageIntro, parseBrlInput, StatusBadge } from "@/components/club/SharedUI";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getTournamentTotals,
  type EntryType,
  type Tournament,
  type TournamentRegistration,
  type TournamentStatus,
} from "@/types/club";

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
  } = useClub();

  const [modalOpen, setModalOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
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

  const selectedTournament =
    tournaments.find(item => item.id === selectedTournamentId) ?? tournaments[0] ?? null;

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

  const totals = selectedTournament ? getTournamentTotals(selectedTournament) : null;
  const collectedTotal = totals?.collectedTotal ?? 0;
  const effectivePrizePool = selectedTournament ? Math.max(selectedTournament.guaranteed, collectedTotal) : 0;

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
                  Premiação
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
                <div className="detail-feed">
                  <div>
                    <div className="feed-icon feed-icon-gold">
                      <Crown size={15} />
                    </div>
                    <p>
                      <strong>1º Lugar (Campeão) — {brl(effectivePrizePool * 0.5)}</strong>
                      <small>50% do prize pool total ({brl(effectivePrizePool)})</small>
                    </p>
                    <time>50%</time>
                  </div>
                  <div>
                    <div className="feed-icon">
                      <Trophy size={15} />
                    </div>
                    <p>
                      <strong>2º Lugar (Vice-campeão) — {brl(effectivePrizePool * 0.3)}</strong>
                      <small>30% do prize pool total ({brl(effectivePrizePool)})</small>
                    </p>
                    <time>30%</time>
                  </div>
                  <div>
                    <div className="feed-icon">
                      <Sparkles size={15} />
                    </div>
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
                      <small style={{ display: "block", fontSize: 11, opacity: 0.8 }}>{chipsHint} fichas</small>
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
