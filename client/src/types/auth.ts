export type AppModuleKey =
  | "dashboard"
  | "balances"
  | "tournaments"
  | "cash"
  | "bar"
  | "finance"
  | "reports"
  | "members"
  | "ranking"
  | "tv-clock" | "tv-draw"
  | "satellites"
  | "blinds"
  | "jackpot"
  | "settings";

export type UserRole = "admin" | "operator";

export type AppModuleInfo = {
  key: AppModuleKey;
  label: string;
  sidebarLabels: string[];
  category: "Geral" | "Áreas" | "Financeiro" | "Operação";
  sensitive?: boolean;
  description: string;
};

export type ClubUser = {
  id: string;
  name: string;
  username: string;
  password: string;
  role: UserRole;
  jobTitle: string;
  allowedModules: AppModuleKey[];
  active: boolean;
  createdAt: string;
};

export const APP_MODULES: AppModuleInfo[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    sidebarLabels: ["Dashboard", "Visão Geral"],
    category: "Geral",
    description: "Resumo operacional do clube e atalhos rápidos.",
  },
  {
    key: "balances",
    label: "Gestão de Saldos",
    sidebarLabels: ["Gestão de Saldos"],
    category: "Geral",
    sensitive: true,
    description: "Controle de créditos, fichas e saldos de jogadores.",
  },
  {
    key: "tournaments",
    label: "Torneios",
    sidebarLabels: ["Torneios"],
    category: "Áreas",
    description: "Inscrições, buy-ins, rebuys, add-ons e premiação.",
  },
  {
    key: "cash",
    label: "Cash Game",
    sidebarLabels: ["Cash Game"],
    category: "Áreas",
    description: "Mesas de cash game, entradas e controle de fichas.",
  },
  {
    key: "bar",
    label: "Bar / Consumo",
    sidebarLabels: ["Bar / Consumo"],
    category: "Áreas",
    description: "Pedidos de copa, bebidas, comandas e consumo.",
  },
  {
    key: "finance",
    label: "Financeiro",
    sidebarLabels: ["Financeiro"],
    category: "Financeiro",
    sensitive: true,
    description: "Entradas, saídas, fluxo de caixa e fechamento financeiro.",
  },
  {
    key: "reports",
    label: "Relatórios",
    sidebarLabels: ["Relatórios"],
    category: "Financeiro",
    sensitive: true,
    description: "Relatórios gerenciais, faturamento e histórico.",
  },
  {
    key: "members",
    label: "Membros / Jogadores",
    sidebarLabels: ["Membros / Jogadores"],
    category: "Operação",
    description: "Cadastro e consulta de jogadores do clube.",
  },
  {
    key: "ranking",
    label: "Ranking",
    sidebarLabels: ["Ranking"],
    category: "Operação",
    description: "Pontuação e classificação da temporada.",
  },
  {
    key: "tv-draw",
    label: "Sorteios / Clocker (Modo TV)",
    sidebarLabels: ["Sorteios (Modo TV)", "Clocker (Modo TV)"],
    category: "Operação",
    description: "Telão de blinds, relógio e sorteio de mesas.",
  },
  {
    key: "satellites",
    label: "Satélites",
    sidebarLabels: ["Satélites"],
    category: "Operação",
    description: "Torneios classificatórios e vagas garantidas.",
  },
  {
    key: "blinds",
    label: "Estruturas de Blinds",
    sidebarLabels: ["Estruturas de Blinds"],
    category: "Operação",
    description: "Níveis de blinds, tempo por nível e fichas padrão.",
  },
  {
    key: "jackpot",
    label: "Jackpot",
    sidebarLabels: ["Jackpot"],
    category: "Operação",
    description: "Acumulado de jackpot e regras de premiação.",
  },
  {
    key: "settings",
    label: "Configurações",
    sidebarLabels: ["Configurações"],
    category: "Operação",
    sensitive: true,
    description: "Configurações gerais do sistema e unidade.",
  },
];

export const ALL_MODULE_KEYS: AppModuleKey[] = APP_MODULES.map(m => m.key);

export const ROLE_PRESETS: {
  id: string;
  label: string;
  jobTitle: string;
  modules: AppModuleKey[];
}[] = [
  {
    id: "floor",
    label: "Diretor de Torneio",
    jobTitle: "Diretor de Torneio / Floor",
    modules: ["dashboard", "tournaments", "blinds", "tv-clock", "tv-draw", "satellites", "ranking"],
  },
  {
    id: "cashier",
    label: "Operador de Caixa",
    jobTitle: "Operador de Caixa",
    modules: ["dashboard", "tournaments", "cash", "members"],
  },
  {
    id: "bar",
    label: "Bar / Copa",
    jobTitle: "Atendente Bar / Consumo",
    modules: ["bar", "members"],
  },
  {
    id: "tv",
    label: "Operador TV",
    jobTitle: "Operador Clocker & TV",
    modules: ["tv-clock", "tv-draw", "blinds", "ranking"],
  },
];


