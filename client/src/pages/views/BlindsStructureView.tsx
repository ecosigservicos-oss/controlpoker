import { useEffect, useState, type FormEvent } from "react";
import { CircleDollarSign, Clock3, RotateCcw, Sparkles, Trophy, X, Zap } from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { brl, MetricCard, PageIntro, parseBrlInput, StatusBadge } from "@/components/club/SharedUI";
import { Button } from "@/components/ui/button";
import { DEFAULT_BLIND_LEVELS, DEFAULT_TOURNAMENT_RULES } from "@/types/club";

export function BlindsStructureView() {
  const { blindLevels, setBlindLevels, rules, setRules, setView, setToast } = useClub();

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
                  <span style={{ fontWeight: 600, color: "#0F172A" }}>Nível {lvl.level}:</span>
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
              <input value={buyInVal} onChange={e => setBuyInVal(e.target.value)} inputMode="decimal" required />
            </label>
            <label>
              Fichas Buy-in
              <input value={buyInChips} onChange={e => setBuyInChips(e.target.value)} placeholder="15.000" required />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Valor Rebuy (R$)
              <input value={rebuyVal} onChange={e => setRebuyVal(e.target.value)} inputMode="decimal" required />
            </label>
            <label>
              Fichas Rebuy
              <input value={rebuyChips} onChange={e => setRebuyChips(e.target.value)} placeholder="15.000" required />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Valor Add-on (R$)
              <input value={addonVal} onChange={e => setAddonVal(e.target.value)} inputMode="decimal" required />
            </label>
            <label>
              Fichas Add-on
              <input value={addonChips} onChange={e => setAddonChips(e.target.value)} placeholder="20.000" required />
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
                <input type="number" min={1} value={newSb} onChange={e => setNewSb(e.target.value)} required />
              </label>
              <label>
                Big Blind
                <input type="number" min={1} value={newBb} onChange={e => setNewBb(e.target.value)} required />
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
