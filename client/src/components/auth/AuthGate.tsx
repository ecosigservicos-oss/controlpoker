import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronUp,
  Lock,
  LogOut,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { APP_MODULES } from "@/types/auth";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { AccessManagerModal } from "@/components/auth/AccessManagerModal";

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "US";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { currentUser, isAdmin, users, logout } = useAuth();
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ left: number; bottom: number; width: number }>({
    left: 14,
    bottom: 86,
    width: 248,
  });
  const [restrictedScreenDetected, setRestrictedScreenDetected] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!profileMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (menuRef.current && menuRef.current.contains(target)) return;
      if (target.closest("[data-sidebar-user-trigger='true']")) return;
      setProfileMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!currentUser) {
      setProfileMenuOpen(false);
      return;
    }

    const bindBottomSidebarCard = () => {
      const sidebar =
        document.querySelector<HTMLElement>("aside") ??
        document.querySelector<HTMLElement>(".sidebar");
      if (!sidebar) return;

      const allElements = Array.from(sidebar.querySelectorAll<HTMLElement>("*"));
      const clubTitleEl = allElements.find(el => {
        if (el.children.length > 0) return false;
        const txt = (el.textContent ?? "").trim();
        return txt === "Poker Club SP" || el.dataset.authUserTitle === "true";
      });

      const subTitleEl = allElements.find(el => {
        if (el.children.length > 0) return false;
        const txt = (el.textContent ?? "").trim();
        return (
          txt.includes("Unidade principal") ||
          txt.includes("Admin ·") ||
          el.dataset.authUserSubtitle === "true"
        );
      });

      const anchorEl = clubTitleEl ?? subTitleEl;
      if (!anchorEl) return;

      if (clubTitleEl) {
        clubTitleEl.dataset.authUserTitle = "true";
        clubTitleEl.textContent = isAdmin ? "Poker Club SP" : currentUser.name;
      }
      if (subTitleEl) {
        subTitleEl.dataset.authUserSubtitle = "true";
        subTitleEl.textContent = isAdmin
          ? "Admin · Unidade principal"
          : `${currentUser.jobTitle} · Restrito`;
      }

      let triggerEl: HTMLElement | null =
        anchorEl.closest("button, [role='button']") ?? anchorEl.parentElement;

      if (triggerEl && triggerEl.parentElement && triggerEl.parentElement !== sidebar) {
        const parentRect = triggerEl.parentElement.getBoundingClientRect();
        if (parentRect.height > 40 && parentRect.height < 110 && parentRect.width > 150) {
          triggerEl = triggerEl.parentElement;
        }
      }

      if (!triggerEl) return;

      const badgeEl = Array.from(triggerEl.querySelectorAll<HTMLElement>("*")).find(el => {
        if (el.children.length > 0) return false;
        const txt = (el.textContent ?? "").trim();
        return (txt.length === 2 && /^[A-ZÀ-Ú]{2}$/.test(txt)) || el.dataset.authUserBadge === "true";
      });
      if (badgeEl) {
        badgeEl.dataset.authUserBadge = "true";
        badgeEl.textContent = isAdmin ? "AD" : getInitials(currentUser.name);
      }

      triggerEl.style.cursor = "pointer";
      triggerEl.setAttribute("data-sidebar-user-trigger", "true");
      triggerEl.title = isAdmin
        ? "Gerenciar usuários, acessos ou sair"
        : "Opções da conta / Sair";

      if (triggerEl.dataset.authClickBound !== "true") {
        triggerEl.dataset.authClickBound = "true";
        triggerEl.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          const rect = triggerEl!.getBoundingClientRect();
          setMenuAnchor({
            left: Math.max(10, rect.left),
            bottom: Math.max(16, window.innerHeight - rect.top + 8),
            width: Math.max(244, rect.width),
          });
          setProfileMenuOpen(prev => !prev);
        });
      }
    };

    bindBottomSidebarCard();

    const observer = new MutationObserver(() => {
      bindBottomSidebarCard();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [currentUser, isAdmin]);

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
        if (el.getAttribute("data-sidebar-user-trigger") === "true") return;

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
      {restrictedScreenDetected && !isAdmin ? (
        <div
          style={{
            minHeight: "100vh",
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

      {profileMenuOpen && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            left: menuAnchor.left,
            bottom: menuAnchor.bottom,
            width: Math.max(252, menuAnchor.width),
            zIndex: 70,
            background: "#0B2540",
            border: "1px solid rgba(56, 189, 248, 0.35)",
            borderRadius: 14,
            padding: 12,
            boxShadow: "0 20px 45px rgba(2, 10, 22, 0.72)",
            color: "#F8FAFC",
          }}
        >
          <div
            style={{
              padding: "6px 8px 10px",
              borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "2px 8px",
                borderRadius: 999,
                background: isAdmin
                  ? "rgba(0, 168, 198, 0.22)"
                  : "rgba(148, 163, 184, 0.18)",
                color: isAdmin ? "#38BDF8" : "#CBD5E1",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.04em",
                marginBottom: 6,
              }}
            >
              {isAdmin ? <ShieldCheck size={11} /> : <User size={11} />}
              {isAdmin ? "ADMINISTRADOR · ACESSO TOTAL" : "ACESSO RESTRITO"}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#FFFFFF" }}>
              {currentUser.name}
            </div>
            <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 2 }}>
              {currentUser.jobTitle}
              {!isAdmin && ` · ${currentUser.allowedModules.length} áreas liberadas`}
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  setAccessModalOpen(true);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "9px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(56, 189, 248, 0.35)",
                  background: "rgba(0, 168, 198, 0.18)",
                  color: "#7DD3FC",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Users size={15} /> Usuários e Acessos ({users.length})
                </span>
                <ChevronUp size={14} />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                logout();
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 10px",
                borderRadius: 10,
                border: "1px solid rgba(248, 113, 113, 0.32)",
                background: "rgba(239, 68, 68, 0.14)",
                color: "#FCA5A5",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <LogOut size={15} /> Sair / Trocar usuário
            </button>
          </div>
        </div>
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
