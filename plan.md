# Control Poker — Plano de implementação

## Abordagem
Construir uma SPA React/TypeScript dentro do starter React/Express/tRPC/Drizzle já inicializado, priorizando uma experiência de painel administrativo navegável e responsiva. A primeira entrega concentra os módulos mais visíveis e interligados: Visão Geral, Dashboard Analítico, Financeiro, Torneios, Cash Game, Ranking, Jackpot, Bar/Consumo, Membros e telas TV de Sorteios/Clocker.

Os dados demonstrativos serão modelados em estado local rico, com seed data realista de clube brasileiro, para permitir uma experiência completa sem bloquear a entrega enquanto o schema de produção é evoluído. A interação de nova transação atualiza KPIs, feed e gráfico financeiro; as telas de torneio, cash game e TV reutilizam os mesmos dados do dashboard.

## Design
- **Estilos considerados:** "SaaS executivo com acento neon" (0.06); "Casino editorial escuro" (0.04); "Operations cockpit minimalista" (0.08).
- **Escolha — SaaS executivo com acento neon:** referência em dashboards B2B premium, com a disciplina visual de Linear/Stripe e pequenos sinais luminosos de uma arena de poker.
- **Princípios:** hierarquia tipográfica forte; densidade informacional com respiro; estados semânticos muito claros; transições curtas e funcionais.
- **Filosofia de cor:** marinho profundo transmite controle e confiança; gelo reduz fadiga; ciano é a assinatura proprietária para ação e conexão; esmeralda/coral comunicam dinheiro sem ambiguidade.
- **Paradigma de layout:** shell de duas camadas: navegação fixa e canvas de operação com cards modulares, linhas de conexão e uma faixa de contexto no topo.
- **Elementos assinatura:** monograma CP em moldura dupla; trilha de conexão entre módulos; chips de status com ponto luminoso.
- **Interação e animação:** hover discreto, entrada suave de cards, mudanças de KPI com transições e modo TV com foco visual total.
- **Tipografia:** Inter como base; números em peso 700/800; títulos curtos e objetivos.
- **Essência da marca:** o cockpit operacional que transforma a complexidade do clube de poker em decisões claras. Personalidade: preciso, confiável, conectado.
- **Voz:** direta, segura e orientada à ação. Exemplos: “Tudo conectado. Nada perdido.” e “Feche o dia sabendo exatamente o que aconteceu.”
- **Wordmark:** “CP” geométrico em duas cartas sobrepostas, seguido de CONTROL POKER em caixa alta com espaçamento técnico.
- **Cor proprietária:** ciano Control `#00A8C6`.

## Estrutura
- `client/src/pages/Home.tsx`: shell, navegação, telas e interações principais.
- `client/src/index.css`: tokens, layout responsivo, componentes visuais e modo TV.
- `client/public/manus-routes.json`: manifesto das rotas SPA.
- `drizzle/schema.ts` e `server/`: base de persistência já preparada; evolução para módulos persistentes fica como próxima etapa.
