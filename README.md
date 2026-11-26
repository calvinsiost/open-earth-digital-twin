# Open Earth Digital Twin — Desafio Gratuito: Gêmeo Digital Ambiental Mundial

> **Idioma / Language:** [Português (Brasil)](#português-brasil) · [English](#english)

---

<a id="português-brasil"></a>
## Português (Brasil)

### Objetivo

Construir de forma aberta, auditável e colaborativa o primeiro **Gêmeo Digital Ambiental Mundial** estruturado com **100% de dados públicos oficiais** de bacias hidrográficas, qualidade do ar, áreas contaminadas públicas, clima e emissões, biodiversidade/florestas e resíduos/saneamento.

Cada contribuição aprovada integra um acervo técnico padronizado no formato aberto `.ecbt.json`, com proveniência pública verificável, coordenadas geográficas reais e preservação integral de parâmetros abaixo do limite de quantificação (`<LQ`).

### Aviso Fundamental (Natureza 100% Gratuita e Sem Premiação Financeira)

- **Participação 100% gratuita:** não há taxa de inscrição, mensalidade ou obrigatoriedade de contratação de planos pagos.
- **Reconhecimento público + certificado digital verificável:** o desafio é focado exclusivamente em **reconhecimento técnico público** (listagem no `HALL_OF_FAME.md`) e na emissão de **Certificado Digital Verificável com Selo QR** hospedado em `https://ecbyts.com`.
- **Sem premiação monetária:** não há prêmios em dinheiro, brindes pagos ou concessão de cursos gratuitos vinculados a este regulamento.
- **Somente dados públicos abertos:** é estritamente proibido enviar dados privados, laudos de clientes, informações confidenciais, dados pessoais (PII) ou bases sob licença restritiva ou não-comercial (`CC BY-NC`).

### Como Participar em 3 Passos

1. **Escolha um dado público oficial:** consulte [CATALOG_PUBLIC_SOURCES.md](CATALOG_PUBLIC_SOURCES.md) e selecione uma estação, série ou registro público oficial (água, ar, solo público, clima, biodiversidade ou saneamento) com URL institucional `https://` verificável e licença aberta compatível.
2. **Monte e valide gratuitamente no `ecbyts.com/app`:** abra gratuitamente a aplicação web aberta em [https://ecbyts.com/app](https://ecbyts.com/app), estruture e valide o seu gêmeo digital ambiental com os dados públicos escolhidos e gere o arquivo aberto no formato `.ecbt` / `.ecbt.json` seguindo o contrato em [SCHEMA_CONTRIBUTION.md](SCHEMA_CONTRIBUTION.md).
3. **Envie via Pull Request:** salve sua contribuição em `contributions/<PAIS_ISO2>/<slug>.ecbt.json`, valide localmente com `node scripts/validate_contribution.mjs` e abra um Pull Request seguindo [CONTRIBUTING.md](CONTRIBUTING.md).

### Níveis de Reconhecimento e Certificado Digital com Selo QR

Todas as contribuições aprovadas na revisão técnica automática e humana passam a compor o [HALL_OF_FAME.md](HALL_OF_FAME.md) e habilitam a emissão de **Certificado Digital Verificável com Selo QR** em `https://ecbyts.com`, permitindo conferência pública da autoria, dos registros aceitos e do nível alcançado:

| Nível | Critério | Reconhecimento |
| --- | --- | --- |
| **Explorador Ambiental** | 1 contribuição pública aprovada | Nome no Hall of Fame + Certificado Digital Verificável (Selo QR) |
| **Cartógrafo de Dados Públicos** | 3 ou mais contribuições aprovadas (ou 2+ domínios ambientais) | Destaque temático no Hall of Fame + Certificado Nível Cartógrafo (Selo QR) |
| **Guardião de Bacia/Bioma** | 5 ou mais contribuições integradas em uma bacia hidrográfica, aquífero ou bioma | Selo de Curadoria Territorial + Certificado Nível Guardião (Selo QR) |
| **Embaixador Global** | 10 ou mais contribuições em múltiplas regiões/países ou revisão técnica comunitária recorrente | Destaque Global no Hall of Fame + Certificado Nível Embaixador (Selo QR) |

### Estrutura do Repositório

```text
open-earth-digital-twin/
├── README.md                                        # Visão geral bilíngue (PT-BR + EN)
├── RULES.md                                         # Regulamento oficial completo do desafio
├── CATALOG_PUBLIC_SOURCES.md                        # Catálogo de fontes públicas (Brasil e Mundo)
├── SCHEMA_CONTRIBUTION.md                           # Contrato técnico do arquivo .ecbt.json
├── CONTRIBUTING.md                                  # Guia passo a passo de contribuição via PR
├── HALL_OF_FAME.md                                  # Quadro de reconhecimento e níveis do Selo QR
├── LICENSE                                          # Licença MIT (scripts, schemas e documentação)
├── DATA_LICENSE.md                                  # Licença ODC-By 1.0 (acervo de contribuições)
├── contributions/
│   └── BR/
│       └── exemplo-bacia-tiete-estacao-publica.ecbt.json
├── scripts/
│   └── validate_contribution.mjs                    # Validador Node.js puro (zero dependências)
├── tests/
│   └── validate_contribution.test.mjs               # Suíte automatizada de testes (node --test)
└── .github/
    ├── PULL_REQUEST_TEMPLATE.md
    ├── ISSUE_TEMPLATE/nova-contribuicao.yml
    └── workflows/validate-contributions.yml
```

### Validação Local Rápida

Requer apenas Node.js 20+ (sem instalação de pacotes externos):

```bash
node scripts/validate_contribution.mjs
node --test tests/validate_contribution.test.mjs
```

### Nota de Independência e Higiene de Marcas (PI-01)

As instituições públicas, agências reguladoras e iniciativas científicas abertas citadas neste repositório — incluindo ANA, IBAMA, INPE, CETESB, MapBiomas, OpenAQ, Copernicus, EEA, EPA, USGS, GBIF e NASA Earthdata — são **fontes públicas independentes**. Sua citação serve exclusivamente para orientação de acesso a dados oficiais abertos e **não implica parceria formal, patrocínio, certificação ou endosso** dessas organizações em relação à ECBYTS Ltda ou a este desafio.

---

<a id="english"></a>
## English

### Goal

Build, in an open, auditable, and collaborative way, the first **Global Environmental Digital Twin** powered **100% by official open public data** across watersheds and water quality, air quality, public contaminated sites, climate and emissions, biodiversity and forests, and waste and sanitation.

Every approved contribution joins a standardized open repository in `.ecbt.json` format with verifiable public provenance, valid WGS84 coordinates, and explicit analytical support for below-quantification-limit measurements (`<LQ`).

### Core Notice (100% Free, Zero Monetary Prizes, Public Data Only)

- **100% free participation:** no entry fee, no subscription, and no paid plan required.
- **Public recognition and verifiable QR certificate only:** this challenge focuses exclusively on **public recognition** in [HALL_OF_FAME.md](HALL_OF_FAME.md) and a **Verifiable Digital Certificate with a QR Seal** hosted on `https://ecbyts.com`.
- **No cash prizes or paid giveaways:** there are no monetary awards, paid gifts, or free course vouchers attached to these rules.
- **Strict public-data boundary:** private corporate data, client laboratory reports, confidential files, personal identifiable information (PII), and closed or non-commercial (`CC BY-NC`) datasets are strictly prohibited and automatically rejected.

### How to Participate in 3 Steps

1. **Select an official public dataset:** pick a verifiable public monitoring station, registry, or inventory from [CATALOG_PUBLIC_SOURCES.md](CATALOG_PUBLIC_SOURCES.md) with an official `https://` URL and a compatible open license.
2. **Build and validate for free on `ecbyts.com/app`:** open the free web editor at [https://ecbyts.com/app](https://ecbyts.com/app), assemble and validate your environmental digital twin using the public dataset, and export your `.ecbt` / `.ecbt.json` contribution conforming to [SCHEMA_CONTRIBUTION.md](SCHEMA_CONTRIBUTION.md).
3. **Submit a Pull Request:** add your file under `contributions/<COUNTRY_ISO2>/<slug>.ecbt.json`, verify locally with `node scripts/validate_contribution.mjs`, and open a Pull Request following [CONTRIBUTING.md](CONTRIBUTING.md).

### Recognition Tiers & Verifiable QR Certificate

Approved contributors are listed in [HALL_OF_FAME.md](HALL_OF_FAME.md) and earn a **Verifiable Digital Certificate with QR Seal** on `https://ecbyts.com`:

1. **Environmental Explorer** (`Explorador Ambiental`) — 1 approved public contribution.
2. **Public Data Cartographer** (`Cartógrafo de Dados Públicos`) — 3+ approved contributions or 2+ environmental domains.
3. **Basin & Biome Guardian** (`Guardião de Bacia/Bioma`) — 5+ curated contributions across a watershed, aquifer, or biome.
4. **Global Ambassador** (`Embaixador Global`) — 10+ multi-region/multi-country contributions or sustained community technical review.

### Trademark & Independence Notice (PI-01)

Public agencies and open-science initiatives referenced in this repository — including ANA, IBAMA, INPE, CETESB, MapBiomas, OpenAQ, Copernicus, EEA, EPA, USGS, GBIF, and NASA Earthdata — are **independent public data sources**. Listing them guides contributors to official open portals and **does not imply any formal partnership, sponsorship, certification, or endorsement** of ECBYTS Ltda or this initiative.
