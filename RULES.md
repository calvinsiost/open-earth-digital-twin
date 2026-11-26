# Regulamento Oficial — Desafio Gratuito: Gêmeo Digital Ambiental Mundial

> **Resumo em Inglês / English Summary:** This is a 100% free, open-data community initiative organized by ECBYTS Ltda to assemble a global environmental digital twin exclusively from official public datasets. Recognition is strictly non-monetary (Hall of Fame listing + Verifiable Digital Certificate with QR Seal on `https://ecbyts.com`). Private/client data, PII, and non-commercial (`CC BY-NC`) or proprietary sources are strictly prohibited.

---

## 1. Objeto e Natureza do Desafio

1.1. O **Desafio Gratuito: Gêmeo Digital Ambiental Mundial** (`open-earth-digital-twin`) é uma iniciativa aberta, educativa e técnico-científica organizada pela **ECBYTS Ltda** com o objetivo de catalogar, estruturar e validar modelos ambientais georreferenciados no formato aberto `.ecbt.json` a partir de **100% de dados públicos oficiais**.

1.2. A participação é **integralmente gratuita**, voluntária e contínua, sem cobrança de inscrição e sem exigência de assinatura de plano comercial.

1.3. **Política expressa de reconhecimento não monetário:** este regulamento oferece exclusivamente **reconhecimento público técnico** (registro no `HALL_OF_FAME.md`) e emissão de **Certificado Digital Verificável com Selo QR** hospedado em `https://ecbyts.com`. **Não há prêmios em dinheiro, sorteios, brindes pagos ou concessão de cursos gratuitos** vinculados à participação ou colocação neste desafio.

## 2. Elegibilidade

2.1. Pode participar qualquer pessoa física interessada em ciências ambientais, engenharia ambiental, geologia, biologia, geografia, ciência de dados, ensino ou cidadania ambiental, de qualquer país, que possua conta ativa no GitHub.

2.2. Participantes menores de 18 anos devem contar com ciência e supervisão de responsável legal ou orientador acadêmico, sem expor dados pessoais sensíveis no repositório.

2.3. Equipes universitárias, laboratórios públicos e grupos de estudo podem submeter contribuições identificando o autor principal do Pull Request e creditando o grupo no campo `display_name` (sem incluir e-mails, telefones ou documentos pessoais).

## 3. Fontes de Dados Aceitas

3.1. São aceitas exclusivamente contribuições baseadas em **dados públicos oficiais ou observatórios científicos abertos** com origem verificável por endereço `https://`, incluindo, a título exemplificativo, as fontes listadas em [CATALOG_PUBLIC_SOURCES.md](CATALOG_PUBLIC_SOURCES.md).

3.2. Toda contribuição deve informar explicitamente:
- órgão emissor ou plataforma pública de origem (`source.agency`);
- nome do conjunto de dados ou rede de monitoramento (`source.dataset_name`);
- URL pública direta via `https://` (`source.official_url`);
- licença aberta aplicável (`source.license`);
- data e hora UTC da coleta do dado público (`source.retrieved_at_utc`).

3.3. Licenças aceitas incluem: Domínio Público (ex.: dados federais dos EUA — USGS, EPA, NASA), `CC0 1.0`, `CC BY 4.0`, `ODC-By 1.0`, `ODbL 1.0`, política de dados abertos da Lei de Acesso à Informação do Brasil (LAI — Lei nº 12.527/2011 / Portais de Dados Abertos Governamentais), Política de Dados Abertos Copernicus (UE), Open Government Licence (OGL) e licenças abertas equivalentes que permitam livre redistribuição e reuso (inclusive técnico e comercial) mediante atribuição.

## 4. Proibições Estritas (Rejeição Imediata)

É terminantemente proibido submeter qualquer arquivo que contenha:

1. **Dados privados ou de clientes:** laudos laboratoriais privados, relatórios de consultoria, auditorias internas de empresas, monitoramentos sob sigilo contratual (NDA) ou dados de campo não publicados em portal oficial.
2. **Dados pessoais (PII):** CPF, RG, passaporte, SSN, endereço de e-mail pessoal, número de telefone, endereço residencial, placas de veículos ou nomes de proprietários privados.
3. **Licenças incompatíveis ou fechadas:** bases licenciadas sob cláusulas não-comerciais (`CC BY-NC`, `CC BY-NC-SA`, `CC BY-NC-ND`), licenças "todos os direitos reservados", bancos raspados contra os termos de uso ou conteúdo proprietário.
4. **Dados fabricados ou adulterados:** medições inventadas ou geradas sinteticamente apresentadas como se fossem resultados reais de estações públicas. O único arquivo ilustrativo permitido é o modelo didático mantido pela organização e marcado explicitamente com `is_template_example: true`.
5. **Segredos ou credenciais:** chaves de API, senhas, tokens, arquivos `.env` ou certificados privados.

## 5. Requisitos Técnicos de Submissão

5.1. O participante deve seguir a jornada em 3 passos:
1. Selecionar um conjunto de dados público oficial e conferir sua licença.
2. Montar e validar gratuitamente o gêmeo digital ambiental em [https://ecbyts.com/app](https://ecbyts.com/app), estruturando o arquivo aberto `.ecbt` / `.ecbt.json` de acordo com [SCHEMA_CONTRIBUTION.md](SCHEMA_CONTRIBUTION.md).
3. Submeter o arquivo em `contributions/<PAIS_ISO2>/<slug>.ecbt.json` via Pull Request.

5.2. Parâmetros laboratoriais ou ambientais abaixo do limite de quantificação devem ser registrados de forma tecnicamente fiel utilizando `below_detection_limit: true`, `value: null`, `quantification_limit` numérico positivo e qualificador `<LQ` — nunca substituídos arbitrariamente por zero sem indicação analítica.

5.3. O campo `disclaimer_public_data_only` deve constar como `true`, constituindo declaração formal do contribuidor de que o arquivo contém apenas informações públicas abertas e livres de PII.

## 6. Fluxo de Revisão e Aprovação

1. **Validação automatizada (CI):** todo Pull Request dispara o workflow `validate-contributions.yml`, que executa `node scripts/validate_contribution.mjs` verificando esquema, coordenadas WGS84 válidas, protocolo `https://`, compatibilidade de licença e ausência de padrões de PII ou termos sigilosos.
2. **Revisão técnica humana:** mantenedores conferem a existência da fonte oficial na URL informada, a coerência das unidades e coordenadas, o tratamento de `<LQ` e a integridade da atribuição original.
3. **Integração (Merge):** uma vez aprovado, o Pull Request é integrado ao ramo `main`, e a contribuição passa a contabilizar para os níveis de reconhecimento do autor.
4. **Revisão posterior e revogação:** se uma contribuição já integrada apresentar posteriormente evidência de violação de licença, privacidade ou falsificação de dados, o arquivo será removido do acervo e o respectivo registro no Hall of Fame e no Certificado Digital será ajustado ou revogado.

## 7. Níveis de Reconhecimento e Certificado Digital Verificável

7.1. Os contribuidores com Pull Requests aprovados são reconhecidos em quatro níveis progressivos detalhados em [HALL_OF_FAME.md](HALL_OF_FAME.md):
- **Explorador Ambiental:** 1 contribuição pública aprovada.
- **Cartógrafo de Dados Públicos:** 3 ou mais contribuições aprovadas (ou cobertura em 2+ domínios ambientais).
- **Guardião de Bacia/Bioma:** 5 ou mais contribuições consistentes vinculadas a uma bacia hidrográfica, aquífero ou bioma específico.
- **Embaixador Global:** 10 ou mais contribuições em múltiplos países/regiões ou atuação recorrente validada em revisão técnica comunitária.

7.2. **Certificado Digital Verificável com Selo QR:** ao atingir ou avançar de nível após a abertura oficial do desafio, o contribuidor pode solicitar a emissão gratuita do Certificado Digital Verificável em `https://ecbyts.com`. O certificado exibe nome de exibição escolhido, identificador GitHub, nível conquistado, códigos das contribuições aprovadas, data de emissão e **Selo QR** para consulta pública da autenticidade.

## 8. Licenciamento das Contribuições

8.1. Scripts, esquemas, fluxos de validação e documentação técnica deste repositório são regidos pela licença **MIT** ([LICENSE](LICENSE)).

8.2. Os arquivos estruturados de contribuições em `contributions/**/*.ecbt.json` são disponibilizados sob **ODC-By 1.0** ([DATA_LICENSE.md](DATA_LICENSE.md)), **preservando-se integralmente os direitos, licenças e créditos das agências públicas e fontes originais**.

## 9. Independência Institucional e Higiene de Marcas (PI-01)

9.1. Órgãos públicos, institutos de pesquisa e portais abertos mencionados neste regulamento ou no catálogo de fontes — incluindo ANA, IBAMA, INPE, CETESB, MapBiomas, OpenAQ, Copernicus, EEA, EPA, USGS, GBIF e NASA Earthdata — operam de forma independente.

9.2. A referência a essas instituições não caracteriza convênio, patrocínio, chancela oficial ou parceria institucional com a ECBYTS Ltda.

## 10. Disposições Gerais

10.1. A ECBYTS Ltda poderá atualizar este regulamento para melhorar critérios técnicos de qualidade, segurança e conformidade legal, mantendo histórico público versionado neste repositório.

10.2. Dúvidas técnicas sobre o formato `.ecbt.json` ou sugestões de novas fontes públicas oficiais podem ser registradas por meio dos modelos de Issue deste repositório.
