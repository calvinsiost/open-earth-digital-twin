#!/usr/bin/env node
/**
 * Open Earth Digital Twin — Single Deterministic Fail-Closed Judge (Zero-Dependency Node.js ESM)
 *
 * Validates `contributions/**\/*.ecbt.json` files (or explicitly passed paths) in < 2s without GPU:
 *  - Required schema metadata, canonical environmental domain, optional Program & Gap ID
 *  - Valid WGS84 coordinates within globe bounds
 *  - Verifiable public HTTPS source URL & open-data compatible license (blocks CC BY-NC / closed)
 *  - Explicit analytical handling of <LQ (below_detection_limit)
 *  - Strict blocking of PII (CPF, SSN, personal email, phone) & private/confidential terms
 *  - Explicit `disclaimer_public_data_only: true`
 *  - Canonical deterministic SHA-256 evidence digest & 1-file-per-gap isolation checks
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const VALID_DOMAINS = new Set([
  "water_basins",
  "air_quality",
  "soil_contaminated_sites",
  "climate_emissions",
  "biodiversity_forests",
  "waste_sanitation",
]);

export const VALID_PROGRAMS = new Set([
  "water-basins",
  "air-quality",
  "contaminated-sites",
  "climate-emissions",
  "biomes-biodiversity",
  "sanitation-waste",
]);

export const PROGRAM_TO_DOMAIN = Object.freeze({
  "water-basins": "water_basins",
  "air-quality": "air_quality",
  "contaminated-sites": "soil_contaminated_sites",
  "climate-emissions": "climate_emissions",
  "biomes-biodiversity": "biodiversity_forests",
  "sanitation-waste": "waste_sanitation",
});

export const VALID_CONTRIBUTOR_MODES = new Set(["human", "human_plus_ai_agent"]);

const ISO2_RE = /^[A-Z]{2}$/;
const KEBAB_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GAP_ID_RE = /^GAP-[A-Z]{2}-\d{3}$/;
const GITHUB_HANDLE_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

const FORBIDDEN_LICENSE_PATTERNS = [
  /\bcc[\s-]*by[\s-]*nc(?:[\s-]*(?:sa|nd))?\b/i,
  /\bnon[\s-]*commercial\b/i,
  /\bnao[\s-]*comercial\b/i,
  /\ball\s+rights\s+reserved\b/i,
  /\btodos\s+os\s+direitos\s+reservados\b/i,
  /\b(proprietary|proprietari[oa]|closed|fechad[oa]|private|privad[oa]|confidential|confidencial|internal\s+only|uso\s+interno|restrit[oa])\b/i,
];

const ALLOWED_OPEN_LICENSE_RE =
  /\b(cc0|cc[\s-]*by(?:[\s-]*sa)?(?:\s*4\.0|\s*3\.0)?|odc[\s-]*by|odbl|pddl|public\s+domain|dominio\s+publico|dados\s+abertos|dados\s+publicos|lai|open\s+government\s+licen[cs]e|ogl|copernicus|inspire|nasa\s+open\s+data|mit|apache[\s-]*2\.0|bsd)\b/i;

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const CPF_FORMATTED_RE = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/;
const CPF_LABELED_RE = /\bcpf\b[^\d]{0,12}\d{11}\b/i;
const SSN_FORMATTED_RE = /\b\d{3}-\d{2}-\d{4}\b/;
const BR_PHONE_RE = /(?:\+?55[\s.-]*)?(?:\(?\d{2}\)?[\s.-]+)9?\d{4}-\d{4}\b/;
const INTL_PHONE_RE = /\+\d{1,3}[\s.-]\(?\d{2,3}\)?[\s.-]\d{3,4}[\s.-]\d{4}\b/;

const FORBIDDEN_CONFIDENTIAL_TERMS_RE =
  /\b(confidencial|confidential|cliente\s+privado|private\s+client|laudo\s+privado|dados\s+privados|estritamente\s+privado|sigilo\s+contratual|uso\s+interno\s+restrito|senha|password|api_?key|secret_?key|access_?token|private_?key)\b/i;
const PRIVATE_KEY_HEADER_RE = /-----begin\s+(?:rsa\s+|ec\s+|openssh\s+)?private\s+key/i;

function stripAccents(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeJson(item)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Computes a deterministic canonical SHA-256 digest of a contribution object.
 * @param {unknown} data
 * @returns {string}
 */
export function computeCanonicalEvidenceSha256(data) {
  const canonical = canonicalizeJson(data);
  return crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
}

function isValidPublicHttpsUrl(raw) {
  if (!isNonEmptyString(raw)) {
    return { ok: false, reason: "missing or empty URL" };
  }
  let parsed;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { ok: false, reason: `invalid URL syntax ("${raw}")` };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, reason: `URL must use https:// protocol (got "${parsed.protocol}")` };
  }
  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    !host.includes(".") ||
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(?:1[6-9]|2\d|3[0-1])\./.test(host) ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return { ok: false, reason: `URL hostname must be a public domain (got "${host}")` };
  }
  return { ok: true };
}

function scanStringForPiiAndSecrets(str, jsonPath, errors) {
  const normalized = stripAccents(str);

  if (EMAIL_RE.test(str)) {
    errors.push(`PII blocked at "${jsonPath}": personal email address detected.`);
  }
  if (CPF_FORMATTED_RE.test(str) || CPF_LABELED_RE.test(normalized)) {
    errors.push(`PII blocked at "${jsonPath}": CPF number pattern detected.`);
  }
  if (SSN_FORMATTED_RE.test(str)) {
    errors.push(`PII blocked at "${jsonPath}": SSN number pattern detected.`);
  }
  if (BR_PHONE_RE.test(str) || INTL_PHONE_RE.test(str)) {
    errors.push(`PII blocked at "${jsonPath}": phone number pattern detected.`);
  }
  const confidentialMatch = normalized.match(FORBIDDEN_CONFIDENTIAL_TERMS_RE);
  if (confidentialMatch) {
    errors.push(
      `Private/confidential term blocked at "${jsonPath}": matched "${confidentialMatch[0]}".`,
    );
  }
  if (PRIVATE_KEY_HEADER_RE.test(normalized)) {
    errors.push(`Secret material blocked at "${jsonPath}": private key block detected.`);
  }
}

function scanValueRecursive(value, jsonPath, errors) {
  if (typeof value === "string") {
    scanStringForPiiAndSecrets(value, jsonPath, errors);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      scanValueRecursive(item, `${jsonPath}[${index}]`, errors);
    });
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, nested] of Object.entries(value)) {
      const nextPath = jsonPath ? `${jsonPath}.${key}` : key;
      scanValueRecursive(nested, nextPath, errors);
    }
  }
}

/**
 * Validates a parsed `.ecbt.json` contribution object.
 * @param {unknown} data
 * @param {{
 *   expectedCountryDir?: string,
 *   knownGapsById?: Map<string, any>,
 *   deadSourceUrls?: Set<string>
 * }} [options]
 * @returns {{ valid: boolean, errors: string[], evidenceSha256?: string }}
 */
export function validateContributionObject(data, options = {}) {
  const errors = [];

  if (!isPlainObject(data)) {
    return { valid: false, errors: ["Root JSON value must be an object."] };
  }

  // 1. Core metadata
  if (!isNonEmptyString(data.schema_version)) {
    errors.push('Missing or invalid "schema_version" (non-empty string required).');
  }
  if (!isNonEmptyString(data.contribution_id) || !KEBAB_ID_RE.test(data.contribution_id)) {
    errors.push(
      'Missing or invalid "contribution_id" (lowercase ASCII kebab-case required).',
    );
  }
  if (!isNonEmptyString(data.title) || data.title.trim().length < 5) {
    errors.push('Missing or invalid "title" (at least 5 characters required).');
  }
  if (!isNonEmptyString(data.country_iso2) || !ISO2_RE.test(data.country_iso2)) {
    errors.push(
      'Missing or invalid "country_iso2" (2 uppercase ISO 3166-1 alpha-2 letters required).',
    );
  } else if (
    options.expectedCountryDir &&
    options.expectedCountryDir !== data.country_iso2
  ) {
    errors.push(
      `Country directory mismatch: folder is "${options.expectedCountryDir}" but "country_iso2" is "${data.country_iso2}".`,
    );
  }
  if (!isNonEmptyString(data.region)) {
    errors.push('Missing or invalid "region" (non-empty string required).');
  }
  if (!isNonEmptyString(data.domain) || !VALID_DOMAINS.has(data.domain)) {
    errors.push(
      `Invalid "domain": must be one of [${[...VALID_DOMAINS].join(", ")}].`,
    );
  }

  // Optional harness metadata: program & gap_id
  if (data.program !== undefined) {
    if (!isNonEmptyString(data.program) || !VALID_PROGRAMS.has(data.program)) {
      errors.push(
        `Invalid "program": must be one of [${[...VALID_PROGRAMS].join(", ")}].`,
      );
    } else if (
      VALID_DOMAINS.has(data.domain) &&
      PROGRAM_TO_DOMAIN[data.program] !== data.domain
    ) {
      errors.push(
        `Program/domain mismatch: program "${data.program}" requires domain "${PROGRAM_TO_DOMAIN[data.program]}" (got "${data.domain}").`,
      );
    }
  }

  if (data.gap_id !== undefined) {
    if (!isNonEmptyString(data.gap_id) || !GAP_ID_RE.test(data.gap_id)) {
      errors.push(
        'Invalid "gap_id": must match format GAP-XX-NNN (e.g. "GAP-WB-001").',
      );
    } else if (options.knownGapsById) {
      const gap = options.knownGapsById.get(data.gap_id);
      if (!gap) {
        errors.push(`Unknown "gap_id" "${data.gap_id}": not registered in desk/gaps.json.`);
      } else {
        if (gap.domain && data.domain && gap.domain !== data.domain) {
          errors.push(
            `Gap domain mismatch: "${data.gap_id}" expects domain "${gap.domain}" (got "${data.domain}").`,
          );
        }
        if (gap.program && data.program && gap.program !== data.program) {
          errors.push(
            `Gap program mismatch: "${data.gap_id}" expects program "${gap.program}" (got "${data.program}").`,
          );
        }
        if (gap.status === "dead_source") {
          errors.push(
            `Gap "${data.gap_id}" is marked "dead_source" in desk/gaps.json and cannot be submitted.`,
          );
        }
      }
    }
  }

  // 2. Public-data disclaimer
  if (data.disclaimer_public_data_only !== true) {
    errors.push(
      'Field "disclaimer_public_data_only" must be boolean true to attest 100% public data.',
    );
  }

  // 3. Coordinates (WGS84 globe bounds)
  if (!isPlainObject(data.coordinates)) {
    errors.push('Missing or invalid "coordinates" object.');
  } else {
    const { latitude, longitude, datum, elevation_m } = data.coordinates;
    if (
      typeof latitude !== "number" ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      errors.push(
        `Invalid "coordinates.latitude": must be a finite number between -90 and 90 (got ${JSON.stringify(latitude)}).`,
      );
    }
    if (
      typeof longitude !== "number" ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      errors.push(
        `Invalid "coordinates.longitude": must be a finite number between -180 and 180 (got ${JSON.stringify(longitude)}).`,
      );
    }
    if (!isNonEmptyString(datum) || datum.trim().toUpperCase() !== "WGS84") {
      errors.push('Invalid "coordinates.datum": must be "WGS84".');
    }
    if (
      elevation_m !== undefined &&
      (typeof elevation_m !== "number" || !Number.isFinite(elevation_m))
    ) {
      errors.push('Optional "coordinates.elevation_m" must be a finite number.');
    }
  }

  // 4. Official public source & open license
  if (!isPlainObject(data.source)) {
    errors.push('Missing or invalid "source" object.');
  } else {
    const { agency, dataset_name, official_url, license, retrieved_at_utc } = data.source;
    if (!isNonEmptyString(agency)) {
      errors.push('Missing or invalid "source.agency".');
    }
    if (!isNonEmptyString(dataset_name)) {
      errors.push('Missing or invalid "source.dataset_name".');
    }
    const urlCheck = isValidPublicHttpsUrl(official_url);
    if (!urlCheck.ok) {
      errors.push(`Invalid "source.official_url": ${urlCheck.reason}.`);
    } else if (
      options.deadSourceUrls &&
      options.deadSourceUrls.has(official_url.trim().replace(/\/+$/, "").toLowerCase())
    ) {
      errors.push(
        `Buried source blocked: "${official_url}" is listed in graveyard/index.json as a dead or rejected source.`,
      );
    }
    if (data.source.secondary_reference_url !== undefined) {
      const secCheck = isValidPublicHttpsUrl(data.source.secondary_reference_url);
      if (!secCheck.ok) {
        errors.push(`Invalid "source.secondary_reference_url": ${secCheck.reason}.`);
      }
    }
    if (!isNonEmptyString(license)) {
      errors.push('Missing or invalid "source.license".');
    } else {
      const normLic = stripAccents(license);
      const forbidden = FORBIDDEN_LICENSE_PATTERNS.find((re) => re.test(normLic));
      if (forbidden) {
        errors.push(
          `Forbidden license in "source.license" ("${license}"): non-commercial (NC), private, or closed licenses are not allowed.`,
        );
      } else if (!ALLOWED_OPEN_LICENSE_RE.test(normLic)) {
        errors.push(
          `Unrecognized or non-open license in "source.license" ("${license}"): use an open-data license such as CC0, CC BY 4.0, ODC-By, ODbL, Public Domain, LAI / Dados Abertos, OGL, or Copernicus Open Data.`,
        );
      }
    }
    if (!isNonEmptyString(retrieved_at_utc) || Number.isNaN(Date.parse(retrieved_at_utc))) {
      errors.push(
        'Missing or invalid "source.retrieved_at_utc" (valid ISO-8601 UTC timestamp required).',
      );
    }
  }

  // 5. Author metadata (transparent Human vs Human + AI Agent)
  if (!isPlainObject(data.author)) {
    errors.push('Missing or invalid "author" object.');
  } else {
    const {
      github_handle,
      display_name,
      ecbyts_app_verified,
      contributor_mode,
      agent_runtime,
    } = data.author;
    if (!isNonEmptyString(github_handle) || !GITHUB_HANDLE_RE.test(github_handle)) {
      errors.push(
        'Missing or invalid "author.github_handle" (valid GitHub username without "@" required).',
      );
    }
    if (!isNonEmptyString(display_name)) {
      errors.push('Missing or invalid "author.display_name".');
    }
    if (typeof ecbyts_app_verified !== "boolean") {
      errors.push('Missing or invalid "author.ecbyts_app_verified" (boolean required).');
    }
    if (
      contributor_mode !== undefined &&
      (!isNonEmptyString(contributor_mode) ||
        !VALID_CONTRIBUTOR_MODES.has(contributor_mode))
    ) {
      errors.push(
        'Optional "author.contributor_mode" must be "human" or "human_plus_ai_agent".',
      );
    }
    if (agent_runtime !== undefined && !isNonEmptyString(agent_runtime)) {
      errors.push('Optional "author.agent_runtime" must be a non-empty string when provided.');
    }
  }

  // 6. Observations & <LQ support
  if (!Array.isArray(data.observations) || data.observations.length === 0) {
    errors.push('Field "observations" must be a non-empty array.');
  } else {
    data.observations.forEach((obs, idx) => {
      const prefix = `observations[${idx}]`;
      if (!isPlainObject(obs)) {
        errors.push(`${prefix} must be an object.`);
        return;
      }
      if (!isNonEmptyString(obs.parameter)) {
        errors.push(`${prefix}.parameter must be a non-empty string.`);
      }
      if (!isNonEmptyString(obs.unit)) {
        errors.push(`${prefix}.unit must be a non-empty string.`);
      }
      if (!isNonEmptyString(obs.measured_at_utc) || Number.isNaN(Date.parse(obs.measured_at_utc))) {
        errors.push(`${prefix}.measured_at_utc must be a valid ISO-8601 date/timestamp.`);
      }
      if (typeof obs.below_detection_limit !== "boolean") {
        errors.push(`${prefix}.below_detection_limit must be a boolean.`);
      } else if (obs.below_detection_limit === true) {
        const valueOk =
          obs.value === null ||
          (typeof obs.value === "string" && /^<\s*lq\b/i.test(obs.value.trim()));
        if (!valueOk) {
          errors.push(
            `${prefix}.value must be null (or "<LQ") when below_detection_limit is true.`,
          );
        }
        if (
          typeof obs.quantification_limit !== "number" ||
          !Number.isFinite(obs.quantification_limit) ||
          obs.quantification_limit <= 0
        ) {
          errors.push(
            `${prefix}.quantification_limit must be a positive finite number when below_detection_limit is true.`,
          );
        }
      } else {
        if (typeof obs.value !== "number" || !Number.isFinite(obs.value)) {
          errors.push(
            `${prefix}.value must be a finite number when below_detection_limit is false.`,
          );
        }
      }
    });
  }

  // 7. Recursive PII & private/confidential blocker across all values
  scanValueRecursive(data, "", errors);

  const valid = errors.length === 0;
  return {
    valid,
    errors,
    evidenceSha256: valid ? computeCanonicalEvidenceSha256(data) : undefined,
  };
}

/**
 * Validates a single `.ecbt.json` file on disk.
 * @param {string} filePath
 * @param {{ knownGapsById?: Map<string, any>, deadSourceUrls?: Set<string> }} [context]
 */
export function validateContributionFile(filePath, context = {}) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    return {
      filePath,
      valid: false,
      errors: [`Unable to read file: ${err.message}`],
    };
  }

  if (raw.charCodeAt(0) === 0xfeff) {
    return {
      filePath,
      valid: false,
      errors: ["File contains UTF-8 BOM; save as UTF-8 without BOM."],
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      filePath,
      valid: false,
      errors: [`Invalid JSON syntax: ${err.message}`],
    };
  }

  const normalizedPath = filePath.replace(/\\/g, "/");
  const matchDir = normalizedPath.match(/(?:^|\/)contributions\/([A-Z]{2})\/[^/]+\.ecbt\.json$/);
  const expectedCountryDir = matchDir ? matchDir[1] : undefined;

  const result = validateContributionObject(parsed, {
    expectedCountryDir,
    knownGapsById: context.knownGapsById,
    deadSourceUrls: context.deadSourceUrls,
  });

  return {
    filePath,
    valid: result.valid,
    errors: result.errors,
    evidenceSha256: result.evidenceSha256,
    contributionId: isPlainObject(parsed) ? parsed.contribution_id : undefined,
    gapId: isPlainObject(parsed) ? parsed.gap_id : undefined,
    program: isPlainObject(parsed) ? parsed.program : undefined,
    domain: isPlainObject(parsed) ? parsed.domain : undefined,
    isTemplateExample: isPlainObject(parsed) && parsed.is_template_example === true,
    contributorMode:
      isPlainObject(parsed) && isPlainObject(parsed.author)
        ? parsed.author.contributor_mode || "human"
        : "human",
  };
}

function collectContributionFiles(targetPath, found = []) {
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    if (targetPath.endsWith(".ecbt.json")) {
      found.push(targetPath);
    }
    return found;
  }
  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    const full = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      collectContributionFiles(full, found);
    } else if (entry.isFile() && entry.name.endsWith(".ecbt.json")) {
      found.push(full);
    }
  }
  return found;
}

/**
 * Validates one or more paths (directories or `.ecbt.json` files), enforcing
 * unique `contribution_id` and `1 file = 1 gap` (`gap_id` uniqueness).
 * @param {string[]} targets
 * @param {{ knownGapsById?: Map<string, any>, deadSourceUrls?: Set<string> }} [context]
 */
export function validatePaths(targets, context = {}) {
  const files = [];
  for (const target of targets) {
    if (!fs.existsSync(target)) {
      return {
        valid: false,
        filesChecked: 0,
        results: [{ filePath: target, valid: false, errors: ["Path does not exist."] }],
      };
    }
    collectContributionFiles(target, files);
  }

  files.sort();
  if (files.length === 0) {
    return {
      valid: false,
      filesChecked: 0,
      results: [{ filePath: targets.join(", "), valid: false, errors: ["No .ecbt.json files found."] }],
    };
  }

  const seenIds = new Map();
  const seenGaps = new Map();
  const results = files.map((filePath) => {
    const res = validateContributionFile(filePath, context);
    if (res.contributionId) {
      if (seenIds.has(res.contributionId)) {
        res.valid = false;
        res.errors.push(
          `Duplicate contribution_id "${res.contributionId}" (already defined in ${seenIds.get(res.contributionId)}).`,
        );
      } else {
        seenIds.set(res.contributionId, filePath);
      }
    }
    if (res.gapId && !res.isTemplateExample) {
      if (seenGaps.has(res.gapId)) {
        res.valid = false;
        res.errors.push(
          `Unit isolation violation (1 file = 1 gap): gap_id "${res.gapId}" already claimed by ${seenGaps.get(res.gapId)}.`,
        );
      } else {
        seenGaps.set(res.gapId, filePath);
      }
    }
    return res;
  });

  const allValid = results.every((r) => r.valid);
  return { valid: allValid, filesChecked: files.length, results };
}

function runCli() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, "..");
  const args = process.argv.slice(2);
  const targets =
    args.length > 0
      ? args.map((p) => path.resolve(process.cwd(), p))
      : [path.join(repoRoot, "contributions")];

  const report = validatePaths(targets);

  for (const item of report.results) {
    const rel = path.relative(repoRoot, item.filePath) || item.filePath;
    if (item.valid) {
      const tag = item.isTemplateExample ? "[TEMPLATE-OK]" : "[PASS]";
      console.log(`${tag} ${rel} (sha256=${item.evidenceSha256})`);
    } else {
      console.error(`[FAIL] ${rel}`);
      for (const err of item.errors) {
        console.error(`  - ${err}`);
      }
    }
  }

  if (report.valid) {
    console.log(
      `\nValidation passed: ${report.filesChecked} contribution file(s) verified with 0 errors.`,
    );
    process.exit(0);
  } else {
    const failedCount = report.results.filter((r) => !r.valid).length;
    console.error(
      `\nValidation failed: ${failedCount} of ${report.filesChecked || report.results.length} target(s) rejected.`,
    );
    process.exit(1);
  }
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectExecution) {
  runCli();
}
