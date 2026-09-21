# Raptor Mobile — Avaliação de Refatoração

**Autor:** Engenheiro de Software Mobile Sênior (review)
**Escopo:** `raptor-mobile` (Expo / React Native) + superfície de integração com `ford-hub` (API Java Spring Boot)
**Status:** Plano executado — itens P0 e Quick Wins (Fase 1) concluídos; continuam como recomendações as fases 2–4 (arquitetura, design system, produtização).

---

## 1. Resumo Executivo

O `raptor-mobile` é um app Expo/React Native bem-intencionado que já atinge um MVP: roteamento baseado em arquivos, três contextos globais, separação de componentes no padrão Atomic Design e uma camada de serviços com um cliente HTTP real além de um modo offline com mocks. A modelagem de domínio (veículos, specs, comparativo, radar) é clara e a UI é coesa.

No entanto, o projeto está em **estado de protótipo "se passando por produção"**. Os problemas mais graves não são estéticos — são bugs de correção e integração que causarão falhas reais contra a API Java:

1. **O JWT nunca é anexado ao cliente HTTP.** O `setAuthToken` existe mas nunca é chamado, então todo endpoint autenticado (`/comparisons`) falhará após a primeira requisição.
2. **O contrato de tipo de `id` está quebrado.** O app trata ids como strings/slugs enquanto o backend usa `Integer`, produzindo `NaN` e `400/404` nas chamadas de comparativo e de detalhe.
3. **A lógica de "vencedor" do comparativo está morta** — o adapter fixa `winnerId: null`, então o recurso central (comparativo competitivo) nunca destaca um vencedor.
4. **A ficha técnica descarta silenciosamente a maior parte dos dados do backend** — apenas specs de motor e suspensão são mapeadas.

Além disso, **não há runner de testes, linter, CI nem script de type-check**, e o tratamento de erros é basicamente `console.error` + `alert`.

A boa notícia: o código é pequeno e as fronteiras são, em sua maioria, sensatas. Um refactor focado em 4 fases pode levá-lo de "demo" para "produto manutenível" sem reescrita. Veja a §6.

---

## 2. Panorama (Snapshot)

| Área | Estado atual |
|---|---|
| Framework | Expo ~54, React Native 0.81, React 19, Expo Router 6 (rotas tipadas) |
| Linguagem | TypeScript, `strict: true`, alias de caminho `@/*` configurado mas **não utilizado** |
| Estado | 3 Contextos: `AuthContext`, `VehicleContext`, `ThemeContext` |
| Dados | Singleton de `axios` + hook `useSpecs` por tela, flags manuais de loading/erro |
| Persistência | `AsyncStorage` (histórico/config/favoritos), `expo-secure-store` (token/usuário) |
| UI | Pastas Atomic Design (`atoms`/`molecules`/`organisms`) + StyleSheets inline |
| Backend | Spring Boot REST (`/auth`, `/vehicles`, `/brands`, `/compare`, `/comparisons`) |
| Testes | **Nenhum** (apenas plano manual em `plans/test-plan.md`) |
| Ferramentas (tooling) | Sem ESLint, Prettier, testes, typecheck ou CI |
| Artefatos de build | `dist/` presente no workspace (ignorado no git) |

---

## 3. Problemas Críticos (P0 — corrigir antes de qualquer release)

### P0-1 — O token de autenticação nunca é injetado no `apiClient`
- O `setAuthToken` é definido em `services/apiClient.ts:16` mas **não possui nenhuma chamada** (verificado em todo o código).
- O `AuthContext` persiste o token no `SecureStore` (`context/AuthContext.tsx:58`) e o restaura na inicialização (`:34`), porém nunca chama `setAuthToken` no login, logout ou rehidratação.
- **Impacto:** os endpoints do `ComparisonController` (`/comparisons`) exigem autenticação (`SecurityConfig.java:41`). O app não envia o header `Authorization`, então salvar/listar/excluir comparativos resultará em 401/403. Ao reiniciar o app, mesmo os endpoints que funcionavam perdem o header.
- **Correção:** adicionar interceptors de requisição/resposta no `apiClient`; chamar `setAuthToken` no `AuthProvider` no mount, no `signIn` e no `signOut`. Tratar 401 globalmente (limpar a sessão e redirecionar para o login).

### P0-2 — Divergência de contrato do `Vehicle.id` (`string` vs `Integer`)
- Mobile: `types/vehicle.ts:2` declara `id: string`. Backend: `VehicleController.findById(@PathVariable Integer id)`.
- O `HomeScreen` sintetiza um id slug quando o lookup falha: `"${brand}-${model}-${version}-2024"` (`app/(tabs)/index.tsx:103`).
- `compare.tsx:45` faz `parseInt(comparisonList[0].id)` → `NaN` para qualquer id slug.
- `specsApi.compareVehicles` envia `ids: ids.join(',')` (`services/specsApi.ts:108`); o Spring faz o bind de `List<Integer>` e rejeita valores não numéricos.
- **Impacto:** modelos não-Ford resolvidos pelo histórico podem navegar para `/screens/specs/<slug>` → `GET /vehicles/<slug>` → 400; comparativos geram payloads com `NaN` silenciosamente.
- **Correção:** tornar `id` um `number` de ponta a ponta. Parar de gerar ids slug — se um veículo não puder ser resolvido, exibir um estado explícito de "não encontrado" em vez de fabricar um identificador. Persistir o id numérico do backend no histórico.

### P0-3 — Lógica de vencedor do comparativo está morta + conclusão hardcoded
- `adaptCompareResponse` sempre grava `winnerId: null` (`utils/apiAdapters.ts:77`), e o `SpecRow` do backend não possui campo de vencedor.
- O `CompareScreen` mapeia os vencedores a partir desse valor sempre nulo (`app/(tabs)/compare.tsx:156`), então o `CompareRow` nunca destaca um vencedor.
- O texto "Conclusão Comparativa" está **hardcoded como "Ford Raptor"** independentemente dos veículos comparados (`compare.tsx:170-172`).
- **Impacto:** o recurso principal não funciona e, pior, é enganoso em um contexto de vendas.
- **Correção:** calcular o vencedor deterministicamente no cliente a partir dos valores normalizados das specs (respeitando campos "menor é melhor", como o `INVERTED_FIELDS` do backend), ou fazer o backend retornar `winnerId`. Gerar a conclusão a partir dos dados reais ou removê-la.

### P0-4 — O adapter da ficha técnica descarta a maior parte dos dados do backend
- `adaptVehicleDetail` mapeia apenas `engineSpecs` e `suspensionSpecs` (`utils/apiAdapters.ts:20-47`).
- O `VehicleDetailResponse` também expõe `drivetrainSpecs`, `dimensions`, `warranty` e os `vehicleFeatures` do veículo (`ford-hub/.../VehicleDetailResponse.java:8-14`).
- **Impacto:** a "Ficha Técnica" é materialmente incompleta em relação aos dados disponíveis; `completeness` está fixado em `100` apesar das categorias ausentes.
- **Correção:** implementar um adapter dirigido por tabela/mapeamento cobrindo todas as fontes de spec (idealmente dirigido pelos mesmos dados de `SpecCategoryMap` que o backend usa) e calcular a completude real.

### P0-5 — `USE_MOCKS` é `true` por padrão
- `config/env.ts:8-9` ativa os mocks quando a variável de ambiente está ausente.
- **Impacto:** um build de produção/standalone envia silenciosamente dados de mock (`Ford Ranger Raptor`, `Ram 1500`, JWT falso).
- **Correção:** definir `false` como padrão; exigir `EXPO_PUBLIC_USE_MOCKS=true` explícito para desenvolvimento offline. Mover os mocks para fora de `specsApi.ts` para um módulo dedicado `mocks/`.

### P0-6 — Sem scripts de lint / typecheck / teste
- `package.json:5-10` define apenas `start`, `android`, `ios`, `web`. Sem `test`, `lint`, `typecheck`, `format`.
- Não existe uma única automação de teste; `plans/test-plan.md` é um roteiro de QA manual.
- **Impacto:** regressões como P0-1..P0-4 passaram despercebidas; não há rede de segurança para trabalhos futuros.
- **Correção:** adicionar ESLint + Prettier + `tsc --noEmit`, Jest + React Native Testing Library e um workflow de CI. Configurar Husky/lint-staged.

---

## 4. Problemas de Alta Prioridade (P1)

### P1-1 — Fetch de dados é manual, duplicado e sem cache
- O `useSpecs` (`hooks/useSpecs.ts`) recria o estado por componente e chama `loadBrands()` a cada mount (`:12-14`). A tela inicial e qualquer outro consumidor buscam independentemente.
- `getModels`/`getVersions` buscam a coleção inteira de `/vehicles` e filtram no cliente (`services/specsApi.ts:61-85`) — duas rodadas extras de collection completa por busca.
- **Recomendação:** adotar TanStack Query (ou SWR) para cache, retries, stale-while-revalidate e deduplicação de requisições. Manter hooks `useXQuery` finos por recurso. Considerar endpoints de backend para `/brands/{brand}/models` e `/{brand}/{model}/versions`, ou buscar `/vehicles` uma vez e cachear.

### P1-2 — Tipagem fraca, `any` generalizado
- `specsApi.login(...): Promise<any>` (`:22`), adapters recebem `dto: any` (`utils/apiAdapters.ts:8,20,52`), storage retorna `any` implícito, telas usam `history: any[]` (`app/(tabs)/index.tsx:33`, `history.tsx:13`).
- **Recomendação:** tipar todos os DTOs, substituir `any` por interfaces concretas e adicionar validação em runtime (Zod) na fronteira da API, para que a divergência de contrato do backend falhe rápido e de forma visível.

### P1-3 — Efeitos colaterais dentro do updater de estado
- O `VehicleContext.addToComparison` chama `alert(...)` dentro do updater de `setComparisonList` (`context/VehicleContext.tsx:22-27`). O React pode invocar updaters mais de uma vez (StrictMode/renders concorrentes), produzindo alerts duplicados, e acopla a UI à lógica de estado.
- **Recomendação:** calcular a próxima lista fora do updater, retornar metadados (ex.: `removedVehicle`) e deixar o chamador decidir sobre o feedback de UI. Preferir toast a `alert`.

### P1-4 — Navegação não é protegida
- A proteção de rotas é apenas um redirect na splash (`app/index.tsx:22-30`). Deep links ou navegação por "back" podem chegar a `(tabs)` sem sessão válida, e o backend nem sempre é consultado.
- **Recomendação:** dividir as rotas em grupos `(auth)` e `(app)` com um layout guard que leia `useAuth().isLoading` e redirecione usuários não autenticados. Validar o token armazenado, não apenas sua presença.

### P1-5 — `ThemeContext` é uma constante superengenhada
- O provider monta um objeto a partir de imports estáticos e nunca muda (`context/ThemeContext.tsx:16-29`). Adiciona indireção sem troca de tema, e os componentes ainda usam valores fixos (`padding: 24`, `gap: 16`, `fontSize: 16`, `borderRadius: 4`).
- **Recomendação:** ou remover o context e importar os tokens diretamente, ou transformá-lo em um tema real (light/dark, preferência persistida, `useColorScheme`). Impedir números mágicos — apenas tokens.

### P1-6 — Anti-padrão de animação
- `app/index.tsx:12` cria `new Animated.Value(0)` a cada render em vez de usar `useRef`. Isso vaza/recria o valor da animação.
- **Correção:** `const fadeAnim = useRef(new Animated.Value(0)).current;` e adicionar deps corretas.

### P1-7 — Higiene e segurança
- O `.env` na árvore de trabalho contém um IP LAN hardcoded e credenciais de dev (`EXPO_PUBLIC_DEV_EMAIL/PASSWORD`). O `.env` é ignorado pelo git, mas o padrão de embutir credenciais em bundles (`EXPO_PUBLIC_*` é embutido no cliente) é inseguro.
- `getBrands` loga respostas cruas da API (`services/specsApi.ts:47`) — remover logging de produção / conduzir por um logger.
- `escapeHtml` (`utils/sanitize.ts`) **nunca é usado**; a geração de PDF injeta valores da API diretamente no HTML (`app/screens/specs/[id].tsx:43-56`). Usá-lo (e validar) antes de `Print.printToFileAsync`.

---

## 5. Problemas Médios e Baixos (P2/P3)

### P2
- **Deriva do Atomic Design:** `components/ErrorState.tsx` está na raiz e **nunca é usado**; `components/organisms/BottomNav.tsx` é **código morto** (o layout de abas usa o `Tabs` do Expo Router); os barrel exports são inconsistentes e alguns componentes são importados por caminho direto (`SearchForm` → `../molecules/SearchDropdown`) enquanto os barrels existem.
- **Scaffolding de telas duplicado:** header/back-bar, card, empty state e skeletons são copiados e colados entre telas com objetos de estilo inline grandes. Extrair `Screen`, `AppHeader`, `Card`, `EmptyState`, `PrimaryButton`.
- **Sem i18n:** strings em português estão hardcoded por todo o código; não há catálogo central de strings.
- **Acessibilidade:** apenas o `BottomNav` define `accessibilityRole`/`State`; a maioria dos `TouchableOpacity` não tem labels/roles.
- **`alert()` como UX:** usado como feedback em `VehicleContext`, `compare.tsx`, `settings.tsx`, `[id].tsx` em vez de toasts/estados inline.
- **Mocks embutidos no service de produção:** `MOCK_VEHICLES`, `delay` e a lógica de branching vivem dentro do `specsApi.ts`; extrair para `mocks/` e injetar via interface de repositório.
- **Chaves de lista instáveis:** `keyExtractor={(item, index) => `${item.id}-${index}`}` (`index.tsx:218`, `history.tsx:92`) prejudica a virtualização/reconciliação. Usar `item.id` + `createdAt`.
- **Falhas silenciosas:** `storageService` engole erros e retorna `null` (`services/storageService.ts:80,88`); sem alerta/telemetria.
- **Modelo de favoritos frágil:** favoritos armazenam ids contra itens do histórico; itens que saem do histórico desaparecem do filtro "Favoritos", e não há toggle de favorito na tela de ficha.
- **Features-stub apresentadas como reais:** `detectProfile` é lógica de mock local (`services/specsApi.ts:134-148`); o status da API em Configurações está hardcoded como "Operacional" (`settings.tsx:120`); "Alterar Senha"/"alterar foto" são stubs de `alert`.

### P3
- Dependências não utilizadas: `expo-notifications`, `expo-linking`, `@react-navigation/bottom-tabs` (apenas um type em código morto), provavelmente `expo-constants`. Por outro lado, não há biblioteca de fetch de dados/formulários.
- Sem CI/CD, sem perfis de build EAS, sem processo de release/versionamento.
- Sem error boundary; o único componente de erro não é usado.
- `app.json`: sem `scheme` (deep linking), sem splash image, ícone adaptativo sem `foregroundImage` (`app.json:17-23`).
- Saída de build `dist/` presente no workspace; garantir que permaneça ignorada e seja limpa.
- O README afirma suporte "offline", mas offline é apenas mock — não há estratégia de cache/sync.

---

## 6. Arquitetura Alvo Proposta

```
raptor-mobile/
├── app/                         # apenas roteamento (telas finas)
│   ├── (auth)/                  # login, esqueci-senha — pública
│   ├── (app)/                   # grupo protegido com layout guard de auth
│   │   ├── (tabs)/              # busca, comparativo, histórico, config
│   │   └── specs/[id].tsx
│   └── _layout.tsx
├── src/
│   ├── features/               # feature-first: vehicles, compare, auth, history
│   │   └── <feature>/{api,hooks,components,types}
│   ├── api/                    # instância axios + interceptors + tipos DTO gerados
│   ├── ui/                     # design system (atoms/molecules/organisms) + tokens
│   ├── lib/                    # storage, secure-store, i18n, logger, env
│   └── mocks/                  # handlers MSW / repositórios mock
└── tests/
```

Princípios-chave:
1. **Rotas finas, módulos de feature** assumem a lógica. Telas devem compor, não conter fetch de dados + regras de negócio.
2. **Uma única camada de dados:** funções de repositório tipadas envolvidas por hooks do TanStack Query (cache, retry, dedup).
3. **Uma única fronteira de API:** `apiClient` com interceptors de auth/401/logging e respostas validadas com Zod.
4. **Ids numéricos de ponta a ponta.**
5. **Tokens de design reais** consumidos por primitivas de UI compartilhadas; sem números mágicos.
6. **Pirâmide de testes:** unit (utils/adapters), componente (RNTL), integração (MSW), E2E (Maestro).

---

## 7. Roadmap em Fases (sugerido)

### Fase 1 — Correção e Segurança (1–2 semanas) — obrigatório para lançar
- [x] Conectar `setAuthToken` + interceptor de 401 (P0-1)
- [x] Normalizar ids para `number`; remover fallback de slug (P0-2)
- [x] Corrigir cálculo de vencedor e remover conclusão hardcoded (P0-3)
- [x] Completar o adapter de detalhe de specs, calcular completude real (P0-4)
- [x] Padrão `USE_MOCKS=false`; extrair mocks (P0-5)
- [x] Adicionar scripts `lint`, `typecheck`, `test` + esqueleto de CI (P0-6)
- [x] Escapar HTML no export de PDF; remover logging de produção (P1-7)

### Fase 2 — Arquitetura e Dados (2–3 semanas)
- [ ] Introduzir `src/features/*`, telas finas
- [ ] Adicionar TanStack Query + camada de repositórios tipada; cache do catálogo de veículos
- [ ] Tipar todos os DTOs + validação Zod na fronteira (P1-2)
- [ ] Grupos de rota protegidos `(auth)`/`(app)` com guard (P1-4)
- [ ] Refatorar efeitos colaterais do `VehicleContext` para estado puro (P1-3)

### Fase 3 — Design System e Qualidade (2–3 semanas)
- [ ] Extrair `Screen`, `AppHeader`, `Card`, `EmptyState`, `PrimaryButton`; usar apenas tokens (P1-5, P2)
- [ ] Tema real (light/dark) ou remover o context
- [ ] Catálogo i18n
- [ ] Passada de acessibilidade
- [ ] Remover código morto (`BottomNav`, deps não usadas, `ErrorState` não usado ou conectá-lo) (P2/P3)
- [ ] Testes unit + componente para adapters, contexts e telas-chave

### Fase 4 — Produtização (contínua)
- [ ] Comparativos salvos na UI (os endpoints do backend já existem)
- [ ] Estratégia offline-first de cache/sync
- [ ] Error boundary + observabilidade (Sentry)
- [ ] Pipeline de build/release EAS, ícones/splash corretos, `scheme` de deep linking
- [ ] Testes de contrato do backend para evitar divergência

---

## 8. Quick Wins (< 1 dia cada)

1. Adicionar scripts `typecheck`/`lint`/`test` e um workflow de CI. ✅ (scripts adicionados)
2. `setAuthToken` no mount/login/logout do `AuthContext`. ✅
3. Padrão `USE_MOCKS=false`. ✅
4. Corrigir `fadeAnim` para `useRef` em `app/index.tsx`. ✅
5. Usar `escapeHtml` na geração de PDF. ✅
6. Deletar `BottomNav.tsx` morto e deps não usadas. ✅
7. Substituir chaves de lista baseadas em índice por ids estáveis. ✅
8. Remover `console.log` de respostas da API. ✅
9. Corrigir a conclusão "Ford Raptor" hardcoded no `CompareScreen`. ✅

---

## 9. Definition of Done para a Refatoração

- Nenhum item P0/P1 em aberto.
- CI verde com lint, typecheck e testes em todo PR.
- Todas as respostas da API validadas em runtime; ids numéricos de ponta a ponta.
- Fluxos autenticados verificados contra a API Java real (não mocks).
- Tokens do design system usados exclusivamente; sem números mágicos nas telas.
- Cobertura de testes: ≥70% em adapters/utils/contexts, smoke tests nas telas principais.