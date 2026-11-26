# Contrato de Esquema da Contribuição (`.ecbt.json`)

Este documento define o formato padronizado dos arquivos submetidos em `contributions/<PAIS_ISO2>/<slug>.ecbt.json` no **Desafio Gratuito: Gêmeo Digital Ambiental Mundial**.

Todo arquivo é validado automaticamente por `scripts/validate_contribution.mjs` antes da revisão técnica humana.

---

## 1. Localização e Nomenclatura do Arquivo

- **Caminho obrigatório:** `contributions/<COUNTRY_ISO2>/<slug>.ecbt.json`
- **`<COUNTRY_ISO2>`:** duas letras maiúsculas conforme ISO 3166-1 alpha-2 (ex.: `BR`, `US`, `PT`, `DE`, `CL`, `JP`). Deve coincidir exatamente com o campo `country_iso2` dentro do JSON.
- **`<slug>`:** somente letras minúsculas ASCII, números e hífens (ex.: `bacia-rio-doce-estacao-56994500.ecbt.json`).
- **Codificação:** UTF-8 sem BOM, JSON válido formatado com 2 espaços.

---

## 2. Campos Obrigatórios de Nível Superior

| Campo | Tipo | Obrigatório | Regra de Validação |
| --- | --- | --- | --- |
| `schema_version` | `string` | Sim | Versão semântica do contrato (atual: `"1.0.0"`). |
| `contribution_id` | `string` | Sim | Identificador único em `kebab-case` (ex.: `"br-sp-bacia-tiete-estacao-publica-exemplo"`). |
| `title` | `string` | Sim | Título descritivo claro da estação, bacia, bioma ou conjunto público (mín. 5 caracteres). |
| `country_iso2` | `string` | Sim | Código ISO 3166-1 alpha-2 com 2 letras maiúsculas (ex.: `"BR"`). |
| `region` | `string` | Sim | Estado, província, município, bacia hidrográfica ou bioma. |
| `domain` | `string` | Sim | Um dos 6 domínios canônicos: `water_basins`, `air_quality`, `soil_contaminated_sites`, `climate_emissions`, `biodiversity_forests`, `waste_sanitation`. |
| `coordinates` | `object` | Sim | Objeto com `latitude` (`-90` a `90`), `longitude` (`-180` a `180`) e `datum` (`"WGS84"`). |
| `source` | `object` | Sim | Proveniência pública obrigatória (`agency`, `dataset_name`, `official_url`, `license`, `retrieved_at_utc`, `attribution`). |
| `author` | `object` | Sim | Créditos do contribuidor (`github_handle`, `display_name`, `ecbyts_app_verified`), **sem PII**. |
| `observations` | `array` | Sim | Lista não vazia de observações ambientais estruturadas com suporte explícito a `<LQ`. |
| `disclaimer_public_data_only` | `boolean` | Sim | Deve ser estritamente `true`. |
| `program` | `string` | Recomendado | Um dos 6 Programs oficiais de `desk/gaps.json`: `water-basins`, `air-quality`, `contaminated-sites`, `climate-emissions`, `biomes-biodiversity`, `sanitation-waste` (deve casar com `domain`). |
| `gap_id` | `string` | Recomendado | Identificador da lacuna em `desk/gaps.json` no formato `GAP-XX-NNN` (regra `1 arquivo = 1 lacuna` sem duplicidade). |
| `is_template_example` | `boolean` | Não | Omitir ou usar `false` em contribuições reais. Reservado (`true`) apenas para o arquivo-modelo didático do repositório (nunca contabilizado no placar). |

---

## 3. Detalhamento dos Objetos Estruturados

### 3.1. `coordinates`

```json
"coordinates": {
  "latitude": -23.5489,
  "longitude": -46.6388,
  "datum": "WGS84",
  "elevation_m": 760
}
```

- `latitude`: número finito entre `-90` e `90`.
- `longitude`: número finito entre `-180` e `180`.
- `datum`: obrigatório `"WGS84"` (EPSG:4326).
- `elevation_m`: opcional (número finito em metros).

### 3.2. `source` (Proveniência Pública Obrigatória)

```json
"source": {
  "agency": "ANA / CETESB",
  "dataset_name": "Rede Nacional e Estadual de Monitoramento de Qualidade das Águas",
  "official_url": "https://www.snirh.gov.br/hidroweb",
  "license": "Dados Abertos Governamentais (LAI / CC BY 4.0)",
  "retrieved_at_utc": "2026-11-26T15:00:00Z",
  "attribution": "Agência Nacional de Águas e Saneamento Básico (ANA) / CETESB"
}
```

- `official_url`: deve iniciar obrigatoriamente com `https://`, possuir domínio público válido (não `localhost`, não IP privado) e apontar para o portal oficial ou conjunto de dados verificável.
- `license`: deve informar uma licença aberta compatível (Domínio Público, `CC0`, `CC BY 4.0`, `ODC-By`, `ODbL`, `Dados Abertos`, `LAI`, `OGL`, `Copernicus Open Data`, `INSPIRE`, `MIT`, `PDDL`). **Licenças `CC BY-NC`, proprietárias, fechadas ou confidenciais são rejeitadas automaticamente.**
- `retrieved_at_utc`: data/hora ISO-8601 válida em UTC (ex.: `2026-11-26T15:00:00Z`).

### 3.3. `author` (Crédito Público Sem PII e Transparência Humano / Agente)

```json
"author": {
  "github_handle": "seu-usuario-github",
  "display_name": "Nome de Exibição no Hall of Fame",
  "ecbyts_app_verified": true,
  "contributor_mode": "human",
  "agent_runtime": "opcional: claude-code | codex | antigravity | gemini | cursor | deepseek"
}
```

- `github_handle`: identificador público válido do GitHub (sem `@`).
- `display_name`: nome ou equipe que aparecerá no `HALL_OF_FAME.md` e no Certificado Digital com Selo QR.
- `ecbyts_app_verified`: `true` quando o modelo foi montado e validado gratuitamente em `https://ecbyts.com/app` (ou `false` caso submetido diretamente via esquema JSON aberto para posterior conferência).
- `contributor_mode` (opcional, padrão `"human"`): `"human"` ou `"human_plus_ai_agent"`, exibido de forma transparente em `node tools/oedt.mjs board`.
- `agent_runtime` (opcional): nome curto do agente utilizado quando `contributor_mode` for `"human_plus_ai_agent"`.
- **Nunca inserir e-mail pessoal, telefone, CPF ou endereço residencial.**

### 3.4. `observations` e Suporte Explícito a `<LQ` (`below_detection_limit`)

Na engenharia ambiental e na química analítica, um resultado abaixo do Limite de Quantificação (`<LQ`) **não equivale a zero absoluto**. O contrato `.ecbt.json` exige representação explícita e auditável de valores censurados:

- **Quando a medição foi quantificada (`below_detection_limit: false`):**
  - `value` deve ser um número finito (ex.: `6.2`);
  - `quantification_limit` é opcional (recomendado quando informado pela fonte pública).
- **Quando a medição está abaixo do limite de quantificação (`below_detection_limit: true`):**
  - `value` deve ser `null`;
  - `quantification_limit` é **obrigatório** e deve ser um número positivo (ex.: `0.01`);
  - `qualifier` deve registrar `"<LQ"` (ou texto explicativo contendo `<LQ`).

Exemplo comparativo:

```json
"observations": [
  {
    "parameter": "Oxigênio Dissolvido (OD)",
    "matrix": "surface_water",
    "value": 5.4,
    "unit": "mg/L",
    "measured_at_utc": "2026-10-15T12:00:00Z",
    "below_detection_limit": false,
    "quantification_limit": 0.1,
    "qualifier": "validated_public_station"
  },
  {
    "parameter": "Chumbo Total (Pb)",
    "matrix": "surface_water",
    "value": null,
    "unit": "mg/L",
    "measured_at_utc": "2026-10-15T12:00:00Z",
    "below_detection_limit": true,
    "quantification_limit": 0.01,
    "qualifier": "<LQ"
  }
]
```

---

## 4. Proteções Automáticas do Validador (`scripts/validate_contribution.mjs`)

O script de validação rejeita automaticamente qualquer arquivo que apresente:

1. Ausência de campos obrigatórios ou `disclaimer_public_data_only !== true`.
2. URL oficial ausente, malformada, `http://` sem TLS ou apontando para host local/privado.
3. Licença ausente, fechada, confidencial ou não-comercial (`CC BY-NC`).
4. Coordenadas fora do globo (`latitude < -90`, `latitude > 90`, `longitude < -180`, `longitude > 180`) ou não numéricas.
5. Inconsistência em `<LQ` (`below_detection_limit: true` sem `quantification_limit` positivo ou com número arbitrário no lugar de `null`).
6. Presença de PII ou termos sigilosos em qualquer campo textual: CPF, SSN, e-mail pessoal, telefone, `confidencial`, `cliente privado`, `laudo privado`, `senha`, `password`, `api_key`, `secret_key` ou blocos de chave privada.
