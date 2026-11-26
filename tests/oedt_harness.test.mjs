import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  DEFAULT_REPO_ROOT,
  fetchOpenPrClaims,
  runBoard,
  runCert,
  runCheck,
  runInit,
  runNext,
  runSetup,
  runWrap,
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
    assert.equal(res.gaps, 19);
    assert.ok(res.checks.every((c) => c.ok));
  });

  it("2. next retorna próxima lacuna aberta, filtra por --program e evita colisão com PRs abertos", async () => {
    const first = runNext({ repoRoot: DEFAULT_REPO_ROOT });
    assert.equal(first.ok, true);
    assert.equal(first.open_matching_count, 19);
    assert.equal(first.gap.status, "open");
    assert.ok(first.gap.target_file.startsWith("contributions/"));

    const air = runNext({ repoRoot: DEFAULT_REPO_ROOT, program: "air-quality" });
    assert.equal(air.ok, true);
    assert.equal(air.gap.program, "air-quality");
    assert.equal(air.gap.gap_id, "GAP-AQ-001");
    // GAP-AQ-001 must now lead with login-free MonitorAr (not login-gated QUALAR)
    assert.equal(air.gap.recommended_sources[0].official_url, "https://monitorar.mma.gov.br");

    // Simulate open PR claiming GAP-AQ-001 -> next must skip it and return GAP-AQ-002!
    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => [
        {
          number: 42,
          title: "Add GAP-AQ-001 Brazil public air station",
          body: "Claiming GAP-AQ-001",
          html_url: "https://github.com/calvinsiost/open-earth-digital-twin/pull/42",
          user: { login: "agent-alpha" },
          head: { ref: "feat/gap-aq-001" },
        },
      ],
    });
    const prSync = await fetchOpenPrClaims({ fetchImpl: mockFetch });
    assert.equal(prSync.checked, true);
    assert.equal(prSync.claimedGapIds.has("GAP-AQ-001"), true);

    const airAfterSkip = runNext({
      repoRoot: DEFAULT_REPO_ROOT,
      program: "air-quality",
      claimedGapIds: prSync.claimedGapIds,
      openPrDetails: prSync.openPrDetails,
      openPrsChecked: prSync.checked,
    });
    assert.equal(airAfterSkip.ok, true);
    assert.equal(airAfterSkip.gap.gap_id, "GAP-AQ-002");
    assert.equal(airAfterSkip.skipped_open_prs.length, 1);
    assert.equal(airAfterSkip.skipped_open_prs[0].pr_number, 42);

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

  it("4. board exibe os 6 Programs, exclui exemplo didático e contabiliza fontes mortas do Graveyard", () => {
    const res = runBoard(DEFAULT_REPO_ROOT);
    assert.equal(res.ok, true);
    assert.equal(res.programs.length, 6);
    assert.equal(res.totals.open, 19);
    assert.equal(res.totals.checked, 0);
    assert.equal(res.totals.dead_source, 2);
    assert.equal(res.who_is_counted.template_examples_excluded, 1);
    assert.equal(res.who_is_counted.checked_by_human, 0);
    assert.equal(res.who_is_counted.checked_by_human_plus_ai_agent, 0);
    assert.equal(res.graveyard_policy_tombstones, 2);
  });

  it("5. juiz bloqueia PII, URL sem HTTPS, licença CC BY-NC, coordenada inválida, handle placeholder e fonte enterrada", () => {
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

    const placeholderRes = validateContributionObject(
      makeGapContribution({
        author: {
          github_handle: "seu-usuario-github",
          display_name: "Placeholder User",
          ecbyts_app_verified: true,
        },
      }),
    );
    assert.equal(placeholderRes.valid, false);
    assert.ok(placeholderRes.errors.some((e) => e.includes("Placeholder")));

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

  it("6. init gera rascunho fail-closed pronto para preenchimento sem sobrescrever por acidente", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "oedt-init-"));
    try {
      const outPath = path.join(tmpDir, "contributions", "BR", "bacia-alto-tiete-estacao-publica.ecbt.json");
      const initRes = runInit({
        repoRoot: DEFAULT_REPO_ROOT,
        gapId: "GAP-WB-001",
        outPath,
      });
      assert.equal(initRes.ok, true);
      assert.equal(fs.existsSync(outPath), true);

      // Must fail closed on judge until user replaces null coords/values and placeholder handle
      const checkBeforeEdit = runCheck({ repoRoot: DEFAULT_REPO_ROOT, targets: [outPath] });
      assert.equal(checkBeforeEdit.ok, false);
      assert.ok(checkBeforeEdit.items[0].errors.some((e) => e.includes("Placeholder")));
      assert.ok(checkBeforeEdit.items[0].errors.some((e) => e.includes("coordinates.latitude")));

      // Refuses accidental overwrite without --force
      const dupInit = runInit({
        repoRoot: DEFAULT_REPO_ROOT,
        gapId: "GAP-WB-001",
        outPath,
      });
      assert.equal(dupInit.ok, false);
      assert.match(dupInit.error, /already exists/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("7. wrap converte exportacoes reais do ecbyts.com/app (project-bundle, user-case-bundle e snapshot) preservando <LQ e passando no juiz", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "oedt-wrap-"));
    try {
      // Shape A: ecbt.project-bundle/2.1.0 (from `Salvar local e Baixar .ecbt` on ecbyts.com/app)
      const projectBundle = {
        schemaVersion: "ecbt.project-bundle/2.1.0",
        savedAtIso: "2026-11-26T16:10:00Z",
        sealHierarchyLevel: "draft",
        snapshot: {
          projectId: "proj-user-a1b2c3d4",
          title: "Estação Pública Alto Tietê SP",
          vertical: "contaminated_sites",
          crsEpsg: 4326,
          updatedAtIso: "2026-11-26T16:10:00Z",
          elements: [],
          observations: [
            {
              id: "obs-1",
              elementId: "PM-01",
              campaignCode: "2026-Q4",
              sampledAtIso: "2026-10-15T12:00:00Z",
              substanceKey: "benzene",
              matrix: "groundwater",
              concentration: 2.4,
              unit: "ug/L",
              belowDetectionLimit: false,
            },
            {
              id: "obs-2",
              elementId: "PM-01",
              campaignCode: "2026-Q4",
              sampledAtIso: "2026-10-15T12:00:00Z",
              substanceKey: "lead",
              matrix: "groundwater",
              concentration: 0.01,
              unit: "ug/L",
              belowDetectionLimit: true,
            },
          ],
          conditions: [],
          ghgInputs: [],
          lcaInputs: [],
        },
        stamps: [],
        routes: [],
        permits: [],
        sha256: "0".repeat(64),
      };

      const inBundle = path.join(tmpDir, "projeto-proj-user-a1b2c3d4.ecbt.json");
      const outBundle = path.join(tmpDir, "contributions", "BR", "cetesb-area-contaminada-publica.ecbt.json");
      fs.writeFileSync(inBundle, JSON.stringify(projectBundle, null, 2), "utf8");

      const wrapA = runWrap({
        repoRoot: DEFAULT_REPO_ROOT,
        inputPath: inBundle,
        gapId: "GAP-CS-001",
        outPath: outBundle,
        latitude: -23.5489,
        longitude: -46.6388,
        githubHandle: "engenheiro-publico",
        displayName: "Engenheiro Público SP",
      });
      assert.equal(wrapA.ok, true, `Wrap A failed: ${JSON.stringify(wrapA)}`);
      assert.equal(wrapA.source_format, "ecbt.project-bundle/2.1.0");
      assert.equal(wrapA.observations_converted, 2);
      assert.equal(wrapA.judge.status, "checked");
      assert.match(wrapA.judge.evidence_sha256, /^[a-f0-9]{64}$/);

      const writtenA = JSON.parse(fs.readFileSync(outBundle, "utf8"));
      assert.equal(writtenA.author.ecbyts_app_verified, true);
      assert.equal(writtenA.observations[0].parameter, "Benzeno (benzene)");
      assert.equal(writtenA.observations[1].below_detection_limit, true);
      assert.equal(writtenA.observations[1].value, null);
      assert.equal(writtenA.observations[1].quantification_limit, 0.01);
      assert.equal(writtenA.observations[1].qualifier, "<LQ");
      assert.match(writtenA.ecbyts_twin_metadata.source_sha256, /^[a-f0-9]{64}$/);

      // Shape B: ecbt.user-case-bundle/1.0.0 with GHG-only fallback
      const caseBundle = {
        schemaVersion: "ecbt.user-case-bundle/1.0.0",
        exportedAtIso: "2026-11-26T16:12:00Z",
        record: {
          caseId: "case-ghg-amazon",
          title: "Inventário Público Clima Amazônia",
          sectorId: "climate",
          snapshot: {
            projectId: "case-ghg-amazon",
            title: "Inventário Público Clima Amazônia",
            vertical: "atmospheric_emissions",
            crsEpsg: 4326,
            updatedAtIso: "2026-11-26T16:12:00Z",
            elements: [],
            observations: [],
            conditions: [],
            ghgInputs: [
              {
                id: "ghg-1",
                scope: 1,
                category: "Queimadas monitoradas INPE",
                quantity: 500,
                unit: "ha",
                emissionFactorKgCo2ePerUnit: 1200,
              },
            ],
            lcaInputs: [],
          },
        },
      };
      const inCase = path.join(tmpDir, "case-ghg-amazon.ecbt.json");
      const outCase = path.join(tmpDir, "contributions", "BR", "clima-queimadas-inpe-inmet.ecbt.json");
      fs.writeFileSync(inCase, JSON.stringify(caseBundle, null, 2), "utf8");

      const wrapB = runWrap({
        repoRoot: DEFAULT_REPO_ROOT,
        inputPath: inCase,
        gapId: "GAP-CE-001",
        outPath: outCase,
        latitude: -3.119,
        longitude: -60.0217,
        githubHandle: "pesquisadora-clima",
        displayName: "Pesquisadora Clima Aberto",
        contributorMode: "human_plus_ai_agent",
        agentRuntime: "gemini",
      });
      assert.equal(wrapB.ok, true, `Wrap B failed: ${JSON.stringify(wrapB)}`);
      assert.equal(wrapB.source_format, "ecbt.user-case-bundle/1.0.0");
      assert.equal(wrapB.observations_converted, 1);

      // Shape C: cert emits free verifiable JSON + SVG (default global EN + PT + bilingual) and refuses template without --preview
      const certDir = path.join(tmpDir, "certs");
      const certOk = runCert({
        repoRoot: DEFAULT_REPO_ROOT,
        targetPath: outBundle,
        outDir: certDir,
      });
      assert.equal(certOk.ok, true, `Cert failed: ${JSON.stringify(certOk)}`);
      assert.equal(certOk.certificate.language, "en");
      assert.match(certOk.certificate.certificate_id, /^OEDT-CERT-[A-F0-9]{12}$/);
      assert.match(certOk.certificate.certificate_sha256, /^[a-f0-9]{64}$/);
      assert.equal(certOk.certificate.tier.level, 1);
      assert.equal(certOk.certificate.preview_only, false);
      assert.equal(fs.existsSync(certOk.files.json_abs), true);
      assert.equal(fs.existsSync(certOk.files.svg_abs), true);
      const svgEn = fs.readFileSync(certOk.files.svg_abs, "utf8");
      assert.ok(svgEn.includes("<svg"));
      assert.ok(svgEn.includes("100% FREE"));
      assert.ok(svgEn.includes("Verifiable Public Recognition Certificate"));
      assert.ok(svgEn.includes("@engenheiro-publico"));
      assert.ok(svgEn.includes(certOk.certificate.certificate_id));
      assert.equal(/R\$/.test(svgEn), false, "Global certificate must stay currency-neutral");

      // Also verify --lang pt
      const certPt = runCert({
        repoRoot: DEFAULT_REPO_ROOT,
        targetPath: outBundle,
        outDir: path.join(tmpDir, "certs-pt"),
        lang: "pt",
      });
      assert.equal(certPt.ok, true);
      assert.equal(certPt.certificate.language, "pt");
      const svgPt = fs.readFileSync(certPt.files.svg_abs, "utf8");
      assert.ok(svgPt.includes("100% GRATUITO"));
      assert.ok(svgPt.includes("Certificado Digital de Reconhecimento Público"));

      // Template file must be rejected by cert without --preview
      const templatePath = path.join(
        DEFAULT_REPO_ROOT,
        "contributions",
        "BR",
        "exemplo-bacia-tiete-estacao-publica.ecbt.json",
      );
      const certBlocked = runCert({
        repoRoot: DEFAULT_REPO_ROOT,
        targetPath: templatePath,
        outDir: certDir,
      });
      assert.equal(certBlocked.ok, false);
      assert.match(certBlocked.error, /is_template_example/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
