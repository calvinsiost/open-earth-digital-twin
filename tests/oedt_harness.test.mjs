import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  DEFAULT_REPO_ROOT,
  runBoard,
  runCheck,
  runNext,
  runSetup,
} from "../tools/oedt.mjs";
import { validateContributionObject } from "../scripts/validate_contribution.mjs";

function makeGapContribution(overrides = {}) {
  return {
    schema_version: "1.0.0",
    contribution_id: "br-sp-bacia-tiete-estacao-real-teste",
    gap_id: "GAP-WB-001",
    program: "water-basins",
    title: "Estação Pública de Qualidade das Águas — Alto Tietê (Teste de Harness)",
    country_iso2: "BR",
    region: "Bacia do Alto Tietê, São Paulo, Brasil",
    domain: "water_basins",
    coordinates: {
      latitude: -23.5489,
      longitude: -46.6388,
      datum: "WGS84",
    },
    source: {
      agency: "ANA (HidroWeb / SNIRH)",
      dataset_name: "Rede Hidrometeorológica Nacional",
      official_url: "https://www.snirh.gov.br/hidroweb",
      license: "Dados Abertos Governamentais (LAI / CC BY 4.0)",
      retrieved_at_utc: "2026-11-26T15:30:00Z",
      attribution: "Agência Nacional de Águas e Saneamento Básico (ANA)",
    },
    author: {
      github_handle: "colaborador-aberto",
      display_name: "Colaborador Ambiental Aberto",
      ecbyts_app_verified: true,
      contributor_mode: "human_plus_ai_agent",
      agent_runtime: "claude-code",
    },
    observations: [
      {
        parameter: "Oxigênio Dissolvido (OD)",
        matrix: "surface_water",
        value: 5.2,
        unit: "mg/L",
        measured_at_utc: "2026-10-01T12:00:00Z",
        below_detection_limit: false,
        quantification_limit: 0.1,
      },
      {
        parameter: "Chumbo Total (Pb)",
        matrix: "surface_water",
        value: null,
        unit: "mg/L",
        measured_at_utc: "2026-10-01T12:00:00Z",
        below_detection_limit: true,
        quantification_limit: 0.01,
        qualifier: "<LQ",
      },
    ],
    disclaimer_public_data_only: true,
    ...overrides,
  };
}

describe("tools/oedt.mjs — Open Earth Digital Twin Harness", () => {
  it("1. setup valida ambiente Node >= 20, 6 Programs, Desk, Graveyard, Feed e juiz", () => {
    const res = runSetup(DEFAULT_REPO_ROOT);
    assert.equal(res.ok, true);
    assert.equal(res.programs, 6);
    assert.equal(res.gaps, 12);
    assert.ok(res.checks.every((c) => c.ok));
  });

  it("2. next retorna próxima lacuna aberta por prioridade e filtra corretamente por --program", () => {
    const first = runNext({ repoRoot: DEFAULT_REPO_ROOT });
    assert.equal(first.ok, true);
    assert.equal(first.open_matching_count, 12);
    assert.equal(first.gap.status, "open");
    assert.ok(first.gap.target_file.startsWith("contributions/"));

    const air = runNext({ repoRoot: DEFAULT_REPO_ROOT, program: "air-quality" });
    assert.equal(air.ok, true);
    assert.equal(air.gap.program, "air-quality");
    assert.equal(air.gap.gap_id, "GAP-AQ-001");

    const waste = runNext({ repoRoot: DEFAULT_REPO_ROOT, program: "sanitation-waste" });
    assert.equal(waste.ok, true);
    assert.equal(waste.gap.gap_id, "GAP-SW-001");

    const invalidProg = runNext({ repoRoot: DEFAULT_REPO_ROOT, program: "inexistente" });
    assert.equal(invalidProg.ok, false);
    assert.match(invalidProg.error, /Unknown program/);
  });

  it("3. check executa o juiz determinístico, gera SHA-256 canônico e impõe 1 arquivo = 1 lacuna", () => {
    const baseline = runCheck({ repoRoot: DEFAULT_REPO_ROOT });
    assert.equal(baseline.ok, true);
    assert.equal(baseline.template_count, 1);
    assert.equal(baseline.checked_count, 0);
    assert.match(baseline.items[0].evidence_sha256, /^[a-f0-9]{64}$/);

    // Temp directory testing valid checked unit + duplicate gap_id rejection
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "oedt-harness-"));
    try {
      const brDir = path.join(tmpDir, "contributions", "BR");
      fs.mkdirSync(brDir, { recursive: true });
      const file1 = path.join(brDir, "tiete-unit-1.ecbt.json");
      const file2 = path.join(brDir, "tiete-unit-2.ecbt.json");

      const valid1 = makeGapContribution();
      fs.writeFileSync(file1, JSON.stringify(valid1, null, 2), "utf8");

      const singleRes = runCheck({ repoRoot: DEFAULT_REPO_ROOT, targets: [file1] });
      assert.equal(singleRes.ok, true, `Expected checked unit, got: ${JSON.stringify(singleRes.items)}`);
      assert.equal(singleRes.checked_count, 1);
      assert.equal(singleRes.items[0].status, "checked");
      assert.equal(singleRes.items[0].contributor_mode, "human_plus_ai_agent");
      assert.match(singleRes.items[0].evidence_sha256, /^[a-f0-9]{64}$/);

      // Second file claiming same GAP-WB-001 must fail unit isolation
      const dupGap = makeGapContribution({
        contribution_id: "br-sp-bacia-tiete-estacao-duplicada",
      });
      fs.writeFileSync(file2, JSON.stringify(dupGap, null, 2), "utf8");

      const dupRes = runCheck({ repoRoot: DEFAULT_REPO_ROOT, targets: [brDir] });
      assert.equal(dupRes.ok, false);
      assert.equal(dupRes.refuted_count, 1);
      assert.ok(
        dupRes.items.some((i) => i.errors.some((e) => e.includes("1 file = 1 gap"))),
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("4. board exibe os 6 Programs, exclui exemplo didático e separa Human vs Human + AI Agent", () => {
    const res = runBoard(DEFAULT_REPO_ROOT);
    assert.equal(res.ok, true);
    assert.equal(res.programs.length, 6);
    assert.equal(res.totals.open, 12);
    assert.equal(res.totals.checked, 0);
    assert.equal(res.who_is_counted.template_examples_excluded, 1);
    assert.equal(res.who_is_counted.checked_by_human, 0);
    assert.equal(res.who_is_counted.checked_by_human_plus_ai_agent, 0);
    assert.equal(res.graveyard_policy_tombstones, 2);
  });

  it("5. juiz bloqueia PII, URL sem HTTPS, licença CC BY-NC, coordenada inválida e fonte enterrada", () => {
    const deadSourceUrls = new Set(["https://dead-portal.example.org/data"]);

    const deadRes = validateContributionObject(
      makeGapContribution({
        source: {
          agency: "Dead Agency",
          dataset_name: "Offline Archive",
          official_url: "https://dead-portal.example.org/data",
          license: "CC BY 4.0",
          retrieved_at_utc: "2026-11-26T15:30:00Z",
        },
      }),
      { deadSourceUrls },
    );
    assert.equal(deadRes.valid, false);
    assert.ok(deadRes.errors.some((e) => e.includes("Buried source blocked")));

    const ncRes = validateContributionObject(
      makeGapContribution({
        source: {
          agency: "Restricted Source",
          dataset_name: "NC Only",
          official_url: "https://example.org/nc",
          license: "CC BY-NC 4.0",
          retrieved_at_utc: "2026-11-26T15:30:00Z",
        },
      }),
    );
    assert.equal(ncRes.valid, false);
    assert.ok(ncRes.errors.some((e) => e.includes("Forbidden license")));

    const piiRes = validateContributionObject(
      makeGapContribution({
        author: {
          github_handle: "agente-teste",
          display_name: "Maria CPF 111.222.333-44 maria@exemplo.com",
          ecbyts_app_verified: true,
        },
      }),
    );
    assert.equal(piiRes.valid, false);
    assert.ok(piiRes.errors.some((e) => e.includes("CPF")));
    assert.ok(piiRes.errors.some((e) => e.includes("email")));

    const badCoordRes = validateContributionObject(
      makeGapContribution({
        coordinates: { latitude: -91, longitude: 181, datum: "WGS84" },
      }),
    );
    assert.equal(badCoordRes.valid, false);
    assert.ok(badCoordRes.errors.some((e) => e.includes("coordinates.latitude")));
    assert.ok(badCoordRes.errors.some((e) => e.includes("coordinates.longitude")));

    const httpRes = validateContributionObject(
      makeGapContribution({
        source: {
          agency: "Insecure Portal",
          dataset_name: "HTTP Only",
          official_url: "http://example.org/open",
          license: "CC BY 4.0",
          retrieved_at_utc: "2026-11-26T15:30:00Z",
        },
      }),
    );
    assert.equal(httpRes.valid, false);
    assert.ok(httpRes.errors.some((e) => e.includes("https://")));
  });
});
