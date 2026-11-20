import { useEffect, useState, type FormEvent } from "react";
import { CircleDollarSign, Clock3, Pencil, RotateCcw, Sparkles, Trophy, X, Zap } from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { brl, PageIntro, parseBrlInput, StatusBadge } from "@/components/club/SharedUI";
import { Button } from "@/components/ui/button";
import { DEFAULT_BLIND_LEVELS } from "@/types/club";

const BLIND_TIME_PRESETS = [10, 12, 15, 20, 25, 30];

export function BlindsView() {
  const {
    setView,
    blindLevels,
    setBlindLevels,
    rules,
    setRules,
    tournaments,
    setTournaments,
    setToast,
  } = useClub();

  const currentBlindMinutes = rules.blindMinutes ?? 15;

  const [buyInVal, setBuyInVal] = useState(rules.buyInValue.toFixed(2).replace(".", ","));
  const [buyInChips, setBuyInChips] = useState(rules.buyInChips);
  const [rebuyVal, setRebuyVal] = useState(rules.rebuyValue.toFixed(2).replace(".", ","));
  const [rebuyChips, setRebuyChips] = useState(rules.rebuyChips);
  const [addonVal, setAddonVal] = useState(rules.addonValue.toFixed(2).replace(".", ","));
  const [addonChips, setAddonChips] = useState(rules.addonChips);
  const [blindMinutesInput, setBlindMinutesInput] = useState(String(currentBlindMinutes));

  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [draftMinutes, setDraftMinutes] = useState(String(currentBlindMinutes));
  const [applyToActiveTournaments, setApplyToActiveTournaments] = useState(true);

  useEffect(() => {
    setBuyInVal(rules.buyInValue.toFixed(2).replace(".", ","));
    setBuyInChips(rules.buyInChips);
    setRebuyVal(rules.rebuyValue.toFixed(2).replace(".", ","));
    setRebuyChips(rules.rebuyChips);
    setAddonVal(rules.addonValue.toFixed(2).replace(".", ","));
    setAddonChips(rules.addonChips);
    setBlindMinutesInput(String(rules.blindMinutes ?? 15));
  }, [rules]);

  const handleOpenTimeModal = () => {
    setDraftMinutes(String(rules.blindMinutes ?? 15));
    setApplyToActiveTournaments(true);
    setTimeModalOpen(true);
  };

  const handleSaveBlindTime = (event: FormEvent) => {
    event.preventDefault();
    const parsedMinutes = Math.max(1, Math.min(180, Math.round(Number(draftMinutes) || 15)));

    setRules(current => ({
      ...current,
      blindMinutes: parsedMinutes,
    }));
    setBlindMinutesInput(String(parsedMinutes));

    if (applyToActiveTournaments && tournaments.length > 0) {
      setTournaments(current =>
        current.map(item =>
          item.status !== "Finalizado" ? { ...item, blindMinutes: parsedMinutes } : item
        )
      );
      setToast(`Tempo dos blinds atualizado para ${parsedMinutes} min nos torneios ativos!`);
    } else {
      setToast(`Tempo padrão dos blinds atualizado para ${parsedMinutes} min!`);
    }

    setTimeModalOpen(false);
  };

  const handleRestoreDefaults = () => {
    setBlindLevels(DEFAULT_BLIND_LEVELS);
    setRules(current => ({ ...current, blindMinutes: 15 }));
    setBlindMinutesInput("15");
    setToast("Estrutura padrão de 20 níveis (15 min) restaurada!");
  };

  const handleSaveRules = (event: FormEvent) => {
    event.preventDefault();
    const parsedMinutes = Math.max(1, Math.min(180, Math.round(Number(blindMinutesInput) || 15)));
    setRules(current => ({
      ...current,
      buyInValue: parseBrlInput(buyInVal),
      buyInChips: buyInChips.trim() || "15.000",
      rebuyValue: parseBrlInput(rebuyVal),
      rebuyChips: rebuyChips.trim() || "15.000",
      addonValue: parseBrlInput(addonVal),
      addonChips: addonChips.trim() || "20.000",
      blindMinutes: parsedMinutes,
    }));
    setToast("Valores, fichas e tempo dos blinds salvos!");
  };

  const levels = blindLevels.length > 0 ? blindLevels : DEFAULT_BLIND_LEVELS;
  const half = Math.ceil(levels.length / 2);
  const firstHalf = levels.slice(0, half);
  const secondHalf = levels.slice(half);
  const firstLevel = levels[0];
  const lastLevel = levels[levels.length - 1];

  return (
    <>
      <PageIntro
        eyebrow="Configuração técnica"
        title="Estruturas de Blinds"
        description="Gerencie os níveis de blinds, duração por nível e fichas padrão dos torneios."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 16,
        }}
      >
        <div className="panel" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span className="eyebrow">BUY-IN</span>
            <CircleDollarSign size={16} color="#00A8C6" />
          </div>
          <strong style={{ display: "block", fontSize: 22, color: "#0F172A" }}>{brl(rules.buyInValue)}</strong>
          <small style={{ color: "#64748B", fontSize: 12 }}>
            {rules.buyInChips} fichas ({rules.buyInBbNote})
          </small>
        </div>

        <div className="panel" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span className="eyebrow">REBUY</span>
            <Zap size={16} color="#F59E0B" />
          </div>
          <strong style={{ display: "block", fontSize: 22, color: "#0F172A" }}>{brl(rules.rebuyValue)}</strong>
          <small style={{ color: "#64748B", fontSize: 12 }}>{rules.rebuyChips} fichas</small>
        </div>

        <div className="panel" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span className="eyebrow">ADD-ON</span>
            <Sparkles size={16} color="#D97706" />
          </div>
          <strong style={{ display: "block", fontSize: 22, color: "#0F172A" }}>{brl(rules.addonValue)}</strong>
          <small style={{ color: "#64748B", fontSize: 12 }}>
            {rules.addonChips} fichas ({rules.addonBbNote})
          </small>
        </div>

        <div className="panel" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span className="eyebrow">ESTRUTURA ATIVA</span>
            <Clock3 size={16} color="#6366F1" />
          </div>
          <strong style={{ display: "block", fontSize: 22, color: "#0F172A" }}>
            {levels.length} níveis · {currentBlindMinutes} min
          </strong>
          <small style={{ color: "#64748B", fontSize: 12 }}>
            {firstLevel ? `${firstLevel.sb}/${firstLevel.bb}` : "50/100"} até{" "}
            {lastLevel ? `${lastLevel.sb}/${lastLevel.bb}` : "1700/1800"}
          </small>
        </div>
      </div>

      <section className="panel" style={{ padding: 20, marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", margin: 0 }}>
              Blinds ({levels.length} Níveis · {currentBlindMinutes} min por nível)
            </h2>
            <p style={{ fontSize: 12.5, color: "#64748B", margin: "4px 0 0" }}>
              Esta estrutura e o tempo de {currentBlindMinutes} min são aplicados automaticamente nos torneios e no Clocker (Modo TV).
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button type="button" variant="outline" onClick={handleOpenTimeModal}>
              <Pencil size={14} /> Editar time dos blinds ({currentBlindMinutes} min)
            </Button>
            <Button type="button" variant="outline" onClick={handleRestoreDefaults}>
              <RotateCcw size={14} /> Restaurar padrão
            </Button>
            <Button type="button" className="primary-button" onClick={() => setView("tournaments")}>
              <Trophy size={14} /> Ir para Torneios
            </Button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {[firstHalf, secondHalf].map((group, colIdx) => (
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
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "#F8FAFC",
                  borderBottom: "1px solid #E2E8F0",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#64748B",
                  letterSpacing: "0.05em",
                }}
              >
                <span>NÍVEL</span>
                <span>SMALL / BIG BLIND</span>
              </div>

              {group.map(lvl => (
                <div
                  key={lvl.level}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "11px 14px",
                    borderBottom: "1px solid #F1F5F9",
                    fontSize: 13.5,
                  }}
                >
                  <strong style={{ color: "#0F172A" }}>Nível {lvl.level}:</strong>
                  <strong style={{ color: "#00A8C6", fontVariantNumeric: "tabular-nums" }}>
                    {lvl.sb}/{lvl.bb}
                  </strong>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <form className="panel" style={{ padding: 20 }} onSubmit={handleSaveRules}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", margin: 0 }}>
              Valores, Fichas e Tempo do Torneio
            </h2>
            <p style={{ fontSize: 12.5, color: "#64748B", margin: "4px 0 0" }}>
              Configuração padrão aplicada ao abrir lançamentos de Buy-in, Rebuy, Add-on e duração dos blinds.
            </p>
          </div>
          <StatusBadge tone="cyan">Configurado</StatusBadge>
        </div>

        <div className="form-grid" style={{ marginBottom: 14 }}>
          <label>
            Valor Buy-in (R$)
            <input value={buyInVal} onChange={e => setBuyInVal(e.target.value)} inputMode="decimal" />
          </label>
          <label>
            Fichas Buy-in
            <input value={buyInChips} onChange={e => setBuyInChips(e.target.value)} />
          </label>

          <label>
            Valor Rebuy (R$)
            <input value={rebuyVal} onChange={e => setRebuyVal(e.target.value)} inputMode="decimal" />
          </label>
          <label>
            Fichas Rebuy
            <input value={rebuyChips} onChange={e => setRebuyChips(e.target.value)} />
          </label>

          <label>
            Valor Add-on (R$)
            <input value={addonVal} onChange={e => setAddonVal(e.target.value)} inputMode="decimal" />
          </label>
          <label>
            Fichas Add-on
            <input value={addonChips} onChange={e => setAddonChips(e.target.value)} />
          </label>

          <label>
            Tempo de cada nível (minutos)
            <input
              type="number"
              min={1}
              max={180}
              value={blindMinutesInput}
              onChange={e => setBlindMinutesInput(e.target.value)}
            />
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="submit" className="primary-button">
            Salvar valores e fichas
          </Button>
        </div>
      </form>

      {timeModalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setTimeModalOpen(false);
          }}
        >
          <form className="modal-card" onSubmit={handleSaveBlindTime} style={{ maxWidth: 440 }}>
            <div className="modal-heading">
              <div>
                <div className="eyebrow">Estrutura de Blinds</div>
                <h2>Editar tempo dos blinds</h2>
                <p>Defina quantos minutos dura cada nível no relógio do torneio.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setTimeModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div>
              <span className="eyebrow" style={{ display: "block", marginBottom: 8 }}>
                Tempos rápidos
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {BLIND_TIME_PRESETS.map(mins => {
                  const selected = Number(draftMinutes) === mins;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDraftMinutes(String(mins))}
                      style={{
                        padding: "9px 8px",
                        borderRadius: 10,
                        border: selected ? "2px solid #00A8C6" : "1px solid #D8E1EB",
                        background: selected ? "#00A8C614" : "#FFFFFF",
                        color: selected ? "#071E36" : "#4A596D",
                        fontWeight: selected ? 700 : 600,
                        cursor: "pointer",
                      }}
                    >
                      {mins} min
                    </button>
                  );
                })}
              </div>
            </div>

            <label>
              Duração por nível (minutos)
              <input
                type="number"
                min={1}
                max={180}
                value={draftMinutes}
                onChange={event => setDraftMinutes(event.target.value)}
                autoFocus
                required
              />
            </label>

            {tournaments.length > 0 && (
              <label
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#0F172A",
                }}
              >
                <input
                  type="checkbox"
                  checked={applyToActiveTournaments}
                  onChange={event => setApplyToActiveTournaments(event.target.checked)}
                  style={{ width: 16, height: 16, margin: 0 }}
                />
                <span>Atualizar também os torneios ativos/agendados ({tournaments.length})</span>
              </label>
            )}

            <div className="modal-actions">
              <Button type="button" variant="outline" onClick={() => setTimeModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="primary-button">
                Salvar tempo ({Math.max(1, Number(draftMinutes) || 15)} min)
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
