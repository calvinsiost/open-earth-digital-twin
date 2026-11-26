## Resumo da Contribuição / Contribution Summary

- **Gap ID (`gap_id` de `desk/gaps.json`):**
- **Program (`program`):**
- **ID da Contribuição (`contribution_id`):**
- **País / Região (`country_iso2` / `region`):**
- **Modo de Autoria (`author.contributor_mode`):** [ ] `human` · [ ] `human_plus_ai_agent` (agente: `________`)
- **Órgão Público / Fonte Oficial (`source.agency` + `source.official_url`):**
- **Licença da Fonte Original (`source.license`):**
- **SHA-256 Canônico emitido por `node tools/oedt.mjs check`:** ``

---

## Checklist Obrigatório / Mandatory Checklist

Marque todos os itens antes de solicitar revisão / Check all items before requesting review:

- [ ] **Isolamento 1 Arquivo = 1 Lacuna:** Este PR adiciona apenas 1 arquivo em `contributions/<ISO2>/<slug>.ecbt.json` e não altera `desk/gaps.json`, `HALL_OF_FAME.md` nem `feed/events.jsonl`.
- [ ] **100% Dados Públicos Oficiais:** Confirmo que todos os dados provêm de fonte pública oficial verificável com URL `https://` (`disclaimer_public_data_only: true`) e não constam como mortos em `graveyard/index.json`.
- [ ] **Licença Aberta Compatível:** Confirmo que a licença permite redistribuição com atribuição e **não** é `CC BY-NC`, proprietária ou restrita.
- [ ] **Zero PII e Zero Dados Privados:** Confirmo ausência total de dados de clientes, relatórios confidenciais, CPF, e-mail pessoal, telefone, endereço residencial ou segredos.
- [ ] **Integridade Analítica (`<LQ`):** Parâmetros abaixo do limite de quantificação foram registrados com `below_detection_limit: true`, `value: null` e `quantification_limit` positivo.
- [ ] **Juiz Local Aprovado (`< 2s`):** Executei `node tools/oedt.mjs check <arquivo>` localmente com status `CHECKED` e código de saída `0`.
- [ ] **Ciência das Regras e Licenças:** Li e concordo com `RULES.md` (100% gratuito, foco exclusivo em reconhecimento público no `HALL_OF_FAME.md` e Certificado Digital Verificável com Selo QR em `https://ecbyts.com`, sem premiação financeira) e com `DATA_LICENSE.md` (ODC-By 1.0 preservando a licença original da fonte pública).
