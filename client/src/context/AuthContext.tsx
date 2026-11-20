import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ALL_MODULE_KEYS,
  type AppModuleKey,
  type ClubUser,
} from "@/types/auth";

const USERS_STORAGE_KEY = "controlpoker_users_v1";
const SESSION_STORAGE_KEY = "controlpoker_session_user_id_v1";

export const DEFAULT_ADMIN_USER: ClubUser = {
  id: "usr-admin-root",
  name: "Admin - Unidade Principal",
  username: "admin",
  password: "123",
  role: "admin",
  jobTitle: "Administrador Geral",
  allowedModules: ALL_MODULE_KEYS,
  active: true,
  createdAt: "20/11/2026",
};

type CreateUserInput = {
  name: string;
  username: string;
  password: string;
  jobTitle: string;
  allowedModules: AppModuleKey[];
};

type AuthContextValue = {
  users: ClubUser[];
  currentUser: ClubUser | null;
  isAdmin: boolean;
  isUsingDefaultAdminPassword: boolean;
  login: (username: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  hasAccess: (module: AppModuleKey) => boolean;
  createUser: (input: CreateUserInput) => { ok: boolean; error?: string };
  updateUser: (
    userId: string,
    updates: Partial<Omit<ClubUser, "id" | "role" | "createdAt">>
  ) => { ok: boolean; error?: string };
  deleteUser: (userId: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadInitialUsers(): ClubUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return [DEFAULT_ADMIN_USER];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [DEFAULT_ADMIN_USER];
    }
    const hasRootAdmin = parsed.some((u: ClubUser) => u.role === "admin");
    return hasRootAdmin ? parsed : [DEFAULT_ADMIN_USER, ...parsed];
  } catch {
    return [DEFAULT_ADMIN_USER];
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<ClubUser[]>(loadInitialUsers);
  const [sessionUserId, setSessionUserId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SESSION_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch {
      // ignore storage errors
    }
  }, [users]);

  useEffect(() => {
    try {
      if (sessionUserId) {
        localStorage.setItem(SESSION_STORAGE_KEY, sessionUserId);
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, [sessionUserId]);

  const currentUser = useMemo(() => {
    if (!sessionUserId) return null;
    const found = users.find(u => u.id === sessionUserId && u.active);
    return found ?? null;
  }, [users, sessionUserId]);

  const isAdmin = currentUser?.role === "admin";

  const rootAdmin = useMemo(
    () => users.find(u => u.role === "admin") ?? DEFAULT_ADMIN_USER,
    [users]
  );

  const isUsingDefaultAdminPassword =
    rootAdmin.username === DEFAULT_ADMIN_USER.username &&
    rootAdmin.password === DEFAULT_ADMIN_USER.password;

  const login = (username: string, password: string) => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();
    if (!cleanUser || !cleanPass) {
      return { ok: false, error: "Informe o usuário e a senha." };
    }

    const found = users.find(
      u => u.username.trim().toLowerCase() === cleanUser && u.password === cleanPass
    );

    if (!found) {
      return { ok: false, error: "Usuário ou senha inválidos." };
    }

    if (!found.active) {
      return {
        ok: false,
        error: "Este usuário está desativado. Peça liberação ao Administrador.",
      };
    }

    setSessionUserId(found.id);
    return { ok: true };
  };

  const logout = () => {
    setSessionUserId(null);
  };

  const hasAccess = (module: AppModuleKey): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    return currentUser.allowedModules.includes(module);
  };

  const createUser = (input: CreateUserInput) => {
    if (!isAdmin) {
      return { ok: false, error: "Somente o Administrador pode criar usuários." };
    }
    const cleanUsername = input.username.trim().toLowerCase();
    const cleanName = input.name.trim();
    const cleanPassword = input.password.trim();

    if (!cleanName || !cleanUsername || !cleanPassword) {
      return { ok: false, error: "Preencha nome, usuário e senha." };
    }

    const duplicate = users.some(
      u => u.username.trim().toLowerCase() === cleanUsername
    );
    if (duplicate) {
      return { ok: false, error: "Já existe um usuário com este login." };
    }

    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, "0")}/${String(
      now.getMonth() + 1
    ).padStart(2, "0")}/${now.getFullYear()}`;

    const newUser: ClubUser = {
      id: `usr-${Date.now()}`,
      name: cleanName,
      username: cleanUsername,
      password: cleanPassword,
      role: "operator",
      jobTitle: input.jobTitle.trim() || "Operador do Clube",
      allowedModules: input.allowedModules,
      active: true,
      createdAt: formattedDate,
    };

    setUsers(current => [...current, newUser]);
    return { ok: true };
  };

  const updateUser = (
    userId: string,
    updates: Partial<Omit<ClubUser, "id" | "role" | "createdAt">>
  ) => {
    if (!isAdmin) {
      return { ok: false, error: "Somente o Administrador pode alterar permissões." };
    }

    if (updates.username) {
      const cleanUsername = updates.username.trim().toLowerCase();
      const duplicate = users.some(
        u => u.id !== userId && u.username.trim().toLowerCase() === cleanUsername
      );
      if (duplicate) {
        return { ok: false, error: "Este nome de usuário já está em uso." };
      }
    }

    setUsers(current =>
      current.map(user => {
        if (user.id !== userId) return user;
        return {
          ...user,
          ...updates,
          username: updates.username ? updates.username.trim().toLowerCase() : user.username,
          name: updates.name ? updates.name.trim() : user.name,
          jobTitle: updates.jobTitle !== undefined ? updates.jobTitle.trim() : user.jobTitle,
          allowedModules:
            user.role === "admin"
              ? ALL_MODULE_KEYS
              : updates.allowedModules ?? user.allowedModules,
          active: user.role === "admin" ? true : updates.active ?? user.active,
        };
      })
    );

    return { ok: true };
  };

  const deleteUser = (userId: string) => {
    if (!isAdmin) return;
    setUsers(current =>
      current.filter(u => !(u.id === userId && u.role !== "admin"))
    );
  };

  return (
    <AuthContext.Provider
      value={{
        users,
        currentUser,
        isAdmin,
        isUsingDefaultAdminPassword,
        login,
        logout,
        hasAccess,
        createUser,
        updateUser,
        deleteUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
