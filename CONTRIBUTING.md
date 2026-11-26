# Guia de Contribuição / Contributing Guide

Obrigado pelo interesse em colaborar com o **Desafio Gratuito: Gêmeo Digital Ambiental Mundial**. Qualquer pessoa (pelo navegador em `https://ecbyts.com/app`) ou agente de IA conectado pelo participante (`Claude`, `Codex`, `Antigravity`, `Gemini`, `Cursor`, `DeepSeek`) pode contribuir diante de **um único juiz determinístico** (`tools/oedt.mjs check`).

> **100% Gratuito — NÃO pague o Registro Comercial de RT (R$ 25,00) em `ecbyts.com` para participar!**
> Contribuições `checked` integradas em `main` são creditadas gratuitamente no [HALL_OF_FAME.md](HALL_OF_FAME.md) e recebem **Certificado Digital Verificável gratuito** (`node tools/oedt.mjs cert` + conferência pública SHA-256 no GitHub), sem taxa e sem premiação financeira.

---

## Fluxo Unificado (`clone -> setup -> next -> init/wrap -> check -> cert -> PR`)

### 1. Clone o Repositório, Verifique o Ambiente e Pegue Uma Lacuna Livre

```bash
git clone https://github.com/calvinsiost/open-earth-digital-twin.git
cd open-earth-digital-twin
node tools/oedt.mjs setup
node tools/oedt.mjs next
# Ou filtre por Program específico / liste todas as lacunas abertas:
node tools/oedt.mjs next --program water-basins
node tools/oedt.mjs next --all
```

- O comando `next` lê `desk/gaps.json`, ignora fontes mortas ou atrás de login em `graveyard/index.json` e consulta automaticamente **PRs abertos no GitHub** para evitar que duas pessoas ou dois agentes peguem a mesma lacuna ao mesmo tempo (use `--offline` se estiver sem internet).

### 2A. Trilha Navegador (`ecbyts.com/app` -> `oedt wrap`)

1. Acesse gratuitamente [https://ecbyts.com/app](https://ecbyts.com/app) no navegador (não precisa criar conta nem pagar selo comercial de RT).
2. Monte o modelo com dados públicos oficiais da fonte recomendada (preservando `<LQ`) e clique em **`Salvar local e Baixar .ecbt`**.
3. Converta o arquivo exportado pelo app diretamente para o contrato oficial do juiz (`1 arquivo = 1 lacuna`, preservando `<LQ` e o SHA-256 de origem):

```bash
node tools/oedt.mjs wrap projeto-baixado.ecbt.json \
  --gap GAP-WB-001 \
  --lat -23.5489 \
  --lon -46.6388 \
  --github seu-usuario \
  --name "Seu Nome de Exibição"
```

### 2B. Trilha Terminal / Agente de IA (`oedt init`)

1. Gere o rascunho já pré-preenchido da lacuna escolhida:

```bash
node tools/oedt.mjs init GAP-WB-001 \
  --github seu-usuario \
  --name "Seu Nome de Exibição" \
  --lat -23.5489 \
  --lon -46.6388 \
  --mode human_plus_ai_agent \
  --agent claude-code
```

2. Substitua os blocos de `observations` pelos dados públicos oficiais reais (preservando `<LQ` com `below_detection_limit: true`, `value: null` e `quantification_limit > 0`).

### 3. Execute o Juiz Determinístico Localmente e Gere Seu Certificado Gratuito (`< 2s`)

```bash
node tools/oedt.mjs check contributions/<COUNTRY_ISO2>/<slug>.ecbt.json
node tools/oedt.mjs cert contributions/<COUNTRY_ISO2>/<slug>.ecbt.json
node tools/oedt.mjs board
node --test tests/validate_contribution.test.mjs tests/oedt_harness.test.mjs
```

- Anote o **`evidence_sha256`** emitido pelo comando `check` para preencher o Pull Request.
- O comando `cert` gera gratuitamente seu recibo `.cert.json` e o cartão vetorial `.svg` em `certificates/` (ignorado pelo git para não sujar seu PR).

### 4. Abra um Pull Request de Unidade Isolada (`1 Arquivo = 1 Lacuna`)

- Edite ou adicione **apenas o seu novo arquivo** em `contributions/<COUNTRY_ISO2>/<slug>.ecbt.json` (pode ser via `git push` ou diretamente pelo navegador no GitHub em **Add file -> Upload files**).
- **Não edite** `desk/gaps.json`, `HALL_OF_FAME.md` ou `feed/events.jsonl` no PR (os mantenedores atualizam esses arquivos centralizados no momento do *merge*, eliminando conflitos entre contribuidores).
- Preencha integralmente `.github/PULL_REQUEST_TEMPLATE.md`.

---

## Quick Steps (English — Humans & External AI Agents)

1. Run `git clone https://github.com/calvinsiost/open-earth-digital-twin.git && cd open-earth-digital-twin && node tools/oedt.mjs setup && node tools/oedt.mjs next` (PR-aware collision avoidance included; pass `--offline` if offline).
2. Either build for free at [https://ecbyts.com/app](https://ecbyts.com/app) -> download `.ecbt.json` -> convert with `node tools/oedt.mjs wrap <exported.json> --gap <GAP_ID> --lat <LAT> --lon <LON> --github <USER>`, **or** scaffold directly with `node tools/oedt.mjs init <GAP_ID>`.
3. Run the single deterministic fail-closed judge: `node tools/oedt.mjs check <your-file.ecbt.json>`, and generate your 100% free verifiable certificate with `node tools/oedt.mjs cert <your-file.ecbt.json>` (never pay the optional commercial R$ 25 RT seal on `ecbyts.com` to join the Challenge).
4. Open a single-file Pull Request completing `.github/PULL_REQUEST_TEMPLATE.md`. Only judge-verified `checked` units merged to `main` count on `board`, `HALL_OF_FAME.md`, and official Challenge Certificates.
