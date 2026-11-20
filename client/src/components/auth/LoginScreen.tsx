import { useState, type FormEvent } from "react";
import { Eye, EyeOff, KeyRound, Lock, ShieldCheck, Spade, User } from "lucide-react";
import { DEFAULT_ADMIN_USER, useAuth } from "@/context/AuthContext";

export function LoginScreen() {
  const { login, isUsingDefaultAdminPassword } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const result = login(username, password);
    if (!result.ok && result.error) {
      setError(result.error);
    }
  };

  const handleQuickFillAdmin = () => {
    setUsername(DEFAULT_ADMIN_USER.username);
    setPassword(DEFAULT_ADMIN_USER.password);
    setError("");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background:
          "radial-gradient(circle at top right, #0D355C 0%, #071E36 48%, #041222 100%)",
        color: "#F8FAFC",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          background: "#0B2540",
          border: "1px solid rgba(0, 168, 198, 0.28)",
          borderRadius: 20,
          padding: 32,
          boxShadow: "0 24px 60px rgba(2, 10, 22, 0.65)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: "linear-gradient(135deg, #00A8C6 0%, #0284C7 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              boxShadow: "0 8px 20px rgba(0, 168, 198, 0.35)",
            }}
          >
            <Spade size={24} />
          </div>
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "0.06em",
                color: "#FFFFFF",
              }}
            >
              CONTROL POKER
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.14em",
                color: "#38BDF8",
                textTransform: "uppercase",
              }}
            >
              Gestão de Clubes · Acesso Restrito
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px", color: "#FFFFFF" }}>
            Entrar no sistema
          </h1>
          <p style={{ fontSize: 13.5, color: "#94A3B8", margin: 0, lineHeight: 1.5 }}>
            Cada usuário visualiza apenas as áreas liberadas pelo Administrador do clube.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 15 }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12.5,
                fontWeight: 600,
                color: "#CBD5E1",
                marginBottom: 6,
              }}
            >
              Usuário ou E-mail
            </label>
            <div style={{ position: "relative" }}>
              <User
                size={16}
                color="#64748B"
                style={{
                  position: "absolute",
                  left: 13,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                autoComplete="username"
                autoFocus
                required
                style={{
                  width: "100%",
                  height: 44,
                  paddingLeft: 38,
                  paddingRight: 14,
                  borderRadius: 11,
                  border: "1px solid rgba(148, 163, 184, 0.28)",
                  background: "#061729",
                  color: "#FFFFFF",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 12.5,
                fontWeight: 600,
                color: "#CBD5E1",
                marginBottom: 6,
              }}
            >
              Senha
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={16}
                color="#64748B"
                style={{
                  position: "absolute",
                  left: 13,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                required
                style={{
                  width: "100%",
                  height: 44,
                  paddingLeft: 38,
                  paddingRight: 42,
                  borderRadius: 11,
                  border: "1px solid rgba(148, 163, 184, 0.28)",
                  background: "#061729",
                  color: "#FFFFFF",
                  fontSize: 14,
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#94A3B8",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(239, 68, 68, 0.14)",
                border: "1px solid rgba(248, 113, 113, 0.4)",
                color: "#FCA5A5",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              height: 46,
              marginTop: 4,
              borderRadius: 11,
              border: "none",
              background: "linear-gradient(135deg, #00A8C6 0%, #0284C7 100%)",
              color: "#FFFFFF",
              fontSize: 14.5,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 10px 24px rgba(0, 168, 198, 0.3)",
            }}
          >
            <KeyRound size={16} /> Entrar no Sistema
          </button>
        </form>

        {isUsingDefaultAdminPassword && (
          <div
            style={{
              marginTop: 22,
              padding: 14,
              borderRadius: 12,
              background: "rgba(0, 168, 198, 0.1)",
              border: "1px solid rgba(0, 168, 198, 0.28)",
              fontSize: 12.5,
              color: "#CBD5E1",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 700,
                  color: "#38BDF8",
                }}
              >
                <ShieldCheck size={15} /> Primeiro acesso (Administrador)
              </span>
              <button
                type="button"
                onClick={handleQuickFillAdmin}
                style={{
                  padding: "4px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(56, 189, 248, 0.45)",
                  background: "rgba(56, 189, 248, 0.14)",
                  color: "#7DD3FC",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Preencher Admin
              </button>
            </div>
            <div>
              Usuário: <strong style={{ color: "#FFFFFF" }}>admin</strong> · Senha:{" "}
              <strong style={{ color: "#FFFFFF" }}>123</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
