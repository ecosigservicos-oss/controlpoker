import { useEffect, useState, type ReactNode } from "react";
import { Lock, LogOut, ShieldCheck, User, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { APP_MODULES } from "@/types/auth";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { AccessManagerModal } from "@/components/auth/AccessManagerModal";

export function AuthGate({ children }: { children: ReactNode }) {
  const { currentUser, isAdmin, users, logout } = useAuth();
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [restrictedScreenDetected, setRestrictedScreenDetected] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setRestrictedScreenDetected(false);
      return;
    }

    if (isAdmin) {
      setRestrictedScreenDetected(false);
      document.querySelectorAll<HTMLElement>("[data-auth-hidden='true']").forEach(el => {
        el.style.display = "";
        el.removeAttribute("data-auth-hidden");
      });
      return;
    }

    const allowedLabelSet = new Set<string>();
    for (const mod of APP_MODULES) {
      if (currentUser.allowedModules.includes(mod.key)) {
        for (const lbl of mod.sidebarLabels) {
          allowedLabelSet.add(lbl.toLowerCase());
        }
      }
    }

    const restrictedLabelSet = new Set<string>();
    for (const mod of APP_MODULES) {
      if (!currentUser.allowedModules.includes(mod.key)) {
        for (const lbl of mod.sidebarLabels) {
          restrictedLabelSet.add(lbl.toLowerCase());
        }
      }
    }

    const enforcePermissions = () => {
      const navButtons = document.querySelectorAll<HTMLElement>(
        "aside button, aside a, nav button, nav a"
      );

      let firstAllowedNavElement: HTMLElement | null = null;

      navButtons.forEach(el => {
        const rawText = (el.textContent ?? "").trim().toLowerCase();
        if (!rawText) return;

        let isRestrictedItem = false;
        restrictedLabelSet.forEach(restrictedLbl => {
          if (rawText === restrictedLbl || rawText.includes(restrictedLbl)) {
            isRestrictedItem = true;
          }
        });

        let isAllowedItem = false;
        allowedLabelSet.forEach(allowedLbl => {
          if (rawText === allowedLbl || rawText.includes(allowedLbl)) {
            isAllowedItem = true;
          }
        });

        if (isRestrictedItem && !isAllowedItem) {
          el.style.display = "none";
          el.setAttribute("data-auth-hidden", "true");
        } else {
          if (el.getAttribute("data-auth-hidden") === "true") {
            el.style.display = "";
            el.removeAttribute("data-auth-hidden");
          }
          if (isAllowedItem && !firstAllowedNavElement) {
            firstAllowedNavElement = el;
          }
        }
      });

      const mainHeading = document.querySelector("main h1");
      const activeTitle = (mainHeading?.textContent ?? "").trim().toLowerCase();

      if (activeTitle && restrictedLabelSet.has(activeTitle)) {
        if (firstAllowedNavElement) {
          firstAllowedNavElement.click();
          setRestrictedScreenDetected(false);
        } else {
          setRestrictedScreenDetected(true);
        }
      } else {
        setRestrictedScreenDetected(currentUser.allowedModules.length === 0);
      }
    };

    enforcePermissions();

    const observer = new MutationObserver(() => {
      enforcePermissions();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [currentUser, isAdmin]);

  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 45,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "8px 18px",
          background: "#071E36",
          borderBottom: "1px solid rgba(0, 168, 198, 0.28)",
          color: "#F8FAFC",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              borderRadius: 999,
              background: isAdmin
                ? "rgba(0, 168, 198, 0.2)"
                : "rgba(148, 163, 184, 0.16)",
              border: isAdmin
                ? "1px solid rgba(56, 189, 248, 0.45)"
                : "1px solid rgba(148, 163, 184, 0.3)",
              color: isAdmin ? "#38BDF8" : "#CBD5E1",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            {isAdmin ? <ShieldCheck size={13} /> : <User size={13} />}
            {isAdmin ? "ADMINISTRADOR · ACESSO TOTAL" : "ACESSO RESTRITO"}
          </span>

          <span style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>
            {currentUser.name}
          </span>

          <span style={{ fontSize: 12, color: "#94A3B8" }}>
            · {currentUser.jobTitle}
            {!isAdmin && ` (${currentUser.allowedModules.length} áreas liberadas)`}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setAccessModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 9,
                border: "1px solid rgba(56, 189, 248, 0.5)",
                background: "rgba(0, 168, 198, 0.2)",
                color: "#7DD3FC",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Users size={14} /> Usuários e Acessos ({users.length})
            </button>
          )}

          <button
            type="button"
            onClick={logout}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 9,
              border: "1px solid rgba(248, 113, 113, 0.4)",
              background: "rgba(239, 68, 68, 0.14)",
              color: "#FCA5A5",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      </div>

      {restrictedScreenDetected && !isAdmin ? (
        <div
          style={{
            minHeight: "calc(100vh - 46px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "#F1F5F9",
          }}
        >
          <div
            style={{
              maxWidth: 440,
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 16,
              padding: 28,
              textAlign: "center",
              boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "#FEF2F2",
                color: "#DC2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
              }}
            >
              <Lock size={24} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", margin: "0 0 8px" }}>
              Área restrita ao Administrador
            </h2>
            <p style={{ fontSize: 13.5, color: "#64748B", margin: "0 0 18px", lineHeight: 1.5 }}>
              O seu usuário ainda não possui telas liberadas ou esta seção é exclusiva do Administrador Geral.
            </p>
            <button
              type="button"
              onClick={logout}
              style={{
                padding: "9px 16px",
                borderRadius: 10,
                border: "none",
                background: "#071E36",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Trocar de usuário
            </button>
          </div>
        </div>
      ) : (
        children
      )}

      {isAdmin && (
        <AccessManagerModal
          open={accessModalOpen}
          onClose={() => setAccessModalOpen(false)}
        />
      )}
    </>
  );
}
