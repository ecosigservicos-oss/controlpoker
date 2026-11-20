import type { ReactNode } from "react";
import { ArrowUpRight, Plus, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

export const compactBrl = (value: number) =>
  value >= 1000 ? `R$ ${(value / 1000).toFixed(1).replace(".", ",")}k` : brl(value);

export const parseBrlInput = (raw: string) => {
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

export function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("brand-lockup", compact && "brand-lockup-compact")}>
      <div className="brand-mark">
        <span>♠</span>
        <span className="brand-mark-dot" />
      </div>
      {!compact && (
        <div>
          <div className="brand-name">
            POKER <strong>GESTOR</strong>
          </div>
          <div className="brand-caption">GESTÃO DE CLUBES</div>
        </div>
      )}
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
  dot = true,
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "cyan" | "orange" | "red" | "gold";
  dot?: boolean;
}) {
  return (
    <span className={cn("status-badge", `status-${tone}`)}>
      {dot && <span className="status-dot" />}
      {children}
    </span>
  );
}

export function Avatar({
  initials,
  color = "#00A8C6",
  size = "md",
}: {
  initials: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span className={cn("avatar", `avatar-${size}`)} style={{ background: `${color}22`, color }}>
      {initials}
    </span>
  );
}

export function IconTile({ icon: Icon, tone = "cyan" }: { icon: LucideIcon; tone?: string }) {
  return (
    <div className={cn("icon-tile", `icon-${tone}`)}>
      <Icon size={17} strokeWidth={2.1} />
    </div>
  );
}

export function MetricCard({
  label,
  value,
  change,
  icon: Icon,
  tone = "cyan",
  detail,
  onClick,
}: {
  label: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  tone?: string;
  detail?: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" className={cn("metric-card", `metric-${tone}`)} onClick={onClick}>
      <div className="metric-card-top">
        <span className="eyebrow">{label}</span>
        <IconTile icon={Icon} tone={tone} />
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-footer">
        {change && (
          <span className={cn("change", change.startsWith("-") ? "change-negative" : "change-positive")}>
            <ArrowUpRight size={13} /> {change}
          </span>
        )}
        <span className="metric-detail">{detail}</span>
      </div>
    </button>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  action,
  actionLabel = "Ação rápida",
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="page-intro">
      <div>
        <div className="eyebrow intro-eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && (
        <Button className="primary-button" onClick={action}>
          <Plus size={16} />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
