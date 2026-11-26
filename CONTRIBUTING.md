# Guia de Contribuição / Contributing Guide

Obrigado pelo interesse em colaborar com o **Desafio Gratuito: Gêmeo Digital Ambiental Mundial**. Todas as contribuições são gratuitas, abertas e reconhecidas no [HALL_OF_FAME.md](HALL_OF_FAME.md) com emissão de **Certificado Digital Verificável com Selo QR** em `https://ecbyts.com` (sem premiação financeira).

---

## Passo a Passo (Português)

### 1. Escolha um Dado Público Oficial

Consulte [CATALOG_PUBLIC_SOURCES.md](CATALOG_PUBLIC_SOURCES.md) e escolha uma fonte oficial verificável (`https://`) com licença aberta compatível (ex.: Domínio Público, CC0, CC BY 4.0, ODC-By, Dados Abertos Governamentais / LAI, Copernicus Open Data).

> **Atenção:** Nunca envie dados privados de clientes, relatórios confidenciais, dados pessoais (CPF, e-mail, telefone) nem conjuntos licenciados sob `CC BY-NC`.

### 2. Monte e Valide Gratuitamente no `ecbyts.com/app`

1. Acesse gratuitamente [https://ecbyts.com/app](https://ecbyts.com/app) no navegador.
2. Crie o modelo ambiental com as coordenadas e parâmetros públicos escolhidos, preservando medições abaixo do limite de quantificação (`<LQ`).
3. Exporte o arquivo aberto `.ecbt` e estruture sua contribuição conforme [SCHEMA_CONTRIBUTION.md](SCHEMA_CONTRIBUTION.md) (use `contributions/BR/exemplo-bacia-tiete-estacao-publica.ecbt.json` apenas como referência estrutural).

### 3. Adicione o Arquivo ao Repositório

1. Faça um *fork* deste repositório e crie um ramo descritivo (ex.: `contrib/br-bacia-paranapanema-01`).
2. Salve o arquivo em `contributions/<COUNTRY_ISO2>/<slug>.ecbt.json`.
3. Remova `is_template_example` (ou defina como `false`) e garanta que `disclaimer_public_data_only` esteja como `true`.

### 4. Valide Localmente (Zero Dependências)

Com Node.js 20+ instalado, execute:

```bash
node scripts/validate_contribution.mjs
node --test tests/validate_contribution.test.mjs
```

A validação deve finalizar com código `0` e zero erros antes da abertura do Pull Request.

### 5. Abra o Pull Request

Preencha integralmente o checklist do Pull Request em `.github/PULL_REQUEST_TEMPLATE.md`. O workflow automático verificará o esquema, as URLs oficiais, a licença e a ausência de PII. Após a revisão técnica humana e o *merge*, sua contribuição será contabilizada no [HALL_OF_FAME.md](HALL_OF_FAME.md).

---

## Quick Steps (English)

1. Pick an official open public source from [CATALOG_PUBLIC_SOURCES.md](CATALOG_PUBLIC_SOURCES.md) (`https://` URL + compatible open license; **no `CC BY-NC`, no private/client data, no PII**).
2. Build and validate your environmental digital twin for free at [https://ecbyts.com/app](https://ecbyts.com/app) and prepare your `.ecbt.json` file following [SCHEMA_CONTRIBUTION.md](SCHEMA_CONTRIBUTION.md).
3. Save it to `contributions/<COUNTRY_ISO2>/<slug>.ecbt.json`.
4. Run `node scripts/validate_contribution.mjs` locally (Node.js 20+, zero dependencies).
5. Open a Pull Request completing all checkboxes in the PR template. Approved contributions earn public recognition in [HALL_OF_FAME.md](HALL_OF_FAME.md) and a Verifiable Digital Certificate with QR Seal on `https://ecbyts.com`.
