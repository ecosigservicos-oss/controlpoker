import { useState, type FormEvent } from "react";
import {
  Check,
  KeyRound,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  APP_MODULES,
  ROLE_PRESETS,
  type AppModuleKey,
  type ClubUser,
} from "@/types/auth";
import { Button } from "@/components/ui/button";

type AccessManagerModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AccessManagerModal({ open, onClose }: AccessManagerModalProps) {
  const { users, isAdmin, createUser, updateUser, deleteUser } = useAuth();

  const [tab, setTab] = useState<"users" | "admin-security">("users");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [selectedModules, setSelectedModules] = useState<AppModuleKey[]>([
    "tournaments",
    "blinds",
  ]);
  const [active, setActive] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  const adminAccount = users.find(u => u.role === "admin");
  const [adminName, setAdminName] = useState(adminAccount?.name ?? "Admin - Unidade Principal");
  const [adminUsername, setAdminUsername] = useState(adminAccount?.username ?? "admin");
  const [adminPassword, setAdminPassword] = useState(adminAccount?.password ?? "123");

  if (!open || !isAdmin) return null;

  const resetForm = () => {
    setEditingUserId(null);
    setName("");
    setUsername("");
    setPassword("");
    setJobTitle("");
    setSelectedModules(["tournaments", "blinds"]);
    setActive(true);
    setFeedback(null);
  };

  const handleStartEdit = (user: ClubUser) => {
    if (user.role === "admin") {
      setTab("admin-security");
      setAdminName(user.name);
      setAdminUsername(user.username);
      setAdminPassword(user.password);
      setFeedback(null);
      return;
    }
    setTab("users");
    setEditingUserId(user.id);
    setName(user.name);
    setUsername(user.username);
    setPassword(user.password);
    setJobTitle(user.jobTitle);
    setSelectedModules([...user.allowedModules]);
    setActive(user.active);
    setFeedback(null);
  };

  const toggleModule = (modKey: AppModuleKey) => {
    setSelectedModules(current =>
      current.includes(modKey)
        ? current.filter(k => k !== modKey)
        : [...current, modKey]
    );
  };

  const handleSaveOperator = (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    if (editingUserId) {
      const res = updateUser(editingUserId, {
        name,
        username,
        password,
        jobTitle,
        allowedModules: selectedModules,
        active,
      });
      if (!res.ok) {
        setFeedback({ type: "err", text: res.error ?? "Erro ao atualizar usuário." });
        return;
      }
      setFeedback({ type: "ok", text: "Permissões e dados do usuário atualizados!" });
      setEditingUserId(null);
      setName("");
      setUsername("");
      setPassword("");
      setJobTitle("");
    } else {
      const res = createUser({
        name,
        username,
        password,
        jobTitle,
        allowedModules: selectedModules,
      });
      if (!res.ok) {
        setFeedback({ type: "err", text: res.error ?? "Erro ao criar usuário." });
        return;
      }
      setFeedback({
        type: "ok",
        text: "Usuário criado! Ele só verá as áreas marcadas abaixo.",
      });
      setName("");
      setUsername("");
      setPassword("");
      setJobTitle("");
    }
  };

  const handleSaveAdminCredentials = (event: FormEvent) => {
    event.preventDefault();
    if (!adminAccount) return;
    const res = updateUser(adminAccount.id, {
      name: adminName,
      username: adminUsername,
      password: adminPassword,
    });
    if (!res.ok) {
      setFeedback({ type: "err", text: res.error ?? "Erro ao atualizar Admin." });
      return;
    }
    setFeedback({ type: "ok", text: "Dados e senha do Administrador atualizados!" });
  };

  const categories: ("Geral" | "Áreas" | "Financeiro" | "Operação")[] = [
    "Geral",
    "Áreas",
    "Financeiro",
    "Operação",
  ];

  return (
    <div
      className="modal-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card"
        style={{
          maxWidth: 880,
          width: "96vw",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div className="modal-heading">
          <div>
            <div className="eyebrow">Controle Exclusivo do Administrador</div>
            <h2>Usuários e Liberação de Acessos</h2>
            <p>
              Você é o responsável geral. Crie contas para a equipe e defina exatamente o que cada pessoa pode ver.
            </p>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              setTab("users");
              setFeedback(null);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 10,
              border: tab === "users" ? "2px solid #00A8C6" : "1px solid #CBD5E1",
              background: tab === "users" ? "#00A8C614" : "#FFFFFF",
              color: "#0F172A",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <Users size={15} /> Equipe e Permissões ({users.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setTab("admin-security");
              setFeedback(null);
              if (adminAccount) {
                setAdminName(adminAccount.name);
                setAdminUsername(adminAccount.username);
                setAdminPassword(adminAccount.password);
              }
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 10,
              border: tab === "admin-security" ? "2px solid #00A8C6" : "1px solid #CBD5E1",
              background: tab === "admin-security" ? "#00A8C614" : "#FFFFFF",
              color: "#0F172A",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <KeyRound size={15} /> Senha do Administrador
          </button>
        </div>

        {feedback && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              marginBottom: 14,
              background: feedback.type === "ok" ? "#ECFDF5" : "#FEF2F2",
              border:
                feedback.type === "ok" ? "1px solid #A7F3D0" : "1px solid #FECACA",
              color: feedback.type === "ok" ? "#065F46" : "#991B1B",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {feedback.text}
          </div>
        )}

        {tab === "admin-security" ? (
          <form onSubmit={handleSaveAdminCredentials} style={{ display: "grid", gap: 14 }}>
            <div
              style={{
                padding: 12,
                borderRadius: 10,
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                fontSize: 13,
                color: "#334155",
              }}
            >
              O perfil <strong>Administrador Geral</strong> possui acesso irrestrito a todas as áreas financeiras, operacionais e de configuração do sistema.
            </div>

            <div className="form-grid">
              <label>
                Nome de exibição do Admin
                <input
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  required
                />
              </label>
              <label>
                Usuário de login do Admin
                <input
                  value={adminUsername}
                  onChange={e => setAdminUsername(e.target.value)}
                  required
                />
              </label>
              <label>
                Senha do Admin
                <input
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  required
                />
              </label>
            </div>

            <div className="modal-actions">
              <Button type="button" variant="outline" onClick={onClose}>
                Fechar
              </Button>
              <Button type="submit" className="primary-button">
                Salvar dados do Admin
              </Button>
            </div>
          </form>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
              gap: 18,
              alignItems: "start",
            }}
          >
            <div
              style={{
                border: "1px solid #E2E8F0",
                borderRadius: 14,
                padding: 14,
                background: "#F8FAFC",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <strong style={{ fontSize: 14, color: "#0F172A" }}>
                  Usuários Cadastrados
                </strong>
                {editingUserId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#00A8C6",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    + Novo usuário
                  </button>
                )}
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {users.map(user => {
                  const isRoot = user.role === "admin";
                  const isEditing = editingUserId === user.id;
                  return (
                    <div
                      key={user.id}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "#FFFFFF",
                        border: isEditing
                          ? "2px solid #00A8C6"
                          : "1px solid #E2E8F0",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 8,
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <strong style={{ fontSize: 14, color: "#0F172A" }}>
                              {user.name}
                            </strong>
                            {isRoot ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  background: "#071E36",
                                  color: "#38BDF8",
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                }}
                              >
                                <ShieldCheck size={11} /> ADMIN TOTAL
                              </span>
                            ) : user.active ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  background: "#DCFCE7",
                                  color: "#166534",
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                }}
                              >
                                <UserCheck size={11} /> Ativo
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  background: "#FEE2E2",
                                  color: "#991B1B",
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                }}
                              >
                                <UserX size={11} /> Bloqueado
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                            Login: <strong>{user.username}</strong> · {user.jobTitle}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(user)}
                            style={{
                              padding: "4px 9px",
                              borderRadius: 8,
                              border: "1px solid #CBD5E1",
                              background: "#F8FAFC",
                              color: "#0F172A",
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Editar
                          </button>
                          {!isRoot && (
                            <button
                              type="button"
                              className="icon-button"
                              title="Excluir usuário"
                              onClick={() => {
                                deleteUser(user.id);
                                if (editingUserId === user.id) resetForm();
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 4,
                        }}
                      >
                        {isRoot ? (
                          <span style={{ fontSize: 11.5, color: "#0284C7", fontWeight: 600 }}>
                            Acesso irrestrito a todas as áreas e configurações
                          </span>
                        ) : user.allowedModules.length === 0 ? (
                          <span style={{ fontSize: 11.5, color: "#DC2626", fontWeight: 600 }}>
                            Nenhuma tela liberada
                          </span>
                        ) : (
                          user.allowedModules.map(modKey => {
                            const info = APP_MODULES.find(m => m.key === modKey);
                            return (
                              <span
                                key={modKey}
                                style={{
                                  padding: "2px 7px",
                                  borderRadius: 6,
                                  background: "#E0F2FE",
                                  color: "#0369A1",
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                              >
                                {info?.label ?? modKey}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <form
              onSubmit={handleSaveOperator}
              style={{
                border: "1px solid #E2E8F0",
                borderRadius: 14,
                padding: 16,
                background: "#FFFFFF",
                display: "grid",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <strong style={{ fontSize: 15, color: "#0F172A" }}>
                  {editingUserId ? "Editar Permissões do Usuário" : "Novo Usuário da Equipe"}
                </strong>
                {editingUserId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#64748B",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Cancelar edição
                  </button>
                )}
              </div>

              <div className="form-grid">
                <label>
                  Nome completo
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex.: Lucas Ferreira"
                    required
                  />
                </label>
                <label>
                  Cargo / Função
                  <input
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    placeholder="Ex.: Operador de Caixa"
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Usuário para login
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Ex.: lucas.caixa"
                    required
                  />
                </label>
                <label>
                  Senha de acesso
                  <input
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Defina uma senha"
                    required
                  />
                </label>
              </div>

              <div>
                <span className="eyebrow" style={{ display: "block", marginBottom: 6 }}>
                  Perfis rápidos (preenche as telas)
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ROLE_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedModules([...preset.modules]);
                        if (!jobTitle.trim()) setJobTitle(preset.jobTitle);
                      }}
                      style={{
                        padding: "5px 9px",
                        borderRadius: 8,
                        border: "1px solid #CBD5E1",
                        background: "#F8FAFC",
                        color: "#0F172A",
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedModules([])}
                    style={{
                      padding: "5px 9px",
                      borderRadius: 8,
                      border: "1px solid #FECACA",
                      background: "#FEF2F2",
                      color: "#991B1B",
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Desmarcar tudo
                  </button>
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                    O que este usuário pode ver ({selectedModules.length} de {APP_MODULES.length})
                  </span>
                </div>

                <div
                  style={{
                    maxHeight: 250,
                    overflowY: "auto",
                    border: "1px solid #E2E8F0",
                    borderRadius: 10,
                    padding: 10,
                    display: "grid",
                    gap: 10,
                    background: "#F8FAFC",
                  }}
                >
                  {categories.map(cat => {
                    const mods = APP_MODULES.filter(m => m.category === cat);
                    return (
                      <div key={cat}>
                        <div
                          style={{
                            fontSize: 10.5,
                            fontWeight: 800,
                            letterSpacing: "0.08em",
                            color: "#64748B",
                            textTransform: "uppercase",
                            marginBottom: 6,
                          }}
                        >
                          {cat}
                        </div>
                        <div style={{ display: "grid", gap: 6 }}>
                          {mods.map(mod => {
                            const checked = selectedModules.includes(mod.key);
                            return (
                              <button
                                key={mod.key}
                                type="button"
                                onClick={() => toggleModule(mod.key)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 8,
                                  padding: "7px 10px",
                                  borderRadius: 8,
                                  border: checked
                                    ? "1.5px solid #00A8C6"
                                    : "1px solid #CBD5E1",
                                  background: checked ? "#00A8C614" : "#FFFFFF",
                                  textAlign: "left",
                                  cursor: "pointer",
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                      fontSize: 12.5,
                                      fontWeight: 700,
                                      color: "#0F172A",
                                    }}
                                  >
                                    <span>{mod.label}</span>
                                    {mod.sensitive && (
                                      <span
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 3,
                                          padding: "1px 6px",
                                          borderRadius: 999,
                                          background: "#FEF3C7",
                                          color: "#92400E",
                                          fontSize: 10,
                                          fontWeight: 700,
                                        }}
                                      >
                                        <Lock size={9} /> Restrito Admin
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 11, color: "#64748B" }}>
                                    {mod.description}
                                  </div>
                                </div>

                                <span
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 6,
                                    border: checked
                                      ? "none"
                                      : "1.5px solid #94A3B8",
                                    background: checked ? "#00A8C6" : "#FFFFFF",
                                    color: "#FFFFFF",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  {checked && <Check size={13} />}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {editingUserId && (
                <label
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: "#0F172A",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={e => setActive(e.target.checked)}
                    style={{ width: 16, height: 16, margin: 0 }}
                  />
                  <span>Usuário ativo (desmarque para bloquear o login deste usuário)</span>
                </label>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <Button type="submit" className="primary-button">
                  <Plus size={15} />
                  {editingUserId ? "Salvar permissões" : "Criar usuário com estas permissões"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
