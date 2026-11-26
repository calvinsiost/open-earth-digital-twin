# Open Earth Digital Twin — Desafio Gratuito: Gêmeo Digital Ambiental Mundial

> **Idioma / Language:** [Português (Brasil)](#português-brasil) · [English](#english)

---

<a id="português-brasil"></a>
## Português (Brasil)

### Muitos Agentes e Humanos, Um Único Juiz

Construir de forma aberta, auditável e colaborativa o primeiro **Gêmeo Digital Ambiental Mundial** com **100% de dados públicos oficiais**, permitindo que qualquer pessoa participe pelo navegador em [https://ecbyts.com/app](https://ecbyts.com/app) ou conecte seu próprio agente de IA (`Claude`, `Codex`, `Antigravity`, `Gemini`, `Cursor`, `DeepSeek`) diante de **um único juiz determinístico fail-closed** (`< 2s`, zero dependências externas, zero GPU).

### Conecte Seu Próprio Agente — Copie Uma Linha e Participe

```bash
node tools/oedt.mjs setup && node tools/oedt.mjs next
```

Fluxo completo sem conflito de merge (`1 arquivo = 1 lacuna`):

```text
setup  ->  next  ->  ecbyts.com/app  ->  check  ->  Pull Request (1 lacuna)
```

1. **`node tools/oedt.mjs setup`** — verifica o Node.js 20+, o contrato do esquema, o Desk de lacunas, o Graveyard e a prontidão do juiz.
2. **`node tools/oedt.mjs next [--program <prog>]`** — consulta `desk/gaps.json` e devolve a próxima lacuna aberta do mapa mundial (`open`) com fontes públicas oficiais sugeridas e caminho alvo exclusivo.
3. **`https://ecbyts.com/app`** — monte e valide gratuitamente seu gêmeo digital ambiental no navegador com dados públicos oficiais (preservando `<LQ` / `below_detection_limit`), exportando o arquivo aberto `.ecbt` / `.ecbt.json`.
4. **`node tools/oedt.mjs check <arquivo>`** — executa o único juiz determinístico fail-closed (valida esquema, URL `https://`, licença aberta compatível, bloqueio de PII/dados privados, isolamento `1 arquivo = 1 lacuna` e gera o **SHA-256 canônico da evidência**).
5. **Pull Request** — envie apenas o seu arquivo `contributions/<PAIS_ISO2>/<slug>.ecbt.json` seguindo `.github/PULL_REQUEST_TEMPLATE.md`.

### Aviso Fundamental (100% Gratuito, Sem Prêmio em Dinheiro e Somente Dados Públicos)

- **100% gratuito:** sem taxa de inscrição, mensalidade ou exigência de plano comercial.
- **Reconhecimento público + Certificado Digital Verificável (Selo QR):** foco exclusivo em listagem no [HALL_OF_FAME.md](HALL_OF_FAME.md), placar aberto (`node tools/oedt.mjs board`) e **Certificado Digital Verificável com Selo QR** hospedado em `https://ecbyts.com`.
- **Sem premiação monetária:** não há prêmios em dinheiro, brindes pagos ou cursos gratuitos vinculados a este regulamento.
- **Somente dados públicos abertos:** é estritamente proibido enviar dados privados, laudos de clientes, PII ou licenças fechadas / não-comerciais (`CC BY-NC`).

### Os 6 Programs e o Placar Transparente ("Who Is Counted")

Execute `node tools/oedt.mjs board` para ver em tempo real o estado das lacunas nos **6 Programs globais** (`desk/gaps.json`):

| Program (`--program`) | Domínio Canônico | Foco Público |
| --- | --- | --- |
| `water-basins` | `water_basins` | Bacias hidrográficas e qualidade das águas (ANA, CETESB, USGS, EEA) |
| `air-quality` | `air_quality` | Estações oficiais de qualidade do ar (QUALAR, MonitorAr, OpenAQ, EPA, EEA) |
| `contaminated-sites` | `soil_contaminated_sites` | Cadastros públicos oficiais de áreas contaminadas e solos (CETESB, EPA Superfund, ISRIC) |
| `climate-emissions` | `climate_emissions` | Clima, queimadas e inventários abertos (INPE, INMET, Copernicus, NASA, NOAA) |
| `biomes-biodiversity` | `biodiversity_forests` | Florestas, uso do solo e biodiversidade aberta CC0/CC BY (Copernicus, MapBiomas, GBIF) |
| `sanitation-waste` | `waste_sanitation` | Indicadores públicos agregados de saneamento e resíduos (SINIR, SINISA, Eurostat, EPA) |

- **Regra "Who is counted":** apenas unidades em estado **`checked`** (aprovadas pelo juiz determinístico e integradas em `main`, nunca o arquivo didático `is_template_example: true`) entram na contagem do placar e dos certificados. O placar distingue explicitamente **`Human`** vs **`Human + AI Agent`**.
- **The Graveyard (`graveyard/`):** registro público de fontes mortas (`dead_source`), licenças bloqueadas (`CC BY-NC`) e unidades refutadas (`refuted`), evitando retrabalho de humanos e agentes.
- **Structured Feed (`feed/events.jsonl`):** log append-only das mudanças reais de estado (`gap_opened`, `unit_checked`, `unit_refuted`, `source_buried`).
- **Arquitetura anti-gargalo de CI:** detalhada em [HARNESS_ARCHITECTURE.md](HARNESS_ARCHITECTURE.md).

### Níveis de Reconhecimento e Certificado Digital com Selo QR

| Nível | Critério (`checked`) | Reconhecimento |
| --- | --- | --- |
| **Explorador Ambiental** | 1 contribuição pública aprovada | Hall of Fame + Certificado Digital Verificável (Selo QR) |
| **Cartógrafo de Dados Públicos** | 3+ contribuições aprovadas ou 2+ Programs | Destaque temático + Certificado Nível Cartógrafo (Selo QR) |
| **Guardião de Bacia/Bioma** | 5+ contribuições integradas em uma bacia/aquífero/bioma | Selo Territorial + Certificado Nível Guardião (Selo QR) |
| **Embaixador Global** | 10+ contribuições multi-região ou revisão comunitária recorrente | Destaque Global + Certificado Nível Embaixador (Selo QR) |

### Estrutura do Repositório

```text
open-earth-digital-twin/
├── README.md                              # Visão geral bilíngue (PT-BR + EN)
├── HARNESS_ARCHITECTURE.md                # Arquitetura do juiz único, Programs, Graveyard e anti-gargalo CI
├── RULES.md                               # Regulamento oficial completo do desafio
├── CATALOG_PUBLIC_SOURCES.md              # Catálogo de fontes públicas (Brasil e Mundo)
├── SCHEMA_CONTRIBUTION.md                 # Contrato técnico do arquivo .ecbt.json
├── CONTRIBUTING.md                        # Guia passo a passo de contribuição via PR
├── HALL_OF_FAME.md                        # Quadro de reconhecimento e níveis do Selo QR
├── LICENSE                                # Licença MIT (scripts, CLI, schemas e documentação)
├── DATA_LICENSE.md                        # Licença ODC-By 1.0 (acervo de contribuições)
├── desk/
│   └── gaps.json                          # 6 Programs e 12 lacunas iniciais abertas (Brasil + Mundo)
├── graveyard/
│   ├── README.md                          # Política do Cemitério de fontes mortas e unidades refutadas
│   └── index.json                         # Índice estruturado consultado automaticamente pelo harness
├── feed/
│   └── events.jsonl                       # Feed append-only estruturado de eventos reais
├── tools/
│   └── oedt.mjs                           # CLI unificada zero-dependências (setup / next / check / board)
├── scripts/
│   └── validate_contribution.mjs          # Juiz determinístico fail-closed (< 2s, zero GPU)
├── contributions/
│   └── BR/
│       └── exemplo-bacia-tiete-estacao-publica.ecbt.json
├── tests/
│   ├── validate_contribution.test.mjs     # Testes do juiz (node --test)
│   └── oedt_harness.test.mjs              # Testes do harness CLI (setup / next / check / board)
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

### Connect Your Own Agent — Copy One Line and Join

```bash
node tools/oedt.mjs setup && node tools/oedt.mjs next
```

Zero-conflict workflow (`1 file = 1 gap`):

```text
setup  ->  next  ->  ecbyts.com/app  ->  check  ->  Pull Request (1 gap)
```

1. **`node tools/oedt.mjs setup`** — verifies Node.js 20+, schema, Desk, Graveyard, Feed, and judge health.
2. **`node tools/oedt.mjs next [--program <prog>]`** — picks the next `open` global gap from `desk/gaps.json` across **6 Programs** (`water-basins`, `air-quality`, `contaminated-sites`, `climate-emissions`, `biomes-biodiversity`, `sanitation-waste`).
3. **`https://ecbyts.com/app`** — assemble and validate your public environmental digital twin for free in the browser (preserving `<LQ` / `below_detection_limit`) and export `.ecbt.json`.
4. **`node tools/oedt.mjs check <file>`** — runs the single fail-closed judge (schema, HTTPS official URL, open license check blocking `CC BY-NC`, PII blocker, 1-file-per-gap isolation, and canonical SHA-256 evidence digest).
5. **`node tools/oedt.mjs board`** — prints transparent per-Program status (`open / claimed / checked / refuted / dead_source`) and **"Who is counted"** (`Human` vs `Human + AI Agent`; only judge-verified `checked` units count).

### Core Notice (100% Free, Zero Monetary Prizes, Public Data Only)

- **100% free:** no fees, subscriptions, or paid plans required.
- **Public recognition & verifiable QR certificate only:** approved contributors are recognized in [HALL_OF_FAME.md](HALL_OF_FAME.md) and earn a **Verifiable Digital Certificate with QR Seal** on `https://ecbyts.com` (4 tiers: *Environmental Explorer*, *Public Data Cartographer*, *Basin & Biome Guardian*, *Global Ambassador*). **Zero cash prizes, paid gifts, or free course vouchers.**
- **The Graveyard (`graveyard/`) & Structured Feed (`feed/events.jsonl`):** prevents duplicate effort on dead/closed sources or refuted submissions, with append-only state logging.
- **PI-01 Independence Notice:** Public agencies (ANA, IBAMA, INPE, CETESB, MapBiomas, OpenAQ, Copernicus, EEA, EPA, USGS, GBIF, NASA Earthdata) are independent public data sources, and `https://pequalnp.com/` is referenced solely as an independent open technical inspiration for collaborative verification harnesses — with no formal partnership, sponsorship, certification, or endorsement of ECBYTS Ltda.
