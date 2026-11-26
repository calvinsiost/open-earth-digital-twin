# The Graveyard — Cemitério Público de Fontes Mortas e Unidades Refutadas

Inspirado na prática aberta de memória negativa auditável (como o *Graveyard* de harnesses colaborativos públicos), este diretório registra **o que já falhou, o que foi refutado pelo juiz determinístico e quais fontes públicas foram encerradas ou bloqueadas por incompatibilidade de licença**.

## Por que manter um Graveyard?

Quando dezenas de humanos e agentes autônomos (`Claude`, `Codex`, `Antigravity`, `Gemini`, `Cursor`, `DeepSeek`) trabalham em paralelo sobre o mapa mundial, o maior desperdício é repetir tentativas em fontes que:

1. **Estão sob licença incompatível (`CC BY-NC`, proprietária ou fechada)** — `buried_reason: "incompatible_license"`;
2. **Saíram do ar permanentemente ou exigem login privado/paywall** — `buried_reason: "dead_source"`;
3. **Foram submetidas com dados privados, PII, coordenadas inválidas ou medições fabricadas** — `buried_reason: "unit_refuted"`.

Antes de propor uma lacuna ou rodar `node tools/oedt.mjs next`, o harness consulta automaticamente [index.json](index.json) para evitar retrabalho.

## Regras de Registro

- Nunca incluir dados pessoais (PII) ou conteúdo confidencial no motivo do enterro — registrar apenas o identificador técnico, a URL ou classe de fonte e a razão objetiva da recusa.
- Toda entrada adicionada a `graveyard/index.json` também gera um evento correspondente em `feed/events.jsonl` (`unit_refuted` ou `source_buried`).
- Uma fonte enterrada só pode ser reabilitada caso passe a publicar dados oficiais abertos sob licença compatível e URL `https://` pública verificável.
