/**
 * One font file from the vault, embedded as an @font-face rule.
 *
 * A family needs one entry per weight/style it ships: without a real bold file,
 * the renderer synthesizes one and it shows in print.
 */
export interface CustomFont {
  /** CSS family name to use in bodyFont/codeFont, e.g. "Marianne". */
  family: string;
  /** Vault-relative path, e.g. "assets/fonts/Marianne-Regular.woff2". */
  path: string;
  /** A single weight ("400") or a variable-font range ("400 700"). */
  weight: string;
  style: "normal" | "italic";
}

export interface PdfTheme {
  id: string;
  name: string;
  builtin?: boolean;

  // Colors
  primaryColor: string;
  accentColor: string;
  
  h2FontSize: string,
  h2FontColor: string,
  h2FontStyle: "normal" | "oblique" | "italic";
  h2FontWeight: "normal" | "bold" | "bolder" | "lighter";
  h3FontSize: string,
  h3FontColor: string,
  h3FontStyle: "normal" | "oblique" | "italic";
  h3FontWeight: "normal" | "bold" | "bolder" | "lighter";
  h4FontSize: string,
  h4FontColor: string,
  h4FontStyle: "normal" | "oblique" | "italic";
  h4FontWeight: "normal" | "bold" | "bolder" | "lighter";
  h5FontSize: string,
  h5FontColor: string,
  h5FontStyle: "normal" | "oblique" | "italic";
  h5FontWeight: "normal" | "bold" | "bolder" | "lighter";
  h6FontSize: string,
  h6FontColor: string,
  h6FontStyle: "normal" | "oblique" | "italic";
  h6FontWeight: "normal" | "bold" | "bolder" | "lighter";

  // Logo (relative path in vault, or empty)
  logoPath: string;
  backgroundPath: string;

  // Cover page
  showCover: boolean;
  showToc: boolean;
  tocTitle: string; 
  tocH2FontSize: string,
  tocH2FontColor: string,
  tocH2FontStyle: "normal" | "oblique" | "italic";
  tocH2FontWeight: "normal" | "bold" | "bolder" | "lighter";
  tocH3FontSize: string,
  tocH3FontColor: string,
  tocH3FontStyle: "normal" | "oblique" | "italic";
  tocH3FontWeight: "normal" | "bold" | "bolder" | "lighter";
  tocH4FontSize: string,
  tocH4FontColor: string,
  tocH4FontStyle: "normal" | "oblique" | "italic";
  tocH4FontWeight: "normal" | "bold" | "bolder" | "lighter";

  showLof: boolean;
  lofTitle: string;
  lofKeyword: string;
  lofFontSize: string,
  lofFontColor: string,
  lofFontStyle: "normal" | "oblique" | "italic";
  lofFontWeight: "normal" | "bold" | "bolder" | "lighter";
  showLot: boolean;
  lotTitle: string;
  lotKeyword: string;
  lotFontSize: string,
  lotFontColor: string,
  lotFontStyle: "normal" | "oblique" | "italic";
  lotFontWeight: "normal" | "bold" | "bolder" | "lighter";

  title: string;
  titleFontSize: string,
  titleFontColor: string,
  titleFontStyle: "normal" | "oblique" | "italic";
  titleFontWeight: "normal" | "bold" | "bolder" | "lighter";
  subtitle: string;
  subtitleFontSize: string,
  subtitleFontColor: string,
  subtitleFontStyle: "normal" | "oblique" | "italic";
  subtitleFontWeight: "normal" | "bold" | "bolder" | "lighter";
  additionalContent: string;
  additionalContentFontSize: string,
  additionalContentFontColor: string,
  additionalContentFontStyle: "normal" | "oblique" | "italic";
  additionalContentFontWeight: "normal" | "bold" | "bolder" | "lighter";
  // Frontmatter keys listed by default in the cover info block
  dedicatedCover: boolean;
  coverBackgroundPath: string,
  coverImagePath: string,
  coverInfoFields: string[];
  protocolLike: boolean;
  protocolTitle: string,
  protocolCreatorText: string,
  protocolCreatorValue: string,
  protocolClientText: string,
  protocolClientValue: string,
  protocolClientParticipantText: string,
  protocolClientParticipantValue: string,
  protocolContractorText: string,
  protocolContractorValue: string,
  protocolContractorParticipantText: string,
  protocolContractorParticipantValue: string,
  protocolDateText: string,
  protocolDateValue: string,
  protocolLocationText: string,
  protocolLocationValue: string,


  // Header (page 2+)
  showHeaderLogo: boolean;
  showHeaderOn1stPage: boolean;
  showFooterOn1stPage: boolean;
  headerLogoHeight: string; // CSS value, e.g. "12mm"
  headerText: string; // supports {title}, {date}
  header1FontSize: string,
  header1FontColor: string,
  header1FontStyle: "normal" | "oblique" | "italic";
  header1FontWeight: "normal" | "bold" | "bolder" | "lighter";
  headerText2: string;
  header2FontSize: string,
  header2FontColor: string,
  header2FontStyle: "normal" | "oblique" | "italic";
  header2FontWeight: "normal" | "bold" | "bolder" | "lighter";

  // Footer
  showPagination: boolean;
  paginationFormat: string; // e.g. "{page} / {pages}", "Page {page} of {pages}"
  paginationFontSize: string,
  paginationFontColor: string,
  paginationFontStyle: "normal" | "oblique" | "italic";
  paginationFontWeight: "normal" | "bold" | "bolder" | "lighter";
  footerText: string; // supports {title}, {date}
  footerFontSize: string,
  footerFontColor: string,
  footerFontStyle: "normal" | "oblique" | "italic";
  footerFontWeight: "normal" | "bold" | "bolder" | "lighter";

  // External links: how to render the URL in the PDF
  urlDisplay: "off" | "inline" | "footnote";

  // Automatic heading numbering (H2/H3, synced with the table of contents)
  numberHeadings: boolean;

  // Legal notice
  showLegal: boolean;
  legalTitle: string;
  legalText: string;
  legalEditor: string;
  legalCompany: string;
  legalDepartment1: string;
  legalDepartment2: string;
  legalStreet: string;
  legalCity: string;
  legalTelephone: string;
  legalMail: string;
  legalWebLink: string;
  legalWebLinkAlt: string;
  legalEditorialText: string;
  legalEditorial: string;
  legalAuthorText: string;
  legalAuthor: string;
  legalPhotoCreditText: string;
  legalPhotoCredit: string;

  // Typography
  bodyFont: string;
  codeFont: string;
  bodyFontSize: string; // e.g. "10pt"
  bodyFontStyle: "normal" | "oblique" | "italic";
  bodyFontWeight: "normal" | "bold" | "bolder" | "lighter";
  linkFontColor: string;
  linkFontStyle: "normal" | "oblique" | "italic";
  linkFontWeight: "normal" | "bold" | "bolder" | "lighter";
  linkFontUnderline: "none" | "underline";
  /** Font files embedded from the vault, so exports don't depend on the machine. */
  customFonts: CustomFont[];

  // Page
  pageSize: string; // "A4", "Letter"
  orientation: "portrait" | "landscape";
  margins: { top: string; right: string; bottom: string; left: string };

  // Automatic page break before headings
  pageBreakBeforeH1: boolean;
  pageBreakBeforeH2: boolean;
  pageBreakBeforeH3: boolean;

  // Write PDF document properties (title/author/subject/keywords) from frontmatter
  includeMetadata: boolean;

  // Classification banner (centered, repeated on every page incl. cover)
  classificationText: string; // supports {title}, {date}, {author}, {fm.x}, …
  classificationColor: string;

  // Watermark
  watermarkText: string;
  watermarkColor: string;
  watermarkOpacity: number; // 0–1
  watermarkFontSize: string; // e.g. "80pt"
  watermarkFontStyle: "normal" | "oblique" | "italic";
  watermarkFontWeight: "normal" | "bold" | "bolder" | "lighter";
  watermarkRotation: number; // degrees, e.g. -45
}

/**
 * Document-level configuration, read from the `rhino-pdf` frontmatter key.
 *
 * `overrides` is kept separate from `theme`/`coverInfo`/`order` so those three
 * can never leak into a resolved PdfTheme.
 */
export interface DocConfig {
  /** Validated PdfTheme fields to override for this document. */
  overrides: Partial<PdfTheme>;
  /** Pin a base theme by id, falling back to name (case-insensitive). */
  theme?: string;
  /** Frontmatter keys to list in the cover info block (replaces the theme's). */
  coverInfo?: string[];
  /** Sort key for merged batch export; documents without one come last. */
  order?: number;
  /** Keys rejected by validation. Diagnostic only, never written back. */
  ignoredKeys: string[];
}

/**
 * Per-document variables available to header/footer/classification text
 * placeholders ({title}, {filename}, {author}, {date}, {time}, {fm.KEY}).
 */
export interface DocVars {
  title: string;
  filename: string;
  frontmatter: Record<string, unknown>;
}

/**
 * Metadata written into the generated PDF document properties.
 */
export interface PdfMetadata {
  title: string;
  author?: string;
  subject?: string;
  keywords?: string[];
}

/**
 * A single label/value row of the cover info block.
 */
export interface InfoRow {
  label: string;
  value: string;
}

export interface PluginSettings {
  themes: PdfTheme[];
  lastUsedThemeId: string;
  /** Last folder a PDF was written to, reused by the quick-export command. */
  lastOutputDir: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  themes: [],
  lastUsedThemeId: "minimal",
  lastOutputDir: "",
};
