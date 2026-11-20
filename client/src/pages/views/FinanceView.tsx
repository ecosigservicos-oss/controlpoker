import { useState, type FormEvent } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CreditCard,
  Ellipsis,
  Landmark,
  ReceiptText,
  X,
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
import {
  brl,
  compactBrl,
  IconTile,
  MetricCard,
  PageIntro,
  parseBrlInput,
  StatusBadge,
} from "@/components/club/SharedUI";
import { Button } from "@/components/ui/button";
import { getTournamentTotals, type Transaction } from "@/types/club";

const cashChartData: { day: string; entrada: number; saida: number }[] = [];

export function FinanceView() {
  const { transactions, setTransactions, setActivities, tournaments } = useClub();
  const [grouping, setGrouping] = useState("Mensal");
  const [modalOpen, setModalOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [type, setType] = useState<"Entrada" | "Saída">("Entrada");
  const [category, setCategory] = useState("Receitas");

  const tournamentIncome = tournaments.reduce(
    (sum, item) => sum + getTournamentTotals(item).collectedTotal,
    0
  );
  const manualEntries = transactions
    .filter(item => item.type === "Entrada")
    .reduce((sum, item) => sum + item.value, 0);
  const entries = manualEntries + tournamentIncome;
  const exits = transactions
    .filter(item => item.type === "Saída")
    .reduce((sum, item) => sum + item.value, 0);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseBrlInput(value);
    if (!description || !parsed) return;

    const icon = type === "Entrada" ? ArrowDownRight : ArrowUpRight;
    const tone = type === "Entrada" ? "green" : "red";
    const next: Transaction = {
      id: `tx-${Date.now()}`,
      date: "20/11/2026",
      description,
      category,
      type,
      value: parsed,
      payment: "PIX",
      icon,
      tone,
    };

    setTransactions(current => [next, ...current]);
    setActivities(current => [
      {
        id: `a-${Date.now()}`,
        title: `${type} de ${brl(parsed)} registrada`,
        detail: `Financeiro · ${description}`,
        time: "agora",
        tone: type === "Entrada" ? "green" : "cyan",
        icon,
      },
      ...current,
    ]);
    setDescription("");
    setValue("");
    setModalOpen(false);
  };

  return (
    <>
      <PageIntro
        eyebrow="Controle de caixa e performance"
        title="Gestão financeira"
        description="Entradas, saídas e resultado do clube em tempo real."
        action={() => setModalOpen(true)}
        actionLabel="Nova transação"
      />

      <div className="metrics-grid finance-metrics">
        <MetricCard label="Entradas" value={compactBrl(entries)} change="0%" detail="torneios + lançamentos" icon={ArrowDownRight} tone="green" />
        <MetricCard label="Saídas" value={compactBrl(exits)} change="0%" detail="vs. período anterior" icon={ArrowUpRight} tone="red" />
        <MetricCard label="Lucro" value={compactBrl(entries - exits)} change="0%" detail="saldo consolidado" icon={BarChart3} tone="cyan" />
        <MetricCard label="Despesas" value={compactBrl(exits)} change="0%" detail="sem registros" icon={ReceiptText} tone="orange" />
        <MetricCard label="Caixa" value={compactBrl(entries - exits)} detail="saldo disponível" icon={Landmark} tone="purple" />
      </div>

      <section className="panel finance-chart-panel">
        <div className="panel-heading">
          <div>
            <h2>Evolução das entradas e saídas</h2>
            <p>Visão consolidada dos últimos 7 meses.</p>
          </div>
          <div className="segmented-control">
            {["Mensal", "Semanal", "Diário"].map(item => (
              <button
                key={item}
                className={grouping === item ? "segmented-active" : ""}
                onClick={() => setGrouping(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="chart-wrap finance-chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashChartData} margin={{ top: 12, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="entradaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#071E36" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#071E36" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="saidaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00A8C6" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#00A8C6" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E7EDF3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#8190A5" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#8190A5" }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} />
              <RechartsTooltip formatter={(v: number) => brl(v)} contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} />
              <Area type="monotone" dataKey="entrada" name="Entradas" stroke="#071E36" strokeWidth={2.5} fill="url(#entradaGradient)" />
              <Area type="monotone" dataKey="saida" name="Saídas" stroke="#00A8C6" strokeWidth={2.5} fill="url(#saidaGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel transactions-panel">
        <div className="panel-heading">
          <div>
            <h2>Últimas transações</h2>
            <p>Registros financeiros mais recentes.</p>
          </div>
          <button className="text-button" onClick={() => setModalOpen(true)}>
            + Nova transação
          </button>
        </div>
        <div className="transaction-table">
          <div className="transaction-row transaction-head">
            <span>Data</span>
            <span>Descrição</span>
            <span>Categoria</span>
            <span>Tipo</span>
            <span>Valor</span>
            <span>Pagamento</span>
            <span />
          </div>
          {transactions.length ? (
            transactions.slice(0, 6).map(transaction => (
              <div className="transaction-row" key={transaction.id}>
                <span className="table-date">{transaction.date}</span>
                <span className="transaction-description">
                  <IconTile icon={transaction.icon} tone={transaction.tone} />
                  <strong>{transaction.description}</strong>
                </span>
                <span>
                  <StatusBadge tone="neutral" dot={false}>
                    {transaction.category}
                  </StatusBadge>
                </span>
                <span>
                  <StatusBadge tone={transaction.type === "Entrada" ? "green" : "red"}>
                    {transaction.type}
                  </StatusBadge>
                </span>
                <strong className={transaction.type === "Entrada" ? "money-in" : "money-out"}>
                  {transaction.type === "Entrada" ? "+" : "-"} {brl(transaction.value)}
                </strong>
                <span className="payment-method">
                  <CreditCard size={13} /> {transaction.payment}
                </span>
                <button className="icon-button">
                  <Ellipsis size={17} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty-inline">Nenhuma transação manual registrada.</div>
          )}
        </div>
      </section>

      {modalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
        >
          <form className="modal-card" onSubmit={handleSubmit}>
            <div className="modal-heading">
              <div>
                <div className="eyebrow">Lançamento manual</div>
                <h2>Nova transação</h2>
                <p>Registre uma entrada ou saída no caixa.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <label>
              Descrição
              <input
                value={description}
                onChange={event => setDescription(event.target.value)}
                placeholder="Ex.: Rake Mesa 05"
                required
              />
            </label>
            <div className="form-grid">
              <label>
                Valor (R$)
                <input
                  value={value}
                  onChange={event => setValue(event.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  required
                />
              </label>
              <label>
                Categoria
                <select value={category} onChange={event => setCategory(event.target.value)}>
                  <option>Receitas</option>
                  <option>Despesas</option>
                  <option>Torneios</option>
                  <option>Cash</option>
                  <option>Bar</option>
                </select>
              </label>
            </div>
            <label>
              Tipo
              <select value={type} onChange={event => setType(event.target.value as "Entrada" | "Saída")}>
                <option>Entrada</option>
                <option>Saída</option>
              </select>
            </label>
            <div className="modal-actions">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="primary-button">
                Salvar transação
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
