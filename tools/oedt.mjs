#!/usr/bin/env node
/**
 * Open Earth Digital Twin — Unified Zero-Dependency Harness CLI (`tools/oedt.mjs`)
 *
 * Inspired by open collaborative verification harnesses ("Many agents & humans, one judge"):
 *   node tools/oedt.mjs setup [--json]
 *   node tools/oedt.mjs next [--program <prog>] [--index <n>] [--all] [--offline] [--json]
 *   node tools/oedt.mjs init <GAP_ID> [--out <file>] [--github <handle>] [--name <name>] [--lat <n>] [--lon <n>] [--force] [--json]
 *   node tools/oedt.mjs wrap <app-export.json> --gap <GAP_ID> [--lat <n>] [--lon <n>] [--github <handle>] [--name <name>] [--url <https://...>] [--agency <str>] [--license <str>] [--mode <human|human_plus_ai_agent>] [--agent <str>] [--out <file>] [--force] [--json]
 *   node tools/oedt.mjs check [file_or_dir] [--json]
 *   node tools/oedt.mjs cert <verified-file.ecbt.json> [--out-dir <dir>] [--pr <url>] [--preview] [--json]
 *   node tools/oedt.mjs board [--json]
 *
 * Zero external dependencies, zero GPU, deterministic fail-closed execution (< 2s).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PROGRAM_TO_DOMAIN,
  VALID_CONTRIBUTOR_MODES,
  VALID_DOMAINS,
  VALID_PROGRAMS,
  computeCanonicalEvidenceSha256,
  resolveRecognitionTier,
  validateContributionFile,
  validatePaths,
} from "../scripts/validate_contribution.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_REPO_ROOT = path.resolve(__dirname, "..");
export const DEFAULT_GITHUB_REPO =
  process.env.OEDT_GITHUB_REPO || "calvinsiost/open-earth-digital-twin";

const DOMAIN_TO_PROGRAM = Object.freeze(
  Object.fromEntries(
    Object.entries(PROGRAM_TO_DOMAIN).map(([prog, dom]) => [dom, prog]),
  ),
);

const SUBSTANCE_LABELS = Object.freeze({
  benzene: "Benzeno (benzene)",
  benzeno: "Benzeno (benzene)",
  toluene: "Tolueno (toluene)",
  tolueno: "Tolueno (toluene)",
  ethylbenzene: "Etilbenzeno (ethylbenzene)",
  xylenes: "Xilenos Totais (xylenes)",
  pce: "Tetracloroeteno (PCE)",
  tce: "Tricloroeteno (TCE)",
  vinyl_chloride: "Cloreto de Vinila",
  lead: "Chumbo Total (Pb)",
  arsenic: "Arsênio Total (As)",
  cadmium: "Cádmio Total (Cd)",
  chromium_vi: "Cromo Hexavalente (Cr VI)",
  pm25: "Material Particulado PM2.5",
  pm10: "Material Particulado PM10",
  no2: "Dióxido de Nitrogênio (NO2)",
  o3: "Ozônio (O3)",
  so2: "Dióxido de Enxofre (SO2)",
  co: "Monóxido de Carbono (CO)",
});

const GAP_ID_GLOBAL_RE = /\bGAP-[A-Z]{2}-\d{3}\b/g;

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function writeUtf8NoBom(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, { encoding: "utf8" });
}

function toKebabSlug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function deriveContributionId(targetFile, countryIso2, fallbackSlug) {
  const base = path.basename(targetFile || fallbackSlug || "contribution", ".ecbt.json");
  const cleanBase = toKebabSlug(base) || "public-contribution";
  const prefix = toKebabSlug(countryIso2 || "");
  if (prefix && !cleanBase.startsWith(`${prefix}-`)) {
    return `${prefix}-${cleanBase}`;
  }
  return cleanBase;
}

function parseOptionalNumber(raw) {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const num = Number(raw);
  return Number.isFinite(num) ? num : NaN;
}

function escapeXml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncateText(text, maxLen) {
  const str = String(text ?? "");
  if (str.length <= maxLen) return str;
  return `${str.slice(0, Math.max(1, maxLen - 1))}…`;
}

export function loadHarnessContext(repoRoot = DEFAULT_REPO_ROOT) {
  const gapsPath = path.join(repoRoot, "desk", "gaps.json");
  const graveyardPath = path.join(repoRoot, "graveyard", "index.json");
  const feedPath = path.join(repoRoot, "feed", "events.jsonl");

  const desk = fs.existsSync(gapsPath) ? readJsonFile(gapsPath) : { programs: [], gaps: [] };
  const graveyard = fs.existsSync(graveyardPath)
    ? readJsonFile(graveyardPath)
    : { policy_tombstones: [], dead_sources: [], refuted_units: [] };

  const knownGapsById = new Map();
  for (const gap of desk.gaps || []) {
    knownGapsById.set(gap.gap_id, gap);
  }

  const deadSourceUrls = new Set();
  for (const dead of graveyard.dead_sources || []) {
    if (typeof dead.official_url === "string" && dead.official_url.trim()) {
      deadSourceUrls.add(dead.official_url.trim().replace(/\/+$/, "").toLowerCase());
    }
  }

  return {
    repoRoot,
    gapsPath,
    graveyardPath,
    feedPath,
    desk,
    graveyard,
    knownGapsById,
    deadSourceUrls,
  };
}

/**
 * Queries GitHub open PRs (public read-only API) to avoid two parallel contributors/agents
 * grabbing the exact same gap simultaneously. Gracefully degrades when offline.
 */
export async function fetchOpenPrClaims({
  repo = DEFAULT_GITHUB_REPO,
  timeoutMs = 2500,
  fetchImpl = globalThis.fetch,
} = {}) {
  const claimedGapIds = new Set();
  const openPrDetails = new Map();

  if (typeof fetchImpl !== "function") {
    return { checked: false, claimedGapIds, openPrDetails, warning: "fetch unavailable" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(
      `https://api.github.com/repos/${repo}/pulls?state=open&per_page=50`,
      {
        signal: controller.signal,
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "open-earth-digital-twin-cli",
        },
      },
    );
    if (!res.ok) {
      return {
        checked: false,
        claimedGapIds,
        openPrDetails,
        warning: `GitHub API HTTP ${res.status}`,
      };
    }
    const pulls = await res.json();
    if (!Array.isArray(pulls)) {
      return { checked: false, claimedGapIds, openPrDetails, warning: "Unexpected PR payload" };
    }
    for (const pr of pulls) {
      const hay = `${pr.title || ""} ${pr.body || ""} ${pr.head?.ref || ""}`;
      const matches = hay.match(GAP_ID_GLOBAL_RE) || [];
      for (const gapId of matches) {
        claimedGapIds.add(gapId);
        if (!openPrDetails.has(gapId)) {
          openPrDetails.set(gapId, {
            number: pr.number,
            html_url: pr.html_url || null,
            author: pr.user?.login || null,
          });
        }
      }
    }
    return { checked: true, claimedGapIds, openPrDetails, openPrCount: pulls.length };
  } catch (err) {
    return {
      checked: false,
      claimedGapIds,
      openPrDetails,
      warning: err?.name === "AbortError" ? "GitHub API timeout" : String(err?.message || err),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * `oedt setup`: verifies Node runtime, harness integrity, desk, graveyard, feed, and judge readiness.
 */
export function runSetup(repoRoot = DEFAULT_REPO_ROOT) {
  const checks = [];
  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
  checks.push({
    name: "node_version",
    ok: Number.isFinite(nodeMajor) && nodeMajor >= 20,
    detail: `Node.js v${process.versions.node} (required >= 20)`,
  });

  const requiredFiles = [
    "SCHEMA_CONTRIBUTION.md",
    "HARNESS_ARCHITECTURE.md",
    "scripts/validate_contribution.mjs",
    "desk/gaps.json",
    "graveyard/index.json",
    "feed/events.jsonl",
  ];

  for (const rel of requiredFiles) {
    const full = path.join(repoRoot, rel);
    const exists = fs.existsSync(full);
    checks.push({
      name: `file:${rel}`,
      ok: exists,
      detail: exists ? "present" : "missing",
    });
  }

  const ctx = loadHarnessContext(repoRoot);
  const programCount = (ctx.desk.programs || []).length;
  const gapCount = (ctx.desk.gaps || []).length;
  checks.push({
    name: "desk_integrity",
    ok: programCount === 6 && gapCount >= 1,
    detail: `${programCount} programs, ${gapCount} registered gaps`,
  });

  const feedLines = fs.existsSync(ctx.feedPath)
    ? fs
        .readFileSync(ctx.feedPath, "utf8")
        .split(/\r?\n/)
        .filter((l) => l.trim().length > 0)
    : [];
  let feedValid = feedLines.length > 0;
  for (const ln of feedLines) {
    try {
      JSON.parse(ln);
    } catch {
      feedValid = false;
      break;
    }
  }
  checks.push({
    name: "feed_jsonl_integrity",
    ok: feedValid,
    detail: `${feedLines.length} structured event(s)`,
  });

  const judgeProbe = validatePaths([path.join(repoRoot, "contributions")], {
    knownGapsById: ctx.knownGapsById,
    deadSourceUrls: ctx.deadSourceUrls,
  });
  checks.push({
    name: "judge_baseline",
    ok: judgeProbe.valid,
    detail: judgeProbe.valid
      ? `${judgeProbe.filesChecked} baseline file(s) verified by judge`
      : judgeProbe.results.flatMap((r) => r.errors).join("; "),
  });

  const ok = checks.every((c) => c.ok);
  return {
    ok,
    node_version: process.versions.node,
    programs: programCount,
    gaps: gapCount,
    checks,
    quick_start: [
      "1. Pick an open gap:     node tools/oedt.mjs next",
      "2A. Browser track:       https://ecbyts.com/app -> Baixar .ecbt -> node tools/oedt.mjs wrap <file.ecbt.json> --gap <GAP_ID> --lat <LAT> --lon <LON> --github <USER>",
      "2B. CLI / Agent track:   node tools/oedt.mjs init <GAP_ID> --github <USER> --lat <LAT> --lon <LON>",
      "3. Run local judge:      node tools/oedt.mjs check <your-file.ecbt.json>",
      "4. Free certificate:     node tools/oedt.mjs cert <your-file.ecbt.json>  (100% free — never pay R$ 25 commercial RT seal for the Challenge)",
    ],
  };
}

/**
 * `oedt next [--program <prog>] [--index <n>] [--all]`: picks the next open gap from desk/gaps.json
 * avoiding dead sources, already merged gaps, and gaps currently claimed in open GitHub PRs.
 */
export function runNext({
  repoRoot = DEFAULT_REPO_ROOT,
  program = null,
  index = 0,
  all = false,
  claimedGapIds = new Set(),
  openPrDetails = new Map(),
  openPrsChecked = false,
} = {}) {
  if (program && !VALID_PROGRAMS.has(program)) {
    return {
      ok: false,
      error: `Unknown program "${program}". Valid programs: ${[...VALID_PROGRAMS].join(", ")}`,
    };
  }

  const ctx = loadHarnessContext(repoRoot);
  const existingPaths = new Set();
  const contribDir = path.join(repoRoot, "contributions");
  if (fs.existsSync(contribDir)) {
    const probe = validatePaths([contribDir], {
      knownGapsById: ctx.knownGapsById,
      deadSourceUrls: ctx.deadSourceUrls,
    });
    for (const r of probe.results) {
      if (r.gapId && !r.isTemplateExample) {
        existingPaths.add(r.gapId);
      }
    }
  }

  const skippedOpenPrs = [];
  const candidates = (ctx.desk.gaps || [])
    .filter((gap) => {
      if (gap.status !== "open") return false;
      if (program && gap.program !== program) return false;
      if (existingPaths.has(gap.gap_id)) return false;
      const allSourcesDead =
        Array.isArray(gap.recommended_sources) &&
        gap.recommended_sources.length > 0 &&
        gap.recommended_sources.every((s) =>
          ctx.deadSourceUrls.has((s.official_url || "").trim().replace(/\/+$/, "").toLowerCase()),
        );
      if (allSourcesDead) return false;
      if (claimedGapIds.has(gap.gap_id)) {
        const prMeta = openPrDetails.get(gap.gap_id) || {};
        skippedOpenPrs.push({
          gap_id: gap.gap_id,
          pr_number: prMeta.number || null,
          pr_url: prMeta.html_url || null,
        });
        return false;
      }
      return true;
    })
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99) || a.gap_id.localeCompare(b.gap_id));

  if (candidates.length === 0) {
    return {
      ok: false,
      skipped_open_prs: skippedOpenPrs,
      open_prs_checked: openPrsChecked,
      error: program
        ? `No unclaimed open gaps remaining for program "${program}".`
        : "No unclaimed open gaps remaining in desk/gaps.json.",
    };
  }

  const safeIndex =
    Number.isInteger(index) && index >= 0 && index < candidates.length ? index : 0;
  const selected = candidates[safeIndex];

  return {
    ok: true,
    open_matching_count: candidates.length,
    selected_index: safeIndex,
    open_prs_checked: openPrsChecked,
    skipped_open_prs: skippedOpenPrs,
    gap: selected,
    candidates: all
      ? candidates.map((g, idx) => ({
          index: idx,
          gap_id: g.gap_id,
          program: g.program,
          country_iso2: g.country_iso2,
          title: g.title,
          target_file: g.target_file,
        }))
      : undefined,
    workflow: {
      unit_rule: "1 file = 1 gap (do not edit desk/gaps.json or HALL_OF_FAME.md in your PR)",
      free_web_app: "https://ecbyts.com/app",
      target_file: selected.target_file,
      init_cmd: `node tools/oedt.mjs init ${selected.gap_id} --github <YOUR_GITHUB_HANDLE> --lat <LAT> --lon <LON>`,
      wrap_cmd: `node tools/oedt.mjs wrap <downloaded-from-ecbyts.ecbt.json> --gap ${selected.gap_id} --github <YOUR_GITHUB_HANDLE> --lat <LAT> --lon <LON>`,
      local_judge_cmd: `node tools/oedt.mjs check ${selected.target_file}`,
      free_cert_cmd: `node tools/oedt.mjs cert ${selected.target_file}`,
    },
  };
}

/**
 * `oedt init <GAP_ID>`: scaffolds a pre-filled contribution file for a specific gap.
 * Unfilled coordinates / placeholder handle fail closed on `check` until real public values are supplied.
 */
export function runInit({
  repoRoot = DEFAULT_REPO_ROOT,
  gapId,
  outPath = null,
  githubHandle = null,
  displayName = null,
  latitude = undefined,
  longitude = undefined,
  contributorMode = "human",
  agentRuntime = null,
  force = false,
} = {}) {
  if (!gapId) {
    return { ok: false, error: 'Missing required <GAP_ID> (example: "GAP-WB-001").' };
  }
  if (!VALID_CONTRIBUTOR_MODES.has(contributorMode)) {
    return {
      ok: false,
      error: `Invalid --mode "${contributorMode}". Must be "human" or "human_plus_ai_agent".`,
    };
  }

  const ctx = loadHarnessContext(repoRoot);
  const gap = ctx.knownGapsById.get(gapId);
  if (!gap) {
    return { ok: false, error: `Unknown gap_id "${gapId}" in desk/gaps.json.` };
  }
  if (gap.status === "dead_source") {
    return { ok: false, error: `Gap "${gapId}" is marked "dead_source" and cannot be initialized.` };
  }

  const targetFull = outPath
    ? path.isAbsolute(outPath)
      ? outPath
      : path.resolve(repoRoot, outPath)
    : path.resolve(repoRoot, gap.target_file);

  if (fs.existsSync(targetFull) && !force) {
    return {
      ok: false,
      error: `Target file already exists: ${targetFull} (pass --force to overwrite).`,
    };
  }

  const primarySource =
    (gap.recommended_sources || []).find(
      (s) =>
        !ctx.deadSourceUrls.has((s.official_url || "").trim().replace(/\/+$/, "").toLowerCase()),
    ) || (gap.recommended_sources || [])[0] || {};

  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const contributionId = deriveContributionId(targetFull, gap.country_iso2, gap.gap_id);

  const parsedLat = parseOptionalNumber(latitude);
  const parsedLon = parseOptionalNumber(longitude);
  if (Number.isNaN(parsedLat) || Number.isNaN(parsedLon)) {
    return { ok: false, error: "Invalid --lat or --lon: must be finite WGS84 decimal numbers." };
  }

  const firstParam = (gap.expected_parameters && gap.expected_parameters[0]) || "Parâmetro Ambiental Público";
  const secondParam =
    (gap.expected_parameters && gap.expected_parameters[gap.expected_parameters.length - 1]) ||
    "Parâmetro Traço (<LQ)";

  const authorObj = {
    github_handle: githubHandle || "seu-usuario-github",
    display_name: displayName || githubHandle || "Seu Nome de Exibição",
    ecbyts_app_verified: false,
    contributor_mode: contributorMode,
  };
  if (agentRuntime) {
    authorObj.agent_runtime = agentRuntime;
  }

  const scaffold = {
    schema_version: "1.0.0",
    contribution_id: contributionId,
    gap_id: gap.gap_id,
    program: gap.program,
    title: gap.title,
    country_iso2: gap.country_iso2,
    region: gap.region,
    domain: gap.domain,
    coordinates: {
      latitude: parsedLat !== undefined ? parsedLat : null,
      longitude: parsedLon !== undefined ? parsedLon : null,
      datum: "WGS84",
    },
    source: {
      agency: primarySource.agency || "Official Public Environmental Agency",
      dataset_name: gap.title,
      official_url: primarySource.official_url || "https://dados.gov.br/dados/conjuntos-dados",
      license: primarySource.expected_license || "Dados Abertos Governamentais (LAI / CC BY 4.0)",
      retrieved_at_utc: nowIso,
      attribution: primarySource.agency || "Official Public Environmental Agency",
    },
    author: authorObj,
    observations: [
      {
        parameter: firstParam,
        matrix: gap.domain,
        value: null,
        unit: "mg/L",
        measured_at_utc: nowIso,
        below_detection_limit: false,
        notes: "Substitua value, unit e measured_at_utc pela medição pública oficial real.",
      },
      {
        parameter: secondParam,
        matrix: gap.domain,
        value: null,
        unit: "mg/L",
        measured_at_utc: nowIso,
        below_detection_limit: true,
        quantification_limit: 0.01,
        qualifier: "<LQ",
        notes: "Remova este bloco ou preencha com um parâmetro real abaixo do limite de quantificação (<LQ).",
      },
    ],
    ecbyts_twin_metadata: {
      format: "ecbt-json-open-contribution",
      generated_with: "tools/oedt.mjs init",
      created_at_utc: nowIso,
    },
    disclaimer_public_data_only: true,
  };

  writeUtf8NoBom(targetFull, `${JSON.stringify(scaffold, null, 2)}\n`);

  const relOut = path.relative(repoRoot, targetFull).replace(/\\/g, "/") || targetFull;
  return {
    ok: true,
    gap_id: gap.gap_id,
    contribution_id: contributionId,
    output_file: relOut,
    output_abs_path: targetFull,
    next_steps: [
      `1. Edit ${relOut} with real public station coordinates (WGS84) and observations (or use https://ecbyts.com/app + oedt wrap).`,
      `2. Run local judge: node tools/oedt.mjs check ${relOut}`,
      `3. Emit free certificate: node tools/oedt.mjs cert ${relOut}`,
    ],
  };
}

function normalizeSubstanceLabel(obs) {
  if (typeof obs.parameter === "string" && obs.parameter.trim()) {
    return obs.parameter.trim();
  }
  if (typeof obs.substanceName === "string" && obs.substanceName.trim()) {
    return obs.substanceName.trim();
  }
  const key = String(obs.substanceKey || "").trim();
  if (!key) return "Parâmetro Ambiental";
  const mapped = SUBSTANCE_LABELS[key.toLowerCase()];
  return mapped || key;
}

function extractSnapshotFromAppExport(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Input JSON root must be an object." };
  }

  // Format 1: Complete project bundle (`projeto-*.ecbt.json`, ecbt.project-bundle/2.1.0)
  if (raw.snapshot && typeof raw.snapshot === "object" && Array.isArray(raw.snapshot.observations)) {
    return {
      ok: true,
      sourceFormat: raw.schemaVersion || "ecbt.project-bundle/2.1.0",
      exportedAtIso: raw.savedAtIso || raw.snapshot.updatedAtIso || null,
      snapshot: raw.snapshot,
    };
  }

  // Format 2: User case bundle (`*.ecbt.json`, ecbt.user-case-bundle/1.0.0)
  if (
    raw.record &&
    typeof raw.record === "object" &&
    raw.record.snapshot &&
    typeof raw.record.snapshot === "object"
  ) {
    return {
      ok: true,
      sourceFormat: raw.schemaVersion || "ecbt.user-case-bundle/1.0.0",
      exportedAtIso: raw.exportedAtIso || raw.record.updatedAtIso || raw.record.snapshot.updatedAtIso || null,
      snapshot: raw.record.snapshot,
    };
  }

  // Format 3: Raw TwinProjectSnapshot (`*.ecbt-zero.json`)
  if (typeof raw.projectId === "string" && Array.isArray(raw.observations)) {
    return {
      ok: true,
      sourceFormat: "ecbt.twin-snapshot/1.0.0",
      exportedAtIso: raw.updatedAtIso || null,
      snapshot: raw,
    };
  }

  // Format 4: Already an OEDT-shaped file (idempotent re-wrap)
  if (typeof raw.schema_version === "string" && Array.isArray(raw.observations)) {
    return {
      ok: true,
      sourceFormat: `oedt-contribution/${raw.schema_version}`,
      exportedAtIso: raw.source?.retrieved_at_utc || null,
      alreadyOedt: true,
      snapshot: {
        projectId: raw.contribution_id || "oedt-import",
        title: raw.title || "Contribuição Ambiental Pública",
        updatedAtIso: raw.source?.retrieved_at_utc || null,
        observations: raw.observations,
        ghgInputs: [],
      },
    };
  }

  return {
    ok: false,
    error:
      "Unrecognized input JSON format. Expected an export from https://ecbyts.com/app (ecbt.project-bundle/2.1.0, ecbt.user-case-bundle/1.0.0, or TwinProjectSnapshot .ecbt-zero.json).",
  };
}

function convertAppObservations(snapshot, fallbackTimestampIso, defaultMatrix, warnings) {
  const out = [];
  const rawObs = Array.isArray(snapshot.observations) ? snapshot.observations : [];

  for (let i = 0; i < rawObs.length; i += 1) {
    const obs = rawObs[i];
    if (!obs || typeof obs !== "object") continue;

    const parameter = normalizeSubstanceLabel(obs);
    const unit =
      typeof obs.unit === "string" && obs.unit.trim().length > 0 ? obs.unit.trim() : "ug/L";
    const measuredAt =
      (typeof obs.sampledAtIso === "string" && !Number.isNaN(Date.parse(obs.sampledAtIso))
        ? obs.sampledAtIso
        : null) ||
      (typeof obs.measured_at_utc === "string" && !Number.isNaN(Date.parse(obs.measured_at_utc))
        ? obs.measured_at_utc
        : null) ||
      fallbackTimestampIso;
    const matrix =
      typeof obs.matrix === "string" && obs.matrix.trim().length > 0
        ? obs.matrix.trim()
        : defaultMatrix;

    const isBelowLq = obs.belowDetectionLimit === true || obs.below_detection_limit === true;
    const rawNum =
      typeof obs.concentration === "number"
        ? obs.concentration
        : typeof obs.value === "number"
          ? obs.value
          : undefined;

    if (isBelowLq) {
      const explicitLq =
        typeof obs.quantificationLimit === "number" && obs.quantificationLimit > 0
          ? obs.quantificationLimit
          : typeof obs.quantification_limit === "number" && obs.quantification_limit > 0
            ? obs.quantification_limit
            : typeof rawNum === "number" && rawNum > 0
              ? rawNum
              : 0.001;

      if (!(obs.quantificationLimit > 0 || obs.quantification_limit > 0 || (rawNum && rawNum > 0))) {
        warnings.push(
          `observations[${i}] (${parameter}): belowDetectionLimit=true lacked positive quantification limit; defaulted to 0.001 — review before PR.`,
        );
      }

      const entry = {
        parameter,
        matrix,
        value: null,
        unit,
        measured_at_utc: measuredAt,
        below_detection_limit: true,
        quantification_limit: explicitLq,
        qualifier: "<LQ",
      };
      if (typeof obs.elementId === "string" && obs.elementId.trim()) {
        entry.station_element_id = obs.elementId.trim();
      }
      out.push(entry);
    } else if (typeof rawNum === "number" && Number.isFinite(rawNum)) {
      if (rawNum < 0) {
        warnings.push(
          `observations[${i}] (${parameter}): negative value (${rawNum} ${unit}) detected — verify physical sign before submitting PR.`,
        );
      }
      const entry = {
        parameter,
        matrix,
        value: rawNum,
        unit,
        measured_at_utc: measuredAt,
        below_detection_limit: false,
      };
      const optLq = obs.quantificationLimit ?? obs.quantification_limit;
      if (typeof optLq === "number" && Number.isFinite(optLq) && optLq > 0) {
        entry.quantification_limit = optLq;
      }
      if (typeof obs.elementId === "string" && obs.elementId.trim()) {
        entry.station_element_id = obs.elementId.trim();
      }
      out.push(entry);
    }
  }

  // Fallback to GHG activity inputs when a climate/emissions twin exported only GHG records
  if (out.length === 0 && Array.isArray(snapshot.ghgInputs) && snapshot.ghgInputs.length > 0) {
    for (const ghg of snapshot.ghgInputs) {
      if (!ghg || typeof ghg !== "object") continue;
      const qty = typeof ghg.quantity === "number" ? ghg.quantity : 0;
      const ef =
        typeof ghg.emissionFactorKgCo2ePerUnit === "number"
          ? ghg.emissionFactorKgCo2ePerUnit
          : 0;
      const tonnesCo2e = Number(((qty * ef) / 1000).toFixed(4));
      out.push({
        parameter: `GEE Escopo ${ghg.scope ?? 1} — ${ghg.category || "Atividade"}`,
        matrix: "atmospheric_emissions",
        value: tonnesCo2e,
        unit: "tCO2e",
        measured_at_utc: fallbackTimestampIso,
        below_detection_limit: false,
      });
    }
  }

  return out;
}

/**
 * `oedt wrap <app-export.json> --gap <GAP_ID> [...]`:
 * Converts an `.ecbt.json` / `.ecbt-zero.json` exported from https://ecbyts.com/app into
 * a judge-ready `contributions/<ISO2>/<slug>.ecbt.json` preserving `<LQ` and SHA-256 provenance,
 * then immediately runs the single deterministic fail-closed judge.
 */
export function runWrap({
  repoRoot = DEFAULT_REPO_ROOT,
  inputPath,
  gapId = null,
  outPath = null,
  url = null,
  agency = null,
  datasetName = null,
  license = null,
  attribution = null,
  githubHandle = null,
  displayName = null,
  latitude = undefined,
  longitude = undefined,
  elevationM = undefined,
  contributorMode = "human",
  agentRuntime = null,
  title = null,
  countryIso2 = null,
  region = null,
  domain = null,
  program = null,
  force = false,
} = {}) {
  if (!inputPath) {
    return {
      ok: false,
      error: "Missing required input file path exported from https://ecbyts.com/app.",
    };
  }
  if (!VALID_CONTRIBUTOR_MODES.has(contributorMode)) {
    return {
      ok: false,
      error: `Invalid --mode "${contributorMode}". Must be "human" or "human_plus_ai_agent".`,
    };
  }

  const resolvedInput = path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(resolvedInput)) {
    return { ok: false, error: `Input file does not exist: ${resolvedInput}` };
  }

  let rawParsed;
  try {
    rawParsed = readJsonFile(resolvedInput);
  } catch (err) {
    return { ok: false, error: `Unable to parse input JSON: ${err.message}` };
  }

  const extracted = extractSnapshotFromAppExport(rawParsed);
  if (!extracted.ok) {
    return { ok: false, error: extracted.error };
  }

  const ctx = loadHarnessContext(repoRoot);
  let gap = null;
  if (gapId) {
    gap = ctx.knownGapsById.get(gapId);
    if (!gap) {
      return { ok: false, error: `Unknown --gap "${gapId}" in desk/gaps.json.` };
    }
    if (gap.status === "dead_source") {
      return { ok: false, error: `Gap "${gapId}" is marked "dead_source" and cannot be wrapped.` };
    }
  }

  const resolvedCountry = (countryIso2 || gap?.country_iso2 || rawParsed.country_iso2 || "BR").toUpperCase();
  const resolvedProgram = program || gap?.program || rawParsed.program || undefined;
  const resolvedDomain =
    domain ||
    gap?.domain ||
    (resolvedProgram && PROGRAM_TO_DOMAIN[resolvedProgram]) ||
    rawParsed.domain ||
    "soil_contaminated_sites";

  if (!VALID_DOMAINS.has(resolvedDomain)) {
    return {
      ok: false,
      error: `Invalid domain "${resolvedDomain}". Valid: ${[...VALID_DOMAINS].join(", ")}`,
    };
  }

  const primarySource =
    (gap?.recommended_sources || []).find(
      (s) =>
        !ctx.deadSourceUrls.has((s.official_url || "").trim().replace(/\/+$/, "").toLowerCase()),
    ) ||
    (gap?.recommended_sources || [])[0] ||
    {};

  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const fallbackTs =
    extracted.exportedAtIso && !Number.isNaN(Date.parse(extracted.exportedAtIso))
      ? extracted.exportedAtIso
      : nowIso;

  const warnings = [];
  const observations = convertAppObservations(
    extracted.snapshot,
    fallbackTs,
    resolvedDomain,
    warnings,
  );
  if (observations.length === 0) {
    warnings.push(
      "No analytical observations or GHG inputs found in the exported file; judge will require at least 1 real public observation.",
    );
  }

  const parsedLat = parseOptionalNumber(latitude ?? rawParsed.coordinates?.latitude);
  const parsedLon = parseOptionalNumber(longitude ?? rawParsed.coordinates?.longitude);
  const parsedElev = parseOptionalNumber(elevationM ?? rawParsed.coordinates?.elevation_m);
  if (Number.isNaN(parsedLat) || Number.isNaN(parsedLon) || Number.isNaN(parsedElev)) {
    return {
      ok: false,
      error: "Invalid coordinate number (--lat, --lon, or --elevation).",
    };
  }

  const defaultSlug = toKebabSlug(extracted.snapshot.title || extracted.snapshot.projectId || "ecbt-public");
  const targetFull = outPath
    ? path.isAbsolute(outPath)
      ? outPath
      : path.resolve(repoRoot, outPath)
    : gap?.target_file
      ? path.resolve(repoRoot, gap.target_file)
      : path.resolve(repoRoot, "contributions", resolvedCountry, `${defaultSlug}.ecbt.json`);

  if (fs.existsSync(targetFull) && !force) {
    return {
      ok: false,
      error: `Output file already exists: ${targetFull} (pass --force to overwrite).`,
    };
  }

  const contributionId = deriveContributionId(targetFull, resolvedCountry, defaultSlug);
  const sourceSha256 = computeCanonicalEvidenceSha256(rawParsed);
  const resolvedAgency = agency || rawParsed.source?.agency || primarySource.agency || "";
  const resolvedUrl = url || rawParsed.source?.official_url || primarySource.official_url || "";
  const resolvedLicense =
    license || rawParsed.source?.license || primarySource.expected_license || "";
  const resolvedDataset =
    datasetName || rawParsed.source?.dataset_name || gap?.title || extracted.snapshot.title || "";

  const coordsObj = {
    latitude: parsedLat !== undefined ? parsedLat : null,
    longitude: parsedLon !== undefined ? parsedLon : null,
    datum: "WGS84",
  };
  if (parsedElev !== undefined) {
    coordsObj.elevation_m = parsedElev;
  }

  const authorObj = {
    github_handle: githubHandle || rawParsed.author?.github_handle || "seu-usuario-github",
    display_name:
      displayName ||
      rawParsed.author?.display_name ||
      githubHandle ||
      "Contribuidor Aberto",
    ecbyts_app_verified: true,
    contributor_mode: contributorMode,
  };
  if (agentRuntime) {
    authorObj.agent_runtime = agentRuntime;
  }

  const wrapped = {
    schema_version: "1.0.0",
    contribution_id: contributionId,
    ...(gap ? { gap_id: gap.gap_id } : {}),
    ...(resolvedProgram ? { program: resolvedProgram } : {}),
    title: title || gap?.title || extracted.snapshot.title || "Contribuição Ambiental Pública",
    country_iso2: resolvedCountry,
    region: region || gap?.region || rawParsed.region || "Informar Município / Bacia / Estado",
    domain: resolvedDomain,
    coordinates: coordsObj,
    source: {
      agency: resolvedAgency,
      dataset_name: resolvedDataset,
      official_url: resolvedUrl,
      license: resolvedLicense,
      retrieved_at_utc: nowIso,
      attribution: attribution || resolvedAgency,
    },
    author: authorObj,
    observations,
    ecbyts_twin_metadata: {
      format: "ecbt-json-open-contribution",
      generated_with: "https://ecbyts.com/app",
      source_schema_version: extracted.sourceFormat,
      source_project_id: extracted.snapshot.projectId || null,
      source_sha256: sourceSha256,
      observations_converted: observations.length,
      wrapped_at_utc: nowIso,
      wrapped_by: "tools/oedt.mjs wrap",
    },
    disclaimer_public_data_only: true,
  };

  writeUtf8NoBom(targetFull, `${JSON.stringify(wrapped, null, 2)}\n`);

  const judgeRes = validateContributionFile(targetFull, {
    knownGapsById: ctx.knownGapsById,
    deadSourceUrls: ctx.deadSourceUrls,
  });

  const relOut = path.relative(repoRoot, targetFull).replace(/\\/g, "/") || targetFull;
  return {
    ok: judgeRes.valid,
    wrapped_written: true,
    source_format: extracted.sourceFormat,
    source_sha256: sourceSha256,
    output_file: relOut,
    output_abs_path: targetFull,
    observations_converted: observations.length,
    warnings,
    judge: {
      valid: judgeRes.valid,
      status: judgeRes.valid ? "checked" : "refuted",
      evidence_sha256: judgeRes.evidenceSha256 || null,
      errors: judgeRes.errors || [],
    },
  };
}

/**
 * `oedt check [file_or_dir]`: runs the single deterministic fail-closed judge + SHA-256 digest.
 */
export function runCheck({ repoRoot = DEFAULT_REPO_ROOT, targets = [] } = {}) {
  const ctx = loadHarnessContext(repoRoot);
  const resolvedTargets =
    targets.length > 0
      ? targets.map((t) => (path.isAbsolute(t) ? t : path.resolve(repoRoot, t)))
      : [path.join(repoRoot, "contributions")];

  const report = validatePaths(resolvedTargets, {
    knownGapsById: ctx.knownGapsById,
    deadSourceUrls: ctx.deadSourceUrls,
  });

  const items = report.results.map((r) => ({
    file: path.relative(repoRoot, r.filePath).replace(/\\/g, "/") || r.filePath,
    status: !r.valid ? "refuted" : r.isTemplateExample ? "template_example" : "checked",
    valid: r.valid,
    contribution_id: r.contributionId || null,
    gap_id: r.gapId || null,
    program: r.program || (r.domain ? DOMAIN_TO_PROGRAM[r.domain] : null) || null,
    github_handle: r.githubHandle || null,
    contributor_mode: r.contributorMode || "human",
    evidence_sha256: r.evidenceSha256 || null,
    errors: r.errors || [],
  }));

  return {
    ok: report.valid,
    judge: "deterministic-fail-closed-v1",
    files_evaluated: report.filesChecked,
    checked_count: items.filter((i) => i.status === "checked").length,
    template_count: items.filter((i) => i.status === "template_example").length,
    refuted_count: items.filter((i) => i.status === "refuted").length,
    items,
  };
}

function renderVisualSealGridSvg(hexDigest, originX, originY, cellSize = 10) {
  // Deterministic 11x11 symmetric cryptographic identicon / verification grid from certificate SHA-256
  const bits = [];
  for (let i = 0; i < hexDigest.length; i += 1) {
    const nibble = Number.parseInt(hexDigest[i], 16);
    bits.push((nibble >> 3) & 1, (nibble >> 2) & 1, (nibble >> 1) & 1, nibble & 1);
  }
  const rects = [];
  const size = 11;
  let bitIdx = 0;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < Math.ceil(size / 2); col += 1) {
      const isCorner =
        (row < 3 && col < 3) || (row >= size - 3 && col < 3);
      const on = isCorner ? row === 0 || row === 2 || row === size - 1 || row === size - 3 || col === 0 || col === 2 : bits[bitIdx % bits.length] === 1;
      bitIdx += 1;
      if (on) {
        const x1 = originX + col * cellSize;
        const y = originY + row * cellSize;
        const fill = isCorner ? "#38BDF8" : "#10B981";
        rects.push(`<rect x="${x1}" y="${y}" width="${cellSize - 1}" height="${cellSize - 1}" rx="1.5" fill="${fill}" />`);
        const mirrorCol = size - 1 - col;
        if (mirrorCol !== col) {
          const x2 = originX + mirrorCol * cellSize;
          rects.push(`<rect x="${x2}" y="${y}" width="${cellSize - 1}" height="${cellSize - 1}" rx="1.5" fill="${fill}" />`);
        }
      }
    }
  }
  return rects.join("\n      ");
}

function renderCertificateSvg(cert) {
  const displayName = escapeXml(truncateText(cert.contributor.display_name, 34));
  const handle = escapeXml(`@${cert.contributor.github_handle}`);
  const tierPt = escapeXml(cert.tier.name_pt);
  const tierEn = escapeXml(cert.tier.name_en);
  const title = escapeXml(truncateText(cert.contribution.title, 58));
  const regionLine = escapeXml(
    truncateText(`${cert.contribution.country_iso2} · ${cert.contribution.region}`, 56),
  );
  const sourceLine = escapeXml(
    truncateText(`${cert.contribution.source_agency} · ${cert.contribution.source_license}`, 64),
  );
  const gapLine = escapeXml(
    `${cert.contribution.gap_id || "OPEN-GAP"} · ${cert.contribution.program || cert.contribution.domain} · ${cert.contributor.contributor_mode}`,
  );
  const certId = escapeXml(cert.certificate_id);
  const evidenceSha = escapeXml(cert.contribution.evidence_sha256);
  const certSha = escapeXml(cert.certificate_sha256);
  const issuedAt = escapeXml(cert.issued_at_utc.slice(0, 10));
  const sealGrid = renderVisualSealGridSvg(cert.certificate_sha256, 988, 224, 12);

  const previewRibbon = cert.preview_only
    ? `<g transform="translate(860, 44)">
      <rect x="0" y="0" width="286" height="34" rx="17" fill="#F59E0B" />
      <text x="143" y="22" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="700" fill="#0B1628">PREVIEW ONLY · TEMPLATE</text>
    </g>`
    : `<g transform="translate(888, 44)">
      <rect x="0" y="0" width="258" height="34" rx="17" fill="#10B981" fill-opacity="0.18" stroke="#10B981" stroke-width="1.5" />
      <text x="129" y="22" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="700" fill="#34D399">100% GRATUITO · VERIFICADO</text>
    </g>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="Open Earth Digital Twin Certificate ${certId}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#071120" />
      <stop offset="55%" stop-color="#0F2039" />
      <stop offset="100%" stop-color="#091929" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10B981" />
      <stop offset="100%" stop-color="#38BDF8" />
    </linearGradient>
  </defs>

  <rect width="1200" height="675" fill="url(#bg)" />
  <rect x="24" y="24" width="1152" height="627" rx="20" fill="none" stroke="url(#accent)" stroke-width="2.5" stroke-opacity="0.85" />
  <rect x="36" y="36" width="1128" height="603" rx="14" fill="none" stroke="#38BDF8" stroke-width="1" stroke-opacity="0.22" />

  <text x="64" y="72" font-family="Segoe UI, Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="2.4" fill="#38BDF8">OPEN EARTH DIGITAL TWIN · GLOBAL PUBLIC CHALLENGE</text>
  <text x="64" y="106" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="800" fill="#F8FAFC">Certificado Digital de Reconhecimento Público</text>
  ${previewRibbon}

  <line x1="64" y1="128" x2="1136" y2="128" stroke="#1E3A5F" stroke-width="1.5" />

  <text x="64" y="172" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="600" letter-spacing="1.4" fill="#94A3B8">CONCEDIDO A / AWARDED TO</text>
  <text x="64" y="218" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="800" fill="#FFFFFF">${displayName}</text>
  <text x="64" y="252" font-family="Consolas, Menlo, monospace" font-size="18" font-weight="600" fill="#34D399">${handle}</text>

  <g transform="translate(64, 276)">
    <rect x="0" y="0" width="600" height="44" rx="10" fill="#0D2A3F" stroke="#10B981" stroke-width="1.5" />
    <text x="18" y="28" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="700" fill="#A7F3D0">Nível ${cert.tier.level}: ${tierPt} (${tierEn})</text>
  </g>

  <text x="64" y="362" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="700" letter-spacing="1.3" fill="#94A3B8">CONTRIBUIÇÃO PÚBLICA VERIFICADA PELO JUIZ DETERMINÍSTICO</text>
  <text x="64" y="392" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="700" fill="#E2E8F0">${title}</text>
  <text x="64" y="422" font-family="Segoe UI, Arial, sans-serif" font-size="16" fill="#CBD5E1">${regionLine}</text>
  <text x="64" y="450" font-family="Segoe UI, Arial, sans-serif" font-size="14" fill="#94A3B8">Fonte oficial: ${sourceLine}</text>
  <text x="64" y="476" font-family="Consolas, Menlo, monospace" font-size="13" fill="#38BDF8">${gapLine}</text>

  <g>
    <rect x="960" y="168" width="188" height="260" rx="16" fill="#08182C" stroke="#38BDF8" stroke-width="1.4" stroke-opacity="0.55" />
    <text x="1054" y="198" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="12" font-weight="700" letter-spacing="1.5" fill="#38BDF8">CRYPTOGRAPHIC SEAL</text>
    <g>
      ${sealGrid}
    </g>
    <text x="1054" y="384" text-anchor="middle" font-family="Consolas, Menlo, monospace" font-size="13" font-weight="700" fill="#F8FAFC">${certId}</text>
    <text x="1054" y="408" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="12" fill="#94A3B8">Emitido em ${issuedAt}</text>
  </g>

  <rect x="64" y="512" width="1072" height="84" rx="12" fill="#06101E" stroke="#1E3A5F" stroke-width="1.2" />
  <text x="84" y="538" font-family="Consolas, Menlo, monospace" font-size="12" fill="#94A3B8">EVIDENCE SHA-256: <tspan fill="#34D399">${evidenceSha}</tspan></text>
  <text x="84" y="560" font-family="Consolas, Menlo, monospace" font-size="12" fill="#94A3B8">CERT SHA-256:     <tspan fill="#38BDF8">${certSha}</tspan></text>
  <text x="84" y="582" font-family="Consolas, Menlo, monospace" font-size="12" fill="#CBD5E1">VERIFY: github.com/${escapeXml(DEFAULT_GITHUB_REPO)} · node tools/oedt.mjs check</text>

  <text x="64" y="624" font-family="Segoe UI, Arial, sans-serif" font-size="12" fill="#64748B">100% Gratuito · Sem premiação monetária · Dados públicos abertos (ODC-By 1.0) · Independente de registro comercial de RT</text>
</svg>
`;
}

/**
 * `oedt cert <verified-file.ecbt.json>`:
 * Emits a 100% free verifiable Challenge Certificate (JSON receipt + SVG card) backed by
 * the single deterministic judge's canonical SHA-256 digest.
 */
export function runCert({
  repoRoot = DEFAULT_REPO_ROOT,
  targetPath,
  outDir = null,
  prUrl = null,
  preview = false,
} = {}) {
  if (!targetPath) {
    return { ok: false, error: "Missing required path to a verified .ecbt.json contribution file." };
  }

  const resolvedTarget = path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(repoRoot, targetPath);
  if (!fs.existsSync(resolvedTarget)) {
    return { ok: false, error: `Contribution file not found: ${resolvedTarget}` };
  }

  const ctx = loadHarnessContext(repoRoot);
  const checkRes = validateContributionFile(resolvedTarget, {
    knownGapsById: ctx.knownGapsById,
    deadSourceUrls: ctx.deadSourceUrls,
  });

  if (!checkRes.valid) {
    return {
      ok: false,
      error: "Cannot emit certificate: contribution failed the deterministic judge.",
      errors: checkRes.errors,
    };
  }

  if (checkRes.isTemplateExample && !preview) {
    return {
      ok: false,
      error:
        "Template example files (`is_template_example: true`) are excluded from real certificates. Pass --preview only to inspect a watermarked preview.",
    };
  }

  const parsed = readJsonFile(resolvedTarget);
  const handle = parsed.author.github_handle;

  // Count how many checked contributions this handle has in contributions/
  let authorCheckedCount = 0;
  let targetAlreadyCounted = false;
  const contribDir = path.join(repoRoot, "contributions");
  if (fs.existsSync(contribDir)) {
    const allProbe = validatePaths([contribDir], {
      knownGapsById: ctx.knownGapsById,
      deadSourceUrls: ctx.deadSourceUrls,
    });
    for (const item of allProbe.results) {
      if (item.valid && !item.isTemplateExample && item.githubHandle === handle) {
        authorCheckedCount += 1;
        if (path.resolve(item.filePath) === path.resolve(resolvedTarget)) {
          targetAlreadyCounted = true;
        }
      }
    }
  }
  if (!checkRes.isTemplateExample && !targetAlreadyCounted) {
    authorCheckedCount += 1;
  }

  const tier = resolveRecognitionTier(Math.max(1, authorCheckedCount));
  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const relFile = path.relative(repoRoot, resolvedTarget).replace(/\\/g, "/") || path.basename(resolvedTarget);
  const certificateId = `OEDT-CERT-${checkRes.evidenceSha256.slice(0, 12).toUpperCase()}`;

  const unsignedCert = {
    schema_version: "oedt.certificate/1.0.0",
    certificate_id: certificateId,
    preview_only: Boolean(preview && checkRes.isTemplateExample),
    free_challenge_policy:
      "100% Free Public Recognition Certificate — Zero fee, decoupled from optional commercial RT registration.",
    issued_at_utc: nowIso,
    contributor: {
      github_handle: handle,
      display_name: parsed.author.display_name,
      contributor_mode: parsed.author.contributor_mode || "human",
      agent_runtime: parsed.author.agent_runtime || null,
    },
    tier: {
      ...tier,
      checked_contributions_count: checkRes.isTemplateExample ? 0 : authorCheckedCount,
    },
    contribution: {
      contribution_id: parsed.contribution_id,
      gap_id: parsed.gap_id || null,
      program: parsed.program || DOMAIN_TO_PROGRAM[parsed.domain] || null,
      domain: parsed.domain,
      country_iso2: parsed.country_iso2,
      region: parsed.region,
      title: parsed.title,
      file: relFile,
      evidence_sha256: checkRes.evidenceSha256,
      source_agency: parsed.source.agency,
      source_official_url: parsed.source.official_url,
      source_license: parsed.source.license,
    },
    verification: {
      repository: `https://github.com/${DEFAULT_GITHUB_REPO}`,
      contribution_url: `https://github.com/${DEFAULT_GITHUB_REPO}/blob/main/${relFile}`,
      pr_url: prUrl || null,
      verify_command: `node tools/oedt.mjs check ${relFile}`,
    },
  };

  const certificateSha256 = computeCanonicalEvidenceSha256(unsignedCert);
  const cert = {
    ...unsignedCert,
    certificate_sha256: certificateSha256,
  };

  const resolvedOutDir = outDir
    ? path.isAbsolute(outDir)
      ? outDir
      : path.resolve(repoRoot, outDir)
    : path.join(repoRoot, "certificates");

  const suffix = cert.preview_only ? ".preview" : "";
  const jsonPath = path.join(resolvedOutDir, `${parsed.contribution_id}${suffix}.cert.json`);
  const svgPath = path.join(resolvedOutDir, `${parsed.contribution_id}${suffix}.svg`);

  writeUtf8NoBom(jsonPath, `${JSON.stringify(cert, null, 2)}\n`);
  writeUtf8NoBom(svgPath, renderCertificateSvg(cert));

  return {
    ok: true,
    certificate: cert,
    files: {
      json: path.relative(repoRoot, jsonPath).replace(/\\/g, "/") || jsonPath,
      svg: path.relative(repoRoot, svgPath).replace(/\\/g, "/") || svgPath,
      json_abs: jsonPath,
      svg_abs: svgPath,
    },
  };
}

/**
 * `oedt board`: aggregates per-program status and "Who is counted" transparency.
 */
export function runBoard(repoRoot = DEFAULT_REPO_ROOT) {
  const ctx = loadHarnessContext(repoRoot);
  const checkReport = runCheck({ repoRoot });

  const perProgram = {};
  for (const prog of ctx.desk.programs || []) {
    perProgram[prog.id] = {
      program: prog.id,
      name_pt: prog.name_pt,
      name_en: prog.name_en,
      open: 0,
      claimed: 0,
      checked: 0,
      refuted: 0,
      dead_source: 0,
    };
  }

  for (const gap of ctx.desk.gaps || []) {
    const bucket = perProgram[gap.program];
    if (!bucket) continue;
    if (gap.status === "open") bucket.open += 1;
    else if (gap.status === "claimed") bucket.claimed += 1;
    else if (gap.status === "checked") bucket.checked += 1;
    else if (gap.status === "refuted") bucket.refuted += 1;
    else if (gap.status === "dead_source") bucket.dead_source += 1;
  }

  const countedGapIds = new Set(
    (ctx.desk.gaps || []).filter((g) => g.status === "checked").map((g) => g.gap_id),
  );
  let humanChecked = 0;
  let humanPlusAgentChecked = 0;
  let templateExamplesPresent = 0;

  for (const item of checkReport.items) {
    if (item.status === "template_example") {
      templateExamplesPresent += 1;
      continue;
    }
    if (item.status === "checked") {
      if (item.program && perProgram[item.program] && (!item.gap_id || !countedGapIds.has(item.gap_id))) {
        perProgram[item.program].checked += 1;
      }
      if (item.contributor_mode === "human_plus_ai_agent") {
        humanPlusAgentChecked += 1;
      } else {
        humanChecked += 1;
      }
    }
  }

  for (const ref of ctx.graveyard.refuted_units || []) {
    if (ref.program && perProgram[ref.program]) {
      perProgram[ref.program].refuted += 1;
    }
  }
  for (const ds of ctx.graveyard.dead_sources || []) {
    if (ds.program && perProgram[ds.program]) {
      perProgram[ds.program].dead_source += 1;
    }
  }

  const rows = Object.values(perProgram);
  const totals = rows.reduce(
    (acc, r) => {
      acc.open += r.open;
      acc.claimed += r.claimed;
      acc.checked += r.checked;
      acc.refuted += r.refuted;
      acc.dead_source += r.dead_source;
      return acc;
    },
    { open: 0, claimed: 0, checked: 0, refuted: 0, dead_source: 0 },
  );

  return {
    ok: true,
    who_is_counted: {
      rule: "Only judge-verified 'checked' units merged in main count toward Hall of Fame & Free Verifiable Challenge Certificates.",
      template_examples_excluded: templateExamplesPresent,
      checked_by_human: humanChecked,
      checked_by_human_plus_ai_agent: humanPlusAgentChecked,
      recognition_policy:
        "100% Free public recognition + Verifiable Digital Certificate (`oedt cert` + GitHub SHA-256). Zero monetary prizes, zero paid seal required.",
    },
    programs: rows,
    totals,
    graveyard_policy_tombstones: (ctx.graveyard.policy_tombstones || []).length,
  };
}

function parseCliArgs(argv) {
  const cmd = argv[0] || "help";
  const rest = argv.slice(1);
  const flags = {};
  const positionals = [];

  const boolFlags = new Set(["json", "offline", "all", "force", "preview"]);

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg.startsWith("--")) {
      const eqIdx = arg.indexOf("=");
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx);
        flags[key] = arg.slice(eqIdx + 1);
      } else {
        const key = arg.slice(2);
        if (boolFlags.has(key)) {
          flags[key] = true;
        } else if (i + 1 < rest.length) {
          flags[key] = rest[i + 1];
          i += 1;
        } else {
          flags[key] = true;
        }
      }
    } else {
      positionals.push(arg);
    }
  }
  return { cmd, flags, positionals };
}

function printHumanSetup(res) {
  console.log("=== Open Earth Digital Twin — Harness Setup ===");
  for (const c of res.checks) {
    console.log(`  [${c.ok ? "OK" : "FAIL"}] ${c.name}: ${c.detail}`);
  }
  console.log("\nQuick Start (Humans & External Agents):");
  for (const ln of res.quick_start) {
    console.log(`  ${ln}`);
  }
}

function printHumanNext(res) {
  if (!res.ok) {
    console.error(`[ERROR] ${res.error}`);
    return;
  }
  if (res.skipped_open_prs && res.skipped_open_prs.length > 0) {
    console.log(
      `[PR-SYNC] Skipped ${res.skipped_open_prs.length} gap(s) already claimed in open PRs: ${res.skipped_open_prs.map((p) => `${p.gap_id} (#${p.pr_number})`).join(", ")}`,
    );
  }
  if (Array.isArray(res.candidates)) {
    console.log("=== All Open Unclaimed Gaps ===");
    for (const c of res.candidates) {
      console.log(`  [${c.index}] ${c.gap_id} | ${c.program} | ${c.country_iso2} | ${c.title}`);
    }
    console.log("");
  }
  const g = res.gap;
  console.log("=== Next Open World-Map Gap ===");
  console.log(`  Gap ID:      ${g.gap_id}  (Program: ${g.program} | Domain: ${g.domain})`);
  console.log(`  Country:     ${g.country_iso2} — ${g.region}`);
  console.log(`  Title:       ${g.title}`);
  console.log(`  Target File: ${g.target_file}`);
  console.log("  Official Public Sources (Login-Free Verified):");
  for (const s of g.recommended_sources || []) {
    console.log(`    - ${s.agency}: ${s.official_url} [${s.expected_license}]`);
  }
  console.log(`  Parameters:  ${(g.expected_parameters || []).join(", ")}`);
  console.log("\nHow to Complete (100% Free · Zero Merge Conflicts · 1 File = 1 Gap):");
  console.log(`  Track A (Browser): ${res.workflow.free_web_app} -> Baixar .ecbt ->`);
  console.log(`     ${res.workflow.wrap_cmd}`);
  console.log(`  Track B (CLI/AI):  ${res.workflow.init_cmd}`);
  console.log(`  Run Judge:         ${res.workflow.local_judge_cmd}`);
  console.log(`  Free Certificate:  ${res.workflow.free_cert_cmd}`);
}

function printHumanInit(res) {
  if (!res.ok) {
    console.error(`[ERROR] ${res.error}`);
    return;
  }
  console.log("=== Scaffold Created (Fail-Closed Until Real Public Data Filled) ===");
  console.log(`  Gap ID:      ${res.gap_id}`);
  console.log(`  Output File: ${res.output_file}`);
  console.log("\nNext Steps:");
  for (const s of res.next_steps) {
    console.log(`  ${s}`);
  }
}

function printHumanWrap(res) {
  if (!res.wrapped_written) {
    console.error(`[ERROR] ${res.error}`);
    return;
  }
  console.log("=== Wrapped ecbyts.com/app Export -> Open Earth Digital Twin Format ===");
  console.log(`  Source Format:  ${res.source_format}`);
  console.log(`  Source SHA-256: ${res.source_sha256}`);
  console.log(`  Output File:    ${res.output_file}`);
  console.log(`  Observations:   ${res.observations_converted}`);
  for (const w of res.warnings || []) {
    console.log(`  [WARN] ${w}`);
  }
  if (res.judge.valid) {
    console.log(`  [CHECKED] Judge passed! evidence_sha256=${res.judge.evidence_sha256}`);
    console.log(`  Next: node tools/oedt.mjs cert ${res.output_file}`);
  } else {
    console.error("  [NEEDS-COMPLETION] Written file needs these fields before PR:");
    for (const err of res.judge.errors) {
      console.error(`    - ${err}`);
    }
  }
}

function printHumanCheck(res) {
  console.log("=== Open Earth Digital Twin — Single Deterministic Judge ===");
  for (const item of res.items) {
    if (item.valid) {
      const label = item.status === "template_example" ? "TEMPLATE-OK" : "CHECKED";
      console.log(`  [${label}] ${item.file}`);
      console.log(`      sha256: ${item.evidence_sha256}`);
      if (item.gap_id) {
        console.log(`      gap_id: ${item.gap_id} | mode: ${item.contributor_mode}`);
      }
    } else {
      console.error(`  [REFUTED] ${item.file}`);
      for (const err of item.errors) {
        console.error(`      - ${err}`);
      }
    }
  }
  console.log(
    `\nSummary: checked=${res.checked_count} | template=${res.template_count} | refuted=${res.refuted_count}`,
  );
}

function printHumanCert(res) {
  if (!res.ok) {
    console.error(`[ERROR] ${res.error}`);
    for (const err of res.errors || []) {
      console.error(`  - ${err}`);
    }
    return;
  }
  const c = res.certificate;
  console.log("=== Open Earth Digital Twin — 100% Free Verifiable Certificate ===");
  console.log(`  Certificate ID: ${c.certificate_id}${c.preview_only ? " (PREVIEW ONLY)" : ""}`);
  console.log(`  Contributor:    ${c.contributor.display_name} (@${c.contributor.github_handle})`);
  console.log(`  Tier:           Level ${c.tier.level} — ${c.tier.name_pt} (${c.tier.name_en})`);
  console.log(`  Evidence SHA:   ${c.contribution.evidence_sha256}`);
  console.log(`  Cert SHA-256:   ${c.certificate_sha256}`);
  console.log(`  JSON Receipt:   ${res.files.json}`);
  console.log(`  SVG Card:       ${res.files.svg}`);
}

function printHumanBoard(res) {
  console.log("=== Open Earth Digital Twin — Global Program Board ===");
  console.log(
    `${"PROGRAM".padEnd(22)} ${"OPEN".padStart(5)} ${"CLAIM".padStart(6)} ${"CHECK".padStart(6)} ${"REFUT".padStart(6)} ${"DEAD".padStart(5)}`,
  );
  console.log("-".repeat(56));
  for (const r of res.programs) {
    console.log(
      `${r.program.padEnd(22)} ${String(r.open).padStart(5)} ${String(r.claimed).padStart(6)} ${String(r.checked).padStart(6)} ${String(r.refuted).padStart(6)} ${String(r.dead_source).padStart(5)}`,
    );
  }
  console.log("-".repeat(56));
  const t = res.totals;
  console.log(
    `${"TOTAL".padEnd(22)} ${String(t.open).padStart(5)} ${String(t.claimed).padStart(6)} ${String(t.checked).padStart(6)} ${String(t.refuted).padStart(6)} ${String(t.dead_source).padStart(5)}`,
  );
  console.log("\nWho Is Counted:");
  console.log(`  - Rule: ${res.who_is_counted.rule}`);
  console.log(`  - Checked (Human):             ${res.who_is_counted.checked_by_human}`);
  console.log(`  - Checked (Human + AI Agent):  ${res.who_is_counted.checked_by_human_plus_ai_agent}`);
  console.log(`  - Template examples excluded:  ${res.who_is_counted.template_examples_excluded}`);
  console.log(`  - Policy: ${res.who_is_counted.recognition_policy}`);
}

async function runCli() {
  const { cmd, flags, positionals } = parseCliArgs(process.argv.slice(2));
  const json = Boolean(flags.json);

  if (cmd === "setup") {
    const res = runSetup();
    if (json) console.log(JSON.stringify(res, null, 2));
    else printHumanSetup(res);
    process.exit(res.ok ? 0 : 1);
  }

  if (cmd === "next") {
    const prSync = flags.offline
      ? { checked: false, claimedGapIds: new Set(), openPrDetails: new Map() }
      : await fetchOpenPrClaims();
    const indexVal = flags.index !== undefined ? Number.parseInt(flags.index, 10) : 0;
    const res = runNext({
      program: flags.program || null,
      index: Number.isFinite(indexVal) ? indexVal : 0,
      all: Boolean(flags.all),
      claimedGapIds: prSync.claimedGapIds,
      openPrDetails: prSync.openPrDetails,
      openPrsChecked: prSync.checked,
    });
    if (json) console.log(JSON.stringify(res, null, 2));
    else printHumanNext(res);
    process.exit(res.ok ? 0 : 1);
  }

  if (cmd === "init") {
    const res = runInit({
      gapId: positionals[0] || flags.gap || null,
      outPath: flags.out || null,
      githubHandle: flags.github || null,
      displayName: flags.name || null,
      latitude: flags.lat,
      longitude: flags.lon,
      contributorMode: flags.mode || "human",
      agentRuntime: flags.agent || null,
      force: Boolean(flags.force),
    });
    if (json) console.log(JSON.stringify(res, null, 2));
    else printHumanInit(res);
    process.exit(res.ok ? 0 : 1);
  }

  if (cmd === "wrap") {
    const res = runWrap({
      inputPath: positionals[0] || null,
      gapId: flags.gap || null,
      outPath: flags.out || null,
      url: flags.url || null,
      agency: flags.agency || null,
      datasetName: flags.dataset || null,
      license: flags.license || null,
      attribution: flags.attribution || null,
      githubHandle: flags.github || null,
      displayName: flags.name || null,
      latitude: flags.lat,
      longitude: flags.lon,
      elevationM: flags.elevation,
      contributorMode: flags.mode || "human",
      agentRuntime: flags.agent || null,
      title: flags.title || null,
      countryIso2: flags.country || null,
      region: flags.region || null,
      domain: flags.domain || null,
      program: flags.program || null,
      force: Boolean(flags.force),
    });
    if (json) console.log(JSON.stringify(res, null, 2));
    else printHumanWrap(res);
    process.exit(res.ok ? 0 : 1);
  }

  if (cmd === "check") {
    const res = runCheck({ targets: positionals });
    if (json) console.log(JSON.stringify(res, null, 2));
    else printHumanCheck(res);
    process.exit(res.ok ? 0 : 1);
  }

  if (cmd === "cert") {
    const res = runCert({
      targetPath: positionals[0] || null,
      outDir: flags["out-dir"] || flags.out || null,
      prUrl: flags.pr || null,
      preview: Boolean(flags.preview),
    });
    if (json) console.log(JSON.stringify(res, null, 2));
    else printHumanCert(res);
    process.exit(res.ok ? 0 : 1);
  }

  if (cmd === "board") {
    const res = runBoard();
    if (json) console.log(JSON.stringify(res, null, 2));
    else printHumanBoard(res);
    process.exit(0);
  }

  console.log("Open Earth Digital Twin Harness CLI (tools/oedt.mjs)");
  console.log("Usage:");
  console.log("  node tools/oedt.mjs setup [--json]");
  console.log("  node tools/oedt.mjs next [--program <prog>] [--index <n>] [--all] [--offline] [--json]");
  console.log("  node tools/oedt.mjs init <GAP_ID> [--github <user>] [--lat <n>] [--lon <n>] [--force] [--json]");
  console.log("  node tools/oedt.mjs wrap <ecbyts-export.json> --gap <GAP_ID> --github <user> --lat <n> --lon <n> [--force] [--json]");
  console.log("  node tools/oedt.mjs check [file_or_dir] [--json]");
  console.log("  node tools/oedt.mjs cert <verified-file.ecbt.json> [--out-dir <dir>] [--pr <url>] [--preview] [--json]");
  console.log("  node tools/oedt.mjs board [--json]");
  process.exit(cmd === "help" || cmd === "--help" || cmd === "-h" ? 0 : 1);
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectExecution) {
  runCli();
}
