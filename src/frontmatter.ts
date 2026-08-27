import type { App, TFile } from "obsidian";
import type { DocConfig, PdfTheme } from "./types";

/** Frontmatter key holding the document-level configuration. */
export const DOC_CONFIG_KEY = "rhino-pdf";

/**
 * How each overridable PdfTheme field is validated. Fields absent from this
 * table cannot be set from frontmatter: `id`, `name` and `builtin` would let a
 * note rename the resolved theme, and `coverInfoFields` is superseded by the
 * document-level `coverInfo` key.
 */
type FieldSpec =
  | { kind: "text" }
  | { kind: "boolean" }
  | { kind: "number"; min: number; max: number }
  | { kind: "color" }
  | { kind: "length" }
  | { kind: "font" }
  | { kind: "enum"; values: readonly string[] }
  | { kind: "margins" };

const FIELD_SPECS: Partial<Record<keyof PdfTheme, FieldSpec>> = {
  primaryColor: { kind: "color" },
  accentColor: { kind: "color" },
  
  h2FontSize: { kind: "text" },
  h2FontColor: { kind: "color" },
  h2FontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  h2FontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  h3FontSize: { kind: "text" },
  h3FontColor: { kind: "color" },
  h3FontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  h3FontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  h4FontSize: { kind: "text" },
  h4FontColor: { kind: "color" },
  h4FontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  h4FontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  h5FontSize: { kind: "text" },
  h5FontColor: { kind: "color" },
  h5FontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  h5FontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  h6FontSize: { kind: "text" },
  h6FontColor: { kind: "color" },
  h6FontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  h6FontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  
  logoPath: { kind: "text" },
  backgroundPath: { kind: "text" },
  showCover: { kind: "boolean" },
  showToc: { kind: "boolean" },
  tocTitle: { kind: "text" },
  tocH2FontSize: { kind: "text" },
  tocH2FontColor: { kind: "color" },
  tocH2FontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  tocH2FontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  tocH2Indent: { kind: "text" },
  tocH2ListIndexWidth: { kind: "text" },
  tocH3FontSize: { kind: "text" },
  tocH3FontColor: { kind: "color" },
  tocH3FontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  tocH3FontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  tocH3Indent: { kind: "text" },
  tocH3ListIndexWidth: { kind: "text" },
  tocH4FontSize: { kind: "text" },
  tocH4FontColor: { kind: "color" },
  tocH4FontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  tocH4FontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  tocH4Indent: { kind: "text" },
  tocH4ListIndexWidth: { kind: "text" },

  showLof: { kind: "boolean" },
  lofTitle: { kind: "text" },
  lofKeyword: { kind: "text" },
  lofFontSize: { kind: "text" },
  lofFontColor: { kind: "color" },
  lofFontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  lofFontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  lofListIndexWidth: { kind: "text" },
  lofIndent: { kind: "text" },
  showLot: { kind: "boolean" },
  lotTitle: { kind: "text" },
  lotKeyword: { kind: "text" },
  lotFontSize: { kind: "text" },
  lotFontColor: { kind: "color" },
  lotFontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  lotFontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  lotListIndexWidth: { kind: "text" },
  lotIndent: { kind: "text" },
  
  title: { kind: "text" },
  titleFontSize: { kind: "text" },
  titleFontColor: { kind: "color" },
  titleFontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  titleFontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  subtitle: { kind: "text" },
  subtitleFontSize: { kind: "text" },
  subtitleFontColor: { kind: "color" },
  subtitleFontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  subtitleFontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  additionalContent: { kind: "text" },
  additionalContentFontSize: { kind: "text" },
  additionalContentFontColor: { kind: "color" },
  additionalContentFontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  additionalContentFontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  dedicatedCover: { kind: "boolean" },
  coverBackgroundPath: { kind: "text" },
  coverImagePath: { kind: "text" },
  protocolLike: { kind: "boolean" },
  protocolTitle: { kind: "text" },
  protocolCreatorText: { kind: "text" },
  protocolCreatorValue: { kind: "text" },
  protocolClientText: { kind: "text" },
  protocolClientValue: { kind: "text" },
  protocolClientParticipantText: { kind: "text" },
  protocolClientParticipantValue: { kind: "text" },
  protocolContractorText: { kind: "text" },
  protocolContractorValue: { kind: "text" },
  protocolContractorParticipantText: { kind: "text" },
  protocolContractorParticipantValue: { kind: "text" },
  protocolDateText: { kind: "text" },
  protocolDateValue: { kind: "text" },
  protocolDateFormat: { kind: "text" },
  protocolLocationText: { kind: "text" },
  protocolLocationValue: { kind: "text" },
  protocolTaskTableHeaderTask: { kind: "text" },
  protocolTaskTableHeaderAssignee: { kind: "text" },
  protocolTaskTableHeaderDue: { kind: "text" },
  protocolTaskTableWIPStatus: { kind: "text" },
  protocolTaskTableWIPStatusLegendTitle: { kind: "text" },
  protocolTaskTableWIPStatusLegendPlannedText: { kind: "text" },
  protocolTaskTableWIPStatusLegendInProgressText: { kind: "text" },
  protocolTaskTableWIPStatusLegendFinishedText: { kind: "text" },
  protocolTaskTableWIPStatusLegendCanceledText: { kind: "text" },

  showHeaderLogo: { kind: "boolean" },
  showHeaderOn1stPage: { kind: "boolean" },
  showFooterOn1stPage: { kind: "boolean" },
  headerLogoHeight: { kind: "length" },
  headerText: { kind: "text" },
  header1FontSize: { kind: "text" },
  header1FontColor: { kind: "color" },
  header1FontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  header1FontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  headerText2: { kind: "text" },
  header2FontSize: { kind: "text" },
  header2FontColor: { kind: "color" },
  header2FontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  header2FontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  showPagination: { kind: "boolean" },
  paginationFormat: { kind: "text" },
  paginationFontSize: { kind: "text" },
  paginationFontColor: { kind: "color" },
  paginationFontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  paginationFontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  footerText: { kind: "text" },
  footerFontSize: { kind: "text" },
  footerFontColor: { kind: "color" },
  footerFontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  footerFontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  urlDisplay: { kind: "enum", values: ["off", "inline", "footnote"] },
  numberHeadings: { kind: "boolean" },
  showLegal: { kind: "boolean" },
  legalTitle: { kind: "text" },
  legalText: { kind: "text" },
  legalEditor: { kind: "text" },
  legalCompany: { kind: "text" },
  legalCompanyFontSize: { kind: "text" },
  legalCompanyFontColor: { kind: "text" },
  legalCompanyFontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  legalCompanyFontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  legalCompanyUnderline: { kind: "enum", values: ["none", "underline"] },
  legalCompanyTransform: { kind: "enum", values: ["none", "capitalize", "uppercase", "lowercase"] },
  legalDepartment1: { kind: "text" },
  legalDepartment1FontSize: { kind: "text" },
  legalDepartment1FontColor: { kind: "text" },
  legalDepartment1FontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  legalDepartment1FontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  legalDepartment1Underline: { kind: "enum", values: ["none", "underline"] },
  legalDepartment1Transform: { kind: "enum", values: ["none", "capitalize", "uppercase", "lowercase"] },
  legalDepartment2: { kind: "text" },
  legalDepartment2FontSize: { kind: "text" },
  legalDepartment2FontColor: { kind: "text" },
  legalDepartment2FontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  legalDepartment2FontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  legalDepartment2Underline: { kind: "enum", values: ["none", "underline"] },
  legalDepartment2Transform: { kind: "enum", values: ["none", "capitalize", "uppercase", "lowercase"] },
  legalStreet: { kind: "text" },
  legalStreetFontSize: { kind: "text" },
  legalStreetFontColor: { kind: "text" },
  legalStreetFontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  legalStreetFontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  legalStreetUnderline: { kind: "enum", values: ["none", "underline"] },
  legalStreetTransform: { kind: "enum", values: ["none", "capitalize", "uppercase", "lowercase"] },
  legalCity: { kind: "text" },
  legalCityFontSize: { kind: "text" },
  legalCityFontColor: { kind: "text" },
  legalCityFontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  legalCityFontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  legalCityUnderline: { kind: "enum", values: ["none", "underline"] },
  legalCityTransform: { kind: "enum", values: ["none", "capitalize", "uppercase", "lowercase"] },
  legalTelephone: { kind: "text" },
  legalTelephoneFontSize: { kind: "text" },
  legalTelephoneFontColor: { kind: "text" },
  legalTelephoneFontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  legalTelephoneFontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  legalTelephoneUnderline: { kind: "enum", values: ["none", "underline"] },
  legalTelephoneTransform: { kind: "enum", values: ["none", "capitalize", "uppercase", "lowercase"] },
  legalMail: { kind: "text" },
  legalMailFontSize: { kind: "text" },
  legalMailFontColor: { kind: "text" },
  legalMailFontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  legalMailFontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  legalMailUnderline: { kind: "enum", values: ["none", "underline"] },
  legalMailTransform: { kind: "enum", values: ["none", "capitalize", "uppercase", "lowercase"] },
  legalWebLink: { kind: "text" },
  legalWebLinkFontSize: { kind: "text" },
  legalWebLinkFontColor: { kind: "text" },
  legalWebLinkFontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  legalWebLinkFontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  legalWebLinkUnderline: { kind: "enum", values: ["none", "underline"] },
  legalWebLinkTransform: { kind: "enum", values: ["none", "capitalize", "uppercase", "lowercase"] },
  legalWebLinkAlt: { kind: "text" },
  legalEditorialText: { kind: "text" },
  legalEditorial: { kind: "text" },
  legalAuthorText: { kind: "text" },
  legalAuthor: { kind: "text" },
  legalPhotoCreditText: { kind: "text" },
  legalPhotoCredit: { kind: "text" },
  bodyFont: { kind: "font" },
  codeFont: { kind: "font" },
  bodyFontSize: { kind: "length" },
  bodyFontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  bodyFontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  linkFontColor: { kind: "color" },
  linkFontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  linkFontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  linkFontUnderline: { kind: "enum", values: ["none", "underline"] },
  pageSize: { kind: "enum", values: ["A3", "A4", "A5", "Letter", "Legal", "Tabloid"] },
  orientation: { kind: "enum", values: ["portrait", "landscape"] },
  margins: { kind: "margins" },
  pageBreakBeforeH1: { kind: "boolean" },
  pageBreakBeforeH2: { kind: "boolean" },
  pageBreakBeforeH3: { kind: "boolean" },
  includeMetadata: { kind: "boolean" },
  classificationText: { kind: "text" },
  classificationColor: { kind: "color" },
  watermarkText: { kind: "text" },
  watermarkColor: { kind: "color" },
  watermarkOpacity: { kind: "number", min: 0, max: 1 },
  watermarkFontSize: { kind: "length" },
  watermarkFontStyle: { kind: "enum", values: ["normal", "oblique", "italic"] },
  watermarkFontWeight: { kind: "enum", values: ["normal", "bold", "bolder", "lighter"] },
  watermarkRotation: { kind: "number", min: -360, max: 360 },
};

/** Overridable theme fields, in declaration order. */
export const OVERRIDABLE_KEYS = Object.keys(FIELD_SPECS) as (keyof PdfTheme)[];

const MARGIN_SIDES = ["top", "right", "bottom", "left"] as const;

// Theme values end up inside a generated stylesheet, so anything that could
// terminate a declaration or pull a remote resource is rejected rather than
// escaped — a malformed value should disable one setting, not the whole PDF.
const COLOR_RE =
  /^(#[0-9a-f]{3,8}|[a-z]{3,20}|(?:rgb|rgba|hsl|hsla)\(\s*[\d\s.,%/-]+\)\s*)$/i;
const LENGTH_RE = /^(0|-?\d*\.?\d+(mm|cm|in|pt|pc|px|em|rem|ex|ch|vw|vh|%))$/i;
const FONT_UNSAFE_RE = /[{};@]|url\(/i;

/** A CSS length the generated stylesheet can safely interpolate. */
export function isCssLength(value: string): boolean {
  return LENGTH_RE.test(value.trim());
}

// A custom font's family and weight are interpolated into an @font-face rule.
// Both are whitelisted rather than escaped: there is no legitimate family name
// that needs a quote or a brace.
// Letters, digits, combining marks, spaces, dashes and underscores. Broad enough
// for "ديوان ثلث" or "गुरुमुखी एमटी", narrow enough that no quote, brace,
// semicolon, parenthesis or backslash can reach the stylesheet.
const FONT_FAMILY_RE = /^[\p{L}\p{N}][\p{L}\p{N}\p{M} _-]{0,63}$/u;
const FONT_WEIGHT_RE = /^\d{1,4}( \d{1,4})?$/;

/** A font family name safe to interpolate, e.g. "Marianne", "IBM Plex Sans". */
export function isFontFamily(value: string): boolean {
  return FONT_FAMILY_RE.test(value.trim());
}

/**
 * A single weight ("400") or a variable-font range ("100 900").
 * CSS allows any value from 1 to 1000, not just multiples of 100 — Inter's
 * wght axis really is 100–900, and some fonts go to 1000.
 */
export function isFontWeight(value: string): boolean {
  const v = value.trim();
  if (!FONT_WEIGHT_RE.test(v)) return false;
  const parts = v.split(" ").map(Number);
  if (parts.some((n) => n < 1 || n > 1000)) return false;
  return parts.length === 1 || parts[0] < parts[1];
}

function coerceText(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

function coerceBoolean(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "yes") return true;
    if (s === "false" || s === "no") return false;
  }
  return null;
}

function coerceNumber(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  if (!isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

function coerceEnum(v: unknown, values: readonly string[]): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return values.find((candidate) => candidate.toLowerCase() === s) ?? null;
}

function coerceMargins(v: unknown): Partial<PdfTheme["margins"]> | null {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return null;
  const raw = v as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const side of MARGIN_SIDES) {
    if (!(side in raw)) continue;
    const value = coerceText(raw[side]);
    if (value !== null && LENGTH_RE.test(value.trim())) out[side] = value.trim();
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Coerce one raw frontmatter value against its spec. Returns null to reject. */
function coerceField(spec: FieldSpec, v: unknown): unknown {
  switch (spec.kind) {
    case "text":
      return coerceText(v);
    case "boolean":
      return coerceBoolean(v);
    case "number":
      return coerceNumber(v, spec.min, spec.max);
    case "enum":
      return coerceEnum(v, spec.values);
    case "margins":
      return coerceMargins(v);
    case "color": {
      const s = coerceText(v)?.trim();
      return s && COLOR_RE.test(s) ? s : null;
    }
    case "length": {
      const s = coerceText(v)?.trim();
      return s && LENGTH_RE.test(s) ? s : null;
    }
    case "font": {
      const s = coerceText(v)?.trim();
      return s && s.length <= 200 && !FONT_UNSAFE_RE.test(s) ? s : null;
    }
  }
}

/** Accept both `coverInfo: [a, b]` and `coverInfo: "a, b"`. */
function coerceKeyList(v: unknown): string[] | null {
  if (Array.isArray(v)) {
    const list = v.map((item) => coerceText(item)?.trim()).filter((s): s is string => !!s);
    return list.length > 0 ? list : [];
  }
  if (typeof v === "string") {
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return null;
}

/**
 * Validate a raw `rhino-pdf` frontmatter value into a DocConfig.
 * Invalid and unknown keys are dropped and reported in `ignoredKeys`; a bad
 * value never aborts the export.
 */
export function validateDocConfig(raw: unknown): DocConfig {
  const empty: DocConfig = { overrides: {}, ignoredKeys: [] };
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return raw === undefined || raw === null
      ? empty
      : { ...empty, ignoredKeys: [DOC_CONFIG_KEY] };
  }

  const config: DocConfig = { overrides: {}, ignoredKeys: [] };
  const overrides = config.overrides as Record<string, unknown>;

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === undefined || value === null) continue;

    if (key === "theme") {
      const s = coerceText(value)?.trim();
      if (s) config.theme = s;
      else config.ignoredKeys.push(key);
      continue;
    }
    if (key === "coverInfo") {
      const list = coerceKeyList(value);
      if (list) config.coverInfo = list;
      else config.ignoredKeys.push(key);
      continue;
    }
    if (key === "order") {
      const n = coerceNumber(value, -Infinity, Infinity);
      if (n !== null) config.order = n;
      else config.ignoredKeys.push(key);
      continue;
    }

    const spec = FIELD_SPECS[key as keyof PdfTheme];
    if (!spec) {
      config.ignoredKeys.push(key);
      continue;
    }
    const coerced = coerceField(spec, value);
    if (coerced === null) config.ignoredKeys.push(key);
    else overrides[key] = coerced;
  }

  return config;
}

/**
 * Read the `rhino-pdf` block of a note. Obsidian has already parsed the YAML,
 * so no parsing happens here — only validation.
 *
 * Returns an empty DocConfig when the note has no block, or when the metadata
 * cache has not indexed it yet.
 */
export function readDocConfig(app: App, file: TFile): DocConfig {
  const fm = app.metadataCache.getFileCache(file)?.frontmatter;
  if (!fm || !(DOC_CONFIG_KEY in fm)) return { overrides: {}, ignoredKeys: [] };
  return validateDocConfig(fm[DOC_CONFIG_KEY]);
}

/** Number of settings this note overrides, for the export modal badge. */
export function countOverrides(config: DocConfig): number {
  return (
    Object.keys(config.overrides).length +
    (config.theme ? 1 : 0) +
    (config.coverInfo ? 1 : 0)
  );
}

/**
 * Resolve which theme a document is based on: the one pinned by `theme:`
 * (by id, then by name, case-insensitive), else the caller's fallback.
 */
export function resolveBaseTheme(
  allThemes: PdfTheme[],
  config: DocConfig,
  fallback: PdfTheme
): PdfTheme {
  if (!config.theme) return fallback;
  const key = config.theme.trim().toLowerCase();
  return (
    allThemes.find((t) => t.id.toLowerCase() === key) ??
    allThemes.find((t) => t.name.toLowerCase() === key) ??
    fallback
  );
}

/**
 * Apply a partial theme onto a target, merging `margins` side by side.
 * A key that is present with an empty string still overrides — that is how the
 * modal clears a subtitle the theme defines.
 */
export function applyPartial(target: PdfTheme, patch: Partial<PdfTheme>): void {
  const dst = target as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (key === "margins") {
      target.margins = { ...target.margins, ...(value as Partial<PdfTheme["margins"]>) };
    } else {
      dst[key] = value;
    }
  }
}

/**
 * Resolve the effective theme for one document.
 * Precedence: modal edits > frontmatter overrides > base theme.
 */
export function resolveTheme(
  base: PdfTheme,
  config: DocConfig,
  modalEdits: Partial<PdfTheme> = {}
): PdfTheme {
  const result: PdfTheme = { ...base, margins: { ...base.margins } };
  applyPartial(result, config.overrides);
  applyPartial(result, modalEdits);
  return result;
}

/**
 * Resolve the cover info block keys. Each level *replaces* the one below it
 * rather than merging, so a note can shrink the theme's default list.
 */
export function resolveCoverInfoKeys(
  base: PdfTheme,
  config: DocConfig,
  modalCoverInfo?: string[]
): string[] {
  if (modalCoverInfo) return modalCoverInfo;
  if (config.coverInfo) return config.coverInfo;
  return base.coverInfoFields ?? [];
}

/**
 * Build the `rhino-pdf` block to write back into a note.
 *
 * Merges onto the existing block rather than replacing it: it may hold keys the
 * modal does not expose (margins, colors) or does not understand, and losing
 * them on a "Save to note" would be silent data loss.
 *
 * An override that fell back to its theme value is removed — but only if it was
 * valid to begin with, so a typo the user made stays visible instead of being
 * quietly swept away.
 */
export function mergeDocConfigBlock(opts: {
  prev: Record<string, unknown>;
  diff: Partial<PdfTheme>;
  /** Overrides that were active (and valid) before this save. */
  previousOverrides: Partial<PdfTheme>;
  coverInfo: string[];
  /** Set only when the user explicitly picked a theme in the modal. */
  pinThemeId?: string;
}): Record<string, unknown> {
  const { prev, diff, previousOverrides, coverInfo, pinThemeId } = opts;
  const next: Record<string, unknown> = { ...prev, ...diff };

  for (const key of OVERRIDABLE_KEYS) {
    if (key in diff) continue;
    if (key in prev && key in previousOverrides) delete next[key];
  }

  if (coverInfo.length > 0) next.coverInfo = coverInfo;
  else delete next.coverInfo;

  if (pinThemeId) next.theme = pinThemeId;

  return next;
}

/**
 * Which overridable fields of `effective` differ from `base`.
 * Used to write only meaningful values back into a note's frontmatter.
 */
export function diffFromTheme(effective: PdfTheme, base: PdfTheme): Partial<PdfTheme> {
  const diff: Record<string, unknown> = {};
  for (const key of OVERRIDABLE_KEYS) {
    if (key === "margins") {
      const sides: Record<string, string> = {};
      for (const side of MARGIN_SIDES) {
        if (effective.margins[side] !== base.margins[side]) {
          sides[side] = effective.margins[side];
        }
      }
      if (Object.keys(sides).length > 0) diff.margins = sides;
      continue;
    }
    if (effective[key] !== base[key]) diff[key] = effective[key];
  }
  return diff;
}
