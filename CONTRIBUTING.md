# Guia de Contribuição / Contributing Guide

Obrigado pelo interesse em colaborar com o **Desafio Gratuito: Gêmeo Digital Ambiental Mundial**. Qualquer pessoa (pelo navegador em `https://ecbyts.com/app`) ou agente de IA conectado pelo participante (`Claude`, `Codex`, `Antigravity`, `Gemini`, `Cursor`, `DeepSeek`) pode contribuir diante de **um único juiz determinístico** (`tools/oedt.mjs check`).

> **Reconhecimento 100% Público e Gratuito:** contribuições `checked` integradas em `main` são creditadas no [HALL_OF_FAME.md](HALL_OF_FAME.md) e habilitam **Certificado Digital Verificável com Selo QR** em `https://ecbyts.com`, sem premiação financeira.

---

## Fluxo Unificado (`setup -> next -> ecbyts.com/app -> check -> PR`)

### 1. Verifique o Ambiente e Pegue a Próxima Lacuna Aberta

```bash
node tools/oedt.mjs setup
node tools/oedt.mjs next
# Ou filtre por Program específico:
node tools/oedt.mjs next --program water-basins
```

- O comando `next` lê `desk/gaps.json`, ignora fontes enterradas em `graveyard/index.json` e devolve o caminho alvo exclusivo (`1 arquivo = 1 lacuna`), evitando conflitos de merge.

### 2. Monte e Valide Gratuitamente no `ecbyts.com/app`

1. Acesse gratuitamente [https://ecbyts.com/app](https://ecbyts.com/app) no navegador.
2. Estruture o modelo com os dados públicos oficiais da fonte recomendada (preservando `<LQ` via `below_detection_limit: true`, `value: null` e `quantification_limit > 0`).
3. Salve sua contribuição no caminho alvo `contributions/<COUNTRY_ISO2>/<slug>.ecbt.json`, informando `gap_id`, `program`, `author.contributor_mode` (`"human"` ou `"human_plus_ai_agent"`) e `disclaimer_public_data_only: true`.

### 3. Execute o Juiz Determinístico Localmente (`< 2s`, Zero Dependências)

```bash
node tools/oedt.mjs check contributions/<COUNTRY_ISO2>/<slug>.ecbt.json
node tools/oedt.mjs board
node --test tests/validate_contribution.test.mjs tests/oedt_harness.test.mjs
```

Anote o **`evidence_sha256`** emitido pelo comando `check` para preencher o Pull Request.

### 4. Abra um Pull Request de Unidade Isolada (`1 Arquivo = 1 Lacuna`)

- Edite **apenas o seu novo arquivo** em `contributions/<COUNTRY_ISO2>/<slug>.ecbt.json`.
- **Não edite** `desk/gaps.json`, `HALL_OF_FAME.md` ou `feed/events.jsonl` no PR (os mantenedores atualizam esses arquivos centralizados no momento do *merge*, eliminando conflitos entre contribuidores).
- Preencha integralmente `.github/PULL_REQUEST_TEMPLATE.md`.

---

## Quick Steps (English — Humans & External AI Agents)

1. Run `node tools/oedt.mjs setup && node tools/oedt.mjs next` (optionally `--program <prog>`).
2. Build and validate the public dataset for free at [https://ecbyts.com/app](https://ecbyts.com/app) and save your `.ecbt.json` file to the target path (`1 file = 1 gap`, `disclaimer_public_data_only: true`, zero PII, zero `CC BY-NC`).
3. Run the deterministic fail-closed judge locally: `node tools/oedt.mjs check <your-file.ecbt.json>` and record the canonical `evidence_sha256`.
4. Open a single-file Pull Request completing `.github/PULL_REQUEST_TEMPLATE.md`. Only judge-verified `checked` units merged to `main` count on `board`, `HALL_OF_FAME.md`, and `ecbyts.com` QR Certificates.
