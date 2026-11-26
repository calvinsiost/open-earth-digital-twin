import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateContributionObject,
  validateContributionFile,
  validatePaths,
} from "../scripts/validate_contribution.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function makeValidContribution(overrides = {}) {
  const base = {
    schema_version: "1.0.0",
    contribution_id: "br-sp-estacao-publica-teste-01",
    title: "Estação Pública de Monitoramento Hídrico — Teste Estrutural",
    country_iso2: "BR",
    region: "Bacia do Alto Tietê, SP",
    domain: "water_basins",
    coordinates: {
      latitude: -23.5489,
      longitude: -46.6388,
      datum: "WGS84",
      elevation_m: 760,
    },
    source: {
      agency: "ANA",
      dataset_name: "HidroWeb Rede Hidrometeorológica Nacional",
      official_url: "https://www.snirh.gov.br/hidroweb",
      license: "Dados Abertos Governamentais (LAI / CC BY 4.0)",
      retrieved_at_utc: "2026-11-26T15:00:00Z",
      attribution: "Agência Nacional de Águas e Saneamento Básico (ANA)",
    },
    author: {
      github_handle: "pesquisador-aberto",
      display_name: "Pesquisador Ambiental Aberto",
      ecbyts_app_verified: true,
    },
    observations: [
      {
        parameter: "Oxigênio Dissolvido (OD)",
        matrix: "surface_water",
        value: 6.1,
        unit: "mg/L",
        measured_at_utc: "2026-10-10T10:00:00Z",
        below_detection_limit: false,
        quantification_limit: 0.1,
      },
      {
        parameter: "Cádmio Total (Cd)",
        matrix: "surface_water",
        value: null,
        unit: "mg/L",
        measured_at_utc: "2026-10-10T10:00:00Z",
        below_detection_limit: true,
        quantification_limit: 0.001,
        qualifier: "<LQ",
      },
    ],
    disclaimer_public_data_only: true,
  };

  return { ...base, ...overrides };
}

describe("validate_contribution.mjs — Open Earth Digital Twin", () => {
  it("1. aprova contribuição válida com dados públicos e suporte a <LQ", () => {
    const validObj = makeValidContribution();
    const res = validateContributionObject(validObj, { expectedCountryDir: "BR" });
    assert.equal(res.valid, true, `Expected valid contribution, got errors: ${res.errors.join("; ")}`);
    assert.equal(res.errors.length, 0);

    // Also verifies the actual didactic example checked into contributions/BR/
    const examplePath = path.join(
      repoRoot,
      "contributions",
      "BR",
      "exemplo-bacia-tiete-estacao-publica.ecbt.json",
    );
    const fileRes = validateContributionFile(examplePath);
    assert.equal(fileRes.valid, true, `Example file failed: ${fileRes.errors.join("; ")}`);

    const dirReport = validatePaths([path.join(repoRoot, "contributions")]);
    assert.equal(dirReport.valid, true);
    assert.equal(dirReport.filesChecked, 1);
  });

  it("2. rejeita contribuição sem fonte ou sem URL oficial HTTPS pública", () => {
    const missingUrl = makeValidContribution({
      source: {
        agency: "ANA",
        dataset_name: "HidroWeb",
        official_url: "",
        license: "CC BY 4.0",
        retrieved_at_utc: "2026-11-26T15:00:00Z",
      },
    });
    const resMissing = validateContributionObject(missingUrl);
    assert.equal(resMissing.valid, false);
    assert.ok(resMissing.errors.some((e) => e.includes("source.official_url")));

    const httpUrl = makeValidContribution({
      source: {
        agency: "ANA",
        dataset_name: "HidroWeb",
        official_url: "http://www.snirh.gov.br/hidroweb",
        license: "CC BY 4.0",
        retrieved_at_utc: "2026-11-26T15:00:00Z",
      },
    });
    const resHttp = validateContributionObject(httpUrl);
    assert.equal(resHttp.valid, false);
    assert.ok(resHttp.errors.some((e) => e.includes("https://")));

    const noSource = makeValidContribution({ source: null });
    const resNoSource = validateContributionObject(noSource);
    assert.equal(resNoSource.valid, false);
    assert.ok(resNoSource.errors.some((e) => e.includes('"source"')));

    const ncLicense = makeValidContribution({
      source: {
        agency: "Base Restrita",
        dataset_name: "Dataset NC",
        official_url: "https://example.org/dataset",
        license: "CC BY-NC 4.0",
        retrieved_at_utc: "2026-11-26T15:00:00Z",
      },
    });
    const resNc = validateContributionObject(ncLicense);
    assert.equal(resNc.valid, false);
    assert.ok(resNc.errors.some((e) => e.includes("Forbidden license")));
  });

  it("3. rejeita PII (e-mail pessoal, CPF, telefone) e termos confidenciais/privados", () => {
    const withEmail = makeValidContribution({
      author: {
        github_handle: "usuario-teste",
        display_name: "Contato joao.silva@exemplo.com",
        ecbyts_app_verified: true,
      },
    });
    const resEmail = validateContributionObject(withEmail);
    assert.equal(resEmail.valid, false);
    assert.ok(resEmail.errors.some((e) => e.includes("email")));

    const withCpf = makeValidContribution({
      region: "Estação responsável 123.456.789-01 São Paulo",
    });
    const resCpf = validateContributionObject(withCpf);
    assert.equal(resCpf.valid, false);
    assert.ok(resCpf.errors.some((e) => e.includes("CPF")));

    const withPhone = makeValidContribution({
      title: "Estação Teste contato (11) 98765-4321",
    });
    const resPhone = validateContributionObject(withPhone);
    assert.equal(resPhone.valid, false);
    assert.ok(resPhone.errors.some((e) => e.includes("phone")));

    const withConfidential = makeValidContribution({
      title: "Relatório Confidencial de Cliente Privado",
    });
    const resConf = validateContributionObject(withConfidential);
    assert.equal(resConf.valid, false);
    assert.ok(resConf.errors.some((e) => e.includes("Private/confidential")));
  });

  it("4. rejeita coordenadas fora dos limites válidos do globo", () => {
    const badLat = makeValidContribution({
      coordinates: {
        latitude: 95.12,
        longitude: -46.6388,
        datum: "WGS84",
      },
    });
    const resLat = validateContributionObject(badLat);
    assert.equal(resLat.valid, false);
    assert.ok(resLat.errors.some((e) => e.includes("coordinates.latitude")));

    const badLon = makeValidContribution({
      coordinates: {
        latitude: -23.5489,
        longitude: -185.5,
        datum: "WGS84",
      },
    });
    const resLon = validateContributionObject(badLon);
    assert.equal(resLon.valid, false);
    assert.ok(resLon.errors.some((e) => e.includes("coordinates.longitude")));

    const nonNumeric = makeValidContribution({
      coordinates: {
        latitude: "-23.54",
        longitude: -46.63,
        datum: "WGS84",
      },
    });
    const resNonNum = validateContributionObject(nonNumeric);
    assert.equal(resNonNum.valid, false);
    assert.ok(resNonNum.errors.some((e) => e.includes("coordinates.latitude")));
  });
});
