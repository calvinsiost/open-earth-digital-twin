# Open Earth Digital Twin — Free Global Environmental Digital Twin Challenge

> **Language / Idioma:** [English](#english) · [Português (Brasil)](#português-brasil)

---

<a id="english"></a>
## English

### Many Agents & Humans, One Judge

Build the first collaborative **Global Environmental Digital Twin** powered **100% by official open public data across all 6 inhabited continents** (South America, North America, Europe, Africa, Asia, and Oceania). Contribute via your browser at [https://ecbyts.com/app](https://ecbyts.com/app) or connect your own AI agent (`Claude`, `Codex`, `Antigravity`, `Gemini`, `Cursor`, `DeepSeek`) against **one deterministic fail-closed judge** (`< 2s`, zero external dependencies, zero GPU).

> **100% Free Worldwide — Never purchase any optional commercial registration or seal on `ecbyts.com` to join this Challenge.**
> Challenge participation, validation (`oedt check`), [HALL_OF_FAME.md](HALL_OF_FAME.md) credit, and verifiable Digital Certificates (`oedt cert --lang en|pt|bilingual` + GitHub SHA-256 anchor) are **100% free forever**, with zero monetary prizes.

### Two Equal Tracks

- **Track A — Browser-First (Environmental Engineers & Researchers):** Pick any open gap in [desk/gaps.json](desk/gaps.json) -> build for free at [https://ecbyts.com/app](https://ecbyts.com/app) -> download `.ecbt.json` -> convert cleanly with `node tools/oedt.mjs wrap <file.ecbt.json> --gap <GAP_ID> --lat <LAT> --lon <LON> --github <USER>` -> open a single-file PR (or upload via GitHub web UI).
- **Track B — Connect Your Own AI Agent (One-Line Start):**

```bash
git clone https://github.com/calvinsiost/open-earth-digital-twin.git && cd open-earth-digital-twin && node tools/oedt.mjs setup && node tools/oedt.mjs next
```

Zero-conflict workflow (`1 file = 1 gap`):

```text
git clone  ->  setup  ->  next (PR-aware)  ->  init or wrap  ->  check  ->  cert (free)  ->  Pull Request
```

1. **`node tools/oedt.mjs setup`** — verifies Node.js 20+, schema, Desk (19 global gaps across 12 countries & 6 continents), Graveyard, Feed, and judge health.
2. **`node tools/oedt.mjs next [--program <prog>] [--all]`** — picks the next unclaimed `open` global gap from `desk/gaps.json`, skipping dead/login-walled sources in `graveyard/index.json` and active open GitHub PRs.
3. **`node tools/oedt.mjs init <GAP_ID>`** or **`node tools/oedt.mjs wrap <app-export.json> --gap <GAP_ID>`** — scaffolds a gap file or converts any `ecbyts.com/app` `.ecbt` / `.ecbt-zero.json` export directly into the judge-compliant schema preserving `<LQ` (`below_detection_limit`) and original SHA-256 provenance.
4. **`node tools/oedt.mjs check <file>`** — runs the single fail-closed judge (schema, HTTPS official URL, open license check blocking `CC BY-NC`, PII blocker, 1-file-per-gap isolation, and canonical SHA-256 evidence digest).
5. **`node tools/oedt.mjs cert <file> [--lang en|pt|bilingual]`** — emits a **100% free Verifiable Digital Certificate** (canonical SHA-256 JSON receipt + vector SVG card anchored on GitHub).
6. **`node tools/oedt.mjs board`** — prints transparent per-Program status (`open / claimed / checked / refuted / dead_source`) and **"Who is counted"** (`Human` vs `Human + AI Agent`; only judge-verified `checked` units count).

### 6 Global Programs (12 Countries · All 6 Inhabited Continents)

| Program (`--program`) | Canonical Domain | Open Public Data Focus |
| --- | --- | --- |
| `water-basins` | `water_basins` | River basins & hydrological stations (USGS, Wateroffice Canada, ANA, CETESB, EEA) |
| `air-quality` | `air_quality` | Login-free official ambient air stations (OpenAQ, Soramame Japan, EEA, MonitorAr, EPA) |
| `contaminated-sites` | `soil_contaminated_sites` | Public statutory contaminated-land registers (US EPA Superfund, data.gov.au, CETESB, IBAMA) |
| `climate-emissions` | `climate_emissions` | Open meteorology, wildfire & GHG baselines (NOAA NCEI, Copernicus, INPE, INMET) |
| `biomes-biodiversity` | `biodiversity_forests` | Open forest cover & CC0/CC BY biodiversity (GBIF API v1, Copernicus, MapBiomas) |
| `sanitation-waste` | `waste_sanitation` | Aggregated municipal waste & sanitation indicators (Eurostat, SINIR, SINISA, EPA) |

### Core Notice (100% Free, Zero Monetary Prizes, Public Data Only)

- **100% free worldwide:** no fees, subscriptions, paid plans, or optional commercial registration fees required.
- **Public recognition & free verifiable certificate only:** approved contributors are recognized in [HALL_OF_FAME.md](HALL_OF_FAME.md) and earn a **100% Free Verifiable Digital Certificate** (`oedt cert` + public GitHub verification across 4 tiers: *Environmental Explorer*, *Public Data Cartographer*, *Basin & Biome Guardian*, *Global Ambassador*). **Zero cash prizes, paid gifts, or free course vouchers.**
- **The Graveyard (`graveyard/`) & Structured Feed (`feed/events.jsonl`):** prevents duplicate effort on dead/502/login-walled sources or refuted submissions, with append-only state logging.
- **PI-01 Independence Notice:** Public agencies (USGS, Wateroffice Canada, US EPA, NOAA, Soramame Japan, data.gov.au, Eurostat, EEA, Copernicus, GBIF, OpenAQ, ANA, IBAMA, INPE, CETESB, MapBiomas) are independent public data sources, and `https://pequalnp.com/` is referenced solely as an independent open technical inspiration for collaborative verification harnesses — with no formal partnership, sponsorship, certification, or endorsement of ECBYTS Ltda.

---

<a id="português-brasil"></a>
## Português (Brasil)

### Muitos Agentes e Humanos, Um Único Juiz

Construir de forma aberta, auditável e colaborativa o primeiro **Gêmeo Digital Ambiental Mundial** com **100% de dados públicos oficiais nos 6 continentes habitados** (América do Sul, América do Norte, Europa, África, Ásia e Oceania), permitindo que qualquer pessoa participe pelo navegador em [https://ecbyts.com/app](https://ecbyts.com/app) ou conecte seu próprio agente de IA (`Claude`, `Codex`, `Antigravity`, `Gemini`, `Cursor`, `DeepSeek`) diante de **um único juiz determinístico fail-closed** (`< 2s`, zero dependências externas, zero GPU).

> **100% Gratuito no Mundo Todo — NÃO é necessário contratar nenhum registro ou selo comercial pago em `ecbyts.com` para participar do Desafio!**
> O registro comercial opcional no aplicativo existe apenas para projetos privados de consultoria. No **Desafio Mundial**, participar, validar sua contribuição (`oedt check`), aparecer no [HALL_OF_FAME.md](HALL_OF_FAME.md) e emitir seu **Certificado Digital Verificável (`oedt cert --lang pt` + SHA-256 no GitHub)** é **100% gratuito para sempre**, sem premiação monetária.

### Escolha Sua Trilha (Mesmo Juiz Determinístico)

#### Trilha A — Pelo Navegador (Engenheiros Ambientais e Pesquisadores)

1. Escolha uma lacuna aberta em [desk/gaps.json](desk/gaps.json) (todas com portais públicos verificados sem login) ou rode `node tools/oedt.mjs next`.
2. Acesse gratuitamente [https://ecbyts.com/app](https://ecbyts.com/app), monte o modelo com dados públicos oficiais (preservando `<LQ`) e exporte o arquivo `.ecbt.json`.
3. Converta automaticamente o arquivo baixado do app para o formato do juiz (preservando `<LQ` e o SHA-256 original) com um único comando:

```bash
node tools/oedt.mjs wrap projeto-baixado.ecbt.json --gap GAP-WB-001 --lat -23.5489 --lon -46.6388 --github seu-usuario --name "Seu Nome"
```

4. Emita seu certificado gratuito (`node tools/oedt.mjs cert <arquivo> --lang pt`) e envie apenas o arquivo gerado (`contributions/<PAIS_ISO2>/<slug>.ecbt.json`) via Pull Request (ou pelo botão **Add file -> Upload files** direto no GitHub).

#### Trilha B — Conecte Seu Próprio Agente de IA (Copie Uma Linha)

```bash
git clone https://github.com/calvinsiost/open-earth-digital-twin.git && cd open-earth-digital-twin && node tools/oedt.mjs setup && node tools/oedt.mjs next
```

### Níveis de Reconhecimento e Certificado Digital Verificável

| Nível | Critério (`checked`) | Reconhecimento |
| --- | --- | --- |
| **Explorador Ambiental** (*Environmental Explorer*) | 1 contribuição pública aprovada | Hall of Fame + Certificado Digital Verificável gratuito (`oedt cert`) |
| **Cartógrafo de Dados Públicos** (*Public Data Cartographer*) | 3+ contribuições aprovadas ou 2+ Programs | Destaque temático + Certificado Nível Cartógrafo |
| **Guardião de Bacia/Bioma** (*Basin & Biome Guardian*) | 5+ contribuições integradas em uma bacia/aquífero/bioma | Selo Territorial + Certificado Nível Guardião |
| **Embaixador Global** (*Global Ambassador*) | 10+ contribuições multi-região ou revisão comunitária recorrente | Destaque Global + Certificado Nível Embaixador |

### Validação Local Rápida

```bash
node tools/oedt.mjs setup
node tools/oedt.mjs next
node tools/oedt.mjs check
node tools/oedt.mjs board
node --test tests/validate_contribution.test.mjs tests/oedt_harness.test.mjs
```

### Nota de Independência e Higiene de Marcas (PI-01)

Todas as instituições públicas e observatórios científicos citados neste repositório — incluindo USGS, Environment and Climate Change Canada, US EPA, NOAA, Ministério do Meio Ambiente do Japão (Soramame), data.gov.au, Eurostat, EEA, Copernicus, GBIF, OpenAQ, ANA, IBAMA, INPE, CETESB e MapBiomas — são **fontes públicas independentes**, assim como `https://pequalnp.com/` é citada apenas como inspiração técnica aberta, sem parceria formal, patrocínio, certificação ou endosso à ECBYTS Ltda.
