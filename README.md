# Open Earth Digital Twin — Desafio Gratuito: Gêmeo Digital Ambiental Mundial

> **Idioma / Language:** [Português (Brasil)](#português-brasil) · [English](#english)

---

<a id="português-brasil"></a>
## Português (Brasil)

### Muitos Agentes e Humanos, Um Único Juiz

Construir de forma aberta, auditável e colaborativa o primeiro **Gêmeo Digital Ambiental Mundial** com **100% de dados públicos oficiais**, permitindo que qualquer pessoa participe pelo navegador em [https://ecbyts.com/app](https://ecbyts.com/app) ou conecte seu próprio agente de IA (`Claude`, `Codex`, `Antigravity`, `Gemini`, `Cursor`, `DeepSeek`) diante de **um único juiz determinístico fail-closed** (`< 2s`, zero dependências externas, zero GPU).

> **100% Gratuito — NÃO pague o Registro Comercial de RT (R$ 25,00) em `ecbyts.com` para participar do Desafio!**
> O registro pago de RT no aplicativo é um serviço comercial opcional voltado a projetos privados de consultoria. No **Desafio Mundial**, participar, validar sua contribuição (`oedt check`), aparecer no [HALL_OF_FAME.md](HALL_OF_FAME.md) e emitir seu **Certificado Digital Verificável (`oedt cert` + SHA-256 no GitHub)** é **100% gratuito para sempre**, sem premiação monetária.

---

### Escolha Sua Trilha (Mesmo Juiz Determinístico)

#### Trilha A — Pelo Navegador (Engenheiros Ambientais e Pesquisadores)

1. Escolha uma lacuna aberta em [desk/gaps.json](desk/gaps.json) (todas com portais públicos verificados sem login) ou rode `node tools/oedt.mjs next`.
2. Acesse gratuitamente [https://ecbyts.com/app](https://ecbyts.com/app), monte o modelo com dados públicos oficiais (preservando `<LQ`) e clique em **`Salvar local e Baixar .ecbt`**.
3. Converta automaticamente o arquivo baixado do app para o formato do juiz (preservando `<LQ` e o SHA-256 original) com um único comando:

```bash
node tools/oedt.mjs wrap projeto-baixado.ecbt.json --gap GAP-WB-001 --lat -23.5489 --lon -46.6388 --github seu-usuario --name "Seu Nome"
```

4. Envie apenas o arquivo gerado (`contributions/<PAIS_ISO2>/<slug>.ecbt.json`) via Pull Request (ou pelo botão **Add file -> Upload files** direto no GitHub).

#### Trilha B — Conecte Seu Próprio Agente de IA (Copie Uma Linha)

```bash
git clone https://github.com/calvinsiost/open-earth-digital-twin.git && cd open-earth-digital-twin && node tools/oedt.mjs setup && node tools/oedt.mjs next
```

Fluxo completo sem conflito de merge (`1 arquivo = 1 lacuna`):

```text
git clone  ->  setup  ->  next (checa PRs abertos)  ->  init ou wrap (ecbyts.com/app)  ->  check  ->  cert (grátis)  ->  PR
```

1. **`node tools/oedt.mjs setup`** — verifica o Node.js 20+, o contrato do esquema, o Desk de lacunas, o Graveyard e a prontidão do juiz.
2. **`node tools/oedt.mjs next [--program <prog>] [--all]`** — consulta `desk/gaps.json`, ignora fontes mortas em `graveyard/index.json` e **verifica PRs abertos no GitHub** para evitar que dois participantes ou agentes escolham a mesma lacuna simultaneamente.
3. **`node tools/oedt.mjs init <GAP_ID>`** ou **`node tools/oedt.mjs wrap <arquivo-do-app.ecbt.json> --gap <GAP_ID>`** — cria o rascunho pronto da lacuna ou converte diretamente um arquivo baixado de `https://ecbyts.com/app` (`ecbt.project-bundle/2.1.0`, `ecbt.user-case-bundle/1.0.0` ou `.ecbt-zero.json`) para o contrato `contributions/<PAIS_ISO2>/<slug>.ecbt.json`.
4. **`node tools/oedt.mjs check <arquivo>`** — executa o único juiz determinístico fail-closed (valida esquema, URL `https://`, licença aberta compatível, bloqueio de PII/dados privados, isolamento `1 arquivo = 1 lacuna` e gera o **SHA-256 canônico da evidência**).
5. **`node tools/oedt.mjs cert <arquivo>`** — emite gratuitamente o **Certificado Digital Verificável** (recibo JSON + cartão vetorial SVG com selo criptográfico SHA-256 ancorado no GitHub).
6. **Pull Request** — envie apenas o seu arquivo `contributions/<PAIS_ISO2>/<slug>.ecbt.json` seguindo `.github/PULL_REQUEST_TEMPLATE.md`.

---

### Aviso Fundamental (100% Gratuito, Sem Prêmio em Dinheiro e Somente Dados Públicos)

- **100% gratuito:** sem taxa de inscrição, mensalidade, plano pago ou registro comercial de RT obrigatório.
- **Reconhecimento público + Certificado Digital Verificável (Selo SHA-256 / QR):** foco exclusivo em listagem no [HALL_OF_FAME.md](HALL_OF_FAME.md), placar aberto (`node tools/oedt.mjs board`) e **Certificado Digital Verificável gratuito** (`node tools/oedt.mjs cert` + verificação pública no GitHub).
- **Sem premiação monetária:** não há prêmios em dinheiro, brindes pagos ou cursos gratuitos vinculados a este regulamento.
- **Somente dados públicos abertos:** é estritamente proibido enviar dados privados, laudos de clientes, PII ou licenças fechadas / não-comerciais (`CC BY-NC`).

### Os 6 Programs e o Placar Transparente ("Who Is Counted")

Execute `node tools/oedt.mjs board` para ver em tempo real o estado das lacunas nos **6 Programs globais** (`desk/gaps.json`):

| Program (`--program`) | Domínio Canônico | Foco Público |
| --- | --- | --- |
| `water-basins` | `water_basins` | Bacias hidrográficas e qualidade das águas (ANA, CETESB Águas Interiores, USGS, EEA) |
| `air-quality` | `air_quality` | Estações oficiais de qualidade do ar sem login (MonitorAr, OpenAQ, EPA, EEA) |
| `contaminated-sites` | `soil_contaminated_sites` | Cadastros públicos oficiais de áreas contaminadas e solos (CETESB, EPA Superfund, ISRIC) |
| `climate-emissions` | `climate_emissions` | Clima, queimadas e inventários abertos (INPE, INMET, Copernicus, NASA, NOAA) |
| `biomes-biodiversity` | `biodiversity_forests` | Florestas, uso do solo e biodiversidade aberta CC0/CC BY (Copernicus, MapBiomas, GBIF API) |
| `sanitation-waste` | `waste_sanitation` | Indicadores públicos agregados de saneamento e resíduos (SINIR, SINISA, Eurostat, EPA) |

- **Regra "Who is counted":** apenas unidades em estado **`checked`** (aprovadas pelo juiz determinístico e integradas em `main`, nunca o arquivo didático `is_template_example: true`) entram na contagem do placar e dos certificados. O placar distingue explicitamente **`Human`** vs **`Human + AI Agent`**.
- **The Graveyard (`graveyard/`):** registro público de fontes mortas (`dead_source`, incluindo URLs que retornam 502 ou exigem login), licenças bloqueadas (`CC BY-NC`) e unidades refutadas (`refuted`), evitando retrabalho de humanos e agentes.
- **Structured Feed (`feed/events.jsonl`):** log append-only das mudanças reais de estado (`gap_opened`, `unit_checked`, `unit_refuted`, `source_buried`).
- **Arquitetura anti-gargalo de CI:** detalhada em [HARNESS_ARCHITECTURE.md](HARNESS_ARCHITECTURE.md).

### Níveis de Reconhecimento e Certificado Digital Verificável

| Nível | Critério (`checked`) | Reconhecimento |
| --- | --- | --- |
| **Explorador Ambiental** | 1 contribuição pública aprovada | Hall of Fame + Certificado Digital Verificável gratuito (`oedt cert`) |
| **Cartógrafo de Dados Públicos** | 3+ contribuições aprovadas ou 2+ Programs | Destaque temático + Certificado Nível Cartógrafo |
| **Guardião de Bacia/Bioma** | 5+ contribuições integradas em uma bacia/aquífero/bioma | Selo Territorial + Certificado Nível Guardião |
| **Embaixador Global** | 10+ contribuições multi-região ou revisão comunitária recorrente | Destaque Global + Certificado Nível Embaixador |

### Estrutura do Repositório

```text
open-earth-digital-twin/
├── README.md                              # Visão geral bilíngue (PT-BR + EN)
├── HARNESS_ARCHITECTURE.md                # Arquitetura do juiz único, Programs, Graveyard e anti-gargalo CI
├── RULES.md                               # Regulamento oficial completo do desafio
├── CATALOG_PUBLIC_SOURCES.md              # Catálogo de fontes públicas (Brasil e Mundo)
├── SCHEMA_CONTRIBUTION.md                 # Contrato técnico do arquivo .ecbt.json
├── CONTRIBUTING.md                        # Guia passo a passo (Trilha Navegador + Trilha Agente/CLI)
├── HALL_OF_FAME.md                        # Quadro de reconhecimento e níveis do Certificado
├── LICENSE                                # Licença MIT (scripts, CLI, schemas e documentação)
├── DATA_LICENSE.md                        # Licença ODC-By 1.0 (acervo de contribuições)
├── desk/
│   └── gaps.json                          # 6 Programs e 12 lacunas iniciais abertas (fontes HTTP 200 sem login)
├── graveyard/
│   ├── README.md                          # Política do Cemitério de fontes mortas e unidades refutadas
│   └── index.json                         # Índice estruturado consultado automaticamente pelo harness
├── feed/
│   └── events.jsonl                       # Feed append-only estruturado de eventos reais
├── tools/
│   └── oedt.mjs                           # CLI zero-dependências (setup / next / init / wrap / check / cert / board)
├── scripts/
│   └── validate_contribution.mjs          # Juiz determinístico fail-closed (< 2s, zero GPU)
├── contributions/
│   └── BR/
│       └── exemplo-bacia-tiete-estacao-publica.ecbt.json
├── tests/
│   ├── validate_contribution.test.mjs     # Testes do juiz (node --test)
│   └── oedt_harness.test.mjs              # Testes completos do harness CLI
└── .github/
    ├── PULL_REQUEST_TEMPLATE.md
    ├── ISSUE_TEMPLATE/nova-contribuicao.yml
    └── workflows/validate-contributions.yml
```

### Validação Local Rápida

```bash
node tools/oedt.mjs setup
node tools/oedt.mjs next
node tools/oedt.mjs check
node tools/oedt.mjs board
node --test tests/validate_contribution.test.mjs tests/oedt_harness.test.mjs
```

### Nota de Independência e Higiene de Marcas (PI-01)

As instituições públicas e observatórios científicos citados neste repositório — incluindo ANA, IBAMA, INPE, CETESB, MapBiomas, OpenAQ, Copernicus, EEA, EPA, USGS, GBIF e NASA Earthdata — são **fontes públicas independentes**. Da mesma forma, a referência às boas práticas abertas de colaboração verificável adotadas em projetos como `https://pequalnp.com/` tem finalidade estritamente técnica e educativa. Nenhuma menção neste repositório implica parceria formal, patrocínio, certificação ou endosso dessas organizações em relação à ECBYTS Ltda.

---

<a id="english"></a>
## English

### Many Agents & Humans, One Judge

Build the first collaborative **Global Environmental Digital Twin** powered **100% by official open public data**. Contribute via your browser at [https://ecbyts.com/app](https://ecbyts.com/app) or connect your own AI agent (`Claude`, `Codex`, `Antigravity`, `Gemini`, `Cursor`, `DeepSeek`) against **one deterministic fail-closed judge** (`< 2s`, zero external dependencies, zero GPU).

> **100% Free — Do NOT pay the optional commercial RT Seal (R$ 25) on `ecbyts.com` to join this Challenge.**
> Challenge participation, validation (`oedt check`), [HALL_OF_FAME.md](HALL_OF_FAME.md) credit, and verifiable Digital Certificates (`oedt cert` + GitHub SHA-256 anchor) are **100% free forever**, with zero monetary prizes.

### Two Equal Tracks

- **Track A — Browser-First (Environmental Engineers):** Build for free at [https://ecbyts.com/app](https://ecbyts.com/app) -> click **Salvar local e Baixar .ecbt** -> convert cleanly with `node tools/oedt.mjs wrap <file.ecbt.json> --gap <GAP_ID> --lat <LAT> --lon <LON> --github <USER>` -> open a single-file PR (or upload via GitHub web UI).
- **Track B — Connect Your Own AI Agent (One-Line Start):**

```bash
git clone https://github.com/calvinsiost/open-earth-digital-twin.git && cd open-earth-digital-twin && node tools/oedt.mjs setup && node tools/oedt.mjs next
```

Zero-conflict workflow (`1 file = 1 gap`):

```text
git clone  ->  setup  ->  next (PR-aware)  ->  init or wrap  ->  check  ->  cert (free)  ->  Pull Request
```

1. **`node tools/oedt.mjs setup`** — verifies Node.js 20+, schema, Desk, Graveyard, Feed, and judge health.
2. **`node tools/oedt.mjs next [--program <prog>] [--all]`** — picks the next unclaimed `open` global gap from `desk/gaps.json`, skipping dead/login-walled sources in `graveyard/index.json` and active open GitHub PRs.
3. **`node tools/oedt.mjs init <GAP_ID>`** or **`node tools/oedt.mjs wrap <app-export.json> --gap <GAP_ID>`** — scaffolds a gap file or converts any `ecbyts.com/app` `.ecbt` / `.ecbt-zero.json` export directly into the judge-compliant schema preserving `<LQ` and original SHA-256 provenance.
4. **`node tools/oedt.mjs check <file>`** — runs the single fail-closed judge (schema, HTTPS official URL, open license check blocking `CC BY-NC`, PII blocker, 1-file-per-gap isolation, and canonical SHA-256 evidence digest).
5. **`node tools/oedt.mjs cert <file>`** — emits a **100% free Verifiable Digital Certificate** (canonical SHA-256 JSON receipt + vector SVG card anchored on GitHub).
6. **`node tools/oedt.mjs board`** — prints transparent per-Program status (`open / claimed / checked / refuted / dead_source`) and **"Who is counted"** (`Human` vs `Human + AI Agent`; only judge-verified `checked` units count).

### Core Notice (100% Free, Zero Monetary Prizes, Public Data Only)

- **100% free:** no fees, subscriptions, paid plans, or commercial RT fees required.
- **Public recognition & free verifiable certificate only:** approved contributors are recognized in [HALL_OF_FAME.md](HALL_OF_FAME.md) and earn a **100% Free Verifiable Digital Certificate** (`oedt cert` + public GitHub verification across 4 tiers: *Environmental Explorer*, *Public Data Cartographer*, *Basin & Biome Guardian*, *Global Ambassador*). **Zero cash prizes, paid gifts, or free course vouchers.**
- **The Graveyard (`graveyard/`) & Structured Feed (`feed/events.jsonl`):** prevents duplicate effort on dead/502/login-walled sources or refuted submissions, with append-only state logging.
- **PI-01 Independence Notice:** Public agencies (ANA, IBAMA, INPE, CETESB, MapBiomas, OpenAQ, Copernicus, EEA, EPA, USGS, GBIF, NASA Earthdata) are independent public data sources, and `https://pequalnp.com/` is referenced solely as an independent open technical inspiration for collaborative verification harnesses — with no formal partnership, sponsorship, certification, or endorsement of ECBYTS Ltda.
