#!/usr/bin/env node
/**
 * Open Earth Digital Twin — Unified Zero-Dependency Harness CLI (`tools/oedt.mjs`)
 *
 * Inspired by open collaborative verification harnesses ("Many agents & humans, one judge"):
 *   node tools/oedt.mjs setup
 *   node tools/oedt.mjs next [--program <prog>] [--json]
 *   node tools/oedt.mjs check [file_or_dir] [--json]
 *   node tools/oedt.mjs board [--json]
 *
 * Zero external dependencies, zero GPU, deterministic fail-closed execution (< 2s).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PROGRAM_TO_DOMAIN,
  VALID_PROGRAMS,
  validatePaths,
} from "../scripts/validate_contribution.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_REPO_ROOT = path.resolve(__dirname, "..");

const DOMAIN_TO_PROGRAM = Object.freeze(
  Object.fromEntries(
    Object.entries(PROGRAM_TO_DOMAIN).map(([prog, dom]) => [dom, prog]),
  ),
);

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
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
      : judgeProbe.results
          .flatMap((r) => r.errors)
          .join("; "),
  });

  const ok = checks.every((c) => c.ok);
  return {
    ok,
    node_version: process.versions.node,
    programs: programCount,
    gaps: gapCount,
    checks,
    quick_start: [
      "1. Pick a gap:      node tools/oedt.mjs next",
      "2. Build & validate: https://ecbyts.com/app (free web editor, export .ecbt.json)",
      "3. Run local judge: node tools/oedt.mjs check <your-file.ecbt.json>",
      "4. Submit 1-gap PR: 1 file = 1 gap (public recognition + QR certificate on ecbyts.com)",
    ],
  };
}

/**
 * `oedt next [--program <prog>]`: picks the next open gap from desk/gaps.json avoiding dead sources.
 */
export function runNext({ repoRoot = DEFAULT_REPO_ROOT, program = null } = {}) {
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
      return !allSourcesDead;
    })
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99) || a.gap_id.localeCompare(b.gap_id));

  if (candidates.length === 0) {
    return {
      ok: false,
      error: program
        ? `No open gaps remaining for program "${program}".`
        : "No open gaps remaining in desk/gaps.json.",
    };
  }

  const selected = candidates[0];
  return {
    ok: true,
    open_matching_count: candidates.length,
    gap: selected,
    workflow: {
      unit_rule: "1 file = 1 gap (do not edit desk/gaps.json or HALL_OF_FAME.md in your PR)",
      free_web_app: "https://ecbyts.com/app",
      target_file: selected.target_file,
      local_judge_cmd: `node tools/oedt.mjs check ${selected.target_file}`,
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

  // Count judge-verified real checked files (excluding template examples)
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

  // Include graveyard counts
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
      rule: "Only judge-verified 'checked' units merged in main count toward Hall of Fame & ecbyts.com QR Certificates.",
      template_examples_excluded: templateExamplesPresent,
      checked_by_human: humanChecked,
      checked_by_human_plus_ai_agent: humanPlusAgentChecked,
      recognition_policy: "100% public recognition + Verifiable Digital Certificate (QR Seal on ecbyts.com). Zero monetary prizes.",
    },
    programs: rows,
    totals,
    graveyard_policy_tombstones: (ctx.graveyard.policy_tombstones || []).length,
  };
}

function parseCliArgs(argv) {
  const cmd = argv[0] || "help";
  const rest = argv.slice(1);
  let json = false;
  let program = null;
  const positionals = [];

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === "--json") {
      json = true;
    } else if (arg === "--program" && i + 1 < rest.length) {
      program = rest[i + 1];
      i += 1;
    } else if (arg.startsWith("--program=")) {
      program = arg.slice("--program=".length);
    } else {
      positionals.push(arg);
    }
  }
  return { cmd, json, program, positionals };
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
  const g = res.gap;
  console.log("=== Next Open World-Map Gap ===");
  console.log(`  Gap ID:      ${g.gap_id}  (Program: ${g.program} | Domain: ${g.domain})`);
  console.log(`  Country:     ${g.country_iso2} — ${g.region}`);
  console.log(`  Title:       ${g.title}`);
  console.log(`  Target File: ${g.target_file}`);
  console.log("  Official Public Sources:");
  for (const s of g.recommended_sources || []) {
    console.log(`    - ${s.agency}: ${s.official_url} [${s.expected_license}]`);
  }
  console.log(`  Parameters:  ${(g.expected_parameters || []).join(", ")}`);
  console.log("\nHow to Complete (Zero Merge Conflicts — 1 File = 1 Gap):");
  console.log(`  1. Build/validate free at ${res.workflow.free_web_app}`);
  console.log(`  2. Save JSON to ${res.workflow.target_file}`);
  console.log(`  3. Run judge: ${res.workflow.local_judge_cmd}`);
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

function runCli() {
  const { cmd, json, program, positionals } = parseCliArgs(process.argv.slice(2));

  if (cmd === "setup") {
    const res = runSetup();
    if (json) console.log(JSON.stringify(res, null, 2));
    else printHumanSetup(res);
    process.exit(res.ok ? 0 : 1);
  }

  if (cmd === "next") {
    const res = runNext({ program });
    if (json) console.log(JSON.stringify(res, null, 2));
    else printHumanNext(res);
    process.exit(res.ok ? 0 : 1);
  }

  if (cmd === "check") {
    const res = runCheck({ targets: positionals });
    if (json) console.log(JSON.stringify(res, null, 2));
    else printHumanCheck(res);
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
  console.log("  node tools/oedt.mjs next [--program <prog>] [--json]");
  console.log("  node tools/oedt.mjs check [file_or_dir] [--json]");
  console.log("  node tools/oedt.mjs board [--json]");
  process.exit(cmd === "help" || cmd === "--help" || cmd === "-h" ? 0 : 1);
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectExecution) {
  runCli();
}
