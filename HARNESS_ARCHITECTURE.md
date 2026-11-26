# Arquitetura do Harness Colaborativo (`HARNESS_ARCHITECTURE.md`)

> **Nota de Independência Técnica (PI-01):** O desenho deste harness inspira-se nas boas práticas abertas de colaboração verificável adotadas por iniciativas científicas públicas como `https://pequalnp.com/` (fluxo de muitos agentes e humanos diante de um único juiz determinístico, fila de lacunas, cemitério de tentativas refutadas e feed estruturado). A referência tem caráter estritamente técnico e educativo, **sem vínculo formal, parceria, patrocínio ou endosso** entre a ECBYTS Ltda e os mantenedores do `pequalnp.com`.

---

## 1. Princípio Central: "Muitos Agentes e Humanos, Um Único Juiz"

Qualquer pessoa (pelo navegador em `https://ecbyts.com/app`) ou qualquer agente de IA conectado pelo participante (`Claude`, `Codex`, `Antigravity`, `Gemini`, `Cursor`, `DeepSeek`, entre outros) pode preparar contribuições para o **Gêmeo Digital Ambiental Mundial**. Contudo, **nenhum relato autoafirmado é aceito como prova**.

Todo artefato passa por **um único juiz determinístico fail-closed** (`tools/oedt.mjs check` + `scripts/validate_contribution.mjs`), escrito em Node.js puro (zero dependências externas, zero GPU, execução `< 2s`).

### Estados Canônicos de uma Lacuna / Unidade

| Estado | Significado | Conta no Placar / Certificado QR? |
| --- | --- | --- |
| `open` | Lacuna disponível em `desk/gaps.json` aguardando contribuição. | Não |
| `claimed` | Lacuna sinalizada em trabalho por humano ou agente. | Não |
| `checked` | Unidade aprovada pelo juiz determinístico + revisão humana integrada em `main`. | **Sim (único estado contabilizado)** |
| `refuted` | Contribuição rejeitada por erro técnico, licença incompatível, PII ou dado inválido (registrada em `graveyard/index.json`). | Não |
| `dead_source` | Portal ou conjunto de origem encerrado, inacessível ou sob paywall (registrado em `graveyard/index.json`). | Não |

---

## 2. Componentes do Harness

1. **CLI Unificada (`tools/oedt.mjs` — zero dependências):**
   - `node tools/oedt.mjs setup`: audita versão do Node.js (>= 20), integridade dos artefatos do harness (`desk/gaps.json`, `graveyard/index.json`, `feed/events.jsonl`) e prontidão do juiz.
   - `node tools/oedt.mjs next [--program <prog>]`: consulta `desk/gaps.json` e `graveyard/index.json` e retorna a próxima lacuna `open` pronta para execução isolada sem conflito de merge.
   - `node tools/oedt.mjs check [arquivo]`: executa o juiz determinístico fail-closed, valida isolamento `1 arquivo = 1 lacuna`, verifica que a fonte não está enterrada no Graveyard e imprime o **SHA-256 canônico da evidência**.
   - `node tools/oedt.mjs board`: gera o placar transparente por Program (`open / claimed / checked / refuted / dead_source`), aplicando a regra **"Who is counted"** e separando contagens de `Human` vs `Human + AI Agent`.
2. **Desk de Lacunas (`desk/gaps.json`):** 6 Programs temáticos e lacunas geográficas priorizadas com caminho alvo dedicado (`contributions/<ISO2>/<slug>.ecbt.json`).
3. **The Graveyard (`graveyard/README.md` + `graveyard/index.json`):** memória pública negativa de fontes mortas, classes de licença bloqueadas e unidades refutadas, impedindo que novos humanos ou agentes repitam falhas já provadas.
4. **Structured Feed (`feed/events.jsonl`):** trilha append-only em JSON Lines das mudanças reais de estado (`gap_opened`, `unit_claimed`, `unit_checked`, `unit_refuted`, `source_buried`).

---

## 3. Como o Harness Evita Gargalo no CI do GitHub

Em repositórios públicos abertos a múltiplos agentes externos, o principal risco operacional é saturar minutos e filas de GitHub Actions com PRs ruidosos ou suítes pesadas. Este harness neutraliza esse gargalo por quatro travas estruturais:

1. **Juiz estático determinístico em `< 2s` sem GPU e sem `npm install`:** o workflow `.github/workflows/validate-contributions.yml` usa apenas Node.js nativo (`node:fs`, `node:path`, `node:crypto`, `node:test`), eliminando download de dependências, containers pesados ou inferência de GPU no CI.
2. **Sem raspagem externa no CI:** o juiz não faz requisições HTTP instáveis aos portais das agências durante o CI (evitando falhas intermitentes por oscilação governamental); a conferência do conteúdo publicado ocorre na revisão técnica humana.
3. **Checagem local obrigatória antes do PR:** o contrato exige execução prévia de `node tools/oedt.mjs check <arquivo>` na máquina do participante ou do agente, gerando o SHA-256 canônico da evidência antes da abertura do Pull Request.
4. **Isolamento estrito `1 arquivo = 1 lacuna` por PR:** cada Pull Request entrega um único arquivo `.ecbt.json` em `contributions/<ISO2>/` correspondente a uma única lacuna (`gap_id`), impedindo conflitos de merge em arquivos compartilhados (`desk/gaps.json`, `HALL_OF_FAME.md` e `feed/events.jsonl` só são atualizados pelos mantenedores no momento da aprovação).

---

## 4. Transparência "Who Is Counted"

- Somente unidades em estado `checked` (aprovadas pelo juiz determinístico e integradas ao ramo `main`) entram na contagem do `HALL_OF_FAME.md` e na emissão do **Certificado Digital Verificável com Selo QR** em `https://ecbyts.com`.
- O arquivo didático do repositório (`is_template_example: true`) é validado estruturalmente pelo juiz, mas **nunca** é somado ao placar real de contribuições.
- Todo autor declara `author.contributor_mode` como `"human"` ou `"human_plus_ai_agent"` (podendo informar opcionalmente `author.agent_runtime`), garantindo crédito transparente sem inflar métricas nem ocultar uso de assistência automatizada.
